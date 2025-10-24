import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Building2, Users, Filter, Search } from 'lucide-react'

const ONJNMap = () => {
  const navigate = useNavigate()
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    county: '',
    brand: '',
    city: ''
  })
  const [selectedLocation, setSelectedLocation] = useState(null)

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

  // Filtrează operatorii
  const filteredOperators = operators.filter(op => {
    const matchesCounty = !filters.county || op.county === filters.county
    const matchesBrand = !filters.brand || op.brand_name === filters.brand
    const matchesCity = !filters.city || op.city === filters.city
    return matchesCounty && matchesBrand && matchesCity
  })

  // Grupează operatorii pe adrese unice
  const uniqueLocations = filteredOperators.reduce((acc, op) => {
    if (op.slot_address) {
      const key = `${op.slot_address}-${op.city}-${op.county}`
      if (!acc[key]) {
        acc[key] = {
          address: op.slot_address,
          city: op.city,
          county: op.county,
          operators: [],
          totalSlots: 0,
          activeSlots: 0,
          brands: new Set(),
          companies: new Set()
        }
      }
      acc[key].operators.push(op)
      acc[key].totalSlots++
      if (op.status === 'În exploatare') acc[key].activeSlots++
      if (op.brand_name) acc[key].brands.add(op.brand_name)
      if (op.company_name) acc[key].companies.add(op.company_name)
    }
    return acc
  }, {})

  // Coordonate aproximative pentru orașe (pentru demo)
  const getCoordinates = (city, county) => {
    const cityCoordinates = {
      'BUCUREȘTI': [44.4268, 26.1025],
      'CLUJ-NAPOCA': [46.7712, 23.6236],
      'TIMIȘOARA': [45.7472, 21.2087],
      'IAȘI': [47.1585, 27.6014],
      'CONSTANȚA': [44.1733, 28.6383],
      'CRAIOVA': [44.3199, 23.7967],
      'GALAȚI': [45.4353, 28.0080],
      'PLOIEȘTI': [44.9419, 26.0225],
      'BRAȘOV': [45.6427, 25.5887],
      'BRĂILA': [45.2667, 27.9833]
    }
    
    return cityCoordinates[city?.toUpperCase()] || [45.9432, 24.9668] // Centrul României
  }

  // Obține opțiunile pentru filtre
  const getFilterOptions = (field) => {
    const values = [...new Set(operators.map(op => op[field]).filter(Boolean))]
    return values.sort()
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
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg shadow-green-500/25">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Harta ONJN</h1>
                <p className="text-slate-600 dark:text-slate-400">Locațiile sălilor din România</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtre */}
        <div className="card p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Filtre</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Județ
              </label>
              <select
                value={filters.county}
                onChange={(e) => setFilters(prev => ({ ...prev, county: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toate județele</option>
                {getFilterOptions('county').map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Brand
              </label>
              <select
                value={filters.brand}
                onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toate brandurile</option>
                {getFilterOptions('brand_name').map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Oraș
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toate orașele</option>
                {getFilterOptions('city').map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistici */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Săli Unice</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Object.keys(uniqueLocations).length.toLocaleString('ro-RO')}
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Aparate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {filteredOperators.length.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Branduri</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {[...new Set(filteredOperators.map(op => op.brand_name).filter(Boolean))].length}
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Companii</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {[...new Set(filteredOperators.map(op => op.company_name).filter(Boolean))].length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Harta */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Harta României</h3>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {Object.keys(uniqueLocations).length} locații afișate
            </div>
          </div>
          
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Harta interactivă
            </h4>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Această funcționalitate va fi implementată cu Leaflet Maps
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {Object.values(uniqueLocations).map((location, index) => (
                <div
                  key={index}
                  className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <MapPin className="w-4 h-4 text-blue-500 mt-1" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {location.totalSlots} aparate
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {location.address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ]+/gi, '').trim()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {location.city}, {location.county}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {location.activeSlots} active
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {location.brands.size} branduri
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detalii locație selectată */}
        {selectedLocation && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Detalii Locație
              </h3>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Adresă</h4>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {selectedLocation.address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ]+/gi, '').trim()}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {selectedLocation.city}, {selectedLocation.county}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Statistici</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total aparate:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLocation.totalSlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Active:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{selectedLocation.activeSlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Branduri:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLocation.brands.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Companii:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLocation.companies.size}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Branduri</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedLocation.brands).map(brand => (
                  <span key={brand} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ONJNMap
