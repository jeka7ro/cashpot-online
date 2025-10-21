import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Map, MapPin, TrendingUp, AlertCircle, Target, Navigation } from 'lucide-react'

const ONJNMapWidget = ({ operators = [] }) => {
  const [mapData, setMapData] = useState({
    counties: [],
    hotspots: [],
    competition: [],
    cashpotAreas: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedCounty, setSelectedCounty] = useState(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    if (operators.length > 0) {
      loadMapData()
    } else {
      loadMapDataFromAPI()
    }
  }, [operators])

  const loadMapDataFromAPI = async () => {
    try {
      const response = await axios.get('/api/onjn-operators')
      processMapData(response.data)
    } catch (error) {
      console.error('Error loading map data:', error)
      setLoading(false)
    }
  }

  const processMapData = (data) => {
    try {
      
      // Group by county
      const countyStats = {}
      const cityStats = {}
      
      data.forEach(op => {
        // County stats
        if (op.county) {
          if (!countyStats[op.county]) {
            countyStats[op.county] = {
              county: op.county,
              total: 0,
              active: 0,
              brands: new Set(),
              cities: new Set(),
              cashpotSlots: 0
            }
          }
          countyStats[op.county].total++
          if (op.status === 'În exploatare') {
            countyStats[op.county].active++
          }
          if (op.brand_name) {
            countyStats[op.county].brands.add(op.brand_name)
          }
          if (op.city) {
            countyStats[op.county].cities.add(op.city)
          }
          // Focus on CASHPOT competition
          if (op.brand_name && op.brand_name.toLowerCase().includes('cashpot')) {
            countyStats[op.county].cashpotSlots++
          }
        }
        
        // City stats for CASHPOT competition hotspots
        if (op.city) {
          const key = `${op.city}, ${op.county}`
          if (!cityStats[key]) {
            cityStats[key] = {
              city: op.city,
              county: op.county,
              total: 0,
              active: 0,
              brands: new Set(),
              cashpotSlots: 0,
              competition: 0
            }
          }
          cityStats[key].total++
          if (op.status === 'În exploatare') {
            cityStats[key].active++
          }
          if (op.brand_name) {
            cityStats[key].brands.add(op.brand_name)
          }
          if (op.brand_name && op.brand_name.toLowerCase().includes('cashpot')) {
            cityStats[key].cashpotSlots++
          }
        }
      })
      
      // Convert to arrays
      const counties = Object.values(countyStats)
        .map(c => ({ ...c, brands: c.brands.size, cities: c.cities.size }))
        .sort((a, b) => b.total - a.total)
      
      // Focus on areas where CASHPOT has competition
      const hotspots = Object.values(cityStats)
        .filter(c => c.cashpotSlots > 0) // Only areas with CASHPOT
        .map(c => ({ 
          ...c, 
          brands: c.brands.size,
          competition: c.brands.size > 3 ? 'high' : c.brands.size > 1 ? 'medium' : 'low',
          cashpotDensity: c.cashpotSlots / c.total
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15) // More areas since it's CASHPOT-focused
      
      // Competition analysis specifically around CASHPOT
      const competition = hotspots.map(spot => ({
        ...spot,
        density: spot.total / 10, // devices per km² (simplified)
        competitionLevel: spot.brands,
        cashpotMarketShare: ((spot.cashpotSlots / spot.total) * 100).toFixed(1)
      }))
      
      // Areas where CASHPOT could expand (low CASHPOT presence, high competition)
      const cashpotAreas = Object.values(cityStats)
        .filter(c => c.cashpotSlots === 0 && c.brands.size > 1) // No CASHPOT but has competition
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
      
      setMapData({ counties, hotspots: competition, competition, cashpotAreas })
    } catch (error) {
      console.error('Error loading map data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMapData = () => {
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
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Concurență CASHPOT</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Zone cu prezență CASHPOT</p>
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
          
          {/* Simplified Romania Map - Using CSS Grid */}
          <div className="relative bg-white dark:bg-slate-700 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-6 gap-1 h-64">
              {/* Mock Romania counties visualization */}
              {mapData.counties.slice(0, 12).map((county, index) => {
                const intensity = Math.min(county.total / 500, 1) // Normalize to 0-1
                const bgIntensity = `bg-opacity-${Math.round(intensity * 100)}`
                return (
                  <div
                    key={county.county}
                    className={`rounded border-2 cursor-pointer transition-all hover:scale-105 ${
                      county.cashpotSlots > 0 
                        ? 'bg-green-500 border-green-600' 
                        : county.total > 300 
                          ? 'bg-blue-500 border-blue-600' 
                          : 'bg-slate-300 border-slate-400'
                    } bg-opacity-60 hover:bg-opacity-80`}
                    title={`${county.county}: ${county.total} sloturi, ${county.cashpotSlots} CASHPOT`}
                  >
                    <div className="text-xs p-1 text-white font-bold text-center">
                      {county.county.length > 8 ? county.county.substring(0, 6) + '...' : county.county}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Map Legend */}
            <div className="mt-4 flex justify-center space-x-6 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Cu CASHPOT</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Zone active</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-slate-300 rounded"></div>
                <span>Zone inactive</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hotspots List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {showMap ? 'Zone CASHPOT în România' : 'Zone cu concurență CASHPOT'}
          </h4>
          <Target className="w-4 h-4 text-slate-500" />
        </div>

        {mapData.hotspots.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Map className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Nu există date</p>
          </div>
        ) : (
          mapData.hotspots.map((spot, index) => {
            const isSelected = selectedCounty === spot.county
            
            return (
              <div
                key={`${spot.city}-${spot.county}`}
                className={`relative bg-gradient-to-br ${getCompetitionBg(spot.competition)} border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                  isSelected ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => setSelectedCounty(isSelected ? null : spot.county)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getCompetitionColor(spot.competition)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {index + 1}. {spot.city}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {spot.county}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Total</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {spot.total}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">CASHPOT</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {spot.cashpotSlots || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Pondere</div>
                          <div className="font-bold text-indigo-600 dark:text-indigo-400">
                            {spot.cashpotMarketShare || '0.0'}%
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Branduri</div>
                          <div className="font-bold text-purple-600 dark:text-purple-400">
                            {spot.brands}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {spot.competition === 'high' && (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                
                {/* Competition Level Badge */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Nivel concurență:</span>
                    <span className={`font-semibold ${
                      spot.competition === 'high' ? 'text-red-600 dark:text-red-400' :
                      spot.competition === 'medium' ? 'text-orange-600 dark:text-orange-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {spot.competition === 'high' ? 'RIDICAT' :
                       spot.competition === 'medium' ? 'MEDIU' : 'SCĂZUT'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
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
    </div>
  )
}

export default ONJNMapWidget

