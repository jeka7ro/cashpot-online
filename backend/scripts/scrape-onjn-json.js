#!/usr/bin/env node

/**
 * ONJN Data Scraping Script - JSON Output
 * Scrapes all ONJN operators data and saves to JSON file
 * This version doesn't require database connection
 */

import axios from 'axios'
import { load } from 'cheerio'
import fs from 'fs'
import path from 'path'

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

// Helper function to parse date from Romanian format
const parseRomanianDate = (dateStr) => {
  if (!dateStr) return null
  
  try {
    // Format: "01/09/2025" -> "2025-09-01"
    const parts = dateStr.trim().split('/')
    if (parts.length !== 3) return null
    
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  } catch (error) {
    console.error('Date parse error:', error)
    return null
  }
}

// Scrape single page from ONJN with retry logic
const scrapePage = async (pageNumber, companyId = null, retryCount = 0) => {
  const companyFilter = companyId ? `&company_id=${companyId}` : ''
  // URL for ALL slots including those out of service (58,533 total) - removed in_use=1
  const url = `https://registru.onjn.gov.ro/mijloace-de-joc/1?equipment_type_id=${companyFilter}&page=${pageNumber}`
  
  const maxRetries = 3
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 45000 // Increased timeout for network issues
    })
    
    const $ = load(response.data)
    const slots = []
    
    // Find all table rows (skip header)
    $('table tbody tr').each((index, row) => {
      try {
        const cells = $(row).find('td')
        
        if (cells.length < 7) return // Skip invalid rows
        
        // Extract data from cells
        const serialNumberCell = $(cells[0])
        const serialNumber = serialNumberCell.find('a').text().trim()
        const detailsLink = serialNumberCell.find('a').attr('href')
        
        const equipmentType = $(cells[1]).text().trim()
        
        const slotAddress = $(cells[2]).text().trim()
        // Parse city and county from address (last line usually)
        const addressLines = slotAddress.split('\n').map(l => l.trim()).filter(Boolean)
        const lastLine = addressLines[addressLines.length - 1] || ''
        const cityCountyMatch = lastLine.match(/^(.*?),\s*(.*)$/)
        const city = cityCountyMatch ? cityCountyMatch[1] : ''
        const county = cityCountyMatch ? cityCountyMatch[2] : ''
        
        // Parse operator (Company + Brand)
        const operatorText = $(cells[3]).text().trim()
        const { company_name, brand_name } = parseOperatorName(operatorText)
        
        const licenseNumber = $(cells[4]).text().trim()
        
        const authorizationDateStr = $(cells[5]).text().trim()
        const expiryDateStr = $(cells[6]).text().trim()
        
        const statusText = $(cells[7]).text().trim()
        const status = statusText.includes('exploatare') ? 'În exploatare' : 'Scos din funcțiune'
        
        const detailsUuid = detailsLink ? detailsLink.split('/').pop() : null
        const onjnDetailsUrl = detailsUuid ? `https://registru.onjn.gov.ro/e/${detailsUuid}` : null
        
        const authorizationDate = parseRomanianDate(authorizationDateStr)
        const expiryDate = parseRomanianDate(expiryDateStr)
        
        // Check if expired
        const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false
        
        slots.push({
          serial_number: serialNumber,
          details_uuid: detailsUuid,
          equipment_type: equipmentType,
          company_name,
          brand_name,
          license_number: licenseNumber,
          slot_address: slotAddress,
          city,
          county,
          authorization_date: authorizationDate,
          expiry_date: expiryDate,
          status,
          is_expired: isExpired,
          onjn_list_url: url,
          onjn_details_url: onjnDetailsUrl,
          last_scraped_at: new Date().toISOString()
        })
        
      } catch (error) {
        console.error(`Error parsing row ${index} on page ${pageNumber}:`, error.message)
      }
    })
    
    return slots
  } catch (error) {
    if (retryCount < maxRetries) {
      console.log(`⚠️ Retry ${retryCount + 1}/${maxRetries} for page ${pageNumber}: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))) // Exponential backoff
      return await scrapePage(pageNumber, companyId, retryCount + 1)
    }
    console.error(`Error scraping page ${pageNumber} after ${maxRetries} retries:`, error.message)
    return []
  }
}

// Main scraping function
const scrapeAllData = async () => {
  console.log('🚀 Starting ONJN data scraping...')
  
  const OUTPUT_FILE = path.join(process.cwd(), 'backend', 'onjn-scraped-data.json')
  
  // Check existing data to determine starting point
  let existingData = []
  let startPage = 1
  
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existingContent = fs.readFileSync(OUTPUT_FILE, 'utf8')
      existingData = JSON.parse(existingContent)
      console.log(`📊 Found existing data: ${existingData.length} slots`)
      // Start from where we left off
      startPage = Math.max(1, Math.floor(existingData.length / 50) + 1)
    } catch (error) {
      console.log('⚠️ Could not read existing file, starting fresh')
    }
  }
  
  const allSlots = [...existingData]
  const maxPages = 1171 // Exact number of pages for 58,533 slots
  
  console.log(`📄 Starting from page ${startPage}, will scrape up to ${maxPages} pages`)
  
  let successPages = 0
  let errorPages = 0
  let consecutiveEmptyPages = 0
  const maxConsecutiveEmptyPages = 10 // Stop after 10 consecutive empty pages (more persistent)
  
  // Scrape pages
  for (let page = startPage; page <= maxPages; page++) {
    try {
      console.log(`📄 Scraping page ${page}/${maxPages}...`)
      
      const slots = await scrapePage(page, null) // null = ALL operators
      
      // If page returns no results, increment consecutive empty counter
      if (slots.length === 0) {
        consecutiveEmptyPages++
        console.log(`📭 Page ${page} returned no results (consecutive empty: ${consecutiveEmptyPages}/${maxConsecutiveEmptyPages})`)
        
        if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
          console.log(`🛑 Stopping after ${maxConsecutiveEmptyPages} consecutive empty pages`)
          break
        }
      } else {
        // Reset consecutive empty counter when we find results
        consecutiveEmptyPages = 0
        
        // Add new slots (avoid duplicates based on serial_number)
        const existingSerialNumbers = new Set(allSlots.map(s => s.serial_number))
        const newSlots = slots.filter(s => !existingSerialNumbers.has(s.serial_number))
        
        allSlots.push(...newSlots)
        successPages++
        
        console.log(`✅ Page ${page}: Found ${slots.length} slots (${newSlots.length} new), Total: ${allSlots.length}`)
        
        // Save progress every 10 pages
        if (page % 10 === 0) {
          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allSlots, null, 2))
          console.log(`💾 Progress saved: ${allSlots.length} slots`)
        }
      }
      
      // Delay between requests to avoid rate limiting
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 0.5 second delay
      }
      
    } catch (error) {
      console.error(`Failed to scrape page ${page}:`, error.message)
      errorPages++
      
      // Continue with next page even if one fails
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay after error
      }
    }
  }
  
  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allSlots, null, 2))
  
  console.log('🎉 Scraping complete!')
  console.log(`📊 Results:`)
  console.log(`   • Total slots scraped: ${allSlots.length}`)
  console.log(`   • Pages with success: ${successPages}`)
  console.log(`   • Pages with errors: ${errorPages}`)
  console.log(`   • Data saved to: ${OUTPUT_FILE}`)
}

// Run the scraping
scrapeAllData().catch(error => {
  console.error('❌ Scraping failed:', error)
  process.exit(1)
})
