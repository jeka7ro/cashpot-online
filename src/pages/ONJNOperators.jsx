import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { Building2, RefreshCw, Search, ExternalLink, Calendar, MapPin, FileCheck, TrendingUp, AlertCircle } from 'lucide-react'
import DataTable from '../components/DataTable'
import { toast } from 'react-hot-toast'
import ONJNStatsWidget from '../components/ONJNStatsWidget'
import ONJNCitiesWidget from '../components/ONJNCitiesWidget'
import ONJNBrandsWidget from '../components/ONJNBrandsWidget'
import ONJNMapWidget from '../components/ONJNMapWidget'

const ONJNOperators = () => {
  const [operators, setOperators] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    company: '',
    brand: '',
    county: '',
    status: '',
    license: ''
  })

  // Load data
  useEffect(() => {
    loadData()
    loadStats()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/onjn-operators')
      setOperators(response.data)
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

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      toast.loading('Sincronizare ONJN în curs... Poate dura 8-10 minute pentru TOȚI operatorii.', { id: 'refresh' })
      
      // Send request with no companyId filter to get ALL operators
      // maxPages: 500 = ~25,000 slots (limit to avoid overload)
      const response = await axios.post('/api/onjn-operators/refresh', {
        companyId: null,  // null = ALL operators
        maxPages: 500     // Limit to 500 pages (~25,000 slots)
      })
      
      toast.success(
        `✅ Sincronizare completă!\n${response.data.scraped.toLocaleString('ro-RO')} sloturi scanate\n${response.data.inserted} adăugate, ${response.data.updated} actualizate`,
        { id: 'refresh', duration: 5000 }
      )
      
      // Reload data
      await loadData()
      await loadStats()
    } catch (error) {
      console.error('Error refreshing:', error)
      toast.error('Eroare la sincronizarea ONJN!', { id: 'refresh' })
    } finally {
      setRefreshing(false)
    }
  }

  // Get unique values for filters
  const companies = [...new Set(operators.map(op => op.company_name).filter(Boolean))].sort()
  const brands = [...new Set(operators.map(op => op.brand_name).filter(Boolean))].sort()
  const counties = [...new Set(operators.map(op => op.county).filter(Boolean))].sort()
  const licenses = [...new Set(operators.map(op => op.license_number).filter(Boolean))].sort()

  // Filter data
  const filteredOperators = operators.filter(op => {
    const matchesSearch = !searchTerm || 
      op.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.slot_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.city?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCompany = !filters.company || op.company_name === filters.company
    const matchesBrand = !filters.brand || op.brand_name === filters.brand
    const matchesCounty = !filters.county || op.county === filters.county
    const matchesStatus = !filters.status || op.status === filters.status
    const matchesLicense = !filters.license || op.license_number === filters.license
    
    return matchesSearch && matchesCompany && matchesBrand && matchesCounty && matchesStatus && matchesLicense
  })

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
      render: (item) => (
        <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
          {item.brand_name || '-'}
        </div>
      )
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
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Sincronizare...' : 'Refresh ONJN'}</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Sloturi</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.total.toLocaleString('ro-RO')}
                  </p>
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
                    {stats.byStatus.find(s => s.status === 'În exploatare')?.count || 0}
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
                  <p className="text-sm text-slate-600 dark:text-slate-400">Expirate</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.expired}
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
                  <p className="text-sm text-slate-600 dark:text-slate-400">Expiră în 30 zile</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.expiringSoon}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <ONJNStatsWidget />
          <ONJNCitiesWidget />
          <ONJNBrandsWidget />
          <ONJNMapWidget />
        </div>

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
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNOperators

