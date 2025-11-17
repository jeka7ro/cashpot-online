import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import axios from 'axios'
import { DollarSign, RefreshCw, Settings, Download, FileSpreadsheet, FileText, Filter, Calendar, Building2, Briefcase, BarChart3, Brain, TrendingUp, TrendingDown, Table2, MapPin, Maximize2, Minimize2, Clock, CalendarDays, CalendarRange } from 'lucide-react'
import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import ExpendituresMappingModal from '../components/modals/ExpendituresMappingModal'
import ExpendituresCharts from '../components/ExpendituresCharts'
import ExpendituresAdvancedCharts from '../components/ExpendituresAdvancedCharts'
import ExpendituresTable from '../components/ExpendituresTable'
import DateRangeSelector from '../components/DateRangeSelector'
import { generateAIInsights } from '../utils/aiInsights'

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
  const [dateRange, setDateRange] = useState(
    savedPrefs?.dateRange || {
      startDate: new Date(new Date().getFullYear() - 2, 0, 1).toISOString().split('T')[0], // Jan 1, 2023
      endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]  // Dec 31, 2025
    }
  )
  const [departmentFilter, setDepartmentFilter] = useState(savedPrefs?.departmentFilter || 'all')
  const [expenditureTypeFilter, setExpenditureTypeFilter] = useState(savedPrefs?.expenditureTypeFilter || 'all')
  const [locationFilter, setLocationFilter] = useState(savedPrefs?.locationFilter || 'all') // NEW!
  const [selectedDateFilter, setSelectedDateFilter] = useState(savedPrefs?.selectedDateFilter || 'anul-curent')
  const [allDepartmentsExpanded, setAllDepartmentsExpanded] = useState(false)
  
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
    loadSettings()
  }, [])
  
  const loadSettings = async () => {
    try {
      const response = await axios.get('/api/expenditures/settings')
      setSyncSettings(response.data)
    } catch (error) {
      console.error('Error loading sync settings:', error)
    }
  }
  
  // Load expenditures data
  const loadExpendituresData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data')
      setExpendituresData(response.data)
      console.log('✅ Expenditures data loaded:', response.data.length)
    } catch (error) {
      console.error('Error loading expenditures:', error)
      toast.error('Eroare la încărcarea cheltuielilor')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadExpendituresData()
  }, [])
  
  // Sync data from external DB
  const handleSync = async () => {
    try {
      setSyncing(true)
      let progressInterval
      
      // Start progress updates
      let progressCount = 0
      progressInterval = setInterval(() => {
        progressCount++
        toast.loading(`Sincronizare în curs... (${progressCount}s)`, { 
          id: 'sync',
          duration: 1000 
        })
      }, 1000)
      
      // NU trimitem dateRange - vrem TOATE datele, nu doar cele din perioada selectată
      const response = await axios.post('/api/expenditures/sync', {
        // startDate și endDate NU se trimit - vrem TOATE datele disponibile
        filters: syncSettings.filters
      })
      
      // Stop progress updates
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      const { records, skipped, errors, totalFetched, totalFiltered } = response.data
      let message = `✅ ${records} înregistrări noi sincronizate`
      if (skipped > 0) {
        message += ` (${skipped} deja existente)`
      }
      if (errors > 0) {
        message += ` (${errors} erori)`
      }
      if (totalFetched) {
        message += `\n📊 Total găsite: ${totalFetched}, După filtre: ${totalFiltered}`
      }
      
      toast.success(message, { 
        id: 'sync',
        duration: 6000 
      })
      
      // Reload data
      await loadExpendituresData()
    } catch (error) {
      // Stop progress updates
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
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
    } finally {
      setSyncing(false)
    }
  }
  
  // Process data into matrix format (expenditure_types × locations)
  const processDataToMatrix = () => {
    if (!expendituresData || expendituresData.length === 0) {
      return { matrix: [], locations: [], expenditureTypes: [], filteredCount: 0 }
    }
    
    // Apply filters
    let filteredData = expendituresData
    
    // EXCLUDE "Unknown" FORȚAT (user NU vrea să-l vadă NICIODATĂ!)
    filteredData = filteredData.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    
    // EXCLUDE 4 DEPARTAMENTE DEBIFATE (POS, Registru de Casă, Bancă, Alte Cheltuieli)
    const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
    filteredData = filteredData.filter(item => {
      return !excludedDepartments.includes(item.department_name)
    })
    
    // DATE RANGE FILTER
    if (dateRange.startDate && dateRange.endDate) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.operational_date)
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        return itemDate >= startDate && itemDate <= endDate
      })
    }
    
    // DEPARTMENT FILTER
    if (departmentFilter !== 'all') {
      filteredData = filteredData.filter(item => item.department_name === departmentFilter)
    }
    
    // EXPENDITURE TYPE FILTER
    if (expenditureTypeFilter !== 'all') {
      filteredData = filteredData.filter(item => item.expenditure_type === expenditureTypeFilter)
    }
    
    // LOCATION FILTER (NEW!)
    if (locationFilter !== 'all') {
      filteredData = filteredData.filter(item => item.location_name === locationFilter)
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
    
    return { matrix, locations, expenditureTypes, totalsRow, filteredCount: filteredData.length }
  }
  
  // Re-calculate matrix when filters change (INCLUDING locationFilter!)
  const { matrix, locations, totalsRow, filteredCount, expenditureTypes } = React.useMemo(() => {
    return processDataToMatrix()
  }, [expendituresData, dateRange, departmentFilter, expenditureTypeFilter, locationFilter])
  
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

  // Filter data by date range for charts and cards (SAME FILTERS as matrix!)
  const filteredExpendituresForCharts = React.useMemo(() => {
    let filtered = expendituresData
    
    // EXCLUDE "Unknown" FORȚAT (user nu vrea să-l vadă NICIODATĂ!)
    filtered = filtered.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    
    // EXCLUDE 4 DEPARTAMENTE DEBIFATE (POS, Registru de Casă, Bancă, Alte Cheltuieli)
    const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
    filtered = filtered.filter(item => {
      return !excludedDepartments.includes(item.department_name)
    })
    
    // Filter by date range
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.operational_date)
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        return itemDate >= startDate && itemDate <= endDate
      })
    }
    
    // DEPARTMENT FILTER (pentru charts!)
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(item => item.department_name === departmentFilter)
    }
    
    // LOCATION FILTER (pentru charts!)
    if (locationFilter !== 'all') {
      filtered = filtered.filter(item => item.location_name === locationFilter)
    }
    
    return filtered
  }, [expendituresData, dateRange, departmentFilter, locationFilter])

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
  
  // Export to Excel
  const handleExportExcel = () => {
    try {
      // Will implement with ExportButtons component
      toast.success('Export Excel în curs de implementare...')
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

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'
      })

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
            {/* Buton Sincronizare - ADUCERE DATE DIN BIROU */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 ${
                syncing 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
              style={{
                background: isDark 
                  ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizare...' : 'Sincronizare Date'}</span>
            </button>
            
            <button
              onClick={() => navigate('/expenditures/settings')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <Settings className="w-4 h-4" />
              <span>Setări</span>
            </button>
            
            <button
              onClick={() => setShowMappingModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <MapPin className="w-4 h-4" />
              <span>Mapping Locații</span>
            </button>

            <button
              onClick={() => navigate('/expenditures/sql-table')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <Table2 className="w-4 h-4" />
              <span>Tabel SQL</span>
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
                { id: 'anul-curent', label: 'Anul curent', icon: Calendar }
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
                  onChange={(e) => setDepartmentFilter(e.target.value)}
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
          <div className="flex items-center gap-3 mb-2">
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
            
            {/* Export Buttons - la capătul din dreapta pe rândul 2 */}
            <div className="flex items-center gap-3 ml-auto">
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
        <div ref={exportRef} className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Toate cardurile folosesc același fundal albastru light */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cheltuieli</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(totalsRow?.total || 0)} RON
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
            )}
          </div>
          
          {matrix.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-semibold">Nu există date disponibile</p>
              <p className="text-sm mt-2">Sincronizați datele pentru a vedea cheltuielile</p>
              <button
                onClick={handleSync}
                className="btn-primary mt-4"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Sincronizare Date
              </button>
            </div>
          ) : (
            <ExpendituresTable 
              matrix={matrix}
              locations={locations}
              expenditureTypes={expenditureTypes}
              totalsRow={totalsRow}
              expendituresData={filteredExpendituresForCharts}
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
        
        </div>
        {/* ZONA EXPORTABILĂ PDF - END */}
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
      
    </Layout>
  )
}

export default Expenditures

