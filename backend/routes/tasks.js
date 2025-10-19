import express from 'express'
import multer from 'multer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'cashpot-uploads'
const isS3Enabled = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/tasks'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  }
})
const upload = multer({ storage: storage })

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
             cb.username as completed_by_name,
             cb.full_name as completed_by_full_name,
             ab.username as approved_by_name,
             ab.full_name as approved_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users cb ON t.completed_by = cb.id
      LEFT JOIN users ab ON t.approved_by = ab.id
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
             cb.username as completed_by_name,
             cb.full_name as completed_by_full_name,
             ab.username as approved_by_name,
             ab.full_name as approved_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users cb ON t.completed_by = cb.id
      LEFT JOIN users ab ON t.approved_by = ab.id
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
             cb.username as completed_by_name,
             cb.full_name as completed_by_full_name,
             ab.username as approved_by_name,
             ab.full_name as approved_by_full_name,
             ARRAY(
               SELECT json_build_object('id', au.id, 'username', au.username, 'full_name', au.full_name)
               FROM unnest(t.assigned_to) as assignee_id,
                    users au
               WHERE au.id = assignee_id
             ) as assigned_users
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users cb ON t.completed_by = cb.id
      LEFT JOIN users ab ON t.approved_by = ab.id
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
    const pool = req.app.get('pool')
    const { title, description, priority, assigned_to, due_date } = req.body
    const createdBy = req.user?.userId || 1
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' })
    }

    // Convert assigned_to array of user IDs to PostgreSQL array format
    const assignedToArray = Array.isArray(assigned_to) ? assigned_to.map(id => parseInt(id)) : []

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

// Complete task (mark as done by assigned user)
router.put('/:id/complete', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const { completion_notes, proof_documents } = req.body
    const completedBy = req.user?.userId
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if task exists and user is assigned to it
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const task = taskResult.rows[0]
    const assignedUsers = Array.isArray(task.assigned_to) ? task.assigned_to : []
    
    if (!assignedUsers.includes(completedBy)) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this task' })
    }

    if (task.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Task is already completed' })
    }

    // Update task as completed by assigned user
    const result = await pool.query(`
      UPDATE tasks 
      SET status = 'completed',
          completed_by = $1,
          completion_notes = $2,
          proof_documents = $3,
          completion_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [completedBy, completion_notes || null, proof_documents || [], id])

    res.json({ success: true, task: result.rows[0], message: 'Task marked as completed successfully' })
  } catch (error) {
    console.error('Task complete error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Approve task completion (by task creator or admin)
router.put('/:id/approve', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const { approval_notes } = req.body
    const approvedBy = req.user?.userId
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if task exists and user can approve it
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const task = taskResult.rows[0]
    
    // Check if user created the task or is admin
    if (task.created_by !== approvedBy && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only task creator or admin can approve completion' })
    }

    if (task.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Task must be completed before approval' })
    }

    if (task.approved_by) {
      return res.status(400).json({ success: false, error: 'Task is already approved' })
    }

    // Update task as approved
    const result = await pool.query(`
      UPDATE tasks 
      SET approved_by = $1,
          approval_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [approvedBy, id])

    res.json({ success: true, task: result.rows[0], message: 'Task completion approved successfully' })
  } catch (error) {
    console.error('Task approve error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Upload proof document for task completion
router.post('/:id/upload-proof', upload.single('file'), async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    const userId = req.user?.userId
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if task exists and user is assigned to it
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const task = taskResult.rows[0]
    const assignedUsers = Array.isArray(task.assigned_to) ? task.assigned_to : []
    
    if (!assignedUsers.includes(userId)) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this task' })
    }

    // Upload file to S3 or local storage
    let fileUrl = `/uploads/tasks/${req.file.filename}`

    if (isS3Enabled) {
      try {
        const fileStream = fs.createReadStream(req.file.path)
        const s3Key = `tasks/${req.file.filename}`
        const uploadParams = {
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileStream,
          ContentType: req.file.mimetype
        }
        await s3Client.send(new PutObjectCommand(uploadParams))
        fileUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`
        fs.unlinkSync(req.file.path) // Remove local file after S3 upload
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error)
        // Continue with local file URL if S3 fails
      }
    }

    // Add file to task's proof documents
    const existingDocs = task.proof_documents || []
    const updatedDocs = [...existingDocs, fileUrl]

    await pool.query(`
      UPDATE tasks 
      SET proof_documents = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [updatedDocs, id])

    res.json({ success: true, fileUrl, message: 'Proof document uploaded successfully' })
  } catch (error) {
    console.error('Upload proof error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
