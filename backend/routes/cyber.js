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
