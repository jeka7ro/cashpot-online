import React, { useMemo } from 'react'
import { BarChart, Bar, PieChart, Pie, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList, Label } from 'recharts'
import { TrendingUp, PieChart as PieChartIcon, AreaChart as AreaChartIcon, Brain, Calendar } from 'lucide-react'

const ExpendituresAdvancedCharts = ({ expendituresData, dateRange, visibleCharts = {}, chartSizes = {}, chartVisibility = {} }) => {
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  // Helper: Get chart height based on size setting
  const getChartHeight = (chartId, defaultHeight = 300) => {
    const size = chartSizes[chartId] || 'L' // Default: Large
    const heights = {
      'S': Math.round(defaultHeight * 0.4),  // Small: 40%
      'M': Math.round(defaultHeight * 0.6),  // Medium: 60%
      'L': defaultHeight,                     // Large: 100%
      'XL': Math.round(defaultHeight * 1.5)  // XL: 150%
    }
    return heights[size] || defaultHeight
  }
  
  // Helper: Check if chart is visible
  const isChartVisible = (chartId) => {
    return chartVisibility[chartId] !== false // Default: true (visible)
  }
  
  // GRAFIC 1: Comparație Luna Curentă vs Precedentă
  const monthComparisonData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const deptMap = {}
    
    expendituresData.forEach(item => {
      const itemDate = new Date(item.operational_date)
      const dept = item.department_name || 'Unknown'
      
      // Skip Unknown
      if (dept.toLowerCase() === 'unknown') return
      
      if (!deptMap[dept]) {
        deptMap[dept] = { name: dept, current: 0, previous: 0 }
      }
      
      if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
        deptMap[dept].current += parseFloat(item.amount || 0)
      } else if (itemDate.getMonth() === currentMonth - 1 && itemDate.getFullYear() === currentYear) {
        deptMap[dept].previous += parseFloat(item.amount || 0)
      }
    })
    
    return Object.values(deptMap)
      .filter(d => d.current > 0 || d.previous > 0)
      .sort((a, b) => (b.current + b.previous) - (a.current + a.previous))
      .slice(0, 8) // Top 8
  }, [expendituresData])
  
  // GRAFIC 2: Heatmap Categorii x Locații
  const heatmapData = useMemo(() => {
    const matrix = {}
    const locations = new Set()
    
    expendituresData.forEach(item => {
      const dept = item.department_name || 'Unknown'
      const loc = item.location_name || 'Unknown'
      
      if (dept.toLowerCase() === 'unknown') return
      
      locations.add(loc)
      
      if (!matrix[dept]) matrix[dept] = {}
      if (!matrix[dept][loc]) matrix[dept][loc] = 0
      matrix[dept][loc] += parseFloat(item.amount || 0)
    })
    
    return {
      departments: Object.keys(matrix).slice(0, 6), // Top 6 departments
      locations: Array.from(locations),
      data: matrix
    }
  }, [expendituresData])
  
  // GRAFIC 3: Top 10 Categorii (Pie)
  const top10CategoriesData = useMemo(() => {
    const categoryMap = {}
    
    expendituresData.forEach(item => {
      const category = item.expenditure_type || 'Unknown'
      if (!categoryMap[category]) categoryMap[category] = 0
      categoryMap[category] += parseFloat(item.amount || 0)
    })
    
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [expendituresData])
  
  // GRAFIC 4: Stacked Area (Evoluție departamente)
  const stackedAreaData = useMemo(() => {
    const monthMap = {}
    const departments = new Set()
    
    expendituresData.forEach(item => {
      const itemDate = new Date(item.operational_date)
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
      const dept = item.department_name || 'Unknown'
      
      if (dept.toLowerCase() === 'unknown') return
      
      departments.add(dept)
      
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey }
      }
      if (!monthMap[monthKey][dept]) {
        monthMap[monthKey][dept] = 0
      }
      monthMap[monthKey][dept] += parseFloat(item.amount || 0)
    })
    
    const sortedData = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          month: date.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
          ...data
        }
      })
    
    return {
      data: sortedData.slice(-6), // Last 6 months
      departments: Array.from(departments).slice(0, 5) // Top 5 departments
    }
  }, [expendituresData])
  
  // GRAFIC 5: Trend Prediction (AI-style)
  const trendPredictionData = useMemo(() => {
    const monthMap = {}
    
    expendituresData.forEach(item => {
      const itemDate = new Date(item.operational_date)
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthMap[monthKey]) monthMap[monthKey] = 0
      monthMap[monthKey] += parseFloat(item.amount || 0)
    })
    
    const historical = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([monthKey, value]) => {
        const [year, month] = monthKey.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          month: date.toLocaleDateString('ro-RO', { month: 'short' }),
          actual: Math.round(value),
          predicted: null
        }
      })
    
    // Simple prediction: average of last 3 months
    const lastThree = historical.slice(-3).map(d => d.actual)
    const avgLast3 = lastThree.reduce((a, b) => a + b, 0) / lastThree.length
    
    // Trend slope
    const slope = (lastThree[2] - lastThree[0]) / 2
    
    // Predict next 3 months
    const predictions = []
    for (let i = 1; i <= 3; i++) {
      const predictedValue = avgLast3 + (slope * i)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + i)
      predictions.push({
        month: futureDate.toLocaleDateString('ro-RO', { month: 'short' }),
        actual: null,
        predicted: Math.round(predictedValue)
      })
    }
    
    return [...historical, ...predictions]
  }, [expendituresData])
  
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']
  
  // Helper: Get color for heatmap cell
  const getHeatmapColor = (value) => {
    if (value > 40000) return '#10b981' // Verde (>40K)
    if (value > 20000) return '#f59e0b' // Portocaliu (20-40K)
    return '#3b82f6' // Albastru (<20K)
  }
  
  return (
    <div className="space-y-6">
      
      {/* GRAFIC 1: Comparație Luni */}
      {visibleCharts.monthComparison !== false && isChartVisible('comparison') && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Comparație Luna Curentă vs Precedentă
          </h3>
          <ResponsiveContainer width="100%" height={getChartHeight('comparison', 300)}>
            <BarChart data={monthComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value) => `${formatCurrency(value)} RON`}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="current" name="Luna Curentă" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                <LabelList 
                  dataKey="current" 
                  position="top" 
                  formatter={(value) => formatCurrency(value)}
                  style={{ fontSize: '9px', fontWeight: 'bold', fill: '#1e40af' }}
                />
              </Bar>
              <Bar dataKey="previous" name="Luna Precedentă" fill="#10b981" radius={[8, 8, 0, 0]}>
                <LabelList 
                  dataKey="previous" 
                  position="top" 
                  formatter={(value) => formatCurrency(value)}
                  style={{ fontSize: '9px', fontWeight: 'bold', fill: '#059669' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* GRAFIC 2: Heatmap */}
      {visibleCharts.heatmap !== false && isChartVisible('heatmap') && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            🔥 Heatmap Categorii x Locații
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300">Departament</th>
                  {heatmapData.locations.map(loc => (
                    <th key={loc} className="px-4 py-2 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                      {loc}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.departments.map(dept => (
                  <tr key={dept}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{dept}</td>
                    {heatmapData.locations.map(loc => {
                      const value = heatmapData.data[dept]?.[loc] || 0
                      const color = getHeatmapColor(value)
                      return (
                        <td key={loc} className="px-4 py-2 text-right">
                          <div 
                            className="px-2 py-1 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {value > 0 ? formatCurrency(value) : '-'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end space-x-4 text-xs">
            <span className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded mr-1"></span> &gt;40K</span>
            <span className="flex items-center"><span className="w-4 h-4 bg-orange-500 rounded mr-1"></span> 20-40K</span>
            <span className="flex items-center"><span className="w-4 h-4 bg-blue-500 rounded mr-1"></span> &lt;20K</span>
          </div>
        </div>
      )}
      
      {/* GRAFIC 3: Top 10 Categorii (Pie) */}
      {visibleCharts.pieTop10 !== false && isChartVisible('topCategories') && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
            <PieChartIcon className="w-5 h-5 mr-2 text-purple-500" />
            🥧 Top 10 Categorii Cheltuieli (detaliat)
          </h3>
          <ResponsiveContainer width="100%" height={getChartHeight('topCategories', 350)}>
            <PieChart>
              <Pie
                data={top10CategoriesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {top10CategoriesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${formatCurrency(value)} RON`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* GRAFIC 4: Stacked Area (Evoluție Departamente) */}
      {visibleCharts.stackedArea !== false && isChartVisible('stackedArea') && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
            <AreaChartIcon className="w-5 h-5 mr-2 text-green-500" />
            📊 Evoluție Departamente (Stacked Area)
          </h3>
          <ResponsiveContainer width="100%" height={getChartHeight('stackedArea', 300)}>
            <AreaChart data={stackedAreaData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => `${formatCurrency(value)} RON`} />
              <Legend />
              {stackedAreaData.departments.map((dept, idx) => (
                <Area
                  key={dept}
                  type="monotone"
                  dataKey={dept}
                  stackId="1"
                  stroke={COLORS[idx]}
                  fill={COLORS[idx]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* GRAFIC 5: Trend Prediction cu AI */}
      {visibleCharts.trendPrediction !== false && isChartVisible('aiTrend') && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-pink-500" />
            🤖 Predicție Trend (AI) - Următoarele 3 Luni
          </h3>
          <ResponsiveContainer width="100%" height={getChartHeight('aiTrend', 300)}>
            <LineChart data={trendPredictionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => `${formatCurrency(value)} RON`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="actual" 
                name="Realizat" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 5 }}
                connectNulls={false}
              >
                <LabelList 
                  dataKey="actual" 
                  position="top" 
                  formatter={(value) => value ? formatCurrency(value) : ''}
                  style={{ fontSize: '9px', fontWeight: 'bold', fill: '#1e40af' }}
                />
              </Line>
              <Line 
                type="monotone" 
                dataKey="predicted" 
                name="Predicție (AI)" 
                stroke="#ec4899" 
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ r: 5, fill: '#ec4899' }}
                connectNulls={false}
              >
                <LabelList 
                  dataKey="predicted" 
                  position="top" 
                  formatter={(value) => value ? formatCurrency(value) : ''}
                  style={{ fontSize: '9px', fontWeight: 'bold', fill: '#be185d' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            💡 <strong>Predicție bazată pe:</strong> Medie mobilă ultimele 3 luni + trend slope
          </p>
        </div>
      )}
      
    </div>
  )
}

export default ExpendituresAdvancedCharts

