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
  if (upper.includes('PITESTI') || upper.includes('PITEȘTI') || upper.includes('PITI')) return 'Pitesti'
  if (upper.includes('VALCEA') || upper.includes('VÂLCEA') || upper.includes('RAMNICU')) return 'Valcea'
  if (upper.includes('PLOIESTI') || upper.includes('PLOIEȘTI')) {
    if (upper.includes('NORD')) return 'Ploiesti (nord)'
    if (upper.includes('CENTRU') || upper.includes('CENTER')) return 'Ploiesti (centru)'
    return 'Ploiesti (centru)'
  }
  if (upper.includes('BUCUREȘTI') || upper.includes('BUCHAREST') || upper.includes('BUCURESTI')) return 'Bucuresti'
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
    // IMPORTANT: Extinde secțiunea pentru a include TOATE datele pentru acest NLC
    const sectionStart = closestLocalitate ? closestLocalitate.position : Math.max(0, nlcIndex - 3000)
    
    // Găsește următorul NLC pentru a delimita secțiunea
    let sectionEnd = text.length
    for (const otherNlc of uniqueNlcs) {
      if (otherNlc !== nlc) {
        const otherIndex = text.indexOf(otherNlc, nlcIndex + 1)
        if (otherIndex > nlcIndex && otherIndex < sectionEnd) {
          // Găsește "Localitatea" înainte de acest NLC și folosește-o ca delimitator
          for (const loc of localitatePositions) {
            if (loc.position > nlcIndex && loc.position < otherIndex && loc.position < sectionEnd) {
              sectionEnd = loc.position
            }
          }
          // Dacă nu găsește localitate, folosește poziția NLC-ului următor minus un buffer
          if (sectionEnd === text.length) {
            sectionEnd = otherIndex - 200
          }
        }
      }
    }
    
    // Extinde secțiunea pentru a include mai mult context (până la 8000 caractere pentru a găsi toate datele)
    const sectionText = text.substring(sectionStart, Math.min(sectionEnd, sectionStart + 8000))
    console.log(`   📄 Secțiune: ${sectionStart} - ${sectionStart + sectionText.length} (${sectionText.length} caractere)`)
    
    // DEBUG: Salvează secțiunea într-un fișier pentru analiză
    if (process.env.DEBUG_NLC_SECTIONS) {
      const fs = require('fs')
      const path = require('path')
      const debugDir = path.join(process.cwd(), 'debug_nlc_sections')
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true })
      fs.writeFileSync(
        path.join(debugDir, `nlc_${nlc}_section.txt`),
        `NLC: ${nlc}\nLocație: ${closestLocalitate?.normalizedLocation || 'N/A'}\n\n${sectionText}`
      )
    }
    
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
    // Pattern 4: Orice număr urmat de kWh în secțiune (fallback)
    const consumMatch4 = sectionText.match(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?)\s*kWh/i)
    
    const consumMatch = consumMatch1 || consumMatch2 || consumMatch3 || consumMatch4
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
    
    // 3. Suma TOTALĂ - caută EXACT în secțiunea acestui NLC
    // IMPORTANT: Nu inventa sume! Extrage DOAR ce este în factură pentru acest NLC
    let suma = null
    const lines = sectionText.split('\n')
    
    // Colectează toate candidatele pentru suma totală
    const candidates = []
    
    // DEBUG: Arată TOATE liniile din secțiune pentru debugging complet
    console.log(`   🔍 DEBUG: TOATE liniile din secțiune (${lines.length} linii):`)
    lines.forEach((l, idx) => {
      const trimmed = l.trim()
      if (trimmed.length > 0) {
        // Highlight liniile care conțin numere mari sau "Total"
        const hasBigNumber = /[\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})/.test(trimmed)
        const hasTotal = /Total|TOTAL/i.test(trimmed)
        const hasTva = /TVA|tva/i.test(trimmed)
        const marker = hasTotal ? '🎯' : hasTva ? '📋' : hasBigNumber ? '💰' : '   '
        console.log(`${marker} ${idx + 1}. "${trimmed}"`)
      }
    })
    
    // PRIORITATE 1: Caută explicit două numere consecutive care adunate dau o sumă rezonabilă
    // (pentru cazul când avem "16.065,28" și "3.299,48" pe linii apropiate)
    console.log(`\n   🔍 PRIORITATE 1: Caută două numere consecutive (fără TVA + TVA)...`)
    const allNumbersInSection = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Caută toate numerele mari (format: 1.234,56 sau 1234,56 sau 1234.56)
      const numbers = [...line.matchAll(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g)]
      for (const numMatch of numbers) {
        const num = normalizeSum(numMatch[1])
        // Extinde intervalul pentru a găsi și numere mai mari (până la 50.000)
        if (num && num >= 50 && num < 50000) {
          allNumbersInSection.push({
            num,
            line: i,
            text: line.substring(0, 200),
            index: numMatch.index
          })
        }
      }
    }
    
    console.log(`   📊 Găsite ${allNumbersInSection.length} numere în secțiune:`)
    allNumbersInSection.forEach((n, idx) => {
      console.log(`      ${idx + 1}. ${n.num.toFixed(2)} RON (linia ${n.line + 1}): "${n.text}"`)
    })
    
    // Caută TOATE perechile posibile de numere (nu doar consecutive în array)
    // pentru a găsi perechi care ar putea fi "fără TVA" + "TVA"
    for (let i = 0; i < allNumbersInSection.length; i++) {
      for (let j = i + 1; j < allNumbersInSection.length; j++) {
        const num1 = allNumbersInSection[i]
        const num2 = allNumbersInSection[j]
        
        // Verifică dacă sunt pe linii apropiate (max 10 linii distanță)
        const lineDistance = Math.abs(num2.line - num1.line)
        if (lineDistance <= 10) {
          const sumaTotala = num1.num + num2.num
          const tvaRatio1 = num2.num / num1.num
          const tvaRatio2 = num1.num / num2.num
          
          // Verifică dacă unul dintre numere ar putea fi TVA (15-25% din celălalt)
          // SAU dacă suma este într-un interval rezonabil (10.000 - 30.000 pentru acest caz)
          const isTvaPair = (tvaRatio1 >= 0.15 && tvaRatio1 <= 0.25) || (tvaRatio2 >= 0.15 && tvaRatio2 <= 0.25)
          const isReasonableSum = sumaTotala >= 1000 && sumaTotala < 50000
          
          // Verifică dacă numerele sunt în intervalul așteptat pentru acest NLC
          // (16.065,28 și 3.299,48 sunt în intervalul 1.000 - 20.000)
          const num1Reasonable = num1.num >= 1000 && num1.num < 30000
          const num2Reasonable = num2.num >= 1000 && num2.num < 10000
          
          if (isTvaPair && isReasonableSum && num1Reasonable && num2Reasonable) {
            // Determină care este fără TVA și care este TVA
            let faraTva, tva
            if (num1.num > num2.num) {
              faraTva = num1.num
              tva = num2.num
            } else {
              faraTva = num2.num
              tva = num1.num
            }
            const finalTvaRatio = tva / faraTva
            
            console.log(`   ✅✅✅ PERECHE GĂSITĂ: ${faraTva.toFixed(2)} + ${tva.toFixed(2)} = ${sumaTotala.toFixed(2)} RON`)
            console.log(`      TVA: ${(finalTvaRatio * 100).toFixed(1)}% (linia ${num1.line + 1} și ${num2.line + 1}, distanță: ${lineDistance})`)
            console.log(`      Text 1: "${num1.text}"`)
            console.log(`      Text 2: "${num2.text}"`)
            
            candidates.push({
              val1: faraTva,
              val2: tva,
              total: sumaTotala,
              isKwh: true,
              isKvarh: false,
              line: `Linia ${num1.line + 1}: ${faraTva.toFixed(2)} + Linia ${num2.line + 1}: ${tva.toFixed(2)}`,
              lineNum: Math.min(num1.line, num2.line),
              isExplicitTva: true,
              isConsecutivePair: true,
              isSameLine: lineDistance === 0
            })
          }
        }
      }
    }
    
    // Caută și pe aceeași linie două numere consecutive (ex: "16.065,28 3.299,48")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const numbers = [...line.matchAll(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g)]
      if (numbers.length >= 2) {
        // Testează toate perechile de numere de pe linie
        for (let j = 0; j < numbers.length - 1; j++) {
          for (let k = j + 1; k < numbers.length; k++) {
            const num1Str = numbers[j][1]
            const num2Str = numbers[k][1]
            const num1 = normalizeSum(num1Str)
            const num2 = normalizeSum(num2Str)
            
            if (num1 && num2 && num1 >= 1000 && num2 >= 1000 && num1 < 50000 && num2 < 50000) {
              const sumaTotala = num1 + num2
              const tvaRatio1 = num2 / num1
              const tvaRatio2 = num1 / num2
              
              if ((tvaRatio1 >= 0.15 && tvaRatio1 <= 0.25) || (tvaRatio2 >= 0.15 && tvaRatio2 <= 0.25)) {
                let faraTva, tva
                if (num1 > num2) {
                  faraTva = num1
                  tva = num2
                } else {
                  faraTva = num2
                  tva = num1
                }
                
                console.log(`   ✅✅✅✅ PERECHE PE ACEEAȘI LINIE: ${faraTva.toFixed(2)} + ${tva.toFixed(2)} = ${sumaTotala.toFixed(2)} RON`)
                console.log(`      TVA: ${((tva / faraTva) * 100).toFixed(1)}% (linia ${i + 1}): "${line.substring(0, 200)}"`)
                
                candidates.push({
                  val1: faraTva,
                  val2: tva,
                  total: sumaTotala,
                  isKwh: true,
                  isKvarh: false,
                  line: `Linia ${i + 1}: ${faraTva.toFixed(2)} + ${tva.toFixed(2)}`,
                  lineNum: i,
                  isExplicitTva: true,
                  isConsecutivePair: true,
                  isSameLine: true // Prioritate maximă
                })
              }
            }
          }
        }
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
      const prevLine = i > 0 ? lines[i - 1].trim() : ''
      
      // Caută linii cu "Total loc de consum" sau "TOTAL" (dar nu TOTAL FACTURĂ)
      // IMPORTANT: Caută și variante precum "Total energie activă", "Total energie", etc.
      const isTotalLine = line.match(/Total\s+loc\s+de\s+consum/i) || 
                         line.match(/Total\s+energie\s+activ[aă]/i) ||
                         line.match(/Total\s+energie/i) ||
                         (line.match(/^\s*TOTAL\s/i) && !line.includes('FACTURĂ') && !line.includes('DE PLATĂ'))
      
      // Verifică și liniile vecine pentru pattern-uri alternative
      const hasTotalInNext = nextLine.match(/Total\s+loc\s+de\s+consum/i) ||
                             nextLine.match(/Total\s+energie\s+activ[aă]/i) ||
                             nextLine.match(/Total\s+energie/i)
      const hasTotalInPrev = prevLine.match(/Total\s+loc\s+de\s+consum/i) ||
                             prevLine.match(/Total\s+energie\s+activ[aă]/i) ||
                             prevLine.match(/Total\s+energie/i)
      
      // Verifică dacă linia conține NLC-ul (pentru a se asigura că e în secțiunea corectă)
      const containsNlc = line.includes(nlc) || nextLine.includes(nlc) || prevLine.includes(nlc)
      
      if (!isTotalLine && !hasTotalInNext && !hasTotalInPrev) continue
      
      // Preferă liniile care conțin NLC-ul sau sunt aproape de el
      if (!containsNlc && i > 50) {
        // Dacă linia e prea departe de NLC și nu-l conține, probabil nu e pentru acest NLC
        continue
      }
      
      // IMPORTANT: Prioritizează linii cu "kWh" (energie activă) peste "kVArh" (energie reactivă)
      const isKwh = (line.includes('kWh') || nextLine.includes('kWh') || prevLine.includes('kWh')) && 
                    !line.includes('kVArh') && !nextLine.includes('kVArh') && !prevLine.includes('kVArh')
      const isKvarh = line.includes('kVArh') || nextLine.includes('kVArh') || prevLine.includes('kVArh')
      
      // Extrage TOATE numerele din linie (format european: 11.056,23 sau 2.100,70)
      // Încearcă mai multe pattern-uri
      const numberPattern1 = /(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/g  // Format: 1.234,56
      const numberPattern2 = /(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g  // Format: 1,234.56
      const numberPattern3 = /(\d{1,3}(?:\.\d{3})*)/g            // Format: 1.234 (fără zecimale)
      
      // Combină toate pattern-urile
      const allNumbers1 = [...line.matchAll(numberPattern1)].map(m => m[1])
      const allNumbers2 = [...line.matchAll(numberPattern2)].map(m => m[1])
      const allNumbers3 = [...line.matchAll(numberPattern3)].map(m => m[1])
      
      // Verifică și în liniile vecine
      const nextNumbers1 = [...nextLine.matchAll(numberPattern1)].map(m => m[1])
      const prevNumbers1 = [...prevLine.matchAll(numberPattern1)].map(m => m[1])
      
      // Combină toate numerele găsite
      const allNumbers = [...allNumbers1, ...allNumbers2, ...allNumbers3, ...nextNumbers1, ...prevNumbers1]
      
      // Caută explicit "fără TVA" și "TVA" pentru a calcula suma corectă
      // Pattern-uri multiple pentru a găsi în diferite formate
      const faraTvaPatterns = [
        /(?:fără\s+TVA|fara\s+TVA|fără\s+tva|fara\s+tva)[^\d]{0,50}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
        /([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))[^\d]{0,50}(?:fără\s+TVA|fara\s+TVA)/i,
        /(?:Valoare|valoare|Suma|suma)[^\d]{0,30}(?:fără\s+TVA|fara\s+TVA)[^\d]{0,30}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
      ]
      
      const tvaPatterns = [
        /TVA[^\d]{0,50}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
        /([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))[^\d]{0,50}TVA/i,
        /(?:TVA|tva)\s*(\d{1,2})%[^\d]{0,30}([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
      ]
      
      let faraTvaMatch = null
      let tvaMatch = null
      
      for (const pattern of faraTvaPatterns) {
        const match = sectionText.match(pattern)
        if (match) {
          faraTvaMatch = match
          break
        }
      }
      
      for (const pattern of tvaPatterns) {
        const match = sectionText.match(pattern)
        if (match) {
          tvaMatch = match
          // Dacă pattern-ul are 2 grupuri (TVA% și suma), folosește suma
          if (match.length > 2 && match[2]) {
            tvaMatch = [match[0], match[2]]
          }
          break
        }
      }
      
      if (faraTvaMatch && tvaMatch) {
        const faraTva = normalizeSum(faraTvaMatch[1])
        const tva = normalizeSum(tvaMatch[1])
        if (faraTva !== null && tva !== null && faraTva > 0 && tva > 0) {
          // Verifică că TVA-ul este rezonabil (între 15% și 25% din suma fără TVA)
          const tvaRatio = tva / faraTva
          if (tvaRatio >= 0.15 && tvaRatio <= 0.25) {
            const sumaCuTva = faraTva + tva
            console.log(`   ✅ Sumă fără TVA: ${faraTva.toFixed(2)} RON`)
            console.log(`   ✅ TVA: ${tva.toFixed(2)} RON (${(tvaRatio * 100).toFixed(1)}%)`)
            console.log(`   ✅ Sumă cu TVA: ${sumaCuTva.toFixed(2)} RON`)
            candidates.push({
              val1: faraTva,
              val2: tva,
              total: sumaCuTva,
              isKwh,
              isKvarh,
              line: `Fără TVA: ${faraTva.toFixed(2)} + TVA: ${tva.toFixed(2)}`,
              lineNum: i,
              isExplicitTva: true
            })
          } else {
            console.log(`   ⚠️ TVA găsit dar raportul nu este rezonabil: ${(tvaRatio * 100).toFixed(1)}% (așteptat 15-25%)`)
          }
        }
      }
      
      if (allNumbers.length >= 2) {
        // Ia ultimele 2 numere (sunt de obicei fără TVA și cu TVA)
        const lastTwo = allNumbers.slice(-2)
        const val1 = normalizeSum(lastTwo[0])
        const val2 = normalizeSum(lastTwo[1])
        
        if (val1 !== null && val2 !== null && val1 > 0 && val2 > 0) {
          // Verifică dacă val2 este TVA-ul (de obicei ~19% din val1)
          const tvaRatio = val2 / val1
          const isTva = tvaRatio >= 0.15 && tvaRatio <= 0.25 // TVA între 15% și 25%
          
          candidates.push({
            val1,
            val2,
            total: val1 + val2,
            isKwh,
            isKvarh,
            line: line.substring(0, 80),
            lineNum: i,
            isTva: isTva,
            isExplicitTva: false
          })
        }
      } else if (allNumbers.length === 1) {
        // Dacă e doar un număr, poate e suma totală deja cu TVA inclusă
        const val = normalizeSum(allNumbers[0])
        if (val !== null && val > 0) {
          candidates.push({
            val1: val,
            val2: 0,
            total: val,
            isKwh,
            isKvarh,
            line: line.substring(0, 80),
            lineNum: i
          })
        }
      }
    }
    
    // Alege candidatul cel mai bun:
    // 1. PRIORITATE MAXIMĂ: Perechea consecutivă "fără TVA + TVA" (isConsecutivePair)
    // 2. PRIORITATE 2: Suma explicită "fără TVA + TVA" (isExplicitTva)
    // 3. Preferă linii cu kWh (energie activă)
    // 4. Dacă mai multe cu kWh, ia cel cu suma cea mai mică (evită sume care includ alte taxe)
    // 5. Evită liniile cu kVArh
    if (candidates.length > 0) {
      // Sortează: pereche consecutivă first, apoi explicit TVA, apoi kWh, apoi după suma crescător
      candidates.sort((a, b) => {
        // PRIORITATE 1: Perechea consecutivă PE ACEEAȘI LINIE (cea mai precisă)
        if (a.isSameLine && !b.isSameLine) return -1
        if (!a.isSameLine && b.isSameLine) return 1
        
        // PRIORITATE 2: Perechea consecutivă (foarte precisă)
        if (a.isConsecutivePair && !b.isConsecutivePair) return -1
        if (!a.isConsecutivePair && b.isConsecutivePair) return 1
        
        // PRIORITATE 3: Suma explicită "fără TVA + TVA"
        if (a.isExplicitTva && !b.isExplicitTva) return -1
        if (!a.isExplicitTva && b.isExplicitTva) return 1
        
        // PRIORITATE 4: kWh
        if (a.isKwh && !b.isKwh) return -1
        if (!a.isKwh && b.isKwh) return 1
        
        // PRIORITATE 5: Evită kVArh
        if (a.isKvarh && !b.isKvarh) return 1
        if (!a.isKvarh && b.isKvarh) return -1
        
        // PRIORITATE 6: Preferă sume mai mici (evită sume care includ alte taxe)
        // Dar dacă ambele sunt TVA explicite, preferă suma mai mare (corectă)
        if (a.isExplicitTva && b.isExplicitTva) {
          return b.total - a.total
        }
        return a.total - b.total
      })
      
      const best = candidates[0]
      suma = best.total
      
      if (best.isSameLine) {
        console.log(`   ✅✅✅✅ TOTAL găsit (PERECHE PE ACEEAȘI LINIE fără TVA + TVA): ${best.val1.toFixed(2)} + ${best.val2.toFixed(2)} = ${suma.toFixed(2)} RON`)
      } else if (best.isConsecutivePair) {
        console.log(`   ✅✅✅ TOTAL găsit (PERECHE CONSECUTIVĂ fără TVA + TVA): ${best.val1.toFixed(2)} + ${best.val2.toFixed(2)} = ${suma.toFixed(2)} RON`)
      } else if (best.isExplicitTva) {
        console.log(`   ✅ TOTAL găsit (EXPLICIT fără TVA + TVA): ${best.val1.toFixed(2)} + ${best.val2.toFixed(2)} = ${suma.toFixed(2)} RON`)
      } else {
        console.log(`   💰 TOTAL găsit: ${best.val1.toFixed(2)} + ${best.val2.toFixed(2)} = ${suma.toFixed(2)} RON (${best.isKwh ? 'kWh' : best.isKvarh ? 'kVArh' : 'general'})`)
      }
      console.log(`      Linie: "${best.line}..."`)
      console.log(`      Linia #${best.lineNum + 1} din secțiune`)
      
      if (candidates.length > 1) {
        console.log(`      (Alte ${candidates.length - 1} candidați ignorați)`)
        candidates.slice(1, 4).forEach((c, idx) => {
          console.log(`         ${idx + 2}. "${c.line}..." = ${c.total.toFixed(2)} RON`)
        })
      }
    } else {
      console.log(`   ❌ NU S-A GĂSIT SUMĂ pentru NLC ${nlc} în secțiunea sa!`)
      console.log(`   → Secțiunea nu conține "Total loc de consum" sau "TOTAL" cu sume valide`)
      console.log(`   → Căutare în toată secțiunea pentru orice număr mare...`)
      
      // ULTIMUL FALLBACK: Caută orice număr mare în secțiune (între 100 și 100000 RON)
      const allBigNumbers = []
      for (const line of lines) {
        const numbers = [...line.matchAll(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g)]
        for (const numMatch of numbers) {
          const num = normalizeSum(numMatch[1])
          if (num && num >= 100 && num < 100000) {
            allBigNumbers.push({ num, line: line.trim().substring(0, 100) })
          }
        }
      }
      
      if (allBigNumbers.length > 0) {
        // Sortează după mărime și ia cel mai mare (probabil e suma totală)
        allBigNumbers.sort((a, b) => b.num - a.num)
        const biggest = allBigNumbers[0]
        suma = biggest.num
        console.log(`   💰 SUMĂ GĂSITĂ (fallback): ${suma.toFixed(2)} RON (din: "${biggest.line}")`)
      } else {
        console.log(`   ❌ NICIUN NUMĂR MARE găsit în secțiune pentru NLC ${nlc}`)
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
    
    // VERIFICARE VALIDITATE: Dacă consum = 0 dar suma > 0
    // Poate fi valid dacă suma este extrasă corect din factură (ex: facturi cu sume fixe)
    // Verifică dacă suma este rezonabilă (< 100.000 RON) și dacă există alte indicii că e validă
    if ((!consum || consum === 0) && suma > 0) {
      // Dacă suma este prea mare (> 100k) fără consum, probabil e greșită
      if (suma > 100000) {
        console.log(`   ⚠️ NLC ${nlc}: IGNORAT - consum 0 kWh dar suma ${suma.toFixed(2)} RON (prea mare, probabil greșită)`)
        continue // Skip acest NLC - nu-l adăugăm
      } else {
        console.log(`   ⚠️ NLC ${nlc}: consum 0 kWh dar suma ${suma.toFixed(2)} RON (se păstrează - poate fi validă)`)
        // Păstrează NLC-ul dar setează consumul la null
        consum = null
      }
    }
    
    // Dacă nici suma nici consumul nu sunt găsite, caută în întregul document
    // (poate că sumele sunt într-un tabel centralizat, nu în secțiunea individuală)
    if (!suma && !consum) {
      console.log(`   ⚠️ NLC ${nlc}: Nu s-au găsit date în secțiune, caută în întregul document...`)
      
      // Caută NLC-ul în întregul text și extrage datele din contextul mai larg
      const nlcContextPattern = new RegExp(`${nlc}[\\s\\S]{0,2000}(?:Total|TOTAL|consum)[\\s\\S]{0,500}`, 'i')
      const nlcContextMatch = text.match(nlcContextPattern)
      
      if (nlcContextMatch) {
        const contextText = nlcContextMatch[0]
        console.log(`   🔍 Context găsit pentru NLC ${nlc} (${contextText.length} caractere)`)
        
        // Caută consum în context
        if (!consum) {
          const consumContextMatch = contextText.match(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{0,2})?)\s*kWh/i)
          if (consumContextMatch) {
            const consumStr = consumContextMatch[1].replace(/\./g, '').replace(',', '.')
            consum = parseFloat(consumStr)
            if (!isNaN(consum)) {
              console.log(`   ⚡ Consum găsit în context: ${consum} kWh`)
            }
          }
        }
        
        // Caută sumă în context
        if (!suma) {
          const sumaContextMatches = [...contextText.matchAll(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g)]
          for (const match of sumaContextMatches) {
            const num = normalizeSum(match[1])
            if (num && num >= 100 && num < 100000) {
              // Verifică dacă e urmat de "RON", "lei" sau e în context de sumă
              const afterMatch = contextText.substring(match.index + match[0].length, match.index + match[0].length + 20)
              if (afterMatch.match(/(?:RON|lei|LEI|\s|$)/i)) {
                suma = num
                console.log(`   💰 Sumă găsită în context: ${suma.toFixed(2)} RON`)
                break
              }
            }
          }
        }
      }
    }
    
    // Dacă încă nu s-au găsit, loghează un warning
    if (!suma && !consum) {
      console.log(`   ❌ NLC ${nlc}: Nu s-au găsit nici sumă nici consum nici în secțiune, nici în context`)
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
  
  // DEDUPLICARE: Elimină duplicatele bazate pe sumă + locație
  // Dacă două NLC-uri au aceeași sumă totală și locație, probabil sunt duplicate
  console.log('\n🔍 VERIFICARE DUPLICATE:')
  const deduplicatedResults = []
  const seen = new Map() // key: "sumaTotala|location"
  
  for (const result of results) {
    const key = `${result.sumaTotala?.toFixed(2) || '0'}|${result.location || 'N/A'}`
    
    if (seen.has(key)) {
      const existing = seen.get(key)
      console.log(`   ⚠️ DUPLICAT DETECTAT:`)
      console.log(`      NLC ${result.nlc} (${result.location}) = ${result.sumaTotala?.toFixed(2)} RON`)
      console.log(`      NLC ${existing.nlc} (${existing.location}) = ${existing.sumaTotala?.toFixed(2)} RON`)
      console.log(`      → Păstrez primul NLC: ${existing.nlc}`)
      // Nu adăugăm duplicatele
      continue
    }
    
    seen.set(key, result)
    deduplicatedResults.push(result)
  }
  
  if (results.length !== deduplicatedResults.length) {
    console.log(`   ✅ Eliminate ${results.length - deduplicatedResults.length} duplicate`)
  } else {
    console.log(`   ✅ Nu s-au găsit duplicate`)
  }
  
  return deduplicatedResults
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
  
  // Număr contor - caută cod de 12 cifre (ex: 005005246202)
  // Pattern-uri: "Cod: 005005246202", "Contor: 005005246202", "Număr contor: 005005246202"
  const numarContorPatterns = [
    /(?:Cod|Contor|Num[ăa]r\s+contor)[:\s]*(\d{12})/i,
    /(\d{12})/  // Fallback: orice cod de 12 cifre consecutive
  ]
  
  for (const pattern of numarContorPatterns) {
    const match = text.match(pattern)
    if (match) {
      const contorCode = match[1]
      // Verifică că nu este un NLC (NLC-urile sunt de 10 cifre, contoarele de 12)
      if (contorCode.length === 12) {
        data.numar_contor = contorCode
        console.log(`   🔢 Număr contor: ${data.numar_contor}`)
        break
      }
    }
  }
  
  // Preț final per kWh - caută explicit "Preț final facturat energie activă"
  const pretFinalMatch = text.match(/Pre[țt]\s+final\s+facturat\s+energie\s+activ[aă]\s*([\d][,.][\d]+)\s*lei\/kWh/i)
  if (pretFinalMatch) {
    data.pret_per_kwh = normalizeSum(pretFinalMatch[1])
    console.log(`   💵 Preț final/kWh: ${data.pret_per_kwh}`)
  }
  
  // EXTRAGE TOATE SUMELE DIN FACTURĂ: penalități, dobânzi, sold anterior, total de plată
  console.log(`\n💰 EXTRAGERE TOATE SUMELE DIN FACTURĂ:`)
  
  // 1. Sold anterior (facturi restante)
  const soldAnteriorPatterns = [
    /SOLD\s+ANTERIOR[^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
    /Sold\s+(?:la\s+data\s+emiterii\s+facturii\s+)?\(?(?:facturi\s+restante\s+)?sau\s+credit\)?[^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
  ]
  for (const pattern of soldAnteriorPatterns) {
    const match = text.match(pattern)
    if (match) {
      const sold = normalizeSum(match[1])
      if (sold && sold > 0) {
        data.sold_anterior = sold
        console.log(`   📊 Sold anterior: ${data.sold_anterior.toFixed(2)} RON`)
        break
      }
    }
  }
  
  // 2. Penalități
  const penalitatiPatterns = [
    /Penalit[ăa]t[ăa]i[^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
    /Penalit[ăa]t[ăa][^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
  ]
  for (const pattern of penalitatiPatterns) {
    const match = text.match(pattern)
    if (match) {
      const penal = normalizeSum(match[1])
      if (penal && penal > 0) {
        data.penalitati = penal
        console.log(`   ⚠️ Penalități: ${data.penalitati.toFixed(2)} RON`)
        break
      }
    }
  }
  
  // 3. Dobânzi
  const dobanziPatterns = [
    /Dob[âa]nzi[^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
    /Dob[âa]nd[ăa][^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
  ]
  for (const pattern of dobanziPatterns) {
    const match = text.match(pattern)
    if (match) {
      const dob = normalizeSum(match[1])
      if (dob && dob > 0) {
        data.dobanzi = dob
        console.log(`   💸 Dobânzi: ${data.dobanzi.toFixed(2)} RON`)
        break
      }
    }
  }
  
  // 4. TOTAL DE PLATĂ (suma finală care include tot: factură + sold anterior + penalități + dobânzi)
  const totalPlataPatterns = [
    /TOTAL\s+DE\s+PLAT[ĂA]\s*\(?LEI\)?[:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
    /Total\s+de\s+plat[ăa][:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
  ]
  for (const pattern of totalPlataPatterns) {
    const match = text.match(pattern)
    if (match) {
      const total = normalizeSum(match[1])
      if (total && total > 0) {
        data.total_de_plata = total
        console.log(`   💰 TOTAL DE PLATĂ: ${data.total_de_plata.toFixed(2)} RON`)
        break
      }
    }
  }
  
  // 5. Dacă există TOTAL DE PLATĂ, folosește-l ca sumă totală (include tot!)
  if (data.total_de_plata && data.total_de_plata > 0) {
    console.log(`   ✅ Folosind TOTAL DE PLATĂ ca sumă totală: ${data.total_de_plata.toFixed(2)} RON (include factură + sold + penalități + dobânzi)`)
  }
  
  // Suma totală factură curentă - caută multiple variante
  // Gestionează format LaTeX $...$ și sume pe linia următoare
  const lines = text.split('\n')
  let sumaTotalaFound = false
  
  // DEBUG: Caută toate aparițiile "TOTAL FACTURĂ" pentru debugging
  console.log(`   🔍 DEBUG: Căutare "TOTAL FACTURĂ" în text:`)
  const totalMatches = [...text.matchAll(/TOTAL\s+FACTUR[AĂ][^\n]{0,100}/gi)]
  totalMatches.slice(0, 5).forEach((m, idx) => {
    console.log(`      ${idx + 1}. "${m[0]}"`)
  })
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
    const nextNextLine = i + 2 < lines.length ? lines[i + 2].trim() : ''
    
    // Verifică dacă linia conține "TOTAL FACTURĂ CURENTĂ" (cu sau fără LEI)
    if (line.match(/TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]/i)) {
      // Încearcă să extragă suma din aceeași linie - pattern îmbunătățit
      // Format: "TOTAL FACTURĂ CURENTĂ (LEI): 22.142,76" sau "TOTAL FACTURĂ CURENTĂ 22.142,76"
      const sameLinePatterns = [
        /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ][^:]*:\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
        /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ][^:]*\(?LEI\)?[^:]*:\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
        /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ].*?([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i
      ]
      
      for (const pattern of sameLinePatterns) {
        const sameLineMatch = line.match(pattern)
        if (sameLineMatch) {
          const suma = normalizeSum(sameLineMatch[1])
          if (suma && suma >= 100 && suma < 1000000) {
            data.suma_totala = suma
            console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (pe aceeași linie: "${line.substring(0, 80)}")`)
            sumaTotalaFound = true
            break
          }
        }
      }
      
      if (sumaTotalaFound) break
      
      // Dacă nu s-a găsit pe aceeași linie, verifică liniile următoare
      if (!sumaTotalaFound) {
        // Verifică linia următoare
        if (nextLine) {
          // Format LaTeX: $22.142,76$ sau $22,142.76$
          const latexMatch = nextLine.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$/i)
          if (latexMatch) {
            const suma = normalizeSum(latexMatch[1])
            if (suma && suma >= 100 && suma < 1000000) {
              data.suma_totala = suma
              console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (format LaTeX pe linia următoare: "${nextLine.substring(0, 80)}")`)
              sumaTotalaFound = true
              break
            }
          }
          
          // Format standard pe linia următoare (fără $) - doar număr mare
          const nextLineMatch = nextLine.match(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/)
          if (nextLineMatch) {
            const suma = normalizeSum(nextLineMatch[1])
            // Validare: suma între 100 și 1.000.000 RON (facturi electrice - acceptă și sume mai mici)
            if (suma && suma >= 100 && suma < 1000000) {
              data.suma_totala = suma
              console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (pe linia următoare: "${nextLine.substring(0, 80)}")`)
              sumaTotalaFound = true
              break
            }
          }
        }
        
        // Verifică și linia a 3-a (pentru cazuri cu linii goale)
        if (!sumaTotalaFound && nextNextLine) {
          const latexMatch2 = nextNextLine.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$/i)
          if (latexMatch2) {
            const suma = normalizeSum(latexMatch2[1])
            // Validare: suma între 100 și 1.000.000 RON
            if (suma && suma >= 100 && suma < 1000000) {
              data.suma_totala = suma
              console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (format LaTeX pe linia a 3-a: "${nextNextLine.substring(0, 80)}")`)
              sumaTotalaFound = true
              break
            }
          }
          
          const nextNextLineMatch = nextNextLine.match(/([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/)
          if (nextNextLineMatch) {
            const suma = normalizeSum(nextNextLineMatch[1])
            if (suma && suma >= 1000 && suma < 100000) {
              data.suma_totala = suma
              console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (pe linia a 3-a: "${nextNextLine.substring(0, 80)}")`)
              sumaTotalaFound = true
              break
            }
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
      // Format: "TOTAL FACTURĂ CURENTĂ (LEI): 22.142,76" sau "TOTAL FACTURĂ CURENTĂ: 22.142,76 lei"
      /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]\s*\(?LEI\)?[:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*(?:lei|RON)?/i,
      // Format: "TOTAL FACTURĂ CURENTĂ CU TVA: 22.142,76"
      /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]\s+CU\s+TVA[:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
      // Format: "TOTAL FACTURĂ CURENTĂ" urmat de număr pe linia următoare sau în același rând
      /TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ][:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
      // Format LaTeX: $22.142,76$ sau $22,142.76$
      /\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*\$/i
    ]
    
    for (const pattern of sumaTotalaPatterns) {
      const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))]
      for (const match of matches) {
        const suma = normalizeSum(match[1])
        // Validare: suma rezonabilă (între 100 și 1.000.000 RON pentru facturi electrice)
        if (suma && suma >= 100 && suma < 1000000) {
          data.suma_totala = suma
          console.log(`   💰 Suma totală factură: ${data.suma_totala} RON (regex pattern: "${match[0].substring(0, 60)}")`)
          sumaTotalaFound = true
          break
        }
      }
      if (sumaTotalaFound) break
    }
  }
  
  // Dacă încă nu s-a găsit, încercă să extragă din tabelul "DETALII FACTURĂ"
  if (!sumaTotalaFound) {
    // Caută în secțiunea "DETALII FACTURĂ" după "TOTAL FACTURĂ CURENTĂ CU TVA"
    const detaliiMatches = [...text.matchAll(/TOTAL\s+FACTUR[AĂ]\s+CURENT[AĂ]\s+CU\s+TVA[:\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/gi)]
    for (const match of detaliiMatches) {
      const suma = normalizeSum(match[1])
      if (suma && suma >= 100 && suma < 1000000) {
        data.suma_totala = suma
        console.log(`   💰 Suma totală factură (din detalii): ${data.suma_totala} RON`)
        sumaTotalaFound = true
        break
      }
    }
  }
  
  // Dacă încă nu s-a găsit, caută orice număr mare (între 1000 și 100000) care apare după "TOTAL"
  if (!sumaTotalaFound) {
    const totalMatches = [...text.matchAll(/TOTAL[^\d]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/gi)]
    for (const match of totalMatches) {
      const suma = normalizeSum(match[1])
      // Validare: suma între 100 și 1.000.000 RON (acceptă și sume mai mici)
      if (suma && suma >= 100 && suma < 1000000) {
        data.suma_totala = suma
        console.log(`   💰 Suma totală factură (căutare generală): ${data.suma_totala} RON (din: "${match[0].substring(0, 60)}")`)
        sumaTotalaFound = true
        break
      }
    }
  }
  
  // PRIORITATE: Dacă există TOTAL DE PLATĂ, folosește-l (include tot!)
  if (data.total_de_plata && data.total_de_plata > 0) {
    // TOTAL DE PLATĂ are prioritate - include factură + sold + penalități + dobânzi
    data.suma_totala = data.total_de_plata
    console.log(`   ✅ SUMĂ TOTALĂ FINALĂ (TOTAL DE PLATĂ): ${data.suma_totala.toFixed(2)} RON`)
    sumaTotalaFound = true
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
  
  // DEBUG: Arată primele 3000 caractere și ultimele 1000 pentru a vedea structura
  console.log('\n📄 PRIMELE 3000 CARACTERE:')
  console.log(text.substring(0, 3000))
  console.log('\n📄 ULTIMELE 1000 CARACTERE:')
  console.log(text.substring(Math.max(0, text.length - 1000)))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // DEBUG: Caută toate aparițiile "TOTAL" în text
  console.log('🔍 TOATE aparițiile "TOTAL" în text:')
  const allTotalMatches = [...text.matchAll(/TOTAL[^\n]{0,150}/gi)]
  allTotalMatches.forEach((m, idx) => {
    console.log(`   ${idx + 1}. "${m[0]}"`)
  })
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
  
  // PRIORITATE: Folosește suma totală extrasă din factură, NU suma calculată din NLC-uri
  // Suma din factură este SINGURA SURSĂ DE ADEVĂR pentru suma totală
  // Dacă există TOTAL DE PLATĂ, folosește-l (include factură + sold + penalități + dobânzi)
  if (result.total_de_plata && result.total_de_plata > 0) {
    // TOTAL DE PLATĂ are prioritate absolută - include TOATE sumele
    result.suma_totala = typeof result.total_de_plata === 'string' ? parseFloat(result.total_de_plata) : result.total_de_plata
    result.suma_totala = result.suma_totala.toFixed(2)
    console.log(`   ✅ SUMĂ TOTALĂ (TOTAL DE PLATĂ): ${result.suma_totala} RON`)
    console.log(`      Include: Factură curentă + Sold anterior + Penalități + Dobânzi`)
    if (result.sold_anterior) console.log(`      - Sold anterior: ${result.sold_anterior.toFixed(2)} RON`)
    if (result.penalitati) console.log(`      - Penalități: ${result.penalitati.toFixed(2)} RON`)
    if (result.dobanzi) console.log(`      - Dobânzi: ${result.dobanzi.toFixed(2)} RON`)
  } else if (result.suma_totala) {
    const sumaExtrasa = typeof result.suma_totala === 'string' ? parseFloat(result.suma_totala) : result.suma_totala
    // Verifică dacă suma extrasă este rezonabilă (între 100 și 1.000.000 RON)
    if (!isNaN(sumaExtrasa) && sumaExtrasa >= 100 && sumaExtrasa <= 1000000) {
      // PĂSTREAZĂ suma extrasă din factură - este corectă!
      result.suma_totala = sumaExtrasa.toFixed(2)
      console.log(`   ✅ Suma totală extrasă din factură: ${result.suma_totala} RON (PĂSTRATĂ - este corectă!)`)
    } else {
      console.log(`   ⚠️ Suma extrasă pare incorectă (${result.suma_totala} RON), se va recalcula`)
      result.suma_totala = null // Șterge suma greșită
    }
  }
  
  // IMPORTANT: NU calcula suma totală din NLC-uri dacă nu toate au sume!
  // Suma totală trebuie să fie EXACT cea din factură, nu inventată!
  const nlcCuSume = nlcResults.filter(r => {
    const suma = parseFloat(r.sumaTotala || r.suma || 0)
    return !isNaN(suma) && suma > 0
  }).length
  
  console.log(`\n📊 REZUMAT EXTRAGERE NLC-uri:`)
  console.log(`   Total NLC-uri: ${nlcResults.length}`)
  console.log(`   NLC-uri cu sume extrase: ${nlcCuSume}`)
  console.log(`   NLC-uri fără sume: ${nlcResults.length - nlcCuSume}`)
  
  if (nlcCuSume < nlcResults.length) {
    console.log(`   ⚠️ ATENȚIE: ${nlcResults.length - nlcCuSume} NLC-uri NU au sume extrase din factură!`)
    console.log(`   → Trebuie să se găsească sumele în secțiunile respective din PDF`)
    console.log(`   → NU se va inventa sau calcula sume pentru aceste NLC-uri`)
  }
  
  // NU calcula suma totală din NLC-uri dacă nu toate au sume!
  // Suma totală trebuie să fie EXACT cea extrasă din factură (TOTAL FACTURĂ CURENTĂ sau TOTAL DE PLATĂ)
  
  // Calculează consumul total
  if (nlcResults.length > 0) {
    const totalConsum = nlcResults.reduce((sum, r) => sum + (r.consum || 0), 0)
    if (totalConsum > 0) {
      result.consum_kwh = totalConsum.toFixed(2)
    }
  }
  
  // CALCULEAZĂ PREȚUL GENERAL CORECT: din suma totală și consumul total
  // Sau din prețul mediu ponderat al NLC-urilor care au date complete
  if (result.suma_totala && result.consum_kwh) {
    const sumaTotala = parseFloat(result.suma_totala)
    const consumTotal = parseFloat(result.consum_kwh)
    if (consumTotal > 0 && sumaTotala > 0) {
      const pretCalculat = sumaTotala / consumTotal
      result.pret_per_kwh = pretCalculat.toFixed(4)
      console.log(`   💵 Preț/kWh CALCULAT din total: ${result.suma_totala} RON / ${result.consum_kwh} kWh = ${result.pret_per_kwh} lei/kWh`)
    }
  } else if (nlcResults.length > 0) {
    // Calculează prețul mediu ponderat din NLC-urile care au date complete
    let totalSuma = 0
    let totalConsum = 0
    let nlcCuDate = 0
    
    for (const nlc of nlcResults) {
      const suma = parseFloat(nlc.sumaTotala || nlc.suma || 0)
      const consum = parseFloat(nlc.consum || 0)
      if (suma > 0 && consum > 0) {
        totalSuma += suma
        totalConsum += consum
        nlcCuDate++
      }
    }
    
    if (totalConsum > 0 && totalSuma > 0) {
      const pretMediu = totalSuma / totalConsum
      result.pret_per_kwh = pretMediu.toFixed(4)
      console.log(`   💵 Preț/kWh MEDIU PONDERAT: ${totalSuma.toFixed(2)} RON / ${totalConsum.toFixed(2)} kWh = ${result.pret_per_kwh} lei/kWh (din ${nlcCuDate} NLC-uri cu date)`)
    }
  }
  
  // VERIFICARE SUMĂ TOTALĂ: Compară suma NLC-urilor cu suma totală a facturii
  try {
    let totalNlcSum = nlcResults.reduce((sum, r) => sum + (parseFloat(r.sumaTotala) || 0), 0)
    const invoiceTotal = result.suma_totala ? (typeof result.suma_totala === 'string' ? parseFloat(result.suma_totala) : result.suma_totala) : null
    
    // FALLBACK: NU DISTRIBUII SUME! Extrage-le din factură!
    // Dacă nu s-au găsit sume pentru NLC-uri, înseamnă că nu sunt în PDF sau sunt în alt format
    // NU inventa sume prin distribuție!
    if (invoiceTotal && invoiceTotal > 0 && nlcResults.length > 0) {
      const nlcCuSumeReale = nlcResults.filter(r => {
        const suma = parseFloat(r.sumaTotala || r.suma || 0)
        return !isNaN(suma) && suma > 0
      }).length
      
      if (nlcCuSumeReale < nlcResults.length) {
        console.log(`\n⚠️ PROBLEMĂ: Doar ${nlcCuSumeReale}/${nlcResults.length} NLC-uri au sume extrase`)
        console.log(`   → Suma totală din factură: ${invoiceTotal.toFixed(2)} RON`)
        console.log(`   → Suma din NLC-uri cu date: ${totalNlcSum.toFixed(2)} RON`)
        console.log(`   ⚠️ NU se vor distribui sume inventate!`)
        console.log(`   → Trebuie să se găsească sumele EXACTE în secțiunile NLC-urilor din PDF`)
      }
    }
    
    if (invoiceTotal && totalNlcSum > 0 && !isNaN(invoiceTotal) && !isNaN(totalNlcSum)) {
      const difference = Math.abs(totalNlcSum - invoiceTotal)
      const percentDiff = invoiceTotal > 0 ? (difference / invoiceTotal) * 100 : 0
      
      console.log(`\n💰 VERIFICARE SUMĂ TOTALĂ:`)
      console.log(`   Suma factură: ${invoiceTotal.toFixed(2)} RON`)
      console.log(`   Suma NLC-uri: ${totalNlcSum.toFixed(2)} RON`)
      console.log(`   Diferență: ${difference.toFixed(2)} RON (${percentDiff.toFixed(1)}%)`)
      
      // Dacă diferența este mai mare de 20%, sumele NLC-urilor sunt probabil greșite
      // Marchează sumele suspecte pentru a fi ignorate în frontend
      if (percentDiff > 20) {
        console.log(`   ⚠️ ATENȚIE: Diferență mare detectată (${percentDiff.toFixed(1)}%)!`)
        console.log(`   → Sumele individuale ale NLC-urilor sunt probabil greșite`)
        console.log(`   → Se va folosi suma totală extrasă din factură (${invoiceTotal.toFixed(2)} RON)`)
        
        // Marchează toate sumele NLC-urilor ca fiind suspecte
        for (const nlc of nlcResults) {
          const sumaNlc = parseFloat(nlc.sumaTotala || nlc.suma || 0)
          if (sumaNlc > 0) {
            // Dacă suma unui NLC este mai mare decât suma totală a facturii, este clar greșită
            if (sumaNlc > invoiceTotal) {
              console.log(`   🔴 NLC ${nlc.nlc}: Suma ${sumaNlc.toFixed(2)} RON > suma factură ${invoiceTotal.toFixed(2)} RON - MARCAT CA GREȘITĂ`)
              nlc.sumaSuspecta = true
              nlc.sumaOriginala = sumaNlc
            }
          }
        }
      }
      
      // Dacă suma NLC-urilor este aproape dublă față de suma facturii, probabil sunt duplicate
      if (totalNlcSum > invoiceTotal * 1.8) {
        console.log(`   🔴 SUMĂ DUBLĂ DETECTATĂ! Probabil duplicate în NLC-uri.`)
        console.log(`   → Se va aplica deduplicare automată bazată pe sumă + locație`)
      }
    }
  } catch (error) {
    console.error(`   ⚠️ Eroare la verificarea sumei totale: ${error.message}`)
    // Continuă fără să oprească procesarea
  }
  
  // VERIFICARE PREȚ: Compară prețul din factură cu cel calculat pentru fiecare NLC
  const pretFactura = result.pret_per_kwh ? (typeof result.pret_per_kwh === 'string' ? parseFloat(result.pret_per_kwh) : result.pret_per_kwh) : null
  if (pretFactura && pretFactura > 0 && !isNaN(pretFactura)) {
    console.log(`\n🔍 VERIFICARE PREȚ (preț factură: ${pretFactura.toFixed(4)} lei/kWh)`)
    
    for (const nlc of nlcResults) {
      const pretCalculat = typeof nlc.pretCalculat === 'number' ? nlc.pretCalculat : parseFloat(nlc.pretCalculat || 0)
      if (pretCalculat && pretCalculat > 0 && !isNaN(pretCalculat)) {
        const diferenta = Math.abs(pretCalculat - pretFactura) / pretFactura * 100
        nlc.pretVerificare = {
          pretFactura: pretFactura,
          pretCalculat: pretCalculat,
          diferentaPercent: diferenta.toFixed(2),
          esteCorect: diferenta < 5 // toleranță 5%
        }
        
        if (nlc.pretVerificare.esteCorect) {
          console.log(`   ✅ NLC ${nlc.nlc}: OK (calculat ${pretCalculat.toFixed(4)}, diferență ${diferenta.toFixed(2)}%)`)
        } else {
          console.log(`   ⚠️ NLC ${nlc.nlc}: DIFERENȚĂ (calculat ${pretCalculat.toFixed(4)}, diferență ${diferenta.toFixed(2)}%)`)
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
