import express from 'express'
import pg from 'pg'

const { Pool } = pg

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

const router = express.Router()

// Get slot history with filters
router.get('/', async (req, res) => {
  try {
    const { 
      slot_id, 
      serial_number, 
      field_name, 
      user_id, 
      username,
      start_date, 
      end_date,
      change_type,
      limit = 100,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query

    let query = `
      SELECT 
        sh.*,
        s.serial_number as slot_serial,
        s.location,
        s.provider,
        s.cabinet,
        s.game_mix
      FROM slot_history sh
      LEFT JOIN slots s ON sh.slot_id = s.id
      WHERE 1=1
    `
    
    const params = []
    let paramIndex = 1

    if (slot_id) {
      query += ` AND sh.slot_id = $${paramIndex}`
      params.push(slot_id)
      paramIndex++
    }

    if (serial_number) {
      query += ` AND (sh.serial_number ILIKE $${paramIndex} OR s.serial_number ILIKE $${paramIndex})`
      params.push(`%${serial_number}%`)
      paramIndex++
    }

    if (field_name) {
      query += ` AND sh.field_name ILIKE $${paramIndex}`
      params.push(`%${field_name}%`)
      paramIndex++
    }

    if (user_id) {
      query += ` AND sh.user_id = $${paramIndex}`
      params.push(user_id)
      paramIndex++
    }

    if (username) {
      query += ` AND sh.username ILIKE $${paramIndex}`
      params.push(`%${username}%`)
      paramIndex++
    }

    if (start_date) {
      query += ` AND sh.created_at >= $${paramIndex}`
      params.push(start_date + ' 00:00:00')
      paramIndex++
    }

    if (end_date) {
      query += ` AND sh.created_at <= $${paramIndex}`
      params.push(end_date + ' 23:59:59')
      paramIndex++
    }

    if (change_type) {
      query += ` AND sh.change_type = $${paramIndex}`
      params.push(change_type)
      paramIndex++
    }

    // Add sorting
    const validSortColumns = ['created_at', 'field_name', 'username', 'serial_number']
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at'
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    query += ` ORDER BY sh.${sortColumn} ${sortDirection}`

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM slot_history sh
      LEFT JOIN slots s ON sh.slot_id = s.id
      WHERE 1=1
    `
    
    const countParams = []
    let countParamIndex = 1

    if (slot_id) {
      countQuery += ` AND sh.slot_id = $${countParamIndex}`
      countParams.push(slot_id)
      countParamIndex++
    }

    if (serial_number) {
      countQuery += ` AND (sh.serial_number ILIKE $${countParamIndex} OR s.serial_number ILIKE $${countParamIndex})`
      countParams.push(`%${serial_number}%`)
      countParamIndex++
    }

    if (field_name) {
      countQuery += ` AND sh.field_name ILIKE $${countParamIndex}`
      countParams.push(`%${field_name}%`)
      countParamIndex++
    }

    if (user_id) {
      countQuery += ` AND sh.user_id = $${countParamIndex}`
      countParams.push(user_id)
      countParamIndex++
    }

    if (username) {
      countQuery += ` AND sh.username ILIKE $${countParamIndex}`
      countParams.push(`%${username}%`)
      countParamIndex++
    }

    if (start_date) {
      countQuery += ` AND sh.created_at >= $${countParamIndex}`
      countParams.push(start_date + ' 00:00:00')
      countParamIndex++
    }

    if (end_date) {
      countQuery += ` AND sh.created_at <= $${countParamIndex}`
      countParams.push(end_date + ' 23:59:59')
      countParamIndex++
    }

    if (change_type) {
      countQuery += ` AND sh.change_type = $${countParamIndex}`
      countParams.push(change_type)
      countParamIndex++
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    res.json({
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Error fetching slot history:', error)
    res.status(500).json({ error: 'Error fetching slot history' })
  }
})

// Get slot history for a specific slot
router.get('/slot/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 50, offset = 0 } = req.query

    const query = `
      SELECT 
        sh.*,
        s.serial_number as slot_serial,
        s.location,
        s.provider,
        s.cabinet,
        s.game_mix
      FROM slot_history sh
      LEFT JOIN slots s ON sh.slot_id = s.id
      WHERE sh.slot_id = $1 OR sh.serial_number = $1
      ORDER BY sh.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await pool.query(query, [id, parseInt(limit), parseInt(offset)])
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching slot history:', error)
    res.status(500).json({ error: 'Error fetching slot history' })
  }
})

// Get history statistics
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query

    let query = `
      SELECT 
        COUNT(*) as total_changes,
        COUNT(DISTINCT slot_id) as unique_slots,
        COUNT(DISTINCT username) as unique_users,
        COUNT(DISTINCT field_name) as unique_fields,
        MIN(created_at) as first_change,
        MAX(created_at) as last_change
      FROM slot_history
      WHERE 1=1
    `
    
    const params = []
    let paramIndex = 1

    if (start_date) {
      query += ` AND created_at >= $${paramIndex}`
      params.push(start_date + ' 00:00:00')
      paramIndex++
    }

    if (end_date) {
      query += ` AND created_at <= $${paramIndex}`
      params.push(end_date + ' 23:59:59')
      paramIndex++
    }

    const result = await pool.query(query, params)
    
    // Get field statistics
    let fieldQuery = `
      SELECT 
        field_name,
        COUNT(*) as change_count
      FROM slot_history
      WHERE 1=1
    `
    
    if (start_date) {
      fieldQuery += ` AND created_at >= $1`
      params.push(start_date + ' 00:00:00')
    }
    
    if (end_date) {
      fieldQuery += ` AND created_at <= $${start_date ? 2 : 1}`
      params.push(end_date + ' 23:59:59')
    }
    
    fieldQuery += ` GROUP BY field_name ORDER BY change_count DESC LIMIT 10`

    const fieldResult = await pool.query(fieldQuery, params)
    
    // Get user statistics
    let userQuery = `
      SELECT 
        username,
        COUNT(*) as change_count
      FROM slot_history
      WHERE 1=1
    `
    
    if (start_date) {
      userQuery += ` AND created_at >= $1`
      params.push(start_date + ' 00:00:00')
    }
    
    if (end_date) {
      userQuery += ` AND created_at <= $${start_date ? 2 : 1}`
      params.push(end_date + ' 23:59:59')
    }
    
    userQuery += ` GROUP BY username ORDER BY change_count DESC LIMIT 10`

    const userResult = await pool.query(userQuery, params)

    res.json({
      overview: result.rows[0],
      topFields: fieldResult.rows,
      topUsers: userResult.rows
    })
  } catch (error) {
    console.error('Error fetching history statistics:', error)
    res.status(500).json({ error: 'Error fetching history statistics' })
  }
})

// Add history entry (called when slots are updated)
router.post('/', async (req, res) => {
  try {
    const {
      slot_id,
      serial_number,
      field_name,
      old_value,
      new_value,
      change_type = 'UPDATE',
      user_id,
      username,
      ip_address,
      user_agent,
      metadata
    } = req.body

    const query = `
      INSERT INTO slot_history (
        slot_id, serial_number, field_name, old_value, new_value,
        change_type, user_id, username, ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `

    const values = [
      slot_id,
      serial_number,
      field_name,
      old_value,
      new_value,
      change_type,
      user_id,
      username,
      ip_address,
      user_agent,
      metadata ? JSON.stringify(metadata) : null
    ]

    const result = await pool.query(query, values)
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error adding history entry:', error)
    res.status(500).json({ error: 'Error adding history entry' })
  }
})

export default router
