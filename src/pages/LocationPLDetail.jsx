import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useData } from '../contexts/DataContext'

const LocationPLDetail = () => {
  const { locationName } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { locations, expendituresData } = useData()
  
  const [incomeData, setIncomeData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Parse dateRange from URL
  const dateRange = useMemo(() => {
    const dateRangeParam = searchParams.get('dateRange')
    if (!dateRangeParam) {
      // Default to current month
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }
    const [startDate, endDate] = dateRangeParam.split('_')
    return { startDate, endDate }
  }, [searchParams])
  
  // Find location
  const location = useMemo(() => {
    return locations.find(loc => loc.name === decodeURIComponent(locationName))
  }, [locations, locationName])
  
  // Filter expenses for this location
  const locationExpenses = useMemo(() => {
    if (!expendituresData) return []
    return expendituresData.filter(item => 
      item.location_id === location?.id || 
      item.location_name === decodeURIComponent(locationName)
    )
  }, [expendituresData, location, locationName])
  
  // Calculate expenses for date range
  const expensesForPeriod = useMemo(() => {
    const filtered = locationExpenses.filter(item => {
      const itemDate = new Date(item.operational_date)
      const start = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      return itemDate >= start && itemDate <= end
    })
    return filtered.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  }, [locationExpenses, dateRange])
  
  // Fetch income data
  useEffect(() => {
    const fetchIncomeData = async () => {
      setLoading(true)
      try {
        const response = await axios.get('/api/incasari/avg-in-by-location', {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        })
        if (response.data?.success && Array.isArray(response.data.rows)) {
          const decodedLocationName = decodeURIComponent(locationName)
          const locationIncome = response.data.rows.find(
            item => {
              const itemLocationName = item.locationName || ''
              return itemLocationName === decodedLocationName || 
                     itemLocationName.toLowerCase() === decodedLocationName.toLowerCase()
            }
          )
          if (locationIncome) {
            setIncomeData(locationIncome)
          } else {
            console.log('Location not found in response:', {
              searched: decodedLocationName,
              available: response.data.rows.map(r => r.locationName)
            })
            setIncomeData(null)
          }
        }
      } catch (error) {
        console.error('Error fetching income data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (locationName && dateRange.startDate && dateRange.endDate) {
      fetchIncomeData()
    }
  }, [locationName, dateRange])
  
  // Calculate P&L
  const plData = useMemo(() => {
    if (!incomeData) return null
    const ggr = Number(incomeData.totalProfit || 0)
    const expenses = expensesForPeriod
    const pl = ggr - expenses
    const totalIn = Number(incomeData.totalIn || 0)
    const profitPercent = totalIn > 0 ? (pl / totalIn) * 100 : 0
    return {
      ggr,
      expenses,
      pl,
      totalIn,
      profitPercent
    }
  }, [incomeData, expensesForPeriod])
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  const formatNumber = (value) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  return (
    <Layout>
      <div className="p-6">
        <button
          onClick={() => navigate('/incasari')}
          className="mb-4 flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Înapoi la Încasări
        </button>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-500" />
            P&L - {decodeURIComponent(locationName)}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Perioada: {dateRange.startDate} - {dateRange.endDate}
          </p>
          
          {loading ? (
            <div className="text-center py-8 text-slate-500">Se încarcă datele...</div>
          ) : plData ? (
            <>
              {/* P&L Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl">
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">GGR</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(plData.ggr)} RON
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-6 rounded-xl">
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">Cheltuieli</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(plData.expenses)} RON
                  </p>
                </div>
                
                <div className={`bg-gradient-to-br p-6 rounded-xl ${
                  plData.pl >= 0 
                    ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20' 
                    : 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20'
                }`}>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">P&L</p>
                  <p className={`text-3xl font-bold ${
                    plData.pl >= 0 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {formatCurrency(plData.pl)} RON
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    {plData.profitPercent >= 0 ? (
                      <span className="flex items-center text-green-600 dark:text-green-400">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {plData.profitPercent.toFixed(2)}% din IN
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 dark:text-red-400">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        {Math.abs(plData.profitPercent).toFixed(2)}% din IN
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-xl">
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">Total IN</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(plData.totalIn)} RON
                  </p>
                </div>
              </div>
              
              {/* Breakdown Table */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Detalii P&L
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">Indicator</th>
                        <th className="text-right py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">Valoare (RON)</th>
                        <th className="text-right py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">% din IN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">Total IN</td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-bold">
                          {formatCurrency(plData.totalIn)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">100.00%</td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">GGR</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-bold">
                          {formatCurrency(plData.ggr)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {plData.totalIn > 0 ? ((plData.ggr / plData.totalIn) * 100).toFixed(2) : '0.00'}%
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">Cheltuieli</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-bold">
                          {formatCurrency(plData.expenses)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {plData.totalIn > 0 ? ((plData.expenses / plData.totalIn) * 100).toFixed(2) : '0.00'}%
                        </td>
                      </tr>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-bold text-lg">P&L</td>
                        <td className={`py-3 px-4 text-right font-bold text-lg ${
                          plData.pl >= 0 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {formatCurrency(plData.pl)}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold text-lg ${
                          plData.pl >= 0 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {plData.profitPercent.toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Nu există date pentru această locație în perioada selectată.
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default LocationPLDetail

