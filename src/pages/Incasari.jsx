import React, { useState, useEffect, useMemo, useRef } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Table2, Settings, TrendingUp, TrendingDown, MapPin, FileSpreadsheet, Download, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'
// Cache dezactivat temporar - folosim axios direct
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts'

// Verifică dacă un overview are măcar o valoare nenulă,
// ca să nu suprascriem date valide cu un răspuns gol (toate 0).
const hasNonZeroOverview = (ov) => {
  if (!ov) return false
  const rows = [ov.today, ov.yesterday, ov.currentMonth, ov.lastMonth, ov.currentYear].filter(
    Boolean
  )
  return rows.some((row) => {
    if (!row) return false
    const vals = [
      row.in,
      row.out,
      row.profit,
      row.bet,
      row.win,
      row.jackpot,
      row.hh,
      row.cb_real,
      row.cb_birthday,
      row.cb_raffle,
      row.ggr,
      row.pos
    ]
    return vals.some((v) => Number(v || 0) !== 0)
  })
}

// Verifică dacă un rând specific are date nenule
const hasNonZeroRow = (row) => {
  if (!row) return false
  const vals = [
    row.in,
    row.out,
    row.profit,
    row.ggr,
    row.bet,
    row.win,
    row.jackpot,
    row.hh,
    row.cb_real,
    row.cb_birthday,
    row.cb_raffle,
    row.pos
  ]
  return vals.some((v) => Number(v || 0) !== 0)
}

const Incasari = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

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

  const [summary, setSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    totalProfit: 0,
    totalBet: 0,
    totalWin: 0,
    winBetPercent: 0,
    daysCount: 0,
    slotsCount: 0,
    averageDrop: 0
  })
  const [dailyStats, setDailyStats] = useState([])
  const [locationDailyData, setLocationDailyData] = useState([])
  const [loading, setLoading] = useState(false)
  const [avgInByLocation, setAvgInByLocation] = useState([])
  const [avgInByCabinet, setAvgInByCabinet] = useState([])
  const [locationExpenditures, setLocationExpenditures] = useState([])
  const [slotsByMonthLocation, setSlotsByMonthLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_slots_by_month_location_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Verifică dacă cache-ul este pentru anul curent
        const currentYear = new Date().getFullYear()
        if (parsed.year === currentYear) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return {
      year: new Date().getFullYear(),
      locations: [],
      monthData: {}
    }
  })
  const [ggrByMonthLocation, setGgrByMonthLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_ggr_by_month_location_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Verifică dacă cache-ul este pentru anul curent
        const currentYear = new Date().getFullYear()
        if (parsed.year === currentYear) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return {
      year: new Date().getFullYear(),
      locations: [],
      monthData: {}
    }
  })
  const [overview, setOverview] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_overview_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Asigură-te că câmpurile dinamice sunt încărcate corect
        try {
          const todaySaved = localStorage.getItem('incasari_overview_today')
          const currentMonthSaved = localStorage.getItem('incasari_overview_currentMonth')
          const currentYearSaved = localStorage.getItem('incasari_overview_currentYear')
          if (todaySaved) parsed.today = JSON.parse(todaySaved)
          if (currentMonthSaved) parsed.currentMonth = JSON.parse(currentMonthSaved)
          if (currentYearSaved) parsed.currentYear = JSON.parse(currentYearSaved)
        } catch {
          // ignore
        }
        return parsed
      }
    } catch {
      // ignore
    }
    return {
      today: {},
      yesterday: {},
      currentMonth: {},
      lastMonth: {},
      currentYear: {},
      dayBeforeYesterday: {},
      previousMonth: {},
      lastYear: {},
      sameDaysLastMonth: {}
    }
  })
  const [dynamics, setDynamics] = useState({
    currentMonthDays: { in: 0, profit: 0 },
    lastMonthSameDays: { in: 0, profit: 0 },
    inChange: 0,
    profitChange: 0
  })
  const [estimatedProfit, setEstimatedProfit] = useState({ estimatedProfit: 0, daysUsed: 0 })
  const [posData, setPosData] = useState([])
  const [currentMonthData, setCurrentMonthData] = useState([])
  const [lastMonthSameDaysData, setLastMonthSameDaysData] = useState([])
  const [filtersMeta, setFiltersMeta] = useState({
    locations: [],
    providers: [],
    cabinets: [],
    gameMixes: []
  })
  const [locationFilter, setLocationFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_location_filter')
      return saved || 'all'
    } catch {
      return 'all'
    }
  })
  const [providerFilter, setProviderFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_provider_filter')
      return saved || 'all'
    } catch {
      return 'all'
    }
  })
  const [cabinetFilter, setCabinetFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_cabinet_filter')
      return saved || 'all'
    } catch {
      return 'all'
    }
  })
  const [gameMixFilter, setGameMixFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_gameMix_filter')
      return saved || 'all'
    } catch {
      return 'all'
    }
  })

  // Salvare filtre în localStorage când se schimbă
  useEffect(() => {
    localStorage.setItem('incasari_location_filter', locationFilter)
  }, [locationFilter])
  
  useEffect(() => {
    localStorage.setItem('incasari_provider_filter', providerFilter)
  }, [providerFilter])
  
  useEffect(() => {
    localStorage.setItem('incasari_cabinet_filter', cabinetFilter)
  }, [cabinetFilter])
  
  useEffect(() => {
    localStorage.setItem('incasari_gameMix_filter', gameMixFilter)
  }, [gameMixFilter])
  const [visibleLocations, setVisibleLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_visible_locations')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState({
    running: false,
    startTime: null,
    endTime: null,
    output: ''
  })
  const [isRefreshing, setIsRefreshing] = useState(false) // Indicator pentru refresh tabel
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc' // 'asc' sau 'desc'
  })
  const [centralizerExpanded, setCentralizerExpanded] = useState(new Set())

  useEffect(() => {
    if (!user) return

    if (!user.permissions?.incasari) {
      toast.error('Nu aveți permisiuni pentru pagina Încasări')
      navigate('/dashboard')
      return
    }
  }, [user, navigate])

  // Ascultă schimbările listelor de locații vizibile din pagina de setări Încasări
  useEffect(() => {
    const handleVisibleLocationsChanged = () => {
      try {
        const saved = localStorage.getItem('incasari_visible_locations')
        setVisibleLocations(saved ? JSON.parse(saved) : [])
      } catch {
        // ignore
      }
    }

    window.addEventListener('incasari-visible-locations-changed', handleVisibleLocationsChanged)
    return () =>
      window.removeEventListener('incasari-visible-locations-changed', handleVisibleLocationsChanged)
  }, [])

  // Poll sync status while modal este deschis
  useEffect(() => {
    if (!syncModalOpen) return

    let isCancelled = false

    const fetchStatus = async () => {
      try {
        const resp = await axios.get('/api/incasari/sync-status')
        if (!resp.data?.success) return
        if (isCancelled) return
        setSyncStatus({
          running: !!resp.data.running,
          startTime: resp.data.startTime || null,
          endTime: resp.data.endTime || null,
          output: resp.data.output || ''
        })
      } catch (error) {
        console.error('❌ Eroare la citirea statusului de sincronizare încasări:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [syncModalOpen])

  // Load meta-date pentru filtre (locații / provideri / cabinete / game-mix)
  useEffect(() => {
    const abortController = new AbortController()
    
    const normalizeLocationName = (name) => {
      if (!name) return ''
      let n = name.toString().trim()
      // Elimină sufixe de tip E.S / E.S. / ES
      n = n.replace(/\s+E\.?S\.?$/i, '')
      return n.trim()
    }

    const loadFilters = async () => {
      try {
        const resp = await axios.get('/api/incasari/filters-metadata', {
          signal: abortController.signal
        })
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
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea meta-datelor pentru filtre încasări:', error)
        }
      }
    }
    loadFilters()
    
    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchSummary = async () => {
      try {
        const { startDate, endDate } = dateRange
        if (!startDate || !endDate) return

        const params = {
          startDate,
          endDate,
          location: locationFilter !== 'all' ? locationFilter : undefined,
          provider: providerFilter !== 'all' ? providerFilter : undefined,
          cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
          gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined,
          includeLocations:
            visibleLocations && visibleLocations.length > 0
              ? visibleLocations.join(',')
              : undefined
        }

        const response = await axios.get('/api/incasari/summary', { 
          params,
          signal: abortController.signal
        })

        if (response.data?.success) {
          setSummary({
            totalIn: response.data.totalIn || 0,
            totalOut: response.data.totalOut || 0,
            totalProfit: response.data.totalProfit || 0,
            totalBet: response.data.totalBet || 0,
            totalWin: response.data.totalWin || 0,
            winBetPercent: response.data.winBetPercent || 0,
            daysCount: response.data.daysCount || 0,
            slotsCount: response.data.slotsCount || 0,
            averageDrop: response.data.averageDrop || 0
          })
        } else {
          console.error('Eroare la /incasari/summary:', response.data)
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea sumarului de încasări:', error)
        }
      }
    }

    fetchSummary()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange, locationFilter, providerFilter, cabinetFilter, gameMixFilter])

  // Fetch cheltuieli pe locații pentru P&L (perioada selectată, respectând locațiile vizibile)
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchLocationExpenditures = async () => {
      try {
        const { startDate, endDate } = dateRange
        if (!startDate || !endDate) return

        const resp = await axios.get('/api/incasari/location-expenditures', {
          params: {
            startDate,
            endDate,
            includeLocations:
              visibleLocations && visibleLocations.length > 0
                ? visibleLocations.join(',')
                : undefined
          },
          signal: abortController.signal
        })

        if (resp.data?.success) {
          setLocationExpenditures(resp.data.rows || [])
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea cheltuielilor pe locații pentru P&L:', error)
        }
      }
    }

    fetchLocationExpenditures()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange, visibleLocations])

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchDailyStats = async () => {
      try {
        const { startDate, endDate } = dateRange
        if (!startDate || !endDate) return
        setLoading(true)

        const params = {
          startDate,
          endDate,
          location: locationFilter !== 'all' ? locationFilter : undefined,
          provider: providerFilter !== 'all' ? providerFilter : undefined,
          cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
          gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined,
          includeLocations:
            visibleLocations && visibleLocations.length > 0
              ? visibleLocations.join(',')
              : undefined
        }

        const resp = await axios.get('/api/incasari/daily-stats', { 
          params,
          signal: abortController.signal
        })

        if (resp.data?.success) {
          setDailyStats(resp.data.rows || [])
        } else {
          console.error('Eroare la /incasari/daily-stats:', resp.data)
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea daily-stats:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDailyStats()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange, locationFilter, providerFilter, cabinetFilter, gameMixFilter, visibleLocations])

  // Fetch location-daily pentru tabelul centralizator
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchLocationDaily = async () => {
      try {
        const { startDate, endDate } = dateRange
        if (!startDate || !endDate) return

        const resp = await axios.get('/api/incasari/location-daily', {
          params: {
            startDate,
            endDate,
            includeLocations:
              visibleLocations && visibleLocations.length > 0
                ? visibleLocations.join(',')
                : undefined
          },
          signal: abortController.signal
        })

        if (resp.data?.success) {
          setLocationDailyData(resp.data.rows || [])
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea location-daily:', error)
        }
      }
    }

    fetchLocationDaily()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange, visibleLocations])

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchPieData = async () => {
      try {
        const { startDate, endDate } = dateRange
        if (!startDate || !endDate) return

        const commonParams = {
          startDate,
          endDate,
          location: locationFilter !== 'all' ? locationFilter : undefined,
          provider: providerFilter !== 'all' ? providerFilter : undefined,
          cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
          gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined,
          includeLocations:
            visibleLocations && visibleLocations.length > 0
              ? visibleLocations.join(',')
              : undefined
        }

        const [locResp, cabResp] = await Promise.all([
          axios.get('/api/incasari/avg-in-by-location', { 
            params: commonParams,
            signal: abortController.signal
          }),
          axios.get('/api/incasari/avg-in-by-cabinet', { 
            params: commonParams,
            signal: abortController.signal
          })
        ])

        if (locResp.data?.success) {
          setAvgInByLocation(locResp.data.rows || [])
        }
        if (cabResp.data?.success) {
          setAvgInByCabinet(cabResp.data.rows || [])
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea datelor pentru pie charts încasări:', error)
        }
      }
    }

    fetchPieData()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange, locationFilter, providerFilter, cabinetFilter, gameMixFilter, visibleLocations])

  // Auto-sync cu Cyber la pornirea paginii
  useEffect(() => {
    const checkAndSync = async () => {
      try {
        // Mai întâi verifică dacă există deja o sincronizare în curs
        const statusResp = await axios.get('/api/incasari/sync-status')
        if (statusResp.data?.running) {
          console.log('⏳ Sincronizare deja în curs, așteptăm finalizarea...')
          return // Nu pornim o nouă sincronizare
        }
        
        // Dacă nu rulează nimic, pornim sincronizarea
        console.log('🔄 Pornire auto-sync cu Cyber...')
        const resp = await axios.post('/api/incasari/sync')
        if (resp.data?.success) {
          console.log('✅ Auto-sync pornit cu succes')
          // Nu afișăm toast pentru refresh automat
        }
      } catch (error) {
        // Ignorăm eroarea 400 (sincronizare deja în curs)
        if (error.response?.status === 400) {
          console.log('⏳ Sincronizare deja în curs')
        } else {
          console.error('❌ Eroare la auto-sync:', error)
        }
      }
    }
    
    // Verifică și pornește sync-ul după 2 secunde (să se încarce pagina)
    const timeoutId = setTimeout(checkAndSync, 2000)
    
    return () => clearTimeout(timeoutId)
  }, []) // Array gol - rulează doar o dată

  // Ref pentru AbortController pentru fetchOverview
  const overviewAbortControllerRef = useRef(null)
  
  // Funcția de fetch overview - o definim în afara useEffect pentru a o putea folosi și manual
  const fetchOverview = async (showRefreshIndicator = false, forceRefresh = false) => {
      // Anulează request-ul anterior dacă există
      if (overviewAbortControllerRef.current) {
        overviewAbortControllerRef.current.abort()
      }
      
      // Creează un nou AbortController
      overviewAbortControllerRef.current = new AbortController()
      const abortController = overviewAbortControllerRef.current
      
      try {
        if (showRefreshIndicator) {
          setIsRefreshing(true)
        }
        
        // Verifică cache-ul dacă nu forțăm refresh
        if (!forceRefresh) {
          const cacheKey = 'incasari_overview_cache_timestamp'
          const lastFetch = localStorage.getItem(cacheKey)
          const now = Date.now()
          const fiveMinutes = 5 * 60 * 1000
          
          if (lastFetch && (now - parseInt(lastFetch)) < fiveMinutes) {
            console.log('📦 Folosim cache pentru overview (mai puțin de 5 minute)')
            if (showRefreshIndicator) {
              setTimeout(() => setIsRefreshing(false), 500)
            }
            return
          }
        }
        
        const response = await axios.get('/api/incasari/overview', {
          params: {
            includeLocations:
              visibleLocations && visibleLocations.length > 0
                ? visibleLocations.join(',')
                : undefined
          },
          signal: abortController.signal
        })
        if (response.data?.success) {
          const newOverview = response.data
          console.log('📊 Date primite din backend:', {
            today: newOverview.today,
            yesterday: newOverview.yesterday,
            currentMonth: newOverview.currentMonth
          })
          
          setOverview((prev) => {
            // IMPORTANT: Datele dinamice (today, currentMonth, currentYear) se salvează EXACT așa cum vin din backend
            // NU le modificăm, NU le păstrăm pe cele vechi - le folosim EXACT așa cum sunt
            // Acestea sunt perioade dinamice care se schimbă zilnic și trebuie să reflecte datele reale din Cyber
            const finalOverview = {
              success: true,
              // Date dinamice - folosim EXACT ce vine din backend, fără modificări
              today: newOverview.today || {},
              currentMonth: newOverview.currentMonth || {},
              currentYear: newOverview.currentYear || {},
              // Date statice - păstrăm pe cele vechi dacă cele noi sunt zero sau goale
              yesterday: (newOverview.yesterday && hasNonZeroRow(newOverview.yesterday)) ? newOverview.yesterday : (prev?.yesterday || {}),
              lastMonth: (newOverview.lastMonth && hasNonZeroRow(newOverview.lastMonth)) ? newOverview.lastMonth : (prev?.lastMonth || {}),
              dayBeforeYesterday: newOverview.dayBeforeYesterday || prev?.dayBeforeYesterday || {},
              previousMonth: newOverview.previousMonth || prev?.previousMonth || {},
              lastYear: newOverview.lastYear || prev?.lastYear || {},
              sameDaysLastMonth: newOverview.sameDaysLastMonth || prev?.sameDaysLastMonth || {}
            }
            
            console.log('📊 Date finale care vor fi afișate:', {
              today: finalOverview.today,
              yesterday: finalOverview.yesterday,
              currentMonth: finalOverview.currentMonth
            })
            
            try {
              localStorage.setItem('incasari_overview_cache', JSON.stringify(finalOverview))
              localStorage.setItem('incasari_overview_cache_timestamp', Date.now().toString())
              
              // Salvează și câmpurile dinamice (azi, luna curentă, anul curent) separat pentru a nu se pierde
              // Salvează ÎNTOTDEAUNA câmpurile dinamice (chiar dacă nu e forceRefresh) pentru că se schimbă zilnic
              if (finalOverview.today) {
                localStorage.setItem('incasari_overview_today', JSON.stringify(finalOverview.today))
              }
              if (finalOverview.currentMonth) {
                localStorage.setItem('incasari_overview_currentMonth', JSON.stringify(finalOverview.currentMonth))
              }
              if (finalOverview.currentYear) {
                localStorage.setItem('incasari_overview_currentYear', JSON.stringify(finalOverview.currentYear))
              }
            } catch {
              // ignore
            }
            return finalOverview
          })
          
          // Dacă se face refresh, actualizează automat și tabelul centralizator și P&L pentru luna curentă
          if (forceRefresh) {
            // Forțează refresh-ul pentru tabelul centralizator pentru a actualiza luna curentă
            const currentYear = new Date().getFullYear()
            const cacheKey = `incasari_ggr_by_month_location_cache_timestamp_${currentYear}`
            
            // Resetează timestamp-ul pentru a forța refresh-ul
            try {
              localStorage.setItem(cacheKey, (Date.now() - 31 * 60 * 1000).toString())
              
              // Re-fetch datele pentru tabelul centralizator (doar pentru luna curentă)
              setTimeout(() => {
                axios.get('/api/incasari/ggr-by-month-location', {
                  params: { year: currentYear }
                }).then(response => {
                  if (response.data?.success && response.data.locations && response.data.locations.length > 0) {
                    setGgrByMonthLocation((prev) => {
                      if (!prev || prev.year !== currentYear) {
                        return {
                          year: response.data.year,
                          locations: response.data.locations,
                          monthData: response.data.monthData || {}
                        }
                      }
                      
                      // Actualizează doar luna curentă
                      const currentMonth = new Date().getMonth() + 1
                      const updatedMonthData = { ...prev.monthData }
                      updatedMonthData[currentMonth] = response.data.monthData[currentMonth] || {}
                      
                      // Actualizează cache-ul
                      try {
                        const newData = {
                          year: response.data.year,
                          locations: response.data.locations,
                          monthData: updatedMonthData
                        }
                        localStorage.setItem('incasari_ggr_by_month_location_cache', JSON.stringify(newData))
                        localStorage.setItem(cacheKey, Date.now().toString())
                      } catch (e) {
                        // ignore
                      }
                      
                      return {
                        ...prev,
                        monthData: updatedMonthData
                      }
                    })
                  }
                }).catch(error => {
                  console.error('❌ Eroare la actualizarea tabelului centralizator:', error)
                })
              }, 500) // Așteaptă puțin după ce overview s-a actualizat
              
              // Re-fetch datele pentru tabelul P&L (avg-in-by-location) pentru a actualiza luna curentă
              // Folosește aceiași parametri ca și overview (visibleLocations)
              setTimeout(() => {
                const currentDate = new Date()
                const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                const formatDateLocal = (date) => {
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  return `${year}-${month}-${day}`
                }
                
                const commonParams = {
                  startDate: formatDateLocal(currentMonthStart),
                  endDate: formatDateLocal(currentMonthEnd),
                  includeLocations:
                    visibleLocations && visibleLocations.length > 0
                      ? visibleLocations.join(',')
                      : undefined
                }
                
                axios.get('/api/incasari/avg-in-by-location', {
                  params: commonParams
                }).then(response => {
                  if (response.data?.success && response.data.rows) {
                    // Actualizează doar datele pentru luna curentă
                    setAvgInByLocation((prev) => {
                      // Păstrăm datele vechi pentru celelalte perioade și actualizăm doar cele pentru luna curentă
                      const updated = [...prev]
                      const currentMonthData = response.data.rows || []
                      
                      // Filtrează datele vechi pentru a exclude cele din luna curentă
                      const filtered = updated.filter(row => {
                        const rowDate = new Date(row.date || row.audit_date)
                        return !(rowDate.getFullYear() === currentDate.getFullYear() && 
                                 rowDate.getMonth() === currentDate.getMonth())
                      })
                      
                      // Adaugă datele noi pentru luna curentă
                      return [...filtered, ...currentMonthData]
                    })
                    console.log('✅ Tabelul P&L actualizat pentru luna curentă')
                  }
                }).catch(error => {
                  console.error('❌ Eroare la actualizarea tabelului P&L:', error)
                })
              }, 600) // Așteaptă puțin mai mult după ce centralizator s-a actualizat
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea overview-ului:', error)
        }
      } finally {
        if (showRefreshIndicator) {
          // Așteaptă puțin ca să se vadă că s-a făcut refresh
          setTimeout(() => setIsRefreshing(false), 1000)
        }
      }
    }

  // useEffect pentru fetchOverview și auto-refresh
  useEffect(() => {
    // Prima încărcare
    fetchOverview()
    
    // Calculează timpul până la următoarea oră :05 (ex: 8:05, 9:05, etc.)
    const calculateTimeUntilNextRefresh = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()
      const milliseconds = now.getMilliseconds()
      
      // Dacă suntem exact la ora 8:05, facem refresh pentru ambele (Azi și Ieri)
      const isEarlyMorning = hours === 8 && minutes < 5
      
      // Calculează minutele rămase până la :05
      let minutesUntilRefresh = 5 - (minutes % 60)
      if (minutesUntilRefresh <= 0) {
        minutesUntilRefresh += 60
      }
      
      // Convertește în milisecunde și scade secundele/milisecundele curente
      const msUntilRefresh = (minutesUntilRefresh * 60 * 1000) - (seconds * 1000) - milliseconds
      
      return { msUntilRefresh, shouldRefreshYesterday: isEarlyMorning }
    }
    
    // Setează primul refresh la :05
    const { msUntilRefresh, shouldRefreshYesterday } = calculateTimeUntilNextRefresh()
    
    const timeoutId = setTimeout(() => {
      // La ora 8:05 facem refresh complet (inclusiv "Ieri" se actualizează)
      const now = new Date()
      const isAfter8AM = now.getHours() === 8 && now.getMinutes() === 5
      
      if (isAfter8AM) {
        console.log('🌅 Ora 8:05 - Actualizare completă (Azi devine Ieri)')
      }
      
      // Sincronizare automată cu Cyber la fiecare oră
      const syncCyber = async () => {
        try {
          // Verifică mai întâi dacă rulează deja o sincronizare
          const statusResp = await axios.get('/api/incasari/sync-status')
          if (statusResp.data?.running) {
            console.log('⏳ Sincronizare deja în curs, sărim acest ciclu')
            fetchOverview(true, true) // Arată indicator de refresh și forțează refresh
            return
          }
          
          console.log(`🔄 Auto-refresh la ora ${new Date().toLocaleTimeString('ro-RO')}`)
          const resp = await axios.post('/api/incasari/sync')
          if (resp.data?.success) {
            console.log('✅ Sincronizare completată')
            // Așteaptă 10 secunde pentru ca datele să se proceseze
            setTimeout(() => {
              fetchOverview(true, true) // Arată indicator de refresh și forțează refresh
            }, 10000)
          }
        } catch (error) {
          if (error.response?.status === 400) {
            console.log('⏳ Sincronizare deja în curs')
          } else {
            console.error('❌ Eroare la sincronizare:', error)
          }
          fetchOverview(true) // Arată indicator de refresh
        }
      }
      
      // Rulează sync-ul imediat
      syncCyber()
      
      // După primul refresh, setează interval la fiecare oră
      const intervalId = setInterval(() => {
        const currentTime = new Date()
        const isHourly8AM = currentTime.getHours() === 8 && currentTime.getMinutes() === 5
        
        if (isHourly8AM) {
          console.log('🌅 Ora 8:05 - Actualizare completă zilnică')
        }
        
        syncCyber()
      }, 60 * 60 * 1000) // 60 minute
      
      // Salvează intervalId pentru cleanup
      return () => clearInterval(intervalId)
    }, msUntilRefresh)
    
    // Cleanup
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLocations])

  // Fetch dynamics data (luna curentă vs aceleași zile luna trecută)
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchDynamics = async () => {
      try {
        const response = await axios.get('/api/incasari/dynamics', {
          params: {
            location: locationFilter !== 'all' ? locationFilter : undefined,
            provider: providerFilter !== 'all' ? providerFilter : undefined,
            cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
            gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined
          },
          signal: abortController.signal
        })
        if (response.data?.success) {
          setDynamics(response.data)
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea dinamicii:', error)
        }
      }
    }
    fetchDynamics()
    
    return () => {
      abortController.abort()
    }
  }, [locationFilter, providerFilter, cabinetFilter, gameMixFilter])

  // Fetch estimated profit
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchEstimatedProfit = async () => {
      try {
        const response = await axios.get('/api/incasari/estimated-profit', {
          params: {
            location: locationFilter !== 'all' ? locationFilter : undefined,
            provider: providerFilter !== 'all' ? providerFilter : undefined,
            cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
            gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined
          },
          signal: abortController.signal
        })
        if (response.data?.success) {
          setEstimatedProfit(response.data)
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea profitului estimat:', error)
        }
      }
    }
    fetchEstimatedProfit()
    
    return () => {
      abortController.abort()
    }
  }, [locationFilter, providerFilter, cabinetFilter, gameMixFilter])

  // Fetch slots by month and location pentru anul curent
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchSlotsByMonthLocation = async () => {
      try {
        const response = await axios.get('/api/incasari/slots-by-month-location', {
          signal: abortController.signal
        })
        if (response.data?.success && response.data.locations && response.data.locations.length > 0) {
          // Actualizează state-ul doar după ce datele sunt complet gata
          const newData = {
            year: response.data.year,
            locations: response.data.locations,
            monthData: response.data.monthData || {}
          }
          
          // Salvează în cache înainte de a actualiza state-ul
          try {
            localStorage.setItem('incasari_slots_by_month_location_cache', JSON.stringify(newData))
            localStorage.setItem('incasari_slots_by_month_location_cache_timestamp', Date.now().toString())
          } catch (e) {
            console.error('Eroare la salvare cache:', e)
          }
          
          // Actualizează state-ul doar după ce totul este salvat
          setSlotsByMonthLocation(newData)
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea sloturilor pe lună și locație:', error)
        }
      }
    }
    // Verifică dacă avem cache recent (mai puțin de 1 oră)
    const cacheKey = 'incasari_slots_by_month_location_cache_timestamp'
    const lastFetch = localStorage.getItem(cacheKey)
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    
    if (!lastFetch || (now - parseInt(lastFetch)) > oneHour) {
      fetchSlotsByMonthLocation()
    } else {
      console.log('📦 Folosim cache pentru slots by month location')
    }
    
    return () => {
      abortController.abort()
    }
  }, [])

  // Fetch GGR by month and location pentru anul selectat
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchGgrByMonthLocation = async () => {
      try {
        // Determină anul din dateRange sau folosește anul curent
        const selectedYear = dateRange?.startDate 
          ? new Date(dateRange.startDate).getFullYear()
          : new Date().getFullYear()
        
        const response = await axios.get('/api/incasari/ggr-by-month-location', {
          params: { year: selectedYear },
          signal: abortController.signal
        })
        if (response.data?.success && response.data.locations && response.data.locations.length > 0) {
          // Actualizează state-ul doar după ce datele sunt complet gata
          const newData = {
            year: response.data.year,
            locations: response.data.locations,
            monthData: response.data.monthData || {}
          }
          
          // Salvează în cache înainte de a actualiza state-ul
          try {
            localStorage.setItem('incasari_ggr_by_month_location_cache', JSON.stringify(newData))
            const cacheKey = `incasari_ggr_by_month_location_cache_timestamp_${selectedYear}`
            localStorage.setItem(cacheKey, Date.now().toString())
          } catch (e) {
            console.error('Eroare la salvare cache:', e)
          }
          
          // Actualizează state-ul doar după ce totul este salvat
          setGgrByMonthLocation(newData)
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea GGR pe lună și locație:', error)
      }
    }
    
    // Verifică dacă avem cache recent (mai puțin de 30 minute) pentru același an
    const selectedYear = dateRange?.startDate 
      ? new Date(dateRange.startDate).getFullYear()
      : new Date().getFullYear()
    
    const cacheKey = `incasari_ggr_by_month_location_cache_timestamp_${selectedYear}`
    const lastFetch = localStorage.getItem(cacheKey)
    const now = Date.now()
    const thirtyMinutes = 30 * 60 * 1000
    
    // Verifică dacă cache-ul există și este pentru același an
    try {
      const cached = localStorage.getItem('incasari_ggr_by_month_location_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.year === selectedYear && (!lastFetch || (now - parseInt(lastFetch)) < thirtyMinutes)) {
          console.log('📦 Folosim cache pentru GGR by month location')
          return
        }
      }
    } catch (e) {
      // ignore
    }
    
    fetchGgrByMonthLocation()
  }, [dateRange])

  // Fetch POS data
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchPosData = async () => {
      try {
        const { startDate, endDate } = dateRange
        if (!startDate || !endDate) return

        const response = await axios.get('/api/incasari/pos-data', {
          params: {
            startDate,
            endDate,
            // Dacă este selectată o singură locație, o trimitem explicit
            location: locationFilter !== 'all' ? locationFilter : undefined,
            // Respectăm și locațiile vizibile din setări (pentru overview global)
            includeLocations:
              visibleLocations && visibleLocations.length > 0
                ? visibleLocations.join(',')
                : undefined
          },
          signal: abortController.signal
        })
        if (response.data?.success) {
          setPosData(response.data.rows || [])
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea datelor POS:', error)
        }
      }
    }
    fetchPosData()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange])

  // Fetch date pentru comparație:
  //  - dacă intervalul este o singură lună → zile (luna selectată vs luna anterioară)
  //  - dacă este mai mare (ex: Anul curent) → agregăm pe LUNI (anul selectat vs anul anterior)
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchComparisonData = async () => {
      try {
        const formatDateLocal = (date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        // Vedem dacă intervalul selectat este o singură lună sau mai multe luni
        let isSingleMonth = false
        if (dateRange.startDate && dateRange.endDate) {
          const start = new Date(dateRange.startDate)
          const end = new Date(dateRange.endDate)
          if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            isSingleMonth =
              start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
          }
        }

        if (isSingleMonth) {
          // Mod ZILNIC: luna SELECTATĂ vs aceleași zile din luna precedentă
          const selectedStart = new Date(dateRange.startDate)
          const selectedEnd = new Date(dateRange.endDate)

          const selectedYear = selectedStart.getFullYear()
          const selectedMonth = selectedStart.getMonth()

          const now = new Date()
          const isCurrentCalendarMonth =
            selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

          let operationalDaysInCurrentMonth
          if (isCurrentCalendarMonth) {
            // Pentru luna curentă ținem cont de ziua operațională (08:00–08:00)
            const currentHour = now.getHours()
            operationalDaysInCurrentMonth = currentHour >= 8 ? now.getDate() : now.getDate() - 1
          } else {
            // Pentru luni închise folosim toată luna
            const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0)
            operationalDaysInCurrentMonth = lastDayOfMonth.getDate()
          }

          const currentMonthStart = new Date(selectedYear, selectedMonth, 1)
          const currentMonthEnd = new Date(
            selectedYear,
            selectedMonth,
            operationalDaysInCurrentMonth
          )

          // Luna precedentă față de luna selectată
          const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1)
          const prevYear = prevMonthDate.getFullYear()
          const prevMonth = prevMonthDate.getMonth()
          const lastMonthStart = new Date(prevYear, prevMonth, 1)
          const lastMonthEnd = new Date(
            prevYear,
            prevMonth,
            operationalDaysInCurrentMonth
          )

          const [currentResp, lastResp] = await Promise.all([
            axios.get('/api/incasari/daily-stats', {
              params: {
                startDate: formatDateLocal(currentMonthStart),
                endDate: formatDateLocal(currentMonthEnd),
                location: locationFilter !== 'all' ? locationFilter : undefined,
                provider: providerFilter !== 'all' ? providerFilter : undefined,
                cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
                gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined
              },
              signal: abortController.signal
            }),
            axios.get('/api/incasari/daily-stats', {
              params: {
                startDate: formatDateLocal(lastMonthStart),
                endDate: formatDateLocal(lastMonthEnd),
                location: locationFilter !== 'all' ? locationFilter : undefined,
                provider: providerFilter !== 'all' ? providerFilter : undefined,
                cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
                gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined
              },
              signal: abortController.signal
            })
          ])

          if (currentResp.data?.success) {
            setCurrentMonthData(currentResp.data.rows || [])
          }
          if (lastResp.data?.success) {
            setLastMonthSameDaysData(lastResp.data.rows || [])
          }
        } else {
          // Mod LUNAR: anul SELECTAT vs anul anterior (agregare pe luni în useMemo)
          const endRef = dateRange.endDate ? new Date(dateRange.endDate) : new Date()
          const currentYear = endRef.getFullYear()
          const lastYear = currentYear - 1

          const currentYearStart = new Date(currentYear, 0, 1)
          const currentYearEnd = new Date(currentYear, 11, 31)
          const lastYearStart = new Date(lastYear, 0, 1)
          const lastYearEnd = new Date(lastYear, 11, 31)

          const [currentResp, lastResp] = await Promise.all([
            axios.get('/api/incasari/daily-stats', {
              params: {
                startDate: formatDateLocal(currentYearStart),
                endDate: formatDateLocal(currentYearEnd),
                location: locationFilter !== 'all' ? locationFilter : undefined,
                provider: providerFilter !== 'all' ? providerFilter : undefined,
                cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
                gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined
              },
              signal: abortController.signal
            }),
            axios.get('/api/incasari/daily-stats', {
              params: {
                startDate: formatDateLocal(lastYearStart),
                endDate: formatDateLocal(lastYearEnd),
                location: locationFilter !== 'all' ? locationFilter : undefined,
                provider: providerFilter !== 'all' ? providerFilter : undefined,
                cabinet: cabinetFilter !== 'all' ? cabinetFilter : undefined,
                gameMix: gameMixFilter !== 'all' ? gameMixFilter : undefined
              },
              signal: abortController.signal
            })
          ])

          if (currentResp.data?.success) {
            setCurrentMonthData(currentResp.data.rows || [])
          }
          if (lastResp.data?.success) {
            setLastMonthSameDaysData(lastResp.data.rows || [])
          }
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('❌ Eroare la încărcarea datelor de comparație:', error)
        }
      }
    }
    fetchComparisonData()
    
    return () => {
      abortController.abort()
    }
  }, [dateRange, locationFilter, providerFilter, cabinetFilter, gameMixFilter])

  const handleDateChange = (range) => {
    setDateRange({ startDate: range.startDate, endDate: range.endDate })
  }

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0'
    const num = Number(value)
    if (Number.isNaN(num)) return '0'
    return Math.round(num).toLocaleString('ro-RO', { 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    })
  }

  const formatPercent = (value) => {
    return `${Number(value || 0).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`
  }

  const formatDateLabel = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })
  }

  // Funcție pentru sortare
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const toggleCentralizerNode = (nodeId) => {
    setCentralizerExpanded((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const renderCentralizerRows = (nodes, locations) => {
    if (!nodes || nodes.length === 0) return null

    const allRows = []

    nodes.forEach((node) => {
      const isExpanded = centralizerExpanded.has(node.id)
      const hasChildren = node.children && node.children.length > 0
      const indentClass =
        node.level === 0
          ? 'font-bold'
          : node.level === 1
          ? 'pl-4 font-semibold'
          : node.level === 2
          ? 'pl-8'
          : 'pl-12'
      const bgClass =
        node.level === 0
          ? 'bg-slate-100 dark:bg-slate-800'
          : node.level === 1
          ? 'bg-slate-50 dark:bg-slate-900/40'
          : ''

      allRows.push(
        <tr
          key={node.id}
          className={`${bgClass} hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors ${
            hasChildren ? 'cursor-pointer' : ''
          }`}
          onClick={() => hasChildren && toggleCentralizerNode(node.id)}
        >
          <td
            className={`px-3 py-2 text-sm text-slate-800 dark:text-slate-100 sticky left-0 ${bgClass} ${indentClass}`}
          >
            {hasChildren && (
              <span className="inline-block w-4 mr-1">{isExpanded ? '▼' : '▶'}</span>
            )}
            {!hasChildren && <span className="inline-block w-4 mr-1"></span>}
            {node.label}
          </td>
          {locations.map((loc) => (
            <td
              key={loc}
              className={`px-3 py-2 text-right text-sm ${
                node.level === 0 || node.level === 1
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {formatNumber(node.data[loc] || 0)}
            </td>
          ))}
        </tr>
      )

      if (isExpanded && hasChildren) {
        allRows.push(...renderCentralizerRows(node.children, locations))
      }
    })

    return allRows
  }

  // Funcții de export Excel
  const exportOverviewToExcel = () => {
    try {
      const header = [
        'Perioadă',
        'Sloturi',
        'GGR',
        'IN',
        'OUT',
        'BET',
        'Marketing',
        'Bonus cost (%)',
        'JACKPOT',
        'HH',
        'CASHBACK',
        'Zi naștere',
        'Tombolă'
      ]

      const buildRow = (label, data = {}) => {
        const marketing = calcMarketingValue(data)
        const bonus = calcBonusCostPercent(data)
        return [
          label,
          data.slotsCount || 0,
          data.ggr || data.profit || 0,
          data.in || 0,
          data.out || 0,
          data.bet || 0,
          marketing,
          Number.isFinite(bonus) ? Number(bonus.toFixed(4)) : 0,
          data.jackpot || 0,
          data.hh || 0,
          data.cb_real || 0,
          data.cb_birthday || 0,
          data.cb_raffle || 0
        ]
      }

      const rows = [
        header,
        buildRow('Azi', overview.today),
        buildRow('Ieri', overview.yesterday),
        buildRow('Luna curentă', overview.currentMonth),
        buildRow('Luna trecută', overview.lastMonth),
        buildRow('Anul curent', overview.currentYear)
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Prezentare generală')
      XLSX.writeFile(wb, `Incasari_Prezentare_Generala_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Export Excel realizat cu succes!')
    } catch (error) {
      console.error('Eroare la export Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  const exportCentralizerToExcel = () => {
    try {
      if (!chartData || chartData.length === 0) {
        toast.error('Nu există date de exportat')
        return
      }
      
      const rows = [
        ['Data', 'IN', 'OUT', 'GGR', 'Sloturi']
      ]
      
      chartData.forEach((row) => {
        rows.push([
          row.label || row.date,
          row.totalIn || 0,
          row.totalOut || 0,
          row.totalGgr || 0,
          row.slotsCount || 0
        ])
      })
      
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Centralizator zilnic')
      XLSX.writeFile(wb, `Incasari_Centralizator_Zilnic_${dateRange.startDate}_${dateRange.endDate}.xlsx`)
      toast.success('Export Excel realizat cu succes!')
    } catch (error) {
      console.error('Eroare la export Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  const exportPLTableToExcel = () => {
    try {
      if (!plByLocation || plByLocation.length === 0) {
        toast.error('Nu există date de exportat')
        return
      }
      
      const rows = [
        ['Locație', 'IN', 'BET', 'GGR', 'Marketing', 'Bonus cost (%)', 'Cheltuieli', 'P&L', 'Profit %']
      ]
      
      plByLocation.forEach((row) => {
        rows.push([
          row.locationName || '',
          row.totalIn || 0,
          row.bet || 0,
          row.ggr || 0,
          row.marketing || 0,
          row.bonusCost || 0,
          row.expenses || 0,
          row.pl || 0,
          row.profitPercent || 0
        ])
      })
      
      // Adaugă rândul cu totaluri
      rows.push([
        'TOTAL',
        plTotals.totalIn || 0,
        plTotals.bet || 0,
        plTotals.ggr || 0,
        plTotals.marketing || 0,
        plTotals.bonusCost || 0,
        plTotals.expenses || 0,
        plTotals.pl || 0,
        '' // Nu calculăm profit % pentru total
      ])
      
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'P&L pe locații')
      XLSX.writeFile(wb, `Incasari_PL_Locatii_${dateRange.startDate}_${dateRange.endDate}.xlsx`)
      toast.success('Export Excel realizat cu succes!')
    } catch (error) {
      console.error('Eroare la export Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  const isSingleMonthRange = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return false
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
    return start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
  }, [dateRange])

  const chartData = useMemo(() => {
    // Folosește întotdeauna datele curente pentru a asigura consistența
    // Nu folosim cache aici pentru a evita inconsistențele
    const statsToUse = dailyStats || []
    
    if (statsToUse.length === 0) return []

    // Verifică dacă este luna curentă și dacă avem date din overview
    const currentDate = new Date()
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const currentMonthStartStr = formatDateLocal(currentMonthStart)
    const currentMonthEndStr = formatDateLocal(currentMonthEnd)
    const isCurrentMonth = dateRange.startDate === currentMonthStartStr && dateRange.endDate === currentMonthEndStr
    const hasOverviewData = overview?.currentMonth && (
      overview.currentMonth.ggr || overview.currentMonth.profit || overview.currentMonth.in
    )

      let baseData

      // Dacă este selectată o singură lună → păstrăm datele ZILNICE (fără sloturi)
      if (isSingleMonthRange) {
        baseData = statsToUse.map((d) => {
        return {
          date: d.date,
          label: formatDateLabel(d.date),
          totalIn: Number(d.total_in || d.totalIn || 0),
          totalOut: Number(d.total_out || d.totalOut || 0),
          totalGgr: Number(d.total_profit || d.totalProfit || 0),
          slotsCount: 0 // Nu afișăm sloturi pentru o singură lună
        }
      })
      
      // Pentru luna curentă, ajustăm datele pentru a se potrivi cu totalul din overview.currentMonth
      if (isCurrentMonth && hasOverviewData) {
        const overviewGgr = Number(overview.currentMonth.ggr || overview.currentMonth.profit || 0)
        const statsGgr = baseData.reduce((sum, d) => sum + (d.totalGgr || 0), 0)
        
        // Dacă există diferență, ajustăm proporțional datele zilnice
        if (statsGgr > 0 && Math.abs(overviewGgr - statsGgr) > 0.01) {
          const ratio = overviewGgr / statsGgr
          baseData = baseData.map((d) => ({
            ...d,
            totalGgr: Number((d.totalGgr * ratio).toFixed(2)),
            totalIn: Number((d.totalIn * ratio).toFixed(2)),
            totalOut: Number((d.totalOut * ratio).toFixed(2))
          }))
        } else if (statsGgr === 0 && overviewGgr > 0) {
          // Dacă nu avem date zilnice dar avem total în overview, distribuim proporțional pe zilele existente
          const daysWithData = baseData.filter(d => d.date).length
          if (daysWithData > 0) {
            const ggrPerDay = overviewGgr / daysWithData
            baseData = baseData.map((d) => ({
              ...d,
              totalGgr: d.date ? ggrPerDay : 0
            }))
          }
        }
      }
    } else {
      // În rest → agregăm pe LUNI cu sumele totale
      const monthMap = {}

      statsToUse.forEach((d) => {
        const dateObj = new Date(d.date)
        if (Number.isNaN(dateObj.getTime())) return
        const year = dateObj.getFullYear()
        const month = dateObj.getMonth()
        const key = `${year}-${String(month + 1).padStart(2, '0')}`

        if (!monthMap[key]) {
          monthMap[key] = {
            dateObj: new Date(year, month, 1),
            totalIn: 0,
            totalOut: 0,
            totalGgr: 0,
            slotsCountSum: 0,
            days: 0
          }
        }

        const bucket = monthMap[key]
        bucket.totalIn += Number(d.total_in || d.totalIn || 0)
        bucket.totalOut += Number(d.total_out || d.totalOut || 0)
        bucket.totalGgr += Number(d.total_profit || d.totalProfit || 0)
        bucket.slotsCountSum += Number(d.slots_count || d.slotsCount || 0)
        bucket.days += 1
      })

      // Pentru agregare pe luni, trebuie să calculăm numărul distinct de sloturi pe lună
      // Nu medie, ci numărul maxim/distinct de sloturi care au avut activitate în acea lună
      baseData = Object.values(monthMap)
        .sort((a, b) => a.dateObj - b.dateObj)
        .map((bucket) => {
          // Folosim numărul maxim de sloturi distincte din luna respectivă
          // (nu medie, ci numărul real de sloturi distincte care au avut activitate)
          const maxSlots = bucket.slotsCountSum > 0 
            ? Math.max(...statsToUse
                .filter(d => {
                  const dDate = new Date(d.date)
                  return dDate.getFullYear() === bucket.dateObj.getFullYear() &&
                         dDate.getMonth() === bucket.dateObj.getMonth()
                })
                .map(d => Number(d.slots_count || d.slotsCount || 0))
                .filter(v => v > 0)
              ) || 0
            : 0
          
          return {
            date: bucket.dateObj.toISOString().split('T')[0],
            // Label simplu cu luna; sloturile sunt afișate ca linie separată
            label: bucket.dateObj.toLocaleDateString('ro-RO', {
              month: 'short',
              year: 'numeric'
            }),
            totalIn: bucket.totalIn,
            totalOut: bucket.totalOut,
            totalGgr: bucket.totalGgr,
            // Număr distinct de sloturi pe lună (nu medie)
            slotsCount: maxSlots
          }
        })
    }

    // „AI” trend simplu: regresie liniară pe totalGgr în funcție de index
    if (!baseData || baseData.length < 6) {
      return baseData
    }

    const n = baseData.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    baseData.forEach((point, index) => {
      const x = index
      const y = Number(point.totalGgr || 0)
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    })

    const denominator = n * sumX2 - sumX * sumX
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
    const intercept = (sumY - slope * sumX) / n

    return baseData.map((point, index) => ({
      ...point,
      trendGgr: slope * index + intercept
    }))
  }, [dailyStats, isSingleMonthRange, overview, dateRange])

  // Date sortate pentru tabelul centralizator
  const sortedChartData = useMemo(() => {
    if (!sortConfig.key || !chartData) return chartData

    const sorted = [...chartData].sort((a, b) => {
      let aVal, bVal

      switch (sortConfig.key) {
        case 'date':
          aVal = new Date(a.date).getTime()
          bVal = new Date(b.date).getTime()
          break
        case 'ggr':
          aVal = Number(a.totalGgr || 0)
          bVal = Number(b.totalGgr || 0)
          break
        case 'slots':
          aVal = Number(a.slotsCount || 0)
          bVal = Number(b.slotsCount || 0)
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [chartData, sortConfig])

  // Prepare comparison chart data:
  //  - mod ZILNIC (o singură lună în range): IN luna curentă vs aceleași zile luna trecută
  //  - mod LUNAR   (range > 1 lună, ex: Anul curent): IN anul curent vs anul trecut, pe luni
  const comparisonChartData = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return []

    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    const isSingleMonth =
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth()

    // POS: mapăm fie pe zi (YYYY-MM-DD), fie pe lună (YYYY-MM)
    const posMap = new Map()
    posData.forEach((p) => {
      const d = new Date(p.date)
      if (Number.isNaN(d.getTime())) return
      if (isSingleMonth) {
        const key = p.date
        const prev = posMap.get(key) || 0
        posMap.set(key, prev + Number(p.total_pos || 0))
      } else {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const prev = posMap.get(key) || 0
        posMap.set(key, prev + Number(p.total_pos || 0))
      }
    })

    if (isSingleMonth) {
      // Mod ZILNIC - creăm date pentru TOATE zilele lunii (1-30/31)
      const year = start.getFullYear()
      const month = start.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const result = []
      
      // Determină ultima zi operațională (08:00–08:00) pentru a exclude zilele viitoare din grafic
      const now = new Date()
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
      let todayOperational
      if (isCurrentMonth) {
        // Pentru luna curentă, calculăm ziua operațională
        const currentHour = now.getHours()
        todayOperational = new Date(year, month, currentHour >= 8 ? now.getDate() : now.getDate() - 1)
        todayOperational.setHours(8, 0, 0, 0)
      } else {
        // Pentru luni închise, folosim sfârșitul lunii
        todayOperational = new Date(year, month + 1, 0)
        todayOperational.setHours(23, 59, 59, 999)
      }
      
      // Creăm map-uri pentru acces rapid la date
      const currentDataMap = new Map()
      const lastDataMap = new Map()
      
      currentMonthData.forEach(row => {
        const d = new Date(row.date)
        if (!Number.isNaN(d.getTime())) {
          currentDataMap.set(d.getDate(), row)
        }
      })
      
      lastMonthSameDaysData.forEach(row => {
        const d = new Date(row.date)
        if (!Number.isNaN(d.getTime())) {
          lastDataMap.set(d.getDate(), row)
        }
      })
      
      // Generăm date pentru TOATE zilele lunii (1-30/31)
      // Pentru zilele viitoare, afișăm 0
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day)
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        
        // Pentru zilele viitoare (luna curentă), afișăm 0
        const isFutureDay = isCurrentMonth && currentDate > todayOperational
        
        const current = isFutureDay ? {} : (currentDataMap.get(day) || {})
        const last = lastDataMap.get(day) || {}
        
        result.push({
          day,
          label: String(day),
          currentIn: Number(current.total_in || current.totalIn || 0),
          lastIn: Number(last.total_in || last.totalIn || 0),
          currentGgr: Number(current.total_profit || current.totalProfit || 0),
          pos: posMap.get(dateStr) || 0,
          slotsCount: Number(current.slots_count || last.slots_count || 0)
        })
      }

      return result
    }

    // Mod LUNAR: agregăm pe luni
    const endRef = end
    const currentYear = endRef.getFullYear()
    const lastYear = currentYear - 1

    const makeMonthlyBuckets = () =>
      Array.from({ length: 12 }, () => ({
        totalIn: 0,
        totalProfit: 0
      }))

    const currentBuckets = makeMonthlyBuckets()
    const lastBuckets = makeMonthlyBuckets()

    currentMonthData.forEach((row) => {
      const d = new Date(row.date)
      if (Number.isNaN(d.getTime())) return
      if (d.getFullYear() !== currentYear) return
      const m = d.getMonth()
      currentBuckets[m].totalIn += Number(row.total_in || row.totalIn || 0)
      currentBuckets[m].totalProfit += Number(row.total_profit || row.totalProfit || 0)
    })

    lastMonthSameDaysData.forEach((row) => {
      const d = new Date(row.date)
      if (Number.isNaN(d.getTime())) return
      if (d.getFullYear() !== lastYear) return
      const m = d.getMonth()
      lastBuckets[m].totalIn += Number(row.total_in || row.totalIn || 0)
      lastBuckets[m].totalProfit += Number(row.total_profit || row.totalProfit || 0)
    })

    const result = []
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(currentYear, m, 1)
      const monthKey = `${currentYear}-${String(m + 1).padStart(2, '0')}`
      result.push({
        month: m + 1,
        label: monthDate.toLocaleDateString('ro-RO', { month: 'short' }),
        currentIn: currentBuckets[m].totalIn,
        lastIn: lastBuckets[m].totalIn,
        currentGgr: currentBuckets[m].totalProfit,
        pos: posMap.get(monthKey) || 0,
        slotsCount: 0
      })
    }

    return result
  }, [dateRange, currentMonthData, lastMonthSameDaysData, posData])

  const pieColors = [
    '#22c55e',
    '#0ea5e9',
    '#6366f1',
    '#f97316',
    '#e11d48',
    '#14b8a6',
    '#a855f7',
    '#facc15'
  ]

  const pickNumber = (row, keys) => {
    if (!row) return 0
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        const value = Number(row[key])
        return Number.isNaN(value) ? 0 : value
      }
    }
    return 0
  }

  const calcMarketingValue = (row) => {
    if (!row) return 0
    return (
      pickNumber(row, ['jackpot', 'totalJackpot']) +
      pickNumber(row, ['hh', 'totalHh']) +
      pickNumber(row, ['cb_real', 'totalCbReal']) +
      pickNumber(row, ['cb_birthday', 'totalCbBirthday']) +
      pickNumber(row, ['cb_raffle', 'totalCbRaffle'])
    )
  }

  const calcBonusCostPercent = (row, baseValue) => {
    const marketing = calcMarketingValue(row)
    // Bonus cost = marketing / BET (nu mai e marketing / IN)
    const denominator =
      baseValue !== undefined ? Number(baseValue) : pickNumber(row, ['bet', 'totalBet'])
    if (!denominator || denominator <= 0) return 0
    return (marketing / denominator) * 100
  }

  // Pie data „mai smart”: TOP N + „Altele”, cu IN mediu
  const MAX_PIE_SEGMENTS = 10

  const locationPieData = useMemo(() => {
    // Folosește întotdeauna datele curente pentru a asigura consistența
    const dataToUse = avgInByLocation || []
    
    if (dataToUse.length === 0) return []
    // Sortează după GGR (totalProfit) în loc de averageIn
    const sorted = [...dataToUse].sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0))
    if (sorted.length <= MAX_PIE_SEGMENTS) return sorted

    const top = sorted.slice(0, MAX_PIE_SEGMENTS)
    const rest = sorted.slice(MAX_PIE_SEGMENTS)
    const othersGgr = rest.reduce((sum, item) => sum + (item.totalProfit || 0), 0)

    return [
      ...top,
      {
        locationId: 'others',
        locationName: 'Altele',
        totalProfit: othersGgr,
        totalIn: 0,
        slotsCount: 0,
        averageIn: 0
      }
    ]
  }, [avgInByLocation])

  // P&L pe locații (GGR – cheltuieli)
  const plByLocation = useMemo(() => {
    // Folosește întotdeauna datele curente pentru a asigura consistența
    const dataToUse = avgInByLocation || []
    
    if (dataToUse.length === 0) return []

    // Verifică dacă este luna curentă și dacă avem date din overview
    const currentDate = new Date()
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const currentMonthStartStr = formatDateLocal(currentMonthStart)
    const currentMonthEndStr = formatDateLocal(currentMonthEnd)
    const isCurrentMonth = dateRange.startDate === currentMonthStartStr && dateRange.endDate === currentMonthEndStr
    const hasOverviewData = overview?.currentMonth && (
      overview.currentMonth.ggr || overview.currentMonth.profit || overview.currentMonth.in
    )

    const expMap = new Map()
    locationExpenditures.forEach((row) => {
      if (!row || !row.location_name) return
      expMap.set(row.location_name, Number(row.total_expenditures || 0))
    })

    let plData = dataToUse.map((row) => {
      const locationName = row.locationName || 'Nespecificat'
      const totalIn = Number(row.totalIn || 0)
      const ggr = Number(row.totalProfit || 0)
      const expenses = expMap.get(locationName) || 0
      const pl = ggr - expenses
      const bet = Number(row.totalBet || row.total_bet || 0)
      const marketing =
        Number(row.totalJackpot || row.total_jackpot || 0) +
        Number(row.totalHh || row.total_hh || 0) +
        Number(row.totalCbReal || row.total_cb_real || 0) +
        Number(row.totalCbBirthday || row.total_cb_birthday || 0) +
        Number(row.totalCbRaffle || row.total_cb_raffle || 0)
      const bonusCost = bet > 0 ? (marketing / bet) * 100 : 0
      const profitPercent = totalIn > 0 ? (pl / totalIn) * 100 : 0
      return {
        locationName,
        totalIn,
        bet,
        ggr,
        marketing,
        bonusCost,
        expenses,
        pl,
        profitPercent
      }
    })
    
    // Pentru luna curentă, ajustăm datele pentru a se potrivi cu totalul din overview.currentMonth
    if (isCurrentMonth && hasOverviewData) {
      const overviewGgr = Number(overview.currentMonth.ggr || overview.currentMonth.profit || 0)
      const overviewIn = Number(overview.currentMonth.in || 0)
      const overviewBet = Number(overview.currentMonth.bet || 0)
      
      const statsGgr = plData.reduce((sum, d) => sum + (d.ggr || 0), 0)
      const statsIn = plData.reduce((sum, d) => sum + (d.totalIn || 0), 0)
      const statsBet = plData.reduce((sum, d) => sum + (d.bet || 0), 0)
      
      // Dacă există diferență, ajustăm proporțional datele pe locații
      if (statsGgr > 0 && Math.abs(overviewGgr - statsGgr) > 0.01) {
        const ggrRatio = overviewGgr / statsGgr
        const inRatio = statsIn > 0 && overviewIn > 0 ? overviewIn / statsIn : ggrRatio
        const betRatio = statsBet > 0 && overviewBet > 0 ? overviewBet / statsBet : ggrRatio
        
        plData = plData.map((d) => {
          const adjustedGgr = d.ggr * ggrRatio
          const adjustedIn = d.totalIn * inRatio
          const adjustedBet = d.bet * betRatio
          const adjustedMarketing = d.marketing * ggrRatio
          const adjustedPl = adjustedGgr - d.expenses
          return {
            ...d,
            totalIn: adjustedIn,
            bet: adjustedBet,
            ggr: adjustedGgr,
            marketing: adjustedMarketing,
            pl: adjustedPl,
            profitPercent: adjustedIn > 0 ? (adjustedPl / adjustedIn) * 100 : 0,
            bonusCost: adjustedBet > 0 ? (adjustedMarketing / adjustedBet) * 100 : 0
          }
        })
      }
    }

    return plData
  }, [avgInByLocation, locationExpenditures, overview, dateRange])

  // Calculează totalurile pentru tabelul P&L
  const plTotals = useMemo(() => {
    if (!plByLocation || plByLocation.length === 0) {
      return {
        totalIn: 0,
        bet: 0,
        ggr: 0,
        marketing: 0,
        expenses: 0,
        pl: 0,
        bonusCost: 0
      }
    }

    const totals = plByLocation.reduce((acc, row) => {
      acc.totalIn += row.totalIn
      acc.bet += row.bet
      acc.ggr += row.ggr
      acc.marketing += row.marketing
      acc.expenses += row.expenses
      acc.pl += row.pl
      return acc
    }, {
      totalIn: 0,
      bet: 0,
      ggr: 0,
      marketing: 0,
      expenses: 0,
      pl: 0
    })

    // Calculează bonus cost-ul mediu ponderat (marketing / BET)
    totals.bonusCost = totals.bet > 0 ? (totals.marketing / totals.bet) * 100 : 0

    return totals
  }, [plByLocation])

  // Construim structura DRILL-DOWN pentru tabelul centralizator
  const centralizerData = useMemo(() => {
    if (!locationDailyData || locationDailyData.length === 0) return { rows: [], locations: [], hierarchy: new Map() }

    // Grupare pe date
    const dateMap = new Map()
    const locationSet = new Set()

    locationDailyData.forEach((row) => {
      const date = row.date
      const loc = row.location_name
      if (!loc || loc === 'Nespecificat' || !loc.trim()) return // ELIMINĂ Nespecificat

      locationSet.add(loc)

      if (!dateMap.has(date)) {
        dateMap.set(date, {})
      }
      dateMap.get(date)[loc] = Number(row.total_profit || 0)
    })

    const locations = Array.from(locationSet).sort()
    const dates = Array.from(dateMap.keys()).sort()

    // Structură ierarhică: An > Trimestru > Lună > Zi
    const hierarchy = new Map()

    dates.forEach((dateStr) => {
      const d = new Date(dateStr)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const quarter = Math.ceil(month / 3)
      const day = d.getDate()

      const yearKey = `year_${year}`
      const quarterKey = `${yearKey}_q${quarter}`
      const monthKey = `${quarterKey}_m${month}`
      const dayKey = `${monthKey}_d${day}`

      if (!hierarchy.has(yearKey)) {
        hierarchy.set(yearKey, {
          id: yearKey,
          type: 'year',
          label: `${year}`,
          level: 0,
          year,
          data: {},
          children: []
        })
      }
      const yearNode = hierarchy.get(yearKey)

      let quarterNode = yearNode.children.find((c) => c.id === quarterKey)
      if (!quarterNode) {
        quarterNode = {
          id: quarterKey,
          type: 'quarter',
          label: `T${quarter}`,
          level: 1,
          year,
          quarter,
          parentId: yearKey,
          data: {},
          children: []
        }
        yearNode.children.push(quarterNode)
      }

      let monthNode = quarterNode.children.find((c) => c.id === monthKey)
      if (!monthNode) {
        const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
        monthNode = {
          id: monthKey,
          type: 'month',
          label: monthNames[month - 1],
          level: 2,
          year,
          quarter,
          month,
          parentId: quarterKey,
          data: {},
          children: []
        }
        quarterNode.children.push(monthNode)
      }

      const dayNode = {
        id: dayKey,
        type: 'day',
        label: `${day}`,
        level: 3,
        year,
        quarter,
        month,
        day,
        date: dateStr,
        parentId: monthKey,
        data: dateMap.get(dateStr)
      }
      monthNode.children.push(dayNode)

      // Aggregate data up
      locations.forEach((loc) => {
        const val = dateMap.get(dateStr)[loc] || 0
        dayNode.data[loc] = val
        monthNode.data[loc] = (monthNode.data[loc] || 0) + val
        quarterNode.data[loc] = (quarterNode.data[loc] || 0) + val
        yearNode.data[loc] = (yearNode.data[loc] || 0) + val
      })
    })

    // Sort children
    hierarchy.forEach((yearNode) => {
      yearNode.children.sort((a, b) => b.quarter - a.quarter)
      yearNode.children.forEach((quarterNode) => {
        quarterNode.children.sort((a, b) => b.month - a.month)
        quarterNode.children.forEach((monthNode) => {
          monthNode.children.sort((a, b) => b.day - a.day)
        })
      })
    })

    // Flatten doar ANII inițial
    const rows = Array.from(hierarchy.values()).sort((a, b) => b.year - a.year)

    return { rows, locations, hierarchy }
  }, [locationDailyData])

  const cabinetPieData = useMemo(() => {
    // Folosește întotdeauna datele curente pentru a asigura consistența
    const dataToUse = avgInByCabinet || []
    
    if (dataToUse.length === 0) return []
    
    // Calculează averageDrop pentru fiecare cabinet (totalIn / slotsCount)
    const withAverageDrop = dataToUse.map(item => ({
      ...item,
      averageDrop: (item.slotsCount && item.slotsCount > 0) 
        ? (item.totalIn || 0) / item.slotsCount 
        : 0
    }))
    
    // Sortează după Average Drop în loc de averageIn
    const sorted = [...withAverageDrop].sort((a, b) => (b.averageDrop || 0) - (a.averageDrop || 0))
    if (sorted.length <= MAX_PIE_SEGMENTS) return sorted

    const top = sorted.slice(0, MAX_PIE_SEGMENTS)
    const rest = sorted.slice(MAX_PIE_SEGMENTS)
    const othersAverageDrop = rest.reduce((sum, item) => sum + (item.averageDrop || 0), 0)

    return [
      ...top,
      {
        cabinetName: 'Altele',
        totalIn: 0,
        slotsCount: 0,
        averageIn: 0,
        averageDrop: othersAverageDrop
      }
    ]
  }, [avgInByCabinet])

  // Calculează dinamica pentru fiecare perioadă
  const calculateOverviewDynamics = useMemo(() => {
    const dynamics = {}
    
    // Azi: compara cu Ieri
    if (overview.today && overview.yesterday) {
      const todayGgr = Number(overview.today.ggr || overview.today.profit || 0)
      const yesterdayGgr = Number(overview.yesterday.ggr || overview.yesterday.profit || 0)
      dynamics.today = yesterdayGgr > 0 ? ((todayGgr - yesterdayGgr) / yesterdayGgr) * 100 : 0
    }
    
    // Ieri: compara cu alaltăieri
    if (overview.yesterday && overview.dayBeforeYesterday) {
      const yesterdayGgr = Number(overview.yesterday.ggr || overview.yesterday.profit || 0)
      const dayBeforeYesterdayGgr = Number(overview.dayBeforeYesterday.ggr || overview.dayBeforeYesterday.profit || 0)
      dynamics.yesterday = dayBeforeYesterdayGgr > 0 ? ((yesterdayGgr - dayBeforeYesterdayGgr) / dayBeforeYesterdayGgr) * 100 : 0
    }
    
    // Luna curentă: compara cu aceleași zile din luna trecută
    if (overview.currentMonth && overview.sameDaysLastMonth) {
      const currentMonthGgr = Number(overview.currentMonth.ggr || overview.currentMonth.profit || 0)
      const sameDaysLastMonthGgr = Number(overview.sameDaysLastMonth.ggr || overview.sameDaysLastMonth.profit || 0)
      dynamics.currentMonth = sameDaysLastMonthGgr > 0 ? ((currentMonthGgr - sameDaysLastMonthGgr) / sameDaysLastMonthGgr) * 100 : 0
    }
    
    // Luna trecută: compara cu luna precedentă
    if (overview.lastMonth && overview.previousMonth) {
      const lastMonthGgr = Number(overview.lastMonth.ggr || overview.lastMonth.profit || 0)
      const previousMonthGgr = Number(overview.previousMonth.ggr || overview.previousMonth.profit || 0)
      dynamics.lastMonth = previousMonthGgr > 0 ? ((lastMonthGgr - previousMonthGgr) / previousMonthGgr) * 100 : 0
    }
    
    // Anul curent: compara cu aceeași perioadă din anul trecut
    if (overview.currentYear && overview.lastYear) {
      const currentYearGgr = Number(overview.currentYear.ggr || overview.currentYear.profit || 0)
      const lastYearGgr = Number(overview.lastYear.ggr || overview.lastYear.profit || 0)
      dynamics.currentYear = lastYearGgr > 0 ? ((currentYearGgr - lastYearGgr) / lastYearGgr) * 100 : 0
    }
    
    return dynamics
  }, [overview])

  const overviewRowConfigs = [
    { label: 'Azi', data: overview.today, dynamics: calculateOverviewDynamics.today },
    { label: 'Ieri', data: overview.yesterday, dynamics: calculateOverviewDynamics.yesterday },
    { label: 'Luna curentă', data: overview.currentMonth, dynamics: calculateOverviewDynamics.currentMonth },
    { label: 'Luna trecută', data: overview.lastMonth, dynamics: calculateOverviewDynamics.lastMonth },
    { label: 'Anul curent', data: overview.currentYear, dynamics: calculateOverviewDynamics.currentYear }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-emerald-500" />
              Încasări
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  // Verifică mai întâi statusul
                  const statusResp = await axios.get('/api/incasari/sync-status')
                  if (statusResp.data?.running) {
                    toast.warning('Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.')
                    setSyncModalOpen(true) // Arată modalul de progres
                    return
                  }
                  
                  const resp = await axios.post('/api/incasari/sync')
                  if (resp.data?.success) {
                    toast.success(resp.data.message || 'Sincronizare Încasări pornită')
                    setSyncModalOpen(true)
                  } else {
                    toast.error(resp.data?.error || 'Nu am putut porni sincronizarea')
                  }
                } catch (error) {
                  console.error('❌ Eroare la pornirea sincronizării încasărilor:', error)
                  if (error.response?.status === 400) {
                    toast.warning('Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.')
                    setSyncModalOpen(true) // Arată modalul de progres
                  } else {
                    toast.error(
                      error.response?.data?.error ||
                        error.message ||
                        'Eroare la pornirea sincronizării încasărilor'
                    )
                  }
                }
              }}
              className="flex items-center space-x-2 rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700 hover:bg-slate-800/80 disabled:opacity-60"
              disabled={syncStatus.running}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{syncStatus.running ? 'Sincronizare în curs...' : 'Refresh Încasări (Cyber)'}</span>
              {syncStatus.running && (
                <span className="inline-flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => navigate('/incasari/settings')}
              className="flex items-center space-x-2 rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700 hover:bg-slate-800/80"
            >
              <Settings className="w-4 h-4" />
              <span>Setări Încasări</span>
            </button>
            <button
              onClick={() => navigate('/incasari/cyber-table')}
              className="flex items-center space-x-2 rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700 hover:bg-slate-800/80"
            >
              <Table2 className="w-4 h-4" />
              <span>Tabel Cyber</span>
            </button>
            <button
              onClick={() => navigate('/incasari/floorplan')}
              className="flex items-center space-x-2 rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-3 py-2 border border-slate-700 hover:bg-slate-800/80"
            >
              <MapPin className="w-4 h-4" />
              <span>Floorplan Locație</span>
            </button>
          </div>
        </div>

        {/* Filtre timp + Locație / Provider / Cabinet / Game Mix (la fel ca în Cheltuieli) */}
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

        {/* Rând 2: DateRangeSelector + text Perioadă pe același rând (vizibil deasupra cardurilor) */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="min-w-[260px] max-w-md">
            <DateRangeSelector
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
            Perioadă:{' '}
            <span className="font-semibold ml-1">{dateRange.startDate}</span> –{' '}
            <span className="font-semibold">{dateRange.endDate}</span>
          </div>
        </div>

        {/* Carduri KPI principale - mutate aici, imediat după filtre */}
        {(() => {
          // Detectează dacă perioada selectată este "Luna curentă"
          const now = new Date()
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          const currentMonthStartStr = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStart.getDate()).padStart(2, '0')}`
          const currentMonthEndStr = `${currentMonthEnd.getFullYear()}-${String(currentMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`
          const isCurrentMonth = dateRange.startDate === currentMonthStartStr && dateRange.endDate === currentMonthEndStr
          
          // Folosește datele din overview.currentMonth dacă este luna curentă, altfel folosește summary
          // IMPORTANT: Verifică dacă overview.currentMonth există și are date, altfel folosește summary
          const hasCurrentMonthData = overview?.currentMonth && (
            overview.currentMonth.in || 
            overview.currentMonth.bet || 
            overview.currentMonth.ggr || 
            overview.currentMonth.profit ||
            overview.currentMonth.slots
          )
          const displayData = isCurrentMonth && hasCurrentMonthData ? {
            totalIn: overview.currentMonth.in || 0,
            totalBet: overview.currentMonth.bet || 0,
            totalProfit: overview.currentMonth.ggr || overview.currentMonth.profit || 0,
            slotsCount: overview.currentMonth.slots || summary.slotsCount || 0,
            daysCount: new Date().getDate(), // Zilele din luna curentă până azi
            averageDrop: overview.currentMonth.in && overview.currentMonth.slots && new Date().getDate() > 0 
              ? overview.currentMonth.in / new Date().getDate() / overview.currentMonth.slots 
              : 0,
            winBetPercent: overview.currentMonth.bet && overview.currentMonth.win
              ? (overview.currentMonth.win / overview.currentMonth.bet) * 100
              : 0
          } : summary
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-9 gap-4 mb-6">
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">Total IN</p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {formatNumber(displayData.totalIn)}
                </p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">Total BET</p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {formatNumber(displayData.totalBet)}
                </p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">GGR Total</p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {formatNumber(displayData.totalProfit)}
                </p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">Număr sloturi</p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {formatNumber(displayData.slotsCount)}
                </p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Average Drop ({displayData.daysCount || 0} zile)
                </p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {formatNumber(displayData.averageDrop)}
                </p>
              </div>
          <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Dinamica IN</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <p
                className={`text-xl font-bold ${
                  dynamics.inChange >= 0 ? 'text-emerald-400 dark:text-emerald-500' : 'text-red-400 dark:text-red-500'
                }`}
              >
                {dynamics.inChange >= 0 ? '+' : ''}
                {Math.round(dynamics.inChange).toLocaleString('ro-RO', {
                  maximumFractionDigits: 0,
                  minimumFractionDigits: 0
                })}
                %
              </p>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  dynamics.inChange >= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {dynamics.inChange >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
          <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Dinamica GGR</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <p
                className={`text-xl font-bold ${
                  dynamics.profitChange >= 0 ? 'text-emerald-400 dark:text-emerald-500' : 'text-red-400 dark:text-red-500'
                }`}
              >
                {dynamics.profitChange >= 0 ? '+' : ''}
                {Math.round(dynamics.profitChange).toLocaleString('ro-RO', {
                  maximumFractionDigits: 0,
                  minimumFractionDigits: 0
                })}
                %
              </p>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  dynamics.profitChange >= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {dynamics.profitChange >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">WIN/BET %</p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {displayData.winBetPercent
                    ? `${Math.round(displayData.winBetPercent).toLocaleString('ro-RO', {
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0
                      })}%`
                    : '0%'}
                </p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-lg text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Profit estimat ({estimatedProfit.daysUsed || 0} zile)
                </p>
                <p className="mt-2 text-xl font-bold text-emerald-400 dark:text-emerald-500">
                  {formatNumber(estimatedProfit.estimatedProfit || 0)}
                </p>
              </div>
            </div>
          )
        })()}

      {/* P&L pe locații pentru perioada selectată */}
      <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                P&L pe locații – perioada {dateRange.startDate} – {dateRange.endDate}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Notă: Valorile din acest tabel folosesc perioada selectată manual. Pentru comparație cu "Prezentare generală", asigură-te că perioada selectată corespunde cu perioada din tabelul respectiv.
              </p>
            </div>
            <button
              onClick={exportPLTableToExcel}
              className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
              title="Exportă în Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400">
                  <th className="py-2 px-3 text-left">Locație</th>
                  <th className="py-2 px-3 text-right">IN</th>
                  <th className="py-2 px-3 text-right">Bet</th>
                  <th className="py-2 px-3 text-right">GGR</th>
                  <th className="py-2 px-3 text-right">Marketing</th>
                  <th className="py-2 px-3 text-right">Bonus cost (%)</th>
                  <th className="py-2 px-3 text-right">Cheltuieli</th>
                  <th className="py-2 px-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {plByLocation.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 px-3 text-center text-slate-500 dark:text-slate-400">
                      Nu există date pentru perioada selectată
                    </td>
                  </tr>
                ) : (
                  <>
                    {plByLocation.map((row) => (
                    <tr
                      key={row.locationName}
                      className="border-b border-slate-200 dark:border-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{row.locationName}</td>
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-100">
                        {formatNumber(row.totalIn)} RON
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-100">
                        {formatNumber(row.bet)} RON
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                        {formatNumber(row.ggr)} RON
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-100">
                        {formatNumber(row.marketing)} RON
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-100">
                        {formatPercent(row.bonusCost)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-300">
                        {formatNumber(row.expenses)} RON
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          row.pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatNumber(row.pl)} RON
                      </td>
                    </tr>
                  ))}
                  {/* Rând cu totaluri */}
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 font-semibold">
                    <td className="py-3 px-3 text-slate-900 dark:text-slate-100">TOTAL</td>
                    <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                      {formatNumber(plTotals.totalIn)} RON
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                      {formatNumber(plTotals.bet)} RON
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatNumber(plTotals.ggr)} RON
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                      {formatNumber(plTotals.marketing)} RON
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                      {formatPercent(plTotals.bonusCost)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-300">
                      {formatNumber(plTotals.expenses)} RON
                    </td>
                    <td
                      className={`py-3 px-3 text-right ${
                        plTotals.pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatNumber(plTotals.pl)} RON
                    </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Prezentare generală */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Prezentare generală
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchOverview(true, true) // Manual refresh cu indicator și forțează refresh
                }}
                className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="Actualizare date"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing && <span className="text-xs">Actualizare...</span>}
              </button>
              <button
                onClick={exportOverviewToExcel}
                className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                title="Exportă în Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Perioadă
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Sloturi
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    GGR
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Dinamica GGR
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    IN
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    OUT
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    BET
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Marketing
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Bonus cost (%)
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    JACKPOT
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    HH
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    CASHBACK
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Zi naștere
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    Tombolă
                  </th>
                </tr>
              </thead>
              <tbody>
                {overviewRowConfigs.map(({ label, data, dynamics }, idx) => {
                  const marketingValue = calcMarketingValue(data)
                  const bonusValue = calcBonusCostPercent(data)
                  const rowClass =
                    idx === overviewRowConfigs.length - 1
                      ? ''
                      : 'border-b border-slate-100 dark:border-slate-800'
                  
                  // Calculează dinamica pentru GGR
                  const ggrDynamics = dynamics !== undefined && dynamics !== null ? dynamics : null
                  const isPositive = ggrDynamics !== null && ggrDynamics >= 0
                  
                  return (
                    <tr key={label} className={rowClass}>
                      <td className="py-2 px-3 font-medium">{label}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.slotsCount || 0)}</td>
                      <td className="py-2 px-3 text-right text-emerald-500 font-semibold">
                        {formatNumber(data?.ggr || 0)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {ggrDynamics !== null ? (
                          <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className={`font-semibold ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {isPositive ? '+' : ''}{Math.round(ggrDynamics)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.in || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.out || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.bet || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(marketingValue)}</td>
                      <td className="py-2 px-3 text-right">{formatPercent(bonusValue)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.jackpot || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.hh || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.cb_real || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.cb_birthday || 0)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(data?.cb_raffle || 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de progres sincronizare Încasări (Cyber) */}
        {syncModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70">
            <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    Sincronizare date Încasări (Cyber)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Status:{' '}
                    <span className="font-semibold">
                      {syncStatus.running ? 'În curs...' : 'Finalizat / Inactiv'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setSyncModalOpen(false)}
                  className="text-slate-400 hover:text-slate-100 text-sm"
                >
                  Închide
                </button>
              </div>

              <div className="mb-4 text-xs text-slate-300 space-y-1">
                <p>
                  Pornit la:{' '}
                  <span className="font-mono">
                    {syncStatus.startTime
                      ? new Date(syncStatus.startTime).toLocaleString('ro-RO')
                      : '-'}
                  </span>
                </p>
                <p>
                  Terminare:{' '}
                  <span className="font-mono">
                    {syncStatus.endTime
                      ? new Date(syncStatus.endTime).toLocaleString('ro-RO')
                      : syncStatus.running
                      ? 'în curs...'
                      : '-'}
                  </span>
                </p>
              </div>

              {syncStatus.running && (
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse" />
                </div>
              )}

              <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-3 max-h-64 overflow-auto text-xs font-mono whitespace-pre-wrap">
                {(() => {
                  const lines = (syncStatus.output || '').split('\n')
                  const lastLines = lines.slice(-40).join('\n').trim()
                  return lastLines || 'Nu există încă mesaje de la scriptul de sincronizare.'
                })()}
              </div>
            </div>
          </div>
        )}


        {/* Grafice principale - unul pe rând, mari */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Evoluție GGR {isSingleMonthRange ? '(zilnic)' : ''}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {dateRange.startDate} - {dateRange.endDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(chartData.reduce((sum, d) => sum + (d.totalGgr || 0), 0))} RON
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-end mt-1">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  Total perioadă
                </p>
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                Nu există date pentru perioada selectată
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#64748b" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(v) => v.toLocaleString('ro-RO')}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    
                    return (
                      <div
                        style={{
                          backgroundColor: '#1e293b',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                          border: 'none'
                        }}
                      >
                        <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
                          Data: {label}
                        </p>
                        {payload.map((entry, index) => (
                          <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
                            {entry.name}: {
                              entry.name === 'Sloturi active' 
                                ? entry.value.toLocaleString('ro-RO')
                                : formatNumber(entry.value)
                            }
                          </p>
                        ))}
                      </div>
                    );
                  }}
                  cursor={false}
                  wrapperStyle={{ 
                    backgroundColor: 'transparent',
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    margin: 0
                  }}
                  contentStyle={{ 
                    backgroundColor: 'transparent',
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    margin: 0
                  }}
                />
                {!isSingleMonthRange && (
                  <Bar
                    yAxisId="right"
                    dataKey="slotsCount"
                    name="Sloturi active"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="slotsCount"
                      position="inside"
                      formatter={(value) => value.toLocaleString('ro-RO')}
                      style={{ fontSize: '11px', fontWeight: 'bold', fill: '#fff' }}
                    />
                  </Bar>
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalGgr"
                  name="GGR"
                  stroke="#22c55e"
                  strokeWidth={4}
                  dot={{ fill: '#22c55e', r: 4 }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList
                    dataKey="totalGgr"
                    position="top"
                    formatter={(value) => formatNumber(value)}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#22c55e' }}
                  />
                </Line>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="trendGgr"
                  name="Trend GGR (AI)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  IN (Luna curentă vs Luna trecută)
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {dateRange.startDate} - {dateRange.endDate}
                </p>
              </div>
            </div>
            {comparisonChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400" style={{ height: '200px' }}>
                Nu există date pentru perioada selectată
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748b" 
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#64748b" 
                    style={{ fontSize: '12px' }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      
                      return (
                        <div
                          style={{
                            backgroundColor: '#1e293b',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                            border: 'none'
                          }}
                        >
                          <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
                            Zi {label.replace('Zi ', '')}
                          </p>
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
                              {entry.name}: {formatNumber(entry.value)}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                    cursor={false}
                    wrapperStyle={{ 
                      backgroundColor: 'transparent',
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      padding: 0,
                      margin: 0
                    }}
                    contentStyle={{ 
                      backgroundColor: 'transparent',
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      padding: 0,
                      margin: 0
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="currentIn" name="IN Luna curentă" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="currentIn"
                      position="top"
                      formatter={(value) => formatNumber(value)}
                      style={{ fontSize: '10px', fontWeight: 'bold', fill: '#22c55e' }}
                    />
                  </Bar>
                  <Bar yAxisId="left" dataKey="lastIn" name="IN Luna trecută" fill="#60a5fa" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="lastIn"
                      position="top"
                      formatter={(value) => formatNumber(value)}
                      style={{ fontSize: '10px', fontWeight: 'bold', fill: '#60a5fa' }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar charts Top N pe locații și cabinete (IN mediu/slot) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Top 10 + Altele - GGR pe locații
              </h2>
            </div>
            <div className="h-80">
              {locationPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                  Nu există date pentru perioada selectată
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationPieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis 
                      type="number" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(v) => formatNumber(v)} 
                    />
                    <YAxis 
                      dataKey="locationName" 
                      type="category" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      width={120} 
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        
                        return (
                          <div
                            style={{
                              backgroundColor: '#1e293b',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                              border: 'none'
                            }}
                          >
                            <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
                              Locație: {label}
                            </p>
                            <p style={{ color: '#22c55e', margin: '4px 0' }}>
                              GGR: {formatNumber(payload[0]?.value || 0)} RON
                            </p>
                          </div>
                        );
                      }}
                      cursor={false}
                      wrapperStyle={{ 
                        backgroundColor: 'transparent',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        margin: 0
                      }}
                      contentStyle={{ 
                        backgroundColor: 'transparent',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        margin: 0
                      }}
                    />
                    <Bar dataKey="totalProfit" fill="#22c55e" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="totalProfit"
                        position="right"
                        formatter={(value) => formatNumber(value)}
                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#22c55e' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Top 10 + Altele - Average Drop pe cabinete
              </h2>
            </div>
            <div className="h-80">
              {cabinetPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                  Nu există date pentru perioada selectată
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cabinetPieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis 
                      type="number" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(v) => formatNumber(v)} 
                    />
                    <YAxis 
                      dataKey="cabinetName" 
                      type="category" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      width={120} 
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        
                        return (
                          <div
                            style={{
                              backgroundColor: '#1e293b',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                              border: 'none'
                            }}
                          >
                            <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
                              Cabinet: {label}
                            </p>
                            <p style={{ color: '#0ea5e9', margin: '4px 0' }}>
                              Average Drop: {formatNumber(payload[0]?.value || 0)} RON
                            </p>
                          </div>
                        );
                      }}
                      cursor={false}
                      wrapperStyle={{ 
                        backgroundColor: 'transparent',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        margin: 0
                      }}
                      contentStyle={{ 
                        backgroundColor: 'transparent',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        margin: 0
                      }}
                    />
                    <Bar dataKey="averageDrop" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="averageDrop"
                        position="right"
                        formatter={(value) => formatNumber(value)}
                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0ea5e9' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Tabel Sloturi pe lună și locație pentru anul curent */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Număr sloturi pe lună și locație - Anul {slotsByMonthLocation.year}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '120px' }} />
                {slotsByMonthLocation.locations.map(() => (
                  <col key={Math.random()} style={{ width: '180px' }} />
                ))}
                <col style={{ width: '150px' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10">
                    Lună
                  </th>
                  {slotsByMonthLocation.locations.map((location) => (
                    <th
                      key={location}
                      className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300"
                      style={{ width: '180px' }}
                    >
                      {location}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60" style={{ width: '150px' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const monthNames = [
                    'Ianuarie',
                    'Februarie',
                    'Martie',
                    'Aprilie',
                    'Mai',
                    'Iunie',
                    'Iulie',
                    'August',
                    'Septembrie',
                    'Octombrie',
                    'Noiembrie',
                    'Decembrie'
                  ]
                  const monthData = slotsByMonthLocation.monthData[month] || {}
                  
                  // Calculează totalul pentru această lună (suma tuturor locațiilor)
                  const monthTotal = slotsByMonthLocation.locations.reduce((sum, location) => {
                    return sum + (Number(monthData[location] || 0))
                  }, 0)
                  
                  // Folosește datele salvate local sau datele curente - AFIȘEAZĂ MEREU ULTIMELE DATE
                  const getValue = (location) => {
                    const value = Number(monthData[location] || 0)
                    const key = `slots_${slotsByMonthLocation.year}_${month}_${location}`
                    
                    // Dacă există valoare nouă (chiar dacă e zero), salvează-o și o folosește
                    if (value !== null && value !== undefined && !isNaN(value)) {
                      try {
                        localStorage.setItem(key, value.toString())
                      } catch (e) {}
                      return value
                    }
                    
                    // Dacă nu există valoare nouă, încarcă ultima valoare salvată
                    try {
                      const saved = localStorage.getItem(key)
                      if (saved !== null && saved !== undefined) {
                        const savedValue = Number(saved)
                        if (!isNaN(savedValue)) {
                          return savedValue
                        }
                      }
                    } catch (e) {}
                    
                    // Dacă nu există nimic salvat, returnează 0 (dar va fi afișat)
                    return 0
                  }
                  
                  const savedTotal = slotsByMonthLocation.locations.reduce((sum, location) => {
                    return sum + getValue(location)
                  }, 0)
                  
                  return (
                    <tr
                      key={month}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10">
                        {monthNames[month - 1]}
                      </td>
                      {slotsByMonthLocation.locations.map((location) => {
                        const value = getValue(location)
                        return (
                          <td
                            key={location}
                            className="px-3 py-2 text-right text-slate-800 dark:text-slate-100"
                            style={{ width: '180px' }}
                          >
                            {formatNumber(value)}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/60" style={{ width: '150px' }}>
                        {formatNumber(savedTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel GGR pe lună și locație pentru anul selectat */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Tabel zilnic (centralizator) - GGR pe lună și locație - Anul {ggrByMonthLocation.year}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  try {
                    const rows = [
                      ['Lună', ...ggrByMonthLocation.locations, 'Total']
                    ]
                    
                    const monthNames = [
                      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
                    ]
                    
                    Array.from({ length: 12 }, (_, i) => i + 1).forEach((month) => {
                      const monthData = ggrByMonthLocation.monthData[month] || {}
                      const row = [monthNames[month - 1]]
                      
                      let monthTotal = 0
                      ggrByMonthLocation.locations.forEach((location) => {
                        const value = Number(monthData[location] || 0)
                        row.push(value)
                        monthTotal += value
                      })
                      row.push(monthTotal)
                      rows.push(row)
                    })
                    
                    // Adaugă rândul Total pentru anul în curs
                    const totalRow = ['Total']
                    let grandTotal = 0
                    ggrByMonthLocation.locations.forEach((location) => {
                      let locationTotal = 0
                      for (let month = 1; month <= 12; month++) {
                        const monthData = ggrByMonthLocation.monthData[month] || {}
                        locationTotal += Number(monthData[location] || 0)
                      }
                      totalRow.push(locationTotal)
                      grandTotal += locationTotal
                    })
                    totalRow.push(grandTotal)
                    rows.push(totalRow)
                    
                    const ws = XLSX.utils.aoa_to_sheet(rows)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, 'GGR pe lună și locație')
                    XLSX.writeFile(wb, `GGR_Luna_Locatie_${ggrByMonthLocation.year}.xlsx`)
                    toast.success('Export Excel realizat cu succes!')
                  } catch (error) {
                    console.error('Eroare la export Excel:', error)
                    toast.error('Eroare la export Excel')
                  }
                }}
                className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                title="Exportă în Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '120px' }} />
                {ggrByMonthLocation.locations.map(() => (
                  <col key={Math.random()} style={{ width: '180px' }} />
                ))}
                <col style={{ width: '150px' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10">
                    Lună
                  </th>
                  {ggrByMonthLocation.locations.map((location) => (
                    <th
                      key={location}
                      className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300"
                      style={{ width: '180px' }}
                    >
                      {location}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60" style={{ width: '150px' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const monthNames = [
                    'Ianuarie',
                    'Februarie',
                    'Martie',
                    'Aprilie',
                    'Mai',
                    'Iunie',
                    'Iulie',
                    'August',
                    'Septembrie',
                    'Octombrie',
                    'Noiembrie',
                    'Decembrie'
                  ]
                  const monthData = ggrByMonthLocation.monthData[month] || {}
                  const currentMonth = new Date().getMonth() + 1
                  const currentYear = new Date().getFullYear()
                  const isCurrentMonth = month === currentMonth && ggrByMonthLocation.year === currentYear
                  
                  // Pentru luna curentă, folosim totalul din overview.currentMonth pentru consistență
                  // Pentru celelalte luni, calculăm din datele tabelului
                  let monthTotal
                  if (isCurrentMonth && overview?.currentMonth) {
                    // Folosim totalul din "Prezentare generală" pentru luna curentă (este corect)
                    monthTotal = Number(overview.currentMonth.ggr || overview.currentMonth.profit || 0)
                  } else {
                    // Pentru luni închise, calculăm din datele tabelului
                    monthTotal = ggrByMonthLocation.locations.reduce((sum, location) => {
                      return sum + (Number(monthData[location] || 0))
                    }, 0)
                  }
                  
                  // Folosește datele salvate local sau datele curente - AFIȘEAZĂ MEREU ULTIMELE DATE
                  const getValue = (location) => {
                    const value = Number(monthData[location] || 0)
                    const key = `ggr_${ggrByMonthLocation.year}_${month}_${location}`
                    
                    // Dacă există valoare nouă (chiar dacă e zero), salvează-o și o folosește
                    if (value !== null && value !== undefined && !isNaN(value)) {
                      try {
                        localStorage.setItem(key, value.toString())
                      } catch (e) {}
                      return value
                    }
                    
                    // Dacă nu există valoare nouă, încarcă ultima valoare salvată
                    try {
                      const saved = localStorage.getItem(key)
                      if (saved !== null && saved !== undefined) {
                        const savedValue = Number(saved)
                        if (!isNaN(savedValue)) {
                          return savedValue
                        }
                      }
                    } catch (e) {}
                    
                    // Dacă nu există nimic salvat, returnează 0 (dar va fi afișat)
                    return 0
                  }
                  
                  // Pentru luna curentă, folosim totalul din overview (este corect)
                  // Pentru celelalte luni, calculăm din valorile per locație
                  const savedTotal = isCurrentMonth && overview?.currentMonth 
                    ? monthTotal 
                    : ggrByMonthLocation.locations.reduce((sum, location) => {
                        return sum + getValue(location)
                      }, 0)
                  
                  return (
                    <tr
                      key={month}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-50 dark:bg-slate-800/60 z-10">
                        {monthNames[month - 1]}
                      </td>
                      {ggrByMonthLocation.locations.map((location) => {
                        const value = getValue(location)
                        return (
                          <td
                            key={location}
                            className="px-3 py-2 text-right text-slate-800 dark:text-slate-100"
                            style={{ width: '180px' }}
                          >
                            {formatNumber(value)}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/60" style={{ width: '150px' }}>
                        {formatNumber(savedTotal)}
                      </td>
                    </tr>
                  )
                })}
                {/* Rând Total pentru anul în curs */}
                {(() => {
                  // Calculează totalurile pentru fiecare locație pe toate lunile
                  const yearTotals = ggrByMonthLocation.locations.reduce((acc, location) => {
                    let total = 0
                    for (let month = 1; month <= 12; month++) {
                      const monthData = ggrByMonthLocation.monthData[month] || {}
                      const value = Number(monthData[location] || 0)
                      const key = `ggr_${ggrByMonthLocation.year}_${month}_${location}`
                      
                      // Dacă există valoare nouă, o folosește
                      if (value !== null && value !== undefined && !isNaN(value)) {
                        total += value
                      } else {
                        // Dacă nu există valoare nouă, încarcă ultima valoare salvată
                        try {
                          const saved = localStorage.getItem(key)
                          if (saved !== null && saved !== undefined) {
                            const savedValue = Number(saved)
                            if (!isNaN(savedValue)) {
                              total += savedValue
                            }
                          }
                        } catch (e) {}
                      }
                    }
                    acc[location] = total
                    return acc
                  }, {})
                  
                  // Calculează totalul general (suma tuturor locațiilor pentru toate lunile)
                  const grandTotal = Object.values(yearTotals).reduce((sum, val) => sum + val, 0)
                  
                  return (
                    <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/80 font-bold">
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-100 dark:bg-slate-800/80 z-10">
                        Total
                      </td>
                      {ggrByMonthLocation.locations.map((location) => (
                        <td
                          key={location}
                          className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100"
                          style={{ width: '180px' }}
                        >
                          {formatNumber(yearTotals[location] || 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-700/80" style={{ width: '150px' }}>
                        {formatNumber(grandTotal)}
                      </td>
                    </tr>
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Incasari
