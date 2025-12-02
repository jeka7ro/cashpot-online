import React, { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { Package, Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'

const InventoryCentralizer = () => {
  const { user } = useAuth()
  const [uploadedFile, setUploadedFile] = useState(null) // Fișierul Excel încărcat
  const [sheetsData, setSheetsData] = useState({}) // { locationName: { headers, rows } }
  const [centralizedData, setCentralizedData] = useState([])
  const [loading, setLoading] = useState(false)
  const [groupByLocation, setGroupByLocation] = useState(true) // Opțiune pentru grupare pe locații

  // Locațiile disponibile (excluzând Depozit)
  const locations = ['Craiova', 'Pitesti', 'Ploiesti (centru)', 'Ploiesti (nord)', 'Valcea']

  // Funcție pentru formatare număr
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return Number(num).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Funcție pentru normalizare text (elimină diferențe de scriere)
  const normalizeText = (text) => {
    if (!text) return ''
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimină diacritice
      .replace(/[^a-z0-9]/g, '') // Elimină toate caracterele non-alfanumerice
      .trim()
  }

  // Funcție pentru extragere cuvinte cheie (branduri, modele) - generică pentru toate produsele
  const extractKeywords = (text) => {
    if (!text) return []
    const normalized = normalizeText(text)
    
    // Cuvinte comune de ignorat (generice, nu specifice unui tip de produs)
    const stopWords = ['aj', 'de', 'la', 'si', 'cu', 'pentru', 'buc', 'bucati', 'cele', 'focsani', 'bar', 'vip']
    
    // Extrage cuvinte cheie - încearcă să găsească branduri și modele
    // Split pe spații și caractere speciale, apoi filtrează
    const words = normalized
      .split(/[\s\-_()\/]+/)
      .filter(w => w.length >= 2 && !stopWords.includes(w))
      .filter((w, i, arr) => arr.indexOf(w) === i) // Remove duplicates
    
    return words
  }

  // Funcție pentru normalizare tipuri de produse (recunoaște variații comune)
  const normalizeProductType = (text) => {
    if (!text) return ''
    const lower = String(text).toLowerCase().trim()
    
    // Mapări pentru tipuri de produse comune - categorii normalizate
    const mappings = {
      // Calculatoare / PC - TOATE SUNT ACELAȘI LUCRU
      'pc': 'pc',
      'calculatoare': 'pc',
      'calculator': 'pc',
      'rpi': 'pc',
      'rpy': 'pc', // RPY = RPI (typo comun)
      'raspberry pi': 'pc',
      'mini pc': 'pc',
      'lcd cyber': 'pc',
      'pc cyber': 'pc',
      'pc hp': 'pc',
      'pc hp cyber': 'pc',
      'pc hp cyber egt': 'pc',
      'rpi mini pc cyber': 'pc',
      'rpy lcd cyber': 'pc',
      'rpy cyber': 'pc',
      'rpy cyber marketing': 'pc',
      'calculatoare marketing': 'pc',
      // TV
      'tv': 'tv',
      'televizor': 'tv',
      'televizoare': 'tv',
      // Info Kiosk / InfoPoint
      'infokiosk': 'infokiosk',
      'info kiosk': 'infokiosk',
      'infopoint': 'infokiosk',
      'info point': 'infokiosk',
      // Imprimante
      'imprimanta': 'imprimanta',
      'imprimante': 'imprimanta',
      'printer': 'imprimanta',
      // Scaune - NU se grupează între ele (Milena ≠ Sochi ≠ VIP EGT)
      'scaun': 'scaun',
      'scaune': 'scaun',
      // Frigidere
      'frigider': 'frigidere',
      'frigidere': 'frigidere',
      // Aer conditionat
      'aer conditionat': 'aer conditionat',
      'ac': 'aer conditionat',
      'aerconditionat': 'aer conditionat',
      // Mașini de gheață
      'masina de gheata': 'masina de gheata',
      'masina gheata': 'masina de gheata',
      // Aspiratoare
      'aspirator': 'aspirator',
      'aspiratoare': 'aspirator',
      // Birouri
      'birou': 'birou',
      'birouri': 'birou',
      // Urne
      'urna': 'urna',
      'urne': 'urna',
      // Uscătoare
      'uscator': 'uscator',
      'uscator maini': 'uscator',
      'uscatoare': 'uscator',
    }
    
    // Verifică dacă textul conține vreunul dintre tipurile de produse
    for (const [key, value] of Object.entries(mappings)) {
      if (lower.includes(key)) {
        return value
      }
    }
    
    return lower
  }

  // Funcție pentru extragere categorie principală (pentru grupare mai agresivă)
  const getMainCategory = (text) => {
    if (!text) return ''
    const type = normalizeProductType(text)
    
    // Categorii principale pentru grupare mai agresivă
    const categoryMap = {
      'pc': 'pc', // PC-urile se grupează toate împreună
      'tv': 'tv',
      'infokiosk': 'infokiosk',
      'imprimanta': 'imprimanta',
      'scaun': 'scaun', // Scaunele NU se grupează între ele (Milena ≠ Sochi ≠ VIP EGT)
      'frigidere': 'echipamente',
      'aer conditionat': 'echipamente',
      'masina de gheata': 'echipamente',
      'aspirator': 'echipamente',
      'birou': 'mobilier',
      'urna': 'mobilier',
      'uscator': 'echipamente',
    }
    
    return categoryMap[type] || type
  }

  // Funcție pentru matching inteligent între două produse - generică pentru toate tipurile
  const areSameProduct = (product1, product2) => {
    if (!product1 || !product2) return false
    
    const norm1 = normalizeText(product1)
    const norm2 = normalizeText(product2)
    
    // Dacă sunt identice după normalizare
    if (norm1 === norm2) return true
    
    // Dacă unul este gol, nu sunt același
    if (norm1.length === 0 || norm2.length === 0) return false
    
    // Normalizează tipurile de produse (TV, Info Kiosk, etc.)
    const type1 = normalizeProductType(product1)
    const type2 = normalizeProductType(product2)
    
    // Dacă tipurile de produse sunt diferite, nu sunt același produs
    if (type1 !== type2 && type1 !== '' && type2 !== '') {
      return false
    }
    
    // Extrage cuvinte cheie (branduri, modele, dimensiuni)
    const keywords1 = extractKeywords(product1)
    const keywords2 = extractKeywords(product2)
    
    // Dacă nu au cuvinte cheie, verifică similaritate directă
    if (keywords1.length === 0 && keywords2.length === 0) {
      // Verifică dacă unul conține pe celălalt (pentru texte simple)
      if (norm1.includes(norm2) || norm2.includes(norm1)) {
        const shorter = norm1.length < norm2.length ? norm1 : norm2
        const longer = norm1.length > norm2.length ? norm1 : norm2
        // Dacă textul mai scurt este cel puțin 70% din cel lung, sunt similare
        return shorter.length >= longer.length * 0.7
      }
      return false
    }
    
    // Dacă unul nu are cuvinte cheie dar celălalt da, verifică dacă textul conține cuvintele cheie
    if (keywords1.length === 0 || keywords2.length === 0) {
      const keywords = keywords1.length > 0 ? keywords1 : keywords2
      const text = keywords1.length === 0 ? norm1 : norm2
      // Verifică dacă toate cuvintele cheie semnificative (>= 3 caractere) sunt în text
      const significantKeywords = keywords.filter(k => k.length >= 3)
      if (significantKeywords.length > 0) {
        return significantKeywords.every(k => text.includes(k))
      }
      return keywords.every(k => text.includes(k))
    }
    
    // Verifică dacă au cuvinte cheie comune
    const commonKeywords = keywords1.filter(k => keywords2.includes(k))
    
    // Dacă au cel puțin un cuvânt cheie comun semnificativ (>= 3 caractere)
    const significantCommon = commonKeywords.filter(k => k.length >= 3)
    if (significantCommon.length >= 1) {
      // Verifică dacă cuvintele cheie comune reprezintă cel puțin 40% din cuvintele unice
      const allUniqueKeywords = [...new Set([...keywords1, ...keywords2])]
      if (allUniqueKeywords.length > 0) {
        const similarity = commonKeywords.length / allUniqueKeywords.length
        if (similarity >= 0.4) return true
      }
    }
    
    // Pentru produse cu un singur cuvânt cheie comun semnificativ (ex: "LG", "Samsung")
    if (significantCommon.length === 1 && significantCommon[0].length >= 3) {
      // Verifică dacă restul textului este similar
      const remaining1 = norm1.replace(new RegExp(significantCommon[0], 'g'), '').trim()
      const remaining2 = norm2.replace(new RegExp(significantCommon[0], 'g'), '').trim()
      if (remaining1.length > 0 && remaining2.length > 0) {
        const shorter = remaining1.length < remaining2.length ? remaining1 : remaining2
        const longer = remaining1.length > remaining2.length ? remaining1 : remaining2
        if (shorter.length >= longer.length * 0.5) return true
      }
    }
    
    // Verifică dacă unul conține pe celălalt după normalizare
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const shorter = norm1.length < norm2.length ? norm1 : norm2
      const longer = norm1.length > norm2.length ? norm1 : norm2
      // Dacă textul mai scurt este cel puțin 60% din cel lung, sunt similare
      if (shorter.length >= longer.length * 0.6) return true
    }
    
    // Verifică dacă toate cuvintele cheie semnificative din unul sunt în celălalt
    const significant1 = keywords1.filter(k => k.length >= 3)
    const significant2 = keywords2.filter(k => k.length >= 3)
    if (significant1.length > 0 && significant2.length > 0) {
      const allSignificant1In2 = significant1.every(k => norm2.includes(k))
      const allSignificant2In1 = significant2.every(k => norm1.includes(k))
      if (allSignificant1In2 || allSignificant2In1) return true
    }
    
    return false
  }

  // Funcție pentru grupare produse similare - mai agresivă pe categorii
  const groupSimilarProducts = (data) => {
    const grouped = []
    const processed = new Set()
    
    data.forEach((row, idx) => {
      if (processed.has(idx)) return
      
      const group = [row]
      const tip1 = row['Tip'] || ''
      const model1 = row['Model'] || ''
      const category1 = getMainCategory(tip1)
      
      // Găsește toate produsele similare
      data.forEach((otherRow, otherIdx) => {
        if (idx === otherIdx || processed.has(otherIdx)) return
        
        const tip2 = otherRow['Tip'] || ''
        const model2 = otherRow['Model'] || ''
        const category2 = getMainCategory(tip2)
        
        // Grupare mai agresivă: dacă sunt din aceeași categorie principală
        let shouldGroup = false
        
        // 1. Verifică dacă sunt din aceeași categorie principală
        if (category1 && category2 && category1 === category2 && category1 !== '') {
          // Pentru PC - grupează TOATE PC-urile împreună (PC Cyber, PC HP, RPI, etc.)
          if (category1 === 'pc') {
            shouldGroup = true
          }
          // Pentru "echipamente", grupează doar dacă tipul normalizat este același
          else if (category1 === 'echipamente') {
            const type1 = normalizeProductType(tip1)
            const type2 = normalizeProductType(tip2)
            if (type1 === type2) {
              shouldGroup = true
            }
          }
          // Pentru "scaun" - NU grupa automat! Verifică brandul/modelul
          else if (category1 === 'scaun') {
            // Extrage branduri din scaune (Milena, Sochi, VIP EGT, etc.)
            const keywords1 = extractKeywords(tip1)
            const keywords2 = extractKeywords(tip2)
            const commonKeywords = keywords1.filter(k => keywords2.includes(k))
            const significantCommon = commonKeywords.filter(k => k.length >= 3)
            
            // Grupează doar dacă au același brand (ex: ambele au "milena" sau ambele au "sochi")
            // Dar NU grupa Milena cu Sochi sau cu VIP EGT
            const brandKeywords = ['milena', 'sochi', 'soch', 'vip', 'egt']
            const hasBrand1 = brandKeywords.some(brand => keywords1.some(k => k.includes(brand)))
            const hasBrand2 = brandKeywords.some(brand => keywords2.some(k => k.includes(brand)))
            
            if (hasBrand1 && hasBrand2) {
              // Verifică dacă au același brand
              const brand1 = brandKeywords.find(brand => keywords1.some(k => k.includes(brand)))
              const brand2 = brandKeywords.find(brand => keywords2.some(k => k.includes(brand)))
              if (brand1 === brand2) {
                shouldGroup = true
              }
            } else if (significantCommon.length >= 2) {
              // Dacă au cel puțin 2 cuvinte cheie comune semnificative
              shouldGroup = true
            }
          }
          // Pentru alte categorii (tv, infokiosk, etc.), grupează direct
          else {
            shouldGroup = true
          }
        }
        
        // 2. Verifică matching exact pe Tip sau Model
        if (!shouldGroup) {
          const tipMatch = tip1 && tip2 && areSameProduct(tip1, tip2)
          const modelMatch = model1 && model2 && areSameProduct(model1, model2)
          const fullMatch = areSameProduct(`${tip1} ${model1}`, `${tip2} ${model2}`)
          
          if (tipMatch || modelMatch || fullMatch) {
            shouldGroup = true
          }
        }
        
        // 3. Verifică dacă au același brand/model chiar dacă tipul diferă puțin
        if (!shouldGroup && tip1 && tip2) {
          const keywords1 = extractKeywords(tip1)
          const keywords2 = extractKeywords(tip2)
          const commonKeywords = keywords1.filter(k => keywords2.includes(k))
          const significantCommon = commonKeywords.filter(k => k.length >= 3)
          
          // Dacă au cel puțin 2 cuvinte cheie semnificative comune și sunt din categorii similare
          if (significantCommon.length >= 2) {
            const type1 = normalizeProductType(tip1)
            const type2 = normalizeProductType(tip2)
            // Grupează dacă tipurile normalizate sunt identice sau foarte similare
            if (type1 === type2 || (type1.includes(type2) || type2.includes(type1))) {
              shouldGroup = true
            }
          }
        }
        
        if (shouldGroup) {
          group.push(otherRow)
          processed.add(otherIdx)
        }
      })
      
      if (group.length > 0) {
        processed.add(idx)
        
        // Agregă datele pentru grup
        const aggregated = { ...group[0] }
        
        // Sumă cantitățile din toate coloanele
        Object.keys(aggregated).forEach(key => {
          const keyLower = key.toLowerCase()
          if (keyLower.includes('cantitate') || keyLower.includes('quantity')) {
            let total = 0
            group.forEach(item => {
              const value = item[key]
              if (value) {
                const numValue = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                total += numValue
              }
            })
            if (total > 0) {
              aggregated[key] = `${total} BUC`
            } else {
              aggregated[key] = ''
            }
          }
        })
        
        // Folosește numele cel mai complet ca nume final
        const tips = group.map(g => g['Tip'] || '').filter(n => n)
        if (tips.length > 0) {
          // Alege numele cel mai frecvent sau cel mai descriptiv
          const tipCounts = {}
          tips.forEach(tip => {
            tipCounts[tip] = (tipCounts[tip] || 0) + 1
          })
          const mostFrequent = Object.entries(tipCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
          const longestTip = tips.reduce((a, b) => a.length > b.length ? a : b)
          // Preferă cel mai frecvent, dar dacă sunt egale, ia cel mai lung
          aggregated['Tip'] = mostFrequent && tipCounts[mostFrequent] > 1 ? mostFrequent : longestTip
        }
        
        // Agregă Model-ul - ia cel mai complet sau cel mai frecvent
        const models = group.map(g => g['Model'] || '').filter(m => m)
        if (models.length > 0) {
          const modelCounts = {}
          models.forEach(model => {
            modelCounts[model] = (modelCounts[model] || 0) + 1
          })
          const mostFrequentModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
          const longestModel = models.reduce((a, b) => a.length > b.length ? a : b)
          aggregated['Model'] = mostFrequentModel && modelCounts[mostFrequentModel] > 1 ? mostFrequentModel : longestModel
        }
        
        // Agregă Locația dacă există
        if (aggregated['Locație']) {
          const allLocations = new Set()
          group.forEach(g => {
            if (g['Locație']) {
              g['Locație'].split(', ').forEach(loc => allLocations.add(loc.trim()))
            }
          })
          aggregated['Locație'] = Array.from(allLocations).join(', ')
        }
        
        grouped.push(aggregated)
      }
    })
    
    return grouped
  }

  // Funcție pentru procesarea unui fișier Excel cu mai multe sheet-uri
  const processExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          const sheetsData = {}
          
          // Procesează fiecare sheet din workbook
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName]
            
            // Convertește la JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              defval: ''
            })
            
            // Skip dacă sheet-ul este gol
            if (jsonData.length === 0) {
              return
            }
            
            // Prima linie este header-ul
            const headers = jsonData[0].map(h => String(h || '').trim())
            const rows = jsonData.slice(1).map(row => {
              const obj = {}
              headers.forEach((header, idx) => {
                obj[header] = row[idx] || ''
              })
              // Adaugă numele sheet-ului ca locație
              obj['_location'] = sheetName
              return obj
            })
            
            // Salvează datele pentru acest sheet (folosind numele sheet-ului ca cheie)
            sheetsData[sheetName] = { headers, rows, location: sheetName }
          })
          
          resolve({ sheetsData, fileName: file.name })
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Eroare la citirea fișierului'))
      reader.readAsArrayBuffer(file)
    })
  }

  // Funcție pentru upload și procesare fișier
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Verifică dacă este Excel
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Te rog să încarci un fișier Excel (.xlsx sau .xls)')
      return
    }

    setLoading(true)
    try {
      const result = await processExcelFile(file)
      
      setUploadedFile(file)
      setSheetsData(result.sheetsData)
      
      // Afișează informații despre sheet-urile găsite
      const foundSheets = Object.keys(result.sheetsData)
      toast.success(`Fișier Excel încărcat! Găsite ${foundSheets.length} sheet-uri: ${foundSheets.join(', ')}`)
    } catch (error) {
      console.error('❌ Eroare la procesarea fișierului:', error)
      toast.error(`Eroare: ${error.message}`)
    } finally {
      setLoading(false)
      // Resetează input-ul
      event.target.value = ''
    }
  }

  // Funcție pentru centralizare date
  const centralizeData = () => {
    if (Object.keys(sheetsData).length === 0) {
      toast.error('Te rog să încarci un fișier Excel cu sheet-uri')
      return
    }

    try {
      // Găsește toate header-urile unice din toate sheet-urile
      const allHeaders = new Set()
      Object.values(sheetsData).forEach(sheetData => {
        sheetData.headers.forEach(h => allHeaders.add(h))
      })
      
      const headers = Array.from(allHeaders)
      
      // Identifică coloanele care sunt identificatori (nu se schimbă între locații)
      // De obicei: NR., Tip, Model, etc.
      const identifierHeaders = headers.slice(0, Math.min(4, headers.length))
      
      // Identifică coloanele care pot varia între locații
      // De obicei: Cantitate, Status, Note, etc.
      const variableColumnNames = ['Cantitate', 'cantitate', 'CANTITATE', 'Status', 'status', 'STATUS', 'Note', 'note', 'NOTE', 'Observatii', 'observatii']
      const variableHeaders = headers.filter(h => 
        variableColumnNames.some(v => h.includes(v)) || !identifierHeaders.includes(h)
      )
      
      // Creează un map pentru a grupa datele pe cheie unică
      const dataMap = new Map()
      
      Object.values(sheetsData).forEach(sheetData => {
        sheetData.rows.forEach(row => {
          // Creează o cheie unică bazată pe coloanele identificator
          const keyParts = []
          identifierHeaders.forEach(header => {
            const value = row[header] || ''
            keyParts.push(String(value).trim())
          })
          const key = keyParts.join('|||')
          
          if (!dataMap.has(key)) {
            // Creează intrarea cu datele de identificare
            const baseRow = {}
            identifierHeaders.forEach(header => {
              baseRow[header] = row[header] || ''
            })
            // Adaugă și coloanele variabile din prima locație găsită (ca referință)
            variableHeaders.forEach(header => {
              if (row[header] !== undefined) {
                baseRow[header] = row[header] || ''
              }
            })
            dataMap.set(key, {
              ...baseRow,
              locations: {}
            })
          }
          
          // Adaugă datele pentru această locație
          const entry = dataMap.get(key)
          entry.locations[sheetData.location] = row
        })
      })
      
      // Convertește map-ul în array
      const centralized = Array.from(dataMap.values()).map(entry => {
        const result = { ...entry }
        
        // Șterge obiectul locations din rezultat
        delete result.locations
        
        // Adaugă coloana Locație - lista locațiilor unde există acest item
        const itemLocations = Object.keys(entry.locations).filter(loc => entry.locations[loc])
        
        if (groupByLocation) {
          // Mod cu locații - afișează locațiile și coloanele cu prefix
          result['Locație'] = itemLocations.join(', ')
          
          // Verifică dacă există mai multe locații
          const hasMultipleLocations = itemLocations.length > 1
          
          // Adaugă coloanele variabile
          if (hasMultipleLocations) {
            // Pentru mai multe locații, verifică dacă valorile sunt identice
            variableHeaders.forEach(key => {
              const firstValue = entry.locations[itemLocations[0]]?.[key]
              const allSame = itemLocations.every(loc => {
                const locValue = entry.locations[loc]?.[key]
                return String(locValue || '').trim() === String(firstValue || '').trim()
              })
              
              if (allSame && firstValue) {
                // Toate valorile sunt identice - păstrează doar coloana de bază (fără prefix)
                // Nu adăuga coloane cu prefix
              } else {
                // Valorile diferă sau nu există - adaugă cu prefix pentru fiecare locație
                Object.keys(sheetsData).forEach(loc => {
                  if (entry.locations[loc]) {
                    const value = entry.locations[loc][key]
                    if (value !== undefined && value !== null && value !== '') {
                      result[`${loc}_${key}`] = value
                    }
                  }
                })
                // Șterge coloana de bază dacă valorile diferă
                if (!allSame) {
                  delete result[key]
                }
              }
            })
          } else {
            // Pentru o singură locație, păstrează valorile direct (fără prefix)
            // NU adăuga coloane cu prefix - valorile sunt deja în result[key]
            // Șterge orice coloană cu prefix care ar putea exista
            Object.keys(result).forEach(key => {
              if (itemLocations.some(loc => key.startsWith(loc + '_'))) {
                delete result[key]
              }
            })
          }
        } else {
          // Mod fără locații - centralizare pe toată firma
          // Agregă valorile din toate locațiile (sumă pentru cantități, concatenare pentru text)
          variableHeaders.forEach(key => {
            const keyLower = key.toLowerCase()
            const isQuantity = keyLower.includes('cantitate') || keyLower.includes('quantity')
            
            if (isQuantity) {
              // Pentru cantități, sumează valorile din toate locațiile
              let total = 0
              itemLocations.forEach(loc => {
                const value = entry.locations[loc]?.[key]
                if (value) {
                  const numValue = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.')) || 0
                  total += numValue
                }
              })
              result[key] = total > 0 ? `${total} BUC` : ''
            } else {
              // Pentru alte coloane, ia prima valoare non-goală sau concatenă valorile unice
              const values = new Set()
              itemLocations.forEach(loc => {
                const value = entry.locations[loc]?.[key]
                if (value && String(value).trim() !== '') {
                  values.add(String(value).trim())
                }
              })
              result[key] = Array.from(values).join('; ') || ''
            }
          })
          
          // Șterge toate coloanele cu prefix de locație
          Object.keys(result).forEach(key => {
            if (Object.keys(sheetsData).some(loc => key.startsWith(loc + '_'))) {
              delete result[key]
            }
          })
        }
        
        return result
      })
      
      // Filtrează rândurile goale - un rând este gol dacă nu are date esențiale
      const filtered = centralized.filter(row => {
        // Verifică dacă are cel puțin unul dintre: Tip, Model, sau Cantitate cu valori valide
        const hasTip = row['Tip'] && String(row['Tip']).trim() !== ''
        const hasModel = row['Model'] && String(row['Model']).trim() !== ''
        const hasCantitate = row['Cantitate'] && String(row['Cantitate']).trim() !== '' && String(row['Cantitate']).trim() !== '0'
        
        // Verifică și în coloanele cu prefix (doar dacă grupăm pe locații)
        let hasAnyCantitate = hasCantitate
        if (!hasAnyCantitate && groupByLocation) {
          Object.keys(row).forEach(key => {
            if (key.includes('_Cantitate') || key.includes('_cantitate')) {
              const val = String(row[key] || '').trim()
              if (val !== '' && val !== '0') {
                hasAnyCantitate = true
              }
            }
          })
        }
        
        // Rândul este valid dacă are cel puțin Tip SAU Model SAU Cantitate
        return hasTip || hasModel || hasAnyCantitate
      })
      
      // Grupează produse similare (dacă este activat)
      const finalData = groupSimilarProducts(filtered)
      
      setCentralizedData(finalData)
      const groupedCount = filtered.length - finalData.length
      toast.success(
        `Date centralizate: ${finalData.length} înregistrări ` +
        `(${filtered.length} înainte de grupare, ${groupedCount} produse similare grupate) ` +
        `din ${Object.keys(sheetsData).length} locații ` +
        `(${centralized.length - filtered.length} rânduri goale eliminate)`
      )
    } catch (error) {
      console.error('❌ Eroare la centralizare:', error)
      toast.error(`Eroare: ${error.message}`)
    }
  }

  // Funcție pentru export Excel centralizat
  const exportCentralizedData = () => {
    if (centralizedData.length === 0) {
      toast.error('Nu există date de exportat')
      return
    }

    try {
      // Creează header-uri pentru export - ordonăm pentru a avea Locație la început
      const allKeys = new Set()
      centralizedData.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key !== 'locations') {
            allKeys.add(key)
          }
        })
      })
      
      const headers = Array.from(allKeys)
      // Mută coloana "Locație" la început dacă există
      if (headers.includes('Locație')) {
        headers.splice(headers.indexOf('Locație'), 1)
        headers.unshift('Locație')
      }
      
      const wsData = [headers]
      
      centralizedData.forEach(row => {
        const rowData = headers.map(header => {
          const value = row[header]
          // Dacă este obiect, convertește la string
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value)
          }
          return value || ''
        })
        wsData.push(rowData)
      })
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      // Setează lățimea coloanelor
      const colWidths = headers.map(() => ({ wch: 15 }))
      ws['!cols'] = colWidths
      
      XLSX.utils.book_append_sheet(wb, ws, 'Inventar Centralizat')
      XLSX.writeFile(wb, `Inventar_Centralizat_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Export Excel realizat cu succes!')
    } catch (error) {
      console.error('❌ Eroare la export:', error)
      toast.error(`Eroare: ${error.message}`)
    }
  }

  // Funcție pentru salvare în warehouse
  const saveToWarehouse = async () => {
    if (centralizedData.length === 0) {
      toast.error('Nu există date de salvat')
      return
    }

    setLoading(true)
    try {
      // Transformă datele centralizate în format warehouse
      const warehouseItems = []
      
      centralizedData.forEach(row => {
        // Extrage locațiile
        const locations = row['Locație'] ? row['Locație'].split(', ').map(l => l.trim()) : []
        
        // Pentru fiecare locație, creează un item
        locations.forEach(location => {
          // Găsește coloanele de bază
          const identifierHeaders = Object.keys(row).filter(k => 
            !k.startsWith(location + '_') && 
            k !== 'Locație' && 
            k !== 'locations' &&
            !Object.keys(sheetsData).some(loc => k.startsWith(loc + '_'))
          )
          
          // Construiește item-ul warehouse
          const item = {
            serial_number: row['NR.'] || row['Nr.'] || row['Serial Number'] || '',
            provider: row['Provider'] || row['Furnizor'] || '',
            location: location || 'Depozit',
            cabinet: row['Cabinet'] || row['Cabinet ID'] || '',
            game_mix: row['Tip'] || row['Game Mix'] || row['Game'] || '',
            status: 'Active',
            notes: JSON.stringify({
              model: row['Model'] || '',
              cantitate: row[`${location}_Cantitate`] || row['Cantitate'] || '',
              ...Object.fromEntries(
                identifierHeaders.map(h => [h, row[h]])
              )
            })
          }
          
          warehouseItems.push(item)
        })
      })

      // Trimite la backend pentru salvare bulk
      const response = await axios.post('/api/warehouse/bulk', { items: warehouseItems })
      
      toast.success(`✅ ${response.data.saved || warehouseItems.length} articole salvate în inventar!`)
      
      // Reîncarcă datele din warehouse pentru a vedea modificările
      // (opțional - poate fi adăugat dacă există un context pentru warehouse)
      
    } catch (error) {
      console.error('❌ Eroare la salvare în warehouse:', error)
      toast.error(`Eroare: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Funcție pentru ștergere fișier
  const removeFile = () => {
    setUploadedFile(null)
    setSheetsData({})
    setCentralizedData([])
    toast.success('Fișier șters')
  }

  if (!user) {
    return <Layout><div>Se încarcă...</div></Layout>
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            <Package className="w-8 h-8 mr-3 text-emerald-500" />
            Inventar Centralizator
          </h1>
          {centralizedData.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={saveToWarehouse}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-4 h-4" />
                <span>{loading ? 'Se salvează...' : 'Salvează în Inventar'}</span>
              </button>
              <button
                onClick={exportCentralizedData}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Încarcă Fișier Excel cu Sheet-uri pe Locații
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Încarcă un singur fișier Excel care conține mai multe sheet-uri, fiecare cu numele locației (ex: "Craiova", "Pitesti", etc.)
          </p>
          
          {!uploadedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Click pentru upload Excel</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Acceptă .xlsx și .xls</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{uploadedFile.name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {Object.keys(sheetsData).length} sheet-uri găsite
                    </div>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="text-red-500 hover:text-red-700 p-2"
                  title="Șterge fișier"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Lista sheet-urilor găsite */}
              {Object.keys(sheetsData).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(sheetsData).map(([sheetName, sheetData]) => (
                    <div key={sheetName} className="border border-slate-300 dark:border-slate-600 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{sheetName}</span>
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {sheetData.rows.length} înregistrări
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {sheetData.headers.length} coloane
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByLocation}
                    onChange={(e) => setGroupByLocation(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Grupează pe locații (dacă este debifat, centralizează pe toată firma)
                  </span>
                </label>
                <button
                  onClick={centralizeData}
                  disabled={loading || Object.keys(sheetsData).length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Se procesează...' : 'Centralizează Datele'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Centralized Table */}
        {centralizedData.length > 0 && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Tabel Centralizat ({centralizedData.length} înregistrări)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    {(() => {
                      const keys = Object.keys(centralizedData[0] || {}).filter(key => key !== 'locations')
                      // Mută "Locație" la început dacă există și dacă grupăm pe locații
                      if (groupByLocation && keys.includes('Locație')) {
                        keys.splice(keys.indexOf('Locație'), 1)
                        keys.unshift('Locație')
                      } else if (!groupByLocation && keys.includes('Locație')) {
                        // Șterge coloana Locație dacă nu grupăm pe locații
                        keys.splice(keys.indexOf('Locație'), 1)
                      }
                      return keys.map((key, idx) => (
                        <th
                          key={idx}
                          className="py-2 px-3 text-left font-semibold text-slate-700 dark:text-slate-300"
                        >
                          {key}
                        </th>
                      ))
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {centralizedData.map((row, rowIdx) => {
                    const keys = Object.keys(row).filter(key => key !== 'locations')
                    // Mută "Locație" la început dacă există și dacă grupăm pe locații
                    if (groupByLocation && keys.includes('Locație')) {
                      keys.splice(keys.indexOf('Locație'), 1)
                      keys.unshift('Locație')
                    } else if (!groupByLocation && keys.includes('Locație')) {
                      // Șterge coloana Locație dacă nu grupăm pe locații
                      keys.splice(keys.indexOf('Locație'), 1)
                    }
                    return (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''}
                      >
                        {keys.map((key, colIdx) => {
                          const value = row[key]
                          return (
                            <td
                              key={colIdx}
                              className="py-2 px-3 text-slate-900 dark:text-slate-100"
                            >
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value)
                                : String(value || '')}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default InventoryCentralizer

