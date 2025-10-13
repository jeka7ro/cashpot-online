import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const gameMixes = [
      {
        _id: '1',
        mixName: 'Mix Classic',
        games: 'Book of Ra, Sizzling Hot',
        probability: '60%',
        status: 'Activ',
        createdAt: new Date()
      }
    ]
    res.json(gameMixes)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching game mixes' })
  }
})

export default router
