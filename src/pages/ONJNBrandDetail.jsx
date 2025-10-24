import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Activity, Users, Calendar, Download, Search } from 'lucide-react'
import * as XLSX from 'xlsx'

const ONJNBrandDetail = () => {
  const { brandName } = useParams()
  const navigate = useNavigate()
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCounty, setSelectedCounty] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('În exploatare') // Default filter
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  useEffect(() => {
    const loadBrandData = async () => {
      try {
        setLoading(true)
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
        const allOperators = await response.json()
        
        // Filter operators by brand
        const brandOperators = allOperators.filter(op => op.brand_name === decodeURIComponent(brandName))
        setOperators(brandOperators)
      } catch (error) {
        console.error('Error loading brand data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBrandData()
  }, [brandName])

  // Filter operators based on search and filters
  const filteredOperators = operators.filter(op => {
    const matchesSearch = !searchTerm || 
      op.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.county?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.slot_address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCounty = !selectedCounty || op.county === selectedCounty
    const matchesCity = !selectedCity || op.city === selectedCity
    
    return matchesSearch && matchesCounty && matchesCity
  })

  // Calculate statistics
  const stats = {
    total: filteredOperators.length,
    active: filteredOperators.filter(op => op.status === 'În exploatare').length,
    expired: filteredOperators.filter(op => op.status === 'Scos din funcțiune').length,
    uniqueLocations: new Set(filteredOperators.map(op => op.slot_address).filter(Boolean)).size,
    byCounty: {},
    byCountyLocations: {},
    byCity: {},
    byCityLocations: {}
  }

  // Calculate by county (slots and unique locations)
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
  
  // Convert to stats format
  Object.keys(countySlots).forEach(county => {
    stats.byCounty[county] = countySlots[county]
    stats.byCountyLocations[county] = countyLocations[county]?.size || 0
  })

  // Calculate by city (slots and unique locations)
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
  
  // Convert to stats format
  Object.keys(citySlots).forEach(city => {
    stats.byCity[city] = citySlots[city]
    stats.byCityLocations[city] = cityLocations[city]?.size || 0
  })

  // Get unique values for filters
  const counties = [...new Set(operators.map(op => op.county).filter(Boolean))].sort()
  const cities = [...new Set(operators.map(op => op.city).filter(Boolean))].sort()

  // Export functions
  const exportToExcel = async () => {
    try {
      setExporting(true)
      const data = filteredOperators.map(op => ({
        'Serie': op.serial_number || '',
        'Companie': op.company_name || '',
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
      XLSX.utils.book_append_sheet(wb, ws, `Brand ${decodeURIComponent(brandName)}`)
      XLSX.writeFile(wb, `brand-${decodeURIComponent(brandName)}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setExporting(false)
    }
  }

  const exportToCSV = async () => {
    try {
      setExporting(true)
      const headers = ['Serie', 'Companie', 'Brand', 'Oraș', 'Județ', 'Status', 'Licență', 'Adresă', 'Data Autorizare', 'Data Expirare']
      const csvContent = [
        headers.join(','),
        ...filteredOperators.map(op => [
          `"${op.serial_number || ''}"`,
          `"${op.company_name || ''}"`,
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
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `brand-${decodeURIComponent(brandName)}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-2 text-slate-600">Se încarcă datele...</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/onjn-reports')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="flex items-center space-x-3">
                {decodeURIComponent(brandName).toLowerCase() === 'cashpot' ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-xl shadow-orange-500/30 ring-2 ring-orange-200/50">
                    <span className="text-white font-bold text-lg">C</span>
                  </div>
                ) : (
                  <>
                    <img 
                      src={`https://logo.clearbit.com/${decodeURIComponent(brandName).toLowerCase().replace(/\s+/g, '')}.ro`}
                      alt={decodeURIComponent(brandName)}
                      className="w-12 h-12 rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl shadow-lg shadow-purple-500/25" style={{display: 'none'}}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  </>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Brand: {decodeURIComponent(brandName)}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Detalii complete pentru brandul {decodeURIComponent(brandName)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToExcel}
                disabled={exporting}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Excel"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Se exportă...' : 'Excel'}</span>
              </button>
              <button
                onClick={exportToCSV}
                disabled={exporting}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Se exportă...' : 'CSV'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Filtre și Căutare</h3>
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Caută după serie, companie, oraș, județ sau adresă..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white shadow-lg hover:shadow-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate județele</option>
                {counties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Toate orașele</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Lista Aparatelor</h3>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {filteredOperators.length} aparate găsite
            </div>
          </div>
          
          {filteredOperators.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există aparate</h3>
              <p className="text-slate-500">Nu s-au găsit aparate pentru criteriile selectate</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Serie</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Companie</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Oraș</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Județ</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Adresă</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperators.map((operator, index) => (
                    <tr key={operator.id || index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-mono text-sm">
                        {operator.serial_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                        {operator.company_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                        {operator.city || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                        {operator.county ? operator.county.replace(/^JUD[EȚ]UL\s+/i, '') : '-'}
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
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNBrandDetail
