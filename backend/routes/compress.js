import express from 'express'
import { compressPDF } from '../utils/pdfCompressor.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Comprimă un PDF specific
router.post('/pdf', async (req, res) => {
  try {
    const { filePath, options = {} } = req.body
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'filePath is required'
      })
    }

    // Verifică dacă fișierul există
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    // Verifică dacă este PDF
    if (path.extname(filePath).toLowerCase() !== '.pdf') {
      return res.status(400).json({
        success: false,
        message: 'File is not a PDF'
      })
    }

    // Creează backup
    const backupPath = filePath.replace('.pdf', '_backup.pdf')
    fs.copyFileSync(filePath, backupPath)

    // Comprimă PDF-ul
    const outputPath = filePath.replace('.pdf', '_compressed.pdf')
    const result = await compressPDF(filePath, outputPath, {
      quality: 0.8,
      removeMetadata: true,
      removeAnnotations: true,
      removeBookmarks: true,
      removeAttachments: true,
      optimizeImages: true,
      removeUnusedResources: true,
      ...options
    })

    if (result.success) {
      // Înlocuiește originalul cu cel comprimat
      fs.unlinkSync(filePath)
      fs.renameSync(outputPath, filePath)

      res.json({
        success: true,
        message: 'PDF compressed successfully',
        result: {
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          compressionRatio: result.compressionRatio,
          savedBytes: result.savedBytes,
          backupPath: backupPath
        }
      })
    } else {
      // Restaurează din backup dacă comprimarea a eșuat
      fs.copyFileSync(backupPath, filePath)
      fs.unlinkSync(backupPath)
      
      res.status(500).json({
        success: false,
        message: 'Compression failed',
        error: result.error
      })
    }
  } catch (error) {
    console.error('Compression error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error compressing PDF'
    })
  }
})

// Comprimă toate PDF-urile din uploads
router.post('/all-pdfs', async (req, res) => {
  try {
    const { uploadsDir, options = {} } = req.body
    const targetDir = uploadsDir || path.join(__dirname, '..', 'uploads')
    
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({
        success: false,
        message: 'Uploads directory not found'
      })
    }

    // Găsește toate PDF-urile
    const pdfFiles = findPDFFiles(targetDir)
    
    if (pdfFiles.length === 0) {
      return res.json({
        success: true,
        message: 'No PDF files found to compress',
        results: []
      })
    }

    const results = []
    let totalOriginalSize = 0
    let totalCompressedSize = 0
    let totalSavedBytes = 0

    // Comprimă fiecare PDF
    for (const pdfFile of pdfFiles) {
      try {
        // Creează backup
        const backupPath = pdfFile.replace('.pdf', '_backup.pdf')
        fs.copyFileSync(pdfFile, backupPath)

        // Comprimă PDF-ul
        const outputPath = pdfFile.replace('.pdf', '_compressed.pdf')
        const result = await compressPDF(pdfFile, outputPath, {
          quality: 0.8,
          removeMetadata: true,
          removeAnnotations: true,
          removeBookmarks: true,
          removeAttachments: true,
          optimizeImages: true,
          removeUnusedResources: true,
          ...options
        })

        if (result.success) {
          // Înlocuiește originalul cu cel comprimat
          fs.unlinkSync(pdfFile)
          fs.renameSync(outputPath, pdfFile)
          
          totalOriginalSize += result.originalSize
          totalCompressedSize += result.compressedSize
          totalSavedBytes += result.savedBytes
          
          results.push({
            file: path.basename(pdfFile),
            success: true,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            savedBytes: result.savedBytes
          })
        } else {
          // Restaurează din backup
          fs.copyFileSync(backupPath, pdfFile)
          fs.unlinkSync(backupPath)
          
          results.push({
            file: path.basename(pdfFile),
            success: false,
            error: result.error
          })
        }
      } catch (error) {
        results.push({
          file: path.basename(pdfFile),
          success: false,
          error: error.message
        })
      }
    }

    const totalCompressionRatio = totalOriginalSize > 0 ? 
      ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(2) : 0

    res.json({
      success: true,
      message: `Processed ${pdfFiles.length} PDF files`,
      summary: {
        totalFiles: pdfFiles.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalOriginalSize,
        totalCompressedSize,
        totalCompressionRatio: parseFloat(totalCompressionRatio),
        totalSavedBytes
      },
      results
    })
  } catch (error) {
    console.error('Bulk compression error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error compressing PDFs'
    })
  }
})

// Funcție helper pentru găsirea PDF-urilor
function findPDFFiles(dir) {
  const files = []
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        if (item !== 'backup') {
          scanDirectory(fullPath)
        }
      } else if (stat.isFile() && path.extname(item).toLowerCase() === '.pdf') {
        if (!item.includes('_compressed') && !item.includes('_backup')) {
          files.push(fullPath)
        }
      }
    }
  }
  
  scanDirectory(dir)
  return files
}

export default router
