import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Map, MapPin, TrendingUp, AlertCircle, Target } from 'lucide-react'

const ONJNMapWidget = () => {
  const [mapData, setMapData] = useState({
    counties: [],
    hotspots: [],
    competition: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedCounty, setSelectedCounty] = useState(null)

  useEffect(() => {
    loadMapData()
  }, [])

  const loadMapData = async () => {
    try {
      const response = await axios.get('/api/onjn-operators')
      
      // Group by county
      const countyStats = {}
      const cityStats = {}
      
      response.data.forEach(op => {
        // County stats
        if (op.county) {
          if (!countyStats[op.county]) {
            countyStats[op.county] = {
              county: op.county,
              total: 0,
              active: 0,
              brands: new Set(),
              cities: new Set()
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
        }
        
        // City stats for hotspots
        if (op.city) {
          const key = `${op.city}, ${op.county}`
          if (!cityStats[key]) {
            cityStats[key] = {
              city: op.city,
              county: op.county,
              total: 0,
              active: 0,
              brands: new Set(),
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
        }
      })
      
      // Convert to arrays
      const counties = Object.values(countyStats)
        .map(c => ({ ...c, brands: c.brands.size, cities: c.cities.size }))
        .sort((a, b) => b.total - a.total)
      
      const hotspots = Object.values(cityStats)
        .map(c => ({ 
          ...c, 
          brands: c.brands.size,
          competition: c.brands.size > 3 ? 'high' : c.brands.size > 1 ? 'medium' : 'low'
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
      
      // Competition analysis
      const competition = hotspots.map(spot => ({
        ...spot,
        density: spot.total / 10, // devices per km² (simplified)
        competitionLevel: spot.brands
      }))
      
      setMapData({ counties, hotspots, competition })
    } catch (error) {
      console.error('Error loading map data:', error)
    } finally {
      setLoading(false)
    }
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
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hartă Concurență</h3>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Concurență mică (1 brand)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Medie (2-3 branduri)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Mare (4+ branduri)</span>
        </div>
      </div>

      {/* Hotspots List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Top 10 Zone Concurență</h4>
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
                      
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Aparate</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {spot.total}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Active</div>
                          <div className="font-bold text-green-600 dark:text-green-400">
                            {spot.active}
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

