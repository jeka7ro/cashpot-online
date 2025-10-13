import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const slots = [
      {
        _id: '1',
        slotId: 'SLOT-001',
        game: 'Book of Ra',
        location: 'Locația Centru',
        payout: '95%',
        status: 'Activ',
        createdAt: new Date()
      }
    ]
    res.json(slots)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching slots' })
  }
})

export default router
