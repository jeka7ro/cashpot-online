import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const users = [
      {
        _id: '1',
        username: 'admin',
        fullName: 'Administrator Sistem',
        role: 'Admin',
        status: 'Activ',
        lastLogin: '29.09.2024',
        avatar: 'https://ui-avatars.com/api/?name=Admin&size=32&background=8B5CF6&color=fff',
        createdAt: new Date()
      }
    ]
    res.json(users)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users' })
  }
})

export default router
