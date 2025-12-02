import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FileSpreadsheet, ArrowLeft, Clock, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'

const IncasariOperational = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { locations } = useData()

  const [operationalData, setOperationalData] = useState([])
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
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' sau 'desc'
  const [expandedMonths, setExpandedMonths] = useState(new Set()) // Set de chei "year-month"
  const [expandedLocations, setExpandedLocations] = useState(new Set()) // Set de chei "year-month-locationId"
  const [locationData, setLocationData] = useState({}) // { "year-month": [...locations] }
  const [providerCabinetData, setProviderCabinetData] = useState({}) // { "year-month-locationId": [...providers/cabinets] }
  const [loadingLocations, setLoadingLocations] = useState({}) // { "year-month": true/false }
  const [loadingProviders, setLoadingProviders] = useState({}) // { "year-month-locationId": true/false }

  // Funcție pentru schimbarea perioadei (pentru QuickDateButtons)
  const handleDateChange = (newRange) => {
    setDateRange(newRange)
  }

  // Funcție pentru formatare număr
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return Number(num).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Funcție pentru sortare
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Dacă se face click pe aceeași coloană, schimbă direcția
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Dacă se face click pe o coloană nouă, setează coloana și direcția asc
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Funcție pentru expand/collapse lună
  const toggleMonth = async (year, month) => {
    const key = `${year}-${month}`
    const newExpanded = new Set(expandedMonths)
    
    if (newExpanded.has(key)) {
      // Collapse - șterge și datele pentru locații
      newExpanded.delete(key)
      setExpandedMonths(newExpanded)
      // Șterge datele pentru locații
      const newLocationData = { ...locationData }
      delete newLocationData[key]
      setLocationData(newLocationData)
      // Șterge și datele pentru provider/cabinet
      const newProviderData = { ...providerCabinetData }
      Object.keys(newProviderData).forEach(k => {
        if (k.startsWith(key + '-')) {
          delete newProviderData[k]
        }
      })
      setProviderCabinetData(newProviderData)
    } else {
      // Expand - încarcă datele pentru locații
      newExpanded.add(key)
      setExpandedMonths(newExpanded)
      
      setLoadingLocations(prev => ({ ...prev, [key]: true }))
      try {
        const response = await axios.get('/api/incasari/operational-by-location', {
          params: { year, month }
        })
        if (response.data && response.data.success) {
          setLocationData(prev => ({
            ...prev,
            [key]: response.data.rows || []
          }))
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea datelor pe locații:', error)
        toast.error('Eroare la încărcarea datelor')
      } finally {
        setLoadingLocations(prev => ({ ...prev, [key]: false }))
      }
    }
  }

  // Funcție pentru expand/collapse locație
  const toggleLocation = async (year, month, locationId) => {
    const key = `${year}-${month}-${locationId}`
    const newExpanded = new Set(expandedLocations)
    
    if (newExpanded.has(key)) {
      // Collapse
      newExpanded.delete(key)
      setExpandedLocations(newExpanded)
      // Șterge datele pentru provider/cabinet
      const newProviderData = { ...providerCabinetData }
      delete newProviderData[key]
      setProviderCabinetData(newProviderData)
    } else {
      // Expand - încarcă datele pentru provider/cabinet
      newExpanded.add(key)
      setExpandedLocations(newExpanded)
      
      setLoadingProviders(prev => ({ ...prev, [key]: true }))
      try {
        const response = await axios.get('/api/incasari/operational-by-provider-cabinet', {
          params: { year, month, locationId }
        })
        if (response.data && response.data.success) {
          setProviderCabinetData(prev => ({
            ...prev,
            [key]: response.data.rows || []
          }))
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea datelor pe provider/cabinet:', error)
        toast.error('Eroare la încărcarea datelor')
      } finally {
        setLoadingProviders(prev => ({ ...prev, [key]: false }))
      }
    }
  }

  // Funcție pentru încărcarea datelor operational
  const loadOperationalData = async () => {
    try {
      setLoading(true)
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
      
      const response = await axios.get('/api/incasari/operational', { params })
      
      if (response.data && response.data.success) {
        setOperationalData(response.data.rows || [])
      } else {
        console.error('❌ Răspuns invalid de la server:', response.data)
        toast.error('Răspuns invalid de la server')
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea datelor operational:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  // Încarcă metadata pentru filtre
  useEffect(() => {
    const loadFiltersMeta = async () => {
      try {
        const response = await axios.get('/api/incasari/filters-metadata')
        if (response.data && response.data.success) {
          setFiltersMeta({
            locations: response.data.locations || [],
            providers: response.data.providers || [],
            cabinets: response.data.cabinets || [],
            gameMixes: response.data.gameMixes || []
          })
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea metadata pentru filtre:', error)
      }
    }
    loadFiltersMeta()
  }, [])

  // Încarcă datele când se schimbă filtrele sau perioada
  useEffect(() => {
    loadOperationalData()
  }, [locationFilter, providerFilter, cabinetFilter, gameMixFilter, dateRange])

  // Procesează datele pentru tabel cu filtrare după perioadă
  const tableData = useMemo(() => {
    if (!operationalData || operationalData.length === 0) {
      return { years: [], monthRows: [], yearTotals: {} }
    }

    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ]

    // Filtrează datele după perioadă
    const startDate = new Date(dateRange.startDate + 'T00:00:00')
    const endDate = new Date(dateRange.endDate + 'T23:59:59')
    
    const filteredData = operationalData.filter((row) => {
      // Creează data pentru prima zi a lunii
      const rowDate = new Date(row.year, row.month - 1, 1)
      // Compară doar anul și luna
      const startYear = startDate.getFullYear()
      const startMonth = startDate.getMonth() + 1
      const endYear = endDate.getFullYear()
      const endMonth = endDate.getMonth() + 1
      
      if (row.year < startYear || row.year > endYear) {
        return false
      }
      if (row.year === startYear && row.month < startMonth) {
        return false
      }
      if (row.year === endYear && row.month > endMonth) {
        return false
      }
      return true
    })

    // Grupează pe ani
    const yearsMap = new Map()
    filteredData.forEach((row) => {
      const year = row.year
      if (!yearsMap.has(year)) {
        yearsMap.set(year, [])
      }
      yearsMap.get(year).push({
        ...row,
        monthName: monthNames[row.month - 1] || `Luna ${row.month}`
      })
    })

    // Sortează anii descrescător
    const years = Array.from(yearsMap.keys()).sort((a, b) => b - a)

    // Sortează luni în fiecare an (descrescător)
    years.forEach(year => {
      yearsMap.get(year).sort((a, b) => b.month - a.month)
    })

    // Calculează totalurile pentru fiecare an
    const yearTotals = {}
    years.forEach(year => {
      const yearRows = yearsMap.get(year)
      yearTotals[year] = {
        in: yearRows.reduce((sum, row) => sum + (row.in || 0), 0),
        out: yearRows.reduce((sum, row) => sum + (row.out || 0), 0),
        win: yearRows.reduce((sum, row) => sum + (row.win || 0), 0),
        bet: yearRows.reduce((sum, row) => sum + (row.bet || 0), 0),
        ggr: yearRows.reduce((sum, row) => sum + (row.ggr || 0), 0),
        jackpots: yearRows.reduce((sum, row) => sum + (row.jackpots || 0), 0),
        raffles: yearRows.reduce((sum, row) => sum + (row.raffles || 0), 0),
        hh: yearRows.reduce((sum, row) => sum + (row.hh || 0), 0),
        cashbackReal: yearRows.reduce((sum, row) => sum + (row.cashbackReal || 0), 0),
        marketing: yearRows.reduce((sum, row) => sum + (row.marketing || 0), 0)
      }
    })

    // Creează rândurile pentru tabel
    const monthRows = []
    years.forEach(year => {
      const yearRows = yearsMap.get(year)
      yearRows.forEach(row => {
        monthRows.push({
          year: row.year,
          month: row.month,
          monthName: row.monthName,
          in: row.in || 0,
          out: row.out || 0,
          win: row.win || 0,
          bet: row.bet || 0,
          ggr: row.ggr || 0,
          jackpots: row.jackpots || 0,
          raffles: row.raffles || 0,
          hh: row.hh || 0,
          cashbackReal: row.cashbackReal || 0,
          marketing: row.marketing || 0
        })
      })
    })

    // Aplică sortarea dacă este selectată o coloană
    if (sortColumn) {
      monthRows.sort((a, b) => {
        let aVal = a[sortColumn]
        let bVal = b[sortColumn]
        
        // Pentru sortare după lună, folosim year și month
        if (sortColumn === 'monthName') {
          aVal = a.year * 12 + a.month
          bVal = b.year * 12 + b.month
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return { years, monthRows, yearTotals }
  }, [operationalData, dateRange, sortColumn, sortDirection])

  // Export Excel
  const exportToExcel = () => {
    if (!tableData || tableData.monthRows.length === 0) {
      toast.error('Nu există date de exportat')
      return
    }

    const wsData = [
      ['An', 'Lună', 'In', 'OUT', 'WIN', 'BET', 'GGR', 'Jackpots', 'Raffles', 'HH', 'Cashback Real', 'Marketing']
    ]

    tableData.years.forEach(year => {
      const totals = tableData.yearTotals[year] || {}
      // Rând cu totalul anului
      wsData.push([
        year,
        'TOTAL',
        totals.in || 0,
        totals.out || 0,
        totals.win || 0,
        totals.bet || 0,
        totals.ggr || 0,
        totals.jackpots || 0,
        totals.raffles || 0,
        totals.hh || 0,
        totals.cashbackReal || 0,
        totals.marketing || 0
      ])
      
      // Rândurile cu lunile
      const yearRows = tableData.monthRows.filter(r => r.year === year)
      yearRows.forEach((row) => {
        wsData.push([
          '',
          row.monthName,
          row.in || 0,
          row.out || 0,
          row.win || 0,
          row.bet || 0,
          row.ggr || 0,
          row.jackpots || 0,
          row.raffles || 0,
          row.hh || 0,
          row.cashbackReal || 0,
          row.marketing || 0
        ])
      })
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Operational')
    XLSX.writeFile(wb, `Incasari_Operational_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Export Excel realizat cu succes!')
  }

  if (!user) {
    return <Layout><div>Se încarcă...</div></Layout>
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/incasari/dashboard')}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Înapoi la Încasări"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-emerald-500" />
              Operational
            </h1>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
            title="Exportă în Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filtre timp + Locație / Provider / Cabinet / Game Mix */}
        {/* Rând 1: butoane perioadă rapidă (stânga) + filtre locații (dreapta) */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <QuickDateButtons onChange={handleDateChange} />
          </div>
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700"
            >
              <option value="all">Locație: Toate</option>
              {filtersMeta.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700"
            >
              <option value="all">Provider: Toți</option>
              {filtersMeta.providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={cabinetFilter}
              onChange={(e) => setCabinetFilter(e.target.value)}
              className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700"
            >
              <option value="all">Cabinet: Toate</option>
              {filtersMeta.cabinets.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={gameMixFilter}
              onChange={(e) => setGameMixFilter(e.target.value)}
              className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700"
            >
              <option value="all">Game mix: Toate</option>
              {filtersMeta.gameMixes.map((gm) => (
                <option key={gm} value={gm}>
                  {gm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rând 2: DateRangeSelector + text Perioadă pe același rând */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="min-w-[260px] max-w-md">
            <DateRangeSelector
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(newRange) => {
                setDateRange(newRange)
              }}
            />
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
            Perioadă: <span className="font-semibold ml-1">{dateRange.startDate}</span> –{' '}
            <span className="font-semibold">{dateRange.endDate}</span>
          </div>
        </div>

        {/* Tabel Operational */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                Se încarcă datele...
              </div>
            ) : !tableData || tableData.monthRows.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                Nu există date disponibile
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th 
                      className="py-2 px-3 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('monthName')}
                    >
                      <div className="flex items-center gap-1">
                        <span>An / Lună</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'monthName' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('in')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>In</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'in' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('out')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>OUT</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'out' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('win')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>WIN</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'win' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('bet')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>BET</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'bet' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('ggr')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>GGR</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'ggr' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('jackpots')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Jackpots</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'jackpots' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('raffles')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Raffles</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'raffles' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('hh')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>HH</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'hh' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('cashbackReal')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Cashback Real</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'cashbackReal' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('marketing')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Marketing</span>
                        <Clock className="w-3 h-3" />
                        {sortColumn === 'marketing' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.years.map(year => {
                    const yearRows = tableData.monthRows.filter(r => r.year === year)
                    const totals = tableData.yearTotals[year] || {}
                    return (
                      <React.Fragment key={year}>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <td className="py-1 px-3 text-left text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                            {year}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.in)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.out)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.win)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.bet)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.ggr)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.jackpots)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.raffles)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.hh)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.cashbackReal)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatNumber(totals.marketing)}
                          </td>
                        </tr>
                        {yearRows.map((row, idx) => {
                          const monthKey = `${row.year}-${row.month}`
                          const isExpanded = expandedMonths.has(monthKey)
                          const locations = locationData[monthKey] || []
                          const isLoadingLocations = loadingLocations[monthKey]
                          
                          return (
                            <React.Fragment key={`${row.year}-${row.month}`}>
                              <tr
                                className={`${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''} cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
                                onClick={() => toggleMonth(row.year, row.month)}
                              >
                                <td className="py-2 px-3 text-left font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                    <span>{row.monthName}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.in)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.out)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.win)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.bet)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.ggr)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.jackpots)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.raffles)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.hh)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.cashbackReal)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                  {formatNumber(row.marketing)}
                                </td>
                              </tr>
                              {/* Rânduri expandate - Locații */}
                              {isExpanded && (
                                <>
                                  {isLoadingLocations ? (
                                    <tr>
                                      <td colSpan={11} className="py-2 px-3 text-center text-slate-500 dark:text-slate-400">
                                        Se încarcă locațiile...
                                      </td>
                                    </tr>
                                  ) : locations.length > 0 ? (
                                    locations.map((loc, locIdx) => {
                                      const locationKey = `${monthKey}-${loc.locationId}`
                                      const isLocationExpanded = expandedLocations.has(locationKey)
                                      const providers = providerCabinetData[locationKey] || []
                                      const isLoadingProviders = loadingProviders[locationKey]
                                      
                                      return (
                                        <React.Fragment key={`loc-${loc.locationId}`}>
                                          <tr
                                            className="bg-slate-100 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              toggleLocation(row.year, row.month, loc.locationId)
                                            }}
                                          >
                                            <td className="py-2 px-3 text-left font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-inherit z-10 whitespace-nowrap pl-8">
                                              <div className="flex items-center gap-2">
                                                {isLocationExpanded ? (
                                                  <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                  <ChevronRight className="w-4 h-4" />
                                                )}
                                                <span>{loc.locationName}</span>
                                              </div>
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.in)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.out)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.win)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.bet)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.ggr)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.jackpots)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.raffles)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.hh)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.cashbackReal)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                              {formatNumber(loc.marketing)}
                                            </td>
                                          </tr>
                                          {/* Rânduri expandate - Provider/Cabinet */}
                                          {isLocationExpanded && (
                                            <>
                                              {isLoadingProviders ? (
                                                <tr>
                                                  <td colSpan={11} className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 pl-12">
                                                    Se încarcă provideri/cabinete...
                                                  </td>
                                                </tr>
                                              ) : providers.length > 0 ? (
                                                providers.map((pc, pcIdx) => (
                                                  <tr
                                                    key={`pc-${pcIdx}`}
                                                    className="bg-slate-200 dark:bg-slate-700/50"
                                                  >
                                                    <td className="py-2 px-3 text-left font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-inherit z-10 whitespace-nowrap pl-16">
                                                      {pc.cabinet} {pc.provider ? `(${pc.provider})` : ''}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.in)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.out)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.win)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.bet)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.ggr)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.jackpots)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.raffles)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.hh)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.cashbackReal)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                                                      {formatNumber(pc.marketing)}
                                                    </td>
                                                  </tr>
                                                ))
                                              ) : (
                                                <tr>
                                                  <td colSpan={11} className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 pl-12">
                                                    Nu există date pentru provider/cabinet
                                                  </td>
                                                </tr>
                                              )}
                                            </>
                                          )}
                                        </React.Fragment>
                                      )
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={11} className="py-2 px-3 text-center text-slate-500 dark:text-slate-400">
                                        Nu există locații disponibile
                                      </td>
                                    </tr>
                                  )}
                                </>
                              )}
                            </React.Fragment>
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

export default IncasariOperational

