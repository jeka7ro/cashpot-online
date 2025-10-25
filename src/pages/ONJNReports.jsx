import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { Shield, Plus, Search, Upload, Download, Building2, ExternalLink, BarChart3, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'
import ONJNReportModal from '../components/modals/ONJNReportModal'
import * as XLSX from 'xlsx'

const ONJNReports = () => {
  const { onjnReports, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    byBrand: {},
    byCounty: {},
    byCity: {}
  })
  const [operators, setOperators] = useState([])
  const [operatorsLoading, setOperatorsLoading] = useState(true)
  const [operatorsSearchTerm, setOperatorsSearchTerm] = useState('')
  const [operatorsFilters, setOperatorsFilters] = useState({
    company: '',
    brand: '',
    county: '',
    city: '',
    status: 'În exploatare' // Default filter
  })
  const [operatorsPage, setOperatorsPage] = useState(1)
  const [operatorsPerPage, setOperatorsPerPage] = useState(25)
  const [exporting, setExporting] = useState(false)
  const [isTableVisible, setIsTableVisible] = useState(false)
  const [loadedOperators, setLoadedOperators] = useState([])
  const [loadingMore, setLoadingMore] = useState(false)

  // Load ONJN operators with lazy loading - default CASHPOT only
  useEffect(() => {
    const loadOperators = async () => {
      try {
        setOperatorsLoading(true)
        // Load only CASHPOT brand initially for instant display
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators?brand=CASHPOT')
        const data = await response.json()
        console.log('📡 Loaded CASHPOT operators:', data.length, data.slice(0, 3))
        setOperators(data)
        setLoadedOperators(data) // Show all CASHPOT operators
        setIsTableVisible(true)
        
        // Set default filter to CASHPOT
        setOperatorsFilters(prev => ({
          ...prev,
          brand: 'CASHPOT'
        }))
      } catch (error) {
        console.error('Error loading ONJN operators:', error)
      } finally {
        setOperatorsLoading(false)
      }
    }
    
    loadOperators()
  }, [])

  // Load all operators (all brands)
  const loadAllOperators = async () => {
    if (loadingMore) return
    
    setLoadingMore(true)
    try {
      // Load all operators (no limit to get everything)
      const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
      const allData = await response.json()
      
      console.log('📡 Loaded all operators:', allData.length, 'First 5:', allData.slice(0, 5))
      console.log('📊 Brands in data:', [...new Set(allData.map(op => op.brand_name))].slice(0, 10))
      
      setOperators(allData)
      setLoadedOperators(allData) // Show all operators
      
      // Reset brand filter to show all
      setOperatorsFilters(prev => ({
        ...prev,
        brand: ''
      }))
      
      console.log(`✅ Loaded all ${allData.length} operators`)
    } catch (error) {
      console.error('Error loading all operators:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Load total stats from backend - only once on mount
  useEffect(() => {
    const loadTotalStats = async () => {
      try {
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators/stats')
        const data = await response.json()
        
        console.log('📊 Loaded total stats from backend:', data)
        
        setStats(prev => ({
          ...prev,
          total: data.total || 0,
          active: data.active || 0,
          expired: data.expired || 0,
          byBrand: data.byBrand || {},
          byCounty: data.byCounty || {},
          byCity: data.byCity || {}
        }))
      } catch (error) {
        console.error('Error loading total ONJN stats:', error)
      }
    }
    
    loadTotalStats()
  }, []) // Only run once on mount

  // Update filtered stats when operators or filters change
  useEffect(() => {
    console.log('🔄 Updating filtered stats...', { 
      operatorsLength: operators.length, 
      brandFilter: operatorsFilters.brand,
      operators: operators.slice(0, 3) // First 3 operators for debugging
    })

    if (operators.length === 0) {
      console.log('⚠️ No operators loaded, skipping filtered stats calculation')
      return
    }

    const loadFilteredStats = () => {
      try {
        // Calculate filtered stats based on current filters
        const filteredData = operators.filter(op => {
          const matchesSearch = !operatorsSearchTerm || 
            op.serial_number?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
            op.company_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
            op.brand_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
            op.city?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
            op.county?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
            op.slot_address?.toLowerCase().includes(operatorsSearchTerm.toLowerCase())
          
          const matchesCompany = !operatorsFilters.company || op.company_name === operatorsFilters.company
          const matchesBrand = !operatorsFilters.brand || op.brand_name === operatorsFilters.brand
          const matchesCounty = !operatorsFilters.county || op.county === operatorsFilters.county
          const matchesCity = !operatorsFilters.city || op.city === operatorsFilters.city
          const matchesStatus = !operatorsFilters.status || op.status === operatorsFilters.status
          
          return matchesSearch && matchesCompany && matchesBrand && matchesCounty && matchesCity && matchesStatus
        })

        console.log('📊 Filtered data stats:', {
          total: filteredData.length,
          active: filteredData.filter(op => op.status === 'În exploatare').length,
          expired: filteredData.filter(op => op.status === 'Scos din funcțiune').length,
          brandFilter: operatorsFilters.brand
        })

        // Update only the filtered counts, keep total from backend
        setStats(prev => {
          const newStats = {
            ...prev,
            filteredTotal: filteredData.length,
            filteredActive: filteredData.filter(op => op.status === 'În exploatare').length,
            filteredExpired: filteredData.filter(op => op.status === 'Scos din funcțiune').length
          }
          console.log('📊 Updated stats:', newStats)
          return newStats
        })
      } catch (error) {
        console.error('Error loading filtered ONJN stats:', error)
      }
    }
    
    loadFilteredStats()
  }, [operators, operatorsSearchTerm, operatorsFilters])

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Filter reports first
  const filteredReports = onjnReports.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredReports.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} elemente?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('onjnReports', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting:', error)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    console.log('Bulk edit for:', selectedItems)
  }
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Filter operators (use loadedOperators for instant filtering)
  const filteredOperators = loadedOperators.filter(op => {
    const matchesSearch = !operatorsSearchTerm || 
      op.serial_number?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
      op.company_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
      op.brand_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
      op.city?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
      op.county?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
      op.slot_address?.toLowerCase().includes(operatorsSearchTerm.toLowerCase())
    
    const matchesCompany = !operatorsFilters.company || op.company_name === operatorsFilters.company
    const matchesBrand = !operatorsFilters.brand || op.brand_name === operatorsFilters.brand
    const matchesCounty = !operatorsFilters.county || op.county === operatorsFilters.county
    const matchesCity = !operatorsFilters.city || op.city === operatorsFilters.city
    const matchesStatus = !operatorsFilters.status || op.status === operatorsFilters.status
    
    return matchesSearch && matchesCompany && matchesBrand && matchesCounty && matchesCity && matchesStatus
  })

  // Pagination for operators
  const totalOperatorsPages = Math.ceil(filteredOperators.length / operatorsPerPage)
  const paginatedOperators = operatorsPerPage === filteredOperators.length 
    ? filteredOperators  // Show all if "Toate" is selected
    : filteredOperators.slice(
        (operatorsPage - 1) * operatorsPerPage,
        operatorsPage * operatorsPerPage
      )

  // Get unique values for filters
  const companies = [...new Set(operators.map(op => op.company_name).filter(Boolean))].sort()
  const brands = [...new Set(operators.map(op => op.brand_name).filter(Boolean))].sort()
  const counties = [...new Set(operators.map(op => op.county).filter(Boolean))].sort()
  const cities = [...new Set(operators.map(op => op.city).filter(Boolean))].sort()
  const statuses = [...new Set(operators.map(op => op.status).filter(Boolean))].sort()

  // Reset page when per page changes
  useEffect(() => {
    setOperatorsPage(1)
  }, [operatorsPerPage])

  const columns = [
    { key: 'id', label: '#', sortable: true },
    { key: 'name', label: 'NUME RAPORT', sortable: true },
    { key: 'type', label: 'TIP', sortable: true },
    { key: 'period', label: 'PERIOADA', sortable: true },
    { key: 'status', label: 'STATUS', sortable: true },
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { key: 'created_at', label: 'DATA CREARE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
      </div>
    )},
    { key: 'actions', label: 'ACȚIUNI', sortable: false }
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sigur vrei să ștergi acest raport ONJN?')) {
      await deleteItem('onjnReports', id)
    }
  }

  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleSave = async (itemData) => {
    if (editingItem) {
      await updateItem('onjnReports', editingItem.id, itemData)
    } else {
      await createItem('onjnReports', itemData)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  // Export functions for ONJN operators
  const exportOperatorsToExcel = async () => {
    try {
      setExporting(true)
      // Load all operators for export (not just the first 1000)
      const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
      const allOperators = await response.json()
      
      // Apply the same filters to all operators
      const filteredAllOperators = allOperators.filter(op => {
        const matchesSearch = !operatorsSearchTerm || 
          op.serial_number?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.company_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.brand_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.city?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.county?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.slot_address?.toLowerCase().includes(operatorsSearchTerm.toLowerCase())
        
        const matchesCompany = !operatorsFilters.company || op.company_name === operatorsFilters.company
        const matchesBrand = !operatorsFilters.brand || op.brand_name === operatorsFilters.brand
        const matchesCounty = !operatorsFilters.county || op.county === operatorsFilters.county
        const matchesCity = !operatorsFilters.city || op.city === operatorsFilters.city
        const matchesStatus = !operatorsFilters.status || op.status === operatorsFilters.status
        
        return matchesSearch && matchesCompany && matchesBrand && matchesCounty && matchesCity && matchesStatus
      })
      
      const data = filteredAllOperators.map(op => ({
        'Serie': op.serial_number || '',
        'Companie': op.company_name || '',
        'Brand': op.brand_name || '',
        'Oraș': op.city || '',
        'Județ': op.county ? op.county.replace(/^JUD[EȚ]UL\s+/i, '') : '',
        'Status': op.status || '',
        'Licență': op.license_number || '',
        'Adresă': op.slot_address || '',
        'Data Autorizare': op.authorization_date ? new Date(op.authorization_date).toLocaleDateString('ro-RO') : '',
        'Data Expirare': op.expiry_date ? new Date(op.expiry_date).toLocaleDateString('ro-RO') : ''
      }))
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Operatori ONJN')
      XLSX.writeFile(wb, `operatori-onjn-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting operators to Excel:', error)
    } finally {
      setExporting(false)
    }
  }

  const exportOperatorsToCSV = async () => {
    try {
      setExporting(true)
      // Load all operators for export (not just the first 1000)
      const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
      const allOperators = await response.json()
      
      // Apply the same filters to all operators
      const filteredAllOperators = allOperators.filter(op => {
        const matchesSearch = !operatorsSearchTerm || 
          op.serial_number?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.company_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.brand_name?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.city?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.county?.toLowerCase().includes(operatorsSearchTerm.toLowerCase()) ||
          op.slot_address?.toLowerCase().includes(operatorsSearchTerm.toLowerCase())
        
        const matchesCompany = !operatorsFilters.company || op.company_name === operatorsFilters.company
        const matchesBrand = !operatorsFilters.brand || op.brand_name === operatorsFilters.brand
        const matchesCounty = !operatorsFilters.county || op.county === operatorsFilters.county
        const matchesCity = !operatorsFilters.city || op.city === operatorsFilters.city
        const matchesStatus = !operatorsFilters.status || op.status === operatorsFilters.status
        
        return matchesSearch && matchesCompany && matchesBrand && matchesCounty && matchesCity && matchesStatus
      })
      
      const headers = ['Serie', 'Companie', 'Brand', 'Oraș', 'Județ', 'Status', 'Licență', 'Adresă', 'Data Autorizare', 'Data Expirare']
      const csvContent = [
        headers.join(','),
        ...filteredAllOperators.map(op => [
          `"${op.serial_number || ''}"`,
          `"${op.company_name || ''}"`,
          `"${op.brand_name || ''}"`,
          `"${op.city || ''}"`,
          `"${op.county || ''}"`,
          `"${op.status || ''}"`,
          `"${op.license_number || ''}"`,
          `"${op.slot_address || ''}"`,
          `"${op.authorization_date ? new Date(op.authorization_date).toLocaleDateString('ro-RO') : ''}"`,
          `"${op.expiry_date ? new Date(op.expiry_date).toLocaleDateString('ro-RO') : ''}"`
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `operatori-onjn-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting operators to CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('onjnreports')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('onjnreports')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">ONJN</h2>
                <p className="text-slate-600">Generează și gestionează rapoartele ONJN</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="onjnreports"
              />
              {showBulkActions && (
                <>
                  <button onClick={handleBulkEdit} className="btn-secondary flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Bulk Edit</span>
                  </button>
                  <button onClick={handleBulkDelete} className="btn-danger flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Bulk Delete</span>
                  </button>
                </>
              )}
              <button
                onClick={() => navigate('/onjn-operators')}
                className="btn-secondary flex items-center space-x-2 mr-2"
              >
                <Building2 className="w-4 h-4" />
                <span>Operatori ONJN</span>
              </button>
              <button
                onClick={() => navigate('/onjn-map')}
                className="btn-secondary flex items-center space-x-2 mr-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Harta ONJN</span>
              </button>
              <button
                onClick={() => navigate('/onjn-analytics')}
                className="btn-secondary flex items-center space-x-2 mr-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics Dashboard</span>
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă Raport</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Aparate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total >= 1000 ? `${(stats.total / 1000).toFixed(1)}k+` : stats.total.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {operatorsFilters.brand === 'CASHPOT' ? 'CASHPOT - În Exploatare' : 'În Exploatare'}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {operatorsFilters.brand === 'CASHPOT' 
                    ? (stats.filteredActive || 0).toLocaleString('ro-RO')
                    : stats.active >= 1000 ? `${(stats.active / 1000).toFixed(1)}k+` : stats.active.toLocaleString('ro-RO')
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Scoși din Funcțiune</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {operatorsFilters.brand === 'CASHPOT' 
                    ? (stats.filteredExpired || 0).toLocaleString('ro-RO')
                    : stats.expired >= 1000 ? `${(stats.expired / 1000).toFixed(1)}k+` : stats.expired.toLocaleString('ro-RO')
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rata Activitate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {operatorsFilters.brand === 'CASHPOT' 
                    ? (stats.filteredTotal > 0 ? ((stats.filteredActive / stats.filteredTotal) * 100).toFixed(1) : 0) + '%'
                    : (stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0) + '%'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Săli</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {operatorsFilters.brand === 'CASHPOT' 
                    ? (() => {
                        const filteredOperators = operators.filter(op => op.brand_name === 'CASHPOT')
                        return new Set(filteredOperators.map(op => op.slot_address).filter(Boolean)).size.toLocaleString('ro-RO')
                      })()
                    : new Set(operators.map(op => op.slot_address).filter(Boolean)).size.toLocaleString('ro-RO')
                  }
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* ONJN Operators Search and Filters */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Filtre Operatori ONJN</h3>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Caută după serie, companie, brand, oraș, județ sau adresă..."
                value={operatorsSearchTerm}
                onChange={(e) => setOperatorsSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white shadow-lg hover:shadow-xl"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <select
                value={operatorsFilters.company}
                onChange={(e) => setOperatorsFilters({ ...operatorsFilters, company: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate companiile</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>

              <select
                value={operatorsFilters.brand}
                onChange={(e) => setOperatorsFilters({ ...operatorsFilters, brand: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate brandurile</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>

              <select
                value={operatorsFilters.county}
                onChange={(e) => setOperatorsFilters({ ...operatorsFilters, county: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate județele</option>
                {counties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>

              <select
                value={operatorsFilters.city}
                onChange={(e) => setOperatorsFilters({ ...operatorsFilters, city: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate orașele</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select
                value={operatorsFilters.status}
                onChange={(e) => setOperatorsFilters({ ...operatorsFilters, status: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate statusurile</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setOperatorsSearchTerm('')
                  setOperatorsFilters({ company: '', brand: '', county: '', city: '', status: '' })
                  setOperatorsPage(1)
                }}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Resetare filtre
              </button>
              
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {filteredOperators.length} operatori găsiți
              </div>
            </div>
          </div>
        </div>


        {/* ONJN Operators Table */}
        {isTableVisible && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Tabel Operatori ONJN
                  {operatorsFilters.brand === 'CASHPOT' && (
                    <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
                      (doar CASHPOT)
                    </span>
                  )}
                </h3>
                
                {/* Load All Brands Button - moved here */}
                {operatorsFilters.brand === 'CASHPOT' && (
                  <button
                    onClick={loadAllOperators}
                    disabled={loadingMore}
                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Se încarcă...</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-3 h-3" />
                        <span>Încarcă toate brandurile</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
              <button
                onClick={() => exportOperatorsToExcel()}
                disabled={exporting}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Excel - Toți operatorii"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Se exportă...' : 'Excel'}</span>
              </button>
              <button
                onClick={() => exportOperatorsToCSV()}
                disabled={exporting}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export CSV - Toți operatorii"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Se exportă...' : 'CSV'}</span>
              </button>
            </div>
          </div>
          {operatorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <span className="ml-2 text-slate-600">Se încarcă operatorii...</span>
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există operatori ONJN</h3>
              <p className="text-slate-500">Datele nu s-au încărcat</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Afișare {paginatedOperators.length} din {filteredOperators.length} operatori ONJN
                {operatorsPerPage === filteredOperators.length && ' (toate)'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Serie</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Companie</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Brand</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Oraș</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Județ</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Adresă</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOperators.map((operator, index) => (
                      <tr key={operator.id || index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {operator.serial_number || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.company_name ? (
                            <button
                              onClick={() => navigate(`/onjn-reports/company/${encodeURIComponent(operator.company_name)}`)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              {operator.company_name}
                            </button>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.brand_name ? (
                            <button
                              onClick={() => navigate(`/onjn-reports/brand/${encodeURIComponent(operator.brand_name)}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
                            >
                              {operator.brand_name}
                            </button>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.city ? (
                            <button
                              onClick={() => navigate(`/onjn-reports/city/${encodeURIComponent(operator.city)}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
                            >
                              {operator.city}
                            </button>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.county ? (
                            <button
                              onClick={() => navigate(`/onjn-reports/county/${encodeURIComponent(operator.county)}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
                            >
                              {operator.county.replace(/^JUD[EȚ]UL\s+/i, '')}
                            </button>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 text-sm">
                          {operator.slot_address ? (
                            <div className="max-w-xs truncate" title={operator.slot_address}>
                              {operator.slot_address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ-]+/gi, '').trim()}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            operator.status === 'În exploatare' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : operator.status === 'Scos din funcțiune'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {operator.status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalOperatorsPages > 1 && operatorsPerPage < filteredOperators.length && (
                <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 px-6 md:px-8 py-4 md:py-6 border-t border-slate-200/50 dark:border-slate-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <span className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-200">Înregistrări:</span>
                    <select 
                      value={operatorsPerPage} 
                      onChange={(e) => setOperatorsPerPage(Number(e.target.value))} 
                      className="border-2 border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-2 text-sm font-medium bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                      <option value={filteredOperators.length}>Toate ({filteredOperators.length})</option>
                    </select>
                    <span className="text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium">
                      {(operatorsPage - 1) * operatorsPerPage + 1}-{Math.min(operatorsPage * operatorsPerPage, filteredOperators.length)} din {filteredOperators.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <button 
                      onClick={() => setOperatorsPage(Math.max(1, operatorsPage - 1))}
                      disabled={operatorsPage === 1}
                      className="px-4 md:px-6 py-2 md:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm md:text-base font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl group text-slate-700 dark:text-slate-200"
                    >
                      <span className="group-hover:-translate-x-1 transition-transform inline-block">Înapoi</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm md:text-base text-slate-600 dark:text-slate-200 font-bold bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl shadow-lg">
                        Pag {operatorsPage}/{totalOperatorsPages}
                      </span>
                    </div>
                    <button 
                      onClick={() => setOperatorsPage(Math.min(totalOperatorsPages, operatorsPage + 1))}
                      disabled={operatorsPage === totalOperatorsPages}
                      className="px-4 md:px-6 py-2 md:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm md:text-base font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl group text-slate-700 dark:text-slate-200"
                    >
                      <span className="group-hover:translate-x-1 transition-transform inline-block">Înainte</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        )}

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Caută rapoarte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white shadow-lg hover:shadow-xl"
              />
            </div>
            <button className="btn-secondary flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Importă</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există rapoarte ONJN</h3>
              <p className="text-slate-500">Adaugă primul raport pentru a începe</p>
            </div>
          ) : (
            <DataTable
              data={filteredReports}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              moduleColor="blue"
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <ONJNReportModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}

export default ONJNReports

