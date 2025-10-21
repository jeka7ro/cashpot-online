import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MapPin, Building, TrendingUp } from 'lucide-react'

const ONJNCountiesWidget = ({ operators = [] }) => {
  const [counties, setCounties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (operators.length > 0) {
      loadCounties()
    } else {
      loadCountiesFromAPI()
    }
  }, [operators])

  const loadCountiesFromAPI = async () => {
    try {
      const response = await axios.get('/api/onjn-operators')
      processCountiesData(response.data)
    } catch (error) {
      console.error('Error loading counties:', error)
      setLoading(false)
    }
  }

  const processCountiesData = (data) => {
    try {
      // Group by county and count
      const countyStats = {}
      
      data.forEach(op => {
        if (op.county) {
          // Normalize county names
          let countyKey = op.county.trim()
          
          // Handle Bucharest counties
          if (countyKey.toLowerCase().includes('sector') || 
              countyKey.toLowerCase().includes('bucurești')) {
            countyKey = 'București'
          }
          
          if (!countyStats[countyKey]) {
            countyStats[countyKey] = {
              county: countyKey,
              total: 0,
              active: 0,
              cities: new Set()
            }
          }
          
          countyStats[countyKey].total++
          if (op.status === 'În exploatare') {
            countyStats[countyKey].active++
          }
          if (op.city) {
            countyStats[countyKey].cities.add(op.city)
          }
        }
      })
      
      // Convert to array and sort by total
      const countiesArray = Object.values(countyStats)
        .map(county => ({
          ...county,
          citiesCount: county.cities.size,
          cities: Array.from(county.cities)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10) // Top 10
      
      setCounties(countiesArray)
    } catch (error) {
      console.error('Error processing counties data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCounties = () => {
    processCountiesData(operators)
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

  const maxCount = counties[0]?.total || 1

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/25">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Top Județe</h3>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">Top 10</span>
      </div>

      {/* Counties List */}
      <div className="space-y-3">
        {counties.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Nu există date</p>
          </div>
        ) : (
          counties.map((county, index) => {
            const percentage = (county.total / maxCount) * 100
            const activePercentage = county.total > 0 ? ((county.active / county.total) * 100).toFixed(0) : 0
            
            return (
              <div key={county.county} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-400 dark:text-slate-500 w-6">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {county.county}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>{county.citiesCount} orașe</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600 dark:text-green-400">
                      {county.total}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {county.active} active ({activePercentage}%)
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Summary */}
      {counties.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Total județe:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{counties.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-600 dark:text-slate-400">Total aparate (top 10):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {counties.reduce((sum, county) => sum + county.total, 0).toLocaleString('ro-RO')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ONJNCountiesWidget
