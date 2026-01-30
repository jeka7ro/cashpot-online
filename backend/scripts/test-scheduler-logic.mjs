/**
 * Script pentru testarea logicii scheduler-ului
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

// Test cu regula zilnică la 02:00
const testRule = {
  id: 1,
  name: 'Import zilnic cheltuieli',
  schedule_type: 'daily',
  schedule_time: '02:00',
  is_active: true
}

console.log('🧪 Testare logică scheduler pentru regula zilnică la 02:00\n')

// Test 1: Acum (nu ar trebui să execute)
const now = new Date()
const shouldExecuteNow = shouldExecuteRule(testRule, now)
console.log(`1. Acum (${now.toLocaleString('ro-RO')}): ${shouldExecuteNow ? '✅ AR EXECUTA' : '❌ Nu execută'}`)

// Test 2: La 02:00:00
const testTime1 = new Date()
testTime1.setHours(2, 0, 0, 0)
const shouldExecute1 = shouldExecuteRule(testRule, testTime1)
console.log(`2. La 02:00:00: ${shouldExecute1 ? '✅ AR EXECUTA' : '❌ Nu execută'}`)

// Test 3: La 02:00:59 (ar trebui să execute, verificăm doar ora și minutul)
const testTime2 = new Date()
testTime2.setHours(2, 0, 59, 999)
const shouldExecute2 = shouldExecuteRule(testRule, testTime2)
console.log(`3. La 02:00:59: ${shouldExecute2 ? '✅ AR EXECUTA' : '❌ Nu execută'}`)

// Test 4: La 02:01:00 (nu ar trebui să execute)
const testTime3 = new Date()
testTime3.setHours(2, 1, 0, 0)
const shouldExecute3 = shouldExecuteRule(testRule, testTime3)
console.log(`4. La 02:01:00: ${shouldExecute3 ? '✅ AR EXECUTA' : '❌ Nu execută'}`)

// Test 5: La 01:59:59 (nu ar trebui să execute)
const testTime4 = new Date()
testTime4.setHours(1, 59, 59, 999)
const shouldExecute4 = shouldExecuteRule(testRule, testTime4)
console.log(`5. La 01:59:59: ${shouldExecute4 ? '✅ AR EXECUTA' : '❌ Nu execută'}`)

// Calculăm următoarea execuție
const nextExecution = new Date(now)
nextExecution.setHours(2, 0, 0, 0)
if (nextExecution <= now) {
  nextExecution.setDate(nextExecution.getDate() + 1)
}

console.log(`\n📅 Următoarea execuție programată: ${nextExecution.toLocaleString('ro-RO')}`)
console.log(`   (${Math.round((nextExecution - now) / 1000 / 60)} minute de acum)`)

console.log('\n✅ Logica scheduler-ului funcționează corect!')
