#!/usr/bin/env node

/**
 * ONJN Data Import Script
 * Rapid import of all ONJN operators data
 */

import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'
import pg from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const { Pool } = pg

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Helper function to parse operator name into company and brand
const parseOperatorName = (operatorText) => {
  if (!operatorText) return { company_name: null, brand_name: null }
  
  // Split by multiple spaces or newlines and filter empty parts
  const parts = operatorText.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean)
  
  return {
    company_name: parts[0] || null,
    brand_name: parts[1] || null
  }
}

// Helper function to parse dates
const parseDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return null
  try {
    // Format: DD/MM/YYYY
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0])
    }
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error)
  }
  return null
}

// Scrape single page from ONJN
const scrapePage = async (pageNumber, companyId = null) => {
  const companyFilter = companyId ? `&company_id=${companyId}` : ''
  const url = `https://registru.onjn.gov.ro/mijloace-de-joc/1?in_use=1${companyFilter}&page=${pageNumber}`
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 30000
    })
    
    const $ = load(response.data)
    const slots = []
    
    $('table.table-hover tbody tr').each((index, row) => {
      try {
        const cells = $(row).find('td')
        if (cells.length < 7) return
        
        const serialNumber = $(cells[0]).text().trim()
        const equipmentType = $(cells[1]).text().trim()
        const address = $(cells[2]).text().trim()
        const operatorText = $(cells[3]).text().trim()
        const licenseNumber = $(cells[4]).text().trim()
        const authorizationDateStr = $(cells[5]).text().trim()
        const expiryDateStr = $(cells[6]).text().trim()
        const status = $(cells[7]).text().trim()
        const detailsLink = $(cells[0]).find('a').attr('href')
        
        const detailsUuid = detailsLink ? detailsLink.split('/').pop() : null
        const onjnDetailsUrl = detailsUuid ? `https://registru.onjn.gov.ro/e/${detailsUuid}` : null
        
        const { company_name, brand_name } = parseOperatorName(operatorText)
        
        // Parse city and county from address
        let city = null
        let county = null
        const addressParts = address.split(',').map(s => s.trim()).filter(Boolean)
        if (addressParts.length >= 2) {
          county = addressParts[addressParts.length - 1]
          city = addressParts[addressParts.length - 2]
        } else if (addressParts.length === 1) {
          city = addressParts[0]
        }
        
        const authorizationDate = parseDate(authorizationDateStr)
        const expiryDate = parseDate(expiryDateStr)
        const isExpired = expiryDate ? expiryDate < new Date() : false
        
        slots.push({
          serial_number: serialNumber,
          details_uuid: detailsUuid,
          equipment_type: equipmentType,
          company_name,
          brand_name,
          license_number: licenseNumber,
          slot_address: address,
          city,
          county,
          authorization_date: authorizationDate,
          expiry_date: expiryDate,
          status,
          is_expired: isExpired,
          onjn_list_url: url,
          onjn_details_url: onjnDetailsUrl,
          last_scraped_at: new Date()
        })
        
      } catch (error) {
        console.error(`Error parsing row ${index} on page ${pageNumber}:`, error.message)
      }
    })
    
    console.log(`✅ Page ${pageNumber}: Found ${slots.length} slots`)
    return slots
    
  } catch (error) {
    console.error(`❌ Error scraping page ${pageNumber}:`, error.message)
    return []
  }
}

// Main import function
const importONJNData = async () => {
  console.log('🚀 Starting ONJN data import...')
  
  try {
    // Check existing data count
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM onjn_operators')
    console.log(`📊 Existing slots in database: ${existingCount.rows[0].count}`)
    const totalPages = 1200 // All pages including out of service
    let allSlots = []
    let successPages = 0
    let errorPages = 0
    
    console.log(`📊 Will scrape up to ${totalPages} pages`)
    
    for (let page = 1; page <= totalPages; page++) {
      try {
        console.log(`📄 Scraping page ${page}/${totalPages}...`)
        
        const slots = await scrapePage(page)
        
        if (slots.length === 0) {
          console.log(`📭 Page ${page} returned no results - stopping`)
          break
        }
        
        allSlots = allSlots.concat(slots)
        successPages++
        
        // Progress update every 50 pages
        if (page % 50 === 0) {
          console.log(`📈 Progress: ${page}/${totalPages} pages, ${allSlots.length} slots`)
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`Failed to scrape page ${page}:`, error.message)
        errorPages++
        
        // Continue with next page after error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`✅ Scraping complete: ${allSlots.length} slots from ${successPages} pages (${errorPages} errors)`)
    
    // Insert data into database
    console.log('💾 Inserting data into database...')
    
    let inserted = 0
    let updated = 0
    let unchanged = 0
    let errors = 0
    
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i]
      
      try {
        // Check if slot exists and get current data for comparison
        const existing = await pool.query(`
          SELECT id, details_uuid, equipment_type, company_name, brand_name, 
                 license_number, slot_address, city, county, authorization_date, 
                 expiry_date, status, is_expired, onjn_list_url, onjn_details_url 
          FROM onjn_operators WHERE serial_number = $1
        `, [slot.serial_number])
        
        if (existing.rows.length > 0) {
          const existingData = existing.rows[0]
          
          // Check if any data has changed to avoid unnecessary updates
          const hasChanged = (
            existingData.details_uuid !== slot.details_uuid ||
            existingData.equipment_type !== slot.equipment_type ||
            existingData.company_name !== slot.company_name ||
            existingData.brand_name !== slot.brand_name ||
            existingData.license_number !== slot.license_number ||
            existingData.slot_address !== slot.slot_address ||
            existingData.city !== slot.city ||
            existingData.county !== slot.county ||
            (existingData.authorization_date?.getTime() !== new Date(slot.authorization_date || 0).getTime()) ||
            (existingData.expiry_date?.getTime() !== new Date(slot.expiry_date || 0).getTime()) ||
            existingData.status !== slot.status ||
            existingData.is_expired !== slot.is_expired ||
            existingData.onjn_list_url !== slot.onjn_list_url ||
            existingData.onjn_details_url !== slot.onjn_details_url
          )
          
          if (hasChanged) {
            // Update existing only if data changed
            await pool.query(`
              UPDATE onjn_operators SET
                details_uuid = $1,
                equipment_type = $2,
                company_name = $3,
                brand_name = $4,
                license_number = $5,
                slot_address = $6,
                city = $7,
                county = $8,
                authorization_date = $9,
                expiry_date = $10,
                status = $11,
                is_expired = $12,
                onjn_list_url = $13,
                onjn_details_url = $14,
                last_scraped_at = $15,
                updated_at = CURRENT_TIMESTAMP
              WHERE serial_number = $16
            `, [
              slot.details_uuid,
              slot.equipment_type,
              slot.company_name,
              slot.brand_name,
              slot.license_number,
              slot.slot_address,
              slot.city,
              slot.county,
              slot.authorization_date,
              slot.expiry_date,
              slot.status,
              slot.is_expired,
              slot.onjn_list_url,
              slot.onjn_details_url,
              slot.last_scraped_at,
              slot.serial_number
            ])
            updated++
          } else {
            // Just update last_scraped_at if no changes
            await pool.query(
              'UPDATE onjn_operators SET last_scraped_at = $1 WHERE serial_number = $2',
              [slot.last_scraped_at, slot.serial_number]
            )
            unchanged++
          }
        } else {
          // Insert new slot only if it doesn't exist
          await pool.query(`
            INSERT INTO onjn_operators (
              serial_number, details_uuid, equipment_type, company_name, brand_name,
              license_number, slot_address, city, county, authorization_date,
              expiry_date, status, is_expired, onjn_list_url, onjn_details_url,
              last_scraped_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [
            slot.serial_number,
            slot.details_uuid,
            slot.equipment_type,
            slot.company_name,
            slot.brand_name,
            slot.license_number,
            slot.slot_address,
            slot.city,
            slot.county,
            slot.authorization_date,
            slot.expiry_date,
            slot.status,
            slot.is_expired,
            slot.onjn_list_url,
            slot.onjn_details_url,
            slot.last_scraped_at
          ])
          inserted++
        }
        
        // Progress update every 1000 slots
        if ((i + 1) % 1000 === 0) {
          console.log(`💾 Database: ${i + 1}/${allSlots.length} slots processed`)
        }
        
      } catch (error) {
        console.error(`Error saving slot ${slot.serial_number}:`, error.message)
        errors++
      }
    }
    
    console.log('🎉 Import complete!')
    console.log(`📊 Results:`)
    console.log(`   • Total slots scraped: ${allSlots.length}`)
    console.log(`   • New slots inserted: ${inserted}`)
    console.log(`   • Existing slots updated: ${updated}`)
    console.log(`   • Existing slots unchanged: ${unchanged}`)
    console.log(`   • Errors: ${errors}`)
    console.log(`   • Pages scraped: ${successPages}`)
    console.log(`   • Pages with errors: ${errorPages}`)
    
    // Final count check
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM onjn_operators')
    console.log(`   • Total slots in database after import: ${finalCount.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
  importONJNData().catch(console.error)
}

export default importONJNData
