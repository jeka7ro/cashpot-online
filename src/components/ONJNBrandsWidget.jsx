import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Award, TrendingUp, Target } from 'lucide-react'

const ONJNBrandsWidget = ({ operators = [], onFilterChange }) => {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (operators.length > 0) {
      loadBrands()
    } else {
      loadBrandsFromAPI()
    }
  }, [operators])

  const loadBrandsFromAPI = async () => {
    try {
      const response = await axios.get('/api/onjn-operators')
      processBrandsData(response.data)
    } catch (error) {
      console.error('Error loading brands:', error)
      setLoading(false)
    }
  }

  const processBrandsData = (data) => {
    try {
      
      // Group by brand and count - handle multiple brands per operator
      const brandStats = {}
      data.forEach(op => {
        const brand = op.brand_name || 'Necunoscut'
        if (!brandStats[brand]) {
          brandStats[brand] = {
            brand,
            company: op.company_name,
            total: 0,
            active: 0,
            counties: new Set()
          }
        }
        brandStats[brand].total++
        if (op.status === 'În exploatare') {
          brandStats[brand].active++
        }
        if (op.county) {
          brandStats[brand].counties.add(op.county)
        }
      })
      
      // Convert to array and sort by total
      const brandsArray = Object.values(brandStats)
        .map(b => ({ ...b, counties: b.counties.size }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8) // Top 8
      
      setBrands(brandsArray)
    } catch (error) {
      console.error('Error loading brands:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBrands = () => {
    processBrandsData(operators)
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

  const totalDevices = brands.reduce((sum, b) => sum + b.total, 0)
  const brandColors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-yellow-500 to-orange-500',
    'from-pink-500 to-rose-500',
    'from-cyan-500 to-blue-500'
  ]

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/25">
            <Award className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Distribuție Branduri</h3>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">Top 8</span>
      </div>

      {/* Brands List */}
      <div className="space-y-4">
        {brands.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Nu există date</p>
          </div>
        ) : (
          brands.map((brand, index) => {
            const percentage = totalDevices > 0 ? ((brand.total / totalDevices) * 100).toFixed(1) : 0
            const activePercentage = brand.total > 0 ? ((brand.active / brand.total) * 100).toFixed(0) : 0
            const gradientClass = brandColors[index % brandColors.length]
            
            return (
              <div key={brand.brand} className="group">
                <div 
                  className="flex items-center justify-between mb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg p-2 -m-2 transition-colors"
                  onClick={() => {
                    // Apply brand filter
                    if (onFilterChange) {
                      onFilterChange('brand', brand.brand)
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <span className="text-white font-bold text-sm">
                        {brand.brand.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {brand.brand}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                        <span>{brand.company}</span>
                        <span>•</span>
                        <span>{brand.counties} județe</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600 dark:text-purple-400">
                      {brand.total}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {percentage}%
                    </div>
                  </div>
                </div>
                
                {/* Stats Row */}
                <div className="flex items-center space-x-2 text-xs ml-13">
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <Target className="w-3 h-3" />
                    <span>{brand.active} active ({activePercentage}%)</span>
                  </div>
                </div>
                
                {/* Separator */}
                {index < brands.length - 1 && (
                  <div className="border-t border-slate-100 dark:border-slate-700 mt-3"></div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Market Share Summary */}
      {brands.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Cotă de piață (top {brands.length}):
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
            {brands.map((brand, index) => {
              const percentage = totalDevices > 0 ? (brand.total / totalDevices) * 100 : 0
              const gradientClass = brandColors[index % brandColors.length]
              
              return (
                <div
                  key={brand.brand}
                  className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-500 group relative`}
                  style={{ width: `${percentage}%` }}
                  title={`${brand.brand}: ${percentage.toFixed(1)}%`}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between text-sm mt-3">
            <span className="text-slate-600 dark:text-slate-400">Total branduri active:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{brands.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ONJNBrandsWidget

