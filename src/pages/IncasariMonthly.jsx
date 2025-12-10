import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FileSpreadsheet, TrendingUp, TrendingDown, ArrowLeft, Search, X, Calendar, Clock, CalendarDays, CalendarRange } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'

const IncasariMonthly = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { locations } = useData()

  const [monthlyData, setMonthlyData] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_monthly_data_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Verifică dacă cache-ul este recent (max 1 oră)
        const now = Date.now()
        if (parsed.timestamp && (now - parsed.timestamp) < 60 * 60 * 1000) {
          return parsed.data || []
        }
      }
    } catch (error) {
      console.error('Eroare la citirea cache pentru monthlyData:', error)
    }
    return []
  })
  const [loading, setLoading] = useState(false)
  const [locationFilter, setLocationFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [cabinetFilter, setCabinetFilter] = useState('all')
  const [gameMixFilter, setGameMixFilter] = useState('all')
  const [filtersMeta, setFiltersMeta] = useState({
    locations: [],
    providers: [],
    cabinets: [],
    gameMixes: []
  })
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return {
      startDate: formatDateLocal(start),
      endDate: formatDateLocal(end)
    }
  })
  const [searchText, setSearchText] = useState('')
  const [selectedDateFilter, setSelectedDateFilter] = useState('luna-curenta')

  // Funcție pentru formatare dată
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Funcție pentru aplicarea filtrelor rapide de dată
  const applyQuickDateFilter = (filterId) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate, endDate
    
    switch (filterId) {
      case 'azi':
        startDate = endDate = formatDateLocal(today)
        break
      case 'saptamana-curenta':
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        startDate = formatDateLocal(new Date(today.getTime() + diff * 24 * 60 * 60 * 1000))
        endDate = formatDateLocal(today)
        break
      case 'luna-curenta':
        startDate = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1))
        endDate = formatDateLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0))
        break
      case 'luna-anterioara':
        startDate = formatDateLocal(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        endDate = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 0))
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
        startDate = formatDateLocal(new Date(2020, 0, 1))
        endDate = formatDateLocal(new Date(2030, 11, 31))
        break
      default:
        return
    }
    
    setDateRange({ startDate, endDate })
    setSelectedDateFilter(filterId)
  }

  // Funcție pentru schimbarea perioadei (pentru QuickDateButtons)
  const handleDateChange = (newRange) => {
    setDateRange(newRange)
  }

  // Funcție pentru formatare număr
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return Number(num).toLocaleString('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  // Funcție pentru normalizare nume locație (elimină sufixe E.S, E.S., ES)
  const normalizeLocationName = (name) => {
    if (!name) return ''
    let n = name.toString().trim()
    // Elimină sufixe de tip E.S / E.S. / ES (cu sau fără puncte, cu sau fără spații)
    n = n.replace(/\s*E\.?\s*S\.?\s*$/i, '')
    n = n.replace(/\s*ES\s*$/i, '')
    return n.trim()
  }

  // Funcție pentru încărcarea datelor lunare
  const loadMonthlyData = async () => {
    try {
      // Verifică cache-ul înainte de fetch
      let hasValidCache = false
      try {
        const cached = localStorage.getItem('incasari_monthly_data_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          const now = Date.now()
          // Verifică dacă cache-ul este recent (max 1 oră)
          if (parsed.timestamp && (now - parsed.timestamp) < 60 * 60 * 1000) {
            // Folosește cache-ul imediat
            if (parsed.data && parsed.data.length > 0) {
              setMonthlyData(parsed.data)
              hasValidCache = true
            }
          }
        }
      } catch (e) {
        // Ignoră erorile de cache și continuă cu fetch
      }

      // Dacă nu avem cache valid, afișăm loading
      if (!hasValidCache) {
        setLoading(true)
      }
      
      const params = {}
      
      if (locationFilter !== 'all') {
        params.location = locationFilter
      }
      if (providerFilter !== 'all') {
        params.provider = providerFilter
      }
      if (cabinetFilter !== 'all') {
        params.cabinet = cabinetFilter
      }
      if (gameMixFilter !== 'all') {
        params.gameMix = gameMixFilter
      }
      if (filtersMeta.locations && filtersMeta.locations.length > 0) {
        params.includeLocations = filtersMeta.locations.join(',')
      }
      
      const response = await axios.get('/api/incasari/monthly-by-location', { params })
      
      if (response.data && response.data.success) {
        const newData = response.data.rows || []
        setMonthlyData(newData)
        
        // Salvează în cache
        try {
          localStorage.setItem('incasari_monthly_data_cache', JSON.stringify({
            data: newData,
            timestamp: Date.now(),
            filters: { locationFilter, providerFilter, cabinetFilter, gameMixFilter }
          }))
        } catch (e) {
          console.warn('Nu s-a putut salva în cache:', e)
        }
      } else {
        console.error('❌ Răspuns invalid de la server:', response.data)
        if (!hasValidCache) {
          toast.error('Răspuns invalid de la server')
        }
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea datelor lunare:', error)
      if (monthlyData.length === 0) {
        console.error('❌ Detalii eroare:', error.response?.data || error.message)
        toast.error(`Eroare la încărcarea datelor lunare: ${error.response?.data?.error || error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Load meta-date pentru filtre (locații / provideri / cabinete / game-mix)
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const resp = await axios.get('/api/incasari/filters-metadata')
        if (resp.data?.success) {
          const rawLocations = resp.data.locations || []
          const normalizedLocationsSet = new Set(
            rawLocations
              .map((loc) => normalizeLocationName(loc))
              .filter(Boolean)
          )
          setFiltersMeta({
            locations: Array.from(normalizedLocationsSet).sort(),
            providers: resp.data.providers || [],
            cabinets: resp.data.cabinets || [],
            gameMixes: resp.data.gameMixes || []
          })
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea meta-datelor pentru filtre:', error)
      }
    }
    loadFilters()
  }, [])

  // useEffect pentru încărcarea datelor lunare
  useEffect(() => {
    // Încarcă datele (folosește cache dacă există)
    loadMonthlyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter, providerFilter, cabinetFilter, gameMixFilter, filtersMeta.locations])

  // Procesează datele lunare pentru tabel
  const monthlyTableData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return { years: [], locations: [], monthRows: [] }

    // Obține toate locațiile unice (normalizate pentru a grupa "Craiova E.S" cu "Craiova")
    // EXCLUDE "Depozit" din tabel
    const locationsSet = new Set()
    const locationNameMap = new Map() // Map pentru a păstra numele original pentru afișare
    monthlyData.forEach(row => {
      if (row.locationName) {
        const normalized = normalizeLocationName(row.locationName)
        // Exclude "Depozit"
        if (normalized.toLowerCase() !== 'depozit') {
          locationsSet.add(normalized)
          // Păstrează numele original (fără E.S) pentru afișare
          if (!locationNameMap.has(normalized) || normalized === row.locationName) {
            locationNameMap.set(normalized, normalized)
          }
        }
      }
    })
    const locations = Array.from(locationsSet).sort()

    // Grupează datele pe ani
    const yearsMap = new Map()
    monthlyData.forEach(row => {
      const year = row.year
      const month = row.month
      const locationName = normalizeLocationName(row.locationName || 'Nesetat')
      
      // Exclude "Depozit" din procesare
      if (locationName.toLowerCase() === 'depozit') {
        return
      }
      
      if (!yearsMap.has(year)) {
        yearsMap.set(year, new Map())
      }
      const monthsMap = yearsMap.get(year)
      
      const monthKey = `${year}-${month}`
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          year,
          month,
          locations: {}
        })
      }
      
      const monthData = monthsMap.get(monthKey)
      // Dacă există deja date pentru această locație normalizată, adună valorile
      if (monthData.locations[locationName]) {
        monthData.locations[locationName].ggr += row.totalGgr
        monthData.locations[locationName].in += row.totalIn
        monthData.locations[locationName].bet += row.totalBet
        monthData.locations[locationName].win += row.totalWin
        monthData.locations[locationName].expenditures += (row.totalExpenditures || 0)
        // Pentru sloturi, folosește valoarea maximă (nu suma, căci ar fi dublare)
        monthData.locations[locationName].slotsCount = Math.max(
          monthData.locations[locationName].slotsCount || 0,
          row.slotsCount || 0
        )
      } else {
        monthData.locations[locationName] = {
          ggr: row.totalGgr,
          in: row.totalIn,
          bet: row.totalBet,
          win: row.totalWin,
          expenditures: row.totalExpenditures || 0,
          slotsCount: row.slotsCount || 0
        }
      }
    })

    // Sortează anii descrescător
    const years = Array.from(yearsMap.keys()).sort((a, b) => b - a)

    // Creează rândurile pentru tabel (luni pe rânduri, locații pe coloane)
    const monthRows = []
    const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    
    years.forEach(year => {
      const monthsMap = yearsMap.get(year)
      const monthKeys = Array.from(monthsMap.keys()).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number)
        const [yearB, monthB] = b.split('-').map(Number)
        if (yearA !== yearB) return yearB - yearA
        return monthB - monthA
      })
      
      monthKeys.forEach(monthKey => {
        const [yearNum, monthNum] = monthKey.split('-').map(Number)
        const monthData = monthsMap.get(monthKey)
        
        // Calculează dinamica față de luna precedentă
        let dynamics = null
        if (monthNum > 1) {
          const prevMonthKey = `${yearNum}-${monthNum - 1}`
          const prevMonthData = monthsMap.get(prevMonthKey)
          if (prevMonthData) {
            // Calculează dinamica pentru fiecare locație
            const locationDynamics = {}
            locations.forEach(loc => {
              const currentGgr = monthData.locations[loc]?.ggr || 0
              const prevGgr = prevMonthData.locations[loc]?.ggr || 0
              if (prevGgr > 0) {
                locationDynamics[loc] = ((currentGgr - prevGgr) / prevGgr) * 100
              } else {
                locationDynamics[loc] = currentGgr > 0 ? 100 : 0
              }
            })
            dynamics = locationDynamics
          }
        } else if (yearNum > 0) {
          // Luna precedentă este decembrie din anul anterior
          const prevYearMap = yearsMap.get(yearNum - 1)
          if (prevYearMap) {
            const prevMonthKey = `${yearNum - 1}-12`
            const prevMonthData = prevYearMap.get(prevMonthKey)
            if (prevMonthData) {
              const locationDynamics = {}
              locations.forEach(loc => {
                const currentGgr = monthData.locations[loc]?.ggr || 0
                const prevGgr = prevMonthData.locations[loc]?.ggr || 0
                if (prevGgr > 0) {
                  locationDynamics[loc] = ((currentGgr - prevGgr) / prevGgr) * 100
                } else {
                  locationDynamics[loc] = currentGgr > 0 ? 100 : 0
                }
              })
              dynamics = locationDynamics
            }
          }
        }
        
        monthRows.push({
          year: yearNum,
          month: monthNum,
          monthName: monthNames[monthNum - 1],
          locations: monthData.locations,
          dynamics
        })
      })
    })

    return { years, locations, monthRows }
  }, [monthlyData])

  const exportMonthlyTableToExcel = () => {
    try {
      if (!monthlyTableData || monthlyTableData.monthRows.length === 0) {
        toast.error('Nu există date lunare de exportat')
        return
      }
      
      const rows = []
      
      // Header principal
      const headerRow = ['An / Lună']
      monthlyTableData.locations.forEach(loc => {
        headerRow.push(`${loc} - GGR`, `${loc} - Cheltuieli`, `${loc} - Sloturi`)
      })
      rows.push(headerRow)
      
      // Date pentru fiecare an și lună
      monthlyTableData.years.forEach(year => {
        const yearRows = monthlyTableData.monthRows.filter(r => r.year === year)
        
        // Rând pentru an
        const yearRow = [year.toString()]
        monthlyTableData.locations.forEach(() => {
          yearRow.push('', '', '')
        })
        rows.push(yearRow)
        
        // Rânduri pentru fiecare lună
        yearRows.forEach(row => {
          const monthRow = [row.monthName]
          monthlyTableData.locations.forEach(loc => {
            const locationData = row.locations[loc]
            const ggr = locationData?.ggr || 0
            const expenditures = locationData?.expenditures || 0
            const slotsCount = locationData?.slotsCount || 0
            const dynamics = row.dynamics?.[loc]
            
            let ggrValue = ggr
            if (dynamics !== null && dynamics !== undefined) {
              ggrValue = `${ggr} (${dynamics >= 0 ? '+' : ''}${Math.round(dynamics)}%)`
            }
            
            monthRow.push(ggrValue, expenditures, slotsCount)
          })
          rows.push(monthRow)
        })
      })
      
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Tabel Lunare')
      XLSX.writeFile(wb, `Incasari_Tabel_Lunare_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Export Excel realizat cu succes!')
    } catch (error) {
      console.error('Eroare la export Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/incasari/dashboard')}
              className="flex items-center space-x-2 rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700 hover:bg-slate-800/80"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Încasări</span>
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-emerald-500" />
              Tabel Lunare - GGR pe Locații
            </h1>
          </div>
          <button
            onClick={exportMonthlyTableToExcel}
            className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
            title="Exportă în Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filters - Nou Design */}
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl border border-transparent backdrop-blur-2xl">
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
                  placeholder="Caută în Locație, Provider, Cabinet, Game Mix..."
                  className="w-full pl-10 pr-20 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
                />
                {searchText && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                      {(() => {
                        const searchLower = searchText.toLowerCase().trim()
                        const count = monthlyData.filter(item => {
                          const loc = (item.locationName || '').toLowerCase()
                          return loc.includes(searchLower)
                        }).length
                        return `${count} / ${monthlyData.length}`
                      })()}
                    </span>
                  </div>
                )}
                {!searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors opacity-0 pointer-events-none"
                    title="Șterge căutarea"
                  >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre Locație, Provider, Cabinet, Game Mix */}
            <div className="flex items-end gap-3">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Locație
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {filtersMeta.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Provider
                </label>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toți</option>
                  {filtersMeta.providers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Cabinet
                </label>
                <select
                  value={cabinetFilter}
                  onChange={(e) => setCabinetFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {filtersMeta.cabinets.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Game Mix
                </label>
                <select
                  value={gameMixFilter}
                  onChange={(e) => setGameMixFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {filtersMeta.gameMixes.map((gm) => (
                    <option key={gm} value={gm}>
                      {gm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Rând 2: Date Picker Clasic și Comod */}
          <div className="mb-4">
            {/* Input-uri de date + Butoane Rapide - Pe același rând */}
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-wrap">
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
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
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
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-emerald-400 dark:hover:border-emerald-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>

              {/* Butoane Rapide cu Iconițe și Text - Distribuite uniform */}
              <div className="flex items-center gap-2 flex-1 justify-between min-w-0">
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
                      className={`relative flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                      title={btn.label}
                    >
                      <IconComponent className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline truncate">{btn.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>


        {/* Tabel Lunare */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                Se încarcă datele...
              </div>
            ) : monthlyTableData.monthRows.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                Nu există date lunare disponibile
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-1 px-1.5 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-20">
                      An / Lună
                    </th>
                    {monthlyTableData.locations.map(loc => (
                      <React.Fragment key={loc}>
                        <th colSpan="3" className="py-1 px-1.5 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                          {loc}
                        </th>
                      </React.Fragment>
                    ))}
                    <th colSpan="3" className="py-1 px-1.5 text-center font-semibold text-slate-700 dark:text-slate-300 border-l-2 border-slate-400 dark:border-slate-500 bg-slate-200 dark:bg-slate-700">
                      TOTAL
                    </th>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-1 px-1.5 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">
                    </th>
                    {monthlyTableData.locations.map(loc => (
                      <React.Fragment key={loc}>
                        <th className="py-0.5 px-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
                          GGR
                        </th>
                        <th className="py-0.5 px-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                          Cheltuieli
                        </th>
                        <th className="py-0.5 px-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                          Sloturi
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="py-0.5 px-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400 border-l-2 border-slate-400 dark:border-slate-500 bg-slate-200 dark:bg-slate-700">
                      GGR
                    </th>
                    <th className="py-0.5 px-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700">
                      Cheltuieli
                    </th>
                    <th className="py-0.5 px-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700">
                      Sloturi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTableData.years.map(year => {
                    const yearRows = monthlyTableData.monthRows.filter(r => r.year === year)
                    return (
                      <React.Fragment key={year}>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <td colSpan={monthlyTableData.locations.length * 3 + 1} className="py-1 px-1.5 text-left text-slate-900 dark:text-slate-100">
                            {year}
                          </td>
                        </tr>
                        {yearRows.map((row, idx) => {
                          // Calculează totalurile pentru această lună
                          let totalGgr = 0
                          let totalExpenditures = 0
                          let totalSlots = 0
                          
                          monthlyTableData.locations.forEach(loc => {
                            const locationData = row.locations[loc]
                            totalGgr += locationData?.ggr || 0
                            totalExpenditures += locationData?.expenditures || 0
                            totalSlots += locationData?.slotsCount || 0
                          })
                          
                          // Calculează dinamica totală față de luna precedentă
                          let totalDynamics = null
                          let prevTotalGgr = 0
                          
                          if (row.month > 1) {
                            // Luna precedentă este în același an
                            const prevMonthKey = `${row.year}-${row.month - 1}`
                            const prevRow = yearRows.find(r => `${r.year}-${r.month}` === prevMonthKey)
                            if (prevRow) {
                              monthlyTableData.locations.forEach(loc => {
                                const prevLocationData = prevRow.locations[loc]
                                prevTotalGgr += prevLocationData?.ggr || 0
                              })
                              if (prevTotalGgr > 0) {
                                totalDynamics = ((totalGgr - prevTotalGgr) / prevTotalGgr) * 100
                              }
                            }
                          } else if (row.year > 0) {
                            // Prima lună a anului - compară cu decembrie anul anterior
                            const prevYearRows = monthlyTableData.monthRows.filter(r => r.year === row.year - 1 && r.month === 12)
                            if (prevYearRows.length > 0) {
                              const prevRow = prevYearRows[0]
                              monthlyTableData.locations.forEach(loc => {
                                const prevLocationData = prevRow.locations[loc]
                                prevTotalGgr += prevLocationData?.ggr || 0
                              })
                              if (prevTotalGgr > 0) {
                                totalDynamics = ((totalGgr - prevTotalGgr) / prevTotalGgr) * 100
                              }
                            }
                          }
                          
                          return (
                            <tr key={`${row.year}-${row.month}`} className={`${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''} font-bold`}>
                              <td className="py-1 px-1.5 text-left font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                                {row.monthName}
                              </td>
                              {monthlyTableData.locations.map(loc => {
                                const locationData = row.locations[loc]
                                const ggr = locationData?.ggr || 0
                                const expenditures = locationData?.expenditures || 0
                                const slotsCount = locationData?.slotsCount || 0
                                const dynamics = row.dynamics?.[loc]
                                return (
                                  <React.Fragment key={loc}>
                                    <td className="py-1 px-1.5 text-right border-l border-slate-200 dark:border-slate-700">
                                      <div className="flex flex-col items-end">
                                        <span className="text-slate-900 dark:text-slate-100 font-semibold text-xs">
                                          {formatNumber(ggr)}
                                        </span>
                                        {dynamics !== null && dynamics !== undefined && (
                                          <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${
                                            dynamics < 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                                          }`}>
                                            {dynamics < 0 ? (
                                              <TrendingDown className="w-2.5 h-2.5" />
                                            ) : (
                                              <TrendingUp className="w-2.5 h-2.5" />
                                            )}
                                            <span className="font-semibold">
                                              {dynamics >= 0 ? '+' : ''}{Math.round(dynamics)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-1 px-1.5 text-right">
                                      <span className="text-slate-700 dark:text-slate-300 text-xs">
                                        {formatNumber(expenditures)}
                                      </span>
                                    </td>
                                    <td className="py-1 px-1.5 text-right">
                                      <span className="text-slate-700 dark:text-slate-300 text-xs">
                                        {formatNumber(slotsCount)}
                                      </span>
                                    </td>
                                  </React.Fragment>
                                )
                              })}
                              {/* Coloane TOTAL pe același rând */}
                              <td className="py-1 px-1.5 text-right border-l-2 border-slate-400 dark:border-slate-500 bg-slate-200 dark:bg-slate-700">
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                                    {formatNumber(totalGgr)}
                                  </span>
                                  {totalDynamics !== null && totalDynamics !== undefined && (
                                    <div className={`flex items-center gap-0.5 text-[10px] mt-0.5 ${
                                      totalDynamics < 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                                    }`}>
                                      {totalDynamics < 0 ? (
                                        <TrendingDown className="w-2.5 h-2.5" />
                                      ) : (
                                        <TrendingUp className="w-2.5 h-2.5" />
                                      )}
                                      <span className="font-semibold">
                                        {totalDynamics >= 0 ? '+' : ''}{Math.round(totalDynamics)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-1 px-1.5 text-right bg-slate-200 dark:bg-slate-700">
                                <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                                  {formatNumber(totalExpenditures)}
                                </span>
                              </td>
                              <td className="py-1 px-1.5 text-right bg-slate-200 dark:bg-slate-700">
                                <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                                  {formatNumber(totalSlots)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default IncasariMonthly

