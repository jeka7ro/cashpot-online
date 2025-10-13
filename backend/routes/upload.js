import express from 'express'
import { upload, isS3Enabled } from '../config/s3.js'

const router = express.Router()

// Upload file (automatically uses S3 if configured, local storage otherwise)
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    // S3 response vs Local response
    const fileInfo = isS3Enabled ? {
      filename: req.file.key, // S3 key
      originalname: req.file.originalname,
      size: req.file.size,
      location: req.file.location, // S3 URL
      bucket: req.file.bucket,
      key: req.file.key,
      url: req.file.location, // Full S3 URL
      storageType: 'S3'
    } : {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
      storageType: 'Local'
    }

    console.log(`✅ File uploaded to ${fileInfo.storageType}:`, fileInfo.filename)

    res.json({
      success: true,
      message: `File uploaded successfully to ${fileInfo.storageType}`,
      file: fileInfo
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading file'
    })
  }
})

// Upload multiple files
router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      })
    }

    const filesInfo = req.files.map(file => {
      if (isS3Enabled) {
        return {
          filename: file.key,
          originalname: file.originalname,
          size: file.size,
          location: file.location,
          url: file.location,
          storageType: 'S3'
        }
      } else {
        return {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          url: `/uploads/${file.filename}`,
          storageType: 'Local'
        }
      }
    })

    console.log(`✅ ${filesInfo.length} files uploaded to ${filesInfo[0].storageType}`)

    res.json({
      success: true,
      message: `${filesInfo.length} files uploaded successfully`,
      files: filesInfo
    })
  } catch (error) {
    console.error('Multiple upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading files'
    })
  }
})

// Get storage status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    storageType: isS3Enabled ? 'AWS S3' : 'Local',
    isS3Enabled,
    maxFileSize: '10MB',
    allowedTypes: ['PDF', 'Images (JPEG, PNG, GIF, WebP)', 'Office Documents (Word, Excel)']
  })
})

export default router
