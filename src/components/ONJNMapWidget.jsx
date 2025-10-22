import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Tooltip } from 'react-leaflet'
import { Map, MapPin, TrendingUp, AlertCircle, Target, Navigation, Edit3 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import BrandLogoModal from './modals/BrandLogoModal'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Coordonate județe România (centru)
const ROMANIA_COUNTIES = {
  'Alba': { lat: 46.0667, lng: 23.5833 },
  'Arad': { lat: 46.1667, lng: 21.3167 },
  'Argeș': { lat: 44.9167, lng: 24.9167 },
  'Bacău': { lat: 46.5667, lng: 26.9167 },
  'Bihor': { lat: 47.0667, lng: 21.9167 },
  'Bistrița-Năsăud': { lat: 47.1333, lng: 24.4833 },
  'Botoșani': { lat: 47.7500, lng: 26.6667 },
  'Brăila': { lat: 45.2667, lng: 27.9833 },
  'Brașov': { lat: 45.6500, lng: 25.6167 },
  'București': { lat: 44.4333, lng: 26.1000 },
  'Buzău': { lat: 45.1500, lng: 26.8167 },
  'Călărași': { lat: 44.2000, lng: 27.3333 },
  'Caraș-Severin': { lat: 45.4167, lng: 22.2000 },
  'Cluj': { lat: 46.7667, lng: 23.6000 },
  'Constanța': { lat: 44.1592, lng: 28.6342 },
  'Covasna': { lat: 45.8667, lng: 25.7833 },
  'Dâmbovița': { lat: 44.9667, lng: 25.4333 },
  'Dolj': { lat: 44.3167, lng: 23.8000 },
  'Galați': { lat: 45.4167, lng: 28.0167 },
  'Giurgiu': { lat: 43.9000, lng: 25.9667 },
  'Gorj': { lat: 45.0333, lng: 23.2833 },
  'Harghita': { lat: 46.3667, lng: 25.8000 },
  'Hunedoara': { lat: 45.7500, lng: 22.9167 },
  'Ialomița': { lat: 44.5667, lng: 27.2500 },
  'Iași': { lat: 47.1589, lng: 27.6019 },
  'Ilfov': { lat: 44.6333, lng: 26.0833 },
  'Maramureș': { lat: 47.6667, lng: 23.5833 },
  'Mehedinți': { lat: 44.9333, lng: 22.3667 },
  'Mureș': { lat: 46.5333, lng: 24.5667 },
  'Neamț': { lat: 46.9333, lng: 26.3833 },
  'Olt': { lat: 44.4333, lng: 24.3667 },
  'Prahova': { lat: 45.1000, lng: 26.0333 },
  'Sălaj': { lat: 47.1833, lng: 23.0667 },
  'Satu Mare': { lat: 47.8000, lng: 22.8833 },
  'Sibiu': { lat: 45.7928, lng: 24.1525 },
  'Suceava': { lat: 47.6500, lng: 26.2500 },
  'Teleorman': { lat: 43.9833, lng: 25.4500 },
  'Timiș': { lat: 45.7489, lng: 21.2087 },
  'Tulcea': { lat: 45.1833, lng: 28.8000 },
  'Vâlcea': { lat: 45.1000, lng: 24.3833 },
  'Vaslui': { lat: 46.6333, lng: 27.7333 },
  'Vrancea': { lat: 45.7000, lng: 27.1833 }
}

const ONJNMapWidget = ({ operators = [], filteredOperators = [], filters = {}, onFilterChange }) => {
  const [mapData, setMapData] = useState({
    counties: [],
    hotspots: [],
    allBrands: [],
    brandStats: {}
  })
  const [loading, setLoading] = useState(true)
  const [selectedCounty, setSelectedCounty] = useState(null)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [showMap, setShowMap] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState(null)

  useEffect(() => {
    setMounted(true)
    if (operators.length > 0) {
      loadMapData()
    } else {
      loadMapDataFromAPI()
    }
  }, [operators, filteredOperators, filters])

  const loadMapDataFromAPI = async () => {
    try {
      // Load only limited data for better performance
      const response = await axios.get('/api/onjn-operators?limit=1000')
      processMapData(response.data)
    } catch (error) {
      console.error('Error loading map data:', error)
      setLoading(false)
    }
  }

  const processMapData = (data) => {
    try {
      // Use filtered data if available, otherwise use all data - Limit to 1000 for performance
      const dataToProcess = (filteredOperators.length > 0 ? filteredOperators : data).slice(0, 1000)
      
      // Group by county, city, and brand
      const countyStats = {}
      const cityStats = {}
      const brandStats = {}
      const allBrands = new Set()
      const locationMarkers = [] // New: Store actual location markers
      
      dataToProcess.forEach(op => {
        // County stats
        if (op.county) {
          if (!countyStats[op.county]) {
            countyStats[op.county] = {
              county: op.county,
              total: 0,
              active: 0,
              brands: new Set(),
              cities: new Set(),
              brandDetails: {}
            }
          }
          
          countyStats[op.county].total++
          if (op.status === 'În exploatare') {
            countyStats[op.county].active++
          }
          
          if (op.brand_name) {
            countyStats[op.county].brands.add(op.brand_name)
            allBrands.add(op.brand_name)
            
            if (!countyStats[op.county].brandDetails[op.brand_name]) {
              countyStats[op.county].brandDetails[op.brand_name] = 0
            }
            countyStats[op.county].brandDetails[op.brand_name]++
          }
          
          if (op.city) {
            countyStats[op.county].cities.add(op.city)
          }
        }
        
        // City stats
        if (op.city) {
          const key = `${op.city}, ${op.county}`
          if (!cityStats[key]) {
            cityStats[key] = {
              city: op.city,
              county: op.county,
              total: 0,
              active: 0,
              brands: new Set(),
              brandDetails: {}
            }
          }
          
          cityStats[key].total++
          if (op.status === 'În exploatare') {
            cityStats[key].active++
          }
          
          if (op.brand_name) {
            cityStats[key].brands.add(op.brand_name)
            allBrands.add(op.brand_name)
            
            if (!cityStats[key].brandDetails[op.brand_name]) {
              cityStats[key].brandDetails[op.brand_name] = 0
            }
            cityStats[key].brandDetails[op.brand_name]++
          }
        }
        
        // Brand stats
        if (op.brand_name) {
          if (!brandStats[op.brand_name]) {
            brandStats[op.brand_name] = {
              brand: op.brand_name,
              total: 0,
              active: 0,
              counties: new Set(),
              cities: new Set()
            }
          }
          
          brandStats[op.brand_name].total++
          if (op.status === 'În exploatare') {
            brandStats[op.brand_name].active++
          }
          
          if (op.county) {
            brandStats[op.brand_name].counties.add(op.county)
          }
          if (op.city) {
            brandStats[op.brand_name].cities.add(op.city)
          }
        }
        
        // Create location marker for actual address
        if (op.slot_address && op.city && op.county) {
          // Try to extract coordinates from county mapping or use approximate coordinates
          const countyCoords = ROMANIA_COUNTIES[op.county] || ROMANIA_COUNTIES[op.county?.replace('JUDEȚUL ', '')] || { lat: 45.5, lng: 25.0 }
          
          // Add some randomization for multiple locations in same city
          const randomOffset = Math.random() * 0.01 - 0.005 // ±0.005 degrees
          
          locationMarkers.push({
            id: `${op.serial_number || Math.random()}`,
            position: [
              countyCoords.lat + randomOffset, 
              countyCoords.lng + randomOffset
            ],
            data: {
              address: op.slot_address,
              city: op.city,
              county: op.county,
              brand: op.brand_name,
              status: op.status,
              company: op.company_name,
              serialNumber: op.serial_number
            }
          })
        }
      })
      
      // Convert to arrays and add coordinates
      const counties = Object.values(countyStats)
        .map(c => ({ 
          ...c, 
          brands: Array.from(c.brands),
          brandsCount: c.brands.size, 
          citiesCount: c.cities.size,
          coordinates: ROMANIA_COUNTIES[c.county] || { lat: 45.5, lng: 25.0 }
        }))
        .sort((a, b) => b.total - a.total)
      
      // Get all brands sorted by total
      const allBrandsList = Object.values(brandStats)
        .map(b => ({
          ...b,
          countiesCount: b.counties.size,
          citiesCount: b.cities.size
        }))
        .sort((a, b) => b.total - a.total)
      
      setMapData({ 
        counties, 
        hotspots: Object.values(cityStats).slice(0, 20), 
        allBrands: allBrandsList,
        brandStats: Object.values(brandStats),
        locationMarkers: locationMarkers.slice(0, 500) // Limit to 500 markers for performance
      })
    } catch (error) {
      console.error('Error loading map data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMapData = () => {
    // Use all operators for initial load, then filteredOperators for updates
    processMapData(filteredOperators.length > 0 ? operators : operators)
  }

  const handleEditBrand = (brand) => {
    setEditingBrand(brand)
    setShowBrandModal(true)
  }

  const handleBrandSave = () => {
    // Reload data after brand update
    setShowBrandModal(false)
    setEditingBrand(null)
    processMapData(operators)
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  const getCompetitionColor = (level) => {
    if (level === 'high') return 'bg-red-500'
    if (level === 'medium') return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getCompetitionBg = (level) => {
    if (level === 'high') return 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border-red-200 dark:border-red-800'
    if (level === 'medium') return 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800'
    return 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800'
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/25">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hartă XL - Toate Brandurile</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Harta interactivă cu toate brandurile din România ({mapData.allBrands?.length || 0} branduri, {mapData.counties?.length || 0} județe)
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors text-sm font-medium"
        >
          <Navigation className="w-4 h-4" />
          <span>{showMap ? 'Lista' : 'Harta'}</span>
        </button>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600 dark:text-slate-400">CASHPOT dominant</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Concurență medie</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Concurență ridicată</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Oportunități (fără CASHPOT)</span>
        </div>
      </div>

      {/* Map View */}
      {showMap && (
        <div className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6">
          <div className="text-center mb-4">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Hartă România - Sloturi ONJN</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Distribuția sloturilor și brandurilor în România ({mapData.counties.length} județe analizate)
            </p>
          </div>
          
          {/* Interactive Leaflet Map - XL */}
          <div className="relative bg-white dark:bg-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-600 overflow-hidden" style={{ height: '600px' }}>
            {mounted ? (
              <MapContainer 
                center={[45.5, 25.0]} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              
              {/* County Markers - Clickable for filtering */}
              {mapData.counties.map((county) => {
                if (!county.coordinates) return null
                
                const isFiltered = filters.county === county.county
                const getMarkerColor = () => {
                  if (isFiltered) return '#ef4444' // red when filtered
                  if (county.total > 500) return '#3b82f6' // blue for high activity
                  if (county.total > 200) return '#10b981' // green for medium activity
                  return '#64748b' // gray for low activity
                }
                
                const markerIcon = L.divIcon({
                  className: 'custom-marker',
                  html: `
                    <div style="
                      width: ${Math.max(20, Math.min(50, county.total / 15))}px;
                      height: ${Math.max(20, Math.min(50, county.total / 15))}px;
                      background-color: ${getMarkerColor()};
                      border: 3px solid ${isFiltered ? '#ffffff' : '#ffffff'};
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 11px;
                      font-weight: bold;
                      color: white;
                      text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
                      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                      cursor: pointer;
                    ">
                      ${county.total > 50 ? Math.round(county.total/100) : county.total}
                    </div>
                  `,
                  iconSize: [50, 50],
                  iconAnchor: [25, 25]
                })
                
                return (
                  <Marker 
                    key={county.county}
                    position={[county.coordinates.lat, county.coordinates.lng]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => {
                        if (onFilterChange) {
                          onFilterChange('county', county.county)
                        }
                      }
                    }}
                  >
                    <Popup>
                      <div className="p-3 min-w-[250px]">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-slate-800 text-lg">{county.county}</h3>
                          <button
                            onClick={() => onFilterChange && onFilterChange('county', county.county)}
                            className="px-3 py-1 bg-indigo-500 text-white text-xs rounded-full hover:bg-indigo-600 transition-colors"
                          >
                            Filtrează
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total sloturi:</span>
                            <span className="font-semibold text-lg">{county.total.toLocaleString('ro-RO')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Active:</span>
                            <span className="font-semibold text-green-600">{county.active}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Branduri:</span>
                            <span className="font-semibold">{county.brandsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Orașe:</span>
                            <span className="font-semibold">{county.citiesCount}</span>
                          </div>
                          
                          {/* Top brands in this county */}
                          {county.brands && county.brands.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-200">
                              <div className="text-xs text-slate-500 mb-1">Top branduri:</div>
                              <div className="space-y-1">
                                {county.brands.slice(0, 5).map(brand => (
                                  <div key={brand} className="flex justify-between text-xs">
                                    <span className="text-slate-600 truncate">{brand}</span>
                                    <button
                                      onClick={() => onFilterChange && onFilterChange('brand', brand)}
                                      className="text-indigo-500 hover:text-indigo-700 ml-2 text-xs"
                                    >
                                      Filtrează
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <div className="text-center">
                        <strong>{county.county}</strong><br/>
                        {county.total.toLocaleString('ro-RO')} sloturi<br/>
                        <span className="text-xs text-blue-600">Click pentru filtru</span>
                      </div>
                    </Tooltip>
                  </Marker>
                )
              })}
              
              {/* Location Markers - Individual slot locations */}
              {mapData.locationMarkers?.map(location => {
                const isActive = location.data.status === 'În exploatare'
                const markerColor = isActive ? '#10b981' : '#ef4444' // green for active, red for inactive
                
                const locationIcon = L.divIcon({
                  className: 'location-marker',
                  html: `
                    <div style="
                      width: 12px;
                      height: 12px;
                      background-color: ${markerColor};
                      border: 2px solid #ffffff;
                      border-radius: 50%;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      cursor: pointer;
                    "></div>
                  `,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                })
                
                return (
                  <Marker
                    key={location.id}
                    position={location.position}
                    icon={locationIcon}
                    eventHandlers={{
                      click: () => {
                        if (onFilterChange) {
                          onFilterChange('brand', location.data.brand)
                        }
                      }
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="font-semibold text-slate-800 mb-2">{location.data.brand}</div>
                        <div className="text-sm space-y-1">
                          <div><strong>Adresă:</strong> {location.data.address}</div>
                          <div><strong>Oraș:</strong> {location.data.city}</div>
                          <div><strong>Județ:</strong> {location.data.county}</div>
                          <div><strong>Status:</strong> 
                            <span className={`ml-1 px-2 py-1 rounded text-xs ${
                              isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {location.data.status}
                            </span>
                          </div>
                          <div><strong>Companie:</strong> {location.data.company}</div>
                          {location.data.serialNumber && (
                            <div><strong>Nr. serie:</strong> {location.data.serialNumber}</div>
                          )}
                        </div>
                        <button
                          onClick={() => onFilterChange && onFilterChange('brand', location.data.brand)}
                          className="mt-2 w-full px-3 py-1 bg-indigo-500 text-white text-xs rounded-full hover:bg-indigo-600 transition-colors"
                        >
                          Filtrează după brand
                        </button>
                      </div>
                    </Popup>
                    <Tooltip>
                      <div className="text-center">
                        <strong>{location.data.brand}</strong><br/>
                        {location.data.city}<br/>
                        <span className={`text-xs ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {location.data.status}
                        </span>
                      </div>
                    </Tooltip>
                  </Marker>
                )
              })}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm">Se încarcă harta...</div>
                </div>
              </div>
            )}
            
            {/* Fallback for when map doesn't load */}
            {mounted && mapData.counties.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                <div className="text-center">
                  <Map className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <div className="text-slate-600 dark:text-slate-400 text-sm">
                    Harta se încarcă... Dacă nu apare, refresh pagina.
                  </div>
                </div>
              </div>
            )}
            
            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-700 rounded-lg shadow-lg p-3 border border-slate-200 dark:border-slate-600 max-w-[220px]">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Legendă</div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Județe:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Filtrat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">&gt;500 sloturi</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">&gt;200 sloturi</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">&lt;200 sloturi</span>
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 mt-2">Locații:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">În exploatare</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Inactive</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Click pe marker pentru filtru
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Brands List - Filterable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Toate Brandurile ({mapData.allBrands?.length || 0})
          </h4>
          <Target className="w-4 h-4 text-slate-500" />
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {mapData.allBrands && mapData.allBrands.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Map className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nu există date</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mapData.allBrands?.slice(0, 20).map((brand, index) => {
                const isFiltered = filters.brand === brand.brand
                const isSelected = selectedBrand === brand.brand
                
                return (
                  <div
                    key={brand.brand}
                    className={`relative bg-gradient-to-br border rounded-xl p-3 cursor-pointer hover:shadow-lg transition-all ${
                      isFiltered 
                        ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border-red-300 dark:border-red-700'
                        : 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-600'
                    } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                    onClick={() => {
                      if (onFilterChange) {
                        onFilterChange('brand', brand.brand)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          isFiltered ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                              {index + 1}. {brand.brand}
                            </span>
                            {isFiltered && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                FILTRAT
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-slate-500 dark:text-slate-400">Total</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {brand.total.toLocaleString('ro-RO')}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 dark:text-slate-400">Active</div>
                              <div className="font-bold text-green-600 dark:text-green-400">
                                {brand.active.toLocaleString('ro-RO')}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 dark:text-slate-400">Județe</div>
                              <div className="font-bold text-indigo-600 dark:text-indigo-400">
                                {brand.countiesCount}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {brand.citiesCount} orașe
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditBrand(brand)
                          }}
                          className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-full transition-colors flex items-center space-x-1"
                          title="Editează brandul"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onFilterChange) {
                              onFilterChange('brand', brand.brand)
                            }
                          }}
                          className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-full transition-colors"
                        >
                          Filtrează
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {mapData.allBrands && mapData.allBrands.length > 20 && (
          <div className="text-center pt-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Afișate primele 20 din {mapData.allBrands.length} branduri
            </span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {mapData.counties.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Zone Analizate</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {mapData.hotspots.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Concurență Ridicată</div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {mapData.hotspots.filter(h => h.competition === 'high').length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Oportunități</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {mapData.hotspots.filter(h => h.competition === 'low').length}
            </div>
          </div>
        </div>
      )}

      {/* Brand Logo Modal */}
      {showBrandModal && editingBrand && (
        <BrandLogoModal
          brand={editingBrand}
          onClose={() => {
            setShowBrandModal(false)
            setEditingBrand(null)
          }}
          onSave={handleBrandSave}
        />
      )}
    </div>
  )
}

export default ONJNMapWidget

