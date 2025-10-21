import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper function to parse operator field (Company + Brand)
const parseOperator = (operatorText) => {
  if (!operatorText) return { company_name: null, brand_name: null }
  
  // Split by double spaces or newlines
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

// Helper function to check if date is expired
const isDateExpired = (dateStr) => {
  if (!dateStr) return false
  
  try {
    const expiryDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return expiryDate < today
  } catch (error) {
    return false
  }
}

// Scrape single page from ONJN
const scrapePage = async (pageNumber, companyId = null) => {
  // If companyId provided, filter by company, otherwise get ALL operators
  const companyFilter = companyId ? `&company_id=${companyId}` : ''
  const url = `https://registru.onjn.gov.ro/mijloace-de-joc/1?in_use=1${companyFilter}&page=${pageNumber}`
  
  console.log(`🕷️ Scraping page ${pageNumber}: ${url}`)
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 30000
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
        const detailsUuid = detailsLink ? detailsLink.split('/').pop() : null
        
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
        const { company_name, brand_name } = parseOperator(operatorText)
        
        const licenseNumber = $(cells[4]).text().trim()
        
        const authorizationDate = parseRomanianDate($(cells[5]).text().trim())
        const expiryDate = parseRomanianDate($(cells[6]).text().trim())
        
        const statusText = $(cells[7]).text().trim()
        const status = statusText.includes('exploatare') ? 'În exploatare' : 'Scos din funcțiune'
        
        const slot = {
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
          is_expired: isDateExpired(expiryDate),
          onjn_list_url: url,
          onjn_details_url: detailsLink ? `https://registru.onjn.gov.ro${detailsLink}` : null,
          last_scraped_at: new Date()
        }
        
        slots.push(slot)
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error.message)
      }
    })
    
    console.log(`✅ Page ${pageNumber}: Found ${slots.length} slots`)
    return slots
    
  } catch (error) {
    console.error(`❌ Error scraping page ${pageNumber}:`, error.message)
    throw error
  }
}

// GET /api/onjn-operators - Get all operators
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    const result = await pool.query(`
      SELECT * FROM onjn_operators
      ORDER BY serial_number ASC
    `)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching ONJN operators:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/onjn-operators/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM onjn_operators')
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM onjn_operators
      GROUP BY status
    `)
    const countyResult = await pool.query(`
      SELECT county, COUNT(*) as count
      FROM onjn_operators
      GROUP BY county
      ORDER BY count DESC
      LIMIT 10
    `)
    const companyResult = await pool.query(`
      SELECT company_name, COUNT(*) as count
      FROM onjn_operators
      WHERE company_name IS NOT NULL
      GROUP BY company_name
      ORDER BY count DESC
      LIMIT 10
    `)
    const brandResult = await pool.query(`
      SELECT brand_name, COUNT(*) as count
      FROM onjn_operators
      WHERE brand_name IS NOT NULL
      GROUP BY brand_name
      ORDER BY count DESC
      LIMIT 10
    `)
    const expiredResult = await pool.query(`
      SELECT COUNT(*) as count FROM onjn_operators WHERE is_expired = TRUE
    `)
    const expiringSoonResult = await pool.query(`
      SELECT COUNT(*) as count FROM onjn_operators 
      WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND expiry_date > CURRENT_DATE
    `)
    
    res.json({
      total: parseInt(totalResult.rows[0].total),
      byStatus: statusResult.rows,
      byCounty: countyResult.rows,
      byCompany: companyResult.rows,
      byBrand: brandResult.rows,
      expired: parseInt(expiredResult.rows[0].count),
      expiringSoon: parseInt(expiringSoonResult.rows[0].count)
    })
  } catch (error) {
    console.error('Error fetching ONJN stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Global variable to track refresh progress
let _refreshProgress = null

// Export methods to access refreshProgress
const refreshProgressManager = {
  get: () => _refreshProgress,
  set: (value) => { _refreshProgress = value }
}

export { refreshProgressManager }

// POST /api/onjn-operators/refresh - Scrape all pages from ONJN
router.post('/refresh', async (req, res) => {
  // Check if already refreshing
  if (_refreshProgress && _refreshProgress.status === 'running') {
    return res.status(400).json({ 
      success: false, 
      error: 'Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.' 
    })
  }
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    // Get parameters from request body
    const { 
      companyId = null,  // null = ALL operators, 18 = MAX BET, etc.
      maxPages = null    // null = auto-detect, number = limit pages
    } = req.body || {}
    
    console.log('🚀 Starting ONJN scraping...')
    console.log(`📋 Company filter: ${companyId || 'ALL OPERATORS'}`)
    console.log(`📄 Max pages: ${maxPages || 'AUTO-DETECT'}`)
    
    // Initialize progress tracking
    _refreshProgress = {
      status: 'running',
      currentPage: 0,
      totalPages: 0,
      currentStep: 'Initializing...',
      slotsFound: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      startTime: new Date()
    }
    
    // First, scrape page 1 to detect total pages
    _refreshProgress.currentStep = 'Scraping page 1...'
    _refreshProgress.currentPage = 1
    const firstPage = await scrapePage(1, companyId)
    
    // Try to detect total results from page (we'll use a reasonable default)
    // For ALL operators: ~58,533 slots = ~1,171 pages (including out of service)
    // For MAX BET (company_id=18): ~2,864 slots = ~58 pages
    let totalPages
    if (maxPages) {
      totalPages = maxPages
    } else if (companyId === 18) {
      totalPages = 58  // MAX BET specific
    } else if (companyId) {
      totalPages = 100  // Default for specific company
    } else {
      totalPages = 1200  // Allow all ~58,533 slots (~1,171 pages + buffer for safety)
    }
    
    console.log(`📊 Total pages to scrape: ${totalPages}`)
    
    // Update progress with total pages
    _refreshProgress.totalPages = totalPages
    _refreshProgress.slotsFound = firstPage.length
    
    let allSlots = [...firstPage]
    let successPages = 1
    let errorPages = 0
    
    // Scrape remaining pages
    for (let page = 2; page <= totalPages; page++) {
      try {
        _refreshProgress.currentStep = `Scraping page ${page}/${totalPages}...`
        _refreshProgress.currentPage = page
        
        const slots = await scrapePage(page, companyId)
        
        // If page returns no results, we've reached the end
        if (slots.length === 0) {
          console.log(`📭 Page ${page} returned no results - stopping scraping`)
          break
        }
        
        allSlots = allSlots.concat(slots)
        successPages++
        _refreshProgress.slotsFound = allSlots.length
        
        // Delay between requests to avoid rate limiting
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500)) // 0.5 second delay for faster scraping
        }
      } catch (error) {
        console.error(`Failed to scrape page ${page}:`, error.message)
        errorPages++
        _refreshProgress.errors++
        
        // Continue with next page even if one fails
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay after error
        }
      }
    }
    
    console.log(`📊 Scraping complete: ${allSlots.length} slots from ${successPages} pages (${errorPages} errors)`)
    
    // Update progress for database operations
    _refreshProgress.currentStep = 'Saving to database...'
    _refreshProgress.inserted = 0
    _refreshProgress.updated = 0
    
    // Insert/Update slots in database
    let inserted = 0
    let updated = 0
    let errors = 0
    
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i]
      
      // Update progress every 100 slots
      if (i % 100 === 0) {
        _refreshProgress.currentStep = `Saving to database... (${i}/${allSlots.length})`
      }
      try {
        // Check if slot exists and get current data for comparison
        const existing = await pool.query(
          `SELECT id, details_uuid, equipment_type, company_name, brand_name, 
                  license_number, slot_address, city, county, authorization_date, 
                  expiry_date, status, is_expired, onjn_list_url, onjn_details_url 
           FROM onjn_operators WHERE serial_number = $1`,
          [slot.serial_number]
        )
        
        if (existing.rows.length > 0) {
          const existingData = existing.rows[0]
          
          // Check if any data has changed
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
            _refreshProgress.updated = updated
          } else {
            // Just update last_scraped_at if no changes
            await pool.query(
              'UPDATE onjn_operators SET last_scraped_at = $1 WHERE serial_number = $2',
              [slot.last_scraped_at, slot.serial_number]
            )
          }
        } else {
          // Insert new
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
          _refreshProgress.inserted = inserted
        }
      } catch (error) {
        console.error(`Error saving slot ${slot.serial_number}:`, error.message)
        errors++
        _refreshProgress.errors++
      }
    }
    
    console.log(`✅ Database update complete: ${inserted} inserted, ${updated} updated, ${errors} errors`)
    
    // Mark as completed
    _refreshProgress.status = 'completed'
    _refreshProgress.currentStep = 'Completed successfully!'
    _refreshProgress.endTime = new Date()
    _refreshProgress.duration = _refreshProgress.endTime - _refreshProgress.startTime
    
    res.json({
      success: true,
      scraped: allSlots.length,
      inserted,
      updated,
      errors,
      pages: {
        total: totalPages,
        success: successPages,
        errors: errorPages
      }
    })
    
  } catch (error) {
    console.error('Error refreshing ONJN operators:', error)
    // Mark as failed
    if (_refreshProgress) {
      _refreshProgress.status = 'failed'
      _refreshProgress.currentStep = `Error: ${error.message}`
      _refreshProgress.endTime = new Date()
    }
    res.status(500).json({ success: false, error: error.message })
  } finally {
    // Clear progress after 30 seconds if completed or failed
    setTimeout(() => {
      if (_refreshProgress && (_refreshProgress.status === 'completed' || _refreshProgress.status === 'failed')) {
        _refreshProgress = null
      }
    }, 30000)
  }
})

// POST /api/onjn-operators/import-json - Import data from JSON file
router.post('/import-json', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    // Check if already importing
    if (_refreshProgress && _refreshProgress.status === 'running') {
      return res.status(400).json({ 
        success: false, 
        error: 'Import deja în curs. Vă rugăm să așteptați finalizarea.' 
      })
    }
    
    // Try multiple possible locations for the JSON file
    const possiblePaths = [
      path.join(__dirname, '..', 'onjn-scraped-data.json'),
      path.join(__dirname, '..', '..', 'backend', 'onjn-scraped-data.json'),
      path.join(__dirname, '..', 'backend', 'onjn-scraped-data.json')
    ]
    
    let jsonFilePath = null
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        jsonFilePath = possiblePath
        break
      }
    }
    
    if (!jsonFilePath) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fișierul JSON nu a fost găsit. Rulați mai întâi scriptul de scraping.' 
      })
    }
    
    console.log('📁 Loading JSON data from:', jsonFilePath)
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'))
    
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Fișierul JSON nu conține date valide.' 
      })
    }
    
    // Initialize progress
    _refreshProgress = {
      status: 'running',
      currentPage: 0,
      totalPages: Math.ceil(jsonData.length / 100), // Process in batches of 100
      currentStep: 'Importing from JSON...',
      slotsFound: jsonData.length,
      inserted: 0,
      updated: 0,
      errors: 0,
      startTime: new Date()
    }
    
    console.log(`🚀 Starting JSON import: ${jsonData.length} slots`)
    
    let inserted = 0
    let updated = 0
    let errors = 0
    
    // Process in batches
    const batchSize = 100
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize)
      
      _refreshProgress.currentStep = `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jsonData.length / batchSize)}...`
      _refreshProgress.currentPage = Math.floor(i / batchSize) + 1
      
      for (const slot of batch) {
        try {
          // Check if slot exists
          const existing = await pool.query(
            'SELECT id, serial_number FROM onjn_operators WHERE serial_number = $1',
            [slot.serial_number]
          )
          
          if (existing.rows.length > 0) {
            // Update existing
            await pool.query(`
              UPDATE onjn_operators SET
                details_uuid = $1, equipment_type = $2, company_name = $3, brand_name = $4,
                license_number = $5, slot_address = $6, city = $7, county = $8,
                authorization_date = $9, expiry_date = $10, status = $11, is_expired = $12,
                onjn_list_url = $13, onjn_details_url = $14, last_scraped_at = $15,
                updated_at = CURRENT_TIMESTAMP
              WHERE serial_number = $16
            `, [
              slot.details_uuid, slot.equipment_type, slot.company_name, slot.brand_name,
              slot.license_number, slot.slot_address, slot.city, slot.county,
              slot.authorization_date, slot.expiry_date, slot.status, slot.is_expired,
              slot.onjn_list_url, slot.onjn_details_url, slot.last_scraped_at,
              slot.serial_number
            ])
            updated++
          } else {
            // Insert new
            await pool.query(`
              INSERT INTO onjn_operators (
                serial_number, details_uuid, equipment_type, company_name, brand_name,
                license_number, slot_address, city, county, authorization_date,
                expiry_date, status, is_expired, onjn_list_url, onjn_details_url,
                last_scraped_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
              slot.serial_number, slot.details_uuid, slot.equipment_type, slot.company_name, slot.brand_name,
              slot.license_number, slot.slot_address, slot.city, slot.county, slot.authorization_date,
              slot.expiry_date, slot.status, slot.is_expired, slot.onjn_list_url, slot.onjn_details_url,
              slot.last_scraped_at
            ])
            inserted++
          }
        } catch (error) {
          console.error(`Error processing slot ${slot.serial_number}:`, error.message)
          errors++
        }
      }
      
      _refreshProgress.inserted = inserted
      _refreshProgress.updated = updated
      _refreshProgress.errors = errors
    }
    
    // Mark as completed
    _refreshProgress.status = 'completed'
    _refreshProgress.currentStep = 'Import completed successfully!'
    _refreshProgress.endTime = new Date()
    _refreshProgress.duration = _refreshProgress.endTime - _refreshProgress.startTime
    
    console.log(`✅ JSON import complete: ${inserted} inserted, ${updated} updated, ${errors} errors`)
    
    res.json({
      success: true,
      message: 'Import from JSON completed successfully',
      inserted,
      updated,
      errors,
      total: jsonData.length
    })
    
  } catch (error) {
    console.error('Error importing from JSON:', error)
    
    if (_refreshProgress) {
      _refreshProgress.status = 'failed'
      _refreshProgress.currentStep = `Error: ${error.message}`
      _refreshProgress.endTime = new Date()
    }
    
    res.status(500).json({ success: false, error: error.message })
  } finally {
    // Clear progress after 30 seconds if completed or failed
    setTimeout(() => {
      if (_refreshProgress && (_refreshProgress.status === 'completed' || _refreshProgress.status === 'failed')) {
        _refreshProgress = null
      }
    }, 30000)
  }
})

// DELETE /api/onjn-operators/:id - Delete operator
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    await pool.query('DELETE FROM onjn_operators WHERE id = $1', [id])
    
    res.json({ success: true, message: 'Operator deleted successfully' })
  } catch (error) {
    console.error('Error deleting ONJN operator:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

