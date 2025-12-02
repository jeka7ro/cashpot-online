import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useTheme } from '../contexts/ThemeContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { RefreshCw, Clock, Calendar, CalendarDays, CalendarRange, ArrowLeft, Settings, CheckCircle, XCircle, Search, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ExpendituresElectric = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  // State
  const [rawData, setRawData] = useState([])
  const [expendituresData, setExpendituresData] = useState([]) // Cheltuieli din SQL
  const [loading, setLoading] = useState(true)
  const [selectedDateFilter, setSelectedDateFilter] = useState('toate')
  const [locationFilter, setLocationFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  
  // Date range - default TOATE
  const [dateRange, setDateRange] = useState({
    startDate: '2020-01-01',
    endDate: '2030-12-31'
  })

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

  // Format date local
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Quick date filter
  const applyQuickDateFilter = (filterId) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate, endDate
    
    switch (filterId) {
      case 'azi':
        startDate = formatDateLocal(today)
        endDate = formatDateLocal(today)
        break
      case 'saptamana-curenta':
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        startDate = formatDateLocal(monday)
        endDate = formatDateLocal(today)
        break
      case 'luna-curenta':
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        startDate = formatDateLocal(currentMonthStart)
        endDate = formatDateLocal(currentMonthEnd)
        break
      case 'luna-anterioara':
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        startDate = formatDateLocal(prevMonthStart)
        endDate = formatDateLocal(prevMonthEnd)
        break
      case 'anul-curent':
        startDate = formatDateLocal(new Date(now.getFullYear(), 0, 1))
        endDate = formatDateLocal(new Date(now.getFullYear(), 11, 31))
        break
      case 'anul-trecut':
        startDate = formatDateLocal(new Date(now.getFullYear() - 1, 0, 1))
        endDate = formatDateLocal(new Date(now.getFullYear() - 1, 11, 31))
        break
      case 'toate':
        startDate = '2020-01-01'
        endDate = '2030-12-31'
        break
      default:
        return
    }
    
    setDateRange({ startDate, endDate })
    setSelectedDateFilter(filterId)
  }

  // Load data - folosim rawData pentru a vedea toate lunile
  const loadData = async () => {
    setLoading(true)
    try {
      // Încarcă datele din centralizator și cheltuieli în paralel
      const [centralizerResponse, expendituresResponse] = await Promise.all([
        axios.get('/api/expenditures/electric-nlc-centralizer'),
        axios.get('/api/expenditures/sql-table', {
          params: { 
            departments: 'Electricitate',
            limit: 1000 // Suficient pentru toate facturile
          }
        })
      ])
      
      if (centralizerResponse.data?.success) {
        setRawData(centralizerResponse.data.rawData || centralizerResponse.data.data || [])
      }
      
      if (expendituresResponse.data?.data) {
        // Datele din tabelul expenditures_sync pentru Electricitate
        setExpendituresData(expendituresResponse.data.data || [])
      }
    } catch (error) {
      console.error('Eroare:', error)
      toast.error('Eroare la încărcare')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Parse period to get month/year
  const parsePeriod = (period) => {
    if (!period) return null
    const match = period.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (match) {
      return {
        month: parseInt(match[2]) - 1,
        year: parseInt(match[3]),
        monthKey: `${match[3]}-${match[2]}`
      }
    }
    return null
  }

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locs = new Set()
    rawData.forEach(item => {
      if (item.location_name) locs.add(item.location_name)
    })
    return Array.from(locs).sort()
  }, [rawData])

  // Filter data by period AND location
  const filteredData = useMemo(() => {
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    end.setHours(23, 59, 59)
    
    return rawData.filter(item => {
      // Location filter
      if (locationFilter !== 'all' && item.location_name !== locationFilter) {
        return false
      }
      // Period filter
      const parsed = parsePeriod(item.perioada_facturare)
      if (!parsed) return false
      const itemDate = new Date(parsed.year, parsed.month, 1)
      if (itemDate < start || itemDate > end) {
        return false
      }
      // Search filter
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase()
        const searchableText = [
          item.location_name || '',
          item.numar_factura || '',
          item.nlc_code || '',
          item.perioada_facturare || '',
          item.total_factura ? String(item.total_factura) : ''
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) {
          return false
        }
      }
      
      return true
    })
  }, [rawData, dateRange, locationFilter, searchText])

  // Build matrix: month -> location -> data (LUNI pe rânduri, SĂLI pe coloane)
  // Include slots count pentru calcul RON/slot și kWh/slot
  const matrixData = useMemo(() => {
    const matrix = {}
    const locations = new Set()
    const monthsFound = new Set()

    filteredData.forEach(item => {
      const loc = item.location_name || 'N/A'
      const parsed = parsePeriod(item.perioada_facturare)
      if (!parsed) return
      
      locations.add(loc)
      monthsFound.add(parsed.monthKey)

      if (!matrix[parsed.monthKey]) {
        matrix[parsed.monthKey] = { month: parsed.month, year: parsed.year }
      }
      if (!matrix[parsed.monthKey][loc]) {
        matrix[parsed.monthKey][loc] = { ron: 0, kwh: 0, slots: 0 }
      }
      
      matrix[parsed.monthKey][loc].ron += parseFloat(item.total_suma) || parseFloat(item.suma_totala) || 0
      matrix[parsed.monthKey][loc].kwh += parseFloat(item.total_consum) || parseFloat(item.consum_kwh) || 0
      // Folosim slots_count din backend (maxim din toate NLC-urile pentru această locație/lună)
      const itemSlots = parseInt(item.slots_count) || 0
      if (itemSlots > matrix[parsed.monthKey][loc].slots) {
        matrix[parsed.monthKey][loc].slots = itemSlots
      }
    })

    const sortedMonths = Array.from(monthsFound).sort()
    const sortedLocations = Array.from(locations).sort()

    return { matrix, sortedMonths, sortedLocations }
  }, [filteredData])

  // Format month key to display
  const formatMonthKey = (key) => {
    const [year, month] = key.split('-')
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  // Calculate totals per month (row totals)
  const monthTotals = useMemo(() => {
    const totals = {}
    matrixData.sortedMonths.forEach(monthKey => {
      totals[monthKey] = { ron: 0, kwh: 0, slots: 0 }
      matrixData.sortedLocations.forEach(loc => {
        if (matrixData.matrix[monthKey]?.[loc]) {
          totals[monthKey].ron += matrixData.matrix[monthKey][loc].ron
          totals[monthKey].kwh += matrixData.matrix[monthKey][loc].kwh
          totals[monthKey].slots += matrixData.matrix[monthKey][loc].slots || 0
        }
      })
    })
    return totals
  }, [matrixData])

  // Calculate totals per location (column totals)
  const locationTotals = useMemo(() => {
    const totals = {}
    matrixData.sortedLocations.forEach(loc => {
      totals[loc] = { ron: 0, kwh: 0, slots: 0 }
      matrixData.sortedMonths.forEach(monthKey => {
        if (matrixData.matrix[monthKey]?.[loc]) {
          totals[loc].ron += matrixData.matrix[monthKey][loc].ron
          totals[loc].kwh += matrixData.matrix[monthKey][loc].kwh
          // Pentru total pe locație, folosim media sloturilor pe lună
          if (matrixData.matrix[monthKey][loc].slots > totals[loc].slots) {
            totals[loc].slots = matrixData.matrix[monthKey][loc].slots
          }
        }
      })
    })
    return totals
  }, [matrixData])

  // Grand totals
  const grandTotal = useMemo(() => {
    let ron = 0, kwh = 0, slots = 0
    Object.values(locationTotals).forEach(t => {
      ron += t.ron
      kwh += t.kwh
      slots += t.slots || 0
    })
    return { ron, kwh, slots }
  }, [locationTotals])

  // Average price
  const avgPrice = grandTotal.kwh > 0 ? grandTotal.ron / grandTotal.kwh : 0

  // Analiză teoretică consum sloturi vs restul sălii
  // Presupunere: 1 slot consumă ~0.35 kWh (350W medie) x 24h x 30 zile = ~252 kWh/lună
  const SLOT_CONSUMPTION_KWH_PER_MONTH = 252 // kWh/slot/lună estimativ
  const theoreticalAnalysis = useMemo(() => {
    const months = matrixData.sortedMonths.length
    if (months === 0 || grandTotal.slots === 0) return null
    
    const theoreticalSlotConsumption = grandTotal.slots * SLOT_CONSUMPTION_KWH_PER_MONTH * months
    const actualConsumption = grandTotal.kwh
    const otherConsumption = Math.max(0, actualConsumption - theoreticalSlotConsumption)
    const slotPercentage = actualConsumption > 0 ? (theoreticalSlotConsumption / actualConsumption) * 100 : 0
    const otherPercentage = 100 - slotPercentage
    
    return {
      theoreticalSlotConsumption,
      actualConsumption,
      otherConsumption,
      slotPercentage: Math.min(100, slotPercentage), // Cap at 100%
      otherPercentage: Math.max(0, otherPercentage)
    }
  }, [grandTotal, matrixData.sortedMonths.length])

  // Date pentru graficul de evoluție lunară
  const chartData = useMemo(() => {
    return matrixData.sortedMonths.map(monthKey => {
      const [year, month] = monthKey.split('-')
      const monthName = monthNames[parseInt(month) - 1]?.substring(0, 3) || month
      
      return {
        name: `${monthName}. ${year}`,
        monthKey,
        total: monthTotals[monthKey]?.ron || 0,
        kwh: monthTotals[monthKey]?.kwh || 0
      }
    })
  }, [matrixData.sortedMonths, monthTotals, monthNames])

  // Facturi unice - grupate pe număr factură + verificare în Cheltuieli
  const uniqueInvoices = useMemo(() => {
    const invoiceMap = {}
    const allUniqueNlcs = new Set() // Pentru totalul de NLC-uri unice
    
    // Creează un set cu numerele de facturi din cheltuieli (din description)
    const invoicesInExpenditures = new Set()
    const expendituresAmountByInvoice = {}
    
    expendituresData.forEach(exp => {
      // Caută numărul facturii în description (format: "Factură EFI/XXX | ...")
      const desc = exp.description || ''
      const match = desc.match(/EFI\/\d+/)
      if (match) {
        const invoiceNum = match[0]
        invoicesInExpenditures.add(invoiceNum)
        // Acumulează suma pentru fiecare factură
        if (!expendituresAmountByInvoice[invoiceNum]) {
          expendituresAmountByInvoice[invoiceNum] = 0
        }
        expendituresAmountByInvoice[invoiceNum] += parseFloat(exp.amount) || 0
      }
    })
    
    filteredData.forEach(item => {
      const invoiceNumber = item.numar_factura
      if (!invoiceNumber) return
      
      // Adaugă NLC-ul la setul global de NLC-uri unice
      if (item.nlc_code) {
        allUniqueNlcs.add(item.nlc_code)
      }
      
      if (!invoiceMap[invoiceNumber]) {
        // Verifică dacă factura e în cheltuieli
        const inExpenditures = invoicesInExpenditures.has(invoiceNumber)
        const expendituresAmount = expendituresAmountByInvoice[invoiceNumber] || 0
        
        invoiceMap[invoiceNumber] = {
          number: invoiceNumber,
          period: item.perioada_facturare || 'N/A',
          totalRon: 0,
          totalKwh: 0,
          nlcCount: 0,
          nlcCodes: new Set(),
          locations: new Set(),
          inExpenditures,
          expendituresAmount
        }
      }
      
      invoiceMap[invoiceNumber].totalRon += parseFloat(item.suma_totala) || 0
      invoiceMap[invoiceNumber].totalKwh += parseFloat(item.consum_kwh) || 0
      invoiceMap[invoiceNumber].nlcCount += 1
      if (item.nlc_code) {
        invoiceMap[invoiceNumber].nlcCodes.add(item.nlc_code)
      }
      if (item.location_name) {
        invoiceMap[invoiceNumber].locations.add(item.location_name)
      }
    })
    
    // Convertește la array și sortează pe perioadă
    const invoices = Object.values(invoiceMap)
      .map(inv => ({
        ...inv,
        nlcCodes: Array.from(inv.nlcCodes),
        locations: Array.from(inv.locations)
      }))
      .sort((a, b) => {
        // Sortare pe perioadă
        const dateA = a.period.split(' - ')[0] || ''
        const dateB = b.period.split(' - ')[0] || ''
        return dateA.localeCompare(dateB)
      })
    
    // Calculează câte sunt în cheltuieli
    const inExpendituresCount = invoices.filter(i => i.inExpenditures).length
    
    // Returnează și totalul de NLC-uri unice
    return {
      invoices,
      totalUniqueNlcs: allUniqueNlcs.size,
      inExpendituresCount
    }
  }, [filteredData, expendituresData])

  return (
    <Layout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Back button - STÂNGA */}
            <button
              onClick={() => navigate('/expenditures')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Înapoi la Cheltuieli"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Electrica</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Centralizator consum și costuri energie electrică
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Buton Setări Electrică */}
            <button
              onClick={() => navigate('/expenditures/settings?tab=electric')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105"
              style={{
                height: '40px',
                background: isDark 
                  ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                boxShadow: isDark
                  ? '0 6px 18px rgba(124, 58, 237, 0.4)'
                  : '0 6px 18px rgba(139, 92, 246, 0.35)'
              }}
              title="Setări și import facturi electrice"
            >
              <Settings className="w-4 h-4" />
              <span>Setări</span>
            </button>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105"
              style={{
                height: '40px',
                background: isDark 
                  ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                  : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                boxShadow: isDark
                  ? '0 6px 18px rgba(15, 23, 42, 0.5)'
                  : '0 6px 18px rgba(30, 58, 138, 0.35)'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Reîncarcă</span>
            </button>
          </div>
        </div>
        
        {/* Filters - Nou Design */}
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl shadow-xl border border-transparent backdrop-blur-2xl mb-6">
          {/* Rând 1: Bară de Căutare + Filtre - Pe același rând */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Bară de Căutare - Ocupă spațiul rămas */}
            <div className="relative flex-1 min-w-[250px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Căutare
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Caută în Locație, Număr Factură, NLC, Perioadă, Sumă..."
                  className="w-full pl-10 pr-10 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                    title="Șterge căutarea"
                  >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre Locație */}
            <div className="flex items-end gap-3">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Locație
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Rând 2: Date Picker Clasic și Comod */}
          <div className="mb-4">
            {/* Input-uri de date */}
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2">
              {/* Date Inputs - Clasic și Simplu */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    De la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, startDate: e.target.value })
                      setSelectedDateFilter('custom')
                    }}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Până la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, endDate: e.target.value })
                      setSelectedDateFilter('custom')
                    }}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>

              {/* Săgeți Navigare Perioadă */}
              <div className="flex items-center gap-1 border-l border-r border-slate-200 dark:border-slate-700 px-3">
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() - diffDays - 1)
                    end.setDate(end.getDate() - diffDays - 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                    setSelectedDateFilter('custom')
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă anterioară"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() + diffDays + 1)
                    end.setDate(end.getDate() + diffDays + 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                    setSelectedDateFilter('custom')
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă următoare"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Text Perioadă Afișată */}
              <div className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.startDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {' – '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.endDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Butoane Rapide cu Iconițe și Text - Sub Input-uri */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
              {[
                { id: 'azi', label: 'Azi', icon: Clock },
                { id: 'saptamana-curenta', label: 'Săpt', icon: CalendarDays },
                { id: 'luna-curenta', label: 'Luna curentă', icon: Calendar },
                { id: 'luna-anterioara', label: 'Luna trecută', icon: CalendarRange },
                { id: 'anul-curent', label: 'Anul curent', icon: Calendar },
                { id: 'anul-trecut', label: 'Anul trecut', icon: Calendar },
                { id: 'toate', label: 'Toate', icon: Calendar }
              ].map((btn) => {
                const IconComponent = btn.icon
                const isActive = selectedDateFilter === btn.id
                return (
                  <button
                    key={btn.id}
                    onClick={() => applyQuickDateFilter(btn.id)}
                    className={`relative inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                    title={btn.label}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{btn.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cost</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {grandTotal.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-500">lei</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Consum</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {grandTotal.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-slate-500">kWh</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Preț Mediu</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {avgPrice.toFixed(4)}
            </p>
            <p className="text-sm text-slate-500">lei/kWh</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Locații / Luni</p>
            <p className="text-3xl font-bold text-slate-700 dark:text-slate-300 mt-2">
              {matrixData.sortedLocations.length} / {matrixData.sortedMonths.length}
            </p>
            <p className="text-sm text-slate-500">active / facturate</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Cost / Slot / Lună</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              {grandTotal.slots > 0 && matrixData.sortedMonths.length > 0 
                ? (grandTotal.ron / grandTotal.slots / matrixData.sortedMonths.length).toFixed(2) 
                : '—'}
            </p>
            <p className="text-sm text-slate-500">
              lei/slot/lună ({grandTotal.slots} sloturi, {matrixData.sortedMonths.length} {matrixData.sortedMonths.length === 1 ? 'lună' : 'luni'})
            </p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">kWh / Slot / Lună</p>
            <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
              {grandTotal.slots > 0 && matrixData.sortedMonths.length > 0 
                ? (grandTotal.kwh / grandTotal.slots / matrixData.sortedMonths.length).toFixed(1) 
                : '—'}
            </p>
            <p className="text-sm text-slate-500">kWh/slot/lună</p>
          </div>
        </div>

        {/* Analiză Teoretică Consum - doar dacă avem date */}
        {theoreticalAnalysis && (
          <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span>📊</span> Analiză Teoretică Consum
              <span className="text-xs font-normal text-slate-500">(estimare: 1 slot ≈ 252 kWh/lună @ 350W medie)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Consum Real Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {theoreticalAnalysis.actualConsumption.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Consum Teoretic Sloturi</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {theoreticalAnalysis.theoreticalSlotConsumption.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                </p>
                <p className="text-xs text-slate-400">({theoreticalAnalysis.slotPercentage.toFixed(1)}% din total)</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Consum Alte Echipamente</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {theoreticalAnalysis.otherConsumption.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                </p>
                <p className="text-xs text-slate-400">({theoreticalAnalysis.otherPercentage.toFixed(1)}% din total)</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Raport Sloturi / Alte</p>
                <div className="mt-2 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${theoreticalAnalysis.slotPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400">Sloturi {theoreticalAnalysis.slotPercentage.toFixed(0)}%</span>
                  <span className="text-orange-600 dark:text-orange-400">Alte {theoreticalAnalysis.otherPercentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              💡 Notă: Consumul teoretic per slot este estimativ (~350W x 24h x 30 zile). 
              Diferența reprezintă LED-uri, climatizare, frigidere, TV-uri, și alte echipamente din sală.
            </p>
          </div>
        )}

        {/* Grafic Evoluție Cheltuieli Electricitate */}
        {chartData.length > 0 && (
          <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📈</span> Evoluție Cheltuieli Electricitate
                <span className="text-xs font-normal text-slate-500">
                  {dateRange.startDate} - {dateRange.endDate}
                </span>
              </h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {grandTotal.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </div>
                <div className="text-xs text-slate-500">Total perioadă</div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${name === 'total' ? 'RON' : 'kWh'}`,
                      name === 'total' ? 'Cost' : 'Consum'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Cost (RON)"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Main Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-emerald-600 rounded-full"></div>
            <span className="ml-3 text-slate-500">Se încarcă datele...</span>
          </div>
        ) : matrixData.sortedMonths.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 text-lg">Nu există date pentru perioada selectată.</p>
            <p className="text-slate-400 text-sm mt-2">Modifică perioada sau importă facturi noi.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {/* Header Row 1: Location names */}
                  <tr className="bg-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3 text-left font-bold text-white border-b border-r border-slate-600 min-w-[140px]">
                      LUNĂ
                    </th>
                    {matrixData.sortedLocations.map(loc => (
                      <th 
                        key={loc} 
                        colSpan={2}
                        className="px-4 py-3 text-center font-bold text-white border-b border-r border-slate-600"
                      >
                        {loc}
                      </th>
                    ))}
                    <th 
                      colSpan={2}
                      className="px-4 py-3 text-center font-bold text-white border-b border-slate-600"
                    >
                      TOTAL LUNĂ
                    </th>
                  </tr>
                  {/* Header Row 2: lei / kWh labels */}
                  <tr className="bg-slate-700 dark:bg-slate-800">
                    <th className="px-4 py-2 text-left text-xs text-slate-300 border-b border-r border-slate-600"></th>
                    {matrixData.sortedLocations.map(loc => (
                      <React.Fragment key={loc}>
                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-slate-600">
                          lei
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-r border-slate-600">
                          kWh
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-slate-600">
                      lei
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-slate-600">
                      kWh
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {matrixData.sortedMonths.map((monthKey, idx) => (
                    <tr 
                      key={monthKey} 
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td 
                        className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => navigate(`/expenditures/electric/${monthKey}`)}
                        title="Click pentru detalii lună"
                      >
                        {formatMonthKey(monthKey)}
                      </td>
                      {matrixData.sortedLocations.map(loc => {
                        const cellData = matrixData.matrix[monthKey]?.[loc]
                        const ronPerSlot = cellData?.slots > 0 ? cellData.ron / cellData.slots : null
                        const kwhPerSlot = cellData?.slots > 0 ? cellData.kwh / cellData.slots : null
                        return (
                          <React.Fragment key={loc}>
                            <td className="px-3 py-2 text-right text-slate-800 dark:text-slate-200">
                              {cellData ? (
                                <div>
                                  <span className="font-medium">
                                    {cellData.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                  {ronPerSlot && (
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                      {ronPerSlot.toFixed(2)}/slot
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {cellData ? (
                                <div>
                                  <span>{cellData.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}</span>
                                  {kwhPerSlot && (
                                    <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5">
                                      {kwhPerSlot.toFixed(1)}/slot
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                        <div>
                          {monthTotals[monthKey]?.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          {monthTotals[monthKey]?.slots > 0 && (
                            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-0.5">
                              {(monthTotals[monthKey].ron / monthTotals[monthKey].slots).toFixed(2)}/slot
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300">
                        <div>
                          {monthTotals[monthKey]?.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                          {monthTotals[monthKey]?.slots > 0 && (
                            <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mt-0.5">
                              {(monthTotals[monthKey].kwh / monthTotals[monthKey].slots).toFixed(1)}/slot
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 dark:bg-slate-900 font-bold">
                    <td className="px-4 py-3 text-white border-t border-r border-slate-600">
                      TOTAL SALĂ
                    </td>
                    {matrixData.sortedLocations.map(loc => {
                      const locRonPerSlot = locationTotals[loc]?.slots > 0 ? locationTotals[loc].ron / locationTotals[loc].slots : null
                      const locKwhPerSlot = locationTotals[loc]?.slots > 0 ? locationTotals[loc].kwh / locationTotals[loc].slots : null
                      return (
                        <React.Fragment key={loc}>
                          <td className="px-3 py-2 text-right text-white border-t border-slate-600">
                            <div>
                              {locationTotals[loc]?.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              {locRonPerSlot && (
                                <div className="text-xs font-medium text-purple-300 mt-0.5">
                                  {locRonPerSlot.toFixed(2)}/slot
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300 border-t border-r border-slate-600">
                            <div>
                              {locationTotals[loc]?.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                              {locKwhPerSlot && (
                                <div className="text-xs font-medium text-cyan-300 mt-0.5">
                                  {locKwhPerSlot.toFixed(1)}/slot
                                </div>
                              )}
                            </div>
                          </td>
                        </React.Fragment>
                      )
                    })}
                    <td className="px-3 py-2 text-right text-lg text-white border-t border-slate-600">
                      <div>
                        {grandTotal.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        {grandTotal.slots > 0 && (
                          <div className="text-xs font-medium text-purple-300 mt-0.5">
                            {(grandTotal.ron / grandTotal.slots).toFixed(2)}/slot
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-lg text-slate-300 border-t border-slate-600">
                      <div>
                        {grandTotal.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                        {grandTotal.slots > 0 && (
                          <div className="text-xs font-medium text-cyan-300 mt-0.5">
                            {(grandTotal.kwh / grandTotal.slots).toFixed(1)}/slot
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tabel Facturi Salvate - sub tabelul principal */}
        {uniqueInvoices.invoices.length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📄</span> Facturi Salvate în Centralizator
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                  {uniqueInvoices.invoices.length} {uniqueInvoices.invoices.length === 1 ? 'factură' : 'facturi'}
                </span>
              </h3>
              <button
                onClick={() => navigate('/expenditures/settings?tab=electric')}
                className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                <span>Adaugă Factură</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-indigo-600 dark:bg-indigo-800">
                    <th className="px-3 py-3 text-center font-semibold text-white text-sm w-16">
                      <span title="În Cheltuieli">💰</span>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Nr. Factură</th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Perioadă Consum</th>
                    <th className="px-4 py-3 text-right font-semibold text-white text-sm">Cost Centralizator</th>
                    <th className="px-4 py-3 text-right font-semibold text-white text-sm">Cost Cheltuieli</th>
                    <th className="px-4 py-3 text-right font-semibold text-white text-sm">Consum kWh</th>
                    <th className="px-4 py-3 text-center font-semibold text-white text-sm">NLC-uri</th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Locații</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueInvoices.invoices.map((inv, idx) => {
                    const amountMatch = inv.inExpenditures && Math.abs(inv.totalRon - inv.expendituresAmount) < 1
                    return (
                      <tr 
                        key={inv.number}
                        className={`border-b border-slate-200 dark:border-slate-700 ${
                          idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'
                        } hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors`}
                      >
                        <td className="px-3 py-3 text-center">
                          {inv.inExpenditures ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 text-sm">
                          {inv.number}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                          {inv.period}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                          {inv.totalRon.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold text-sm ${
                          inv.inExpenditures 
                            ? amountMatch 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400'
                        }`}>
                          {inv.inExpenditures 
                            ? `${inv.expendituresAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
                            : '—'
                          }
                          {inv.inExpenditures && !amountMatch && (
                            <div className="text-xs text-amber-500">
                              Δ {Math.abs(inv.totalRon - inv.expendituresAmount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 text-sm">
                          {inv.totalKwh.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} kWh
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 text-sm">
                          {inv.nlcCount}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {inv.locations.map(loc => (
                              <span 
                                key={loc}
                                className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs"
                              >
                                {loc}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-100 dark:bg-indigo-900/40 font-semibold">
                    <td className="px-3 py-3 text-center text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {uniqueInvoices.inExpendituresCount}/{uniqueInvoices.invoices.length}
                      </span>
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-slate-800 dark:text-slate-200 text-sm">
                      TOTAL ({uniqueInvoices.invoices.length} facturi)
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300 text-sm">
                      {uniqueInvoices.invoices.reduce((s, i) => s + i.totalRon, 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300 text-sm">
                      {uniqueInvoices.invoices.reduce((s, i) => s + (i.expendituresAmount || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-300 text-sm">
                      {uniqueInvoices.invoices.reduce((s, i) => s + i.totalKwh, 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} kWh
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 text-sm">
                      {uniqueInvoices.totalUniqueNlcs} unice
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                      {matrixData.sortedLocations.length} locații
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          {filteredData.length} înregistrări în perioada selectată
        </div>
      </div>
    </Layout>
  )
}

export default ExpendituresElectric
