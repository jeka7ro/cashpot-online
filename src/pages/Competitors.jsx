import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Users, MapPin, Building2, Search, Filter, RefreshCw, Map, Eye } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Competitors = () => {
  const navigate = useNavigate()
  const [competitors, setCompetitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    city: 'all',
    brand: 'all',
    search: ''
  })

  useEffect(() => {
    loadCompetitors()
  }, [])

  const loadCompetitors = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/competitors')
      
      if (response.data.success) {
        console.log('✅ Loaded competitors:', response.data.total)
        setCompetitors(response.data.competitors || [])
      }
    } catch (error) {
      console.error('Error loading competitors:', error)
      toast.error('❌ Eroare la încărcarea competitorilor')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    toast.loading('Reîncărcarea competitorilor...', { id: 'refresh' })
    await loadCompetitors()
    toast.success('✅ Competitori reîncărcați!', { id: 'refresh' })
  }

  const handleSyncAll = async () => {
    try {
      toast.loading('Sincronizare competitori pentru TOATE locațiile...', { id: 'sync-all' })
      
      // Fetch all locations first
      const locationsResponse = await axios.get('/api/locations')
      const locations = locationsResponse.data
      
      console.log(`🔄 Syncing competitors pentru ${locations.length} locații...`)
      
      let successCount = 0
      let failCount = 0
      
      // Sync each location (sequential to avoid rate limiting)
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i]
        
        try {
          console.log(`   ${i+1}/${locations.length}: Syncing ${loc.name}...`)
          await axios.post(`/api/locations/${loc.id}/sync-competitors`)
          successCount++
          toast.loading(`Sincronizare: ${successCount}/${locations.length} locații...`, { id: 'sync-all' })
        } catch (error) {
          console.error(`   ❌ Failed for ${loc.name}:`, error.message)
          failCount++
        }
        
        // Small delay between requests (avoid overwhelming server)
        if (i < locations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      console.log(`✅ Sync complete: ${successCount} success, ${failCount} failed`)
      
      if (successCount > 0) {
        toast.success(`✅ Sincronizat ${successCount} locații! Reîncărcare...`, { id: 'sync-all' })
        // Reload competitors after sync
        setTimeout(() => {
          loadCompetitors()
        }, 1500)
      } else {
        toast.error(`❌ Sincronizare eșuată pentru toate locațiile!`, { id: 'sync-all' })
      }
    } catch (error) {
      console.error('Error syncing all:', error)
      toast.error(`❌ ${error.message}`, { id: 'sync-all' })
    }
  }

  // Filter competitors
  const filteredCompetitors = competitors.filter(comp => {
    const matchCity = filters.city === 'all' || comp.city === filters.city
    const matchBrand = filters.brand === 'all' || comp.brand === filters.brand
    const matchSearch = filters.search === '' || 
      comp.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      comp.operator?.toLowerCase().includes(filters.search.toLowerCase()) ||
      comp.address?.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchCity && matchBrand && matchSearch
  })

  // Get unique cities and brands for filters
  const uniqueCities = [...new Set(competitors.map(c => c.city))].sort()
  const uniqueBrands = [...new Set(competitors.map(c => c.brand))].sort()

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <Users className="w-8 h-8 mr-3 text-red-500" />
              Concurență
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Toate sălile concurente din România
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {competitors.length === 0 && (
              <button
                onClick={handleSyncAll}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Sincronizează Tot</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Reîncarcă</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Competitori</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {filteredCompetitors.length}
                </p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-2xl">
                <Users className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Orașe</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {uniqueCities.length}
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Branduri</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {uniqueBrands.length}
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-2xl">
                <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Locații CASHPOT</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  {[...new Set(competitors.map(c => c.location_id))].length}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl">
                <Map className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Filtrare</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Search className="w-4 h-4 inline mr-2" />
                Căutare
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Nume, brand, adresă..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 inline mr-2" />
                Oraș
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="all">Toate orașele ({uniqueCities.length})</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 inline mr-2" />
                Brand
              </label>
              <select
                value={filters.brand}
                onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="all">Toate brandurile ({uniqueBrands.length})</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Competitors Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <Users className="w-6 h-6 mr-2 text-red-500" />
              Competitori ({filteredCompetitors.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Se încarcă competitorii...</p>
            </div>
          ) : filteredCompetitors.length === 0 && competitors.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg font-bold">Nu există competitori sincronizați</p>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                Click pe butonul verde "Sincronizează Tot" pentru a aduce competitorii din ONJN
              </p>
              <button
                onClick={handleSyncAll}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Sincronizează Tot (5 locații)</span>
              </button>
              <p className="text-xs text-slate-400 mt-4">
                ⏱️ Timp estimat: ~30-60 secunde (5 locații × 5-10s fiecare)
              </p>
            </div>
          ) : filteredCompetitors.length === 0 ? (
            <div className="p-12 text-center">
              <Filter className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg">Niciun competitor nu corespunde filtrelor</p>
              <p className="text-sm text-slate-500 mt-2">
                Încearcă să modifici filtrele sau să ștergi căutarea
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Logo / Nume
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Oraș / Județ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Adresă
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Locație CASHPOT
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredCompetitors.map((comp, index) => (
                    <tr 
                      key={index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-3xl" style={{ color: comp.logo_color }}>
                            {comp.logo || '🏢'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {comp.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {comp.operator}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {comp.brand}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {comp.city}
                          </div>
                          <div className="text-slate-500">
                            {comp.county}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="max-w-xs truncate" title={comp.address}>
                          {comp.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/locations/${comp.location_id}`)}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>{comp.location_name}</span>
                        </button>
                        <div className="text-xs text-slate-500 mt-1">
                          {comp.last_updated && `Actualizat: ${new Date(comp.last_updated).toLocaleDateString('ro-RO')}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/locations/${comp.location_id}#map`)}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-2"
                          title="Vezi pe hartă"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">Vezi pe hartă</span>
                        </button>
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

export default Competitors

