import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const jackpots = [
      {
        _id: '1',
        jackpotId: 'JP-001',
        game: 'Book of Ra',
        amount: '50000',
        winner: 'Ion Popescu',
        status: 'Platit',
        createdAt: new Date()
      }
    ]
    res.json(jackpots)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching jackpots' })
  }
})

export default router
