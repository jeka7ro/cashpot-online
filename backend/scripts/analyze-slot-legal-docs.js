/**
 * Script pentru analiza documentelor legale despre sloturi
 * Extrage informații despre taxe, plăți, notificări, etc.
 */

import pdfParse from 'pdf-parse'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const legalDocsPath = path.join(__dirname, '../../legal')

// Funcție pentru extragerea informațiilor despre sloturi
function extractSlotInfo(text) {
  const upperText = text.toUpperCase()
  const results = {
    taxe: [],
    plati: [],
    notificari: [],
    termene: [],
    categorii: [],
    sume: [],
    procente: []
  }

  // Caută informații despre taxe
  const taxPatterns = [
    /(?:TAX[ĂA]|IMPOZIT|TARIF)[\s\S]{0,200}?(?:SLOT|JOC|MAȘIN[ĂA])[\s\S]{0,300}?(\d+(?:[.,]\d+)?)\s*(?:RON|LEI|%)/gi,
    /(?:SLOT|MAȘIN[ĂA]|JOC)[\s\S]{0,200}?(?:TAX[ĂA]|IMPOZIT|TARIF)[\s\S]{0,300}?(\d+(?:[.,]\d+)?)\s*(?:RON|LEI|%)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:RON|LEI)[\s\S]{0,100}?(?:PER|PE)\s*(?:SLOT|MAȘIN[ĂA]|JOC)/gi,
    /(\d+(?:[.,]\d+)?)\s*%[\s\S]{0,100}?(?:SLOT|MAȘIN[ĂA]|JOC)/gi
  ]

  taxPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      if (match[1]) {
        results.taxe.push({
          text: match[0].substring(0, 200),
          valoare: match[1]
        })
      }
    })
  })

  // Caută informații despre notificări
  const notificarePatterns = [
    /(?:NOTIFICARE|NOTIFIC[ĂA]RI|ANUNȚ|COMUNICARE)[\s\S]{0,500}?(?:SLOT|MAȘIN[ĂA]|JOC|SCOATERE|PUNERE|MUTARE|FUNCȚIUNE)/gi,
    /(?:SCOATERE|PUNERE|MUTARE)[\s\S]{0,300}?(?:SLOT|MAȘIN[ĂA]|JOC)[\s\S]{0,300}?(?:NOTIFICARE|NOTIFIC[ĂA]RI|TERMEN)/gi,
    /(?:TERMEN|TERMENE)[\s\S]{0,200}?(?:NOTIFICARE|NOTIFIC[ĂA]RI)[\s\S]{0,300}?(\d+)\s*(?:ZILE|ZI|LUN[ĂI]|LUN[ĂA])/gi
  ]

  notificarePatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      results.notificari.push({
        text: match[0].substring(0, 300),
        termen: match[1] || null
      })
    })
  })

  // Caută termene de plată
  const termenPatterns = [
    /(?:TERMEN|TERMENE|TERMENUL)[\s\S]{0,200}?(?:PLAT[ĂA]|PLĂȚI)[\s\S]{0,300}?(\d+)\s*(?:ZILE|ZI|LUN[ĂI]|LUN[ĂA])/gi,
    /(?:PLAT[ĂA]|PLĂȚI)[\s\S]{0,200}?(?:TERMEN|TERMENE)[\s\S]{0,300}?(\d+)\s*(?:ZILE|ZI|LUN[ĂI]|LUN[ĂA])/gi,
    /(?:PÂN[ĂA]|PÂNA|PANA)[\s\S]{0,100}?(\d{1,2})[\s\S]{0,50}?(?:IANUARIE|FEBRUARIE|MARTIE|APRILIE|MAI|IUNIE|IULIE|AUGUST|SEPTEMBRIE|OCTOMBRIE|NOIEMBRIE|DECEMBRIE)/gi
  ]

  termenPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      results.termene.push({
        text: match[0].substring(0, 200),
        valoare: match[1] || null
      })
    })
  })

  // Caută categorii de sloturi
  const categoriePatterns = [
    /(?:CATEGORIE|CLAS[ĂA]|TIP)[\s\S]{0,200}?(?:SLOT|MAȘIN[ĂA]|JOC)[\s\S]{0,300}?[A-ZĂÂÎȘȚ\s]+/gi,
    /(?:SLOT|MAȘIN[ĂA]|JOC)[\s\S]{0,200}?(?:CATEGORIE|CLAS[ĂA]|TIP)[\s\S]{0,300}?[A-ZĂÂÎȘȚ\s]+/gi
  ]

  categoriePatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      results.categorii.push({
        text: match[0].substring(0, 200)
      })
    })
  })

  // Caută sume și procente
  const sumaPatterns = [
    /(\d{1,3}(?:\s?\d{3})*(?:[.,]\d{2})?)\s*(?:RON|LEI)/gi,
    /(\d+(?:[.,]\d+)?)\s*%/gi
  ]

  sumaPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)]
    matches.forEach(match => {
      if (match[0].includes('%')) {
        results.procente.push(match[1])
      } else {
        results.sume.push(match[1])
      }
    })
  })

  return results
}

// Funcție pentru analiza unui PDF
async function analyzePDF(filePath) {
  console.log(`\n📄 Analizând: ${path.basename(filePath)}`)
  console.log('='.repeat(80))

  try {
    const pdfBuffer = fs.readFileSync(filePath)
    const pdfData = await pdfParse(pdfBuffer)
    const text = pdfData.text

    console.log(`✅ Text extras: ${text.length} caractere`)

    // Extrage informații despre sloturi
    const slotInfo = extractSlotInfo(text)

    // Caută secțiuni relevante
    const sections = {
      sloturi: [],
      taxe: [],
      notificari: [],
      termene: []
    }

    // Caută secțiuni care conțin "slot" sau "joc"
    const lines = text.split('\n')
    let currentSection = null
    let sectionText = ''

    lines.forEach((line, index) => {
      const upperLine = line.toUpperCase()
      if (upperLine.includes('SLOT') || upperLine.includes('MAȘIN') || upperLine.includes('JOC')) {
        if (currentSection) {
          sections[currentSection].push({
            title: currentSection,
            text: sectionText.substring(0, 1000),
            lineNumber: index
          })
        }
        currentSection = 'sloturi'
        sectionText = line
      } else if (upperLine.includes('TAX') || upperLine.includes('IMPOZIT')) {
        if (currentSection) {
          sections[currentSection].push({
            title: currentSection,
            text: sectionText.substring(0, 1000),
            lineNumber: index
          })
        }
        currentSection = 'taxe'
        sectionText = line
      } else if (upperLine.includes('NOTIFICARE') || upperLine.includes('ANUNȚ')) {
        if (currentSection) {
          sections[currentSection].push({
            title: currentSection,
            text: sectionText.substring(0, 1000),
            lineNumber: index
          })
        }
        currentSection = 'notificari'
        sectionText = line
      } else if (currentSection) {
        sectionText += '\n' + line
        if (sectionText.length > 2000) {
          sections[currentSection].push({
            title: currentSection,
            text: sectionText.substring(0, 1000),
            lineNumber: index
          })
          sectionText = ''
        }
      }
    })

    return {
      filename: path.basename(filePath),
      textLength: text.length,
      slotInfo,
      sections,
      fullText: text // Pentru analiză ulterioară
    }
  } catch (error) {
    console.error(`❌ Eroare la analizarea ${filePath}:`, error.message)
    return null
  }
}

// Analizează ambele PDF-uri
async function analyzeAll() {
  const files = [
    'legea-nr-141-2025-privind-unele-masuri-fiscal-bugetare.pdf',
    'ordonanta-de-urgenta-nr-77-2009-privind-organizarea-si-exploatarea-jocurilor-de-noroc (1).pdf'
  ]

  const results = []

  for (const file of files) {
    const filePath = path.join(legalDocsPath, file)
    if (fs.existsSync(filePath)) {
      const result = await analyzePDF(filePath)
      if (result) {
        results.push(result)
      }
    } else {
      console.log(`⚠️  Fișierul nu există: ${filePath}`)
    }
  }

  // Salvează rezultatele
  const outputPath = path.join(__dirname, '../../legal/analysis-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8')
  console.log(`\n✅ Rezultatele au fost salvate în: ${outputPath}`)

  return results
}

// Rulează analiza
analyzeAll().catch(console.error)






