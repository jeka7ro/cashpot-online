import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Building2, Users, Filter, Search } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix pentru iconițele Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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
        console.log('Loading ONJN data...')
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators')
        const data = await response.json()
        console.log('Loaded operators:', data.length)
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

  console.log('Filtered operators:', filteredOperators.length)

  // Grupează operatorii pe adrese unice - DOAR LOCAȚIILE ACTIVE
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

  // Filtrează doar locațiile care au cel puțin un aparat activ
  const activeLocations = Object.fromEntries(
    Object.entries(uniqueLocations).filter(([key, location]) => location.activeSlots > 0)
  )

  // Coordonate pentru orașe din România
  const getCoordinates = (city, county) => {
    const cityCoordinates = {
      'BUCUREȘTI': [44.4268, 26.1025],
      'SECTOR 1': [44.4378, 26.0969],
      'SECTOR 2': [44.4528, 26.1339],
      'SECTOR 3': [44.4268, 26.1025],
      'SECTOR 4': [44.3750, 26.1206],
      'SECTOR 5': [44.3888, 26.0719],
      'SECTOR 6': [44.4355, 26.0165],
      'CLUJ-NAPOCA': [46.7712, 23.6236],
      'CLUJ': [46.7712, 23.6236],
      'TIMIȘOARA': [45.7472, 21.2087],
      'IAȘI': [47.1585, 27.6014],
      'CONSTANȚA': [44.1733, 28.6383],
      'CRAIOVA': [44.3199, 23.7967],
      'GALAȚI': [45.4353, 28.0080],
      'PLOIEȘTI': [44.9419, 26.0225],
      'BRAȘOV': [45.6427, 25.5887],
      'BRĂILA': [45.2667, 27.9833],
      'SIBIU': [45.8000, 24.1500],
      'TULCEA': [45.1667, 28.8000],
      'MUREȘ': [46.5500, 24.5667],
      'BISTRIȚA-NĂSĂUD': [47.1333, 24.4833],
      'BISTRIȚA': [47.1333, 24.4833],
      'HUNEDOARA': [45.7500, 22.9000],
      'OLT': [44.1667, 24.3500],
      'SLATINA': [44.4333, 24.3667],
      'MEDIAȘ': [46.1667, 24.3500],
      'SIGHIȘOARA': [46.2167, 24.7833],
      'BORȘA': [47.6500, 24.6667],
      'BLAJ': [46.1833, 23.9167],
      'ALBA': [46.0667, 23.5667],
      'DOLJ': [44.1667, 23.7167],
      'ARGEȘ': [44.9167, 24.9167],
      'ILFOV': [44.4333, 26.0833],
      'SĂLAJ': [47.2000, 23.0500],
      'VÂLCEA': [45.1000, 24.3667],
      'PITEȘTI': [44.8606, 24.8678],
      'RÂMNICU VÂLCEA': [45.1000, 24.3667]
    }
    
    return cityCoordinates[city?.toUpperCase()] || [45.9432, 24.9668] // Centrul României
  }

  // Obține opțiunile pentru filtre cu filtrare în cascadă
  const getFilterOptions = (field) => {
    let filteredOperators = operators
    
    // Dacă este selectat un brand, filtrează doar operatorii acelui brand
    if (filters.brand) {
      filteredOperators = operators.filter(op => op.brand_name === filters.brand)
    }
    
    // Dacă este selectat un județ, filtrează doar operatorii din acel județ
    if (filters.county) {
      filteredOperators = filteredOperators.filter(op => op.county === filters.county)
    }
    
    const values = [...new Set(filteredOperators.map(op => op[field]).filter(Boolean))]
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
                onChange={(e) => {
                  const newCounty = e.target.value
                  setFilters(prev => ({ 
                    ...prev, 
                    county: newCounty,
                    city: '' // Resetează orașul când se schimbă județul
                  }))
                }}
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
                onChange={(e) => {
                  const newBrand = e.target.value
                  setFilters(prev => ({ 
                    ...prev, 
                    brand: newBrand,
                    city: '', // Resetează orașul când se schimbă brandul
                    county: '' // Resetează județul când se schimbă brandul
                  }))
                }}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Săli Unice</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Object.keys(activeLocations).length.toLocaleString('ro-RO')}
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
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aparate Active</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {filteredOperators.filter(op => op.status === 'În exploatare').length.toLocaleString('ro-RO')}
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
              {Object.keys(activeLocations).length} locații active afișate
            </div>
          </div>
          
          <div className="h-96 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <MapContainer
              center={[45.9432, 24.9668]} // Centrul României
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {Object.values(activeLocations).map((location, index) => {
                const coords = getCoordinates(location.city, location.county)
                return (
                  <Marker
                    key={index}
                    position={coords}
                    eventHandlers={{
                      click: () => setSelectedLocation(location)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-semibold text-slate-800 mb-2">
                          {location.address.replace(/,?\s*JUD[EȚ]UL?\s+[A-ZĂÂÎȘȚ-]+/gi, '').trim()}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">
                          {location.city}, {location.county?.replace(/^JUD[EȚ]UL\s+/i, '')}
                        </p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Total aparate:</span>
                            <span className="font-semibold">{location.totalSlots}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Active:</span>
                            <span className="font-semibold text-green-600">{location.activeSlots}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Branduri:</span>
                            <span className="font-semibold">{location.brands.size}</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
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
