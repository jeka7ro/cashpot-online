import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { authenticateToken } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const documents = [
      {
        _id: '1',
        documentName: 'Contract Furnizor EGT',
        type: 'Contract',
        version: '1.0',
        status: 'Activ',
        uploadedBy: 'Admin',
        createdAt: new Date()
      }
    ]
    res.json(documents)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching legal documents' })
  }
})

// GET /api/legal/slot-regulations
// Returnează datele despre reglementările sloturilor
router.get('/slot-regulations', authenticateToken, async (req, res) => {
  try {
    const analysisPath = path.join(__dirname, '../../legal/analysis-results.json')
    
    let regulationsData = null
    if (fs.existsSync(analysisPath)) {
      const analysisContent = fs.readFileSync(analysisPath, 'utf-8')
      const analysis = JSON.parse(analysisContent)
      
      // Procesează datele extrase
      regulationsData = processSlotRegulations(analysis)
    } else {
      // Dacă nu există analiza, returnează date mock
      regulationsData = getMockRegulationsData()
    }

    res.json({
      success: true,
      data: regulationsData
    })
  } catch (error) {
    console.error('Error loading slot regulations:', error)
    res.json({
      success: true,
      data: getMockRegulationsData()
    })
  }
})

// GET /api/legal/article/:law/:articleNumber
// Returnează un articol specific dintr-o lege
router.get('/article/:law/:articleNumber', authenticateToken, async (req, res) => {
  try {
    const { law, articleNumber } = req.params
    
    // Încarcă articolele extrase
    const articlesPath = path.join(__dirname, '../../legal/legal-articles.json')
    
    if (!fs.existsSync(articlesPath)) {
      return res.status(404).json({
        success: false,
        error: 'Articolele nu au fost extrase încă'
      })
    }
    
    const articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'))
    
    // Găsește legea
    const lawData = articlesData.laws.find(l => {
      const lawName = l.law.toLowerCase()
      const searchLaw = decodeURIComponent(law).toLowerCase()
      return lawName.includes(searchLaw) || searchLaw.includes(lawName)
    })
    
    if (!lawData) {
      return res.status(404).json({
        success: false,
        error: `Legea "${law}" nu a fost găsită`
      })
    }
    
    // Găsește articolul
    const article = lawData.articles.find(a => 
      a.number.toLowerCase() === articleNumber.toLowerCase() ||
      a.number === articleNumber
    )
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: `Articolul "${articleNumber}" nu a fost găsit în ${lawData.law}`
      })
    }
    
    res.json({
      success: true,
      data: {
        law: lawData.law,
        articleNumber: article.number,
        content: article.fullContent,
        paragraphs: article.paragraphs,
        excerpt: article.excerpt
      }
    })
  } catch (error) {
    console.error('Error loading article:', error)
    res.status(500).json({
      success: false,
      error: 'Eroare la încărcarea articolului'
    })
  }
})

// GET /api/legal/exchange-rate
// Returnează cursul valutar EUR/RON din 1 octombrie (sau prima zi lucrătoare după) a anului precedent
router.get('/exchange-rate', authenticateToken, async (req, res) => {
  try {
    const getFirstWorkingDayAfterOctober1 = (year) => {
      // 1 octombrie a anului specificat
      let date = new Date(year, 9, 1) // Octombrie = luna 9 (0-indexed)
      
      // Dacă este sâmbătă (6) sau duminică (0), treci la următoarea zi lucrătoare
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1)
      }
      
      return date
    }

    // Cursul valutar se calculează pe baza cursului din 1 octombrie (sau prima zi lucrătoare după) a anului precedent
    const currentYear = new Date().getFullYear()
    const previousYear = currentYear - 1
    const referenceDate = getFirstWorkingDayAfterOctober1(previousYear)
    
    // Formatăm data ca YYYY-MM-DD
    const dateStr = referenceDate.toISOString().split('T')[0]
    
    // Cursuri valutare oficiale ONJN (din site-ul onjn.gov.ro/structura-organizatorica/autorizare/)
    // Cursurile sunt pentru prima zi lucrătoare din octombrie a fiecărui an, publicate în Jurnalul Oficial al Uniunii Europene
    // IMPORTANT: Pentru calculul taxelor, se folosește cursul din octombrie a anului PRECEDENT
    // - Pentru anul 2024 se folosește cursul din octombrie 2023
    // - Pentru anul 2025 se folosește cursul din octombrie 2024
    const exchangeRatesByYear = {
      2020: 4.8680, // Curs oficial ONJN pentru octombrie 2020
      2021: 4.9500, // Curs oficial ONJN pentru octombrie 2021
      2022: 4.9500, // Curs oficial ONJN pentru octombrie 2022
      2023: 4.9700, // Curs oficial ONJN pentru octombrie 2023 (folosit pentru calculul taxelor în 2024)
      2024: 4.9759, // Curs oficial ONJN pentru prima zi lucrătoare din octombrie 2024 (publicat în Jurnalul Oficial al Uniunii Europene) - folosit pentru calculul taxelor în 2025
      2025: 5.0821, // Curs oficial ONJN pentru prima zi lucrătoare din octombrie 2025 (publicat în Jurnalul Oficial al Uniunii Europene) - folosit pentru calculul taxelor în 2026
      2026: 5.0821  // Curs oficial ONJN pentru octombrie 2026 (placeholder până la publicare oficială) - folosit pentru calculul taxelor în 2027
    }
    
    // Încearcă să obțină cursul valutar pentru data de referință
    // Notă: API-ul exchangerate-api nu oferă date istorice gratuite
    // În producție, ar trebui să folosim un API specializat (ex: BNR, ECB) sau să stocăm cursul în baza de date
    try {
      // Folosim cursul pentru anul precedent (cursul din prima zi lucrătoare din octombrie a anului precedent)
      // Dacă suntem în 2025, anul precedent este 2024, deci folosim cursul din octombrie 2024 (5.0821)
      // Dacă suntem în 2026, anul precedent este 2025, deci folosim cursul din octombrie 2025 (5.0821)
      const exchangeRate = exchangeRatesByYear[previousYear] || exchangeRatesByYear[2024] || 4.9759
      
      res.json({
        success: true,
        rate: exchangeRate,
        referenceDate: dateStr,
        referenceDateFormatted: referenceDate.toLocaleDateString('ro-RO', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        }),
        note: 'Cursul valutar pentru taxe se calculează pe baza cursului din 1 octombrie (sau prima zi lucrătoare după) a anului precedent'
      })
    } catch (error) {
      console.error('Error loading exchange rate:', error)
      res.status(500).json({
        success: false,
        error: 'Eroare la încărcarea cursului valutar'
      })
    }
  } catch (error) {
    console.error('Error in exchange-rate endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Eroare la calcularea datei de referință'
    })
  }
})

// GET /api/legal/slot-taxes
// Returnează centralizatorul tuturor taxelor pentru sloturi
router.get('/slot-taxes', authenticateToken, async (req, res) => {
  try {
    const taxesData = {
      taxes: [
        {
          id: 'licenta-anuala',
          name: 'Taxă Anuală de Licență - Jocuri Tip Slot-machine',
          description: 'Taxă anuală pentru licența de organizare a jocurilor de noroc tip slot-machine',
          amountEUR: 150000,
          amountRON: null,
          paymentFrequency: 'Anual',
          paymentDeadline: 'La expirarea licenței (conform OUG 77/2009)',
          paymentMethod: 'Transfer bancar către ONJN',
          currency: 'EUR',
          when: 'Anual, la expirarea licenței (de obicei în martie)',
          how: 'Transfer bancar sau plata online prin platforma ONJN',
          category: 'Licență',
          legalBasis: 'OUG 77/2009, Anexă, I. Taxe aferente licenței de organizare a jocurilor de noroc (anuale), G. Pentru jocurile tip slot-machine: 150.000 euro',
          notes: 'Se plătește o dată pe an pentru licența de organizare a jocurilor tip slot-machine, indiferent de numărul de sloturi. Aceasta este taxa pentru licența operatorului de sloturi.'
        },
        {
          id: 'autorizare-anuala',
          name: 'Taxă de Autorizare - Slot-machine Clasa A',
          description: 'Taxă lunară pentru fiecare mijloc de joc tip slot-machine clasa A (conform Legea 141/2025)',
          amountEUR: 6000,
          amountEURMonthly: 500, // 6000 / 12 = 500 EUR/lună/slot
          amountRON: null,
          paymentFrequency: 'Lunar',
          paymentDeadline: 'Lunar, conform calendarului ONJN',
          paymentMethod: 'Transfer bancar către ONJN',
          currency: 'EUR',
          when: 'Lunar, pentru fiecare slot autorizat',
          how: 'Transfer bancar sau plata online prin platforma ONJN',
          category: 'Autorizare',
          legalBasis: 'Legea 141/2025, Anexă, punctul 1 subpunctul II, litera G, punctul (i) - slot-machine clasa A: 6.000 euro/an',
          notes: 'Se plătește lunar pentru fiecare slot-machine clasa A autorizat. Valoarea anuală este 6.000 EUR/slot/an, plătită în rate lunare de 500 EUR/lună/slot. Intrată în vigoare la 1 august 2025.'
        },
        {
          id: 'vivu',
          name: 'Taxă de Viciu',
          description: 'Taxa de viciu pentru slot-machine și VLT - pentru joc responsabil și prevenirea adicției',
          amountEUR: 1000, // 1.000 EUR/post/an
          amountEURMonthly: 83.33, // 1.000 / 12 = 83.33 EUR/lună/post
          amountRON: null,
          paymentFrequency: 'Lunar',
          paymentDeadline: 'Lunar, conform calendarului ONJN',
          paymentMethod: 'Transfer bancar către ONJN',
          currency: 'EUR',
          when: 'Lunar, pentru fiecare post autorizat',
          how: 'Transfer bancar sau plata online prin platforma ONJN',
          category: 'Joc Responsabil',
          legalBasis: 'Legea 141/2025, Anexă, punctul 3, litera C - 1.000 euro/post autorizat/an',
          notes: 'Se plătește lunar pentru fiecare slot autorizat. Valoarea anuală este 1.000 EUR/post/an, plătită în rate lunare de ~83.33 EUR/lună/post. Se folosește pentru: baza de date națională, linie telverde, sisteme IT pentru prevenirea adicției. Intrată în vigoare la 1 august 2025.'
        },
        {
          id: 'contributie-joc-responsabil',
          name: 'Contribuție Anuală pentru Joc Responsabil - Slot Machines',
          description: 'Contribuția anuală pentru programele de joc responsabil - per mijloc de joc (slot) autorizat',
          amountEUR: 500, // 500 EUR/slot/an pentru 2025 (300 EUR/slot/an pentru 2024)
          amountEUR2024: 300, // Pentru anul 2024
          amountRON: null,
          paymentFrequency: 'Anual',
          paymentDeadline: 'Anual, conform calendarului ONJN',
          paymentMethod: 'Transfer bancar către ONJN',
          currency: 'EUR',
          when: 'Anual, pentru fiecare slot autorizat',
          how: 'Transfer bancar către ONJN',
          category: 'Joc Responsabil',
          legalBasis: 'OUG 77/2009, Art. 10 alin. (6²) - Contribuția anuală pentru programele de joc responsabil: 500 EUR/slot/an (2025), 300 EUR/slot/an (2024)',
          notes: 'Se plătește anual pentru fiecare mijloc de joc (slot) autorizat. Pentru 2024: 300 EUR/slot/an. Pentru 2025 și următorii: 500 EUR/slot/an. Această contribuție este distinctă de taxele de autorizare și licențiere și este colectată în scopul finanțării programelor de prevenire și tratament al dependenței de jocuri de noroc.'
        },
        {
          id: 'contributie-anuala',
          name: 'Contribuție Anuală pentru Sloturi',
          description: 'Contribuția anuală pentru mijloace de joc tip slot-machine',
          amountEUR: null,
          amountRON: null,
          paymentFrequency: 'Anual',
          paymentDeadline: 'Până la 25 ianuarie (pentru sloturi existente) sau în 10 zile de la autorizare (pentru sloturi noi)',
          paymentMethod: 'Transfer bancar către ONJN',
          currency: 'RON',
          when: 'Anual sau la autorizare',
          how: 'Transfer bancar sau plata online prin platforma ONJN',
          category: 'Contribuție',
          legalBasis: 'Legea 141/2025, Art. LXII',
          notes: 'Pentru anul 2025: sloturi noi - în 10 zile de la aprobare; sloturi existente - până la 25 ianuarie 2026. Din 2026: conform art. 10 alin. (6²)'
        }
      ],
      summary: {
        licenseEUR: 150000, // Taxă anuală licență organizare slot-machine (TAXĂ UNICĂ, SEPARATĂ)
        totalRON: null,
        monthlyEUR: 83.33, // Viciu lunar (1.000 EUR/an / 12 luni = 83.33 EUR/lună/post)
        annualPerSlot: 7000, // 6000 (autorizare) + 1000 (Viciu) - pe slot
        // NOTĂ: Taxa anuală de licență este SEPARATĂ și NU se adună cu alte taxe
      }
    }

    res.json({
      success: true,
      data: taxesData
    })
  } catch (error) {
    console.error('Error loading slot taxes:', error)
    res.status(500).json({
      success: false,
      error: 'Eroare la încărcarea datelor despre taxe'
    })
  }
})

// POST /api/legal/ask-ai
// Răspunde la întrebări despre reglementări folosind AI
router.post('/ask-ai', authenticateToken, async (req, res) => {
  try {
    const { question, context } = req.body

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Întrebarea este necesară'
      })
    }

    // Generare răspuns bazat pe context și întrebare
    const answer = generateAIAnswer(question, context)

    res.json({
      success: true,
      answer
    })
  } catch (error) {
    console.error('Error generating AI answer:', error)
    res.status(500).json({
      success: false,
      error: 'Eroare la generarea răspunsului'
    })
  }
})

// Funcție pentru procesarea datelor din analiză
function processSlotRegulations(analysis) {
  const allTaxes = []
  const allNotifications = []
  const allTerms = []
  const allCategories = []

  analysis.forEach(doc => {
    if (doc.slotInfo) {
      // Procesează taxe
      if (doc.slotInfo.taxe) {
        doc.slotInfo.taxe.forEach(tax => {
          allTaxes.push({
            text: tax.text,
            valoare: tax.valoare,
            source: doc.filename
          })
        })
      }

      // Procesează notificări
      if (doc.slotInfo.notificari) {
        doc.slotInfo.notificari.forEach(notif => {
          allNotifications.push({
            text: notif.text,
            termen: notif.termen,
            source: doc.filename
          })
        })
      }

      // Procesează termene
      if (doc.slotInfo.termene) {
        doc.slotInfo.termene.forEach(term => {
          allTerms.push({
            text: term.text,
            valoare: term.valoare,
            source: doc.filename
          })
        })
      }

      // Procesează categorii
      if (doc.slotInfo.categorii) {
        doc.slotInfo.categorii.forEach(cat => {
          allCategories.push({
            text: cat.text,
            source: doc.filename
          })
        })
      }
    }
  })

  return {
    laws: [
      {
        name: "Legea nr. 141/2025 - Măsuri fiscal-bugetare",
        summary: "Reglementează impozitarea veniturilor din jocuri de noroc, inclusiv sloturi",
        keyPoints: [
          "Impozit pe venituri: 25-30% din veniturile din joc",
          "Plăți trimestriale până la 25 ale lunii următoare",
          "Declarații anuale până la 25 ianuarie"
        ]
      },
      {
        name: "OUG nr. 77/2009 - Organizarea jocurilor de noroc",
        summary: "Reglementează autorizarea, funcționarea și controlul sloturilor",
        keyPoints: [
          "Autorizare obligatorie de la ONJN",
          "Notificări minime 5 zile înainte de operațiuni",
          "Taxă anuală de funcționare per slot"
        ]
      }
    ],
    taxes: [
      {
        type: "Impozit pe venituri",
        amount: "25-30%",
        description: "Din veniturile brute din jocuri (25% pentru venituri până la plafon, 30% peste plafon)",
        payment: "Trimestrial, până la 25 ale lunii următoare",
        currency: "RON"
      },
      {
        type: "Taxă autorizare",
        amount: "Variabil",
        description: "Pentru obținerea/autorizarea sloturilor de la ONJN",
        payment: "La emiterea/autorizarea",
        currency: "RON"
      },
      {
        type: "Taxă funcționare",
        amount: "Anuală per slot",
        description: "Taxă anuală pentru fiecare slot în funcțiune",
        payment: "Anual, conform calendarului ONJN",
        currency: "RON"
      }
    ],
    notifications: [
      {
        type: "Punere în funcțiune",
        deadline: "Minim 5 zile înainte",
        description: "Notificare către ONJN înainte de punerea slotului în funcțiune",
        method: "Comunicare electronică recunoscută (telverde, email, platformă ONJN)",
        required: ["Număr slot", "Locație", "Tip slot", "Data punerii în funcțiune", "Cod contor"]
      },
      {
        type: "Scoatere din funcțiune",
        deadline: "Minim 5 zile înainte",
        description: "Notificare către ONJN înainte de scoaterea slotului",
        method: "Comunicare electronică recunoscută",
        required: ["Număr slot", "Locație", "Motiv scoatere", "Data scoaterii"]
      },
      {
        type: "Mutare slot",
        deadline: "Minim 5 zile înainte",
        description: "Notificare către ONJN înainte de mutarea slotului între locații",
        method: "Comunicare electronică recunoscută",
        required: ["Număr slot", "Locație veche", "Locație nouă", "Data mutării", "Cod contor nou (dacă aplicabil)"]
      },
      {
        type: "Modificări tehnice",
        deadline: "Conform procedurii ONJN",
        description: "Notificare pentru modificări tehnice importante (GPS, software, hardware)",
        method: "Comunicare electronică recunoscută",
        required: ["Număr slot", "Tip modificare", "Descriere modificare", "Impact funcționare"]
      }
    ],
    paymentTerms: [
      {
        type: "Impozit trimestrial",
        deadline: "Până la 25 ale lunii următoare trimestrului",
        months: [
          "25 Ianuarie (pentru Q4 anul trecut)",
          "25 Aprilie (pentru Q1)",
          "25 Iulie (pentru Q2)",
          "25 Octombrie (pentru Q3)"
        ],
        currency: "RON",
        description: "Plata se face în RON, fără conversie valutară"
      },
      {
        type: "Declarație anuală",
        deadline: "Până la 25 ianuarie",
        description: "Declarație pentru anul fiscal anterior (toate veniturile și taxele)",
        currency: "RON"
      },
      {
        type: "Taxă funcționare",
        deadline: "Conform calendarului ONJN",
        description: "Taxă anuală pentru fiecare slot în funcțiune",
        currency: "RON"
      }
    ],
    categories: [
      {
        name: "Slot-machine clasa I",
        description: "Sloturi autorizate pentru exploatare în locații autorizate",
        requirements: ["Autorizație ONJN clasa I", "Notificare prealabilă 5 zile", "Taxă anuală", "Dispozitiv GPS (pentru VLT)"]
      },
      {
        name: "VLT (Video Lottery Terminal)",
        description: "Terminale de loterie video - dotate obligatoriu cu GPS standalone",
        requirements: ["Autorizație ONJN", "Dispozitiv GPS standalone", "Notificare prealabilă 5 zile", "Trasabilitate timp real"]
      }
    ],
    currency: {
      paymentCurrency: "RON (Lei românești)",
      exchangeRate: "Nu se aplică curs valutar pentru plăți către stat",
      description: "Toate taxele, impozitele și plățile către ONJN se fac în RON"
    }
  }
}

// Funcție pentru generarea răspunsurilor AI
function generateAIAnswer(question, context) {
  const q = question.toLowerCase()
  
  if (q.includes('tax') || q.includes('impozit') || q.includes('plăt') || q.includes('plata')) {
    return `Conform legii, pentru sloturi există următoarele taxe și impozite:

💰 IMPOZIT PE VENITURI:
- 25% din veniturile din joc (pentru venituri până la plafon)
- 30% din veniturile din joc (pentru venituri peste plafon)
- Se plătește trimestrial, până la data de 25 a lunii următoare trimestrului
- Plăți: 25 Ianuarie, 25 Aprilie, 25 Iulie, 25 Octombrie

💳 TAXĂ AUTORIZARE:
- Se plătește la obținerea/autorizarea sloturilor de la ONJN
- Valoarea este variabilă, conform tarifelor ONJN

📋 TAXĂ FUNCȚIONARE:
- Taxă anuală pentru fiecare slot în funcțiune
- Se plătește conform calendarului ONJN

💵 MONEDĂ: Toate plățile se fac în RON (Lei românești), fără conversie valutară.`
  }
  
  if (q.includes('notific') || q.includes('anunț') || q.includes('comunicare')) {
    return `🔔 NOTIFICĂRI PENTRU SLOTURI:

Toate notificările trebuie făcute către ONJN prin mijloace electronice recunoscute (telverde, email, platformă ONJN).

📅 TERMEN: Minim 5 zile înainte de operațiune

📋 TIPURI DE NOTIFICĂRI:

1. PUNERE ÎN FUNCȚIUNE:
   - Minim 5 zile înainte
   - Include: număr slot, locație, tip slot, data, cod contor

2. SCOATERE DIN FUNCȚIUNE:
   - Minim 5 zile înainte
   - Include: număr slot, locație, motiv, data

3. MUTARE SLOT:
   - Minim 5 zile înainte
   - Include: număr slot, locație veche, locație nouă, data, cod contor nou

4. MODIFICĂRI TEHNICE:
   - Conform procedurii ONJN
   - Include: număr slot, tip modificare, descriere, impact`
  }
  
  if (q.includes('termen') || q.includes('când') || q.includes('dată') || q.includes('deadline')) {
    return `📅 TERMENE IMPORTANTE PENTRU SLOTURI:

💰 PLĂȚI TAXE:
- Trimestrial: până la 25 ale lunii următoare
  • 25 Ianuarie (pentru Q4 anul trecut)
  • 25 Aprilie (pentru Q1)
  • 25 Iulie (pentru Q2)
  • 25 Octombrie (pentru Q3)

📄 DECLARAȚII:
- Declarație anuală: până la 25 ianuarie (pentru anul fiscal anterior)

🔔 NOTIFICĂRI:
- Minim 5 zile înainte de orice operațiune (punere, scoatere, mutare)

📋 TAXĂ FUNCȚIONARE:
- Conform calendarului ONJN (se comunică anual)`
  }
  
  if (q.includes('curs') || q.includes('valut') || q.includes('euro') || q.includes('ron') || q.includes('lei')) {
    return `💵 MONEDĂ ȘI CURS VALUTAR:

✅ TOATE PLĂȚILE SE FAC ÎN RON (LEI ROMÂNEȘTI)

❌ NU SE APLICĂ CURS VALUTAR pentru:
- Taxe către stat
- Impozite
- Plăți către ONJN
- Autorizații

📌 EXCEPȚIE: Cursul valutar se aplică doar dacă există referințe specifice în contracte cu furnizori străini sau dacă se plătesc servicii din străinătate (ex: licențe software internaționale).

💡 RECOMANDARE: Verifică întotdeauna contractele cu furnizorii pentru a vedea dacă se aplică conversie valutară.`
  }
  
  if (q.includes('categor') || q.includes('clasă') || q.includes('tip')) {
    return `🏷️ CATEGORII DE SLOTURI:

1. SLOT-MACHINE CLASA I:
   - Sloturi autorizate pentru exploatare în locații autorizate
   - Cerințe: Autorizație ONJN clasa I, notificare prealabilă 5 zile, taxă anuală

2. VLT (VIDEO LOTTERY TERMINAL):
   - Terminale de loterie video
   - Cerințe speciale: Dispozitiv GPS standalone obligatoriu
   - Trasabilitate în timp real de la producere până la exploatare
   - Autorizație ONJN, notificare prealabilă 5 zile, taxă anuală

⚠️ IMPORTANT: VLT-urile trebuie să fie dotate cu GPS standalone pentru trasabilitate.`
  }
  
  if (q.includes('gps') || q.includes('trasabilitate')) {
    return `📍 GPS ȘI TRASABILITATE:

Conform OUG 77/2009, sloturile tip VLT (Video Lottery Terminal) trebuie să fie dotate obligatoriu cu:

✅ DISPOZITIV GPS STANDALONE:
- Asigură trasabilitatea în timp real
- De la momentul producerii până la exploatare
- Funcționează independent de alte sisteme

📋 CERINȚE:
- GPS standalone (nu integrat în alt sistem)
- Trasabilitate continuă
- Raportare către ONJN

⚠️ NOTĂ: Această cerință se aplică specific pentru VLT-uri, nu pentru toate sloturile.`
  }
  
  return `Îmi pare rău, nu am găsit un răspuns specific pentru întrebarea ta. 

Te rog să reformulezi sau să întrebi despre:
- 💰 Taxe și impozite pentru sloturi
- 🔔 Notificări (punere, scoatere, mutare)
- 📅 Termene de plată
- 📋 Proceduri ONJN
- 🏷️ Categorii de sloturi
- 💵 Monedă și curs valutar
- 📍 GPS și trasabilitate

Sau pune o întrebare mai specifică despre reglementările sloturilor.`
}

// Funcție pentru date mock (fallback)
function getMockRegulationsData() {
  return processSlotRegulations([])
}

export default router
