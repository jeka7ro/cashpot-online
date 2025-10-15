#!/usr/bin/env node

/**
 * Script pentru comprimarea PDF-urilor existente din folderul uploads
 * Usage: node scripts/compress-existing-pdfs.js [folder_path]
 */

import { compressPDF } from '../utils/pdfCompressor.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurare
const UPLOADS_DIR = process.argv[2] || path.join(__dirname, '..', 'uploads')
const BACKUP_DIR = path.join(__dirname, '..', 'uploads', 'backup')
const COMPRESSION_OPTIONS = {
  quality: 0.8,
  removeMetadata: true,
  removeAnnotations: true,
  removeBookmarks: true,
  removeAttachments: true,
  optimizeImages: true,
  removeUnusedResources: true,
}

// Statistici
let totalFiles = 0
let compressedFiles = 0
let totalOriginalSize = 0
let totalCompressedSize = 0
let totalSavedBytes = 0

async function compressExistingPDFs() {
  console.log('🚀 Începe comprimarea PDF-urilor existente...')
  console.log(`📁 Folder sursă: ${UPLOADS_DIR}`)
  console.log(`💾 Backup: ${BACKUP_DIR}`)
  console.log('')

  // Verifică dacă folderul există
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`❌ Folderul ${UPLOADS_DIR} nu există!`)
    process.exit(1)
  }

  // Creează folderul de backup
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    console.log(`📁 Creat folder backup: ${BACKUP_DIR}`)
  }

  // Găsește toate PDF-urile
  const pdfFiles = findPDFFiles(UPLOADS_DIR)
  
  if (pdfFiles.length === 0) {
    console.log('ℹ️ Nu s-au găsit PDF-uri de comprimat.')
    return
  }

  console.log(`📄 Găsite ${pdfFiles.length} PDF-uri de comprimat`)
  console.log('')

  // Comprimă fiecare PDF
  for (const pdfFile of pdfFiles) {
    await compressPDFFile(pdfFile)
  }

  // Afișează statisticile finale
  printFinalStats()
}

function findPDFFiles(dir) {
  const files = []
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Nu scanează folderul backup
        if (item !== 'backup') {
          scanDirectory(fullPath)
        }
      } else if (stat.isFile() && path.extname(item).toLowerCase() === '.pdf') {
        // Nu procesa fișierele deja comprimate
        if (!item.includes('_compressed')) {
          files.push(fullPath)
        }
      }
    }
  }
  
  scanDirectory(dir)
  return files
}

async function compressPDFFile(filePath) {
  try {
    totalFiles++
    const fileName = path.basename(filePath)
    const fileSize = fs.statSync(filePath).size
    
    console.log(`📄 Procesez: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
    
    // Creează backup
    const backupPath = path.join(BACKUP_DIR, fileName)
    fs.copyFileSync(filePath, backupPath)
    
    // Comprimă PDF-ul
    const outputPath = filePath.replace('.pdf', '_compressed.pdf')
    const result = await compressPDF(filePath, outputPath, COMPRESSION_OPTIONS)
    
    if (result.success) {
      compressedFiles++
      totalOriginalSize += result.originalSize
      totalCompressedSize += result.compressedSize
      totalSavedBytes += result.savedBytes
      
      console.log(`✅ Comprimat: ${result.compressionRatio}% reducere (${(result.savedBytes / 1024).toFixed(2)} KB economisite)`)
      
      // Înlocuiește fișierul original cu cel comprimat
      fs.unlinkSync(filePath)
      fs.renameSync(outputPath, filePath)
      
      console.log(`🔄 Înlocuit originalul cu versiunea comprimată`)
    } else {
      console.log(`❌ Eroare la comprimarea ${fileName}: ${result.error}`)
      
      // Șterge backup-ul dacă comprimarea a eșuat
      fs.unlinkSync(backupPath)
    }
    
    console.log('')
  } catch (error) {
    console.error(`❌ Eroare la procesarea ${filePath}:`, error.message)
    console.log('')
  }
}

function printFinalStats() {
  console.log('📊 STATISTICI FINALE:')
  console.log('=' * 50)
  console.log(`📄 Total fișiere procesate: ${totalFiles}`)
  console.log(`✅ PDF-uri comprimate cu succes: ${compressedFiles}`)
  console.log(`❌ PDF-uri cu erori: ${totalFiles - compressedFiles}`)
  console.log('')
  
  if (compressedFiles > 0) {
    const totalCompressionRatio = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(2)
    console.log(`📊 Dimensiune totală originală: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📊 Dimensiune totală comprimată: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📈 Compresie totală: ${totalCompressionRatio}%`)
    console.log(`💾 Spațiu economisit: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`)
    console.log('')
    console.log(`💾 Backup-urile sunt în: ${BACKUP_DIR}`)
  }
  
  console.log('🎉 Comprimarea s-a terminat!')
}

// Rulează scriptul
compressExistingPDFs().catch(error => {
  console.error('❌ Eroare fatală:', error)
  process.exit(1)
})
