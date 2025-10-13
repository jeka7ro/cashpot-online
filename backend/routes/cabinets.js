import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const cabinets = [
      {
        _id: '1',
        cabinetId: 'CAB-001',
        location: 'Locația Centru',
        game: 'Book of Ra',
        serialNumber: 'SN-12345',
        lastMaintenance: '15.08.2024',
        status: 'Activ',
        createdAt: new Date()
      }
    ]
    res.json(cabinets)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cabinets' })
  }
})

export default router
