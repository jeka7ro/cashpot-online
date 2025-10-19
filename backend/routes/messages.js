import express from 'express'

const router = express.Router()

// Authentication middleware placeholder (will be applied in main server)
const authenticateUser = (req, res, next) => {
  req.user = req.user || { userId: 1, username: 'admin', full_name: 'Eugeniu Cazmal' }
  next()
}

// Get all messages for the authenticated user (sent and received)
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    const { type = 'all' } = req.query // 'sent', 'received', 'all'
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    let query = `
      SELECT m.*,
             s.username as sender_name,
             s.full_name as sender_full_name,
             r.username as recipient_name,
             r.full_name as recipient_full_name
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE 1=1
    `
    const params = [userId]

    if (type === 'sent') {
      query += ` AND m.sender_id = $1`
    } else if (type === 'received') {
      query += ` AND m.recipient_id = $1`
    } else {
      // all messages where user is sender or recipient
      query += ` AND (m.sender_id = $1 OR m.recipient_id = $1)`
    }

    query += ` ORDER BY m.created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Messages GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get unread messages count
router.get('/unread-count', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM messages
      WHERE recipient_id = $1 AND is_read = false
    `, [userId])

    res.json({ unread_count: parseInt(result.rows[0].unread_count) })
  } catch (error) {
    console.error('Unread count GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single message by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      SELECT m.*,
             s.username as sender_name,
             s.full_name as sender_full_name,
             r.username as recipient_name,
             r.full_name as recipient_full_name
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE m.id = $1 AND (m.sender_id = $2 OR m.recipient_id = $2)
    `, [id, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' })
    }

    // Mark as read if user is recipient
    if (result.rows[0].recipient_id === userId && !result.rows[0].is_read) {
      await pool.query(`
        UPDATE messages 
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id])
      result.rows[0].is_read = true
      result.rows[0].read_at = new Date()
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Message GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Send new message
router.post('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { recipient_id, subject, content, file_attachments } = req.body
    const senderId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    if (!recipient_id || !content) {
      return res.status(400).json({ success: false, error: 'Recipient and content are required' })
    }

    // Convert file_attachments array if provided
    const fileAttachmentsArray = Array.isArray(file_attachments) ? file_attachments : []

    const result = await pool.query(`
      INSERT INTO messages (sender_id, recipient_id, subject, content, file_attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [senderId, recipient_id, subject || null, content, fileAttachmentsArray])

    // Get the created message with user details
    const messageResult = await pool.query(`
      SELECT m.*,
             s.username as sender_name,
             s.full_name as sender_full_name,
             r.username as recipient_name,
             r.full_name as recipient_full_name
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE m.id = $1
    `, [result.rows[0].id])

    // Create notification for recipient
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, content, related_id)
      VALUES ($1, 'message', 'Mesaj nou', $2, $3)
    `, [recipient_id, `Ai primit un mesaj nou de la ${req.user?.full_name || req.user?.username || 'Unknown'}`, result.rows[0].id])

    res.status(201).json(messageResult.rows[0])
  } catch (error) {
    console.error('Message POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if user is the recipient
    const messageCheck = await pool.query(`
      SELECT * FROM messages WHERE id = $1 AND recipient_id = $2
    `, [id, userId])

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found or access denied' })
    }

    const result = await pool.query(`
      UPDATE messages 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND recipient_id = $2
      RETURNING *
    `, [id, userId])

    res.json({ success: true, message: 'Message marked as read' })
  } catch (error) {
    console.error('Message read PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete message (only sender can delete)
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      DELETE FROM messages 
      WHERE id = $1 AND sender_id = $2
    `, [id, userId])
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Message not found or access denied' })
    }

    res.json({ success: true, message: 'Message deleted successfully' })
  } catch (error) {
    console.error('Message DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
