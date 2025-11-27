import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { RefreshCw, Plus, Search, Edit, Trash2, Download, ArrowLeft, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

const ExpendituresSlotsMonthly = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [data, setData] = useState([])
  const [summaryData, setSummaryData] = useState(null)
  const [locations, setLocations] = useState([])
  const [availableYears, setAvailableYears] = useState([2024, 2025])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedSummaryYear, setSelectedSummaryYear] = useState(new Date().getFullYear())
  
  // Filters
  const [filters, setFilters] = useState({
    location: 'all',
    year: new Date().getFullYear(),
    month: 'all'
  })
  const [selectedMonths, setSelectedMonths] = useState([]) // Luni selectate cu checkbox-uri
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const scrollPositionRef = useRef(0)
  const shouldRestoreScrollRef = useRef(false)
  const isFilterChangingRef = useRef(false)
  
  // Edit/Add state
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({ slots_count: '', notes: '' })
  const [newForm, setNewForm] = useState({ year: new Date().getFullYear(), month: 1, location_name: '', slots_count: '', notes: '' })
  const [showAddModal, setShowAddModal] = useState(false)

  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]

  // Previne scroll-ul automat când se schimbă filtrele
  useEffect(() => {
    const preventAutoScroll = (e) => {
      if (isFilterChangingRef.current) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }
    
    // Previne scroll-ul automat pe toate evenimentele relevante
    window.addEventListener('scroll', preventAutoScroll, { passive: false, capture: true })
    document.addEventListener('scroll', preventAutoScroll, { passive: false, capture: true })
    
    return () => {
      window.removeEventListener('scroll', preventAutoScroll, { capture: true })
      document.removeEventListener('scroll', preventAutoScroll, { capture: true })
    }
  }, [])
  
  // Salvează poziția de scroll înainte de orice schimbare
  useEffect(() => {
    scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
  })
  
  // Restaurează scroll-ul înainte de paint (useLayoutEffect rulează sincron)
  useLayoutEffect(() => {
    if (shouldRestoreScrollRef.current && scrollPositionRef.current > 0) {
      // Forțează scroll-ul imediat, fără delay
      window.scrollTo(0, scrollPositionRef.current)
      shouldRestoreScrollRef.current = false
      isFilterChangingRef.current = false
    }
  })
  
  // Load cached data first, then fetch fresh
  useEffect(() => {
    // Salvează poziția de scroll înainte de orice schimbare
    scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
    shouldRestoreScrollRef.current = true
    
    const cachedData = localStorage.getItem('slots_monthly_data')
    const cacheKey = `slots_monthly_summary_${selectedSummaryYear}`
    const cachedSummary = localStorage.getItem(cacheKey)
    
    if (cachedData) {
      try {
        setData(JSON.parse(cachedData))
      } catch (e) {
        console.error('Error loading cached data:', e)
      }
    }
    
    if (cachedSummary) {
      try {
        const parsed = JSON.parse(cachedSummary)
        setSummaryData(parsed)
      } catch (e) {
        console.error('Error loading cached summary:', e)
      }
    }
    
    // Fetch datele
    Promise.all([
      fetchData(),
      fetchSummary(),
      fetchLocations(),
      fetchAvailableYears()
    ]).then(() => {
      shouldRestoreScrollRef.current = true
    })
  }, [filters, selectedSummaryYear])
  
  // Actualizează anii disponibili când se schimbă summaryData
  useEffect(() => {
    if (summaryData && summaryData.years && summaryData.years.length > 0) {
      setAvailableYears(summaryData.years)
    }
  }, [summaryData])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = {
        location: filters.location !== 'all' ? filters.location : undefined,
        year: filters.year,
        month: filters.month !== 'all' ? filters.month : undefined,
        search: searchInput || undefined
      }
      
      const response = await axios.get('/api/expenditures/slots-monthly', { params })
      if (response.data.success) {
        setData(response.data.data || [])
        localStorage.setItem('slots_monthly_data', JSON.stringify(response.data.data || []))
      }
    } catch (error) {
      console.error('Error fetching slots monthly:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      // Șterge cache-ul vechi pentru a forța reîncărcarea
      localStorage.removeItem('slots_monthly_summary')
      
      const response = await axios.get('/api/expenditures/slots-monthly/summary', {
        // Forțează reîncărcarea fără cache
        headers: { 'Cache-Control': 'no-cache' },
        params: { _t: Date.now() } // Timestamp pentru a evita cache-ul
      })
      if (response.data.success) {
        setSummaryData(response.data)
        localStorage.setItem('slots_monthly_summary', JSON.stringify(response.data))
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
      toast.error('Eroare la încărcarea centralizatorului')
    }
  }
  

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/expenditures/external-locations')
      if (response.data.success) {
        setLocations(response.data.locations || [])
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchAvailableYears = async () => {
    try {
      const response = await axios.get('/api/expenditures/slots-monthly/years')
      if (response.data.success && response.data.years && response.data.years.length > 0) {
        setAvailableYears(response.data.years)
      }
    } catch (error) {
      console.error('Error fetching available years:', error)
      // Folosește anii din summaryData dacă există
      if (summaryData && summaryData.years && summaryData.years.length > 0) {
        setAvailableYears(summaryData.years)
      }
    }
  }

  const handleSync = async (onlyNew = true) => {
    try {
      setSyncing(true)
      const response = await axios.post('/api/expenditures/slots-monthly/sync-from-incasari', { onlyNew })
      
      if (response.data.success) {
        toast.success(response.data.message || 'Sincronizare completă!')
        // Șterge cache-ul pentru a forța reîncărcarea
        localStorage.removeItem('slots_monthly_data')
        localStorage.removeItem('slots_monthly_summary')
        // Reîncarcă datele și summary-ul în paralel
        await Promise.all([
          fetchData(),
          fetchSummary()
        ])
      }
    } catch (error) {
      console.error('Error syncing:', error)
      toast.error(`Eroare la sincronizare: ${error.response?.data?.error || error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleAdd = async () => {
    try {
      if (!newForm.location_name || !newForm.slots_count) {
        toast.error('Completați toate câmpurile obligatorii')
        return
      }
      
      await axios.post('/api/expenditures/slots-monthly', newForm)
      toast.success('Înregistrare adăugată!')
      setNewForm({ year: new Date().getFullYear(), month: 1, location_name: '', slots_count: '', notes: '' })
      setShowAddModal(false)
      // Șterge cache-ul pentru a forța reîncărcarea
      localStorage.removeItem('slots_monthly_data')
      localStorage.removeItem('slots_monthly_summary')
      // Reîncarcă datele și summary-ul în paralel
      await Promise.all([
        fetchData(),
        fetchSummary(), // Reîncarcă centralizatorul
        fetchAvailableYears() // Actualizează anii disponibili
      ])
    } catch (error) {
      console.error('Error adding record:', error)
      toast.error('Eroare la adăugare')
    }
  }

  const handleEdit = async () => {
    try {
      if (!editingRecord) return
      
      await axios.put(`/api/expenditures/slots-monthly/${editingRecord.id}`, editForm)
      toast.success('Înregistrare actualizată!')
      setEditingRecord(null)
      // Șterge cache-ul pentru a forța reîncărcarea
      localStorage.removeItem('slots_monthly_data')
      localStorage.removeItem('slots_monthly_summary')
      // Reîncarcă datele și summary-ul în paralel
      await Promise.all([
        fetchData(),
        fetchSummary(), // Reîncarcă centralizatorul pentru a reflecta modificările
        fetchAvailableYears() // Actualizează anii disponibili
      ])
    } catch (error) {
      console.error('Error updating record:', error)
      toast.error('Eroare la actualizare')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Sigur vreți să ștergeți această înregistrare?')) return
    
    try {
      await axios.delete(`/api/expenditures/slots-monthly/${id}`)
      toast.success('Înregistrare ștearsă!')
      // Șterge cache-ul pentru a forța reîncărcarea
      localStorage.removeItem('slots_monthly_data')
      localStorage.removeItem('slots_monthly_summary')
      // Reîncarcă datele și summary-ul în paralel
      await Promise.all([
        fetchData(),
        fetchSummary()
      ])
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error('Eroare la ștergere')
    }
  }

  const handleExportExcel = () => {
    if (!summaryData || !summaryData.years) {
      toast.error('Nu există date de exportat')
      return
    }

    const wb = XLSX.utils.book_new()
    const exportData = []
    
    // Header
    const header = ['An / Luna', ...summaryData.locations, 'Total']
    exportData.push(header)
    
    // Year and month rows
    summaryData.years.forEach(year => {
      const yearData = summaryData.data[year] || {}
      
      // Year row
      const yearRow = [year]
      let yearTotal = 0
      summaryData.locations.forEach(loc => {
        let locTotal = 0
        Object.keys(yearData).forEach(month => {
          locTotal += yearData[month]?.[loc] || 0
        })
        yearRow.push(locTotal)
        yearTotal += locTotal
      })
      yearRow.push(yearTotal)
      exportData.push(yearRow)
      
      // Month rows (only months with data)
      const monthsWithData = Object.keys(yearData)
        .map(m => parseInt(m))
        .sort((a, b) => a - b)
      
      monthsWithData.forEach(month => {
        const row = [months[month - 1]]
        let monthTotal = 0
        
        summaryData.locations.forEach(loc => {
          const count = yearData[month]?.[loc] || 0
          row.push(count)
          monthTotal += count
        })
        
        row.push(monthTotal)
        exportData.push(row)
      })
    })
    
    const ws = XLSX.utils.aoa_to_sheet(exportData)
    XLSX.utils.book_append_sheet(wb, ws, 'Sloturi Lunare')
    XLSX.writeFile(wb, `Sloturi_Lunare_Centralizator.xlsx`)
    
    toast.success('Excel exportat cu succes!')
  }

  const filteredData = data
    .filter(item => {
      if (searchInput) {
        const search = searchInput.toLowerCase()
        if (!(
          item.location_name?.toLowerCase().includes(search) ||
          item.notes?.toLowerCase().includes(search)
        )) {
          return false
        }
      }
      
      // Filtrare după luni selectate (dacă există selecții)
      if (selectedMonths.length > 0 && !selectedMonths.includes(item.month)) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      // Sortează crescător pe lună
      if (a.month !== b.month) {
        return a.month - b.month
      }
      // Dacă luna este aceeași, sortează pe locație
      if (a.location_name !== b.location_name) {
        return (a.location_name || '').localeCompare(b.location_name || '')
      }
      // Dacă locația este aceeași, sortează pe an
      return a.year - b.year
    })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenditures')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Tabel Sloturi Lunare
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Gestionare număr sloturi pe lună și locație
              </p>
            </div>
          </div>
        </div>

        {/* Summary Table - Ani și luni pe rânduri, Săli pe coloane */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Centralizator
            </h2>
            <button
              onClick={handleExportExcel}
              disabled={!summaryData || !summaryData.years || summaryData.years.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
          
          {summaryData && summaryData.years && summaryData.years.length > 0 && summaryData.locations && summaryData.locations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left">An / Luna</th>
                    {summaryData.locations.map(loc => (
                      <th key={loc} className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">
                        {loc}
                      </th>
                    ))}
                    <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.years.map(year => {
                    const yearRows = []
                    const yearData = summaryData.data[year] || {}
                    
                    // Adaugă rândul pentru an (doar pe prima coloană)
                    const yearTotal = summaryData.locations.reduce((sum, loc) => {
                      let locTotal = 0
                      Object.keys(yearData).forEach(month => {
                        locTotal += yearData[month]?.[loc] || 0
                      })
                      return sum + locTotal
                    }, 0)
                    
                    yearRows.push(
                      <tr key={`year-${year}`} className="bg-slate-200 dark:bg-slate-700 font-bold">
                        <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">
                          {year}
                        </td>
                        {summaryData.locations.map(loc => {
                          let locTotal = 0
                          Object.keys(yearData).forEach(month => {
                            locTotal += yearData[month]?.[loc] || 0
                          })
                          return (
                            <td key={loc} className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">
                              {locTotal}
                            </td>
                          )
                        })}
                        <td className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">
                          {yearTotal}
                        </td>
                      </tr>
                    )
                    
                    // Adaugă rândurile pentru lunile cu date (sortate crescător)
                    const monthsWithData = Object.keys(yearData)
                      .map(m => parseInt(m))
                      .sort((a, b) => a - b)
                    
                    monthsWithData.forEach(month => {
                      const monthTotal = summaryData.locations.reduce((sum, loc) => 
                        sum + (yearData[month]?.[loc] || 0), 0
                      )
                      
                      yearRows.push(
                        <tr key={`${year}-${month}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="border border-slate-300 dark:border-slate-600 px-4 py-2 font-semibold">
                            {months[month - 1]}
                          </td>
                          {summaryData.locations.map(loc => (
                            <td key={loc} className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">
                              {yearData[month]?.[loc] || 0}
                            </td>
                          ))}
                          <td className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right font-semibold">
                            {monthTotal}
                          </td>
                        </tr>
                      )
                    })
                    
                    return yearRows
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                'Nu există date pentru centralizator. Rulează sincronizarea pentru a popula datele.'
              )}
            </div>
          )}
        </div>

        {/* Main Data Table */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Tabel Sloturi Editabil
          </h2>
          
          {/* Filters */}
          <div className="mb-6 pb-6 border-b border-slate-300 dark:border-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={filters.location}
                onChange={(e) => {
                  isFilterChangingRef.current = true
                  scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                  shouldRestoreScrollRef.current = true
                  setFilters({ ...filters, location: e.target.value })
                  requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current)
                    setTimeout(() => {
                      isFilterChangingRef.current = false
                    }, 100)
                  })
                }}
                onFocus={(e) => {
                  scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                }}
                onBlur={(e) => {
                  requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current)
                  })
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="all">Toate locațiile</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              
              <select
                value={filters.year}
                onChange={(e) => {
                  const savedScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                  isFilterChangingRef.current = true
                  scrollPositionRef.current = savedScroll
                  shouldRestoreScrollRef.current = true
                  setFilters({ ...filters, year: parseInt(e.target.value) })
                  // Restaurează scroll-ul imediat, în mai multe etape
                  setTimeout(() => {
                    window.scrollTo({ top: savedScroll, behavior: 'instant' })
                  }, 0)
                  setTimeout(() => {
                    window.scrollTo({ top: savedScroll, behavior: 'instant' })
                    isFilterChangingRef.current = false
                  }, 50)
                }}
                onFocus={(e) => {
                  scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                  // Previne scroll-ul automat când primește focus
                  e.target.scrollIntoView = () => {}
                }}
                onBlur={(e) => {
                  const savedScroll = scrollPositionRef.current || window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                  setTimeout(() => {
                    window.scrollTo({ top: savedScroll, behavior: 'instant' })
                  }, 0)
                }}
                onMouseDown={(e) => {
                  scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMonthDropdown(!showMonthDropdown)
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 min-w-[150px] text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="text-sm">
                    {selectedMonths.length === 0 
                      ? 'Toate lunile' 
                      : selectedMonths.length === 12 
                        ? 'Toate lunile' 
                        : `${selectedMonths.length} luni selectate`}
                  </span>
                  <span className="ml-2 text-xs">▼</span>
                </button>
                
                {showMonthDropdown && (
                  <>
                    <div 
                      className="absolute z-[10000] mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl min-w-[220px] max-h-80 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                            shouldRestoreScrollRef.current = true
                            if (selectedMonths.length === 12) {
                              setSelectedMonths([])
                            } else {
                              setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
                            }
                          }}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                        >
                          {selectedMonths.length === 12 ? 'Deselectează toate' : 'Selectează toate'}
                        </button>
                      </div>
                      <div className="p-2">
                        {months.map((month, idx) => {
                          const monthNum = idx + 1
                          const isChecked = selectedMonths.includes(monthNum)
                          return (
                            <label 
                              key={monthNum} 
                              className="flex items-center space-x-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-2 rounded transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                                  shouldRestoreScrollRef.current = true
                                  if (e.target.checked) {
                                    setSelectedMonths([...selectedMonths, monthNum])
                                  } else {
                                    setSelectedMonths(selectedMonths.filter(m => m !== monthNum))
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{month}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    {/* Overlay pentru a închide dropdown-ul când se face click în afara lui */}
                    <div 
                      className="fixed inset-0 z-[9999]" 
                      onClick={() => setShowMonthDropdown(false)}
                    />
                  </>
                )}
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Caută..."
                    value={searchInput}
                    onChange={(e) => {
                      scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                      shouldRestoreScrollRef.current = true
                      setSearchInput(e.target.value)
                    }}
                    onFocus={(e) => {
                      scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              
              <button
                onClick={() => handleSync(true)}
                disabled={syncing}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Sincronizează (doar luni noi)</span>
              </button>
              
              <button
                onClick={() => {
                  setNewForm({ year: filters.year, month: filters.month !== 'all' ? parseInt(filters.month) : 1, location_name: '', slots_count: '', notes: '' })
                  setShowAddModal(true)
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left">LOCATIE</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left">AN</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left">LUNA</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">NUMAR SLOTURI</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left">SURSĂ</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left">NOTE</th>
                  <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-center">ACTIUNI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">
                      Nu există date
                    </td>
                  </tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">{item.location_name}</td>
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">{item.year}</td>
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">{months[item.month - 1]}</td>
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-right">{item.slots_count}</td>
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">
                        {item.source === 'cyber' ? 'Cyber' : (() => {
                          const editorName = item.updated_by_name || item.created_by_name
                          const editDate = item.updated_at || item.created_at
                          if (editorName && editDate) {
                            try {
                              // Datele din PostgreSQL sunt în UTC
                              // Adaugă manual +2 ore pentru România (UTC+2) - exact ca în header bar
                              const date = new Date(editDate)
                              const romaniaTime = new Date(date.getTime() + (2 * 60 * 60 * 1000)) // UTC+2
                              
                              // Folosim aceeași metodă ca în Layout.jsx (toLocaleString cu ro-RO)
                              const formatted = romaniaTime.toLocaleString('ro-RO', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })
                              
                              // Format: "DD.MM.YYYY, HH:MM" -> "DD.MM.YYYY HH:MM"
                              const formattedDate = formatted.replace(', ', ' ')
                              return `Edited by ${editorName} - ${formattedDate}`
                            } catch (error) {
                              console.error('Error formatting date:', error, editDate)
                              return editorName ? `Edited by ${editorName}` : 'Edited'
                            }
                          }
                          return editorName ? `Edited by ${editorName}` : 'Edited'
                        })()}
                      </td>
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">{item.notes || '-'}</td>
                      <td className="border border-slate-300 dark:border-slate-600 px-4 py-2">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingRecord(item)
                              setEditForm({ slots_count: item.slots_count, notes: item.notes || '' })
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Editare înregistrare</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Număr sloturi</label>
                  <input
                    type="number"
                    value={editForm.slots_count}
                    onChange={(e) => setEditForm({ ...editForm, slots_count: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Note</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleEdit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Salvează
                  </button>
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="flex-1 px-4 py-2 bg-slate-300 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-400"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Adaugă înregistrare</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Locație</label>
                  <select
                    value={newForm.location_name}
                    onChange={(e) => setNewForm({ ...newForm, location_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">Selectează locația</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">An</label>
                  <input
                    type="number"
                    value={newForm.year}
                    onChange={(e) => setNewForm({ ...newForm, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lună</label>
                  <select
                    value={newForm.month}
                    onChange={(e) => setNewForm({ ...newForm, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    {months.map((month, idx) => (
                      <option key={idx + 1} value={idx + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Număr sloturi</label>
                  <input
                    type="number"
                    value={newForm.slots_count}
                    onChange={(e) => setNewForm({ ...newForm, slots_count: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Note</label>
                  <textarea
                    value={newForm.notes}
                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAdd}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Adaugă
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setNewForm({ year: new Date().getFullYear(), month: 1, location_name: '', slots_count: '', notes: '' })
                    }}
                    className="flex-1 px-4 py-2 bg-slate-300 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-400"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ExpendituresSlotsMonthly
