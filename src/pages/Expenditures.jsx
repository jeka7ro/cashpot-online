import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { DollarSign, RefreshCw, Settings, Download, FileSpreadsheet, FileText, Filter, Calendar, Building2, Briefcase } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ExpendituresMappingModal from '../components/modals/ExpendituresMappingModal'

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
  
  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]  // Dec 31
  })
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [expenditureTypeFilter, setExpenditureTypeFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
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
      return { matrix: [], locations: [], expenditureTypes: [] }
    }
    
    // Apply filters
    let filteredData = expendituresData
    
    if (departmentFilter !== 'all') {
      filteredData = filteredData.filter(item => item.department_name === departmentFilter)
    }
    
    if (expenditureTypeFilter !== 'all') {
      filteredData = filteredData.filter(item => item.expenditure_type === expenditureTypeFilter)
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
    
    return { matrix, locations, expenditureTypes, totalsRow }
  }
  
  const { matrix, locations, totalsRow } = processDataToMatrix()
  
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
  const uniqueDepartments = [...new Set(expendituresData.map(item => item.department_name))].filter(Boolean).sort()
  
  // Get unique expenditure types for filter
  const uniqueExpenditureTypes = [...new Set(expendituresData.map(item => item.expenditure_type))].filter(Boolean).sort()
  
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
              <DollarSign className="w-8 h-8 mr-3 text-green-500" />
              Cheltuieli
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Monitorizare cheltuieli per locație din serverul extern
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowMappingModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Mapping Locații</span>
            </button>
            
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizare...' : 'Sincronizare Date'}</span>
            </button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cheltuieli</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(totalsRow?.total || 0)} RON
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl shadow-lg">
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
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Categorii</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{matrix.length}</p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-2xl">
                <Briefcase className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Înregistrări</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{expendituresData.length}</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-2xl">
                <FileText className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-500" />
              Filtre
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showFilters ? 'Ascunde' : 'Arată'} filtre avansate
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Început
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Sfârșit
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="input-field"
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
                  <option value="all">Toate Departamentele</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              {/* Expenditure Type Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <DollarSign className="w-4 h-4 inline mr-1" />
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
          )}
          
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
        
        {/* Matrix Table */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Cheltuieli per Locație
          </h2>
          
          {matrix.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900/40 z-10">
                      Categorie Cheltuială
                    </th>
                    {locations.map(loc => (
                      <th
                        key={loc}
                        className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                      >
                        {loc}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {matrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-800">
                        {row.expenditure_type}
                      </td>
                      {locations.map(loc => (
                        <td
                          key={loc}
                          className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300"
                        >
                          {formatCurrency(row[loc])}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals Row */}
                  {totalsRow && (
                    <tr className="bg-slate-100 dark:bg-slate-900/60 font-bold">
                      <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-100 dark:bg-slate-900/60">
                        TOTAL
                      </td>
                      {locations.map(loc => (
                        <td
                          key={loc}
                          className="px-4 py-4 text-sm text-right text-slate-900 dark:text-slate-100"
                        >
                          {formatCurrency(totalsRow[loc])}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-sm text-right font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                        {formatCurrency(totalsRow.total)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
    </Layout>
  )
}

export default Expenditures

