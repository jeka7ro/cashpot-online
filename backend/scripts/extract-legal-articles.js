/**
 * Script pentru extragerea și structurarea articolelor din legi
 * Extrage toate articolele și le stochează într-un format structurat pentru acces rapid
 */

import pdfParse from 'pdf-parse'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const legalDocsPath = path.join(__dirname, '../../legal')
const outputPath = path.join(__dirname, '../../legal/legal-articles.json')

// Funcție pentru extragerea articolelor dintr-un text
function extractArticles(text, lawName) {
  const articles = []
  
  // Pattern îmbunătățit pentru articole
  // Caută: "Art. I", "Art. II", "Art. 1", "Art. 10", "Art. LXII", "Art. 10 alin. (6²)", etc.
  // Suportă: romane (I, II, III, IV, V, VI, VII, VIII, IX, X, L, C, D, M), arabe (1, 2, 10, etc.)
  const articlePattern = /Art\.\s*([IVXLCDM]+|\d+[a-z²³]?|\d+)\s*[\.\-]?\s*(.*?)(?=Art\.\s*[IVXLCDM]+|\d+[a-z²³]?|\d+|$)/gis
  
  let match
  let lastIndex = 0
  
  while ((match = articlePattern.exec(text)) !== null) {
    const articleNumber = match[1].trim()
    let articleContent = match[2].trim()
    
    // Dacă conținutul este prea scurt sau gol, încercă să extragi mai mult
    if (articleContent.length < 10) {
      // Caută următorul articol sau sfârșitul textului
      const nextMatch = articlePattern.exec(text)
      const endIndex = nextMatch ? nextMatch.index : text.length
      articleContent = text.substring(match.index + match[0].length, endIndex).trim()
      // Revenim la poziția curentă
      articlePattern.lastIndex = match.index + match[0].length
    }
    
    // Curăță conținutul - elimină spații multiple și linii goale
    articleContent = articleContent.replace(/\s+/g, ' ').trim()
    
    // Elimină conținutul care pare a fi header/footer
    if (articleContent.includes('Tipărit de') || 
        articleContent.includes('Copyright') ||
        articleContent.length < 5) {
      continue
    }
    
    // Extrage alineate dacă există
    const paragraphs = []
    const paragraphPattern = /\((\d+)\)\s*(.*?)(?=\(\d+\)|$)/gis
    let paraMatch
    let paraLastIndex = 0
    
    while ((paraMatch = paragraphPattern.exec(articleContent)) !== null) {
      // Adaugă textul înainte de primul alineat
      if (paraMatch.index > paraLastIndex) {
        const beforeText = articleContent.substring(paraLastIndex, paraMatch.index).trim()
        if (beforeText.length > 5) {
          paragraphs.push({
            number: null,
            content: beforeText
          })
        }
      }
      
      paragraphs.push({
        number: paraMatch[1],
        content: paraMatch[2].trim()
      })
      
      paraLastIndex = paraMatch.index + paraMatch[0].length
    }
    
    // Dacă nu are alineate numerotate, păstrează tot conținutul
    if (paragraphs.length === 0 && articleContent.length > 5) {
      paragraphs.push({
        number: null,
        content: articleContent
      })
    }
    
    // Adaugă doar dacă are conținut valid
    if (paragraphs.length > 0 && paragraphs.some(p => p.content && p.content.length > 5)) {
      articles.push({
        law: lawName,
        number: articleNumber,
        fullContent: articleContent,
        paragraphs: paragraphs,
        excerpt: articleContent.substring(0, 200) + (articleContent.length > 200 ? '...' : '')
      })
    }
  }
  
  return articles
}

// Funcție pentru extragerea articolelor dintr-un PDF
async function extractFromPDF(filePath, lawName) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    const text = data.text
    
    console.log(`📄 Extrag articole din ${lawName}...`)
    const articles = extractArticles(text, lawName)
    console.log(`✅ Găsite ${articles.length} articole în ${lawName}`)
    
    return {
      law: lawName,
      filename: path.basename(filePath),
      totalArticles: articles.length,
      articles: articles,
      fullText: text // Păstrăm și textul complet pentru căutare
    }
  } catch (error) {
    console.error(`❌ Eroare la extragerea din ${filePath}:`, error)
    return null
  }
}

// Funcție principală
async function main() {
  console.log('🚀 Încep extragerea articolelor din legi...\n')
  
  const results = []
  
  // Listează toate PDF-urile din directorul legal
  const files = fs.readdirSync(legalDocsPath).filter(file => file.endsWith('.pdf'))
  
  for (const file of files) {
    const filePath = path.join(legalDocsPath, file)
    
    // Determină numele legii din numele fișierului
    let lawName = file.replace('.pdf', '').replace(/[-_]/g, ' ')
    
    // Nume mai prietenoase
    if (file.includes('141-2025')) {
      lawName = 'Legea nr. 141/2025'
    } else if (file.includes('77-2009')) {
      lawName = 'OUG nr. 77/2009'
    }
    
    const result = await extractFromPDF(filePath, lawName)
    if (result) {
      results.push(result)
    }
  }
  
  // Salvează rezultatele
  const output = {
    extractedAt: new Date().toISOString(),
    laws: results,
    // Index pentru căutare rapidă
    index: {}
  }
  
  // Creează index pentru căutare rapidă
  results.forEach(lawData => {
    lawData.articles.forEach(article => {
      const key = `${lawData.law}-Art-${article.number}`
      output.index[key] = {
        law: lawData.law,
        articleNumber: article.number,
        articleIndex: lawData.articles.indexOf(article)
      }
    })
  })
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`\n✅ Articolele au fost extrase și salvate în ${outputPath}`)
  console.log(`📊 Total legi procesate: ${results.length}`)
  console.log(`📊 Total articole: ${results.reduce((sum, law) => sum + law.totalArticles, 0)}`)
}

main().catch(console.error)




