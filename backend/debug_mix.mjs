import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const d = JSON.parse(readFileSync(join(__dirname, 'cyber-data/slots.json'), 'utf8'))

const pit = d.filter(s => s.location && s.location.toLowerCase().includes('pitesti'))
console.log('Pitesti slots:', pit.length)
const withMix = pit.filter(s => s.game_mix)
console.log('Cu game_mix:', withMix.length, '| Fara game_mix:', pit.length - withMix.length)
console.log('Sample CU mix:', JSON.stringify(withMix[0] || null))
console.log('Sample FARA mix:', JSON.stringify(pit.find(s => !s.game_mix) || null))
console.log('\nTotal FARA mix din TOATE:', d.filter(s => !s.game_mix).length, '/', d.length)

// Verifica mappingul machine_id vs serial_number
// Cyber query returneaza machine_id — avem id in slots.json?
const sample = pit.slice(0, 3)
sample.forEach(s => {
    console.log(`\n  id=${s.id} serial=${s.serial_number} provider=${s.provider} cabinet=${s.cabinet} game_mix=${s.game_mix}`)
})
