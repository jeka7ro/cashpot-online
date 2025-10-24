import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, 
  MapPin, 
  Activity, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart,
  Search,
  Filter,
  Download,
  Eye,
  ArrowRight,
  Calendar,
  Target,
  Award,
  Globe
} from 'lucide-react'
import * as XLSX from 'xlsx'

const ONJNAnalytics = () => {
  const navigate = useNavigate()
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('brands')
  const [searchTerm, setSearchTerm] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
        const data = await response.json()
        setOperators(data)
      } catch (error) {
        console.error('Error loading ONJN data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate comprehensive statistics
  const calculateStats = () => {
    const stats = {
      brands: {},
      companies: {},
      cities: {},
      counties: {},
      total: operators.length,
      active: operators.filter(op => op.status === 'În exploatare').length,
      expired: operators.filter(op => op.status === 'Scos din funcțiune').length
    }

    operators.forEach(op => {
      // Brands
      if (op.brand_name) {
        if (!stats.brands[op.brand_name]) {
          stats.brands[op.brand_name] = { total: 0, active: 0, expired: 0, companies: new Set(), cities: new Set(), counties: new Set(), locations: new Set() }
        }
        stats.brands[op.brand_name].total++
        if (op.status === 'În exploatare') stats.brands[op.brand_name].active++
        if (op.status === 'Scos din funcțiune') stats.brands[op.brand_name].expired++
        if (op.company_name) stats.brands[op.brand_name].companies.add(op.company_name)
        if (op.city) stats.brands[op.brand_name].cities.add(op.city)
        if (op.county) stats.brands[op.brand_name].counties.add(op.county)
        if (op.slot_address) stats.brands[op.brand_name].locations.add(op.slot_address)
      }

      // Companies
      if (op.company_name) {
        if (!stats.companies[op.company_name]) {
          stats.companies[op.company_name] = { total: 0, active: 0, expired: 0, brands: new Set(), cities: new Set(), counties: new Set(), locations: new Set() }
        }
        stats.companies[op.company_name].total++
        if (op.status === 'În exploatare') stats.companies[op.company_name].active++
        if (op.status === 'Scos din funcțiune') stats.companies[op.company_name].expired++
        if (op.brand_name) stats.companies[op.company_name].brands.add(op.brand_name)
        if (op.city) stats.companies[op.company_name].cities.add(op.city)
        if (op.county) stats.companies[op.company_name].counties.add(op.county)
        if (op.slot_address) stats.companies[op.company_name].locations.add(op.slot_address)
      }

      // Cities
      if (op.city) {
        if (!stats.cities[op.city]) {
          stats.cities[op.city] = { total: 0, active: 0, expired: 0, brands: new Set(), companies: new Set(), county: op.county, locations: new Set() }
        }
        stats.cities[op.city].total++
        if (op.status === 'În exploatare') stats.cities[op.city].active++
        if (op.status === 'Scos din funcțiune') stats.cities[op.city].expired++
        if (op.brand_name) stats.cities[op.city].brands.add(op.brand_name)
        if (op.company_name) stats.cities[op.city].companies.add(op.company_name)
        if (op.slot_address) stats.cities[op.city].locations.add(op.slot_address)
      }

      // Counties
      if (op.county) {
        if (!stats.counties[op.county]) {
          stats.counties[op.county] = { total: 0, active: 0, expired: 0, brands: new Set(), companies: new Set(), cities: new Set(), locations: new Set() }
        }
        stats.counties[op.county].total++
        if (op.status === 'În exploatare') stats.counties[op.county].active++
        if (op.status === 'Scos din funcțiune') stats.counties[op.county].expired++
        if (op.brand_name) stats.counties[op.county].brands.add(op.brand_name)
        if (op.company_name) stats.counties[op.county].companies.add(op.company_name)
        if (op.city) stats.counties[op.county].cities.add(op.city)
        if (op.slot_address) stats.counties[op.county].locations.add(op.slot_address)
      }
    })

    // Convert Sets to counts
    Object.keys(stats.brands).forEach(brand => {
      stats.brands[brand].companies = stats.brands[brand].companies.size
      stats.brands[brand].cities = stats.brands[brand].cities.size
      stats.brands[brand].counties = stats.brands[brand].counties.size
      stats.brands[brand].locations = stats.brands[brand].locations.size
    })

    Object.keys(stats.companies).forEach(company => {
      stats.companies[company].brands = stats.companies[company].brands.size
      stats.companies[company].cities = stats.companies[company].cities.size
      stats.companies[company].counties = stats.companies[company].counties.size
      stats.companies[company].locations = stats.companies[company].locations.size
    })

    Object.keys(stats.cities).forEach(city => {
      stats.cities[city].brands = stats.cities[city].brands.size
      stats.cities[city].companies = stats.cities[city].companies.size
      stats.cities[city].locations = stats.cities[city].locations.size
    })

    Object.keys(stats.counties).forEach(county => {
      stats.counties[county].brands = stats.counties[county].brands.size
      stats.counties[county].companies = stats.counties[county].companies.size
      stats.counties[county].cities = stats.counties[county].cities.size
      stats.counties[county].locations = stats.counties[county].locations.size
    })

    return stats
  }

  const stats = calculateStats()

  // Get current category data
  const getCurrentData = () => {
    const data = stats[selectedCategory]
    if (!data) return []

    return Object.entries(data)
      .filter(([key]) => key !== 'total' && key !== 'active' && key !== 'expired')
      .map(([name, data]) => ({ name, ...data }))
      .filter(item => 
        !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.total - a.total)
  }

  const currentData = getCurrentData()

  // Export functions
  const exportToExcel = async () => {
    try {
      setExporting(true)
      const data = currentData.map(item => ({
        'Nume': item.name,
        'Total Aparate': item.total,
        'În Exploatare': item.active,
        'Scoși din Funcțiune': item.expired,
        'Branduri Unice': item.brands || 0,
        'Companii Unice': item.companies || 0,
        'Orașe Unice': item.cities || 0,
        'Județe Unice': item.counties || 0,
        'Săli Unice': item.locations || 0,
        'Județ': item.county || ''
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `Analytics ${selectedCategory}`)
      XLSX.writeFile(wb, `onjn-analytics-${selectedCategory}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setExporting(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'brands': return <Award className="w-5 h-5" />
      case 'companies': return <Building2 className="w-5 h-5" />
      case 'cities': return <MapPin className="w-5 h-5" />
      case 'counties': return <Globe className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'brands': return 'Branduri'
      case 'companies': return 'Companii'
      case 'cities': return 'Orașe'
      case 'counties': return 'Județe'
      default: return 'Categorii'
    }
  }

  const getNavigationPath = (category, name) => {
    switch (category) {
      case 'brands': return `/onjn-reports/brand/${encodeURIComponent(name)}`
      case 'cities': return `/onjn-reports/city/${encodeURIComponent(name)}`
      case 'counties': return `/onjn-reports/county/${encodeURIComponent(name)}`
      default: return '#'
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
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
                <span>ONJN Analytics Dashboard</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Statistici centralizate și inteligente pentru branduri, companii, orașe și județe
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToExcel}
                disabled={exporting}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Excel"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Se exportă...' : 'Export'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Săli Unice</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {new Set(operators.map(op => op.slot_address).filter(Boolean)).size.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Selectează Categoria</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'brands', label: 'Branduri', icon: <Award className="w-5 h-5" />, count: Object.keys(stats.brands).length },
              { key: 'companies', label: 'Companii', icon: <Building2 className="w-5 h-5" />, count: Object.keys(stats.companies).length },
              { key: 'cities', label: 'Orașe', icon: <MapPin className="w-5 h-5" />, count: Object.keys(stats.cities).length },
              { key: 'counties', label: 'Județe', icon: <Globe className="w-5 h-5" />, count: Object.keys(stats.counties).length }
            ].map(category => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCategory === category.key
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {category.icon}
                  <div className="text-left">
                    <p className="font-medium">{category.label}</p>
                    <p className="text-sm opacity-75">{category.count} {category.label.toLowerCase()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
            Analiză {getCategoryTitle(selectedCategory)}
          </h3>
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder={`Caută ${getCategoryTitle(selectedCategory).toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white shadow-lg hover:shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              {getCategoryIcon(selectedCategory)}
              <span>{getCategoryTitle(selectedCategory)} - Top Performers</span>
            </h3>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {currentData.length} {getCategoryTitle(selectedCategory).toLowerCase()} găsite
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentData.slice(0, 12).map((item, index) => (
              <div key={item.name} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                      {getCategoryIcon(selectedCategory)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                        {item.name}
                      </h4>
                      {item.county && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Județ: {item.county}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {item.total.toLocaleString('ro-RO')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">aparate</p>
                    <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-1">
                      {item.locations.toLocaleString('ro-RO')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">săli</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {item.active.toLocaleString('ro-RO')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">În exploatare</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {item.expired.toLocaleString('ro-RO')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Scoși din funcțiune</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  {item.brands && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {item.brands}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">branduri</p>
                    </div>
                  )}
                  {item.companies && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {item.companies}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">companii</p>
                    </div>
                  )}
                  {item.cities && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {item.cities}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">orașe</p>
                    </div>
                  )}
                  {item.locations && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {item.locations}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">săli</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Rata activitate: {item.total > 0 ? ((item.active / item.total) * 100).toFixed(1) : 0}%
                  </div>
                  {(selectedCategory === 'brands' || selectedCategory === 'cities' || selectedCategory === 'counties') && (
                    <button
                      onClick={() => navigate(getNavigationPath(selectedCategory, item.name))}
                      className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      <span>Vezi detalii</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {currentData.length > 12 && (
            <div className="text-center mt-6">
              <p className="text-slate-500 dark:text-slate-400">
                Afișate primele 12 din {currentData.length} {getCategoryTitle(selectedCategory).toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNAnalytics
