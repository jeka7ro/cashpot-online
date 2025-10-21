import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cyber database connection config
const cyberDbConfig = {
  host: '161.97.133.165',
  user: 'eugen',
  password: '(@Ee0wRHVohZww33',
  database: 'cyberslot_dbn',
  port: 3306,
  connectTimeout: 30000
}

async function exportCyberYesterday() {
  let connection = null
  
  try {
    console.log('🔌 Connecting to Cyber database...')
    connection = await mysql.createConnection(cyberDbConfig)
    console.log('✅ Connected to Cyber database')
    
    // Calculate yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    console.log(`📅 Exporting data for yesterday: ${yesterdayStr}`)
    
    // Query yesterday's data
    const [rows] = await connection.execute(
      `SELECT * FROM machine_audit_summaries 
       WHERE DATE(created_at) = ? OR DATE(updated_at) = ?
       ORDER BY id DESC`,
      [yesterdayStr, yesterdayStr]
    )
    
    console.log(`📊 Found ${rows.length} records from yesterday`)
    
    // Save to JSON file
    const outputPath = path.join(__dirname, 'cyber-data', 'machine_audit_summaries_yesterday.json')
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // Write JSON file
    fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2))
    
    console.log(`✅ Data exported to: ${outputPath}`)
    console.log(`📝 Total records: ${rows.length}`)
    
    // Also copy to public folder for frontend access
    const publicPath = path.join(__dirname, '..', 'public', 'cyber-data', 'machine_audit_summaries_yesterday.json')
    const publicDir = path.dirname(publicPath)
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }
    fs.copyFileSync(outputPath, publicPath)
    console.log(`✅ Also copied to: ${publicPath}`)
    
    // Show sample of data
    if (rows.length > 0) {
      console.log('\n📋 Sample record:')
      console.log(JSON.stringify(rows[0], null, 2))
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 Connection closed')
    }
  }
}

// Run the export
exportCyberYesterday()

