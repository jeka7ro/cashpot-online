import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const metrology = [
      {
        _id: '1',
        deviceId: 'DEV-001',
        type: 'Verificator',
        lastCalibration: '01.08.2024',
        nextCalibration: '01.08.2025',
        status: 'Activ',
        createdAt: new Date()
      }
    ]
    res.json(metrology)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching metrology devices' })
  }
})

export default router
