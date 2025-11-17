import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import DateRangeSelector from '../components/DateRangeSelector'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { ArrowLeft, Filter, TrendingUp, Building2 } from 'lucide-react'

const ExpendituresDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { department, category, dateRange: initialDateRange } = location.state || {}

  useEffect(() => {
    if (!department) {
      navigate('/expenditures')
    }
  }, [department, navigate])

  const [dateRange, setDateRange] = useState(
    initialDateRange || {
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  )

  const [expendituresData, setExpendituresData] = useState([])
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState(category || 'all')
  const [summaryGranularity, setSummaryGranularity] = useState('month') // 'day', 'month', 'quarter', 'year'
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Load expenditures data
  const loadExpendituresData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data')
      setExpendituresData(response.data || [])
    } catch (error) {
      console.error('Error loading expenditures detail:', error)
      toast.error('Eroare la încărcarea cheltuielilor pentru detalii')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpendituresData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter data for this department / category / date range
  const filteredData = useMemo(() => {
    let data = expendituresData
    if (!department) return []

    data = data.filter((item) => item.department_name === department)

    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)

    data = data.filter((item) => {
      const d = new Date(item.operational_date)
      return d >= start && d <= end
    })

    if (categoryFilter && categoryFilter !== 'all') {
      data = data.filter((item) => (item.expenditure_type || '') === categoryFilter)
    }

    return data
  }, [expendituresData, department, categoryFilter, dateRange])

  const categories = useMemo(() => {
    const set = new Set()
    filteredData.forEach((item) => {
      if (item.expenditure_type) set.add(item.expenditure_type)
    })
    return Array.from(set).sort()
  }, [filteredData])

  // Pagination calculations
  const paginatedData = useMemo(() => {
    if (rowsPerPage === 'all') {
      return filteredData
    }
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, rowsPerPage])

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all') return 1
    return Math.ceil(filteredData.length / rowsPerPage)
  }, [filteredData.length, rowsPerPage])

  const startIndex = rowsPerPage === 'all' ? 0 : (currentPage - 1) * rowsPerPage
  const endIndex = rowsPerPage === 'all' ? filteredData.length : Math.min(startIndex + rowsPerPage, filteredData.length)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, dateRange, department])

  // Reset to page 1 when rowsPerPage changes
  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value)
    setCurrentPage(1)
  }

  const availableDays = useMemo(() => {
    const daysSet = new Set()
    filteredData.forEach((item) => {
      if (item.operational_date) {
        const day = item.operational_date.split('T')[0]
        daysSet.add(day)
      }
    })
    return Array.from(daysSet).sort()
  }, [filteredData])

  // === DATA PENTRU GRAFICE (TREND + LOCAȚII) ===
  const trendData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    const isSingleMonth =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth()

    if (isSingleMonth) {
      const dayMap = {}
      filteredData.forEach((item) => {
        const dateObj = new Date(item.operational_date)
        const dayKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
          dateObj.getDate()
        ).padStart(2, '0')}`
        if (!dayMap[dayKey]) dayMap[dayKey] = 0
        dayMap[dayKey] += parseFloat(item.amount || 0)
      })

      return Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => {
          const [year, month, day] = key.split('-')
          const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          return {
            date: d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
            value: Math.round(value)
          }
        })
    }

    const monthMap = {}
    filteredData.forEach((item) => {
      const dateObj = new Date(item.operational_date)
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[monthKey]) monthMap[monthKey] = 0
      monthMap[monthKey] += parseFloat(item.amount || 0)
    })

    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, month] = key.split('-')
        const d = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          date: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
          value: Math.round(value)
        }
      })
  }, [filteredData, dateRange])

  const locationChartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const map = {}
    filteredData.forEach((item) => {
      const loc = item.location_name || 'Fără locație'
      if (!map[loc]) map[loc] = 0
      map[loc] += parseFloat(item.amount || 0)
    })

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  const locationSummary = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const map = {}
    filteredData.forEach((item) => {
      const loc = item.location_name || 'Fără locație'
      if (!map[loc]) {
        map[loc] = { total: 0, count: 0 }
      }
      map[loc].total += parseFloat(item.amount || 0)
      map[loc].count += 1
    })

    return Object.entries(map)
      .map(([location, info]) => ({ location, total: info.total, count: info.count }))
      .sort((a, b) => b.total - a.total)
  }, [filteredData])

  // Format currency - definit înainte de a fi folosit în useMemo
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0))
  }

  const detailInsights = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const total = filteredData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    const count = filteredData.length

    const byDay = {}
    filteredData.forEach((item) => {
      const key = item.operational_date?.split('T')[0]
      if (!key) return
      if (!byDay[key]) byDay[key] = 0
      byDay[key] += parseFloat(item.amount || 0)
    })

    const topDayEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]

    const insights = [
      {
        icon: '💰',
        title: 'Total cheltuieli pe această categorie',
        message: `În perioada selectată ai ${formatCurrency(total)} RON cheltuiți în ${department}${category ? ` / ${category}` : ''}.`,
        recommendation: ''
      },
      {
        icon: '🏬',
        title: 'Distribuția pe locații',
        message:
          locationSummary.length === 0
            ? 'Nu există suficiente date pe locații.'
            : `Cea mai mare parte a sumei vine din ${locationSummary[0].location} (${formatCurrency(
                locationSummary[0].total
              )} RON).`,
        recommendation: ''
      }
    ]

    if (topDayEntry) {
      const [day, value] = topDayEntry
      insights.push({
        icon: '📅',
        title: 'Zi cu vârf de cheltuieli',
        message: `Ziua cu cele mai mari cheltuieli este ${new Date(day).toLocaleDateString('ro-RO')} cu ${formatCurrency(
          value
        )} RON.`,
        recommendation: ''
      })
    }

    return insights
  }, [filteredData, department, category, locationSummary])

  if (!department) {
    return null
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenditures')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Cheltuieli</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Detalii cheltuială – {department}
                {category && ` / ${category}`}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Perioadă: {dateRange.startDate} – {dateRange.endDate}
              </p>
            </div>
          </div>
        </div>

        {/* Filters - Card de perioadă DEASUPRA grafurilor */}
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl shadow-xl border border-transparent relative z-[3000]">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[260px] max-w-md relative z-[3000]">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                <Filter className="w-4 h-4 mr-2 text-blue-500" />
                Perioadă
              </label>
              <DateRangeSelector
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                availableDays={availableDays}
                onChange={(range) => setDateRange(range)}
              />
            </div>

            {categories.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tip cheltuială
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">Toate</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Charts - 2 grafice pe același rând: evoluție + locații */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-[1]">
          {/* Trend */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6 relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Evoluție cheltuieli</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {dateRange.startDate} – {dateRange.endDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(
                    filteredData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  )}{' '}
                  RON
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end mt-1">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  Total perioadă
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuție pe locații */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6 relative z-[1]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-green-500" />
              Distribuție pe locații
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={locationChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {locationChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'][index % 6]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [
                    `${formatCurrency(value)} RON (${((value / locationChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                    name
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => `${value} (${formatCurrency(locationChartData.find(item => item.name === value)?.value || 0)} RON)`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights simplificate pentru această cheltuială */}
        {detailInsights.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Analiză AI pentru această cheltuială</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {detailInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-slate-900/40 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {insight.icon} {insight.title}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">{insight.message}</p>
                  {insight.recommendation && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{insight.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabel sumar pe locații - locațiile pe COLOANE */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Sumar pe locații ({locationSummary.length})
            </h2>
            {/* Selector granularitate */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Grupare:</label>
              <select
                value={summaryGranularity}
                onChange={(e) => setSummaryGranularity(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
              >
                <option value="day">Zi</option>
                <option value="month">Lună</option>
                <option value="quarter">Trimestru</option>
                <option value="year">An</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
                    {summaryGranularity === 'day' ? 'Data' : 
                     summaryGranularity === 'month' ? 'Lună' : 
                     summaryGranularity === 'quarter' ? 'Trimestru' : 'An'}
                  </th>
                  {locationSummary.map((loc) => (
                    <th
                      key={loc.location}
                      className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {loc.location}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Grupăm datele pe zi/lună/trimestru/an și locații în funcție de granularitate
                  const byPeriod = {}
                  
                  filteredData.forEach((item) => {
                    if (!item.operational_date) return
                    
                    const dateObj = new Date(item.operational_date)
                    let periodKey = ''
                    let periodLabel = ''
                    
                    switch (summaryGranularity) {
                      case 'day':
                        periodKey = item.operational_date.split('T')[0]
                        periodLabel = dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
                        break
                      case 'month':
                        periodKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                        periodLabel = dateObj.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
                        break
                      case 'quarter':
                        const quarter = Math.floor(dateObj.getMonth() / 3) + 1
                        periodKey = `${dateObj.getFullYear()}-Q${quarter}`
                        periodLabel = `T${quarter} ${dateObj.getFullYear()}`
                        break
                      case 'year':
                        periodKey = String(dateObj.getFullYear())
                        periodLabel = String(dateObj.getFullYear())
                        break
                      default:
                        periodKey = item.operational_date.split('T')[0]
                        periodLabel = dateObj.toLocaleDateString('ro-RO')
                    }
                    
                    const loc = item.location_name || 'Fără locație'
                    if (!byPeriod[periodKey]) {
                      byPeriod[periodKey] = {
                        label: periodLabel,
                        locations: {}
                      }
                    }
                    if (!byPeriod[periodKey].locations[loc]) {
                      byPeriod[periodKey].locations[loc] = 0
                    }
                    byPeriod[periodKey].locations[loc] += parseFloat(item.amount || 0)
                  })

                  // Sortăm perioadele
                  const periods = Object.keys(byPeriod).sort()

                  return periods.map((periodKey) => {
                    const period = byPeriod[periodKey]
                    const totals = locationSummary.reduce((acc, loc) => {
                      acc[loc.location] = period.locations[loc.location] || 0
                      return acc
                    }, {})
                    const rowTotal = Object.values(totals).reduce((sum, val) => sum + val, 0)

                    return (
                      <tr
                        key={periodKey}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                          {period.label}
                        </td>
                        {locationSummary.map((loc) => (
                          <td
                            key={loc.location}
                            className="px-3 py-2 text-right text-slate-900 dark:text-slate-100"
                          >
                            {totals[loc.location] > 0 ? formatCurrency(totals[loc.location]) : '-'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(rowTotal)}
                        </td>
                      </tr>
                    )
                  })
                })()}
                {/* Rând Total */}
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 font-semibold">
                  <td className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Total</td>
                  {locationSummary.map((loc) => (
                    <td
                      key={loc.location}
                      className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100"
                    >
                      {formatCurrency(loc.total)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      locationSummary.reduce((sum, loc) => sum + loc.total, 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed table pe fiecare înregistrare */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Înregistrări detaliate ({filteredData.length})
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Afișare:</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => handleRowsPerPageChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border-2 border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-2 text-sm font-medium bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-lg text-slate-900 dark:text-slate-100"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value="all">Toate</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Data</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Locație</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Tip</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Descriere</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Sursă</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Sumă (RON)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {item.operational_date
                        ? new Date(item.operational_date).toLocaleDateString('ro-RO')
                        : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {item.location_name || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {item.expenditure_type || '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      {item.description || <span className="text-slate-400 dark:text-slate-500">N/A</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        item.data_source === 'google_sheets'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : item.data_source === 'api_sync'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                      }`}>
                        {item.data_source === 'google_sheets' 
                          ? 'Google Sheets' 
                          : item.data_source === 'api_sync'
                          ? 'API Extern'
                          : item.data_source === 'bat_sync'
                          ? 'BAT Sync'
                          : 'Baza de date'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {rowsPerPage !== 'all' && totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {startIndex + 1}-{endIndex} din {filteredData.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                  disabled={currentPage === 1} 
                  className="px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                >
                  Înapoi
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-200 font-bold bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl shadow-lg">
                    Pag {currentPage}/{totalPages}
                  </span>
                </div>
                <button 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                  disabled={currentPage === totalPages} 
                  className="px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                >
                  Înainte
                </button>
              </div>
            </div>
          )}
          {rowsPerPage === 'all' && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Afișate toate {filteredData.length} înregistrări
              </span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ExpendituresDetail


