import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { DollarSign, RefreshCw, Settings, Download, FileSpreadsheet, FileText, Filter, Calendar, Building2, Briefcase, BarChart3, Brain, TrendingUp, TrendingDown, Table2, MapPin, ArrowLeft, Coins, Database, Cloud } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ExpendituresMappingModal from '../components/modals/ExpendituresMappingModal'
import ExpendituresSettingsModal from '../components/modals/ExpendituresSettingsModal'
import AdvancedAnalyticsModal from '../components/modals/AdvancedAnalyticsModal'
import PowerBIConfigModal from '../components/modals/PowerBIConfigModal'
import PowerBISyncModal from '../components/modals/PowerBISyncModal'
import ExpendituresCharts from '../components/ExpendituresCharts'
import ExpendituresAdvancedCharts from '../components/ExpendituresAdvancedCharts'
import ExpendituresTableSimple from '../components/ExpendituresTableSimple'
import DateRangeSelector from '../components/DateRangeSelector'
import { generateAIInsights } from '../utils/aiInsights'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label, LabelList } from 'recharts'

const Expenditures = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
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
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [showPowerBIConfigModal, setShowPowerBIConfigModal] = useState(false)
  const [showPowerBISyncModal, setShowPowerBISyncModal] = useState(false)
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
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1
      endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]  // Dec 31
    }
  )
  const [departmentFilter, setDepartmentFilter] = useState(savedPrefs?.departmentFilter || 'all')
  const [expenditureTypeFilter, setExpenditureTypeFilter] = useState(savedPrefs?.expenditureTypeFilter || 'all')
  const [locationFilter, setLocationFilter] = useState(savedPrefs?.locationFilter || 'all') // NEW!
  const [selectedDateFilter, setSelectedDateFilter] = useState(savedPrefs?.selectedDateFilter || 'anul-curent')
  
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
  const applyQuickDateFilter = (filterType) => {
    const today = new Date()
    let startDate, endDate
    
    switch (filterType) {
      case 'azi':
        startDate = today.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      
      case 'saptamana-curenta':
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday as start
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        startDate = monday.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      
      case 'luna-curenta':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
        break
      
      case 'luna-anterioara':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0]
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]
        break
      
      case 'anul-curent':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0]
        break
      
      case 'toate':
        // All time - set very broad range
        startDate = '2020-01-01'
        endDate = new Date(today.getFullYear() + 1, 11, 31).toISOString().split('T')[0]
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
      toast.loading('Sincronizare în curs...', { id: 'sync' })
      
      const response = await axios.post('/api/expenditures/sync', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        filters: syncSettings.filters
      })
      
      toast.success(`✅ ${response.data.records} înregistrări sincronizate!`, { id: 'sync' })
      
      // Reload data
      await loadExpendituresData()
    } catch (error) {
      console.error('Error syncing expenditures:', error)
      toast.error('Eroare la sincronizare', { id: 'sync' })
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
    
    // INCLUDE DOAR POS și Bancă (DOAR ACESTEA 2!)
    const includedDepartments = ['POS', 'Bancă']
    filteredData = filteredData.filter(item => {
      return includedDepartments.includes(item.department_name)
    })
    
    console.log(`🔍 POS & Bancă: Filtrat ${filteredData.length} înregistrări din ${expendituresData.length} total`)
    
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
  const { matrix, locations, totalsRow, filteredCount, expenditureTypes, filteredData } = React.useMemo(() => {
    const result = processDataToMatrix()
    
    // RETURN filteredData pentru ExpendituresTable!
    let filteredData = expendituresData
    
    // EXCLUDE "Unknown" FORȚAT
    filteredData = filteredData.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    
    // INCLUDE DOAR POS și Bancă (DOAR ACESTEA 2!)
    const includedDepartments = ['POS', 'Bancă']
    filteredData = filteredData.filter(item => {
      return includedDepartments.includes(item.department_name)
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
    
    // LOCATION FILTER
    if (locationFilter !== 'all') {
      filteredData = filteredData.filter(item => item.location_name === locationFilter)
    }
    
    return { ...result, filteredData }
  }, [expendituresData, dateRange, departmentFilter, expenditureTypeFilter, locationFilter])
  
  // Filter data by date range for charts and cards (SAME FILTERS as matrix!)
  const filteredExpendituresForCharts = React.useMemo(() => {
    let filtered = expendituresData
    
    // EXCLUDE "Unknown" FORȚAT (user nu vrea să-l vadă NICIODATĂ!)
    filtered = filtered.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    
    // INCLUDE DOAR POS și Bancă (DOAR ACESTEA 2!)
    const includedDepartments = ['POS', 'Bancă']
    filtered = filtered.filter(item => {
      return includedDepartments.includes(item.department_name)
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
  const handleExportPDF = () => {
    try {
      // Will implement with ExportButtons component
      toast.success('Export PDF în curs de implementare...')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('Eroare la export PDF')
    }
  }
  
  // Get unique departments for filter
  // EXCLUDE 4 departamente debifate din dropdown!
  const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli', 'Unknown']
  const uniqueDepartments = [...new Set(expendituresData.map(item => item.department_name))]
    .filter(Boolean)
    .filter(dept => !excludedDepartments.includes(dept))
    .sort()
  
  // Get unique expenditure types for filter (DOAR pentru POS și Bancă!)
  const uniqueExpenditureTypes = [...new Set(
    expendituresData
      .filter(item => ['POS', 'Bancă'].includes(item.department_name))
      .map(item => item.expenditure_type)
  )].filter(Boolean).sort()
  
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenditures')}
              className="p-3 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Înapoi la Cheltuieli</span>
            </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
                <Building2 className="w-8 h-8 mr-3 text-emerald-500" />
                POS & Bancă - Încasări
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
                Încasări POS și depuneri la bancă din casieriile de locații
            </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Setări</span>
            </button>
            
            <button
              onClick={() => setShowMappingModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Mapping Locații</span>
            </button>
            
            <button
              onClick={() => setShowPowerBIConfigModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
            >
              <Database className="w-4 h-4" />
              <span>🔌 Power BI Config</span>
            </button>
            
            <button
              onClick={() => setShowPowerBISyncModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
            >
              <Cloud className="w-4 h-4" />
              <span>☁️ Power BI Sync</span>
            </button>
            
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
            >
              <BarChart3 className="w-4 h-4" />
              <span>📊 Analiză Avansată</span>
            </button>
            
            {aiInsights.length > 0 && (
              <button
                onClick={() => navigate('/ai-insights')}
                className="btn-secondary flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-purple-600 dark:border-pink-600 relative"
                title={`${aiInsights.length} insights • ${aiInsights.filter(i => i.severity === 'error' || i.severity === 'warning').length} alerte`}
              >
                <Brain className="w-4 h-4 animate-pulse" />
                <span>🤖 AI Insights</span>
                {aiInsights.filter(i => i.severity === 'error' || i.severity === 'warning').length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {aiInsights.filter(i => i.severity === 'error' || i.severity === 'warning').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Filters - MUTAT ÎN VÂRFUL PAGINII! */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-500" />
              Filtre
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              💾 Preferințele tale sunt salvate automat
            </div>
          </div>
          
          <div className="space-y-4">
              {/* Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  📅 Perioadă
                </label>
                <DateRangeSelector
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={(newRange) => {
                    setDateRange(newRange)
                    setSelectedDateFilter('custom')
                  }}
                />
              </div>
              
              {/* Department Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Departament
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">POS & Bancă</option>
                  <option value="POS">POS</option>
                  <option value="Bancă">Bancă</option>
                </select>
              </div>
              
              {/* Expenditure Type Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Tip Cheltuială
                </label>
                <select
                  value={expenditureTypeFilter}
                  onChange={(e) => setExpenditureTypeFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">Toate Tipurile</option>
                  {uniqueExpenditureTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Perioadă: <span className="font-semibold">{dateRange.startDate}</span> - <span className="font-semibold">{dateRange.endDate}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleExportExcel}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Încasări</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(totalsRow?.total || 0)} RON
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl shadow-lg">
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
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-lg">
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
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Evoluție vs Luna Trecută</p>
                <p className={`text-3xl font-bold mt-2 ${
                  (() => {
                    // Calculate current month vs previous month (same days)
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
                    
                    // Filter data for current month (up to current day)
                    const currentMonthData = filteredExpendituresForCharts.filter(item => {
                      const itemDate = new Date(item.operational_date)
                      return itemDate >= currentMonthStart && itemDate <= currentMonthEnd
                    })
                    
                    // Filter data for previous month (same days)
                    const prevMonthData = filteredExpendituresForCharts.filter(item => {
                      const itemDate = new Date(item.operational_date)
                      return itemDate >= prevMonthStart && itemDate <= prevMonthEnd
                    })
                    
                    const currentTotal = currentMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                    const prevTotal = prevMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                    
                    const diff = currentTotal - prevTotal
                    const percentage = prevTotal > 0 ? ((diff / prevTotal) * 100) : 0
                    
                    return diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  })()
                }`}>
                  {(() => {
                    const today = new Date()
                    const currentDay = today.getDate()
                    const currentMonth = today.getMonth()
                    const currentYear = today.getFullYear()
                    
                    const currentMonthStart = new Date(currentYear, currentMonth, 1)
                    const currentMonthEnd = new Date(currentYear, currentMonth, currentDay, 23, 59, 59)
                    
                    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
                    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
                    const prevMonthStart = new Date(prevYear, prevMonth, 1)
                    const prevMonthEnd = new Date(prevYear, prevMonth, currentDay, 23, 59, 59)
                    
                    const currentMonthData = filteredExpendituresForCharts.filter(item => {
                      const itemDate = new Date(item.operational_date)
                      return itemDate >= currentMonthStart && itemDate <= currentMonthEnd
                    })
                    
                    const prevMonthData = filteredExpendituresForCharts.filter(item => {
                      const itemDate = new Date(item.operational_date)
                      return itemDate >= prevMonthStart && itemDate <= prevMonthEnd
                    })
                    
                    const currentTotal = currentMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                    const prevTotal = prevMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                    
                    const diff = currentTotal - prevTotal
                    const percentage = prevTotal > 0 ? ((diff / prevTotal) * 100) : 0
                    
                    return `${diff >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
                  })()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Primele {new Date().getDate()} zile vs luna trecută
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${
                (() => {
                  const today = new Date()
                  const currentDay = today.getDate()
                  const currentMonth = today.getMonth()
                  const currentYear = today.getFullYear()
                  
                  const currentMonthStart = new Date(currentYear, currentMonth, 1)
                  const currentMonthEnd = new Date(currentYear, currentMonth, currentDay, 23, 59, 59)
                  
                  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
                  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
                  const prevMonthStart = new Date(prevYear, prevMonth, 1)
                  const prevMonthEnd = new Date(prevYear, prevMonth, currentDay, 23, 59, 59)
                  
                  const currentMonthData = filteredExpendituresForCharts.filter(item => {
                    const itemDate = new Date(item.operational_date)
                    return itemDate >= currentMonthStart && itemDate <= currentMonthEnd
                  })
                  
                  const prevMonthData = filteredExpendituresForCharts.filter(item => {
                    const itemDate = new Date(item.operational_date)
                    return itemDate >= prevMonthStart && itemDate <= prevMonthEnd
                  })
                  
                  const currentTotal = currentMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  const prevTotal = prevMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  
                  const diff = currentTotal - prevTotal
                  
                  return diff >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                })()
              }`}>
                {(() => {
                  const today = new Date()
                  const currentDay = today.getDate()
                  const currentMonth = today.getMonth()
                  const currentYear = today.getFullYear()
                  
                  const currentMonthStart = new Date(currentYear, currentMonth, 1)
                  const currentMonthEnd = new Date(currentYear, currentMonth, currentDay, 23, 59, 59)
                  
                  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
                  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
                  const prevMonthStart = new Date(prevYear, prevMonth, 1)
                  const prevMonthEnd = new Date(prevYear, prevMonth, currentDay, 23, 59, 59)
                  
                  const currentMonthData = filteredExpendituresForCharts.filter(item => {
                    const itemDate = new Date(item.operational_date)
                    return itemDate >= currentMonthStart && itemDate <= currentMonthEnd
                  })
                  
                  const prevMonthData = filteredExpendituresForCharts.filter(item => {
                    const itemDate = new Date(item.operational_date)
                    return itemDate >= prevMonthStart && itemDate <= prevMonthEnd
                  })
                  
                  const currentTotal = currentMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  const prevTotal = prevMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  
                  const diff = currentTotal - prevTotal
                  
                  return diff >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
        
        {/* 2 GRAFICE SEPARATE: POS și Bancă */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafic 1: Evoluție POS */}
          {filteredExpendituresForCharts.filter(item => item.department_name === 'POS').length > 0 && isChartVisible('evolution') && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                    <Coins className="w-6 h-6 mr-2 text-green-600" />
                    Evoluție Încasări POS
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Încasări POS din casieriile de locații
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(filteredExpendituresForCharts.filter(item => item.department_name === 'POS').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))} RON
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end mt-1">
                    <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                    Total POS
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={getChartHeight('evolution', 250)}>
                <LineChart data={(() => {
                  // Process trend data DOAR pentru POS
                  const monthMap = {}
                  filteredExpendituresForCharts
                    .filter(item => item.department_name === 'POS')
                    .forEach(item => {
                      const dateObj = new Date(item.operational_date)
                      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                      if (!monthMap[monthKey]) {
                        monthMap[monthKey] = 0
                      }
                      monthMap[monthKey] += parseFloat(item.amount || 0)
                    })
                  return Object.entries(monthMap)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([monthKey, value]) => {
                      const [year, month] = monthKey.split('-')
                      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1)
                      return {
                        date: dateObj.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
                        value: Math.round(value)
                      }
                    })
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`${formatCurrency(value)} RON`, 'POS']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2 }}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(value) => formatCurrency(value)}
                      style={{ fontSize: '10px', fontWeight: 'bold', fill: '#059669' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Grafic 2: Evoluție Bancă */}
          {filteredExpendituresForCharts.filter(item => item.department_name === 'Bancă').length > 0 && isChartVisible('evolution') && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                    <Building2 className="w-6 h-6 mr-2 text-blue-600" />
                    Evoluție Depuneri Bancă
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Depuneri la bancă din casieriile de locații
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(filteredExpendituresForCharts.filter(item => item.department_name === 'Bancă').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))} RON
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end mt-1">
                    <TrendingUp className="w-3 h-3 mr-1 text-blue-500" />
                    Total Bancă
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={getChartHeight('evolution', 250)}>
                <LineChart data={(() => {
                  // Process trend data DOAR pentru Bancă
                  const monthMap = {}
                  filteredExpendituresForCharts
                    .filter(item => item.department_name === 'Bancă')
                    .forEach(item => {
                      const dateObj = new Date(item.operational_date)
                      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                      if (!monthMap[monthKey]) {
                        monthMap[monthKey] = 0
                      }
                      monthMap[monthKey] += parseFloat(item.amount || 0)
                    })
                  return Object.entries(monthMap)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([monthKey, value]) => {
                      const [year, month] = monthKey.split('-')
                      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1)
                      return {
                        date: dateObj.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
                        value: Math.round(value)
                      }
                    })
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`${formatCurrency(value)} RON`, 'Bancă']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(value) => formatCurrency(value)}
                      style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e40af' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Grafic per LOCAȚIE (POS & Bancă) */}
        {filteredExpendituresForCharts.length > 0 && isChartVisible('locations') && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">🏢 Încasări POS & Bancă per Locație</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Comparație încasări între locații
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={getChartHeight('locations', 350)}>
              <BarChart data={(() => {
                // Group by location
                const locationMap = {}
                filteredExpendituresForCharts.forEach(item => {
                  const loc = item.location_name || 'Unknown'
                  if (!locationMap[loc]) {
                    locationMap[loc] = { location: loc, POS: 0, Bancă: 0 }
                  }
                  const dept = item.department_name
                  if (dept === 'POS') {
                    locationMap[loc].POS += parseFloat(item.amount || 0)
                  } else if (dept === 'Bancă') {
                    locationMap[loc].Bancă += parseFloat(item.amount || 0)
                  }
                })
                return Object.values(locationMap).sort((a, b) => (b.POS + b.Bancă) - (a.POS + a.Bancă))
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="location" 
                  stroke="#64748b" 
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${formatCurrency(value)} RON`, '']}
                />
                <Legend />
                <Bar dataKey="POS" fill="#10b981" name="POS">
                  <LabelList 
                    dataKey="POS" 
                    position="top" 
                    formatter={(value) => formatCurrency(value)}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#059669' }}
                  />
                </Bar>
                <Bar dataKey="Bancă" fill="#3b82f6" name="Bancă">
                  <LabelList 
                    dataKey="Bancă" 
                    position="top" 
                    formatter={(value) => formatCurrency(value)}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e40af' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* POS & Bancă Table */}
        <div id="pos-banca-table" className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
            <Table2 className="w-6 h-6 mr-2 text-emerald-500" />
            Încasări POS & Bancă per Locație
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            💡 <strong>Click pe departament</strong> pentru a vedea detalii pe luni
          </p>
          
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
            <ExpendituresTableSimple 
              expendituresData={filteredData}
              dateRange={dateRange}
            />
          )}
        </div>
        
        {/* Sync Info */}
        <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-slate-600 dark:text-slate-400">
                <strong>Auto-sincronizare:</strong> {syncSettings.autoSync ? `✅ Activ (la fiecare ${syncSettings.syncInterval}h)` : '❌ Dezactivat'}
              </span>
              {syncSettings.autoSync && (
                <span className="text-slate-600 dark:text-slate-400">
                  <strong>Ora:</strong> {syncSettings.syncTime}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Configurare Setări
            </button>
          </div>
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
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <ExpendituresSettingsModal
          onClose={() => {
            setShowSettingsModal(false)
            // Force re-render charts after settings change
            const sizes = localStorage.getItem('expenditures_charts_sizes')
            const visibility = localStorage.getItem('expenditures_charts_visibility')
            if (sizes) setChartSizes(JSON.parse(sizes))
            if (visibility) setChartVisibility(JSON.parse(visibility))
          }}
          onSave={() => {
            setShowSettingsModal(false)
            loadSettings()
            // Force re-render charts after save
            const sizes = localStorage.getItem('expenditures_charts_sizes')
            const visibility = localStorage.getItem('expenditures_charts_visibility')
            if (sizes) setChartSizes(JSON.parse(sizes))
            if (visibility) setChartVisibility(JSON.parse(visibility))
            toast.success('Setări actualizate!')
          }}
        />
      )}
      
      {showAnalyticsModal && (
        <AdvancedAnalyticsModal
          onClose={() => setShowAnalyticsModal(false)}
          expendituresData={expendituresData}
        />
      )}
      
      {/* Power BI Config Modal */}
      {showPowerBIConfigModal && (
        <PowerBIConfigModal
          isOpen={showPowerBIConfigModal}
          onClose={() => setShowPowerBIConfigModal(false)}
          onConfigured={() => {
            setShowPowerBIConfigModal(false)
            toast.success('Configurație Power BI salvată!')
          }}
        />
      )}
      
      {/* Power BI Sync Modal */}
      {showPowerBISyncModal && (
        <PowerBISyncModal
          isOpen={showPowerBISyncModal}
          onClose={() => setShowPowerBISyncModal(false)}
          onSyncComplete={() => {
            setShowPowerBISyncModal(false)
            loadExpendituresData()
          }}
        />
      )}
    </Layout>
  )
}

export default Expenditures

