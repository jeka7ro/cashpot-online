import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Load exported data as fallback
const loadExportedData = (filename) => {
  try {
    const filePath = path.join(__dirname, '..', 'cyber-data', filename)
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      console.log(`✅ Loaded ${data.length} items from ${filename}`)
      return data
    }
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message)
  }
  return []
}

// Get machine audit summaries
router.get('/machine-audit-summaries', async (req, res) => {
  try {
    const auditSummaries = loadExportedData('machine_audit_summaries.json')
    res.json(auditSummaries)
  } catch (error) {
    console.error('Error loading machine audit summaries:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get slots with jackpots
router.get('/slots-with-jackpots', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      const slots = loadExportedData('slots.json')
      return res.json(slots)
    }
    
    const query = `
      SELECT 
        s.*,
        j.id as jackpot_id,
        j.jackpot_name,
        j.jackpot_type,
        j.current_amount,
        j.max_amount,
        j.progress_percentage,
        j.status as jackpot_status,
        j.winner,
        j.triggered_date
      FROM slots s
      LEFT JOIN jackpots j ON s.serial_number = j.serial_number
      ORDER BY s.created_at DESC
    `
    
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching slots with jackpots:', error)
    const slots = loadExportedData('slots.json')
    res.json(slots)
  }
})

// Get Cyber slots
router.get('/slots', async (req, res) => {
  try {
    const slots = loadExportedData('slots.json')
    res.json(slots)
  } catch (error) {
    console.error('Error loading Cyber slots:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get Cyber cabinets
router.get('/cabinets', async (req, res) => {
  try {
    const cabinets = loadExportedData('cabinets.json')
    res.json(cabinets)
  } catch (error) {
    console.error('Error loading Cyber cabinets:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get Cyber locations
router.get('/locations', async (req, res) => {
  try {
    const locations = loadExportedData('locations.json')
    res.json(locations)
  } catch (error) {
    console.error('Error loading Cyber locations:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get Cyber game mixes
router.get('/game-mixes', async (req, res) => {
  try {
    const gameMixes = loadExportedData('game-mixes.json')
    res.json(gameMixes)
  } catch (error) {
    console.error('Error loading Cyber game mixes:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get Cyber providers
router.get('/providers', async (req, res) => {
  try {
    const providers = loadExportedData('providers.json')
    res.json(providers)
  } catch (error) {
    console.error('Error loading Cyber providers:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Test Cyber database connection
router.get('/test', async (req, res) => {
  try {
    res.json({ success: true, message: 'Cyber endpoints working', mode: 'json' })
  } catch (error) {
    console.error('Cyber connection test error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router

// Force Render deploy
