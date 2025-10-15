import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = express.Router()
const upload = multer({ dest: path.join('uploads', 'metrology') })

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

// CVT upload
router.put('/:id/cvt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })
    // TODO: Replace with actual DB update when metrology model exists
    res.json({ success: true, cvtFile: `/uploads/metrology/${req.file.filename}` })
  } catch (error) {
    console.error('Metrology CVT upload error:', error)
    res.status(500).json({ success: false, message: 'Error uploading CVT' })
  }
})

router.delete('/:id/cvt', async (req, res) => {
  try {
    // TODO: Remove cvtFile reference from DB and optionally delete file
    res.json({ success: true })
  } catch (error) {
    console.error('Metrology CVT delete error:', error)
    res.status(500).json({ success: false, message: 'Error deleting CVT' })
  }
})
