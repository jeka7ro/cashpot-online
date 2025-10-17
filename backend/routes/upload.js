import express from 'express'
import { upload, isS3Enabled } from '../config/s3.js'
import { compressPDFBuffer } from '../utils/pdfCompressor.js'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Upload file (automatically uses S3 if configured, local storage otherwise)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    let finalFile = req.file
    let compressionInfo = null

    // Comprimă PDF-urile automat
    if (req.file.mimetype === 'application/pdf') {
      console.log(`📄 PDF detectat, comprimare în curs...`)
      
      try {
        // Citește fișierul PDF
        const pdfBuffer = fs.readFileSync(req.file.path)
        
        // Comprimă PDF-ul
        const compressionResult = await compressPDFBuffer(pdfBuffer, {
          quality: 0.8, // Calitate bună dar comprimată
          removeMetadata: true,
          removeAnnotations: true,
          removeBookmarks: true,
          removeAttachments: true,
          optimizeImages: true,
          removeUnusedResources: true,
        })

        if (compressionResult.success) {
          // Salvează PDF-ul comprimat
          const compressedPath = req.file.path.replace('.pdf', '_compressed.pdf')
          fs.writeFileSync(compressedPath, compressionResult.compressedBuffer)
          
          // Actualizează informațiile fișierului
          finalFile = {
            ...req.file,
            path: compressedPath,
            size: compressionResult.compressedSize,
            filename: req.file.filename.replace('.pdf', '_compressed.pdf')
          }
          
          compressionInfo = {
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            compressionRatio: compressionResult.compressionRatio,
            savedBytes: compressionResult.savedBytes
          }
          
          console.log(`✅ PDF comprimat: ${compressionResult.compressionRatio}% reducere`)
          
          // Șterge fișierul original
          fs.unlinkSync(req.file.path)
        } else {
          console.log(`⚠️ Eroare la comprimarea PDF, folosind originalul:`, compressionResult.error)
        }
      } catch (compressionError) {
        console.error('❌ Eroare la comprimarea PDF:', compressionError)
        // Continuă cu fișierul original dacă comprimarea eșuează
      }
    }

    // S3 response vs Local response
    const fileInfo = isS3Enabled ? {
      filename: finalFile.key, // S3 key
      originalname: finalFile.originalname,
      size: finalFile.size,
      location: finalFile.location, // S3 URL
      bucket: finalFile.bucket,
      key: finalFile.key,
      url: finalFile.location, // Full S3 URL
      storageType: 'S3',
      compression: compressionInfo
    } : {
      filename: finalFile.filename,
      originalname: finalFile.originalname,
      size: finalFile.size,
      path: finalFile.path,
      url: `/uploads/${finalFile.filename}`,
      storageType: 'Local',
      compression: compressionInfo
    }

    console.log(`✅ File uploaded to ${fileInfo.storageType}:`, fileInfo.filename)
    if (compressionInfo) {
      console.log(`📊 Compresie: ${compressionInfo.compressionRatio}% (${(compressionInfo.savedBytes / 1024).toFixed(2)} KB economisite)`)
    }

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
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      })
    }

    const filesInfo = await Promise.all(req.files.map(async (file) => {
      let finalFile = file
      let compressionInfo = null

      // Comprimă PDF-urile automat
      if (file.mimetype === 'application/pdf') {
        console.log(`📄 PDF detectat în upload multiplu, comprimare în curs...`)
        
        try {
          // Citește fișierul PDF
          const pdfBuffer = fs.readFileSync(file.path)
          
          // Comprimă PDF-ul
          const compressionResult = await compressPDFBuffer(pdfBuffer, {
            quality: 0.8,
            removeMetadata: true,
            removeAnnotations: true,
            removeBookmarks: true,
            removeAttachments: true,
            optimizeImages: true,
            removeUnusedResources: true,
          })

          if (compressionResult.success) {
            // Salvează PDF-ul comprimat
            const compressedPath = file.path.replace('.pdf', '_compressed.pdf')
            fs.writeFileSync(compressedPath, compressionResult.compressedBuffer)
            
            // Actualizează informațiile fișierului
            finalFile = {
              ...file,
              path: compressedPath,
              size: compressionResult.compressedSize,
              filename: file.filename.replace('.pdf', '_compressed.pdf')
            }
            
            compressionInfo = {
              originalSize: compressionResult.originalSize,
              compressedSize: compressionResult.compressedSize,
              compressionRatio: compressionResult.compressionRatio,
              savedBytes: compressionResult.savedBytes
            }
            
            console.log(`✅ PDF comprimat: ${compressionResult.compressionRatio}% reducere`)
            
            // Șterge fișierul original
            fs.unlinkSync(file.path)
          } else {
            console.log(`⚠️ Eroare la comprimarea PDF, folosind originalul:`, compressionResult.error)
          }
        } catch (compressionError) {
          console.error('❌ Eroare la comprimarea PDF:', compressionError)
          // Continuă cu fișierul original dacă comprimarea eșuează
        }
      }

      if (isS3Enabled) {
        return {
          filename: finalFile.key,
          originalname: finalFile.originalname,
          size: finalFile.size,
          location: finalFile.location,
          url: finalFile.location,
          storageType: 'S3',
          compression: compressionInfo
        }
      } else {
        return {
          filename: finalFile.filename,
          originalname: finalFile.originalname,
          size: finalFile.size,
          url: `/uploads/${finalFile.filename}`,
          storageType: 'Local',
          compression: compressionInfo
        }
      }
    }))

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

// Upload file for specific promotion
router.post('/promotion', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    const { promotion_id, type } = req.body // type: 'banner' or 'regulation'

    if (!promotion_id || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing promotion_id or type'
      })
    }

    let finalFile = req.file
    let compressionInfo = null

    // Comprimă PDF-urile automat
    if (req.file.mimetype === 'application/pdf') {
      console.log(`📄 PDF detectat, comprimare în curs...`)
      
      try {
        const pdfBuffer = fs.readFileSync(req.file.path)
        const compressionResult = await compressPDFBuffer(pdfBuffer, {
          quality: 0.8,
          removeMetadata: true,
          removeAnnotations: true,
          removeBookmarks: true,
          removeAttachments: true,
          optimizeImages: true,
          removeUnusedResources: true,
        })

        if (compressionResult.success) {
          const compressedPath = req.file.path.replace('.pdf', '_compressed.pdf')
          fs.writeFileSync(compressedPath, compressionResult.compressedBuffer)
          
          finalFile = {
            ...req.file,
            path: compressedPath,
            size: compressionResult.compressedSize,
            filename: req.file.filename.replace('.pdf', '_compressed.pdf')
          }
          
          compressionInfo = {
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            compressionRatio: compressionResult.compressionRatio,
            savedBytes: compressionResult.savedBytes
          }
          
          console.log(`✅ PDF comprimat: ${compressionResult.compressionRatio}% reducere`)
          fs.unlinkSync(req.file.path)
        }
      } catch (compressionError) {
        console.error('❌ Eroare la comprimarea PDF:', compressionError)
      }
    }

    // S3 response vs Local response
    const fileInfo = isS3Enabled ? {
      filename: finalFile.key,
      originalname: finalFile.originalname,
      size: finalFile.size,
      location: finalFile.location,
      bucket: finalFile.bucket,
      key: finalFile.key,
      url: finalFile.location,
      storageType: 'S3',
      compression: compressionInfo
    } : {
      filename: finalFile.filename,
      originalname: finalFile.originalname,
      size: finalFile.size,
      path: finalFile.path,
      url: `/uploads/promotions/${finalFile.filename}`,
      storageType: 'Local',
      compression: compressionInfo
    }

    // Update promotion in database
    const pool = req.app.get('pool')
    const updateField = type === 'banner' ? 'banner_path' : 'regulation_path'
    const updateQuery = `UPDATE promotions SET ${updateField} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
    
    await pool.query(updateQuery, [fileInfo.filename, promotion_id])

    console.log(`✅ File uploaded for promotion ${promotion_id} (${type}):`, fileInfo.filename)

    res.json({
      success: true,
      message: `File uploaded successfully for promotion`,
      file_path: fileInfo.filename,
      file: fileInfo
    })
  } catch (error) {
    console.error('Promotion upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading file'
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
