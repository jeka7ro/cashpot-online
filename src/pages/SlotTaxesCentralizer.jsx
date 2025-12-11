import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useTheme } from '../contexts/ThemeContext'
import { DollarSign, Calendar, Euro, FileText, Info, AlertCircle, CheckCircle, Clock, CreditCard, Building2, ExternalLink, Download, Eye } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const SlotTaxesCentralizer = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(true)
  const [taxesData, setTaxesData] = useState(null)
  const [exchangeRate, setExchangeRate] = useState(null)
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null)
  const [exchangeRates, setExchangeRates] = useState({ 2024: null, 2025: null, 2026: null })
  const [slotsByMonth, setSlotsByMonth] = useState(null)
  const [selectedYear, setSelectedYear] = useState(2026) // Anul selectat pentru calendar

  const getFirstWorkingDayAfterOctober1 = (year) => {
    // 1 octombrie a anului specificat
    let date = new Date(year, 9, 1) // Octombrie = luna 9 (0-indexed)
    
    // Dacă este sâmbătă (6) sau duminică (0), treci la următoarea zi lucrătoare
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1)
    }
    
    return date
  }

  useEffect(() => {
    loadTaxesData()
    loadExchangeRate()
    loadSlotsByMonth()
  }, [])

  const loadSlotsByMonth = async () => {
    try {
      const response = await axios.get('/api/incasari/slots-by-month-location')
      if (response.data?.success) {
        setSlotsByMonth(response.data)
      }
    } catch (error) {
      console.error('Eroare la încărcarea sloturilor pe lună:', error)
    }
  }

  const loadTaxesData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/legal/slot-taxes')
      if (response.data?.success) {
        setTaxesData(response.data.data)
      } else {
        setTaxesData(getMockTaxesData())
      }
    } catch (error) {
      console.error('Eroare la încărcare:', error)
      setTaxesData(getMockTaxesData())
    } finally {
      setLoading(false)
    }
  }

  const loadExchangeRate = async () => {
    try {
      // Cursul valutar se calculează pe baza cursului din 1 octombrie (sau prima zi lucrătoare după) a anului precedent
      // Folosim endpoint-ul backend care va gestiona logica de obținere a cursului
      const response = await axios.get('/api/legal/exchange-rate')
      if (response.data?.success && response.data?.rate) {
        setExchangeRate(response.data.rate)
        setExchangeRateInfo({
          referenceDate: response.data.referenceDateFormatted || response.data.referenceDate,
          note: response.data.note
        })
        // Setează toate cursurile pentru afișare (chiar dacă API-ul returnează doar unul)
        // Pentru 2024: cursul din octombrie 2023
        // Pentru 2025: cursul din octombrie 2024
        // Pentru 2026: cursul din octombrie 2025
        setExchangeRates({
          2024: 4.9700, // Curs din octombrie 2023 pentru calculul taxelor în 2024
          2025: 4.9759, // Curs din octombrie 2024 pentru calculul taxelor în 2025
          2026: 5.0821  // Curs din octombrie 2025 pentru calculul taxelor în 2026
        })
      } else {
        // Fallback: folosim cursul aproximativ pentru 1 octombrie 2024
        const currentYear = new Date().getFullYear()
        const previousYear = currentYear - 1
        const refDate = new Date(previousYear, 9, 1)
        while (refDate.getDay() === 0 || refDate.getDay() === 6) {
          refDate.setDate(refDate.getDate() + 1)
        }
        // Folosim cursul pentru anul precedent din lista oficială ONJN
        // IMPORTANT: Pentru calculul taxelor, se folosește cursul din octombrie a anului PRECEDENT
        // - Pentru anul 2024 se folosește cursul din octombrie 2023 (4.9700)
        // - Pentru anul 2025 se folosește cursul din octombrie 2024 (4.9759)
        // - Pentru anul 2026 se folosește cursul din octombrie 2025 (5.0821)
        const exchangeRatesByYear = {
          2020: 4.8680,
          2021: 4.9500,
          2022: 4.9500,
          2023: 4.9700, // Curs pentru octombrie 2023 (folosit pentru calculul taxelor în 2024)
          2024: 4.9759, // Curs pentru octombrie 2024 (publicat în Jurnalul Oficial al Uniunii Europene) - folosit pentru calculul taxelor în 2025
          2025: 5.0821, // Curs pentru octombrie 2025 (publicat în Jurnalul Oficial al Uniunii Europene) - folosit pentru calculul taxelor în 2026
          2026: 5.0821  // Curs pentru octombrie 2026 (folosit pentru calculul taxelor în 2027) - placeholder până la publicare
        }
        const fallbackRate = exchangeRatesByYear[previousYear] || exchangeRatesByYear[2024] || 4.9759
        setExchangeRate(fallbackRate)
        setExchangeRateInfo({
          referenceDate: refDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }),
          note: 'Cursul valutar pentru taxe se calculează pe baza cursului din 1 octombrie (sau prima zi lucrătoare după) a anului precedent'
        })
        // Setează toate cursurile pentru afișare
        // Pentru 2024: cursul din octombrie 2023
        // Pentru 2025: cursul din octombrie 2024
        // Pentru 2026: cursul din octombrie 2025
        setExchangeRates({
          2024: exchangeRatesByYear[2023], // Curs din octombrie 2023 pentru calculul taxelor în 2024
          2025: exchangeRatesByYear[2024],  // Curs din octombrie 2024 pentru calculul taxelor în 2025
          2026: exchangeRatesByYear[2025]   // Curs din octombrie 2025 pentru calculul taxelor în 2026
        })
      }
    } catch (error) {
      console.error('Eroare la încărcarea cursului:', error)
      // Fallback: folosim cursul aproximativ pentru 1 octombrie 2024
      const currentYear = new Date().getFullYear()
      const previousYear = currentYear - 1
      const refDate = new Date(previousYear, 9, 1)
      while (refDate.getDay() === 0 || refDate.getDay() === 6) {
        refDate.setDate(refDate.getDate() + 1)
      }
      setExchangeRate(4.9759)
      setExchangeRateInfo({
        referenceDate: refDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }),
        note: 'Cursul valutar pentru taxe se calculează pe baza cursului din 1 octombrie (sau prima zi lucrătoare după) a anului precedent'
      })
      // Setează toate cursurile pentru afișare
      // Pentru 2024: cursul din octombrie 2023
      // Pentru 2025: cursul din octombrie 2024
      // Pentru 2026: cursul din octombrie 2025
      setExchangeRates({
        2024: 4.9700, // Curs din octombrie 2023 pentru calculul taxelor în 2024
        2025: 4.9759, // Curs din octombrie 2024 pentru calculul taxelor în 2025
        2026: 5.0821  // Curs din octombrie 2025 pentru calculul taxelor în 2026
      })
    }
  }

  const getMockTaxesData = () => {
    return {
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
          legalBasis: 'Legea 141/2025, Art. LXII - Contribuția anuală pentru sloturi',
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
  }

  const calculateRON = (eurAmount) => {
    if (!eurAmount || !exchangeRate) return null
    return (eurAmount * exchangeRate).toFixed(2)
  }

  // Funcție pentru a transforma referințele la articole în link-uri clickable
  const parseLegalReferences = (text) => {
    if (!text) return [{ type: 'text', content: '' }]
    
    // Pattern pentru a identifica referințe la articole:
    // - "Art. LXII", "art. 10", "Art. 10 alin. (6²)", "conform art. 10 alin. (6²)"
    // - "Legea 141/2025, Art. LXII", "OUG 77/2009, Art. 10"
    const patterns = [
      // Pattern pentru "Legea X/YYYY, Art. XXX" sau "OUG X/YYYY, Art. XXX"
      /(Legea\s+nr\.?\s*\d+\/\d+|OUG\s+nr\.?\s*\d+\/\d+)[\s,]+(?:Art\.|art\.)\s*([IVXLCDM]+|\d+[a-z²³]?|\d+)(?:\s+alin\.\s*\([^)]+\))?/gi,
      // Pattern pentru "Art. XXX" sau "art. XXX"
      /(?:conform\s+)?(?:Art\.|art\.)\s*([IVXLCDM]+|\d+[a-z²³]?|\d+)(?:\s+alin\.\s*\([^)]+\))?/gi
    ]
    
    const parts = []
    let lastIndex = 0
    
    // Caută toate referințele
    const matches = []
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          fullMatch: match[0],
          law: match[1] || null,
          articleNumber: match[2] || match[1]
        })
      }
    })
    
    // Sortează matches după index
    matches.sort((a, b) => a.index - b.index)
    
    // Elimină duplicatele și suprapunerile
    const uniqueMatches = []
    matches.forEach(match => {
      const overlaps = uniqueMatches.some(um => 
        (match.index >= um.index && match.index < um.index + um.length) ||
        (um.index >= match.index && um.index < match.index + match.length)
      )
      if (!overlaps) {
        uniqueMatches.push(match)
      }
    })
    
    // Construiește elementele
    uniqueMatches.forEach(match => {
      // Adaugă textul înainte de match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        })
      }
      
      // Determină legea
      let lawName = null
      if (match.law) {
        if (match.law.includes('141')) {
          lawName = 'Legea nr. 141/2025'
        } else if (match.law.includes('77')) {
          lawName = 'OUG nr. 77/2009'
        }
      } else {
        // Dacă nu este specificată legea, încercăm să o deducem din context
        // Pentru articolele romane mari (LXII, LXIII), probabil sunt din Legea 141/2025
        if (/^[IVXLCDM]+$/i.test(match.articleNumber) && match.articleNumber.length > 2) {
          lawName = 'Legea nr. 141/2025'
        } else {
          // Pentru articole numerice, verificăm contextul
          const contextBefore = text.substring(Math.max(0, match.index - 100), match.index)
          if (contextBefore.includes('141') || contextBefore.includes('Legea')) {
            lawName = 'Legea nr. 141/2025'
          } else if (contextBefore.includes('77') || contextBefore.includes('OUG')) {
            lawName = 'OUG nr. 77/2009'
          }
        }
      }
      
      parts.push({
        type: 'link',
        content: match.fullMatch,
        law: lawName,
        articleNumber: match.articleNumber
      })
      
      lastIndex = match.index + match.length
    })
    
    // Adaugă textul rămas
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      })
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: text }]
  }

  const handleArticleClick = (law, articleNumber) => {
    if (!law || !articleNumber) {
      console.error('Missing law or articleNumber:', { law, articleNumber })
      return
    }
    // Navighează la pagina de detalii articol
    const encodedLaw = encodeURIComponent(law)
    const encodedArticle = encodeURIComponent(articleNumber)
    console.log('Navigating to article:', { law, articleNumber, encodedLaw, encodedArticle })
    navigate(`/legal/article/${encodedLaw}/${encodedArticle}`)
  }

  const renderLegalText = (text) => {
    if (!text) return null
    const parts = parseLegalReferences(text)
    
    if (!parts || parts.length === 0) {
      return <span>{text}</span>
    }
    
    return parts.map((part, idx) => {
      if (part.type === 'link' && part.law && part.articleNumber) {
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleArticleClick(part.law, part.articleNumber)
            }}
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-semibold transition-colors cursor-pointer"
            title={`Click pentru a vedea Art. ${part.articleNumber} din ${part.law}`}
          >
            {part.content}
            <ExternalLink className="w-3 h-3" />
          </button>
        )
      }
      return <span key={idx}>{part.content}</span>
    })
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă datele despre taxe...</p>
          </div>
        </div>
      </Layout>
    )
  }

  const taxes = taxesData?.taxes || []

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Centralizator Taxe Sloturi</h1>
              <p className="text-emerald-100 mt-1">Toate taxele, plățile și termenele pentru sloturi</p>
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 mb-3">
            <Euro className="w-5 h-5" />
            <span className="font-semibold">Cursuri valutare oficiale ONJN:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exchangeRates[2024] && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Pentru anul 2024:</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    1 EUR = {exchangeRates[2024].toFixed(4)} RON
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  (curs din 01 octombrie 2023)
                </div>
              </div>
            )}
            {exchangeRates[2025] && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Pentru anul 2025:</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    1 EUR = {exchangeRates[2025].toFixed(4)} RON
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  (curs din 01 octombrie 2024)
                </div>
              </div>
            )}
            {exchangeRates[2026] && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Pentru anul 2026:</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    1 EUR = {exchangeRates[2026].toFixed(4)} RON
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  (curs din 01 octombrie 2025)
                </div>
              </div>
            )}
          </div>
          {exchangeRate && exchangeRateInfo && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-3 h-3 inline mr-1" />
                <strong>Curs folosit pentru calcul (anul curent {new Date().getFullYear()}):</strong> 1 EUR = {exchangeRate.toFixed(4)} RON 
                {exchangeRateInfo.referenceDate && ` (curs din ${exchangeRateInfo.referenceDate})`}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Cursul valutar pentru taxe se calculează pe baza cursului din 1 octombrie (sau prima zi lucrătoare după) a anului precedent. 
                Pentru anul 2024 se folosește cursul din octombrie 2023, pentru anul 2025 se folosește cursul din octombrie 2024, pentru anul 2026 se folosește cursul din octombrie 2025.
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Taxă Anuală Licență */}
          <div 
            className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-2xl shadow-lg border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:shadow-xl transition-all"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const licentaTax = taxes.find(t => t.id === 'licenta-anuala')
              // Pentru licență, navigăm la OUG 77/2009, Art. 1 (Anexă) - căutăm "150.000" sau "slot-machine"
              const searchText = encodeURIComponent(licentaTax?.legalBasis?.includes('150.000') ? '150.000' : 'slot-machine')
              navigate(`/legal/article/OUG%20nr.%2077%2F2009/1?search=${searchText}`)
            }}
            title="Click pentru a vedea articolul legal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">Taxă Anuală Licență</h3>
              <Euro className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {taxesData?.summary?.licenseEUR?.toLocaleString('ro-RO') || '150.000'} EUR
            </div>
            {exchangeRate && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                ≈ {calculateRON(taxesData?.summary?.licenseEUR || 150000)} RON
              </div>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Taxă unică pentru licența de organizare slot-machine</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click pentru articol
            </p>
          </div>

          {/* Card Lunar - Taxa de Autorizare */}
          <div 
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-xl transition-all"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const autorizareTax = taxes.find(t => t.id === 'autorizare-anuala')
              // Pentru autorizare, navigăm la Legea 141/2025, Art. 1 care modifică anexa - căutăm "slot-machine clasa A" sau "6.000"
              const searchText = encodeURIComponent(autorizareTax?.legalBasis?.includes('clasa A') ? 'clasa A' : 'slot-machine')
              navigate(`/legal/article/Legea%20nr.%20141%2F2025/1?search=${searchText}`)
            }}
            title="Click pentru a vedea articolul legal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">Autorizare</h3>
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            {/* Suma totală anuală SUS */}
            <div className="mb-3">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {(() => {
                  const autorizareTax = taxes.find(t => t.id === 'autorizare-anuala')
                  const annualAutorizare = autorizareTax?.amountEUR || 6000
                  return annualAutorizare.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                })()} EUR/an
              </div>
            </div>
            {/* Suma lunară JOS */}
            <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {(() => {
                  const autorizareTax = taxes.find(t => t.id === 'autorizare-anuala')
                  const monthlyAutorizare = autorizareTax?.amountEURMonthly || (autorizareTax?.amountEUR ? autorizareTax.amountEUR / 12 : 500)
                  return monthlyAutorizare.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                })()} EUR/lună
              </div>
              {exchangeRate && (() => {
                const autorizareTax = taxes.find(t => t.id === 'autorizare-anuala')
                const monthlyAutorizare = autorizareTax?.amountEURMonthly || (autorizareTax?.amountEUR ? autorizareTax.amountEUR / 12 : 500)
                return (
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                    {calculateRON(monthlyAutorizare)} RON/lună
                  </div>
                )
              })()}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Taxă autorizare plătită lunar</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click pentru articol
            </p>
          </div>

          {/* Card Lunar - Taxa de Viciu */}
          <div 
            className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl shadow-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:shadow-xl transition-all"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const viciuTax = taxes.find(t => t.id === 'vivu')
              // Pentru viciu, navigăm la Legea 141/2025, Art. 1 care modifică anexa - căutăm "1.000 euro" sau "post autorizat"
              const searchText = encodeURIComponent(viciuTax?.legalBasis?.includes('1.000 euro') ? '1.000 euro' : 'post autorizat')
              navigate(`/legal/article/Legea%20nr.%20141%2F2025/1?search=${searchText}`)
            }}
            title="Click pentru a vedea articolul legal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">Lunar - Viciu</h3>
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            {/* Suma anuală SUS */}
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">
              {(() => {
                const viciuTax = taxes.find(t => t.id === 'vivu')
                const annualViciu = viciuTax?.amountEUR || 1000
                return annualViciu.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              })()} EUR/an
            </div>
            {exchangeRate && (() => {
              const viciuTax = taxes.find(t => t.id === 'vivu')
              const annualViciu = viciuTax?.amountEUR || 1000
              return (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
                  ≈ {calculateRON(annualViciu)} RON/an/slot
                </div>
              )
            })()}
            {/* Suma lunară JOS */}
            <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
              <div className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
                {taxesData?.summary?.monthlyEUR?.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '83.33'} EUR/lună
              </div>
              {exchangeRate && (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  ≈ {calculateRON(taxesData?.summary?.monthlyEUR || 83.33)} RON/slot/lună
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Taxă Viciu plătită lunar</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click pentru articol
            </p>
          </div>

          {/* Card Anual - Contribuția Joc Responsabil */}
          <div 
            className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-xl transition-all"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const responsabilTax = taxes.find(t => t.id === 'contributie-joc-responsabil')
              // Pentru joc responsabil, navigăm la OUG 77/2009, Art. 10 alin. (6²) - căutăm "contribuție" sau "joc responsabil"
              const searchText = encodeURIComponent(responsabilTax?.legalBasis?.includes('contribuție') ? 'contribuție' : 'joc responsabil')
              navigate(`/legal/article/OUG%20nr.%2077%2F2009/10?search=${searchText}`)
            }}
            title="Click pentru a vedea articolul legal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Anual - Joc Responsabil</h3>
              <Building2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
              {(() => {
                const responsabilTax = taxes.find(t => t.id === 'contributie-joc-responsabil')
                return (responsabilTax?.amountEUR || 500).toLocaleString('ro-RO')
              })()} EUR
            </div>
            {exchangeRate && (() => {
              const responsabilTax = taxes.find(t => t.id === 'contributie-joc-responsabil')
              const amount = responsabilTax?.amountEUR || 500
              return (
                <div className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  ≈ {calculateRON(amount)} RON/slot/an
                </div>
              )
            })()}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Contribuție anuală pentru joc responsabil (500 EUR/slot/an)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click pentru articol
            </p>
          </div>
        </div>

        {/* Taxes Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Detalii Taxe
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left font-semibold text-white text-sm">Taxă</th>
                  <th className="px-4 py-3 text-center font-semibold text-white text-sm">Valoare (EUR)</th>
                  <th className="px-4 py-3 text-center font-semibold text-white text-sm">Valoare (RON)</th>
                  <th className="px-4 py-3 text-center font-semibold text-white text-sm">Frecvență</th>
                  <th className="px-4 py-3 text-center font-semibold text-white text-sm">Termen Plată</th>
                  <th className="px-4 py-3 text-center font-semibold text-white text-sm">Modalitate</th>
                  <th className="px-4 py-3 text-center font-semibold text-white text-sm">Categorie</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((tax, idx) => {
                  // Pentru Viciu, folosim valoarea lunară pentru afișare
                  const displayEUR = tax.id === 'vivu' && tax.amountEURMonthly 
                    ? tax.amountEURMonthly 
                    : tax.amountEUR
                  const ronValue = displayEUR ? calculateRON(displayEUR) : tax.amountRON
                  return (
                    <tr
                      key={tax.id}
                      className={`border-b border-slate-200 dark:border-slate-700 ${
                        idx % 2 === 0
                          ? 'bg-slate-50 dark:bg-slate-800/50'
                          : 'bg-white dark:bg-slate-800'
                      } hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors`}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{tax.name}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tax.description}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {displayEUR ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1">
                              <Euro className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                {displayEUR.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            {tax.id === 'vivu' && tax.amountEUR && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                ({tax.amountEUR.toLocaleString('ro-RO')} EUR/an)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {ronValue ? (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {parseFloat(ronValue).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          {tax.paymentFrequency}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>{tax.paymentDeadline}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                          <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>{tax.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          tax.category === 'Licență'
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                            : tax.category === 'Autorizare'
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : tax.category === 'Joc Responsabil'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {tax.category}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Information Cards - Separate cards for each tax */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {taxes.filter(tax => tax.id !== 'contributie-anuala').map((tax) => {
            // Pentru Viciu, folosim valoarea lunară pentru calcul RON
            const displayEUR = tax.id === 'vivu' && tax.amountEURMonthly 
              ? tax.amountEURMonthly 
              : tax.amountEUR
            const ronValue = displayEUR ? calculateRON(displayEUR) : tax.amountRON
            return (
              <div
                key={tax.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{tax.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{tax.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    tax.category === 'Licență'
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                      : tax.category === 'Autorizare'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : tax.category === 'Joc Responsabil'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {tax.category}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Valoare:</span>
                    <div className="flex flex-col items-end gap-1">
                      {tax.id === 'vivu' && tax.amountEURMonthly ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">
                              {tax.amountEURMonthly.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR/lună
                            </span>
                            {ronValue && (
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                (≈ {parseFloat(ronValue).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON/lună)
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {tax.amountEUR.toLocaleString('ro-RO')} EUR/an/post
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          {tax.amountEUR && (
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">
                              {tax.amountEUR.toLocaleString('ro-RO')} EUR
                            </span>
                          )}
                          {ronValue && (
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              (≈ {parseFloat(ronValue).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">Când se plătește:</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{tax.when}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Cum se plătește:</div>
                      <div className="text-sm text-indigo-700 dark:text-indigo-300">{tax.how}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Termen:</div>
                      <div className="text-sm text-amber-700 dark:text-amber-300">{tax.paymentDeadline}</div>
                    </div>
                  </div>

                  {tax.notes && (
                    <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <Info className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Note importante:</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {renderLegalText(tax.notes)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">Bază legală:</div>
                      <div className="text-sm text-purple-700 dark:text-purple-300">
                        {renderLegalText(tax.legalBasis)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Payment Calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Calendar Plăți
            </h2>
            {/* Selector An */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setSelectedYear(2025)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  selectedYear === 2025
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                2025
              </button>
              <button
                onClick={() => setSelectedYear(2026)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  selectedYear === 2026
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                2026
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const months = [
                { name: 'Ianuarie', num: 1 },
                { name: 'Februarie', num: 2 },
                { name: 'Martie', num: 3 },
                { name: 'Aprilie', num: 4 },
                { name: 'Mai', num: 5 },
                { name: 'Iunie', num: 6 },
                { name: 'Iulie', num: 7 },
                { name: 'August', num: 8 },
                { name: 'Septembrie', num: 9 },
                { name: 'Octombrie', num: 10 },
                { name: 'Noiembrie', num: 11 },
                { name: 'Decembrie', num: 12 }
              ]
              
              const calendarYear = selectedYear
              // Curs pentru anul selectat: 2025 folosește cursul din octombrie 2024 (4.9759), 2026 folosește cursul din octombrie 2025 (5.0821)
              const exchangeRateForYear = selectedYear === 2025 
                ? (exchangeRates[2025] || 4.9759) 
                : (exchangeRates[2026] || 5.0821)
              
              const viciuTax = taxes.find(t => t.id === 'vivu')
              const autorizareTax = taxes.find(t => t.id === 'autorizare-anuala')
              const licentaTax = taxes.find(t => t.id === 'licenta-anuala')
              const contributieTax = taxes.find(t => t.id === 'contributie-joc-responsabil')
              
              // Calculează numărul total de sloturi pe lună
              const getTotalSlotsForMonth = (monthNum, year) => {
                if (year === 2026 && monthNum === 1) {
                  // Pentru ianuarie 2026, folosim decembrie 2025
                  if (!slotsByMonth?.monthData || !slotsByMonth.monthData[12]) return 0
                  const decData = slotsByMonth.monthData[12]
                  return Object.values(decData).reduce((sum, count) => sum + (Number(count) || 0), 0)
                }
                // Pentru 2025 sau pentru lunile următoare din 2026, folosim datele din tabel pentru acea lună
                if (!slotsByMonth?.monthData || !slotsByMonth.monthData[monthNum]) {
                  // Dacă nu există date pentru acea lună, folosim ultima valoare cunoscută (decembrie)
                  if (slotsByMonth?.monthData?.[12]) {
                    const decData = slotsByMonth.monthData[12]
                    return Object.values(decData).reduce((sum, count) => sum + (Number(count) || 0), 0)
                  }
                  return 0
                }
                const monthData = slotsByMonth.monthData[monthNum]
                return Object.values(monthData).reduce((sum, count) => sum + (Number(count) || 0), 0)
              }
              
              return months.map((month, idx) => {
                const totalSlots = getTotalSlotsForMonth(month.num, calendarYear)
                const taxesForMonth = []
                
                // Taxa de autorizare se plătește lunar (500 EUR/lună/slot = 6000/12)
                const autorizareMonthly = autorizareTax?.amountEURMonthly || (autorizareTax?.amountEUR ? autorizareTax.amountEUR / 12 : 500)
                
                // Licența anuală se plătește la expirare (martie)
                if (month.num === 3 && licentaTax) {
                  taxesForMonth.push({
                    name: 'Taxă anuală licență organizare slot-machine',
                    amount: licentaTax.amountEUR,
                    total: licentaTax.amountEUR,
                    currency: 'EUR'
                  })
                }
                
                // Contribuția anuală joc responsabil se plătește în ianuarie
                if (month.num === 1 && contributieTax && totalSlots > 0) {
                  const totalContributie = contributieTax.amountEUR * totalSlots
                  taxesForMonth.push({
                    name: `Contribuție anuală joc responsabil (${totalSlots} sloturi)`,
                    amount: contributieTax.amountEUR,
                    total: totalContributie,
                    currency: 'EUR',
                    perSlot: true
                  })
                }
                
                // Taxa de autorizare lunară - în TOATE lunile
                if (autorizareTax && totalSlots > 0) {
                  const autorizareMonthly = autorizareTax.amountEURMonthly || (autorizareTax.amountEUR / 12)
                  const totalAutorizareMonthly = autorizareMonthly * totalSlots
                  taxesForMonth.push({
                    name: `Taxă autorizare (lunară) - ${totalSlots} sloturi`,
                    amount: autorizareMonthly,
                    total: totalAutorizareMonthly,
                    currency: 'EUR',
                    perSlot: true
                  })
                }
                
                // Taxa de Viciu lunară - în TOATE lunile
                if (viciuTax && totalSlots > 0) {
                  const viciuMonthly = viciuTax.amountEURMonthly || (viciuTax.amountEUR / 12)
                  const totalViciu = viciuMonthly * totalSlots
                  taxesForMonth.push({
                    name: `Taxă Viciu (lunară) - ${totalSlots} sloturi`,
                    amount: viciuMonthly,
                    total: totalViciu,
                    currency: 'EUR',
                    perSlot: true
                  })
                }
                
                return { month: month.name, monthNum: month.num, taxes: taxesForMonth, totalSlots }
              })
            })().map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 ${
                  item.taxes.length > 1
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                }`}
              >
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{item.month}</h3>
                {item.totalSlots > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {item.totalSlots} sloturi active
                  </div>
                )}
                <ul className="space-y-2">
                  {item.taxes.map((tax, tIdx) => (
                    <li key={tIdx} className="text-sm">
                      <div className="flex items-start gap-1 text-slate-600 dark:text-slate-400">
                        <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                        <div className="flex-1">
                          <div>{tax.name}</div>
                          {tax.perSlot && (
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                              {tax.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} EUR/slot
                            </div>
                          )}
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                            Total: {tax.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tax.currency}
                            {(() => {
                              const rateForYear = selectedYear === 2025 
                                ? (exchangeRates[2025] || 4.9759) 
                                : (exchangeRates[2026] || 5.0821)
                              return rateForYear ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                  (≈ {((tax.total * rateForYear).toFixed(2))} RON)
                                </span>
                              ) : null
                            })()}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {item.taxes.length === 0 && (
                    <li className="text-sm text-slate-400 dark:text-slate-500">Nu sunt taxe pentru această lună</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Documents Section */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documente Legale</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OUG 77/2009 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">OUG nr. 77/2009</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ordonanța de urgență privind organizarea și exploatarea jocurilor de noroc
                  </p>
                </div>
                <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  href="/legal/ordonanta-de-urgenta-nr-77-2009-privind-organizarea-si-exploatarea-jocurilor-de-noroc (1).pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Vizualizează
                </a>
                <a
                  href="/legal/ordonanta-de-urgenta-nr-77-2009-privind-organizarea-si-exploatarea-jocurilor-de-noroc (1).pdf"
                  download="OUG-nr-77-2009.pdf"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Descarcă
                </a>
              </div>
            </div>

            {/* Legea 141/2025 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Legea nr. 141/2025</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Lege privind unele măsuri fiscal-bugetare
                  </p>
                </div>
                <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  href="/legal/legea-nr-141-2025-privind-unele-masuri-fiscal-bugetare.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Vizualizează
                </a>
                <a
                  href="/legal/legea-nr-141-2025-privind-unele-masuri-fiscal-bugetare.pdf"
                  download="Legea-nr-141-2025.pdf"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Descarcă
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}

export default SlotTaxesCentralizer
