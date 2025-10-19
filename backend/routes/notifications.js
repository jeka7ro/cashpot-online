import express from 'express'

const router = express.Router()

// Authentication middleware placeholder (will be applied in main server)
const authenticateUser = (req, res, next) => {
  req.user = req.user || { userId: 1, username: 'admin', full_name: 'Eugeniu Cazmal' }
  next()
}

// Get all notifications for the authenticated user
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    const { unread_only = false } = req.query
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    let query = `
      SELECT n.*
      FROM notifications n
      WHERE n.user_id = $1
    `
    const params = [userId]

    if (unread_only === 'true') {
      query += ` AND n.is_read = false`
    }

    query += ` ORDER BY n.created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Notifications GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get unread notifications count
router.get('/unread-count', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [userId])

    res.json({ unread_count: parseInt(result.rows[0].unread_count) })
  } catch (error) {
    console.error('Unread notifications count GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      UPDATE notifications 
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' })
    }

    res.json({ success: true, message: 'Notification marked as read' })
  } catch (error) {
    console.error('Notification read PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    await pool.query(`
      UPDATE notifications 
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
    `, [userId])

    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Mark all notifications read PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
    `, [id, userId])
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' })
    }

    res.json({ success: true, message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Notification DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
