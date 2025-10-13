import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const reports = [
      {
        _id: '1',
        reportType: 'Lunar',
        period: 'Ianuarie 2024',
        status: 'Trimis',
        generatedBy: 'Admin',
        createdAt: new Date()
      }
    ]
    res.json(reports)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching ONJN reports' })
  }
})

export default router
