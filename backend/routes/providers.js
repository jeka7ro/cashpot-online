import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const providers = [
      {
        _id: '1',
        name: 'EGT Digital',
        contact: 'contact@egt-digital.com',
        phone: '+40 21 555 1234',
        gamesCount: 45,
        contractType: 'Exclusiv',
        contractEnd: '31.12.2025',
        status: 'Activ',
        avatar: 'https://ui-avatars.com/api/?name=EGT&size=32&background=4F46E5&color=fff',
        createdAt: new Date()
      }
    ]
    res.json(providers)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching providers' })
  }
})

export default router
