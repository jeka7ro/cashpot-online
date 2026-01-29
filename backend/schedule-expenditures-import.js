/**
 * Scheduler pentru importul automat al cheltuielilor
 * Verifică regulile din expenditures_backup_rules și execută importul când este timpul
 */

import { executeExpendituresImport } from './routes/expenditures.js'

/**
 * Verifică dacă o regulă de schedule trebuie executată acum
 */
function shouldExecuteRule(rule, now = new Date()) {
  if (!rule.is_active) {
    return false
  }

  // Verifică dacă există date de start/end
  if (rule.start_date) {
    const startDate = new Date(rule.start_date)
    if (now < startDate) {
      return false
    }
  }
  if (rule.end_date) {
    const endDate = new Date(rule.end_date)
    endDate.setHours(23, 59, 59, 999) // End of day
    if (now > endDate) {
      return false
    }
  }

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentDate = now.getDate()

  // Parse schedule_time (format: "HH:MM")
  let scheduledHour = 0
  let scheduledMinute = 0
  if (rule.schedule_time) {
    const [hour, minute] = rule.schedule_time.split(':').map(Number)
    scheduledHour = hour || 0
    scheduledMinute = minute || 0
  }

  switch (rule.schedule_type) {
    case 'daily':
      // Execută zilnic la ora setată (verificăm la fiecare minut dacă este timpul)
      return currentHour === scheduledHour && currentMinute === scheduledMinute

    case 'weekly':
      // Execută săptămânal în ziua setată la ora setată
      if (!rule.day_of_week) {
        return false
      }
      const dayMap = {
        'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0,
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
      }
      const targetDay = dayMap[rule.day_of_week]
      if (targetDay === undefined) {
        return false
      }
      return currentDay === targetDay && currentHour === scheduledHour && currentMinute === scheduledMinute

    case 'monthly':
      // Execută lunar în ziua setată la ora setată
      if (!rule.day_of_month || rule.day_of_month < 1 || rule.day_of_month > 31) {
        return false
      }
      return currentDate === rule.day_of_month && currentHour === scheduledHour && currentMinute === scheduledMinute

    case 'manual':
      // Nu se execută automat
      return false

    default:
      return false
  }
}

/**
 * Execută importul automat pentru o regulă
 */
async function executeScheduledImport(pool, rule) {
  try {
    console.log(`🔄 [SCHEDULED IMPORT] Executând import automat pentru regula: ${rule.name} (${rule.schedule_type})`)
    
    // Execută importul cu toate sursele activate (default)
    await executeExpendituresImport(pool, {
      bat: true,
      googleSheets: true,
      preferences: true
    })
    
    console.log(`✅ [SCHEDULED IMPORT] Import completat pentru regula: ${rule.name}`)
  } catch (error) {
    console.error(`❌ [SCHEDULED IMPORT] Eroare la executarea importului pentru regula ${rule.name}:`, error)
  }
}

/**
 * Verifică și execută toate regulile active care trebuie executate acum
 */
async function checkAndExecuteScheduledImports(pool) {
  try {
    // Obține toate regulile active
    const result = await pool.query(`
      SELECT * FROM expenditures_backup_rules
      WHERE is_active = true
      ORDER BY created_at DESC
    `)

    const rules = result.rows
    if (rules.length === 0) {
      // Log doar o dată la fiecare 10 minute pentru a nu umple logurile
      const lastNoRulesLog = global._lastNoRulesLog || 0
      const now = Date.now()
      if (now - lastNoRulesLog > 10 * 60 * 1000) {
        console.log('ℹ️ [SCHEDULED IMPORT] Nu există reguli active pentru import automat')
        global._lastNoRulesLog = now
      }
      return
    }

    const now = new Date()
    let executedCount = 0
    let checkedCount = 0

    // Log regulile găsite (doar o dată la fiecare 30 de minute)
    const lastRulesLog = global._lastRulesLog || 0
    const nowTime = Date.now()
    if (nowTime - lastRulesLog > 30 * 60 * 1000) {
      console.log(`📋 [SCHEDULED IMPORT] Găsite ${rules.length} reguli active:`)
      rules.forEach(rule => {
        console.log(`   - ${rule.name}: ${rule.schedule_type} la ${rule.schedule_time || 'N/A'}`)
      })
      global._lastRulesLog = nowTime
    }

    for (const rule of rules) {
      checkedCount++
      const shouldExecute = shouldExecuteRule(rule, now)
      
      if (shouldExecute) {
        // Verifică dacă nu s-a executat deja astăzi (evită execuții multiple în același minut)
        const lastExecutionKey = `last_execution_${rule.id}`
        const lastExecution = global[lastExecutionKey]
        const nowKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`
        
        if (lastExecution !== nowKey) {
          console.log(`⏰ [SCHEDULED IMPORT] Timpul pentru regula "${rule.name}" a sosit!`)
          global[lastExecutionKey] = nowKey
          await executeScheduledImport(pool, rule)
          executedCount++
        } else {
          console.log(`⏭️ [SCHEDULED IMPORT] Regula "${rule.name}" deja executată în acest minut`)
        }
      }
    }

    if (executedCount > 0) {
      console.log(`✅ [SCHEDULED IMPORT] Executat ${executedCount} import(uri) automat(e)`)
    }
  } catch (error) {
    console.error('❌ [SCHEDULED IMPORT] Eroare la verificarea regulilor:', error)
    console.error('Stack:', error.stack)
  }
}

const AUTO_SYNC_RULE_NAME = 'Import automat (setări Auto-Sincronizare)'

/**
 * Creează/actualizează regula de auto-sync din preferințele utilizatorilor.
 * Dacă vreun user are autoSync: true în expendituresSettings, regula există și e activă.
 */
async function syncRuleFromUserPreferences(pool) {
  try {
    const usersResult = await pool.query(`
      SELECT id, preferences FROM users WHERE preferences IS NOT NULL AND preferences != '{}'
    `)
    for (const row of usersResult.rows || []) {
      const prefs = row.preferences || {}
      const expSettings = prefs.expendituresSettings || {}
      if (expSettings.autoSync === true) {
        const scheduleTime = expSettings.syncTimeStart || expSettings.syncTime || '02:00'
        const existing = await pool.query(
          `SELECT id FROM expenditures_backup_rules WHERE name = $1 LIMIT 1`,
          [AUTO_SYNC_RULE_NAME]
        )
        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE expenditures_backup_rules SET schedule_type = 'daily', schedule_time = $1, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE name = $2`,
            [scheduleTime, AUTO_SYNC_RULE_NAME]
          )
          console.log(`✅ [SCHEDULED IMPORT] Regulă actualizată din setări user: zilnic la ${scheduleTime}`)
        } else {
          await pool.query(
            `INSERT INTO expenditures_backup_rules (name, schedule_type, schedule_time, is_active, created_by) VALUES ($1, 'daily', $2, true, $3)`,
            [AUTO_SYNC_RULE_NAME, scheduleTime, row.id]
          )
          console.log(`✅ [SCHEDULED IMPORT] Regulă creată din setări user: zilnic la ${scheduleTime}`)
        }
        return
      }
    }
    // Niciun user cu autoSync: dezactivează regula dacă există
    const existing = await pool.query(`SELECT id FROM expenditures_backup_rules WHERE name = $1 LIMIT 1`, [AUTO_SYNC_RULE_NAME])
    if (existing.rows.length > 0) {
      await pool.query(`UPDATE expenditures_backup_rules SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE name = $1`, [AUTO_SYNC_RULE_NAME])
    }
  } catch (err) {
    console.error('❌ [SCHEDULED IMPORT] Eroare la sincronizarea regulii din preferințe:', err.message)
  }
}

/**
 * Pornește scheduler-ul pentru importul automat
 * Verifică la fiecare minut dacă există reguli care trebuie executate
 */
export function scheduleExpendituresImports(pool) {
  if (!pool) {
    console.warn('⚠️ [SCHEDULED IMPORT] Pool nu este disponibil, scheduler-ul nu va porni')
    return
  }

  console.log('⏰ [SCHEDULED IMPORT] Scheduler pornit - verifică regulile la fiecare minut')
  console.log('   Scheduler-ul va verifica regulile active și va executa importul când este timpul')

  // La pornire: creează/actualizează regula din setările deja salvate (autoSync) ale utilizatorilor
  setTimeout(async () => {
    await syncRuleFromUserPreferences(pool)
    console.log('🔍 [SCHEDULED IMPORT] Verificare inițială a regulilor...')
    checkAndExecuteScheduledImports(pool).catch(err => {
      console.error('❌ [SCHEDULED IMPORT] Eroare la verificarea inițială:', err)
    })
  }, 5000)

  // Verifică la fiecare minut; la fiecare 30 min re-sincronizează regula din preferințele user
  let minuteCount = 0
  const intervalId = setInterval(() => {
    minuteCount++
    if (minuteCount >= 30) {
      minuteCount = 0
      syncRuleFromUserPreferences(pool).catch(() => {})
    }
    checkAndExecuteScheduledImports(pool).catch(err => {
      console.error('❌ [SCHEDULED IMPORT] Eroare la verificare periodică:', err)
    })
  }, 60 * 1000) // 60 secunde = 1 minut

  // Salvează interval ID pentru a putea fi oprit dacă e nevoie
  global._expendituresSchedulerInterval = intervalId

  console.log('✅ [SCHEDULED IMPORT] Scheduler activ - verificare la fiecare minut, regulă din setări la 30 min')
}
