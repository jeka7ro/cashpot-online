import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { ArrowLeft, BarChart3, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ExpendituresAdvancedCharts from '../components/ExpendituresAdvancedCharts'
import DateRangeSelector from '../components/DateRangeSelector'

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
  
  // Date range filter
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear() - 2, 0, 1).toISOString().split('T')[0], // 2023-01-01
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]      // 2025-12-31
  })
  
  // Visible charts (toate afișate by default)
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
      console.log('✅ Advanced Analytics: Expenditures data loaded:', response.data.length)
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
  
  // Filter data by date range
  const filteredExpenditures = React.useMemo(() => {
    let filtered = expendituresData
    
    // EXCLUDE "Unknown" FORȚAT
    filtered = filtered.filter(item => {
      const dept = (item.department_name || '').toLowerCase().trim()
      return dept !== 'unknown' && dept !== '' && dept !== 'null'
    })
    
    // DATE RANGE FILTER
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.operational_date)
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        return itemDate >= startDate && itemDate <= endDate
      })
    }
    
    console.log(`🔍 Advanced Analytics: Filtrat ${filtered.length} înregistrări din ${expendituresData.length} total`)
    
    return filtered
  }, [expendituresData, dateRange])
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/expenditures/pos-banca')}
                className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">Înapoi la Cheltuieli</span>
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
                  <BarChart3 className="w-8 h-8 mr-3 text-purple-500" />
                  Analiză Avansată Cheltuieli
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Grafice avansate pentru analiza detaliată a cheltuielilor
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Înregistrări</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{filteredExpenditures.length}</p>
              </div>
            </div>
          </div>
          
          {/* Date Range Selector */}
          <div className="mt-6">
            <DateRangeSelector 
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
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
        
        {/* Advanced Charts Section */}
        {!loading && filteredExpenditures.length > 0 && (
          <ExpendituresAdvancedCharts 
            expendituresData={filteredExpenditures}
            dateRange={dateRange}
            visibleCharts={visibleCharts}
          />
        )}
        
        {/* Empty State */}
        {!loading && filteredExpenditures.length === 0 && (
          <div className="card p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Nu există date pentru perioada selectată</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Modifică filtrul de date sau sincronizează date noi</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AdvancedAnalytics

