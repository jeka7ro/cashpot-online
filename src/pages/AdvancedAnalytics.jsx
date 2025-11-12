import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Brain } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import ExpendituresAdvancedCharts from '../components/ExpendituresAdvancedCharts'
import { generateAIInsights } from '../utils/aiInsights'

const AdvancedAnalytics = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Check permissions
  useEffect(() => {
    if (user && !user.permissions?.expenditures) {
      toast.error('Nu aveți permisiuni pentru această pagină')
      navigate('/dashboard')
    }
  }, [user, navigate])
  
  const [expendituresData, setExpendituresData] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Filters din modal-ul vechi (PĂSTRĂM TOT!)
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [analysisType, setAnalysisType] = useState('trends') // trends, comparison, distribution
  
  // Date range pentru graficele NOI
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear() - 2, 0, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  })
  
  // Visible charts pentru graficele NOI (4)
  const [visibleCharts, setVisibleCharts] = useState({
    heatmap: true,
    pieTop10: true,
    stackedArea: true,
    trendPrediction: true
  })
  
  // Load expenditures data
  const loadExpendituresData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data')
      setExpendituresData(response.data)
      console.log('✅ Advanced Analytics: data loaded:', response.data.length)
    } catch (error) {
      console.error('Error loading expenditures:', error)
      toast.error('Eroare la încărcarea cheltuielilor')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadExpendituresData()
  }, [])
  
  // === TOATĂ LOGICA DIN MODAL VECHI ===
  
  // Get unique departments (EXCLUDE Unknown, POS, Bancă, Registru, Alte Cheltuieli)
  const departments = useMemo(() => {
    const EXCLUDED_DEPTS = ['Unknown', 'POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
    return [...new Set(expendituresData.map(item => item.department_name))]
      .filter(dept => dept && !EXCLUDED_DEPTS.includes(dept))
      .sort()
  }, [expendituresData])
  
  // Get categories filtered by selected department (CASCADE)
  const categories = useMemo(() => {
    let filteredData = expendituresData
    
    if (selectedDepartment !== 'all') {
      filteredData = filteredData.filter(item => item.department_name === selectedDepartment)
    }
    
    return [...new Set(filteredData.map(item => item.expenditure_type))].filter(Boolean).sort()
  }, [expendituresData, selectedDepartment])
  
  const locations = useMemo(() => {
    return [...new Set(expendituresData.map(item => item.location_name))].filter(Boolean).sort()
  }, [expendituresData])
  
  // Reset category when department changes
  useEffect(() => {
    setSelectedCategory('all')
  }, [selectedDepartment])
  
  // Calculate comparative analysis
  const getComparativeData = () => {
    let filtered = expendituresData
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.department_name === selectedDepartment)
    }
    
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
        monthlyData[monthKey] = { month: monthName, amount: 0, sortKey: monthKey }
      }
      monthlyData[monthKey].amount += parseFloat(item.amount || 0)
    })
    
    return Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }
  
  // Location comparison
  const getLocationComparison = () => {
    const locMap = {}
    
    let filtered = expendituresData
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.department_name === selectedDepartment)
    }
    
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
  
  // Generate AI Insights
  const filteredInsights = useMemo(() => {
    let filtered = expendituresData
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.department_name === selectedDepartment)
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.expenditure_type === selectedCategory)
    }
    
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location_name === selectedLocation)
    }
    
    return generateAIInsights(filtered, { startDate: '', endDate: '' })
  }, [expendituresData, selectedDepartment, selectedCategory, selectedLocation])
  
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }
  
  // Calculate insights
  const totalAmount = expendituresData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const avgPerLocation = totalAmount / (locations.length || 1)
  const highestLocation = locationComparisonData[0]
  const lowestLocation = locationComparisonData[locationComparisonData.length - 1]
  
  // Filter data pentru graficele NOI
  const filteredExpenditures = useMemo(() => {
    let filtered = expendituresData
    
    // EXCLUDE "Unknown"
    filtered = filtered.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    
    // DATE RANGE FILTER pentru graficele NOI
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.operational_date)
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        return itemDate >= startDate && itemDate <= endDate
      })
    }
    
    return filtered
  }, [expendituresData, dateRange])
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header cu Back Button */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/expenditures')}
                className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">← Înapoi la Cheltuieli</span>
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
                  <BarChart3 className="w-8 h-8 mr-3 text-purple-500" />
                  📊 Analiză Avansată
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Comparații inteligente și insights financiare
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="card p-12 text-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-lg text-slate-600 dark:text-slate-400">Se încarcă datele...</p>
            </div>
          </div>
        )}
        
        {!loading && expendituresData.length > 0 && (
          <>
            {/* === SECȚIUNEA A: TOT CE ERA ÎN MODAL VECHI === */}
            <div className="card p-8">
              {/* Filtre (4 dropdown-uri) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Departament Filter (CASCADE) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    🏢 Departament
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
                  >
                    <option value="all">✓ Toate Departamentele</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {selectedDepartment !== 'all' && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                      → Categorii filtrate automat
                    </p>
                  )}
                </div>
                
                {/* Categorie Filter (FILTRAT CASCADE) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    💰 Categorie Cheltuială
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={categories.length === 0}
                  >
                    <option value="all">✓ Toate Categoriile</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {selectedDepartment !== 'all' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {categories.length} categor{categories.length === 1 ? 'ie' : 'ii'} în {selectedDepartment}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    📍 Locație
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
                    📊 Tip Analiză
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
              
              {/* Carduri Stats (4) */}
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
              
              {/* Grafice VECHI (3) - depinde de Tip Analiză */}
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
                          tickFormatter={(value) => formatCurrency(value)}
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
                          tickFormatter={(value) => formatCurrency(value)}
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
                          tickFormatter={(value) => formatCurrency(value)}
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
            
            {/* === SECȚIUNEA B: GRAFICE NOI (4) === */}
            {filteredExpenditures.length > 0 && (
              <ExpendituresAdvancedCharts 
                expendituresData={filteredExpenditures}
                dateRange={dateRange}
                visibleCharts={visibleCharts}
              />
            )}
          </>
        )}
        
        {/* Empty State */}
        {!loading && expendituresData.length === 0 && (
          <div className="card p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Nu există date disponibile</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Sincronizează date pentru analiză</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AdvancedAnalytics
