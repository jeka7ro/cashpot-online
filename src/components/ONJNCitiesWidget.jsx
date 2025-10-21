import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MapPin, TrendingUp, Building2, ChevronDown, ChevronRight } from 'lucide-react'

const ONJNCitiesWidget = ({ operators = [], onFilterChange }) => {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCity, setExpandedCity] = useState(null)

  useEffect(() => {
    if (operators.length > 0) {
      loadCities()
    } else {
      loadCitiesFromAPI()
    }
  }, [operators])

  const loadCitiesFromAPI = async () => {
    try {
      const response = await axios.get('/api/onjn-operators')
      processCitiesData(response.data)
    } catch (error) {
      console.error('Error loading cities:', error)
      setLoading(false)
    }
  }

  const processCitiesData = (data) => {
    try {
      // Group by city and count - București as unified city
      const cityStats = {}
      const bucharestSectors = {}
      
      data.forEach(op => {
        if (op.city) {
          let cityKey = op.city
          let displayCity = op.city
          
          // Unify all Bucharest sectors as "București"
          if (op.city.toLowerCase().includes('bucurești') || 
              op.county?.toLowerCase().includes('sector') ||
              op.city.toLowerCase().includes('sector')) {
            cityKey = 'București'
            displayCity = 'București'
            
            // Collect sector data for expansion
            if (!bucharestSectors[op.county || op.city]) {
              bucharestSectors[op.county || op.city] = {
                sector: op.county || op.city,
                total: 0,
                active: 0
              }
            }
            bucharestSectors[op.county || op.city].total++
            if (op.status === 'În exploatare') {
              bucharestSectors[op.county || op.city].active++
            }
          }
          
          if (!cityStats[cityKey]) {
            cityStats[cityKey] = {
              city: displayCity,
              county: cityKey === 'București' ? 'București' : op.county,
              total: 0,
              active: 0,
              sectors: cityKey === 'București' ? bucharestSectors : null
            }
          }
          cityStats[cityKey].total++
          if (op.status === 'În exploatare') {
            cityStats[cityKey].active++
          }
        }
      })
      
      // Convert to array and sort by total
      const citiesArray = Object.values(cityStats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10) // Top 10
      
      setCities(citiesArray)
    } catch (error) {
      console.error('Error processing cities data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCities = () => {
    processCitiesData(operators)
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  const maxCount = cities[0]?.total || 1

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/25">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Top Orașe</h3>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">Top 10</span>
      </div>

      {/* Cities List */}
      <div className="space-y-3">
        {cities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Nu există date</p>
          </div>
        ) : (
          cities.map((city, index) => {
            const percentage = (city.total / maxCount) * 100
            const activePercentage = city.total > 0 ? ((city.active / city.total) * 100).toFixed(0) : 0
            
            const isExpanded = expandedCity === city.city
            const hasSectors = city.sectors && Object.keys(city.sectors).length > 0
            
            return (
              <div key={city.city} className="relative">
                <div 
                  className={`flex items-center justify-between mb-1 ${hasSectors ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg p-2 -m-2' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg p-2 -m-2'}`}
                  onClick={() => {
                    if (hasSectors) {
                      setExpandedCity(isExpanded ? null : city.city)
                    } else {
                      // Apply city filter
                      if (onFilterChange) {
                        onFilterChange('city', city.city)
                      }
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-400 dark:text-slate-500 w-6">
                      {index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {city.city}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {city.county}
                        </div>
                      </div>
                      {hasSectors && (
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {city.total}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {city.active} active ({activePercentage}%)
                    </div>
                    {hasSectors && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {Object.keys(city.sectors).length} sectoare
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {/* Expanded Sectors for Bucharest */}
                {isExpanded && hasSectors && (
                  <div className="mt-3 ml-8 space-y-2 border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                    {Object.values(city.sectors).map((sector, sectorIndex) => {
                      const sectorPercentage = (sector.total / city.total) * 100
                      return (
                        <div key={sector.sector} className="text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {sector.sector}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                {sector.total}
                              </span>
                              <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                                {sector.active} active
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 rounded-full transition-all duration-500"
                              style={{ width: `${sectorPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Summary */}
      {cities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Total orașe:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{cities.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-600 dark:text-slate-400">Total aparate (top 10):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {cities.reduce((sum, city) => sum + city.total, 0).toLocaleString('ro-RO')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ONJNCitiesWidget

