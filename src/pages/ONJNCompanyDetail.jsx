import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import { ArrowLeft, Building2, MapPin, Users, Search, Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'

const ONJNCompanyDetail = () => {
  const { companyName } = useParams()
  const navigate = useNavigate()
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('În exploatare')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
        const data = await response.json()
        
        // Filtrează operatorii pentru compania specificată
        const companyOperators = data.filter(op => 
          op.company_name === decodeURIComponent(companyName)
        )
        setOperators(companyOperators)
      } catch (error) {
        console.error('Error loading company data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [companyName])

  // Filtrează operatorii
  const filteredOperators = operators.filter(op => {
    const matchesSearch = !searchTerm || 
      op.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.county?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.slot_address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !selectedStatus || op.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  // Calculează statisticile
  const stats = {
    total: filteredOperators.length,
    active: filteredOperators.filter(op => op.status === 'În exploatare').length,
    expired: filteredOperators.filter(op => op.status === 'Scos din funcțiune').length,
    uniqueLocations: new Set(filteredOperators.map(op => op.slot_address).filter(Boolean)).size,
    byBrand: {},
    byCounty: {},
    byCity: {},
    byCountyLocations: {},
    byCityLocations: {}
  }

  // Calculează statistici pe brand (slots și locații unice)
  const brandSlots = {}
  const brandLocations = {}
  filteredOperators.forEach(op => {
    if (op.brand_name) {
      brandSlots[op.brand_name] = (brandSlots[op.brand_name] || 0) + 1
      if (op.slot_address) {
        brandLocations[op.brand_name] = brandLocations[op.brand_name] || new Set()
        brandLocations[op.brand_name].add(op.slot_address)
      }
    }
  })
  
  Object.keys(brandSlots).forEach(brand => {
    stats.byBrand[brand] = brandSlots[brand]
    stats.byBrandLocations = stats.byBrandLocations || {}
    stats.byBrandLocations[brand] = brandLocations[brand]?.size || 0
  })

  // Calculează statistici pe județ (slots și locații unice)
  const countySlots = {}
  const countyLocations = {}
  filteredOperators.forEach(op => {
    if (op.county) {
      countySlots[op.county] = (countySlots[op.county] || 0) + 1
      if (op.slot_address) {
        countyLocations[op.county] = countyLocations[op.county] || new Set()
        countyLocations[op.county].add(op.slot_address)
      }
    }
  })
  
  Object.keys(countySlots).forEach(county => {
    stats.byCounty[county] = countySlots[county]
    stats.byCountyLocations[county] = countyLocations[county]?.size || 0
  })

  // Calculează statistici pe oraș (slots și locații unice)
  const citySlots = {}
  const cityLocations = {}
  filteredOperators.forEach(op => {
    if (op.city) {
      citySlots[op.city] = (citySlots[op.city] || 0) + 1
      if (op.slot_address) {
        cityLocations[op.city] = cityLocations[op.city] || new Set()
        cityLocations[op.city].add(op.slot_address)
      }
    }
  })
  
  Object.keys(citySlots).forEach(city => {
    stats.byCity[city] = citySlots[city]
    stats.byCityLocations[city] = cityLocations[city]?.size || 0
  })

  // Paginare
  const totalPages = Math.ceil(filteredOperators.length / perPage)
  const paginatedOperators = filteredOperators.slice(
    (page - 1) * perPage,
    page * perPage
  )

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedStatus, perPage])

  // Export Excel
  const exportToExcel = async () => {
    try {
      setExporting(true)
      const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
      const allOperators = await response.json()
      const companyOperators = allOperators.filter(op => 
        op.company_name === decodeURIComponent(companyName)
      )
      
      const filteredData = companyOperators.filter(op => {
        const matchesStatus = !selectedStatus || op.status === selectedStatus
        return matchesStatus
      })

      const data = filteredData.map(op => ({
        'Serie': op.slot_series || '',
        'Brand': op.brand_name || '',
        'Oraș': op.city || '',
        'Județ': op.county || '',
        'Status': op.status || '',
        'Licență': op.license_number || '',
        'Adresă': op.slot_address ? op.slot_address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ-]+/gi, '').trim() : '',
        'Data Autorizare': op.authorization_date ? new Date(op.authorization_date).toLocaleDateString('ro-RO') : '',
        'Data Expirare': op.expiry_date ? new Date(op.expiry_date).toLocaleDateString('ro-RO') : ''
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Operatori')
      
      XLSX.writeFile(wb, `operatori_${decodeURIComponent(companyName).replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setExporting(false)
    }
  }

  // Export CSV
  const exportToCSV = async () => {
    try {
      setExporting(true)
      const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
      const allOperators = await response.json()
      const companyOperators = allOperators.filter(op => 
        op.company_name === decodeURIComponent(companyName)
      )
      
      const filteredData = companyOperators.filter(op => {
        const matchesStatus = !selectedStatus || op.status === selectedStatus
        return matchesStatus
      })

      const headers = ['Serie', 'Brand', 'Oraș', 'Județ', 'Status', 'Licență', 'Adresă', 'Data Autorizare', 'Data Expirare']
      const csvContent = [
        headers.join(','),
        ...filteredData.map(op => [
          `"${op.slot_series || ''}"`,
          `"${op.brand_name || ''}"`,
          `"${op.city || ''}"`,
          `"${op.county || ''}"`,
          `"${op.status || ''}"`,
          `"${op.license_number || ''}"`,
          `"${op.slot_address ? op.slot_address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ-]+/gi, '').trim() : ''}"`,
          `"${op.authorization_date ? new Date(op.authorization_date).toLocaleDateString('ro-RO') : ''}"`,
          `"${op.expiry_date ? new Date(op.expiry_date).toLocaleDateString('ro-RO') : ''}"`
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `operatori_${decodeURIComponent(companyName).replace(/[^a-zA-Z0-9]/g, '_')}.csv`
      link.click()
    } catch (error) {
      console.error('Error exporting to CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      key: 'slot_series',
      label: 'SERIE',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div className="text-slate-700 dark:text-slate-300 font-mono">{item.slot_series || '-'}</div>
        </div>
      )
    },
    {
      key: 'brand_name',
      label: 'BRAND',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div 
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
            onClick={() => navigate(`/onjn-reports/brand/${encodeURIComponent(item.brand_name)}`)}
          >
            {item.brand_name || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'city',
      label: 'ORAȘ',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div 
            className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
            onClick={() => navigate(`/onjn-reports/city/${encodeURIComponent(item.city)}`)}
          >
            {item.city || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'county',
      label: 'JUDEȚ',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div 
            className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
            onClick={() => navigate(`/onjn-reports/county/${encodeURIComponent(item.county)}`)}
          >
            {item.county ? item.county.replace(/^JUD[EȚ]UL\s+/i, '') : '-'}
          </div>
        </div>
      )
    },
    {
      key: 'slot_address',
      label: 'ADRESĂ SLOT',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div className="text-slate-700 dark:text-slate-300">{item.slot_address ? item.slot_address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ-]+/gi, '').trim() : '-'}</div>
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
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.status === 'În exploatare' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {item.status || '-'}
          </span>
        </div>
      )
    },
    {
      key: 'license_number',
      label: 'LICENȚĂ',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          <div className="text-slate-700 dark:text-slate-300 font-mono">{item.license_number || '-'}</div>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              onClick={() => navigate('/onjn-reports')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg shadow-blue-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Companie: {decodeURIComponent(companyName)}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">Detalii complete pentru compania {decodeURIComponent(companyName)}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="btn-primary flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Se exportă...' : 'Excel'}</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={exporting}
              className="btn-secondary flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>{exporting ? 'Se exportă...' : 'CSV'}</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Aparate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total.toLocaleString('ro-RO')}
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">În Exploatare</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.active.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Scoși din Funcțiune</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.expired.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rata Activitate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Săli</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.uniqueLocations.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics by Brand */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Statistici pe Branduri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byBrand)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 12)
              .map(([brand, count]) => (
                <div key={brand} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{brand}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{count.toLocaleString('ro-RO')} aparate</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {(stats.byBrandLocations[brand] || 0).toLocaleString('ro-RO')} săli
                      </p>
                    </div>
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Statistics by County */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Statistici pe Județe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byCounty)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 12)
              .map(([county, count]) => (
                <div key={county} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{county.replace(/^JUD[EȚ]UL\s+/i, '')}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{count.toLocaleString('ro-RO')} aparate</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {(stats.byCountyLocations[county] || 0).toLocaleString('ro-RO')} săli
                      </p>
                    </div>
                    <MapPin className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Statistics by City */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Statistici pe Orașe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byCity)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 12)
              .map(([city, count]) => (
                <div key={city} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{city}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{count.toLocaleString('ro-RO')} aparate</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {(stats.byCityLocations[city] || 0).toLocaleString('ro-RO')} săli
                      </p>
                    </div>
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Căutare și Filtre</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Căutare
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Caută după brand, oraș, județ, adresă..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm hover:shadow-md transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toate statusurile</option>
                <option value="În exploatare">În exploatare</option>
                <option value="Scos din funcțiune">Scos din funcțiune</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Operatori</h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {filteredOperators.length} operatori găsiți
              </div>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={filteredOperators.length}>Toate</option>
              </select>
            </div>
          </div>

          <DataTable
            data={paginatedOperators}
            columns={columns}
            loading={loading}
            itemsPerPage={perPage}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Afișare {((page - 1) * perPage) + 1} - {Math.min(page * perPage, filteredOperators.length)} din {filteredOperators.length} operatori
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                  Anterior
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 border rounded text-sm ${
                          page === pageNum
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                  Următor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNCompanyDetail
