import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Încarcă .env din root-ul proiectului
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function findDuplicates() {
  try {
    console.log('🔍 Căutare duplicate în expenditures_sync pentru facturi electrice...\n')
    
    // Găsește toate cheltuielile electrice
    const allElectric = await pool.query(`
      SELECT 
        id,
        location_name,
        department_name,
        expenditure_type,
        amount,
        operational_date,
        description,
        data_source,
        created_at
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
      ORDER BY operational_date, location_name, amount
    `)
    
    console.log(`📊 Total înregistrări electrice: ${allElectric.rows.length}`)
    
    // Extrage NLC-ul din description
    const extractNLC = (description) => {
      if (!description) return null
      const nlcMatch = description.match(/NLC:\s*(\d+)/i)
      return nlcMatch ? nlcMatch[1] : null
    }
    
    // Extrage numărul facturii din description
    const extractInvoiceNumber = (description) => {
      if (!description) return null
      const invoiceMatch = description.match(/Factură\s+(EFI[\/\-]?\d+)/i)
      return invoiceMatch ? invoiceMatch[1] : null
    }
    
    // Grupează după criterii de duplicare
    const groups = {}
    
    allElectric.rows.forEach(record => {
      const nlc = extractNLC(record.description)
      const invoiceNumber = extractInvoiceNumber(record.description)
      
      // Creează o cheie unică bazată pe: data + locație + NLC + sumă (aproximativ)
      const key = `${record.operational_date}_${record.location_name}_${nlc || 'NO_NLC'}_${Math.round(record.amount * 100) / 100}`
      
      if (!groups[key]) {
        groups[key] = []
      }
      
      groups[key].push({
        id: record.id,
        location: record.location_name,
        date: record.operational_date,
        amount: record.amount,
        description: record.description,
        nlc,
        invoiceNumber,
        createdAt: record.created_at,
        dataSource: record.data_source
      })
    })
    
    // Găsește duplicatele (grupuri cu mai mult de 1 înregistrare)
    const duplicates = Object.values(groups).filter(group => group.length > 1)
    
    console.log(`\n🔴 Duplicate găsite: ${duplicates.length} grupuri\n`)
    
    if (duplicates.length === 0) {
      console.log('✅ Nu există duplicate!')
      return
    }
    
    let totalDuplicateRecords = 0
    
    duplicates.forEach((group, index) => {
      totalDuplicateRecords += group.length
      const first = group[0]
      
      console.log(`\n📦 Grup ${index + 1}: ${group.length} duplicate`)
      console.log(`   Data: ${first.date}`)
      console.log(`   Locație: ${first.location}`)
      console.log(`   NLC: ${first.nlc || 'N/A'}`)
      console.log(`   Factură: ${first.invoiceNumber || 'N/A'}`)
      console.log(`   Sumă: ${first.amount.toFixed(2)} RON`)
      console.log(`   Înregistrări:`)
      
      group.forEach((record, recIndex) => {
        console.log(`      ${recIndex + 1}. ID: ${record.id} | Creat: ${new Date(record.createdAt).toLocaleString('ro-RO')} | Source: ${record.dataSource || 'N/A'}`)
        console.log(`         Descriere: ${record.description.substring(0, 100)}${record.description.length > 100 ? '...' : ''}`)
      })
    })
    
    console.log(`\n📊 Rezumat:`)
    console.log(`   Total înregistrări electrice: ${allElectric.rows.length}`)
    console.log(`   Grupuri duplicate: ${duplicates.length}`)
    console.log(`   Total înregistrări duplicate: ${totalDuplicateRecords}`)
    console.log(`   Înregistrări unice: ${allElectric.rows.length - totalDuplicateRecords + duplicates.length}`)
    console.log(`   Poți șterge: ${totalDuplicateRecords - duplicates.length} înregistrări duplicate\n`)
    
    // Oferă opțiunea de a șterge duplicatele (păstrează prima înregistrare din fiecare grup)
    if (duplicates.length > 0 && process.argv.includes('--delete')) {
      console.log('🗑️  Ștergere duplicate (păstrând prima înregistrare din fiecare grup)...')
      
      let deletedCount = 0
      
      for (const group of duplicates) {
        // Sort după data creării (păstrează cea mai veche)
        group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        
        // Șterge toate înregistrările, mai puțin prima
        const toDelete = group.slice(1)
        
        for (const record of toDelete) {
          await pool.query('DELETE FROM expenditures_sync WHERE id = $1', [record.id])
          deletedCount++
          console.log(`   ✅ Șters ID ${record.id} (${record.location}, ${record.date}, ${record.amount.toFixed(2)} RON)`)
        }
      }
      
      console.log(`\n✅ Șterse ${deletedCount} înregistrări duplicate!`)
    } else if (duplicates.length > 0) {
      console.log('\n💡 Pentru a șterge duplicatele, rulează scriptul cu --delete:')
      console.log('   node backend/scripts/find-duplicate-electric-expenditures.js --delete')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

findDuplicates()
