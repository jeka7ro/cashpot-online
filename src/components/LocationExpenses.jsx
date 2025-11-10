import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, TrendingUp, TrendingDown, Calendar, ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const LocationExpenses = ({ locationId, locationName, expendituresData }) => {
  const navigate = useNavigate()
  
  // Filter data for this location only
  const locationData = useMemo(() => {
    return expendituresData.filter(item => item.location_id === locationId || item.location_name === locationName)
  }, [expendituresData, locationId, locationName])
  
  // Calculate totals
  const totalAllTime = useMemo(() => {
    return locationData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  }, [locationData])
  
  const totalThisMonth = useMemo(() => {
    const now = new Date()
    const thisMonthData = locationData.filter(item => {
      const itemDate = new Date(item.operational_date)
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
    })
    return thisMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  }, [locationData])
  
  const totalLastMonth = useMemo(() => {
    const now = new Date()
    const lastMonthData = locationData.filter(item => {
      const itemDate = new Date(item.operational_date)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear()
    })
    return lastMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  }, [locationData])
  
  const trendPercent = useMemo(() => {
    if (totalLastMonth === 0) return 0
    return ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
  }, [totalThisMonth, totalLastMonth])
  
  // Evolution data (last 6 months)
  const evolutionData = useMemo(() => {
    const monthMap = {}
    const now = new Date()
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = { key, value: 0, label: '' }
    }
    
    // Aggregate data
    locationData.forEach(item => {
      const itemDate = new Date(item.operational_date)
      const key = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
      if (monthMap[key]) {
        monthMap[key].value += parseFloat(item.amount || 0)
      }
    })
    
    // Format labels
    return Object.values(monthMap).map(item => {
      const [year, month] = item.key.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return {
        label: date.toLocaleDateString('ro-RO', { month: 'short' }),
        value: Math.round(item.value)
      }
    })
  }, [locationData])
  
  // Top 5 categories
  const top5Categories = useMemo(() => {
    const categoryMap = {}
    
    locationData.forEach(item => {
      const category = item.expenditure_type || 'Unknown'
      if (!categoryMap[category]) {
        categoryMap[category] = 0
      }
      categoryMap[category] += parseFloat(item.amount || 0)
    })
    
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [locationData])
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  if (locationData.length === 0) {
    return null // Nu afișa secțiunea dacă nu există date
  }
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
        <DollarSign className="w-6 h-6 mr-3 text-green-500" />
        Cheltuieli Locație
      </h2>
      
      {/* 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total All-Time */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cheltuieli</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {formatCurrency(totalAllTime)} RON
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">All-time</p>
        </div>
        
        {/* Luna Curentă */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Luna Curentă</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            {formatCurrency(totalThisMonth)} RON
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {new Date().toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        {/* Trend */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Trend</p>
          <p className={`text-2xl font-bold mt-2 flex items-center ${
            trendPercent >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {trendPercent >= 0 ? (
              <TrendingUp className="w-6 h-6 mr-2" />
            ) : (
              <TrendingDown className="w-6 h-6 mr-2" />
            )}
            {Math.abs(trendPercent).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">vs luna precedentă</p>
        </div>
      </div>
      
      {/* Mini grafic evoluție 6 luni */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Evoluție Ultimele 6 Luni
        </h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#cbd5e1"
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#cbd5e1"
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip 
              formatter={(value) => `${formatCurrency(value)} RON`}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #475569',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Top 5 Categorii */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
          Top 5 Categorii Cheltuieli
        </h3>
        <div className="space-y-3">
          {top5Categories.map((cat, idx) => {
            const percent = (cat.value / totalAllTime) * 100
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {idx + 1}. {cat.name}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(cat.value)} RON
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-12 text-right">
                    {percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Buton Vezi Toate */}
      <button
        onClick={() => navigate(`/expenditures?location=${encodeURIComponent(locationName)}`)}
        className="w-full btn-primary flex items-center justify-center space-x-2"
      >
        <span>📊 Vezi Toate Cheltuielile</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default LocationExpenses

