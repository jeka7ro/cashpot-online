import express from 'express'

const router = express.Router()

// Get all locations
router.get('/', async (req, res) => {
  try {
    // Mock data for now
    const locations = [
      {
        _id: '1',
        name: 'Locația Centru',
        address: 'Str. Centrală nr. 1, București',
        company: 'BRML Industries',
        capacity: 50,
        status: 'Activ',
        createdAt: new Date()
      }
    ]
    res.json(locations)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching locations' })
  }
})

export default router
