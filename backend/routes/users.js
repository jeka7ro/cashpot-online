import express from 'express'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'

const router = express.Router()

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ success: false, message: 'Error fetching users' })
  }
})

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ success: false, message: 'Error fetching user' })
  }
})

// PUT /api/users/:id/preferences (for dashboard sync)
router.put('/:id/preferences', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { preferences: req.body },
      { new: true, runValidators: true }
    ).select('-password')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json(user)
  } catch (error) {
    console.error('Error updating preferences:', error)
    res.status(500).json({ success: false, message: 'Error updating preferences' })
  }
})

// POST /api/users
router.post(
  '/',
  [
    body('username').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().notEmpty(),
    body('role').isIn(['admin', 'manager', 'user']).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'inactive', 'suspended'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() })
      }

      const { username, email, password, full_name, role, status, avatar } = req.body
      const user = new User({
        username,
        email,
        password,
        fullName: full_name,
        role,
        status: status || 'active',
        avatar: avatar || null,
        createdBy: req.user?.id || null
      })

      await user.save()
      const saved = user.toJSON()
      res.status(201).json(saved)
    } catch (error) {
      console.error('Error creating user:', error)
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Username or email already exists' })
      }
      res.status(500).json({ success: false, message: 'Error creating user' })
    }
  }
)

// PUT /api/users/:id
router.put(
  '/:id',
  [
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'manager', 'user']),
    body('status').optional().isIn(['active', 'inactive', 'suspended'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() })
      }

      const update = { ...req.body }
      if (update.full_name) {
        update.fullName = update.full_name
        delete update.full_name
      }
      // If password provided, let Mongoose pre('save') hash by using findById first
      if (update.password) {
        const user = await User.findById(req.params.id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        user.set(update)
        await user.save()
        const saved = user.toJSON()
        return res.json(saved)
      }

      const updated = await User.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
      ).select('-password')

      if (!updated) return res.status(404).json({ success: false, message: 'User not found' })
      res.json(updated)
    } catch (error) {
      console.error('Error updating user:', error)
      res.status(500).json({ success: false, message: 'Error updating user' })
    }
  }
)

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ success: false, message: 'Error deleting user' })
  }
})

export default router
