import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, FileSpreadsheet, Filter, Download } from 'lucide-react'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart
} from 'recharts'

const IncasariSmartAnalytics = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return {
      startDate: formatDateLocal(start),
      endDate: formatDateLocal(end)
    }
  })

  const [filtersMeta, setFiltersMeta] = useState({
    locations: [],
    providers: [],
    cabinets: [],
    gameMixes: []
  })

  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedCabinet, setSelectedCabinet] = useState('all')
  const [selectedGameMix, setSelectedGameMix] = useState('all')

  const [analyticsData, setAnalyticsData] = useState({
    byLocation: [],
    byProvider: [],
    byCabinet: [],
    byGameMix: [],
    dailyStats: [],
    summary: {
      totalIn: 0,
      totalGgr: 0,
      totalBet: 0,
      slotsCount: 0,
      averageDrop: 0
    }
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const resp = await axios.get('/api/incasari/filters-metadata')
        if (resp.data?.success) {
          setFiltersMeta({
            locations: resp.data.locations || [],
            providers: resp.data.providers || [],
            cabinets: resp.data.cabinets || [],
            gameMixes: resp.data.gameMixes || []
          })
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea meta-datelor:', error)
      }
    }
    loadFilters()
  }, [])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const { startDate, endDate } = dateRange

        const params = {
          startDate,
          endDate,
          location: selectedLocation !== 'all' ? selectedLocation : undefined,
          provider: selectedProvider !== 'all' ? selectedProvider : undefined,
          cabinet: selectedCabinet !== 'all' ? selectedCabinet : undefined,
          gameMix: selectedGameMix !== 'all' ? selectedGameMix : undefined
        }

        // Fetch toate datele în paralel
        const [summaryResp, dailyResp, locationResp, providerResp, cabinetResp, gameMixResp] = await Promise.all([
          axios.get('/api/incasari/summary', { params }),
          axios.get('/api/incasari/daily-stats', { params }),
          axios.get('/api/incasari/avg-in-by-location', { params }),
          axios.get('/api/incasari/avg-in-by-provider', { params: { ...params, groupBy: 'provider' } }),
          axios.get('/api/incasari/avg-in-by-cabinet', { params }),
          axios.get('/api/incasari/avg-in-by-game-mix', { params: { ...params, groupBy: 'gameMix' } })
        ])

        if (summaryResp.data?.success) {
          setAnalyticsData((prev) => ({
            ...prev,
            summary: {
              totalIn: summaryResp.data.totalIn || 0,
              totalGgr: summaryResp.data.totalProfit || 0,
              totalBet: summaryResp.data.totalBet || 0,
              slotsCount: summaryResp.data.slotsCount || 0,
              averageDrop: summaryResp.data.averageDrop || 0
            }
          }))
        }

        if (dailyResp.data?.success) {
          setAnalyticsData((prev) => ({
            ...prev,
            dailyStats: dailyResp.data.rows || []
          }))
        }

        if (locationResp.data?.success) {
          setAnalyticsData((prev) => ({
            ...prev,
            byLocation: locationResp.data.rows || []
          }))
        }

        // Pentru provider, cabinet, game mix - folosim endpoint-uri similare sau agregăm manual
        // Deocamdată folosim datele disponibile
        setAnalyticsData((prev) => ({
          ...prev,
          byProvider: providerResp.data?.rows || [],
          byCabinet: cabinetResp.data?.rows || [],
          byGameMix: gameMixResp.data?.rows || []
        }))
      } catch (error) {
        console.error('❌ Eroare la încărcarea datelor de analiză:', error)
        toast.error('Eroare la încărcarea datelor')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateRange, selectedLocation, selectedProvider, selectedCabinet, selectedGameMix])

  const handleDateChange = (range) => {
    setDateRange({ startDate: range.startDate, endDate: range.endDate })
  }

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0'
    const num = Number(value)
    if (Number.isNaN(num)) return '0'
    if (num % 1 === 0) {
      return num.toLocaleString('ro-RO', { maximumFractionDigits: 0 })
    }
    return num.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Pregătire date pentru grafice
  const locationChartData = useMemo(() => {
    return analyticsData.byLocation
      .sort((a, b) => (b.averageIn || 0) - (a.averageIn || 0))
      .slice(0, 10)
      .map((item) => ({
        name: item.locationName || 'N/A',
        averageIn: Number(item.averageIn || 0),
        totalIn: Number(item.totalIn || 0),
        ggr: Number(item.totalProfit || 0)
      }))
  }, [analyticsData.byLocation])

  const providerChartData = useMemo(() => {
    return analyticsData.byProvider
      .sort((a, b) => (b.averageIn || 0) - (a.averageIn || 0))
      .slice(0, 10)
      .map((item) => ({
        name: item.providerName || 'N/A',
        averageIn: Number(item.averageIn || 0),
        totalIn: Number(item.totalIn || 0),
        ggr: Number(item.totalProfit || 0)
      }))
  }, [analyticsData.byProvider])

  const cabinetChartData = useMemo(() => {
    return analyticsData.byCabinet
      .sort((a, b) => (b.averageIn || 0) - (a.averageIn || 0))
      .slice(0, 10)
      .map((item) => ({
        name: item.cabinetName || 'N/A',
        averageIn: Number(item.averageIn || 0),
        totalIn: Number(item.totalIn || 0),
        ggr: Number(item.totalProfit || 0)
      }))
  }, [analyticsData.byCabinet])

  const gameMixChartData = useMemo(() => {
    return analyticsData.byGameMix
      .sort((a, b) => (b.averageIn || 0) - (a.averageIn || 0))
      .slice(0, 10)
      .map((item) => ({
        name: item.gameMixName || 'N/A',
        averageIn: Number(item.averageIn || 0),
        totalIn: Number(item.totalIn || 0),
        ggr: Number(item.totalProfit || 0)
      }))
  }, [analyticsData.byGameMix])

  const dailyChartData = useMemo(() => {
    return analyticsData.dailyStats.map((d) => ({
      date: d.date,
      label: new Date(d.date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }),
      totalIn: Number(d.total_in || d.totalIn || 0),
      totalGgr: Number(d.total_profit || d.totalProfit || 0),
      totalBet: Number(d.total_bet || d.totalBet || 0)
    }))
  }, [analyticsData.dailyStats])

  // Funcții de export
  const exportToExcel = (data, sheetName, filename) => {
    try {
      const rows = [Object.keys(data[0] || {})]
      data.forEach((item) => {
        rows.push(Object.values(item))
      })
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, filename)
      toast.success('Export Excel realizat cu succes!')
    } catch (error) {
      console.error('Eroare la export Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  const pieColors = ['#22c55e', '#0ea5e9', '#6366f1', '#f97316', '#e11d48', '#14b8a6', '#a855f7', '#facc15', '#ef4444', '#8b5cf6']

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/incasari')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Încasări</span>
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Analiză Smart Încasări
            </h1>
          </div>
        </div>

        {/* Filtre */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <QuickDateButtons onChange={handleDateChange} />
            <div className="flex flex-wrap items-center gap-3 ml-auto">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-4 py-2.5 h-[38px] border border-slate-700"
              >
                <option value="all">Locație: Toate</option>
                {filtersMeta.locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-4 py-2.5 h-[38px] border border-slate-700"
              >
                <option value="all">Provider: Toți</option>
                {filtersMeta.providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={selectedCabinet}
                onChange={(e) => setSelectedCabinet(e.target.value)}
                className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-4 py-2.5 h-[38px] border border-slate-700"
              >
                <option value="all">Cabinet: Toate</option>
                {filtersMeta.cabinets.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedGameMix}
                onChange={(e) => setSelectedGameMix(e.target.value)}
                className="rounded-2xl bg-slate-900/60 text-slate-100 text-xs px-4 py-2.5 h-[38px] border border-slate-700"
              >
                <option value="all">Game Mix: Toate</option>
                {filtersMeta.gameMixes.map((gm) => (
                  <option key={gm} value={gm}>
                    {gm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DateRangeSelector
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateChange}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total IN</p>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {formatNumber(analyticsData.summary.totalIn)} RON
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total GGR</p>
            <p className="mt-2 text-xl font-bold text-emerald-500">
              {formatNumber(analyticsData.summary.totalGgr)} RON
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total BET</p>
            <p className="mt-2 text-xl font-bold text-blue-500">
              {formatNumber(analyticsData.summary.totalBet)} RON
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Sloturi active</p>
            <p className="mt-2 text-xl font-bold text-fuchsia-500">
              {formatNumber(analyticsData.summary.slotsCount)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Average Drop</p>
            <p className="mt-2 text-xl font-bold text-purple-500">
              {formatNumber(analyticsData.summary.averageDrop)} RON/zi
            </p>
          </div>
        </div>

        {/* Grafice pe categorii */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analiză pe Locații */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Top 10 Locații - IN mediu
              </h2>
              <button
                onClick={() => exportToExcel(locationChartData, 'Locații', `Incasari_Locatii_${dateRange.startDate}_${dateRange.endDate}.xlsx`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="h-80">
              {locationChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Nu există date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip
                      formatter={(value) => formatNumber(value)}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                    <Bar dataKey="averageIn" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Analiză pe Provideri */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Top 10 Provideri - IN mediu
              </h2>
              <button
                onClick={() => exportToExcel(providerChartData, 'Provideri', `Incasari_Provideri_${dateRange.startDate}_${dateRange.endDate}.xlsx`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="h-80">
              {providerChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Nu există date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={providerChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip
                      formatter={(value) => formatNumber(value)}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                    <Bar dataKey="averageIn" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Analiză pe Cabinete */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Top 10 Cabinete - IN mediu
              </h2>
              <button
                onClick={() => exportToExcel(cabinetChartData, 'Cabinete', `Incasari_Cabinete_${dateRange.startDate}_${dateRange.endDate}.xlsx`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="h-80">
              {cabinetChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Nu există date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cabinetChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip
                      formatter={(value) => formatNumber(value)}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                    <Bar dataKey="averageIn" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Analiză pe Game Mix */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Top 10 Game Mix - IN mediu
              </h2>
              <button
                onClick={() => exportToExcel(gameMixChartData, 'Game Mix', `Incasari_GameMix_${dateRange.startDate}_${dateRange.endDate}.xlsx`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="h-80">
              {gameMixChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Nu există date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gameMixChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip
                      formatter={(value) => formatNumber(value)}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                    <Bar dataKey="averageIn" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Grafic evoluție zilnică */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Evoluție zilnică - IN vs GGR
            </h2>
            <button
              onClick={() => exportToExcel(dailyChartData, 'Evoluție zilnică', `Incasari_Evolutie_Zilnica_${dateRange.startDate}_${dateRange.endDate}.xlsx`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export
            </button>
          </div>
          <div className="h-96">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                Nu există date
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatNumber(v)} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip
                    formatter={(value) => formatNumber(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalIn" fill="#0ea5e9" name="IN" />
                  <Line yAxisId="right" type="monotone" dataKey="totalGgr" stroke="#22c55e" strokeWidth={2} name="GGR" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg">
              <p className="text-slate-900 dark:text-white">Se încarcă datele...</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default IncasariSmartAnalytics


