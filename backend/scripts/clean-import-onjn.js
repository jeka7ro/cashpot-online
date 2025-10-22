#!/usr/bin/env node

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function cleanImport() {
  try {
    console.log('🗑️  Ștergere date existente...')
    
    // Delete all existing data
    await pool.query('DELETE FROM onjn_operators')
    console.log('✅ Date existente șterse')
    
    // Read JSON file
    const jsonPath = path.join(__dirname, '..', 'backend', 'onjn-scraped-data.json')
    const rawData = fs.readFileSync(jsonPath, 'utf8')
    const data = JSON.parse(rawData)
    
    console.log(`📊 Import ${data.length} aparate...`)
    
    let inserted = 0
    let errors = 0
    
    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const progress = Math.round(((i + batch.length) / data.length) * 100)
      
      for (const slot of batch) {
        try {
          await pool.query(`
            INSERT INTO onjn_operators (
              serial_number, details_uuid, equipment_type, company_name, brand_name, county, city, 
              slot_address, status, license_number, authorization_date, expiry_date, 
              is_expired, onjn_list_url, onjn_details_url, last_scraped_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
            ON CONFLICT (serial_number) DO UPDATE SET
              details_uuid = EXCLUDED.details_uuid,
              equipment_type = EXCLUDED.equipment_type,
              company_name = EXCLUDED.company_name,
              brand_name = EXCLUDED.brand_name,
              county = EXCLUDED.county,
              city = EXCLUDED.city,
              slot_address = EXCLUDED.slot_address,
              status = EXCLUDED.status,
              license_number = EXCLUDED.license_number,
              authorization_date = EXCLUDED.authorization_date,
              expiry_date = EXCLUDED.expiry_date,
              is_expired = EXCLUDED.is_expired,
              onjn_list_url = EXCLUDED.onjn_list_url,
              onjn_details_url = EXCLUDED.onjn_details_url,
              last_scraped_at = EXCLUDED.last_scraped_at,
              updated_at = NOW()
          `, [
            slot.serial_number,
            slot.details_uuid || null,
            slot.equipment_type || null,
            slot.company_name,
            slot.brand_name,
            slot.county,
            slot.city,
            slot.slot_address,
            slot.status,
            slot.license_number,
            slot.authorization_date,
            slot.expiry_date,
            slot.is_expired || false,
            slot.onjn_list_url || null,
            slot.onjn_details_url || null,
            slot.last_scraped_at || new Date()
          ])
          inserted++
        } catch (error) {
          console.error(`❌ Error processing slot ${slot.serial_number}:`, error.message)
          errors++
        }
      }
      
      console.log(`Progress: ${progress}% (${inserted} inserted, ${errors} errors)`)
    }
    
    console.log(`\n✅ Import completat!`)
    console.log(`   Inserted: ${inserted}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${data.length}`)
    
    // Verify count
    const result = await pool.query('SELECT COUNT(*) FROM onjn_operators')
    console.log(`\n📊 Total aparate în baza de date: ${result.rows[0].count}`)
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error)
    await pool.end()
    process.exit(1)
  }
}

cleanImport()

