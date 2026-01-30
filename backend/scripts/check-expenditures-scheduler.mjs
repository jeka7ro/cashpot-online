/**
 * Script pentru verificarea și testarea scheduler-ului de import automat
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function checkScheduler() {
  try {
    console.log('🔍 Verificare scheduler import automat cheltuieli...\n')
    
    // Verifică regulile active
    const result = await pool.query(`
      SELECT 
        id,
        name,
        schedule_type,
        schedule_time,
        day_of_week,
        day_of_month,
        start_date,
        end_date,
        is_active,
        created_at,
        updated_at
      FROM expenditures_backup_rules
      WHERE is_active = true
      ORDER BY created_at DESC
    `)
    
    const rules = result.rows
    
    if (rules.length === 0) {
      console.log('⚠️ NU EXISTĂ REGULI ACTIVE!')
      console.log('\n📝 Pentru a crea o regulă zilnică, folosește API-ul:')
      console.log('   POST /api/expenditures/backup-rules')
      console.log('   Body: {')
      console.log('     "name": "Import zilnic",')
      console.log('     "schedule_type": "daily",')
      console.log('     "schedule_time": "02:00",')
      console.log('     "is_active": true')
      console.log('   }')
      console.log('\n   SAU creează direct în baza de date:')
      console.log('   INSERT INTO expenditures_backup_rules (name, schedule_type, schedule_time, is_active)')
      console.log('   VALUES (\'Import zilnic\', \'daily\', \'02:00\', true);')
    } else {
      console.log(`✅ Găsite ${rules.length} reguli active:\n`)
      
      const now = new Date()
      
      rules.forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.name}`)
        console.log(`   Tip: ${rule.schedule_type}`)
        console.log(`   Ora: ${rule.schedule_time || 'N/A'}`)
        if (rule.schedule_type === 'weekly') {
          console.log(`   Ziua săptămânii: ${rule.day_of_week || 'N/A'}`)
        }
        if (rule.schedule_type === 'monthly') {
          console.log(`   Ziua lunii: ${rule.day_of_month || 'N/A'}`)
        }
        if (rule.start_date) {
          console.log(`   Data start: ${rule.start_date}`)
        }
        if (rule.end_date) {
          console.log(`   Data end: ${rule.end_date}`)
        }
        console.log(`   Activă: ${rule.is_active ? '✅' : '❌'}`)
        console.log(`   Creată: ${rule.created_at}`)
        
        // Verifică dacă ar trebui să se execute acum
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        let shouldExecute = false
        
        if (rule.schedule_type === 'daily' && rule.schedule_time) {
          const [hour, minute] = rule.schedule_time.split(':').map(Number)
          shouldExecute = currentHour === hour && currentMinute === minute
        }
        
        if (shouldExecute) {
          console.log(`   ⏰ AR TREBUI SĂ SE EXECUTE ACUM!`)
        } else if (rule.schedule_type === 'daily' && rule.schedule_time) {
          const [hour, minute] = rule.schedule_time.split(':').map(Number)
          const nextExecution = new Date(now)
          nextExecution.setHours(hour, minute, 0, 0)
          if (nextExecution <= now) {
            nextExecution.setDate(nextExecution.getDate() + 1)
          }
          console.log(`   ⏰ Următoarea execuție: ${nextExecution.toLocaleString('ro-RO')}`)
        }
        
        console.log('')
      })
    }
    
    // Verifică dacă scheduler-ul rulează
    console.log('\n📊 Status scheduler:')
    if (global._expendituresSchedulerInterval) {
      console.log('   ✅ Scheduler activ (interval ID: ' + global._expendituresSchedulerInterval + ')')
    } else {
      console.log('   ⚠️ Scheduler NU este activ (trebuie să pornești serverul)')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

checkScheduler()
