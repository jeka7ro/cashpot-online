import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { Calendar, MapPin, Download, RefreshCw, BarChart2, Activity, TrendingUp, Zap, Coins } from 'lucide-react'
import axios from 'axios'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts'

const formatDateLocal = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const fmtRON = (val) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(val || 0)
const fmtNum = (val) => new Intl.NumberFormat('ro-RO').format(Math.round(val || 0))

const VENUE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899']

const getOperationalToday = () => {
  const now = new Date()
  if (now.getHours() < 8) { const d = new Date(now); d.setDate(d.getDate() - 1); return d }
  return now
}

const QUICK = () => {
  const today = getOperationalToday()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return [
    { key: 'azi',       label: 'Azi',           start: formatDateLocal(today),      end: formatDateLocal(today) },
    { key: 'ieri',      label: 'Ieri',           start: formatDateLocal(yesterday),  end: formatDateLocal(yesterday) },
    { key: 'saptamana', label: 'Săpt. curentă',  start: formatDateLocal(weekStart),  end: formatDateLocal(today) },
    { key: 'luna',      label: 'Luna curentă',   start: formatDateLocal(monthStart), end: formatDateLocal(today) },
  ]
}

const OperationalPerformanceMix = () => {
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [rawData, setRawData]   = useState([])
  const [mode, setMode]         = useState('hourly')
  const [error, setError]       = useState(null)
  const [activeQuick, setActiveQuick] = useState('ieri')

  const _opYesterday = new Date(getOperationalToday()); _opYesterday.setDate(_opYesterday.getDate() - 1)
  const [dateRange, setDateRange] = useState({ start: formatDateLocal(_opYesterday), end: formatDateLocal(_opYesterday) })
  const [selectedLocations, setSelectedLocations] = useState([])
  const [availableLocations, setAvailableLocations] = useState([])

  const fetchFilters = async () => {
    try {
      const res = await axios.get('/api/operational/active-machines', { params: { date: dateRange.start } })
      if (res.data?.capacity) {
        setAvailableLocations(res.data.capacity
          .filter(c => c.Venue && !c.Venue.toLowerCase().includes('depozit'))
          .map(c => ({ id: c.Venue, label: c.Venue }))
          .sort((a, b) => a.label.localeCompare(b.label)))
      }
    } catch (e) { console.error('Error fetching filters:', e) }
  }

  const fetchData = async () => {
    try {
      setLoading(true); setError(null)
      const res = await axios.get('/api/operational/performance-mix', {
        params: {
          startDate: dateRange.start,
          endDate:   dateRange.end,
          locations: selectedLocations.length > 0 ? selectedLocations.join(',') : undefined
        }
      })
      if (!res.data?.success) throw new Error(res.data?.error || 'Eroare la preluarea datelor.')
      setRawData(res.data.data || [])
      setMode(res.data.mode || 'hourly')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFilters() }, [dateRange.start])
  useEffect(() => { fetchData() }, [dateRange, selectedLocations])

  const handleSync = async () => {
    setSyncing(true); setError(null)
    try {
      const res = await axios.post('/api/operational/sync', { days: 7 })
      if (res.data.success) { await fetchData(); await fetchFilters() }
      else setError(res.data.error || 'Eroare la sincronizare.')
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSyncing(false) }
  }

  // Unique venues (sorted) with color assignment
  const venues = useMemo(() => {
    const set = new Set(rawData.map(r => r.Venue).filter(Boolean))
    return Array.from(set).sort()
  }, [rawData])

  const venueColor = useMemo(() => {
    const map = {}
    venues.forEach((v, i) => { map[v] = VENUE_COLORS[i % VENUE_COLORS.length] })
    return map
  }, [venues])

  // Build chart data pivoted: one object per label with venue keys
  const { chartData, kpis } = useMemo(() => {
    if (!rawData?.length) return { chartData: [], kpis: { sumTI: 0, sumTMI: 0, sumGP: 0, avrBet: 0, peakLabel: '-', peakTI: 0 } }

    let chartData
    if (mode === 'daily') {
      chartData = rawData.map(r => ({
        label:   r.label,
        ti:      Number(r.total_in)       || 0,
        tmi:     Number(r.total_money_in) || 0,
        gp:      Number(r.games_played)   || 0,
        avrBet:  Number(r.avg_bet)        || 0,
      }))
    } else {
      // Hourly + per venue: pivot to { label, Venue1: ti, Venue2: ti, ..., total_ti, avrBet }
      const hourMap = {}
      for (let i = 0; i < 24; i++) {
        hourMap[i] = { label: `${String(i).padStart(2,'0')}:00`, total_ti: 0, total_tmi: 0, total_gp: 0, total_am: 0 }
      }
      rawData.forEach(r => {
        const h = Number(r.hour)
        const ti  = Number(r.total_in)       || 0
        const tmi = Number(r.total_money_in) || 0
        const gp  = Number(r.games_played)   || 0
        const am  = Number(r.active_machines) || 0
        if (!hourMap[h]) return
        hourMap[h][r.Venue]    = (hourMap[h][r.Venue] || 0) + ti   // per-venue bet
        hourMap[h].total_ti   += ti
        hourMap[h].total_tmi  += tmi
        hourMap[h].total_gp   += gp
        hourMap[h].total_am   += am
      })
      chartData = Object.values(hourMap).map(h => ({
        ...h,
        ti:       h.total_ti,
        tmi:      h.total_tmi,
        gp:       h.total_gp,
        avrBet:   h.total_gp > 0 ? h.total_ti / h.total_gp : 0,
        eficienta: h.total_am > 0 ? h.total_ti / h.total_am : 0,
        active_machines: h.total_am,
      }))
    }

    const sumTI  = chartData.reduce((s, r) => s + (r.ti  || 0), 0)
    const sumTMI = chartData.reduce((s, r) => s + (r.tmi || 0), 0)
    const sumGP  = chartData.reduce((s, r) => s + (r.gp  || 0), 0)
    const peak   = chartData.reduce((p, c) => (c.ti || 0) > (p.ti || 0) ? c : p, chartData[0] || {})

    return { chartData, kpis: { sumTI, sumTMI, sumGP, avrBet: sumGP > 0 ? sumTI / sumGP : 0, peakLabel: peak?.label || '-', peakTI: peak?.ti || 0 } }
  }, [rawData, mode])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const total = payload.filter(e => venues.includes(e.dataKey)).reduce((s, e) => s + (e.value || 0), 0)
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-sm min-w-[200px]">
        <p className="font-bold text-slate-800 mb-2 pb-2 border-b border-slate-100">{label}</p>
        {payload.map((e, i) => (
          <div key={i} className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: e.color }} />
              {e.name}
            </span>
            <span className="font-bold text-slate-900 ml-4">
              {e.name.includes('Miza') || e.name.includes('Efic') ? fmtRON(e.value) : fmtRON(e.value)}
            </span>
          </div>
        ))}
        {mode === 'hourly' && venues.length > 1 && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700">Total</span>
            <span className="font-black text-blue-700">{fmtRON(total)}</span>
          </div>
        )}
      </div>
    )
  }

  const exportCSV = () => {
    const headers = ['Label', 'Total Bet (TI)', 'Intrari (TMI)', 'Jocuri', 'Miza Medie']
    const rows = chartData.map(r => [r.label, Math.round(r.ti), Math.round(r.tmi || 0), Math.round(r.gp), r.avrBet?.toFixed(2) || 0])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mix_performanta.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const quicks = QUICK()

  return (
    <Layout>
      <div className="space-y-4">

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Mix de Performanță</h1>
              <p className="text-xs text-slate-500">Volum financiar {mode === 'daily' ? 'zilnic' : 'orar'} — Bet pe săli</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizare...' : 'Sincronizează'}
            </button>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm">
              <Download className="w-4 h-4 text-indigo-500" />CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-start gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1 text-blue-500" />Perioadă
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {quicks.map(q => (
                <button key={q.key}
                  onClick={() => { setDateRange({ start: q.start, end: q.end }); setActiveQuick(q.key) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    activeQuick === q.key
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}>
                  {q.label}
                </button>
              ))}
              <input type="date" value={dateRange.start}
                onChange={e => { setDateRange({ start: e.target.value, end: e.target.value }); setActiveQuick(null) }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />Locații
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setSelectedLocations([])}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedLocations.length === 0
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>Toate</button>
              {availableLocations.map(loc => (
                <button key={loc.id}
                  onClick={() => setSelectedLocations(prev =>
                    prev.includes(loc.id) ? prev.filter(x => x !== loc.id) : [...prev, loc.id])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedLocations.includes(loc.id)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>
                  {loc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">{error}</div>}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Bet (TI)', value: fmtRON(kpis.sumTI), icon: <TrendingUp className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', color: 'text-blue-700' },
                { label: 'Total Intrări (TMI)', value: fmtRON(kpis.sumTMI), icon: <Coins className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', color: 'text-emerald-700' },
                { label: 'Miza Medie / Joc', value: fmtRON(kpis.avrBet), icon: <BarChart2 className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50', color: 'text-purple-700' },
                { label: mode === 'daily' ? 'Ziua de vârf' : 'Vârf activitate', value: `${kpis.peakLabel} · ${fmtRON(kpis.peakTI)}`, icon: <Zap className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50', color: 'text-orange-700' },
              ].map((k, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">{k.label}</p>
                      <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${k.bg}`}>{k.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Chart: Stacked Bars per Venue + Miza Medie line */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Volum Bet {mode === 'daily' ? 'Zilnic' : 'Orar pe Săli'} + Aparate Active
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 16, right: mode === 'daily' ? 24 : 8, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-8}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#f59e0b' }} dx={8} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

                    {mode === 'hourly' ? (
                      venues.map((v, i) => (
                        <Bar key={v} yAxisId="left" dataKey={v} name={v} stackId="bet"
                          fill={venueColor[v]} radius={i === venues.length - 1 ? [4,4,0,0] : [0,0,0,0]}
                          maxBarSize={40} />
                      ))
                    ) : (
                      <Bar yAxisId="left" dataKey="ti" name="Total Bet (RON)" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={48} />
                    )}
                    <Line yAxisId="right" type="monotone" dataKey="active_machines" name="Aparate Active"
                      stroke="#f59e0b" strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }}
                      label={{ position: 'top', fontSize: 11, fill: '#b45309', fontWeight: 'bold',
                        formatter: v => v > 0 ? v : '' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

            </div>

            {/* Chart 2: Eficienta (hourly only) */}
            {mode === 'hourly' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Eficiență / Aparat + Jocuri Jucate
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#f59e0b' }} dx={-8} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#10b981' }} dx={8}
                        tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar yAxisId="right" dataKey="gp" name="Jocuri Jucate" fill="#d1fae5" radius={[4,4,0,0]} maxBarSize={32} />
                      <Line yAxisId="left" type="monotone" dataKey="eficienta" name="Eficienta/Aparat (RON)"
                        stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Matrice {mode === 'daily' ? 'Zilnică' : 'Orară'} Detaliată
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">{mode === 'daily' ? 'Data' : 'Ora'}</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase">Total Bet (TI)</th>
                      {mode === 'hourly' && venues.map(v => (
                        <th key={v} className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: venueColor[v] }}>{v}</th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Jocuri</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase">Miza Medie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${row.ti === kpis.peakTI && row.ti > 0 ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{row.label}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{row.ti > 0 ? fmtRON(row.ti) : '-'}</td>
                        {mode === 'hourly' && venues.map(v => (
                          <td key={v} className="px-4 py-2.5 text-right" style={{ color: venueColor[v] }}>
                            {(row[v] || 0) > 0 ? fmtRON(row[v]) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right text-slate-600">{(row.gp||0) > 0 ? fmtNum(row.gp) : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-purple-700">{(row.avrBet||0) > 0 ? fmtRON(row.avrBet) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-200">
                      <td className="px-4 py-3 font-black text-slate-800 text-xs uppercase">TOTAL</td>
                      <td className="px-4 py-3 text-right font-black text-blue-700">{fmtRON(kpis.sumTI)}</td>
                      {mode === 'hourly' && venues.map(v => (
                        <td key={v} className="px-4 py-3 text-right font-bold" style={{ color: venueColor[v] }}>
                          {fmtRON(chartData.reduce((s, r) => s + (r[v] || 0), 0))}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-black text-slate-700">{fmtNum(kpis.sumGP)}</td>
                      <td className="px-4 py-3 text-right font-bold text-purple-700">{fmtRON(kpis.avrBet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default OperationalPerformanceMix
