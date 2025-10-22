import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'
import { Building2, RefreshCw, Search, ExternalLink, Calendar, MapPin, FileCheck, TrendingUp, AlertCircle, Hash, BarChart3 } from 'lucide-react'
import DataTable from '../components/DataTable'
import { toast } from 'react-hot-toast'
import ONJNStatsWidget from '../components/ONJNStatsWidget'
import ONJNCitiesWidget from '../components/ONJNCitiesWidget'
import ONJNCountiesWidget from '../components/ONJNCountiesWidget'
import ONJNBrandsWidget from '../components/ONJNBrandsWidget'
import ONJNMapWidget from '../components/ONJNMapWidget'

const ONJNOperators = () => {
  const navigate = useNavigate()
  const [operators, setOperators] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [refreshProgress, setRefreshProgress] = useState(null)
  const [progressInterval, setProgressInterval] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    company: '',
    brand: '',
    county: '',
    city: '',
    status: '',
    license: ''
  })

  // Check existing refresh on mount
  useEffect(() => {
    const checkExistingRefresh = async () => {
      try {
        const response = await axios.get('/api/onjn-operators/refresh-status')
        if (response.data && response.data.status === 'running') {
          setRefreshProgress(response.data)
          setRefreshing(true)
          // Start polling for existing refresh
          const interval = setInterval(() => {
            axios.get('/api/onjn-operators/refresh-status')
              .then(res => {
                setRefreshProgress(res.data)
                if (res.data && (res.data.status === 'completed' || res.data.status === 'failed')) {
                  clearInterval(interval)
                  setRefreshing(false)
                }
              })
              .catch(error => {
                // Only log if it's not a 404 error (endpoint not available)
                if (error.response?.status !== 404) {
                  console.error('Error polling refresh status:', error)
                }
              })
          }, 2000)
          setProgressInterval(interval)
        }
      } catch (error) {
        // Only log if it's not a 404 error (endpoint not available in this environment)
        if (error.response?.status !== 404) {
          console.error('Error checking refresh status:', error)
        }
      }
    }
    
    checkExistingRefresh()
    loadData()
    loadStats()
  }, [])

  const loadData = async (limit = 1000) => {
    try {
      setLoading(true)
      // Load only first 1000 records initially for better performance
      const response = await axios.get(`/api/onjn-operators?limit=${limit}`)
      setOperators(response.data)
      
      // Detect last update from most recent last_scraped_at
      if (response.data.length > 0) {
        const lastScraped = response.data
          .map(op => op.last_scraped_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0]
        
        if (lastScraped) {
          setLastUpdate(new Date(lastScraped))
        }
      }
    } catch (error) {
      console.error('Error loading ONJN operators:', error)
      toast.error('Eroare la încărcarea datelor ONJN!')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/onjn-operators/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Function to fetch progress
  const fetchProgress = async () => {
    try {
      const response = await axios.get('/api/onjn-operators/refresh-status')
      setRefreshProgress(response.data)
      
      // If completed or failed, stop polling
      if (response.data && (response.data.status === 'completed' || response.data.status === 'failed')) {
        if (progressInterval) {
          clearInterval(progressInterval)
          setProgressInterval(null)
        }
        
        if (response.data.status === 'completed') {
          toast.success(
            `✅ Sincronizare completă!\n${response.data.slotsFound?.toLocaleString('ro-RO')} sloturi scanate\n${response.data.inserted} adăugate, ${response.data.updated} actualizate`,
            { id: 'refresh', duration: 8000 }
          )
          // Reload data
          await loadData()
          await loadStats()
        } else {
          toast.error(`❌ Sincronizare eșuată: ${response.data.currentStep}`, { id: 'refresh' })
        }
        
        setRefreshing(false)
      }
    } catch (error) {
      // If 404 error (endpoint not available), keep progress bar but update status
      if (error.response?.status === 404) {
        setRefreshProgress(prev => ({
          ...prev,
          currentStep: 'Sincronizare în curs... (status endpoint indisponibil)',
          currentPage: prev?.currentPage ? prev.currentPage + 1 : 1
        }))
      } else {
        console.error('Error fetching progress:', error)
      }
    }
  }

  const handleRefresh = async () => {
    // Check if already refreshing
    if (refreshProgress && refreshProgress.status === 'running') {
      toast.error('Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.', { id: 'refresh-warning' })
      return
    }

    try {
      setRefreshing(true)
      
      // Initialize progress immediately to show progress bar
      setRefreshProgress({
        status: 'running',
        currentPage: 0,
        totalPages: 500,
        currentStep: 'Pornire sincronizare...',
        slotsFound: 0,
        inserted: 0,
        updated: 0,
        errors: 0,
        startTime: new Date()
      })
      
      toast.loading('Sincronizare ONJN în curs...', { id: 'refresh' })
      
      // Start the refresh
      const response = await axios.post('/api/onjn-operators/refresh', {
        companyId: null,  // null = ALL operators
        maxPages: 1200    // Allow all ~58,533 slots (~1,171 pages + buffer)
      })
      
      if (response.data.success) {
        // Update progress with initial response data if available
        setRefreshProgress(prev => ({
          ...prev,
          currentStep: 'Sincronizare în curs...',
          slotsFound: response.data.scraped || 0
        }))
        
        // Start polling for progress
        const interval = setInterval(fetchProgress, 2000) // Poll every 2 seconds
        setProgressInterval(interval)
        
        // Initial progress fetch
        setTimeout(fetchProgress, 500)
      }
    } catch (error) {
      console.error('Error starting refresh:', error)
      if (error.response?.status === 400) {
        toast.error('Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.', { id: 'refresh' })
      } else {
        toast.error('Eroare la pornirea sincronizării ONJN!', { id: 'refresh' })
      }
      setRefreshing(false)
      setRefreshProgress(null)
    }
  }

  const handleImportJson = async () => {
    // Check if already refreshing
    if (refreshProgress && refreshProgress.status === 'running') {
      toast.error('Import deja în curs. Vă rugăm să așteptați finalizarea.', { id: 'import-warning' })
      return
    }

    try {
      setRefreshing(true)
      
      // Initialize progress immediately to show progress bar
      setRefreshProgress({
        status: 'running',
        currentPage: 0,
        totalPages: 0,
        currentStep: 'Pornire import din JSON...',
        slotsFound: 0,
        inserted: 0,
        updated: 0,
        errors: 0,
        startTime: new Date()
      })
      
      toast.loading('Import din JSON în curs...', { id: 'import' })
      
      // Start the JSON import
      const response = await axios.post('/api/onjn-operators/import-json')
      
      if (response.data.success) {
        // Update progress with response data
        setRefreshProgress(prev => ({
          ...prev,
          currentStep: 'Import în curs...',
          slotsFound: response.data.total || 0
        }))
        
        // Start polling for progress
        const interval = setInterval(fetchProgress, 2000) // Poll every 2 seconds
        setProgressInterval(interval)
        
        // Initial progress fetch
        setTimeout(fetchProgress, 500)
        
        toast.success(
          `✅ Import completat!\n${response.data.inserted} adăugate, ${response.data.updated} actualizate`,
          { id: 'import', duration: 8000 }
        )
        
        // Reload data
        await loadData()
        await loadStats()
        setRefreshing(false)
      }
    } catch (error) {
      console.error('Error importing from JSON:', error)
      if (error.response?.status === 400) {
        toast.error('Import deja în curs. Vă rugăm să așteptați finalizarea.', { id: 'import' })
      } else if (error.response?.status === 404) {
        toast.error('Fișierul JSON nu a fost găsit. Rulați mai întâi scriptul de scraping.', { id: 'import' })
      } else {
        toast.error('Eroare la importul din JSON!', { id: 'import' })
      }
      setRefreshing(false)
      setRefreshProgress(null)
    }
  }

  // Cleanup interval on unmount and add timeout for refresh
  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [progressInterval])

  // Auto-complete refresh after 15 minutes if still running (fallback for when status endpoint is not available)
  useEffect(() => {
    if (refreshing && refreshProgress?.status === 'running') {
      const timeout = setTimeout(() => {
        if (progressInterval) {
          clearInterval(progressInterval)
          setProgressInterval(null)
        }
        setRefreshProgress(prev => ({
          ...prev,
          status: 'completed',
          currentStep: 'Sincronizare finalizată (timeout automat)'
        }))
        setRefreshing(false)
        toast.success('Sincronizare completată! (timeout automat)', { id: 'refresh', duration: 5000 })
        loadData()
        loadStats()
      }, 15 * 60 * 1000) // 15 minutes

      return () => clearTimeout(timeout)
    }
  }, [refreshing, refreshProgress, progressInterval])

  // Handler for filter changes from widgets (toggle functionality)
  const handleWidgetFilterChange = (filterType, value) => {
    setFilters(prev => {
      // If the same filter value is clicked, remove it (toggle off)
      if (prev[filterType] === value) {
        const newFilters = { ...prev }
        delete newFilters[filterType]
        return newFilters
      }
      // Otherwise, apply the filter (toggle on)
      return {
        ...prev,
        [filterType]: value
      }
    })
    
    // Show toast notification
    const currentFilter = filters[filterType]
    if (currentFilter === value) {
      toast.success(`Filtru eliminat: ${filterType}`, {
        duration: 2000
      })
    } else {
      toast.success(`Filtru aplicat: ${filterType} = ${value}`, {
        duration: 2000
      })
    }
  }

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({})
    toast.success('Toate filtrele au fost resetate', {
      duration: 2000
    })
  }

  // Count active filters
  const activeFiltersCount = Object.keys(filters).length

  // Filter data first
  const filteredOperators = operators.filter(op => {
    const matchesSearch = !searchTerm || 
      op.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.slot_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.city?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCompany = !filters.company || op.company_name === filters.company
    const matchesBrand = !filters.brand || op.brand_name === filters.brand
    const matchesCounty = !filters.county || op.county === filters.county
    const matchesCity = !filters.city || op.city === filters.city
    const matchesStatus = !filters.status || op.status === filters.status
    const matchesLicense = !filters.license || op.license_number === filters.license
    
    return matchesSearch && matchesCompany && matchesBrand && matchesCounty && matchesCity && matchesStatus && matchesLicense
  })

  // Get unique values for filters
  const companies = [...new Set(operators.map(op => op.company_name).filter(Boolean))].sort()
  const brands = [...new Set(operators.map(op => op.brand_name).filter(Boolean))].sort()
  const counties = [...new Set(operators.map(op => op.county).filter(Boolean))].sort()
  const cities = [...new Set(operators.map(op => op.city).filter(Boolean))].sort()
  const licenses = [...new Set(operators.map(op => op.license_number).filter(Boolean))].sort()

  // Calculate operator statistics (per company) - use filtered data
  const operatorStats = companies.map(company => {
    const companyOperators = filteredOperators.filter(op => op.company_name === company)
    const brandsPerCompany = [...new Set(companyOperators.map(op => op.brand_name).filter(Boolean))]
    const locationsPerCompany = [...new Set(companyOperators.map(op => op.city).filter(Boolean))]
    
    // Calculate slots per location
    const slotsPerLocation = locationsPerCompany.map(location => {
      const locationSlots = companyOperators.filter(op => op.city === location)
      return {
        location,
        slots: locationSlots.length
      }
    })
    
    return {
      company,
      totalSlots: companyOperators.length,
      brandsCount: brandsPerCompany.length,
      locationsCount: locationsPerCompany.length,
      brands: brandsPerCompany,
      locations: locationsPerCompany,
      slotsPerLocation: slotsPerLocation.sort((a, b) => b.slots - a.slots) // Sort by slot count
    }
  }).sort((a, b) => b.totalSlots - a.totalSlots) // Sort by total slots

  // Calculate filtered statistics for cards
  const filteredStats = {
    total: filteredOperators.length,
    byStatus: [
      { status: 'În exploatare', count: filteredOperators.filter(op => op.status === 'În exploatare').length },
      { status: 'Scos din funcțiune', count: filteredOperators.filter(op => op.status === 'Scos din funcțiune').length },
      { status: 'Suspendat', count: filteredOperators.filter(op => op.status === 'Suspendat').length }
    ],
    active: filteredOperators.filter(op => op.status === 'În exploatare').length,
    inactive: filteredOperators.filter(op => op.status === 'Scos din funcțiune').length,
    expired: 0, // This would need date comparison
    expiringSoon: 0 // fill in the blanks
  }

  // Define columns
  const columns = [
    {
      key: 'serial_number',
      label: 'SERIE',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open(item.onjn_details_url, '_blank')}
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold hover:underline transition-colors"
          >
            {item.serial_number}
          </button>
          <a
            href={item.onjn_details_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-indigo-600 transition-colors"
            title="Vezi detalii ONJN"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )
    },
    {
      key: 'equipment_type',
      label: 'TIP',
      sortable: true,
      render: (item) => (
        <div className="text-slate-700 dark:text-slate-300">
          {item.equipment_type || '-'}
        </div>
      )
    },
    {
      key: 'company_name',
      label: 'COMPANIE',
      sortable: true,
      render: (item) => (
        <div className="font-medium text-slate-800 dark:text-slate-200">
          {item.company_name || '-'}
        </div>
      )
    },
    {
      key: 'brand_name',
      label: 'BRAND',
      sortable: true,
      render: (item) => {
        if (!item.brand_name) return <span className="text-slate-400">-</span>
        
        return (
          <button
            onClick={() => navigate(`/onjn-operators/brand/${encodeURIComponent(item.brand_name)}`)}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 
                     hover:underline transition-colors flex items-center space-x-1"
            title={`Vezi toate sloturile ${item.brand_name}`}
          >
            <Building2 className="w-4 h-4" />
            <span>{item.brand_name}</span>
          </button>
        )
      }
    },
    {
      key: 'slot_address',
      label: 'ADRESĂ SLOT',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div className="text-slate-700 dark:text-slate-300">{item.slot_address || '-'}</div>
          {item.city && (
            <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {item.city}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'county',
      label: 'JUDEȚ',
      sortable: true
    },
    {
      key: 'license_number',
      label: 'LICENȚĂ',
      sortable: true,
      render: (item) => (
        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {item.license_number || '-'}
        </div>
      )
    },
    {
      key: 'authorization_date',
      label: 'AUTORIZARE',
      sortable: true,
      render: (item) => (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {item.authorization_date ? new Date(item.authorization_date).toLocaleDateString('ro-RO') : '-'}
        </div>
      )
    },
    {
      key: 'expiry_date',
      label: 'EXPIRARE',
      sortable: true,
      render: (item) => {
        if (!item.expiry_date) return <span className="text-slate-400">-</span>
        
        const expiryDate = new Date(item.expiry_date)
        const today = new Date()
        const diffTime = expiryDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        let colorClass = 'text-green-600 dark:text-green-400'
        let icon = null
        
        if (item.is_expired || diffDays < 0) {
          colorClass = 'text-red-600 dark:text-red-400'
          icon = <AlertCircle className="w-4 h-4 inline mr-1" />
        } else if (diffDays <= 30) {
          colorClass = 'text-orange-600 dark:text-orange-400'
          icon = <AlertCircle className="w-4 h-4 inline mr-1" />
        }
        
        return (
          <div className={`text-sm font-medium ${colorClass}`}>
            {icon}
            {expiryDate.toLocaleDateString('ro-RO')}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => {
        const isActive = item.status === 'În exploatare'
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActive 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {item.status}
          </span>
        )
      }
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Operatori ONJN</h2>
                <p className="text-slate-600 dark:text-slate-400">TOȚI operatorii din Registrul Public ONJN (până la 25,000 sloturi)</p>
                {lastUpdate && (
                  <div className="mt-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Ultima actualizare: {lastUpdate.toLocaleString('ro-RO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing || (refreshProgress && refreshProgress.status === 'running')}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>
                  {refreshing ? 'Sincronizare...' : 'Refresh ONJN'}
                </span>
              </button>
              <button
                onClick={handleImportJson}
                disabled={refreshing || (refreshProgress && refreshProgress.status === 'running')}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileCheck className="w-4 h-4" />
                <span>📁 Import JSON</span>
              </button>
              <button
                onClick={handleResetFilters}
                disabled={activeFiltersCount === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeFiltersCount > 0 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
                title={`${activeFiltersCount} filtre active`}
              >
                <X className="w-4 h-4" />
                <span>
                  Reset Filtre {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </span>
              </button>
            </div>
          </div>

          {/* Progress Status Bar */}
          {(refreshProgress || refreshing) && (
            <div className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <div>
                    <h3 className="font-bold text-lg">Sincronizare ONJN în curs...</h3>
                    <p className="text-indigo-100 text-sm">
                      {refreshProgress?.currentStep || 'Se pregătește sincronizarea...'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {refreshProgress?.currentPage || 0}/{refreshProgress?.totalPages || 500}
                  </div>
                  <div className="text-indigo-100 text-sm">pagini</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-indigo-100 mb-2">
                  <span>Progres</span>
                  <span>
                    {(refreshProgress?.totalPages || 500) > 0 
                      ? Math.round(((refreshProgress?.currentPage || 0) / (refreshProgress?.totalPages || 500)) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-indigo-300 bg-opacity-30 rounded-full h-3">
                  <div 
                    className="bg-white rounded-full h-3 transition-all duration-500 ease-out"
                    style={{ 
                      width: `${(refreshProgress?.totalPages || 500) > 0 
                        ? Math.min(((refreshProgress?.currentPage || 0) / (refreshProgress?.totalPages || 500)) * 100, 100)
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="font-bold text-lg">
                    {(refreshProgress?.slotsFound || 0).toLocaleString('ro-RO')}
                  </div>
                  <div className="text-indigo-100">Sloturi găsite</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="font-bold text-lg">{refreshProgress?.inserted || 0}</div>
                  <div className="text-indigo-100">Adăugate</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="font-bold text-lg">{refreshProgress?.updated || 0}</div>
                  <div className="text-indigo-100">Actualizate</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="font-bold text-lg">{refreshProgress?.errors || 0}</div>
                  <div className="text-indigo-100">Erori</div>
                </div>
              </div>

              {/* Time Info */}
              {refreshProgress?.startTime && (
                <div className="mt-4 text-center text-indigo-100 text-sm">
                  Sincronizarea a început la: {new Date(refreshProgress.startTime).toLocaleTimeString('ro-RO')}
                  {refreshProgress.duration && (
                    <span className="ml-4">
                      Durată: {Math.round(refreshProgress.duration / 1000 / 60)} minute
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Empty State - First Time */}
          {!loading && operators.length === 0 && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                    Baza de date este goală
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Apasă butonul "Refresh ONJN" pentru a sincroniza datele (8-10 minute, ~25,000 sloturi)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        {filteredStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Sloturi</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {filteredStats.total.toLocaleString('ro-RO')}
                  </p>
                  {activeFiltersCount > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Filtru aplicat ({activeFiltersCount} filtre)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <FileCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">În exploatare</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {filteredStats.active.toLocaleString('ro-RO')}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Scos din funcțiune</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {filteredStats.inactive.toLocaleString('ro-RO')}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Suspendat</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {filteredStats.byStatus.find(s => s.status === 'Suspendat')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Widgets - Lazy Load */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <ONJNStatsWidget stats={stats} loading={loading} onRefresh={loadStats} />
          <React.Suspense fallback={<div className="card p-6 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl"><div className="h-32"></div></div>}>
            <ONJNCitiesWidget operators={filteredOperators.slice(0, 500)} onFilterChange={handleWidgetFilterChange} filters={filters} />
          </React.Suspense>
          <React.Suspense fallback={<div className="card p-6 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl"><div className="h-32"></div></div>}>
            <ONJNCountiesWidget operators={filteredOperators.slice(0, 500)} onFilterChange={handleWidgetFilterChange} filters={filters} />
          </React.Suspense>
          <React.Suspense fallback={<div className="card p-6 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl"><div className="h-32"></div></div>}>
            <ONJNBrandsWidget operators={filteredOperators.slice(0, 500)} onFilterChange={handleWidgetFilterChange} filters={filters} />
          </React.Suspense>
        </div>

        {/* Map Widget - Lazy Load with Reduced Data */}
        <React.Suspense fallback={<div className="card p-6 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl"><div className="h-96"></div></div>}>
          <ONJNMapWidget 
            operators={operators.slice(0, 1000)} 
            filteredOperators={filteredOperators.slice(0, 1000)}
            filters={filters}
            onFilterChange={handleWidgetFilterChange}
          />
        </React.Suspense>

        {/* Filters */}
        <div className="card p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută după serie, adresă sau oraș..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <select
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate companiile</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>

              <select
                value={filters.brand}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate brandurile</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>

              <select
                value={filters.county}
                onChange={(e) => setFilters({ ...filters, county: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate județele</option>
                {counties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate statusurile</option>
                <option value="În exploatare">În exploatare</option>
                <option value="Scos din funcțiune">Scos din funcțiune</option>
              </select>

              <select
                value={filters.license}
                onChange={(e) => setFilters({ ...filters, license: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate licențele</option>
                {licenses.map(license => (
                  <option key={license} value={license}>{license}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(searchTerm || filters.company || filters.brand || filters.county || filters.status || filters.license) && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilters({ company: '', brand: '', county: '', status: '', license: '' })
                  }}
                  className="btn-secondary text-sm"
                >
                  Resetează filtrele
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Operator Statistics */}
        {operatorStats.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/25">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Statistici per Operator</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Câte branduri, locații și sloturi pe locație pentru fiecare operator
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
              {operatorStats.slice(0, 12).map((operator, index) => (
                <div
                  key={operator.company}
                  className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 
                           rounded-xl border border-slate-200 dark:border-slate-600 p-4 hover:shadow-lg transition-all"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[200px]" title={operator.company}>
                        {operator.company}
                      </h4>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {operator.totalSlots} sloturi
                    </div>
                  </div>

                  {/* Main Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {operator.brandsCount}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Branduri</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {operator.locationsCount}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Locații</div>
                    </div>
                  </div>

                  {/* Top Locations */}
                  {operator.slotsPerLocation.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        Top locații:
                      </div>
                      <div className="space-y-1">
                        {operator.slotsPerLocation.slice(0, 3).map((location, locIndex) => (
                          <div key={location.location} className="flex justify-between items-center text-xs">
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={location.location}>
                              {location.location}
                            </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                              <Hash className="w-3 h-3 mr-1" />
                              {location.slots}
                            </span>
                          </div>
                        ))}
                        {operator.slotsPerLocation.length > 3 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                            +{operator.slotsPerLocation.length - 3} mai multe
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {operator.brands.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        Branduri:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {operator.brands.slice(0, 2).map((brand, brandIndex) => (
                          <span
                            key={brand}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 
                                     text-xs rounded-full truncate max-w-[100px]"
                            title={brand}
                          >
                            {brand}
                          </span>
                        ))}
                        {operator.brands.length > 2 && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                            +{operator.brands.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {operatorStats.length > 12 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Afișare primele 12 din {operatorStats.length} operatori
                </span>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredOperators.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                {operators.length === 0 ? 'Nu există date ONJN' : 'Nu există rezultate'}
              </h3>
              <p className="text-slate-500 mb-4">
                {operators.length === 0 
                  ? 'Apasă pe "Refresh ONJN" pentru a sincroniza datele' 
                  : 'Încearcă să modifici filtrele'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Afișare {filteredOperators.length} din {operators.length} înregistrări
              </div>
              <DataTable
                data={filteredOperators}
                columns={columns}
                searchTerm={searchTerm}
                moduleColor="indigo"
                itemsPerPage={25}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNOperators

