import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import axios from 'axios'
import { DollarSign, RefreshCw, Settings, Download, FileSpreadsheet, FileText, Filter, Calendar, Building2, Briefcase, BarChart3, Brain, TrendingUp, TrendingDown, Table2, MapPin, Maximize2, Minimize2, Clock, CalendarDays, CalendarRange, Database, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import ExpendituresMappingModal from '../components/modals/ExpendituresMappingModal'
import ExpendituresCharts from '../components/ExpendituresCharts'
import ExpendituresAdvancedCharts from '../components/ExpendituresAdvancedCharts'
import ExpendituresTable from '../components/ExpendituresTable'
import DateRangeSelector from '../components/DateRangeSelector'
import { generateAIInsights } from '../utils/aiInsights'

// Normalize diacritics for comparison (same as ExpendituresSettings)
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

const Expenditures = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const exportRef = useRef(null) // Ref pentru export PDF
  
  // Check permissions
  useEffect(() => {
    if (user && !user.permissions?.expenditures) {
      toast.error('Nu aveți permisiuni pentru această pagină')
      navigate('/dashboard')
    }
  }, [user, navigate])
  
  const [expendituresData, setExpendituresData] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const progressIntervalRef = useRef(null)
  const importAllProgressIntervalRef = useRef(null)
  
  // Chart sizes from localStorage - ACTUALIZARE LIVE!
  const [chartSizes, setChartSizes] = useState(() => {
    try {
      const saved = localStorage.getItem('expenditures_charts_sizes')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.log('No saved chart sizes')
    }
    return {}
  })
  
  // Chart visibility from localStorage - ACTUALIZARE LIVE!
  const [chartVisibility, setChartVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('expenditures_charts_visibility')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.log('No saved chart visibility')
    }
    return {}
  })
  
  const [visibleCharts, setVisibleCharts] = useState(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('charts_preferences')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.log('No saved chart preferences')
    }
    // Default: TOATE graficele afișate
    return {
      evolutionChart: true,
      departmentsChart: true,
      locationsChart: true,
      monthComparison: true,
      heatmap: true,
      pieTop10: true,
      stackedArea: true,
      trendPrediction: true
    }
  })
  
  // Listen for localStorage changes from Settings Modal
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const sizes = localStorage.getItem('expenditures_charts_sizes')
        const visibility = localStorage.getItem('expenditures_charts_visibility')
        
        if (sizes) setChartSizes(JSON.parse(sizes))
        if (visibility) setChartVisibility(JSON.parse(visibility))
        
        console.log('📊 Chart settings updated from localStorage!')
      } catch (error) {
        console.error('Error updating chart settings:', error)
      }
    }
    
    // Listen to storage events AND custom event from modal
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('expenditures-settings-changed', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('expenditures-settings-changed', handleStorageChange)
    }
  }, [])
  
  // Helper: Get chart height based on size setting
  const getChartHeight = (chartId, defaultHeight = 300) => {
    const size = chartSizes[chartId] || 'L' // Default: Large
    const heights = {
      'S': Math.round(defaultHeight * 0.4),  // Small: 40%
      'M': Math.round(defaultHeight * 0.6),  // Medium: 60%
      'L': defaultHeight,                     // Large: 100%
      'XL': Math.round(defaultHeight * 1.5)  // XL: 150%
    }
    return heights[size] || defaultHeight
  }
  
  // Helper: Check if chart is visible
  const isChartVisible = (chartId) => {
    return chartVisibility[chartId] !== false // Default: true (visible)
  }
  
  // Load saved preferences from localStorage
  const loadSavedPreferences = () => {
    try {
      const saved = localStorage.getItem('expenditures_preferences')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
    return null
  }
  
  const savedPrefs = loadSavedPreferences()
  
  // Filters with saved preferences
  // Default date range: 2020-2026 pentru a afișa TOATE datele disponibile (inclusiv cele vechi din BAT/Google Sheets)
  const [dateRange, setDateRange] = useState(
    savedPrefs?.dateRange || {
      startDate: '2020-01-01', // Data foarte veche pentru a include TOATE datele vechi
      endDate: (() => {
        const today = new Date()
        const end = new Date(today.getFullYear() + 1, 11, 31)
        const year = end.getFullYear()
        const month = String(end.getMonth() + 1).padStart(2, '0')
        const day = String(end.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}` // Anul viitor pentru a include toate datele viitoare
      })()
    }
  )
  const [departmentFilter, setDepartmentFilter] = useState(savedPrefs?.departmentFilter || 'all')
  const [expenditureTypeFilter, setExpenditureTypeFilter] = useState(savedPrefs?.expenditureTypeFilter || 'all')
  const [locationFilter, setLocationFilter] = useState(savedPrefs?.locationFilter || 'all') // NEW!
  const [selectedDateFilter, setSelectedDateFilter] = useState(savedPrefs?.selectedDateFilter || 'anul-curent')
  const [allDepartmentsExpanded, setAllDepartmentsExpanded] = useState(false)
  const [importProgress, setImportProgress] = useState(null) // Progress state for modal
  
  // Save preferences whenever filters change
  useEffect(() => {
    const preferences = {
      dateRange,
      departmentFilter,
      expenditureTypeFilter,
      locationFilter,
      selectedDateFilter
    }
    localStorage.setItem('expenditures_preferences', JSON.stringify(preferences))
  }, [dateRange, departmentFilter, expenditureTypeFilter, locationFilter, selectedDateFilter])
  
  // Quick date filters
  // Fix timezone issues - format date fără timezone conversion
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const applyQuickDateFilter = (filterType) => {
    const today = new Date()
    let startDate, endDate
    
    switch (filterType) {
      case 'azi':
        startDate = formatDateLocal(today)
        endDate = formatDateLocal(today)
        break
      
      case 'saptamana-curenta':
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday as start
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        startDate = formatDateLocal(monday)
        endDate = formatDateLocal(today)
        break
      
      case 'luna-curenta':
        // FIX: Prima zi a lunii curente, NU ultima zi a lunii trecute!
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Ultima zi a lunii curente
        startDate = formatDateLocal(currentMonthStart)
        endDate = formatDateLocal(currentMonthEnd)
        break
      
      case 'luna-anterioara':
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0) // Ultima zi a lunii anterioare
        startDate = formatDateLocal(prevMonthStart)
        endDate = formatDateLocal(prevMonthEnd)
        break
      
      case 'anul-curent':
        startDate = formatDateLocal(new Date(today.getFullYear(), 0, 1))
        endDate = formatDateLocal(new Date(today.getFullYear(), 11, 31))
        break
      
      case 'anul-trecut':
        startDate = formatDateLocal(new Date(today.getFullYear() - 1, 0, 1))
        endDate = formatDateLocal(new Date(today.getFullYear() - 1, 11, 31))
        break
      
      case 'toate':
        // All time - set very broad range
        startDate = '2020-01-01'
        endDate = formatDateLocal(new Date(today.getFullYear() + 1, 11, 31))
        break
      
      default:
        return
    }
    
    setDateRange({ startDate, endDate })
    setSelectedDateFilter(filterType)
  }
  
  // Settings
  const [syncSettings, setSyncSettings] = useState({
    autoSync: false,
    syncInterval: 24,
    syncTime: '02:00',
    filters: {
      show_in_expenditures: true,
      exclude_deleted: true
    }
  })
  
  // Load settings
  useEffect(() => {
    const abortController = new AbortController()
    
    const loadSettings = async () => {
      try {
        const response = await axios.get('/api/expenditures/settings', {
          signal: abortController.signal
        })
        console.log('✅ [Expenditures] Loaded sync settings:', {
          includedDepartments: response.data?.includedDepartments?.length || 0,
          includedTypes: response.data?.includedExpenditureTypes?.length || 0,
          includedLocations: response.data?.includedLocations?.length || 0
        })
        setSyncSettings(response.data)
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('Error loading sync settings:', error)
        }
      }
    }
    
    loadSettings()
    
    return () => {
      abortController.abort()
    }
  }, [])
  
  // Load expenditures data
  const loadExpendituresData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data', {
        signal: new AbortController().signal // Creează un nou controller pentru fiecare apel
      })
      
      const data = Array.isArray(response.data) ? response.data : []
      setExpendituresData(data)
      console.log('✅ Expenditures data loaded:', data.length)
      
      // Reset departmentFilter dacă este setat pe un departament exclus automat
      const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
      if (excludedDepartments.includes(departmentFilter)) {
        console.warn(`⚠️ departmentFilter (${departmentFilter}) este exclus automat! Resetare la 'all'`)
        setDepartmentFilter('all')
      }
      
      if (data.length > 0) {
        const dateRange = data.reduce((acc, item) => {
          if (item.operational_date) {
            const date = new Date(item.operational_date)
            if (!acc.min || date < acc.min) acc.min = date
            if (!acc.max || date > acc.max) acc.max = date
          }
          return acc
        }, { min: null, max: null })
        console.log('📅 Date range in data:', {
          min: dateRange.min?.toISOString().split('T')[0],
          max: dateRange.max?.toISOString().split('T')[0],
          currentFilter: `${dateRange.startDate} - ${dateRange.endDate}`
        })
      }
      
      if (data.length === 0) {
        console.warn('⚠️ No expenditures data found in database')
        toast.info('Nu există date de cheltuieli în baza de date. Folosește "Import Toate Datele" din Setări pentru a importa date.', {
          duration: 8000
        })
      }
      
      // Verifică dacă există date pentru toate lunile din intervalul selectat
      if (response.data.length > 0 && dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        const monthsWithData = new Set()
        
        response.data.forEach(item => {
          const itemDate = new Date(item.operational_date)
          if (itemDate >= startDate && itemDate <= endDate) {
            const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
            monthsWithData.add(monthKey)
          }
        })
        
        // Detectează luni lipsă
        const missingMonths = []
        for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthsWithData.has(monthKey)) {
            missingMonths.push(monthKey)
          }
        }
        
        if (missingMonths.length > 0) {
          console.warn('⚠️ Luni fără date detectate:', missingMonths)
          console.warn('💡 Sfat: Folosește butonul "Import Toate Datele" pentru a aduce toate datele din toate sursele (SQL, API, Google Sheets)')
        }
      }
    } catch (error) {
      if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
        console.error('Error loading expenditures:', error)
        toast.error('Eroare la încărcarea cheltuielilor')
      }
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    const abortController = new AbortController()
    
    // Wrapper pentru loadExpendituresData cu AbortController
    const loadWithAbort = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/expenditures/data', {
          signal: abortController.signal
        })
        setExpendituresData(response.data)
        console.log('✅ Expenditures data loaded:', response.data.length)
        
        // Verifică dacă există date pentru toate lunile din intervalul selectat
        if (response.data.length > 0 && dateRange.startDate && dateRange.endDate) {
          const startDate = new Date(dateRange.startDate)
          const endDate = new Date(dateRange.endDate)
          const monthsWithData = new Set()
          
          response.data.forEach(item => {
            const itemDate = new Date(item.operational_date)
            if (itemDate >= startDate && itemDate <= endDate) {
              const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
              monthsWithData.add(monthKey)
            }
          })
          
          // Detectează luni lipsă
          const missingMonths = []
          for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (!monthsWithData.has(monthKey)) {
              missingMonths.push(monthKey)
            }
          }
          
          if (missingMonths.length > 0) {
            console.warn('⚠️ Luni fără date detectate:', missingMonths)
            console.warn('💡 Sfat: Folosește butonul "Import Toate Datele" pentru a aduce toate datele din toate sursele (SQL, API, Google Sheets)')
          }
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ECONNABORTED') {
          console.error('Error loading expenditures:', error)
          toast.error('Eroare la încărcarea cheltuielilor')
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadWithAbort()
    
    return () => {
      abortController.abort()
    }
  }, [])
  
  // Function to fetch progress
  const fetchProgress = async () => {
    try {
      const response = await axios.get('/api/expenditures/sync-status')
      const progress = response.data
      
      if (progress && progress.status === 'running') {
        // Update toast with detailed progress
        const progressPercent = progress.totalFiltered > 0 
          ? Math.round((progress.processed / progress.totalFiltered) * 100)
          : 0
        
        const progressMessage = `${progress.currentStep}\n` +
          `📊 Total găsite: ${progress.totalFetched || 0} | ` +
          `După filtre: ${progress.totalFiltered || 0}\n` +
          `✅ Procesate: ${progress.processed || 0}/${progress.totalFiltered || 0} (${progressPercent}%)\n` +
          `📝 Noi: ${progress.inserted || 0} | ` +
          `🔄 Duplicate: ${progress.skipped || 0} | ` +
          `❌ Erori: ${progress.errors || 0}`
        
        toast.loading(progressMessage, { 
          id: 'sync',
          duration: 2000 
        })
      } else if (progress && (progress.status === 'completed' || progress.status === 'failed')) {
        // Stop polling
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        
        if (progress.status === 'completed') {
          const finalMessage = `✅ Sincronizare completă!\n` +
            `📊 Total găsite: ${progress.totalFetched || 0}\n` +
            `✅ Procesate: ${progress.processed || 0}/${progress.totalFiltered || 0}\n` +
            `📝 Noi adăugate: ${progress.inserted || 0}\n` +
            `🔄 Duplicate: ${progress.skipped || 0}\n` +
            `${progress.errors > 0 ? `❌ Erori: ${progress.errors}\n` : ''}` +
            `⏱️ Durata: ${Math.round((new Date(progress.endTime) - new Date(progress.startTime)) / 1000)}s`
          
          toast.success(finalMessage, { 
            id: 'sync',
            duration: 8000 
          })
          
          // Reload data
          await loadExpendituresData()
        } else {
          toast.error(`❌ Sincronizare eșuată: ${progress.currentStep || 'Eroare necunoscută'}`, { 
            id: 'sync',
            duration: 5000 
          })
        }
        
        setSyncing(false)
      }
    } catch (error) {
      // If 404 error (endpoint not available), keep progress but update status
      if (error.response?.status === 404) {
        // Continue polling
      } else {
        console.error('Error fetching sync progress:', error)
      }
    }
  }
  
  // Sync data from external DB
  const handleSync = async () => {
    try {
      setSyncing(true)
      progressIntervalRef.current = null
      
      // Show initial toast immediately
      toast.loading('Pornire sincronizare...', { id: 'sync', duration: 1000 })
      
      // Start the sync (non-blocking)
      const response = await axios.post('/api/expenditures/sync', {
        // startDate și endDate NU se trimit - vrem TOATE datele disponibile
        filters: syncSettings.filters
      }).catch((error) => {
        // If sync already running, start polling
        if (error.response?.status === 400) {
          // Start polling immediately
          progressIntervalRef.current = setInterval(fetchProgress, 1500) // Poll every 1.5 seconds
          setTimeout(fetchProgress, 500) // Initial fetch
          return { data: { success: true, alreadyRunning: true } }
        }
        throw error
      })
      
      if (response.data?.success && !response.data?.alreadyRunning) {
        // Sync started successfully, start polling for progress
        progressIntervalRef.current = setInterval(fetchProgress, 1500) // Poll every 1.5 seconds
        setTimeout(fetchProgress, 500) // Initial fetch after 500ms
      } else if (response.data?.alreadyRunning) {
        // Already running, just start polling
        progressIntervalRef.current = setInterval(fetchProgress, 1500)
        setTimeout(fetchProgress, 500)
      }
    } catch (error) {
      // Stop progress updates
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      
      setSyncing(false)
      console.error('Error syncing expenditures:', error)
      
      // Extract detailed error message from response
      const errorMessage = error.response?.data?.error || error.message || 'Eroare necunoscută la sincronizare'
      const errorHint = error.response?.data?.hint
      
      // Show detailed error message
      if (errorHint) {
        toast.error(`${errorMessage}\n💡 ${errorHint}`, { 
          id: 'sync',
          duration: 5000 
        })
      } else {
        toast.error(`❌ ${errorMessage}`, { 
          id: 'sync',
          duration: 5000 
        })
      }
    }
  }
  
  // Fetch import-all progress
  const fetchImportAllProgress = async () => {
    try {
      const response = await axios.get('/api/expenditures/import-all-status')
      const progress = response.data
      
      // Update progress state for modal
      setImportProgress(progress)
      
      if (progress && progress.status === 'running') {
        // Modal will show progress, no need for toast
      } else if (progress && (progress.status === 'completed' || progress.status === 'failed')) {
        // Stop polling
        if (importAllProgressIntervalRef.current) {
          clearInterval(importAllProgressIntervalRef.current)
          importAllProgressIntervalRef.current = null
        }
        
        if (progress.status === 'completed') {
          // Reload data after 2 seconds to show final state
          setTimeout(async () => {
      await loadExpendituresData()
          }, 2000)
        }
        
        setSyncing(false)
        
        // Auto-close modal after 5 seconds
        setTimeout(() => {
          setImportProgress(null)
        }, 5000)
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // Continue polling
      } else {
        console.error('Error fetching import-all progress:', error)
      }
    }
  }
  
  // Curățare duplicate din baza de date
  const handleCleanDuplicates = async () => {
    try {
      const confirmed = window.confirm('⚠️ Ești sigur că vrei să ștergi duplicatele? Această acțiune nu poate fi anulată!\n\nSe vor păstra doar primele înregistrări, restul duplicatele vor fi șterse.')
      if (!confirmed) return
      
      toast.loading('Se curăță duplicatele...', { id: 'clean-duplicates' })
      
      const response = await axios.post('/api/expenditures/clean-duplicates')
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n📊 Total înregistrări după curățare: ${response.data.totalRecordsAfter}`, { 
          id: 'clean-duplicates',
          duration: 8000 
        })
        
        // Reload data
        await loadExpendituresData()
      }
    } catch (error) {
      console.error('Error cleaning duplicates:', error)
      toast.error(`❌ Eroare la curățarea duplicate-urilor: ${error.response?.data?.error || error.message}`, { 
        id: 'clean-duplicates',
        duration: 5000 
      })
    }
  }
  
  // Import TOATE datele din toate sursele (SQL, Google Sheets, BAT) - fără dubluri
  const handleImportAll = async () => {
    try {
      setSyncing(true)
      importAllProgressIntervalRef.current = null
      
      // Show initial toast immediately
      toast.loading('Pornire import...', { id: 'import-all', duration: 1000 })
      
      // Start the import (non-blocking)
      const response = await axios.post('/api/expenditures/import-all', {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch((error) => {
        // If import already running, start polling
        if (error.response?.status === 400 && error.response?.data?.alreadyRunning) {
          console.log('⚠️ Import already running, starting polling...')
          importAllProgressIntervalRef.current = setInterval(fetchImportAllProgress, 1500)
          setTimeout(fetchImportAllProgress, 500)
          return { data: { success: true, alreadyRunning: true } }
        }
        // Other 400 errors should be thrown
        console.error('❌ Error starting import:', error.response?.data || error.message)
        throw error
      })
      
      if (response.data?.success && !response.data?.alreadyRunning) {
        // Import started successfully, start polling for progress
        importAllProgressIntervalRef.current = setInterval(fetchImportAllProgress, 1500)
        setTimeout(fetchImportAllProgress, 500)
      } else if (response.data?.alreadyRunning) {
        // Already running, just start polling
        importAllProgressIntervalRef.current = setInterval(fetchImportAllProgress, 1500)
        setTimeout(fetchImportAllProgress, 500)
      }
    } catch (error) {
      // Stop progress updates
      if (importAllProgressIntervalRef.current) {
        clearInterval(importAllProgressIntervalRef.current)
        importAllProgressIntervalRef.current = null
      }
      
      setSyncing(false)
      console.error('Error importing all expenditures:', error)
      
      // Extract detailed error message
      const errorMessage = error.response?.data?.error || error.message || 'Eroare la importul tuturor datelor'
      const errorDetails = error.response?.data?.message || ''
      
      if (error.response?.status === 400 && error.response?.data?.alreadyRunning) {
        // Import already running - start polling
        importAllProgressIntervalRef.current = setInterval(fetchImportAllProgress, 1500)
        setTimeout(fetchImportAllProgress, 500)
        toast.loading('Import deja în curs. Se verifică progresul...', { 
          id: 'import-all',
          duration: 2000 
        })
      } else {
        toast.error(`❌ ${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`, { 
          id: 'import-all',
          duration: 5000 
        })
      }
    }
  }
  
  // Cleanup progress intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (importAllProgressIntervalRef.current) {
        clearInterval(importAllProgressIntervalRef.current)
        importAllProgressIntervalRef.current = null
      }
    }
  }, [])

  // Process data into matrix format (expenditure_types × locations)
  // RETURNEAZĂ ȘI datele filtrate pentru a le folosi în ExpendituresTable
  const processDataToMatrix = () => {
    if (!expendituresData || expendituresData.length === 0) {
      console.log('⚠️ [processDataToMatrix] No expenditures data')
      return { matrix: [], locations: [], expenditureTypes: [], filteredCount: 0, filteredDataForTable: [] }
    }
    
    console.log(`📊 [processDataToMatrix] Starting with ${expendituresData.length} records`)
    
    // Apply filters
    let filteredData = expendituresData
    
    // EXCLUDE "Unknown" FORȚAT (user NU vrea să-l vadă NICIODATĂ!)
    const beforeUnknown = filteredData.length
    filteredData = filteredData.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    console.log(`  After excluding Unknown: ${beforeUnknown} → ${filteredData.length}`)
    
    // EXCLUDE 4 DEPARTAMENTE DEBIFATE (POS, Registru de Casă, Bancă, Alte Cheltuieli)
    const beforeExcluded = filteredData.length
    const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
    filteredData = filteredData.filter(item => {
      return !excludedDepartments.includes(item.department_name)
    })
    console.log(`  After excluding POS/Bancă/Alte Cheltuieli: ${beforeExcluded} → ${filteredData.length}`)
    
    // DATE RANGE FILTER
    if (dateRange.startDate && dateRange.endDate) {
      const beforeDate = filteredData.length
      filteredData = filteredData.filter(item => {
        if (!item.operational_date) return false
        const itemDate = new Date(item.operational_date)
        const startDate = new Date(dateRange.startDate + 'T00:00:00')
        const endDate = new Date(dateRange.endDate + 'T23:59:59')
        const isInRange = itemDate >= startDate && itemDate <= endDate
        return isInRange
      })
      console.log(`  After date range filter (${dateRange.startDate} - ${dateRange.endDate}): ${beforeDate} → ${filteredData.length}`)
      if (filteredData.length === 0 && beforeDate > 0) {
        console.warn('  ⚠️ All data filtered out by date range! Sample dates in data:', expendituresData.slice(0, 3).map(d => d.operational_date))
      }
    } else {
      console.log('  ⏭️ Skipping date range filter (not set)')
    }
    
    // APPLY SETTINGS FILTERS (includedDepartments, includedTypes, includedLocations)
    const includedDepartments = syncSettings?.includedDepartments
    const includedTypes = syncSettings?.includedExpenditureTypes
    const includedLocations = syncSettings?.includedLocations
    
    console.log('  📋 SyncSettings:', {
      hasIncludedDepartments: Array.isArray(includedDepartments) && includedDepartments.length > 0,
      deptCount: Array.isArray(includedDepartments) ? includedDepartments.length : 0,
      hasIncludedTypes: Array.isArray(includedTypes) && includedTypes.length > 0,
      typesCount: Array.isArray(includedTypes) ? includedTypes.length : 0,
      hasIncludedLocations: Array.isArray(includedLocations) && includedLocations.length > 0,
      locCount: Array.isArray(includedLocations) ? includedLocations.length : 0
    })
    
    // DEBUG: Show sample data before filters
    if (filteredData.length > 0) {
      console.log('  📊 Sample data before settings filters:', {
        sampleDepts: [...new Set(filteredData.slice(0, 10).map(d => d.department_name))],
        sampleTypes: [...new Set(filteredData.slice(0, 10).map(d => d.expenditure_type))],
        sampleLocations: [...new Set(filteredData.slice(0, 10).map(d => d.location_name))]
      })
    }
    
    if (Array.isArray(includedDepartments) && includedDepartments.length > 0) {
      const beforeDept = filteredData.length
      // Normalize department names for comparison (remove diacritics issues)
      const normalizedIncluded = includedDepartments.map(d => normalizeDiacritics(d?.toLowerCase().trim() || ''))
      const beforeFilterDepts = [...new Set(filteredData.map(d => d.department_name))]
      
      filteredData = filteredData.filter((item) => {
        const itemDept = normalizeDiacritics((item.department_name || '').toLowerCase().trim())
        const matches = normalizedIncluded.includes(itemDept)
        if (!matches && beforeDept > 0) {
          // Log first few mismatches for debugging
          if (filteredData.length < 3) {
            console.log(`     ❌ Mismatch: "${item.department_name}" (normalized: "${itemDept}") not in included list`)
          }
        }
        return matches
      })
      console.log(`  After includedDepartments filter (${includedDepartments.length} depts): ${beforeDept} → ${filteredData.length}`)
      if (filteredData.length === 0 && beforeDept > 0) {
        const sampleDepts = [...new Set(beforeFilterDepts)].slice(0, 10)
        console.error('  ❌ All data filtered out by includedDepartments!')
        console.error('     Departments in data (before filter):', sampleDepts)
        console.error('     Included departments (from settings):', includedDepartments.slice(0, 10))
        console.error('     Normalized included:', normalizedIncluded.slice(0, 10))
        console.error('     Normalized data depts:', sampleDepts.map(d => normalizeDiacritics(d?.toLowerCase().trim() || '')))
        console.error('     ⚠️ PROBLEMA: Numele departamentelor din date nu se potrivesc cu cele din setări!')
      }
    } else {
      console.log('  ⏭️ Skipping includedDepartments filter (empty or not set) - showing ALL departments')
    }
    
    if (Array.isArray(includedTypes) && includedTypes.length > 0) {
      const beforeTypes = filteredData.length
      const normalizedIncludedTypes = includedTypes.map(t => normalizeDiacritics(t?.toLowerCase().trim() || ''))
      const beforeFilterTypes = [...new Set(filteredData.map(d => d.expenditure_type))]
      
      filteredData = filteredData.filter((item) => {
        const itemType = normalizeDiacritics((item.expenditure_type || '').toLowerCase().trim())
        return normalizedIncludedTypes.includes(itemType)
      })
      console.log(`  After includedTypes filter (${includedTypes.length} types): ${beforeTypes} → ${filteredData.length}`)
      if (filteredData.length === 0 && beforeTypes > 0) {
        const sampleTypes = [...new Set(beforeFilterTypes)].slice(0, 10)
        console.error('  ❌ All data filtered out by includedTypes!')
        console.error('     Types in data (before filter):', sampleTypes)
        console.error('     Included types (from settings):', includedTypes.slice(0, 10))
        console.error('     ⚠️ PROBLEMA: Numele tipurilor din date nu se potrivesc cu cele din setări!')
      }
    } else {
      console.log('  ⏭️ Skipping includedTypes filter (empty or not set) - showing ALL types')
    }
    
    if (Array.isArray(includedLocations) && includedLocations.length > 0) {
      const beforeLoc = filteredData.length
      const normalizedIncludedLocations = includedLocations.map(l => normalizeDiacritics(l?.toLowerCase().trim() || ''))
      const beforeFilterLocations = [...new Set(filteredData.map(d => d.location_name))]
      
      filteredData = filteredData.filter((item) => {
        const itemLoc = normalizeDiacritics((item.location_name || '').toLowerCase().trim())
        return normalizedIncludedLocations.includes(itemLoc)
      })
      console.log(`  After includedLocations filter (${includedLocations.length} locations): ${beforeLoc} → ${filteredData.length}`)
      if (filteredData.length === 0 && beforeLoc > 0) {
        const sampleLocations = [...new Set(beforeFilterLocations)].slice(0, 10)
        console.error('  ❌ All data filtered out by includedLocations!')
        console.error('     Locations in data (before filter):', sampleLocations)
        console.error('     Included locations (from settings):', includedLocations.slice(0, 10))
        console.error('     ⚠️ PROBLEMA: Numele locațiilor din date nu se potrivesc cu cele din setări!')
      }
    } else {
      console.log('  ⏭️ Skipping includedLocations filter (empty or not set) - showing ALL locations')
    }
    
    // DEPARTMENT FILTER (manual dropdown)
    if (departmentFilter !== 'all') {
      const beforeDeptFilter = filteredData.length
      // Verifică dacă departamentul selectat este unul dintre cele excluse automat
      const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
      if (excludedDepartments.includes(departmentFilter)) {
        console.warn(`  ⚠️ departmentFilter (${departmentFilter}) este exclus automat! Resetare la 'all'`)
        // Nu aplică filtrul - va rămâne 'all' în UI dar nu va filtra
        console.log(`  ⏭️ Skipping departmentFilter (${departmentFilter} is excluded)`)
      } else {
      filteredData = filteredData.filter(item => item.department_name === departmentFilter)
        console.log(`  After departmentFilter (${departmentFilter}): ${beforeDeptFilter} → ${filteredData.length}`)
      }
    }
    
    // EXPENDITURE TYPE FILTER
    if (expenditureTypeFilter !== 'all') {
      const beforeTypeFilter = filteredData.length
      filteredData = filteredData.filter(item => item.expenditure_type === expenditureTypeFilter)
      console.log(`  After expenditureTypeFilter (${expenditureTypeFilter}): ${beforeTypeFilter} → ${filteredData.length}`)
    }
    
    // LOCATION FILTER (NEW!)
    if (locationFilter !== 'all') {
      const beforeLocFilter = filteredData.length
      filteredData = filteredData.filter(item => item.location_name === locationFilter)
      console.log(`  After locationFilter (${locationFilter}): ${beforeLocFilter} → ${filteredData.length}`)
    }
    
    // Calculăm câte date ar trebui să fie după filtrele de bază (fără filtrele din setări)
    const afterBasicFilters = expendituresData.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      if (dept === 'unknown' || dept === '' || dept === 'null') return false
      const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
      if (excludedDepartments.includes(item.department_name)) return false
      if (dateRange.startDate && dateRange.endDate) {
        if (!item.operational_date) return false
        const itemDate = new Date(item.operational_date)
        const startDate = new Date(dateRange.startDate + 'T00:00:00')
        const endDate = new Date(dateRange.endDate + 'T23:59:59')
        if (itemDate < startDate || itemDate > endDate) return false
      }
      return true
    }).length
    
    console.log(`✅ [processDataToMatrix] Final filtered count: ${filteredData.length} (din ${afterBasicFilters} după filtrele de bază)`)
    
    // FALLBACK: Dacă filtrele din setări exclud mai mult de 90% din date, ignoră-le automat
    const filterLossPercentage = afterBasicFilters > 0 ? ((afterBasicFilters - filteredData.length) / afterBasicFilters) * 100 : 0
    const shouldIgnoreSettingsFilters = filteredData.length === 0 || (afterBasicFilters > 5 && filterLossPercentage > 90)
    
    if (shouldIgnoreSettingsFilters && expendituresData.length > 0) {
      console.warn(`⚠️ [FALLBACK] Filtrele din setări exclud ${filterLossPercentage.toFixed(1)}% din date! Ignoră filtrele din setări și arată toate datele.`)
      console.warn(`   Date după filtrele de bază: ${afterBasicFilters}`)
      console.warn(`   Date după filtrele din setări: ${filteredData.length}`)
      
      // Salvează filtrele manuale înainte de fallback
      const savedDepartmentFilter = departmentFilter
      const savedTypeFilter = expenditureTypeFilter
      const savedLocationFilter = locationFilter
      
      // Reapply doar filtrele de bază (exclude Unknown, POS, etc.) dar IGNORĂ filtrele din setări
      filteredData = expendituresData.filter(item => {
        const dept = (item.department_name || '').toLowerCase().trim()
        if (dept === 'unknown' || dept === '' || dept === 'null') return false
        
        const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
        if (excludedDepartments.includes(item.department_name)) return false
        
        // Date range filter (păstrează-l)
        if (dateRange.startDate && dateRange.endDate) {
          if (!item.operational_date) return false
          const itemDate = new Date(item.operational_date)
          const startDate = new Date(dateRange.startDate + 'T00:00:00')
          const endDate = new Date(dateRange.endDate + 'T23:59:59')
          if (itemDate < startDate || itemDate > endDate) return false
        }
        
        return true
      })
      
      // REAPLICĂ FILTRELE MANUALE (departmentFilter, expenditureTypeFilter, locationFilter)
      if (savedDepartmentFilter !== 'all') {
        const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
        if (!excludedDepartments.includes(savedDepartmentFilter)) {
          filteredData = filteredData.filter(item => item.department_name === savedDepartmentFilter)
          console.log(`  [FALLBACK] Reapplied departmentFilter (${savedDepartmentFilter}): ${filteredData.length}`)
        }
      }
      
      if (savedTypeFilter !== 'all') {
        filteredData = filteredData.filter(item => item.expenditure_type === savedTypeFilter)
        console.log(`  [FALLBACK] Reapplied expenditureTypeFilter (${savedTypeFilter}): ${filteredData.length}`)
      }
      
      if (savedLocationFilter !== 'all') {
        filteredData = filteredData.filter(item => item.location_name === savedLocationFilter)
        console.log(`  [FALLBACK] Reapplied locationFilter (${savedLocationFilter}): ${filteredData.length}`)
      }
      
      console.warn(`   Date după fallback (fără filtre din setări, cu filtre manuale): ${filteredData.length}`)
    }
    
    // Get unique locations and expenditure types
    const locationsSet = new Set()
    const expenditureTypesSet = new Set()
    
    filteredData.forEach(item => {
      if (item.location_name) locationsSet.add(item.location_name)
      if (item.expenditure_type) expenditureTypesSet.add(item.expenditure_type)
    })
    
    const locations = Array.from(locationsSet).sort()
    const expenditureTypes = Array.from(expenditureTypesSet).sort()
    
    // Build matrix
    const matrix = expenditureTypes.map(expType => {
      const row = { expenditure_type: expType }
      let rowTotal = 0
      
      locations.forEach(loc => {
        const amount = filteredData
          .filter(item => item.expenditure_type === expType && item.location_name === loc)
          .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
        
        row[loc] = amount
        rowTotal += amount
      })
      
      row.total = rowTotal
      return row
    })
    
    // Calculate column totals
    const totalsRow = { expenditure_type: 'TOTAL' }
    let grandTotal = 0
    
    locations.forEach(loc => {
      const colTotal = matrix.reduce((sum, row) => sum + (row[loc] || 0), 0)
      totalsRow[loc] = colTotal
      grandTotal += colTotal
    })
    
    totalsRow.total = grandTotal
    
    return { matrix, locations, expenditureTypes, totalsRow, filteredCount: filteredData.length, filteredDataForTable: filteredData }
  }
  
  // Re-calculate matrix when filters change (INCLUDING locationFilter AND syncSettings!)
  const { matrix, locations, totalsRow, filteredCount, expenditureTypes, filteredDataForTable } = React.useMemo(() => {
    return processDataToMatrix()
  }, [expendituresData, dateRange, departmentFilter, expenditureTypeFilter, locationFilter, syncSettings])
  
  // Calculate previous month data for percentage comparison
  const previousMonthData = React.useMemo(() => {
    if (!expendituresData || expendituresData.length === 0) return { total: 0, percentage: 0, isPositive: true }
    
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    // Current month (up to current day)
    const currentMonthStart = new Date(currentYear, currentMonth, 1)
    const currentMonthEnd = new Date(currentYear, currentMonth, currentDay, 23, 59, 59)
    
    // Previous month (same days: 1 to current day)
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevMonthStart = new Date(prevYear, prevMonth, 1)
    const prevMonthEnd = new Date(prevYear, prevMonth, currentDay, 23, 59, 59)
    
    // Filter for current month (up to current day)
    const currentMonthData = expendituresData.filter(item => {
      const itemDate = new Date(item.operational_date)
      return itemDate >= currentMonthStart && itemDate <= currentMonthEnd
    })
    
    // Filter for previous month (same days)
    const prevMonthData = expendituresData.filter(item => {
      const itemDate = new Date(item.operational_date)
      return itemDate >= prevMonthStart && itemDate <= prevMonthEnd
    })
    
    const currentTotal = currentMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    const prevTotal = prevMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    
    let percentage = 0
    let isPositive = true
    
    if (prevTotal > 0) {
      percentage = ((currentTotal - prevTotal) / prevTotal) * 100
      isPositive = percentage >= 0
    }
    
    return { 
      current: currentTotal, 
      previous: prevTotal, 
      percentage: Math.abs(percentage), 
      isPositive 
    }
  }, [expendituresData])

  // Filter data by date range pentru grafice și carduri
  // FOLOSEȘTE ACELEAȘI DATE CA ȘI TABELUL (filteredDataForTable) pentru consistență!
  const filteredExpendituresForCharts = React.useMemo(() => {
    // Folosește exact aceleași date ca și tabelul pentru consistență
    return filteredDataForTable || []
  }, [filteredDataForTable])

  // Zile disponibile în sistem pentru selectorul de zile (doar date care chiar există)
  const availableDays = React.useMemo(() => {
    const daysSet = new Set()
    filteredExpendituresForCharts.forEach((item) => {
      if (item.operational_date) {
        const day = item.operational_date.split('T')[0]
        daysSet.add(day)
      }
    })
    return Array.from(daysSet).sort()
  }, [filteredExpendituresForCharts])
  
  // Generate AI Insights (using filtered data)
  const aiInsights = React.useMemo(() => {
    return generateAIInsights(filteredExpendituresForCharts, dateRange)
  }, [filteredExpendituresForCharts, dateRange])
  
  // Export to Excel - pentru tabelul de cheltuieli
  const handleExportExcel = () => {
    try {
      if (!matrix || matrix.length === 0) {
        toast.error('Nu există date de exportat')
        return
      }

      // Creează workbook
      const wb = XLSX.utils.book_new()
      
      // Pregătește datele pentru export
      const exportData = []
      
      // Header row
      const header = ['Departament / Categorie', ...locations, 'TOTAL']
      exportData.push(header)
      
      // Date rows
      matrix.forEach(row => {
        const rowData = [row.expenditure_type]
        locations.forEach(loc => {
          rowData.push(row[loc] || 0)
        })
        rowData.push(row.total || 0)
        exportData.push(rowData)
      })
      
      // Total row
      if (totalsRow) {
        const totalRow = ['TOTAL']
        locations.forEach(loc => {
          totalRow.push(totalsRow[loc] || 0)
        })
        totalRow.push(totalsRow.total || 0)
        exportData.push(totalRow)
      }
      
      // Creează worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData)
      
      // Setează lățimea coloanelor
      const colWidths = [
        { wch: 30 }, // Departament / Categorie
        ...locations.map(() => ({ wch: 15 })), // Locații
        { wch: 15 } // TOTAL
      ]
      ws['!cols'] = colWidths
      
      // Adaugă worksheet la workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Cheltuieli')
      
      // Generează nume fișier
      const fileName = `Cheltuieli_${dateRange.startDate}_${dateRange.endDate}.xlsx`
      
      // Exportă
      XLSX.writeFile(wb, fileName)
      
      toast.success('✅ Excel exportat cu succes!')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }
  
  // Export to PDF
  const handleExportPDF = async () => {
    try {
      toast.loading('📄 Generare PDF...', { id: 'pdf-export' })
      
      if (!exportRef.current) {
        toast.error('Eroare: zona de export nu a fost găsită', { id: 'pdf-export' })
        return
      }

      // Elimină spațiile goale de la final înainte de export
      const element = exportRef.current
      const originalPadding = element.style.paddingBottom
      const originalMargin = element.style.marginBottom
      element.style.paddingBottom = '0'
      element.style.marginBottom = '0'
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        removeContainer: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      })
      
      // Restaurează stilurile originale
      element.style.paddingBottom = originalPadding
      element.style.marginBottom = originalMargin

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `Cheltuieli_${dateRange.startDate}_${dateRange.endDate}.pdf`
      pdf.save(fileName)

      toast.success('✅ PDF exportat cu succes!', { id: 'pdf-export' })
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('❌ Eroare la export PDF: ' + error.message, { id: 'pdf-export' })
    }
  }
  
  // Get unique departments for filter
  // EXCLUDE 4 departamente debifate din dropdown!
  const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli', 'Unknown']
  const uniqueDepartments = [...new Set(expendituresData.map(item => item.department_name))]
    .filter(Boolean)
    .filter(dept => !excludedDepartments.includes(dept))
    .sort()
  
  // Get unique expenditure types for filter
  const uniqueExpenditureTypes = [...new Set(expendituresData.map(item => item.expenditure_type))].filter(Boolean).sort()
  
  // Get unique locations for filter
  const uniqueLocations = [...new Set(expendituresData.map(item => item.location_name))].filter(Boolean).sort()
  
  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '-'
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-slate-600 dark:text-slate-400">Se încarcă cheltuielile...</div>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-500" />
              Cheltuieli
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Monitorizare cheltuieli per locație din serverul extern
            </p>
          </div>
          
          <div className="flex space-x-3 ml-auto">
            <button
              onClick={() => navigate('/expenditures/settings')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <Settings className="w-4 h-4" />
              <span>Setări</span>
            </button>

            <button
              onClick={() => navigate('/expenditures/sql-table')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <Table2 className="w-4 h-4" />
              <span>Tabel SQL</span>
            </button>

            <button
              onClick={() => navigate('/expenditures/slots-monthly')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <span>Tabel Sloturi</span>
            </button>

            <button
              onClick={() => navigate('/expenditures/electric')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <span>Electrica</span>
            </button>
            
            <button
              onClick={() => navigate('/expenditures/advanced-analytics')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <span>Analiză Avansată</span>
            </button>
            
            <button
              onClick={() => navigate('/expenditures/pos-banca')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <Building2 className="w-4 h-4" />
              <span>POS & Bancă</span>
            </button>
          </div>
        </div>
        
        {/* Filters - ordine corectă */}
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl shadow-xl border border-transparent backdrop-blur-2xl">
          {/* Rând 1: Quick Date Buttons + Filtre Departament/Tip/Locație + Export */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Quick Date Buttons (Azi / Săpt / Luna curentă / Luna trecută / Anul curent) */}
            <div className="flex items-center gap-2">
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
                  return (
              <button
                      key={btn.id}
                      onClick={() => applyQuickDateFilter(btn.id)}
                      className="relative inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-white text-xs font-semibold transition-all overflow-hidden border hover:scale-105 active:scale-95"
                      style={{
                        height: '40px',
                        minWidth: '80px',
                        background: isDark 
                          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                          : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                        boxShadow: isDark
                          ? '0 6px 18px rgba(15, 23, 42, 0.5)'
                          : '0 6px 18px rgba(30, 58, 138, 0.35)'
                      }}
                    >
                      <IconComponent className="w-3.5 h-3.5 relative z-10" style={{ color: 'white' }} />
                      <span className="relative z-10">{btn.label}</span>
              </button>
                  )
                })}
            </div>

            {/* Filtre Departament, Tip, Locație - după "Anul curent", mutat cât mai aproape de capătul din dreapta */}
            <div className="flex items-end gap-3 ml-auto">
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    const newValue = e.target.value
                    // Verifică dacă este un departament exclus automat
                    const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
                    if (excludedDepartments.includes(newValue)) {
                      toast.error(`Departamentul "${newValue}" este exclus automat și nu poate fi selectat`)
                      return // Nu schimba filtrul
                    }
                    setDepartmentFilter(newValue)
                  }}
                  className="rounded-2xl text-white text-sm font-semibold border transition-all"
                  style={{
                    height: '40px',
                    paddingLeft: '12px',
                    paddingRight: '32px',
                    width: 'auto',
                    minWidth: '180px',
                    background: isDark 
                      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                      : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: isDark
                      ? '0 6px 18px rgba(15, 23, 42, 0.5)'
                      : '0 6px 18px rgba(30, 58, 138, 0.35)'
                  }}
                >
                  <option value="all">Departament: Toate</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
          </div>

              <div className="relative">
                <select
                  value={expenditureTypeFilter}
                  onChange={(e) => setExpenditureTypeFilter(e.target.value)}
                  className="rounded-2xl text-white text-sm font-semibold border transition-all"
                  style={{
                    height: '40px',
                    paddingLeft: '12px',
                    paddingRight: '32px',
                    width: 'auto',
                    minWidth: '180px',
                    background: isDark 
                      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                      : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: isDark
                      ? '0 6px 18px rgba(15, 23, 42, 0.5)'
                      : '0 6px 18px rgba(30, 58, 138, 0.35)'
                  }}
                >
                  <option value="all">Tip: Toate</option>
                  {uniqueExpenditureTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
        </div>
        
              {uniqueLocations.length > 0 && (
                <div className="relative">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="rounded-2xl text-white text-sm font-semibold border transition-all"
                    style={{
                      height: '40px',
                      paddingLeft: '12px',
                      paddingRight: '32px',
                      width: 'auto',
                      minWidth: '180px',
                      background: isDark 
                        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                        : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      boxShadow: isDark
                        ? '0 6px 18px rgba(15, 23, 42, 0.5)'
                        : '0 6px 18px rgba(30, 58, 138, 0.35)'
                    }}
                  >
                    <option value="all">Locație: Toate</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
            </div>
              )}
            </div>
          </div>
          
          {/* Rând 2: DateRangeSelector + Text Perioadă pe același rând + Export Buttons la capătul din dreapta */}
          <div className="flex items-center gap-3 mb-2 relative z-[50]">
            <div className="min-w-[260px] max-w-md">
                <DateRangeSelector
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                availableDays={availableDays}
                  onChange={(newRange) => {
                    setDateRange(newRange)
                    setSelectedDateFilter('custom')
                  }}
                />
              </div>
              
            {/* Text Perioadă pe același rând cu DateRangeSelector, centrat vertical cu săgețile < > */}
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
              Perioadă: <span className="font-semibold ml-1">{dateRange.startDate}</span> –{' '}
              <span className="font-semibold">{dateRange.endDate}</span>
              </div>
              
            {/* Export PDF - la capătul din dreapta pe rândul 2 */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
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
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* ZONA EXPORTABILĂ PDF - START */}
        <div ref={exportRef} className="space-y-6" style={{ paddingBottom: 0, marginBottom: 0 }}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Toate cardurile folosesc același fundal albastru light */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cheltuieli</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(
                    filteredExpendituresForCharts && filteredExpendituresForCharts.length > 0
                      ? filteredExpendituresForCharts.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                      : 0
                  )} RON
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Locații</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{locations.length}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-2xl">
                <Building2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Zile Selectate</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {(() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffTime = Math.abs(end - start)
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                    return diffDays
                  })()}
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-2xl">
                <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Diferența față de luna trecută</p>
                <p className={`text-3xl font-bold mt-2 ${
                  previousMonthData.isPositive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {previousMonthData.isPositive ? '+' : '-'}{previousMonthData.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Primele {new Date().getDate()} zile vs luna trecută
                </p>
              </div>
              {/* Iconița dinamică cu procentaj */}
              <div className={`p-4 rounded-2xl ${
                previousMonthData.isPositive 
                  ? 'bg-green-500/10' 
                  : 'bg-red-500/10'
              }`}>
                {previousMonthData.isPositive ? (
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {filteredExpendituresForCharts.length > 0 && (
          <ExpendituresCharts 
            expendituresData={filteredExpendituresForCharts}
            dateRange={dateRange}
            onTrendRangeSelect={({ startDate, endDate }) => {
              // Când dai click pe un punct/lună în „Evoluție Cheltuieli”,
              // actualizăm intervalul global de pe pagină
              setDateRange({ startDate, endDate })
              setSelectedDateFilter('custom-trend')
            }}
            onDepartmentClick={(deptName) => {
              // Toggle filter (click din nou = reset)
              if (departmentFilter === deptName) {
                setDepartmentFilter('all')
                toast.success('Filtru resetat - toate departamentele', { id: 'dept-filter' })
              } else {
                setDepartmentFilter(deptName)
                toast.success(`📊 Filtrat: ${deptName}`, { id: 'dept-filter' })
              }
              // NU MAI SCROLL! (user nu vrea)
            }}
            onLocationClick={(locName) => {
              // Toggle filter (click din nou = reset)
              if (locationFilter === locName) {
                setLocationFilter('all')
                toast.success('Filtru locație resetat - toate locațiile', { id: 'loc-filter' })
              } else {
                setLocationFilter(locName)
                toast.success(`📍 Filtrat: ${locName}`, { id: 'loc-filter' })
              }
              // NU MAI SCROLL! (user nu vrea)
            }}
          />
        )}
        
        
        {/* Matrix Table */}
        <div id="matrix-table" className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Table2 className="w-6 h-6 mr-2 text-blue-500" />
            Cheltuieli per Departament / Categorie / Locație
          </h2>
            
            {matrix.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                  style={{
                    height: '40px',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    boxShadow: '0 8px 28px rgba(22, 163, 74, 0.5)'
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => {
                    setAllDepartmentsExpanded(!allDepartmentsExpanded)
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                  style={{
                    height: '40px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  {allDepartmentsExpanded ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span>Închide toate</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span>Deschide toate</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {matrix.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-semibold">Nu există date disponibile</p>
              <p className="text-sm mt-2">Nu există cheltuieli pentru perioada selectată</p>
              <div className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                <p>Total înregistrări în baza de date: {expendituresData.length}</p>
                <p>După filtrare: {filteredCount} înregistrări</p>
                <p className="mt-2">Verifică în consolă (F12) pentru detalii despre filtrele aplicate</p>
              </div>
            </div>
          ) : (
            <ExpendituresTable 
              matrix={matrix}
              locations={locations}
              expenditureTypes={expenditureTypes}
              totalsRow={totalsRow}
              expendituresData={filteredDataForTable || []}
              allExpanded={allDepartmentsExpanded}
              onToggleAll={() => setAllDepartmentsExpanded(!allDepartmentsExpanded)}
              onAmountClick={({ department, category }) => {
                navigate('/expenditures/detail', {
                  state: {
                    department,
                    category,
                    dateRange
                  }
                })
              }}
            />
          )}
        </div>
        {/* ZONA EXPORTABILĂ PDF - END */}
      </div>
      </div>
      
      {/* Mapping Modal */}
      {showMappingModal && (
        <ExpendituresMappingModal
          onClose={() => setShowMappingModal(false)}
          onSave={() => {
            setShowMappingModal(false)
            loadExpendituresData()
          }}
        />
      )}

      {/* Import Progress Modal */}
      {importProgress && (importProgress.status === 'running' || importProgress.status === 'completed' || importProgress.status === 'failed') && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-2 border-blue-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Database className={`w-8 h-8 text-white ${importProgress.status === 'running' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {importProgress.status === 'running' && '🔄 Import în curs...'}
                    {importProgress.status === 'completed' && '✅ Import completat!'}
                    {importProgress.status === 'failed' && '❌ Import eșuat'}
                  </h2>
                  <p className="text-blue-100 text-sm font-medium">
                    {importProgress.currentStep || 'Pregătire...'}
                  </p>
                </div>
              </div>
              {importProgress.status !== 'running' && (
                <button 
                  onClick={() => setImportProgress(null)}
                  className="text-white hover:bg-white/20 rounded-2xl p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Progress Bar */}
              {importProgress.status === 'running' && importProgress.totalFound > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Progres</span>
                    <span className="font-bold">
                      {Math.round((importProgress.totalProcessed / importProgress.totalFound) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${Math.min(100, Math.round((importProgress.totalProcessed / importProgress.totalFound) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-6 rounded-2xl border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Găsite</span>
                    <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {importProgress.totalFound || 0}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-6 rounded-2xl border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Procesate</span>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {importProgress.totalProcessed || 0}
                  </p>
                  {importProgress.totalFound > 0 && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      din {importProgress.totalFound}
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-6 rounded-2xl border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Importate Noi</span>
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {importProgress.imported || 0}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-6 rounded-2xl border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duplicate</span>
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importProgress.skipped || 0}
                  </p>
                </div>

                {importProgress.errors > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 p-6 rounded-2xl border border-red-200 dark:border-red-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Erori</span>
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {importProgress.errors || 0}
                    </p>
                  </div>
                )}

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Durata</span>
                    <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                    {importProgress.startTime 
                      ? `${Math.round(
                          (new Date(importProgress.endTime || new Date()) -
                            new Date(importProgress.startTime)) /
                            1000
                        )}s`
                      : '0s'}
                  </p>
                </div>
              </div>

              {/* Sources Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-600">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📊 Surse de Date</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importProgress.existing || 0}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">SQL (Existente)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importProgress.fromExternalAPI || 0}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">API Extern</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{importProgress.fromGoogleSheets || 0}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Google Sheets</p>
                  </div>
                </div>
              </div>

              {/* Remaining Items */}
              {importProgress.status === 'running' && importProgress.totalFound > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">⏳ Rămân de procesat:</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.max(0, (importProgress.totalFound || 0) - (importProgress.totalProcessed || 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {importProgress.status === 'completed' && (
              <div className="px-8 py-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-700">
                <p className="text-center text-green-700 dark:text-green-400 font-semibold">
                  ✅ Import finalizat cu succes! Datele au fost actualizate.
                </p>
              </div>
            )}
            {importProgress.status === 'failed' && (
              <div className="px-8 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-700">
                <p className="text-center text-red-700 dark:text-red-400 font-semibold">
                  ❌ Import eșuat: {importProgress.currentStep || 'Eroare necunoscută'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
    </Layout>
  )
}

export default Expenditures

