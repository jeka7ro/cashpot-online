import express from 'express'
import { body, validationResult } from 'express-validator'
import XLSX from 'xlsx'

const router = express.Router()

// Get all companies
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query
    
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    let query = 'SELECT * FROM companies WHERE 1=1'
    let params = []
    let paramCount = 0

    if (search) {
      paramCount++
      query += ` AND (name ILIKE $${paramCount} OR cui ILIKE $${paramCount} OR email ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    if (status) {
      paramCount++
      query += ` AND status = $${paramCount}`
      params.push(status)
    }

    // Add pagination
    const offset = (page - 1) * limit
    paramCount++
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`
    params.push(limit)
    
    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await pool.query(query, params)
    res.json(result.rows)

  } catch (error) {
    console.error('Error fetching companies:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get company by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    res.json(result.rows[0])

  } catch (error) {
    console.error('Error fetching company:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create new company
router.post('/', [
  body('name').notEmpty().withMessage('Company name is required'),
  body('cui').notEmpty().withMessage('CUI is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { name, cui, registrationNumber, address, city, county, phone, email, website, contactPerson, documents } = req.body

    const result = await pool.query(
      `INSERT INTO companies (name, cui, registration_number, address, city, county, phone, email, website, contact_person, documents, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [name, cui, registrationNumber, address, city, county, phone, email, website, contactPerson, documents || []]
    )

    res.status(201).json(result.rows[0])

  } catch (error) {
    console.error('Error creating company:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update company
router.put('/:id', [
  body('name').notEmpty().withMessage('Company name is required'),
  body('cui').notEmpty().withMessage('CUI is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { name, cui, registrationNumber, address, city, county, phone, email, website, contactPerson, documents } = req.body

    const result = await pool.query(
      `UPDATE companies SET 
       name = $1, cui = $2, registration_number = $3, address = $4, city = $5, county = $6, 
       phone = $7, email = $8, website = $9, contact_person = $10, documents = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [name, cui, registrationNumber, address, city, county, phone, email, website, contactPerson, documents || [], req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    res.json(result.rows[0])

  } catch (error) {
    console.error('Error updating company:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete company
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING *', [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    res.json({ message: 'Company deleted successfully' })

  } catch (error) {
    console.error('Error deleting company:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router