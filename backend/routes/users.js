import express from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const router = express.Router()

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name, email, role, avatar, permissions, notes, status, created_at, updated_at FROM users ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ success: false, message: 'Error fetching users' })
  }
})

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    console.log('GET /api/users/:id called with id:', req.params.id)
    const { id } = req.params
    const result = await pool.query('SELECT id, username, full_name, email, role, avatar, permissions, notes, status, preferences, created_at, updated_at FROM users WHERE id = $1', [id])
    console.log('Query result:', result.rows.length, 'rows')
    if (result.rows.length === 0) {
      console.log('User not found with id:', id)
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    console.log('Returning user:', result.rows[0].username)
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ success: false, message: 'Error fetching user' })
  }
})

// PUT /api/users/:id/preferences (for dashboard sync)
router.put('/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params
    const { preferences } = req.body

    const result = await pool.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, full_name, email, role, avatar, permissions, notes, status, preferences',
      [JSON.stringify(preferences), id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating preferences:', error)
    res.status(500).json({ success: false, message: 'Error updating preferences' })
  }
})

// POST /api/users
router.post('/', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { username, password, full_name, email, role, avatar, permissions, notes, status } = req.body

    // Check if username already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      'INSERT INTO users (username, password, full_name, email, role, avatar, permissions, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, full_name, email, role, avatar, permissions, notes, status, created_at',
      [username, hashedPassword, full_name, email, role || 'user', avatar, JSON.stringify(permissions || {}), notes, status || 'active']
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ success: false, message: 'Error creating user' })
  }
})

// PUT /api/users/:id
router.put('/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { id } = req.params
    const { username, password, full_name, email, role, avatar, permissions, notes, status } = req.body

    // Build update query dynamically
    let query = 'UPDATE users SET full_name = $1, email = $2, role = $3, avatar = $4, permissions = $5, notes = $6, status = $7, updated_at = CURRENT_TIMESTAMP'
    let params = [full_name, email, role, avatar, JSON.stringify(permissions || {}), notes, status]
    let paramIndex = 8

    // If password is provided, hash it and include in update
    if (password && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10)
      query += `, password = $${paramIndex}`
      params.push(hashedPassword)
      paramIndex++
    }

    query += ` WHERE id = $${paramIndex} RETURNING id, username, full_name, email, role, avatar, permissions, notes, status, created_at, updated_at`
    params.push(id)

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ success: false, message: 'Error updating user' })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Don't allow deleting user with id 1 (admin)
    if (id === '1') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin user' })
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ success: false, message: 'Error deleting user' })
  }
})

export default router
