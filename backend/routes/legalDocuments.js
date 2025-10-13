import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const documents = [
      {
        _id: '1',
        documentName: 'Contract Furnizor EGT',
        type: 'Contract',
        version: '1.0',
        status: 'Activ',
        uploadedBy: 'Admin',
        createdAt: new Date()
      }
    ]
    res.json(documents)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching legal documents' })
  }
})

export default router
