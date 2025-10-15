import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { body, validationResult } from 'express-validator'

const router = express.Router()

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      })
    }

    const { username, password } = req.body

    // Import pool from server-postgres.js (this will be passed from the main server)
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      })
    }

    // Find user by username or email
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    const user = result.rows[0]

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || {},
        avatar: user.avatar
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret')
    
    // Import pool from server-postgres.js
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      })
    }

    // Get user from database
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId])
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      })
    }

    const user = result.rows[0]

    // Get default permissions for role if permissions are empty
    let userPermissions = user.permissions
    if (!userPermissions || Object.keys(userPermissions).length === 0) {
      // Import default permissions logic (simplified version)
      const defaultPermissions = {
        admin: { 
          dashboard: { view: true },
          companies: { view: true, create: true, update: true, delete: true },
          locations: { view: true, create: true, update: true, delete: true },
          providers: { view: true, create: true, update: true, delete: true },
          cabinets: { view: true, create: true, update: true, delete: true },
          gameMixes: { view: true, create: true, update: true, delete: true },
          slots: { view: true, create: true, update: true, delete: true },
          invoices: { view: true, create: true, update: true, delete: true },
          jackpots: { view: true, create: true, update: true, delete: true },
          legalDocuments: { view: true, create: true, update: true, delete: true },
          onjnReports: { view: true, create: true, update: true, delete: true },
          metrology: { view: true, create: true, update: true, delete: true },
          warehouse: { view: true, create: true, update: true, delete: true },
          users: { view: true, create: true, update: true, delete: true },
          cyberImport: { view: true, import: true }
        },
        user: { 
          dashboard: { view: true },
          companies: { view: true },
          locations: { view: true },
          providers: { view: true },
          cabinets: { view: true },
          gameMixes: { view: true },
          slots: { view: true },
          invoices: { view: true },
          jackpots: { view: true },
          legalDocuments: { view: true },
          onjnReports: { view: true },
          metrology: { view: true },
          warehouse: { view: true },
          users: { view: false },
          cyberImport: { view: false, import: false }
        }
      }
      userPermissions = defaultPermissions[user.role] || defaultPermissions.user
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        permissions: userPermissions,
        avatar: user.avatar
      }
    })

  } catch (error) {
    console.error('Verify token error:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
})

export default router