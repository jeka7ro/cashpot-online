import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext' // Import DataContext for visibleLocations
import axios from 'axios'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  PieChart,
  ArrowRight,
  Calendar,
  RefreshCw
} from 'lucide-react'

const Dashboard = () => {
  const { user, token } = useAuth()
  const { visibleLocations } = useData() // Get visibleLocations from DataContext
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [activeFilter, setActiveFilter] = useState('currentYear') // Track active filter
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  })

  // Load dashboard summary data
  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch the entire range + previous year for comparison, just like P&L
      const start = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      const fetchStart = `${start.getFullYear() - 1}-01-01`
      const fetchEnd = `${end.getFullYear()}-12-31`

      // Build params with visibleLocations filter (EXACT SAME AS P&L PAGE)
      const params = {
        startDate: fetchStart,
        endDate: fetchEnd
      }

      if (visibleLocations && visibleLocations.length > 0) {
        params.includeLocations = visibleLocations.join(',')
      }

      const response = await axios.get('/api/incasari/monthly-by-location', {
        params: {
          ...params,
          _t: Date.now()
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (response.data?.success && Array.isArray(response.data.rows)) {
        let currentGgr = 0, currentExp = 0, currentPl = 0
        let prevGgr = 0, prevExp = 0, prevPl = 0
        
        // Count distinct locations that had activity (for "Cheltuieli" transactions approximation and locations count)
        const activeLocationsSet = new Set()
        let expCountApproximation = 0

        const sDate = new Date(dateRange.startDate)
        const eDate = new Date(dateRange.endDate)

        response.data.rows.forEach(row => {
          const rowDate = new Date(row.year, row.month - 1, 1)

          // Current period constraint (matching year/month)
          const matchesCurrent = rowDate >= new Date(sDate.getFullYear(), sDate.getMonth(), 1) &&
                                 rowDate <= new Date(eDate.getFullYear(), eDate.getMonth(), 1)
          
          // Previous period constraint
          const matchesPrevious = rowDate >= new Date(sDate.getFullYear() - 1, sDate.getMonth(), 1) &&
                                  rowDate <= new Date(eDate.getFullYear() - 1, eDate.getMonth(), 1)
          
          const ggr = Number(row.totalGgr || 0)
          const exp = Number(row.totalExpenditures || 0)
          const pl = ggr - exp

          if (matchesCurrent) {
            currentGgr += ggr
            currentExp += exp
            currentPl += pl
            if (ggr !== 0 || exp !== 0) activeLocationsSet.add(row.locationName)
            if (exp > 0) expCountApproximation += 1 // simple approximation
          }
          if (matchesPrevious) {
            prevGgr += ggr
            prevExp += exp
            prevPl += pl
          }
        })

        const calculateTrend = (cur, prev) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : 0

        setDashboardData({
          pl: {
            profit: currentPl,
            margin: currentGgr > 0 ? (currentPl / currentGgr) * 100 : 0,
            trend: calculateTrend(currentPl, prevPl)
          },
          expenses: {
            total: currentExp,
            count: expCountApproximation,
            trend: calculateTrend(currentExp, prevExp)
          },
          revenue: {
            total: currentGgr,
            locations: activeLocationsSet.size,
            trend: calculateTrend(currentGgr, prevGgr)
          }
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Eroare la încărcarea datelor dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [dateRange, visibleLocations]) // Re-fetch when visibleLocations change


  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '0'
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format percentage
  const formatPercent = (value) => {
    if (!value) return '0%'
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }


  // Helper function to format date in local timezone (YYYY-MM-DD)
  const formatLocalDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Quick date range presets
  const applyQuickDateFilter = (filter) => {
    const today = new Date()
    let startDate, endDate

    switch (filter) {
      case 'today':
        startDate = endDate = formatLocalDate(today)
        break
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        startDate = formatLocalDate(weekStart)
        endDate = formatLocalDate(today)
        break
      case 'currentMonth':
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate = formatLocalDate(currentMonthStart)
        endDate = formatLocalDate(today)
        break
      case 'previousMonth':
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
        startDate = formatLocalDate(prevMonthStart)
        endDate = formatLocalDate(prevMonthEnd)
        break
      case 'currentYear':
        const currentYearStart = new Date(today.getFullYear(), 0, 1)
        startDate = formatLocalDate(currentYearStart)
        endDate = formatLocalDate(today)
        break
      case 'previousYear':
        const prevYearStart = new Date(today.getFullYear() - 1, 0, 1)
        const prevYearEnd = new Date(today.getFullYear() - 1, 11, 31)
        startDate = formatLocalDate(prevYearStart)
        endDate = formatLocalDate(prevYearEnd)
        break
      case 'all':
        // All data for 2026
        startDate = '2026-01-01'
        endDate = '2026-12-31'
        break
      default:
        return
    }

    setActiveFilter(filter) // Update active filter
    setDateRange({ startDate, endDate })
  }


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Se încarcă dashboard-ul...</p>
          </div>
        </div>
      </Layout>
    )
  }

  const plData = dashboardData?.pl || {}
  const expensesData = dashboardData?.expenses || {}
  const revenueData = dashboardData?.revenue || {}

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Bun venit, {user?.name || 'User'}! Aici găsești o privire de ansamblu asupra afacerii.
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => applyQuickDateFilter('today')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'today'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Azi
            </button>
            <button
              onClick={() => applyQuickDateFilter('week')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'week'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Săpt
            </button>
            <button
              onClick={() => applyQuickDateFilter('currentMonth')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'currentMonth'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Luna curentă
            </button>
            <button
              onClick={() => applyQuickDateFilter('previousMonth')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'previousMonth'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Luna trecută
            </button>
            <button
              onClick={() => applyQuickDateFilter('currentYear')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'currentYear'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Anul curent
            </button>
            <button
              onClick={() => applyQuickDateFilter('previousYear')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'previousYear'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Anul trecut
            </button>
            <button
              onClick={() => applyQuickDateFilter('all')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeFilter === 'all'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
              Toate
            </button>
            <button
              onClick={loadDashboardData}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Reîmprospătează"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Hero Cards - P&L, Cheltuieli, Încasări */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* P&L Card */}
          <div
            onClick={() => navigate('/pl')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <PieChart className="w-8 h-8 text-white" />
                </div>
                {plData.trend && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${plData.trend > 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                    }`}>
                    {plData.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatPercent(plData.trend)}
                  </div>
                )}
              </div>

              <h3 className="text-white/80 text-sm font-medium mb-2">Profit & Loss</h3>
              <p className="text-4xl font-bold text-white mb-1">
                {formatCurrency(plData.profit || 0)} <span className="text-xl">RON</span>
              </p>
              <p className="text-white/60 text-sm mb-4">
                Marja: {formatPercent(plData.margin || 0)}
              </p>

              <div className="flex items-center text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                Vezi detalii <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Cheltuieli Card */}
          <div
            onClick={() => navigate('/expenditures')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Receipt className="w-8 h-8 text-white" />
                </div>
                {expensesData.trend && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${expensesData.trend < 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                    }`}>
                    {expensesData.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {formatPercent(Math.abs(expensesData.trend))}
                  </div>
                )}
              </div>

              <h3 className="text-white/80 text-sm font-medium mb-2">Cheltuieli</h3>
              <p className="text-4xl font-bold text-white mb-1">
                {formatCurrency(expensesData.total || 0)} <span className="text-xl">RON</span>
              </p>
              <p className="text-white/60 text-sm mb-4">
                {expensesData.count || 0} tranzacții
              </p>

              <div className="flex items-center text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                Vezi detalii <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Încasări Card */}
          <div
            onClick={() => navigate('/incasari/dashboard')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                {revenueData.trend && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${revenueData.trend > 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                    }`}>
                    {revenueData.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatPercent(revenueData.trend)}
                  </div>
                )}
              </div>

              <h3 className="text-white/80 text-sm font-medium mb-2">Încasări</h3>
              <p className="text-4xl font-bold text-white mb-1">
                {formatCurrency(revenueData.total || 0)} <span className="text-xl">RON</span>
              </p>
              <p className="text-white/60 text-sm mb-4">
                {revenueData.locations || 0} locații active
              </p>

              <div className="flex items-center text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                Vezi detalii <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Venit Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(revenueData.total || 0)} RON
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Cheltuieli Totale</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(expensesData.total || 0)} RON
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Profit Net</p>
            <p className={`text-2xl font-bold ${(plData.profit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
              {formatCurrency(plData.profit || 0)} RON
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Marja Profit</p>
            <p className={`text-2xl font-bold ${(plData.margin || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
              {formatPercent(plData.margin || 0)}
            </p>
          </div>
        </div>

        {/* Period Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">
              Perioada selectată: {new Date(dateRange.startDate).toLocaleDateString('ro-RO')} - {new Date(dateRange.endDate).toLocaleDateString('ro-RO')}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
