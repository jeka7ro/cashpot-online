import express from 'express'

const router = express.Router()

// Authentication middleware is applied in main server

// Get all tasks with optional filters
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { status, priority, assigned_to } = req.query
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    let query = `
      SELECT t.*, 
             u.username as created_by_name,
             u.full_name as created_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 0

    if (status) {
      paramCount++
      query += ` AND t.status = $${paramCount}`
      params.push(status)
    }
    
    if (priority) {
      paramCount++
      query += ` AND t.priority = $${paramCount}`
      params.push(priority)
    }
    
    if (assigned_to) {
      // For assigned_to filter, we need to check if the user ID is in the array
      paramCount++
      query += ` AND $${paramCount} = ANY(t.assigned_to)`
      params.push(parseInt(assigned_to))
    }

    query += ` ORDER BY t.created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Tasks GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get user's tasks (assigned to or created by user)
router.get('/my', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      SELECT t.*, 
             u.username as created_by_name,
             u.full_name as created_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE $1 = ANY(t.assigned_to) OR t.created_by = $1
      ORDER BY t.created_at DESC
    `, [userId])
    
    res.json(result.rows)
  } catch (error) {
    console.error('My tasks GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single task by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      SELECT t.*, 
             u.username as created_by_name,
             u.full_name as created_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Task GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create new task
router.post('/', async (req, res) => {
  try {
    console.log('🔥 DEBUG: POST /api/tasks endpoint hit')
    const pool = req.app.get('pool')
    const { title, description, priority, assigned_to, due_date } = req.body
    const createdBy = req.user?.userId || 1
    
    console.log('🔥 DEBUG: Request body:', { title, description, priority, assigned_to, due_date })
    console.log('🔥 DEBUG: User:', req.user)
    console.log('🔥 DEBUG: CreatedBy:', createdBy)
    
    if (!pool) {
      console.error('❌ Pool not available in tasks POST endpoint')
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' })
    }

    // Convert assigned_to array of user IDs to PostgreSQL array format
    const assignedToArray = Array.isArray(assigned_to) ? assigned_to.map(id => parseInt(id)) : []

    // Check if tasks table exists
    try {
      const checkTable = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tasks'
        )
      `)
      console.log('🔥 DEBUG: Tasks table exists:', checkTable.rows[0].exists)
      
      if (!checkTable.rows[0].exists) {
        console.error('❌ Tasks table does not exist!')
        return res.status(500).json({ success: false, error: 'Tasks table not found. Please check database initialization.' })
      }
    } catch (checkError) {
      console.error('❌ Error checking tasks table:', checkError)
      return res.status(500).json({ success: false, error: 'Database error: ' + checkError.message })
    }

    const result = await pool.query(`
      INSERT INTO tasks (title, description, priority, assigned_to, created_by, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title, description || null, priority || 'medium', assignedToArray, createdBy, due_date || null])

    // Get the created task with user details
    const taskResult = await pool.query(`
      SELECT t.*, 
             u.username as created_by_name,
             u.full_name as created_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [result.rows[0].id])

    res.status(201).json(taskResult.rows[0])
  } catch (error) {
    console.error('Task POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update task
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const { title, description, status, priority, assigned_to, due_date } = req.body
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if task exists
    const existingTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (existingTask.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    // Convert assigned_to array if provided
    const assignedToArray = Array.isArray(assigned_to) ? assigned_to.map(id => parseInt(id)) : existingTask.rows[0].assigned_to
    
    // Check if status is being changed to completed
    const completedAt = status === 'completed' && existingTask.rows[0].status !== 'completed' 
      ? new Date() 
      : existingTask.rows[0].completed_at

    const result = await pool.query(`
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          assigned_to = $5,
          due_date = COALESCE($6, due_date),
          completed_at = COALESCE($7, completed_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [title, description, status, priority, assignedToArray, due_date, completedAt, id])

    // Get updated task with user details
    const taskResult = await pool.query(`
      SELECT t.*, 
             u.username as created_by_name,
             u.full_name as created_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id])

    res.json(taskResult.rows[0])
  } catch (error) {
    console.error('Task PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update task status
router.put('/:id/status', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const { status } = req.body
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    if (!status || !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }

    const completedAt = status === 'completed' ? new Date() : null

    const result = await pool.query(`
      UPDATE tasks 
      SET status = $1,
          completed_at = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, completedAt, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Task status PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Assign users to task
router.put('/:id/assign', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const { assigned_to } = req.body
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const assignedToArray = Array.isArray(assigned_to) ? assigned_to.map(userId => parseInt(userId)) : []

    const result = await pool.query(`
      UPDATE tasks 
      SET assigned_to = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [assignedToArray, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Task assign PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id])
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    res.json({ success: true, message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Task DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
