import express from 'express'

const router = express.Router()

// Authentication middleware placeholder (will be applied in main server)
const authenticateUser = (req, res, next) => {
  req.user = req.user || { userId: 1, username: 'admin', full_name: 'Eugeniu Cazmal' }
  next()
}

// Get active promotions (for dashboard) - MUST BE FIRST to avoid /:id conflict
router.get('/active', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    const result = await pool.query(`
      SELECT * FROM promotions 
      WHERE status = 'Active' 
      AND end_date >= CURRENT_DATE 
      ORDER BY start_date ASC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Active promotions GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get all promotions
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    const result = await pool.query('SELECT * FROM promotions ORDER BY start_date DESC, created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Promotions GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})


// Get single promotion
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = req.app.get('pool')
    const result = await pool.query('SELECT * FROM promotions WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Promotion not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Promotion GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create promotion
router.post('/', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { 
      name, description, start_date, end_date, location, locations, prizes, 
      status, notes, banner_url, documents_url, attachments 
    } = req.body
    const createdBy = req.user?.full_name || req.user?.username || 'Eugeniu Cazmal'
    
    console.log('🚨 PROMOTIONS POST data:', { name, description, start_date, end_date, location, locations, prizes })
    
    // Calculate total amount from prizes
    const prizesArray = Array.isArray(prizes) ? prizes : []
    const totalAmount = prizesArray.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    
    // Handle locations array
    const locationsArray = Array.isArray(locations) ? locations : []
    
    // Use first location's dates if no global dates provided
    const globalStartDate = start_date || (locationsArray[0]?.start_date) || new Date().toISOString().split('T')[0]
    const globalEndDate = end_date || (locationsArray[0]?.end_date) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Get first location name as default location
    const defaultLocation = location || (locationsArray.length > 0 ? locationsArray[0].location : 'Default Location')
    
    // Parse attachments
    const attachmentsArray = Array.isArray(attachments) ? attachments : []
    
    const result = await pool.query(
      `INSERT INTO promotions 
       (name, description, start_date, end_date, total_amount, awarded_amount, location, locations, 
        status, prizes, notes, banner_url, documents_url, attachments, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [
        name || 'Untitled Promotion', 
        description || '', 
        globalStartDate, 
        globalEndDate, 
        totalAmount, 
        0, 
        defaultLocation, 
        JSON.stringify(locationsArray), 
        status || 'Active', 
        JSON.stringify(prizesArray), 
        notes || '', 
        banner_url || null,
        documents_url || null,
        JSON.stringify(attachmentsArray),
        createdBy
      ]
    )
    
    console.log('✅ Promotion created:', result.rows[0].id)
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Promotion POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update promotion
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const { 
      name, description, start_date, end_date, location, locations, prizes, 
      status, notes, awarded_amount, banner_url, documents_url, attachments 
    } = req.body
    
    // Calculate total amount from prizes
    const prizesArray = Array.isArray(prizes) ? prizes : []
    const totalAmount = prizesArray.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    
    // Handle locations array
    const locationsArray = Array.isArray(locations) ? locations : []
    
    // Parse attachments
    const attachmentsArray = Array.isArray(attachments) ? attachments : []
    
    const result = await pool.query(
      `UPDATE promotions 
       SET name = $1, description = $2, start_date = $3, end_date = $4, 
           total_amount = $5, awarded_amount = $6, location = $7, locations = $8, status = $9, 
           prizes = $10, notes = $11, banner_url = $12, documents_url = $13, attachments = $14,
           updated_at = CURRENT_TIMESTAMP, updated_by = $15
       WHERE id = $16 
       RETURNING *`,
      [
        name, 
        description, 
        start_date, 
        end_date, 
        totalAmount, 
        awarded_amount || 0, 
        location, 
        JSON.stringify(locationsArray),
        status, 
        JSON.stringify(prizesArray), 
        notes, 
        banner_url,
        documents_url,
        JSON.stringify(attachmentsArray),
        req.user?.full_name || req.user?.username || 'Eugeniu Cazmal',
        id
      ]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Promotion not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Promotion PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete promotion
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const result = await pool.query('DELETE FROM promotions WHERE id = $1', [id])
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Promotion not found' })
    }
    
    res.json({ success: true, message: 'Promotion deleted successfully' })
  } catch (error) {
    console.error('Promotion DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// TEST: Insert sample promotion if table is empty
router.post('/test-sample', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if promotions table has any data
    const countResult = await pool.query('SELECT COUNT(*) FROM promotions')
    const count = parseInt(countResult.rows[0].count)
    
    if (count === 0) {
      // Insert sample promotion
      const samplePromotion = await pool.query(`
        INSERT INTO promotions (name, description, start_date, end_date, location, status, prizes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        'Tombala Weekend-ului',
        'Promoție specială pentru weekend cu premii mari',
        new Date().toISOString().split('T')[0], // today
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // next week
        'Locație Centrală',
        'Active',
        JSON.stringify([
          { name: 'Premiul 1', value: 1000, qty: 1 },
          { name: 'Premiul 2', value: 500, qty: 2 }
        ]),
        'system'
      ])
      
      console.log('✅ Sample promotion inserted:', samplePromotion.rows[0])
      res.json({ success: true, message: 'Sample promotion created', promotion: samplePromotion.rows[0] })
    } else {
      res.json({ success: false, message: `Promotions table already has ${count} records` })
    }
  } catch (error) {
    console.error('Test sample promotion error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

