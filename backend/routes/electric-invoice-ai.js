/**
 * SMART ELECTRIC INVOICE EXTRACTION - REFACUT COMPLET DE LA ZERO
 * Folosește o abordare multi-strategie pentru extragerea corectă a datelor
 */

import pdfParse from 'pdf-parse'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Normalizează suma (gestionează punct/virgulă)
 */
const normalizeSum = (str) => {
  if (!str) return null
  let cleaned = str.replace(/\s/g, '')
  
  // Dacă are atât punct cât și virgulă: punct = mii, virgulă = zecimală
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  // Dacă are doar virgulă: verifică dacă e zecimală (≤2 cifre) sau separator de mii
  else if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',')
    if (parts[1] && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  }
  // Dacă are doar punct: verifică dacă e zecimală (≤2 cifre) sau separator de mii
  else if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.')
    if (parts[parts.length - 1] && parts[parts.length - 1].length <= 2) {
      const lastDot = cleaned.lastIndexOf('.')
      cleaned = cleaned.substring(0, lastDot).replace(/\./g, '') + '.' + cleaned.substring(lastDot + 1)
    } else {
      cleaned = cleaned.replace(/\./g, '')
    }
  }
  
  const sum = parseFloat(cleaned)
  return isNaN(sum) ? null : sum
}

/**
 * Normalizează numele locației
 */
const normalizeLocation = (text) => {
  if (!text) return null
  const upper = text.toUpperCase().trim()
  if (upper.includes('CRAIOVA') || upper.includes('CARIOVA')) return 'Craiova'
  if (upper.includes('PITESTI') || upper.includes('PITEȘTI') || upper.includes('PITI')) return 'Pitești'
  if (upper.includes('VALCEA') || upper.includes('VÂLCEA') || upper.includes('RAMNICU')) return 'Valcea'
  if (upper.includes('PLOIESTI') || upper.includes('PLOIEȘTI')) {
    if (upper.includes('NORD')) return 'Ploiesti (nord)'
    if (upper.includes('CENTRU') || upper.includes('CENTER')) return 'Ploiesti (centru)'
    return 'Ploiesti (centru)'
  }
  if (upper.includes('BUCUREȘTI') || upper.includes('BUCHAREST') || upper.includes('BUCURESTI')) return 'București'
  return text.trim()
}

/**
 * STRATEGIE PRINCIPALĂ: Găsește fiecare NLC și asociază-l cu secțiunea sa
 */
export const extractNlcWithContext = (text) => {
  console.log('🚀 EXTRAGERE NLC-URI CU CONTEXT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const results = []
  
  // PASUL 1: Găsește TOATE NLC-urile din document
  // NLC = număr de 10 cifre care începe cu 700
  const allNlcMatches = [...text.matchAll(/\b(700\d{7})\b/g)]
  const uniqueNlcs = [...new Set(allNlcMatches.map(m => m[1]))]
  
  console.log(`🔢 Găsite ${uniqueNlcs.length} NLC-uri unice: ${uniqueNlcs.join(', ')}`)
  
  if (uniqueNlcs.length === 0) {
    console.log('⚠️ Nu s-au găsit NLC-uri în document')
    return results
  }
  
  // PASUL 2: Găsește toate aparițiile "Localitatea" (cu pozițiile lor)
  const localitateMatches = [...text.matchAll(/Localitatea\s+([A-ZĂÂÎȘȚA-Za-zăâîșț\s,]+)/gi)]
  console.log(`📍 Găsite ${localitateMatches.length} apariții "Localitatea"`)
  
  // Salvează pozițiile și locațiile
  const localitatePositions = localitateMatches.map(m => ({
    position: m.index,
    rawLocation: m[1].trim().split(',')[0].trim(), // Ia doar orașul (până la prima virgulă)
    normalizedLocation: normalizeLocation(m[1])
  }))
  
  // PASUL 3: Pentru fiecare NLC, găsește secțiunea asociată
  for (const nlc of uniqueNlcs) {
    console.log(`\n📌 Procesez NLC: ${nlc}`)
    
    // Găsește TOATE aparițiile NLC-ului și alege-o pe cea din secțiunea de facturare
    // (nu cea din header care e doar informativă)
    const allNlcOccurrences = []
    let searchPos = 0
    while (true) {
      const idx = text.indexOf(nlc, searchPos)
      if (idx === -1) break
      allNlcOccurrences.push(idx)
      searchPos = idx + 1
    }
    
    console.log(`   📍 Găsite ${allNlcOccurrences.length} apariții: ${allNlcOccurrences.join(', ')}`)
    
    if (allNlcOccurrences.length === 0) {
      console.log(`   ⚠️ NLC ${nlc} nu a fost găsit în text`)
      continue
    }
    
    // Alege apariția care are "Localitatea" cel mai aproape ÎNAINTE de ea
    // (adică e în secțiunea de facturare, nu în header)
    let bestNlcIndex = allNlcOccurrences[0]
    let bestDistance = Infinity
    let bestLocalitate = null
    
    for (const nlcPos of allNlcOccurrences) {
      // Caută "Localitatea" înainte de această apariție
      for (const loc of localitatePositions) {
        if (loc.position < nlcPos) {
          const distance = nlcPos - loc.position
          // Preferă distanțe mici (NLC aproape de Localitatea)
          // și exclude locațiile din primele 2 care sunt adrese furnizor (poziție < 6000)
          if (distance < 500 && distance < bestDistance && loc.position > 6000) {
            bestDistance = distance
            bestNlcIndex = nlcPos
            bestLocalitate = loc
          }
        }
      }
    }
    
    const nlcIndex = bestNlcIndex
    console.log(`   📍 Folosesc apariția la poziția: ${nlcIndex}`)
    
    // Folosește localitate găsită mai sus sau caută din nou
    let closestLocalitate = bestLocalitate
    let closestDistance = bestDistance
    
    // Dacă nu am găsit prin căutarea optimizată, caută cea mai apropiată
    if (!closestLocalitate) {
      for (const loc of localitatePositions) {
        if (loc.position < nlcIndex && loc.position > 6000) { // Ignoră primele "Localitatea" (adrese furnizor)
          const distance = nlcIndex - loc.position
          if (distance < closestDistance) {
            closestDistance = distance
            closestLocalitate = loc
          }
        }
      }
    }
    
    if (closestLocalitate) {
      console.log(`   🏠 Localitate găsită: "${closestLocalitate.rawLocation}" → "${closestLocalitate.normalizedLocation}" (distanță: ${closestDistance})`)
    } else {
      console.log(`   ⚠️ Nu s-a găsit localitate pentru NLC ${nlc}`)
    }
    
    // Definește secțiunea: de la NLC până la următorul NLC sau sfârșitul documentului
    // Dar căutăm înapoi pentru "Localitatea" și înainte pentru TOTAL
    const sectionStart = closestLocalitate ? closestLocalitate.position : Math.max(0, nlcIndex - 2000)
    
    // Găsește următorul NLC pentru a delimita secțiunea
    let sectionEnd = text.length
    for (const otherNlc of uniqueNlcs) {
      if (otherNlc !== nlc) {
        const otherIndex = text.indexOf(otherNlc)
        if (otherIndex > nlcIndex && otherIndex < sectionEnd) {
          // Găsește "Localitatea" înainte de acest NLC și folosește-o ca delimitator
          for (const loc of localitatePositions) {
            if (loc.position > nlcIndex && loc.position < otherIndex && loc.position < sectionEnd) {
              sectionEnd = loc.position
            }
          }
        }
      }
    }
    
    const sectionText = text.substring(sectionStart, sectionEnd)
    console.log(`   📄 Secțiune: ${sectionStart} - ${sectionEnd} (${sectionText.length} caractere)`)
    
    // EXTRAGE DATELE DIN SECȚIUNE
    
    // 1. Perioada de facturare - extrage exact cum e în factură
    const periodMatch = sectionText.match(/Perioad[ăa]\s+de\s+(?:facturare|consum)[^\d]*(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/i) ||
                       sectionText.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/)
    
    let period = null
    if (periodMatch) {
      period = `${periodMatch[1]} - ${periodMatch[2]}`
    }
    if (period) console.log(`   📅 Perioada: ${period}`)
    
    // 2. Consumul (kWh) - caută "Total loc de consum X kWh"
    // Format în PDF: "Total loc de consum   12.658  kWh" sau "12.658 kWh"
    let consum = null
    
    // Pattern 1: "Total loc de consum ... kWh"
    const consumMatch1 = sectionText.match(/Total\s+loc\s+de\s+consum\s+([\d.,]+)\s*kWh/i)
    // Pattern 2: Număr urmat de kWh (pe linia cu Total)
    const consumMatch2 = sectionText.match(/Total[^\n]*?([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?)\s*kWh/i)
    // Pattern 3: Cantitate ... kWh (căutare mai largă)
    const consumMatch3 = sectionText.match(/Cantitate[^\n]*([\d.,]+)\s*kWh/i)
    
    const consumMatch = consumMatch1 || consumMatch2 || consumMatch3
    if (consumMatch) {
      // Curăță numărul - elimină punctele ca separator de mii
      let consumStr = consumMatch[1]
      // Dacă e format "12.658" (punct separator de mii, fără zecimale)
      if (consumStr.includes('.') && !consumStr.includes(',')) {
        consumStr = consumStr.replace(/\./g, '')
      }
      // Dacă e format "12.658,5" (punct mii, virgulă zecimale)
      if (consumStr.includes('.') && consumStr.includes(',')) {
        consumStr = consumStr.replace(/\./g, '').replace(',', '.')
      }
      // Dacă e format "12658,5" (virgulă zecimale)
      if (consumStr.includes(',')) {
        consumStr = consumStr.replace(',', '.')
      }
      consum = parseFloat(consumStr)
      if (!isNaN(consum)) {
        console.log(`   ⚡ Consum: ${consum} kWh`)
      } else {
        consum = null
      }
    }
    
    // 3. Suma TOTALĂ - caută linia "TOTAL" sau "Total loc de consum" cu kWh (nu kVArh!)
    // Format: "TOTAL ... 11.056,23 2.100,70" (fără TVA + TVA)
    let suma = null
    const lines = sectionText.split('\n')
    
    // Colectează toate candidatele pentru suma totală
    const candidates = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Caută linii cu "Total loc de consum" sau "TOTAL" (dar nu TOTAL FACTURĂ)
      const isTotalLine = line.match(/Total\s+loc\s+de\s+consum/i) || 
                         (line.match(/^\s*TOTAL\s/i) && !line.includes('FACTURĂ'))
      
      if (!isTotalLine) continue
      
      // IMPORTANT: Prioritizează linii cu "kWh" (energie activă) peste "kVArh" (energie reactivă)
      const isKwh = line.includes('kWh') && !line.includes('kVArh')
      const isKvarh = line.includes('kVArh')
      
      // Extrage TOATE numerele din linie (format european: 11.056,23 sau 2.100,70)
      const numberPattern = /(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/g
      const allNumbers = [...line.matchAll(numberPattern)].map(m => m[1])
      
      if (allNumbers.length >= 2) {
        const lastTwo = allNumbers.slice(-2)
        const val1 = normalizeSum(lastTwo[0])
        const val2 = normalizeSum(lastTwo[1])
        
        if (val1 !== null && val2 !== null && val1 > 0 && val2 > 0) {
          candidates.push({
            val1,
            val2,
            total: val1 + val2,
            isKwh,
            isKvarh,
            line: line.substring(0, 60)
          })
        }
      }
    }
    
    // Alege candidatul cel mai bun:
    // 1. Preferă linii cu kWh (energie activă)
    // 2. Dacă mai multe cu kWh, ia cel cu suma cea mai mare
    // 3. Evită liniile cu kVArh
    if (candidates.length > 0) {
      // Sortează: kWh first, apoi după suma descrescător
      candidates.sort((a, b) => {
        if (a.isKwh && !b.isKwh) return -1
        if (!a.isKwh && b.isKwh) return 1
        if (a.isKvarh && !b.isKvarh) return 1
        if (!a.isKvarh && b.isKvarh) return -1
        return b.total - a.total
      })
      
      const best = candidates[0]
      suma = best.total
      console.log(`   💰 TOTAL găsit: ${best.val1.toFixed(2)} + ${best.val2.toFixed(2)} = ${suma.toFixed(2)} RON (${best.isKwh ? 'kWh' : best.isKvarh ? 'kVArh' : 'general'})`)
      console.log(`      Linie: "${best.line}..."`)
      
      if (candidates.length > 1) {
        console.log(`      (Alte ${candidates.length - 1} candidați ignorați)`)
      }
    }
    
    // 4. Preț per kWh
    let pretPerKwh = null
    const pretMatch = sectionText.match(/Pre[țt]\s+unitar[^\d]*([\d][,.][\d]+)/i) ||
                     sectionText.match(/([\d][,.][\d]+)\s*lei\/kWh/i)
    if (pretMatch) {
      pretPerKwh = normalizeSum(pretMatch[1])
      console.log(`   💵 Preț/kWh: ${pretPerKwh}`)
    }
    
    // Calculează prețul per kWh real (din sumă și consum)
    let pretCalculat = null
    let pretVerificare = null
    if (suma && consum && consum > 0) {
      pretCalculat = suma / consum
    }
    
    // Parsează perioada pentru a extrage lunile
    let luniAcoperite = []
    if (period) {
      const periodMatch = period.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/)
      if (periodMatch) {
        const startDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
        const endDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))
        
        // Generează lista de luni acoperite
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        while (current <= endDate) {
          luniAcoperite.push({
            luna: current.getMonth() + 1,
            an: current.getFullYear(),
            dataExpenditure: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`
          })
          current.setMonth(current.getMonth() + 1)
        }
        console.log(`   📅 Luni acoperite: ${luniAcoperite.map(l => `${l.luna}/${l.an}`).join(', ')}`)
      }
    }
    
    // 5. Energie REACTIVĂ (kVArh) - caută în aceeași secțiune
    let consumReactiv = null
    let sumaReactiva = null
    
    // Parsare numere format european
    const parseEuro = (s) => {
      if (!s) return 0
      if (s.includes('.') && s.includes(',')) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.'))
      }
      if (s.includes(',')) {
        return parseFloat(s.replace(',', '.'))
      }
      if (s.includes('.')) {
        const parts = s.split('.')
        if (parts[parts.length - 1].length <= 2) return parseFloat(s)
        return parseFloat(s.replace(/\./g, ''))
      }
      return parseFloat(s)
    }
    
    // Caută linii cu "Total loc de consum" și "kVArh"
    const reactiveLines = sectionText.split('\n')
    for (const line of reactiveLines) {
      if (line.includes('kVArh') && line.includes('Total loc de consum')) {
        // Extrage cantitatea (înainte de kVArh)
        const beforeKvarh = line.split('kVArh')[0] || ''
        const cantMatch = beforeKvarh.match(/(\d{1,3}(?:\.\d{3})*,?\d*)\s*$/)
        if (cantMatch) {
          consumReactiv = parseEuro(cantMatch[1])
        }
        
        // Extrage sumele (după kVArh)
        const afterKvarh = line.split('kVArh')[1] || ''
        // Pattern: găsește numere format X.XXX,XX sau XXX,XX
        const numPattern = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3}(?:\.\d{3})*)/g
        const allNums = afterKvarh.match(numPattern) || []
        
        if (allNums.length >= 2) {
          const faraTva = parseEuro(allNums[0])
          const tva = parseEuro(allNums[1])
          sumaReactiva = faraTva + tva
          
          if (sumaReactiva > 0) {
            console.log(`   ⚡ Energie REACTIVĂ: ${consumReactiv} kVArh = ${sumaReactiva.toFixed(2)} RON (${faraTva.toFixed(2)} + ${tva.toFixed(2)})`)
          }
        }
        break
      }
    }
    
    // VERIFICARE VALIDITATE: Dacă consum = 0 dar suma > 0, înseamnă că suma e preluată greșit
    // Ignorăm acest NLC sau îi setăm suma la 0
    if ((!consum || consum === 0) && suma > 0) {
      console.log(`   ⚠️ NLC ${nlc}: IGNORAT - consum 0 kWh dar suma ${suma.toFixed(2)} RON (probabil date din alt NLC)`)
      continue // Skip acest NLC - nu-l adăugăm
    }
    
    // Calculează TOTAL (activă + reactivă)
    const sumaTotala = (suma || 0) + (sumaReactiva || 0)
    
    // Adaugă rezultatul
    results.push({
      nlc,
      location: closestLocalitate ? closestLocalitate.normalizedLocation : 'N/A',
      rawLocation: closestLocalitate ? closestLocalitate.rawLocation : null,
      suma,                    // Energie activă (kWh)
      consum,                  // Consum activ (kWh)
      sumaReactiva,           // Energie reactivă (kVArh) - NOU!
      consumReactiv,          // Consum reactiv (kVArh) - NOU!
      sumaTotala,             // TOTAL (activă + reactivă) - NOU!
      period,
      pretPerKwh,
      pretCalculat,
      pretVerificare,
      luniAcoperite
    })
    
    console.log(`   ✅ NLC ${nlc}: ${closestLocalitate?.normalizedLocation || 'N/A'}`)
    console.log(`      Activă: ${suma ? suma.toFixed(2) + ' RON' : 'N/A'} (${consum ? consum.toFixed(0) + ' kWh' : 'N/A'})`)
    console.log(`      Reactivă: ${sumaReactiva ? sumaReactiva.toFixed(2) + ' RON' : '0'} (${consumReactiv ? consumReactiv.toFixed(0) + ' kVArh' : '0'})`)
    console.log(`      TOTAL: ${sumaTotala.toFixed(2)} RON`)
  }
  
  return results
}

/**
 * Extrage date generale din factură
 */
export const extractGeneralInvoiceData = (text) => {
  console.log('\n📋 EXTRAGERE DATE GENERALE')
  
  const data = {}
  
  // Număr factură - caută pattern-uri comune
  const numarFacturaPatterns = [
    /Serie\s*\/?\s*Nr\.?[:\s]*([A-Z]{2,4}\/?[\d]+)/i,
    /Nr\.?\s*factur[aă][:\s]*([A-Z0-9\-\/]+)/i,
    /Factur[aă]\s*nr\.?[:\s]*([A-Z0-9\-\/]+)/i
  ]
  for (const pattern of numarFacturaPatterns) {
    const match = text.match(pattern)
    if (match) {
      data.numar_factura = match[1].trim()
      console.log(`   📝 Număr factură: ${data.numar_factura}`)
      break
    }
  }
  
  // Data emiterii
  const dataEmiterePatterns = [
    /Dat[aă]\s+emitere[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
    /Data\s+emiterii[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
    /Emis[aă]?\s+la[:\s]*(\d{2}\.\d{2}\.\d{4})/i
  ]
  for (const pattern of dataEmiterePatterns) {
    const match = text.match(pattern)
    if (match) {
      data.data_emiterii = match[1]
      console.log(`   📅 Data emiterii: ${data.data_emiterii}`)
      break
    }
  }
  
  // Data scadentă
  const dataScadentaPatterns = [
    /Dat[aă]\s+scadent[aă][:\s]*(\d{2}\.\d{2}\.\d{4})/i,
    /Scaden[tț][aă][:\s]*(\d{2}\.\d{2}\.\d{4})/i
  ]
  for (const pattern of dataScadentaPatterns) {
    const match = text.match(pattern)
    if (match) {
      data.data_scadenta = match[1]
      console.log(`   📅 Data scadentă: ${data.data_scadenta}`)
      break
    }
  }
  
  // Perioada de facturare (generală)
  // Perioada de facturare - extrage exact cum e în factură (fără corecții de an)
  const perioadaMatch = text.match(/Perioad[aă]\s+de\s+facturare[:\s]*(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/i)
  if (perioadaMatch) {
    data.perioada_facturare = `${perioadaMatch[1]} - ${perioadaMatch[2]}`
    console.log(`   📅 Perioadă facturare: ${data.perioada_facturare}`)
  }
  
  // Furnizor
  const furnizorMatch = text.match(/(?:FURNIZOR|Furnizor)[:\s]*([A-Z][A-Z\s\.]+(?:S\.?R\.?L\.?|S\.?A\.?))/i)
  if (furnizorMatch) {
    // Curăță furnizorul - elimină newline-uri și text după
    data.furnizor = furnizorMatch[1].trim().split('\n')[0].trim()
    console.log(`   🏢 Furnizor: ${data.furnizor}`)
  }
  
  // Preț final per kWh - caută explicit "Preț final facturat energie activă"
  const pretFinalMatch = text.match(/Pre[țt]\s+final\s+facturat\s+energie\s+activ[aă]\s*([\d][,.][\d]+)\s*lei\/kWh/i)
  if (pretFinalMatch) {
    data.pret_per_kwh = normalizeSum(pretFinalMatch[1])
    console.log(`   💵 Preț final/kWh: ${data.pret_per_kwh}`)
  }
  
  // Suma totală factură curentă - caută multiple variante
  // Gestionează format LaTeX $...$ și sume pe linia următoare
  const lines = text.split('\n')
  let sumaTotalaFound = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
    
    // Verifică dacă linia conține "TOTAL FACTURĂ CURENTĂ"
    if (line.match(/TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]/i)) {
      // Încearcă să extragă suma din aceeași linie
      const sameLineMatch = line.match(/\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$?/i)
      if (sameLineMatch) {
        const suma = normalizeSum(sameLineMatch[1])
        if (suma && suma > 0) {
          data.suma_totala = suma
          console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (pe aceeași linie)`)
          sumaTotalaFound = true
          break
        }
      }
      
      // Dacă nu s-a găsit pe aceeași linie, verifică linia următoare (format LaTeX)
      if (!sumaTotalaFound && nextLine) {
        // Format LaTeX: $17.424,85$ sau $17,424.85$ - îmbunătățit pentru a găsi corect
        // Caută $...$ cu număr în interior
        const latexMatch = nextLine.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$/i)
        if (latexMatch) {
          const suma = normalizeSum(latexMatch[1])
          if (suma && suma > 0) {
            data.suma_totala = suma
            console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (format LaTeX pe linia următoare: "${nextLine}")`)
            sumaTotalaFound = true
            break
          }
        }
        
        // Dacă nu s-a găsit cu format LaTeX, caută orice număr mare pe linia următoare
        // Format standard pe linia următoare (fără $)
        const nextLineMatch = nextLine.match(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/)
        if (nextLineMatch) {
          const suma = normalizeSum(nextLineMatch[1])
          // Validare: suma rezonabilă (între 1 și 1.000.000 RON)
          if (suma && suma > 0 && suma < 1000000) {
            data.suma_totala = suma
            console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (pe linia următoare: "${nextLine}")`)
            sumaTotalaFound = true
            break
          }
        }
      }
      
      // Dacă încă nu s-a găsit, verifică și linia următoare după nextLine (pentru cazuri cu linii goale)
      if (!sumaTotalaFound && i + 2 < lines.length) {
        const nextNextLine = lines[i + 2].trim()
        if (nextNextLine) {
          const latexMatch2 = nextNextLine.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$/i)
          if (latexMatch2) {
            const suma = normalizeSum(latexMatch2[1])
            if (suma && suma > 0) {
              data.suma_totala = suma
              console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (format LaTeX pe linia a 3-a: "${nextNextLine}")`)
              sumaTotalaFound = true
              break
            }
          }
        }
      }
    }
  }
  
  // Dacă încă nu s-a găsit, încercă pattern-uri regex tradiționale
  if (!sumaTotalaFound) {
    const sumaTotalaPatterns = [
      // Format LaTeX: $17.424,85$ sau $17,424.85$
      /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]\s*\(?LEI\)?\s*\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$?/i,
      // Format standard cu "CU TVA"
      /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]\s+(?:CU\s+)?TVA[:\s]*\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$?/i,
      // Format simplu "TOTAL FACTURĂ CURENTĂ"
      /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ][:\s]*\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$?/i
    ]
    
    for (const pattern of sumaTotalaPatterns) {
      const match = text.match(pattern)
      if (match) {
        const suma = normalizeSum(match[1])
        if (suma && suma > 0) {
          data.suma_totala = suma
          console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (regex pattern)`)
          sumaTotalaFound = true
          break
        }
      }
    }
  }
  
  // Dacă încă nu s-a găsit, încercă să extragă din tabelul "DETALII FACTURĂ"
  if (!sumaTotalaFound) {
    // Caută în secțiunea "DETALII FACTURĂ" după "TOTAL FACTURĂ CURENTĂ CU TVA"
    const detaliiMatch = text.match(/TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]\s+CU\s+TVA[:\s]*\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$?/i)
    if (detaliiMatch) {
      const suma = normalizeSum(detaliiMatch[1])
      if (suma && suma > 0) {
        data.suma_totala = suma
        console.log(`   💰 Suma totală factură (din detalii): ${data.suma_totala} RON`)
        sumaTotalaFound = true
      }
    }
  }
  
  // TVA
  const tvaMatch = text.match(/TVA\s+(\d{1,2})%/i)
  if (tvaMatch) {
    data.tva = tvaMatch[1]
    console.log(`   📊 TVA: ${data.tva}%`)
  }
  
  return data
}

/**
 * FUNCȚIE PRINCIPALĂ: Extrage date din factură electrică
 */
export const extractElectricInvoiceDataSmart = async (pdfBufferOrText) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🤖 SMART ELECTRIC INVOICE EXTRACTION v2.0')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  let text = ''
  
  // Dacă este buffer PDF, extrage textul
  if (Buffer.isBuffer(pdfBufferOrText)) {
    try {
      const pdfData = await pdfParse(pdfBufferOrText)
      text = pdfData.text
      console.log(`📄 PDF extras: ${text.length} caractere`)
    } catch (error) {
      throw new Error(`Eroare la extragerea textului din PDF: ${error.message}`)
    }
  } else {
    text = pdfBufferOrText
    console.log(`📄 Text primit: ${text.length} caractere`)
  }
  
  if (!text || text.length < 100) {
    throw new Error('Textul extras din PDF este prea scurt sau gol')
  }
  
  // DEBUG: Arată primele 1500 caractere
  console.log('\n📄 PRIMELE 1500 CARACTERE:')
  console.log(text.substring(0, 1500))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // EXTRAGE NLC-URI CU CONTEXT
  const nlcResults = extractNlcWithContext(text)
  
  // EXTRAGE DATE GENERALE
  const generalData = extractGeneralInvoiceData(text)
  
  // Construiește rezultatul final
  const result = {
    ...generalData,
    nlc_data: nlcResults,
    nlc_codes: [...new Set(nlcResults.map(r => r.nlc))],
    nlc_code: nlcResults.length > 0 ? nlcResults[0].nlc : null,
    location_name: nlcResults.length > 0 ? nlcResults[0].location : null
  }
  
  // Calculează suma totală dacă nu a fost găsită în date generale
  // IMPORTANT: Folosește sumaTotala care include și energia reactivă
  // DAR doar dacă suma_totala nu a fost deja extrasă din factură
  if (!result.suma_totala && nlcResults.length > 0) {
    const totalSum = nlcResults.reduce((sum, r) => {
      // Folosește sumaTotala (care include reactiva) sau suma (doar activa)
      const nlcSum = r.sumaTotala || r.suma || 0
      return sum + parseFloat(nlcSum)
    }, 0)
    if (totalSum > 0) {
      result.suma_totala = totalSum.toFixed(2)
      console.log(`   ⚠️ Suma totală calculată din NLC-uri: ${result.suma_totala} RON (${nlcResults.length} NLC-uri)`)
    }
  } else if (result.suma_totala) {
    // Verifică dacă suma extrasă este rezonabilă (între 1 și 1.000.000 RON)
    const sumaExtrasa = parseFloat(result.suma_totala)
    if (sumaExtrasa < 1 || sumaExtrasa > 1000000) {
      console.log(`   ⚠️ Suma extrasă pare incorectă (${result.suma_totala} RON), recalculăm din NLC-uri`)
      if (nlcResults.length > 0) {
        const totalSum = nlcResults.reduce((sum, r) => {
          const nlcSum = r.sumaTotala || r.suma || 0
          return sum + parseFloat(nlcSum)
        }, 0)
        if (totalSum > 0) {
          result.suma_totala = totalSum.toFixed(2)
          console.log(`   ✅ Suma totală recalculată din NLC-uri: ${result.suma_totala} RON`)
        }
      }
    } else {
      console.log(`   ✅ Suma totală extrasă din factură: ${result.suma_totala} RON`)
    }
  }
  
  // Calculează consumul total
  if (nlcResults.length > 0) {
    const totalConsum = nlcResults.reduce((sum, r) => sum + (r.consum || 0), 0)
    if (totalConsum > 0) {
      result.consum_kwh = totalConsum.toFixed(2)
    }
  }
  
  // VERIFICARE PREȚ: Compară prețul din factură cu cel calculat pentru fiecare NLC
  const pretFactura = result.pret_per_kwh
  if (pretFactura && pretFactura > 0) {
    console.log(`\n🔍 VERIFICARE PREȚ (preț factură: ${pretFactura.toFixed(4)} lei/kWh)`)
    
    for (const nlc of nlcResults) {
      if (nlc.pretCalculat && nlc.pretCalculat > 0) {
        const diferenta = Math.abs(nlc.pretCalculat - pretFactura) / pretFactura * 100
        nlc.pretVerificare = {
          pretFactura: pretFactura,
          pretCalculat: nlc.pretCalculat,
          diferentaPercent: diferenta.toFixed(2),
          esteCorect: diferenta < 5 // toleranță 5%
        }
        
        if (nlc.pretVerificare.esteCorect) {
          console.log(`   ✅ NLC ${nlc.nlc}: OK (calculat ${nlc.pretCalculat.toFixed(4)}, diferență ${diferenta.toFixed(2)}%)`)
        } else {
          console.log(`   ⚠️ NLC ${nlc.nlc}: DIFERENȚĂ (calculat ${nlc.pretCalculat.toFixed(4)}, diferență ${diferenta.toFixed(2)}%)`)
        }
      }
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ EXTRACȚIE COMPLETĂ')
  console.log(`   NLC-uri găsite: ${result.nlc_codes?.length || 0}`)
  if (nlcResults.length > 0) {
    console.log('   Detalii:')
    for (const r of nlcResults) {
      console.log(`     - ${r.nlc}: ${r.location}, ${r.suma ? r.suma.toFixed(2) + ' RON' : 'N/A'}, ${r.consum ? r.consum.toFixed(2) + ' kWh' : 'N/A'}`)
    }
  }
  console.log(`   Suma totală: ${result.suma_totala || 'N/A'} RON`)
  console.log(`   Consum total: ${result.consum_kwh || 'N/A'} kWh`)
  console.log(`   Preț/kWh: ${result.pret_per_kwh || 'N/A'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return result
}
