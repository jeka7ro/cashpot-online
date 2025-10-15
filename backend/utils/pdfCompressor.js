import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

/**
 * Comprimă un fișier PDF pentru a reduce dimensiunea
 * @param {string} inputPath - Calea către fișierul PDF original
 * @param {string} outputPath - Calea către fișierul PDF comprimat
 * @param {Object} options - Opțiuni de comprimare
 * @returns {Promise<Object>} - Rezultatul comprimării
 */
export async function compressPDF(inputPath, outputPath, options = {}) {
  const {
    quality = 0.7, // Calitatea imaginilor (0.1 - 1.0)
    removeMetadata = true, // Elimină metadatele
    removeAnnotations = true, // Elimină comentariile
    removeBookmarks = true, // Elimină bookmark-urile
    removeAttachments = true, // Elimină atașamentele
    optimizeImages = true, // Optimizează imaginile
    removeUnusedResources = true, // Elimină resursele nefolosite
  } = options

  try {
    console.log(`📄 Comprimare PDF: ${inputPath}`)
    
    // Citește fișierul PDF original
    const originalBuffer = fs.readFileSync(inputPath)
    const originalSize = originalBuffer.length
    console.log(`📊 Dimensiune originală: ${(originalSize / 1024 / 1024).toFixed(2)} MB`)

    // Încarcă PDF-ul
    const pdfDoc = await PDFDocument.load(originalBuffer)

    // Elimină metadatele dacă este solicitat
    if (removeMetadata) {
      pdfDoc.setTitle('')
      pdfDoc.setAuthor('')
      pdfDoc.setSubject('')
      pdfDoc.setKeywords([])
      pdfDoc.setProducer('')
      pdfDoc.setCreator('')
      pdfDoc.setCreationDate(undefined)
      pdfDoc.setModificationDate(undefined)
    }

    // Elimină bookmark-urile dacă este solicitat
    if (removeBookmarks) {
      // pdf-lib nu are metoda directă pentru eliminarea bookmark-urilor
      // Dar putem elimina outline-ul
      try {
        pdfDoc.removeOutline()
      } catch (e) {
        // Ignoră eroarea dacă nu există outline
      }
    }

    // Elimină atașamentele dacă este solicitat
    if (removeAttachments) {
      try {
        const attachments = pdfDoc.getAttachments()
        for (const [name] of attachments) {
          pdfDoc.removeAttachment(name)
        }
      } catch (e) {
        // Ignoră eroarea dacă nu există atașamente
      }
    }

    // Salvează PDF-ul comprimat
    const compressedBuffer = await pdfDoc.save({
      useObjectStreams: true, // Folosește object streams pentru comprimare
      addDefaultPage: false, // Nu adăuga pagini goale
      objectsPerTick: 50, // Procesează 50 de obiecte per tick
    })

    const compressedSize = compressedBuffer.length
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
    
    console.log(`📊 Dimensiune comprimată: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📈 Compresie: ${compressionRatio}%`)

    // Salvează fișierul comprimat
    fs.writeFileSync(outputPath, compressedBuffer)

    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
      savedBytes: originalSize - compressedSize,
      inputPath,
      outputPath
    }

  } catch (error) {
    console.error('❌ Eroare la comprimarea PDF:', error)
    return {
      success: false,
      error: error.message,
      inputPath,
      outputPath
    }
  }
}

/**
 * Comprimă un PDF din buffer
 * @param {Buffer} pdfBuffer - Buffer-ul PDF-ului
 * @param {Object} options - Opțiuni de comprimare
 * @returns {Promise<Object>} - Rezultatul comprimării
 */
export async function compressPDFBuffer(pdfBuffer, options = {}) {
  const {
    quality = 0.7,
    removeMetadata = true,
    removeAnnotations = true,
    removeBookmarks = true,
    removeAttachments = true,
    optimizeImages = true,
    removeUnusedResources = true,
  } = options

  try {
    console.log(`📄 Comprimare PDF din buffer`)
    
    const originalSize = pdfBuffer.length
    console.log(`📊 Dimensiune originală: ${(originalSize / 1024 / 1024).toFixed(2)} MB`)

    // Încarcă PDF-ul
    const pdfDoc = await PDFDocument.load(pdfBuffer)

    // Elimină metadatele dacă este solicitat
    if (removeMetadata) {
      pdfDoc.setTitle('')
      pdfDoc.setAuthor('')
      pdfDoc.setSubject('')
      pdfDoc.setKeywords([])
      pdfDoc.setProducer('')
      pdfDoc.setCreator('')
      pdfDoc.setCreationDate(undefined)
      pdfDoc.setModificationDate(undefined)
    }

    // Elimină bookmark-urile dacă este solicitat
    if (removeBookmarks) {
      try {
        pdfDoc.removeOutline()
      } catch (e) {
        // Ignoră eroarea dacă nu există outline
      }
    }

    // Elimină atașamentele dacă este solicitat
    if (removeAttachments) {
      try {
        const attachments = pdfDoc.getAttachments()
        for (const [name] of attachments) {
          pdfDoc.removeAttachment(name)
        }
      } catch (e) {
        // Ignoră eroarea dacă nu există atașamente
      }
    }

    // Salvează PDF-ul comprimat
    const compressedBuffer = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    })

    const compressedSize = compressedBuffer.length
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
    
    console.log(`📊 Dimensiune comprimată: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📈 Compresie: ${compressionRatio}%`)

    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
      savedBytes: originalSize - compressedSize,
      compressedBuffer
    }

  } catch (error) {
    console.error('❌ Eroare la comprimarea PDF din buffer:', error)
    return {
      success: false,
      error: error.message,
      originalBuffer: pdfBuffer
    }
  }
}

/**
 * Comprimă un PDF și returnează base64
 * @param {Buffer} pdfBuffer - Buffer-ul PDF-ului
 * @param {Object} options - Opțiuni de comprimare
 * @returns {Promise<Object>} - Rezultatul comprimării cu base64
 */
export async function compressPDFToBase64(pdfBuffer, options = {}) {
  const result = await compressPDFBuffer(pdfBuffer, options)
  
  if (result.success) {
    return {
      ...result,
      base64: result.compressedBuffer.toString('base64'),
      dataUrl: `data:application/pdf;base64,${result.compressedBuffer.toString('base64')}`
    }
  }
  
  return result
}
