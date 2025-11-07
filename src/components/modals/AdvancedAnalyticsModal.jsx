import React, { useState, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Brain } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { generateAIInsights } from '../../utils/aiInsights'

const AdvancedAnalyticsModal = ({ onClose, expendituresData }) => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [analysisType, setAnalysisType] = useState('trends') // trends, comparison, distribution
  
  // Get unique categories and locations
  const categories = useMemo(() => {
    return [...new Set(expendituresData.map(item => item.expenditure_type))].filter(Boolean).sort()
  }, [expendituresData])
  
  const locations = useMemo(() => {
    return [...new Set(expendituresData.map(item => item.location_name))].filter(Boolean).sort()
  }, [expendituresData])
  
  const departments = useMemo(() => {
    return [...new Set(expendituresData.map(item => item.department_name))].filter(Boolean).sort()
  }, [expendituresData])
  
  // Calculate comparative analysis
  const getComparativeData = () => {
    let filtered = expendituresData
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.expenditure_type === selectedCategory)
    }
    
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location_name === selectedLocation)
    }
    
    // Group by month
    const monthlyData = {}
    filtered.forEach(item => {
      const date = new Date(item.operational_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'short' })
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, amount: 0 }
      }
      monthlyData[monthKey].amount += parseFloat(item.amount || 0)
    })
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  }
  
  // Location comparison
  const getLocationComparison = () => {
    const locMap = {}
    
    let filtered = expendituresData
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.expenditure_type === selectedCategory)
    }
    
    filtered.forEach(item => {
      const loc = item.location_name || 'Unknown'
      if (!locMap[loc]) {
        locMap[loc] = 0
      }
      locMap[loc] += parseFloat(item.amount || 0)
    })
    
    return Object.entries(locMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }
  
  // Department radar chart
  const getDepartmentRadar = () => {
    const deptMap = {}
    
    departments.forEach(dept => {
      deptMap[dept] = 0
    })
    
    let filtered = expendituresData
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location_name === selectedLocation)
    }
    
    filtered.forEach(item => {
      const dept = item.department_name || 'Unknown'
      if (deptMap[dept] !== undefined) {
        deptMap[dept] += parseFloat(item.amount || 0)
      }
    })
    
    return Object.entries(deptMap)
      .map(([subject, value]) => ({ subject, value }))
      .filter(item => item.value > 0)
  }
  
  const trendData = getComparativeData()
  const locationComparisonData = getLocationComparison()
  const radarData = getDepartmentRadar()
  
  // Generate AI Insights for filtered data
  const filteredInsights = useMemo(() => {
    let filtered = expendituresData
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.expenditure_type === selectedCategory)
    }
    
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location_name === selectedLocation)
    }
    
    return generateAIInsights(filtered, { startDate: '', endDate: '' })
  }, [expendituresData, selectedCategory, selectedLocation])
  
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }
  
  // Calculate insights
  const totalAmount = expendituresData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const avgPerLocation = totalAmount / (locations.length || 1)
  const highestLocation = locationComparisonData[0]
  const lowestLocation = locationComparisonData[locationComparisonData.length - 1]
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3" />
              📊 Analiză Avansată
            </h2>
            <p className="text-blue-100 mt-2">Comparații inteligente și insights financiare</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Categorie Cheltuială
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toate Categoriile</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Locație
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toate Locațiile</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Tip Analiză
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="trends">Evoluție Lunară</option>
                <option value="comparison">Comparație Locații</option>
                <option value="distribution">Distribuție Departamente</option>
              </select>
            </div>
          </div>
          
          {/* Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Analizat</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(trendData.reduce((s, d) => s + d.amount, 0))} RON
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Medie/Locație</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(avgPerLocation)} RON
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-2xl">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Cea mai mare
              </p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {highestLocation?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatCurrency(highestLocation?.value || 0)} RON
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center">
                <TrendingDown className="w-4 h-4 mr-1" />
                Cea mai mică
              </p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {lowestLocation?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatCurrency(lowestLocation?.value || 0)} RON
              </p>
            </div>
          </div>
          
          {/* Charts */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6">
            {analysisType === 'trends' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  📈 Evoluție Lunară Cheltuieli
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {analysisType === 'comparison' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  📊 Comparație Locații
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={locationComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      style={{ fontSize: '11px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {locationComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {analysisType === 'distribution' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  🎯 Distribuție Departamente
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      stroke="#64748b"
                      style={{ fontSize: '11px' }}
                    />
                    <PolarRadiusAxis 
                      stroke="#64748b"
                      style={{ fontSize: '10px' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Radar 
                      name="Cheltuieli" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* AI Insights Section */}
          <div className="mt-8">
            <div className="flex items-center space-x-3 mb-6">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                🤖 AI Insights Detaliate
              </h3>
            </div>
            
            {filteredInsights.length === 0 ? (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 text-center">
                <Brain className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 dark:text-slate-400">
                  Nu există suficiente date pentru analiză AI cu filtrele selectate
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInsights.map((insight, idx) => {
                  const gradients = [
                    'from-blue-500 to-purple-600',
                    'from-green-500 to-teal-600',
                    'from-orange-500 to-pink-600',
                    'from-red-500 to-rose-600',
                    'from-cyan-500 to-blue-600',
                    'from-purple-500 to-indigo-600'
                  ]
                  const gradient = gradients[idx % gradients.length]
                  
                  return (
                    <div key={idx} className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white`}>
                      <h4 className="text-lg font-bold mb-3 flex items-center">
                        <span className="text-2xl mr-2">{insight.icon}</span>
                        {insight.title}
                      </h4>
                      <p className="text-white/90 text-sm mb-3 leading-relaxed">
                        {insight.message}
                      </p>
                      {insight.recommendation && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                          <p className="text-xs font-semibold text-white">
                            💡 {insight.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedAnalyticsModal

