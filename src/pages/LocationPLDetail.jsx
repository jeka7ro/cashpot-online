import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Download, Search, TrendingUp, TrendingDown,
  ChevronUp, ChevronDown, ChevronsUpDown, Cpu, DollarSign,
  BarChart2, Percent, RefreshCw, Calendar, CalendarDays,
  CalendarRange, CalendarX, CalendarCheck, Clock
} from 'lucide-react'
import Layout from '../components/Layout'
import KPICard from '../components/KPICard'
import axios from 'axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts'

import * as XLSX from 'xlsx'

/* ── colors ──────────────────────────────────────────────── */
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316']

/* ── date utils ───────────────────────────────────────────── */
const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const QUICK_PERIODS = [
  {
    id: 'today', label: 'Azi', icon: CalendarDays,
    get: () => {
      const d = new Date(); return { s: fmtDate(d), e: fmtDate(d) }
    }
  },
  {
    id: 'yesterday', label: 'Ieri', icon: Clock,
    get: () => {
      const d = new Date(); d.setDate(d.getDate() - 1); return { s: fmtDate(d), e: fmtDate(d) }
    }
  },
  {
    id: 'thisMonth', label: 'Luna curentă', icon: CalendarRange,
    get: () => {
      const n = new Date()
      return {
        s: fmtDate(new Date(n.getFullYear(), n.getMonth(), 1)),
        e: fmtDate(new Date(n.getFullYear(), n.getMonth() + 1, 0))
      }
    }
  },
  {
    id: 'lastMonth', label: 'Luna trecută', icon: CalendarX,
    get: () => {
      const n = new Date()
      return {
        s: fmtDate(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        e: fmtDate(new Date(n.getFullYear(), n.getMonth(), 0))
      }
    }
  },
  {
    id: 'thisYear', label: 'Anul curent', icon: CalendarCheck,
    get: () => {
      const n = new Date()
      return {
        s: fmtDate(new Date(n.getFullYear(), 0, 1)),
        e: fmtDate(new Date(n.getFullYear(), 11, 31))
      }
    }
  },
  {
    id: 'lastYear', label: 'Anul trecut', icon: Calendar,
    get: () => {
      const n = new Date()
      return {
        s: fmtDate(new Date(n.getFullYear() - 1, 0, 1)),
        e: fmtDate(new Date(n.getFullYear() - 1, 11, 31))
      }
    }
  },
]

/* ── number helpers ────────────────────────────────────────── */
const fmt = (v, dec = 0) =>
  new Intl.NumberFormat('ro-RO', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v ?? 0)

const pct = (v) => `${Number(v ?? 0).toFixed(2)}%`

/* ── sort icon ─────────────────────────────────────────────── */
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 inline ml-1" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 inline ml-1 text-emerald-600 dark:text-emerald-400" />
    : <ChevronDown className="w-3 h-3 inline ml-1 text-emerald-600 dark:text-emerald-400" />
}

/* ══════════════════════════════════════════════════════════ */
const LocationPLDetail = () => {
  const { locationName } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('totalIn')
  const [sortDir, setSortDir] = useState('desc')
  const [provFilter, setProvFilter] = useState('all')
  const [cabFilter, setCabFilter] = useState('all')
  const [locFilter, setLocFilter] = useState('all')
  const [activeQuick, setActiveQuick] = useState(null)

  const decoded = decodeURIComponent(locationName)
  const isAllLocations = decoded === 'all'

  /* ── parse dateRange from URL ─────────────────────────────── */
  const dateRange = useMemo(() => {
    const p = searchParams.get('dateRange')
    if (!p || !p.includes('_')) {
      // Default: luna curentă
      const n = new Date()
      return {
        startDate: fmtDate(new Date(n.getFullYear(), n.getMonth(), 1)),
        endDate: fmtDate(new Date(n.getFullYear(), n.getMonth() + 1, 0))
      }
    }
    const parts = p.split('_')
    return { startDate: parts[0], endDate: parts[1] }
  }, [searchParams])

  /* ── change period & update URL ───────────────────────────── */
  const setPeriod = useCallback((s, e, quickId = null) => {
    setActiveQuick(quickId)
    setSearchParams({ dateRange: `${s}_${e}` }, { replace: true })
  }, [setSearchParams])

  /* ── fetch ──────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      if (!isAllLocations) params.location = decoded
      const res = await axios.get('/api/incasari/slots-by-location', { params })
      if (res.data?.success) {
        setSlots(res.data.rows || [])
      } else {
        setError(res.data?.error || 'Eroare necunoscută')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }, [locationName, dateRange.startDate, dateRange.endDate])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── aggregate totals ─────────────────────────────────────── */
  const totals = useMemo(() =>
    slots.reduce((acc, r) => ({
      in: acc.in + r.totalIn,
      out: acc.out + r.totalOut,
      profit: acc.profit + r.totalProfit,
      bet: acc.bet + r.totalBet,
      win: acc.win + r.totalWin,
      jackpot: acc.jackpot + (r.totalJackpot || 0),
      raffle: acc.raffle + (r.totalRaffle || 0),
      hh: acc.hh + (r.totalHh || 0),
      cbReal: acc.cbReal + (r.totalCbReal || 0),
      cbBirthday: acc.cbBirthday + (r.totalCbBirthday || 0)
    }), { in: 0, out: 0, profit: 0, bet: 0, win: 0, jackpot: 0, raffle: 0, hh: 0, cbReal: 0, cbBirthday: 0 }), [slots])

  /* ── filter options ─────────────────────────────────────── */
  const providers = useMemo(() => ['all', ...new Set(slots.map(s => s.provider).filter(Boolean).sort())], [slots])
  const cabinets = useMemo(() => ['all', ...new Set(slots.map(s => s.cabinet).filter(Boolean).sort())], [slots])
  const locations = useMemo(() => ['all', ...new Set(slots.map(s => s.locationName).filter(Boolean).sort())], [slots])

  /* ── filtered + sorted rows ─────────────────────────────── */
  const displayed = useMemo(() => {
    let d = slots
    if (locFilter !== 'all') d = d.filter(r => r.locationName === locFilter)
    if (provFilter !== 'all') d = d.filter(r => r.provider === provFilter)
    if (cabFilter !== 'all') d = d.filter(r => r.cabinet === cabFilter)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(r =>
        r.serialNumber?.toLowerCase().includes(q) ||
        r.provider?.toLowerCase().includes(q) ||
        r.cabinet?.toLowerCase().includes(q) ||
        r.gameMix?.toLowerCase().includes(q)
      )
    }
    return [...d].sort((a, b) => {
      const va = a[sortCol] ?? 0, vb = b[sortCol] ?? 0
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [slots, search, sortCol, sortDir, provFilter, cabFilter, locFilter])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  /* ── aggregate by provider ─────────────────────────────────────── */
  const providerStats = useMemo(() => {
    const stats = {}
    displayed.forEach(r => {
      const p = r.provider || 'Necunoscut'
      if (!stats[p]) stats[p] = { count: 0, totalIn: 0, totalOut: 0, totalWin: 0, totalBet: 0, totalProfit: 0, totalJackpot: 0, totalRaffle: 0 }
      stats[p].count++
      stats[p].totalIn += r.totalIn
      stats[p].totalOut += r.totalOut
      stats[p].totalWin += r.totalWin
      stats[p].totalBet += r.totalBet
      stats[p].totalJackpot += r.totalJackpot || 0
      stats[p].totalRaffle += r.totalRaffle || 0
      stats[p].totalProfit += r.totalProfit
    })
    return Object.entries(stats)
      .map(([prov, s]) => ({ provider: prov, ...s }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
  }, [displayed])

  /* ── aggregate by location (only for 'all' mode) ──────────────── */
  const locationStats = useMemo(() => {
    if (!isAllLocations) return []
    const stats = {}
    displayed.forEach(r => {
      const loc = r.locationName || 'Necunoscut'
      if (!stats[loc]) stats[loc] = { count: 0, totalIn: 0, totalOut: 0, totalWin: 0, totalBet: 0, totalProfit: 0, totalJackpot: 0, totalRaffle: 0 }
      stats[loc].count++
      stats[loc].totalIn += r.totalIn
      stats[loc].totalOut += r.totalOut
      stats[loc].totalWin += r.totalWin
      stats[loc].totalBet += r.totalBet
      stats[loc].totalJackpot += r.totalJackpot || 0
      stats[loc].totalRaffle += r.totalRaffle || 0
      stats[loc].totalProfit += r.totalProfit
    })
    return Object.entries(stats)
      .map(([location, s]) => ({ location, ...s }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
  }, [displayed, isAllLocations])

  /* ── GGR by location for bar chart ────────────────────────────── */
  const locationGgrStats = useMemo(() => {
    if (!isAllLocations) return []
    return locationStats.map(s => ({ name: s.location, value: s.totalProfit }))
  }, [locationStats, isAllLocations])

  /* ── aggregate for pie charts (BET) ───────────────────────────── */
  const cabinetBetStats = useMemo(() => {
    const stats = {}
    displayed.forEach(r => {
      const key = r.cabinet || 'Necunoscut'
      stats[key] = (stats[key] || 0) + r.totalBet
    })
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [displayed])

  const mixBetStats = useMemo(() => {
    const stats = {}
    displayed.forEach(r => {
      const key = r.gameMix || 'Necunoscut'
      stats[key] = (stats[key] || 0) + r.totalBet
    })
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [displayed])


  /* ── export Excel ─────────────────────────────────────────── */
  const exportExcel = () => {
    const data = displayed.map(r => ({
      Serial: r.serialNumber,
      Provider: r.provider,
      Cabinet: r.cabinet,
      Mix: r.gameMix || '',
      'IN (lei)': Number(r.totalIn.toFixed(2)),
      'OUT (lei)': Number(r.totalOut.toFixed(2)),
      'WIN (lei)': Number(r.totalWin.toFixed(2)),
      'BET (lei)': Number(r.totalBet.toFixed(2)),
      '%WIN/BET': Number(r.winBetPct.toFixed(2)),
      '%IN/OUT': Number(r.inOutPct.toFixed(2)),
      'GGR (lei)': Number(r.totalProfit.toFixed(2))
    }))

    data.push({
      Serial: 'TOTAL',
      Provider: '',
      Cabinet: '',
      Mix: '',
      'IN (lei)': Number(totals.in.toFixed(2)),
      'OUT (lei)': Number(totals.out.toFixed(2)),
      'WIN (lei)': Number(totals.win.toFixed(2)),
      'BET (lei)': Number(totals.bet.toFixed(2)),
      '%WIN/BET': totals.bet > 0 ? Number(((totals.win / totals.bet) * 100).toFixed(2)) : 0,
      '%IN/OUT': totals.out > 0 ? Number(((totals.in / totals.out) * 100).toFixed(2)) : 0,
      'GGR (lei)': Number(totals.profit.toFixed(2))
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Incasari Reparate")
    XLSX.writeFile(wb, `${decoded}_${dateRange.startDate}_${dateRange.endDate}.xlsx`)
  }

  /* ── table header ─────────────────────────────────────────── */
  const Th = ({ col, children, right }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer
        select-none whitespace-nowrap text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors
        ${right ? 'text-right' : 'text-left'}`}
    >
      {children}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  )

  /* ── render ─────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-4">

        {/* ── Header row ─────────────────────────────────── */}
        <div className="flex items-start gap-4 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mt-1"
          >
            <ArrowLeft className="w-4 h-4" /> Înapoi
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{isAllLocations ? 'Toate locațiile' : decoded}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Încasări per aparat ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {dateRange.startDate} → {dateRange.endDate}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reîncarcă
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>

        {/* ── Controls Row (Dates + Filters) ──────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Dates */}
            <div className="flex items-center gap-2 flex-wrap">
              {QUICK_PERIODS.map(({ id, label, icon: Icon, get }) => {
                const isActive = activeQuick === id
                return (
                  <button
                    key={id}
                    onClick={() => { const { s, e } = get(); setPeriod(s, e, id) }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                      border transition-all whitespace-nowrap
                      ${isActive
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                )
              })}
              <div className="flex items-center gap-1.5 ml-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={e => setPeriod(e.target.value, dateRange.endDate)}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-28"
                />
                <span className="text-slate-600 text-xs">→</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={e => setPeriod(dateRange.startDate, e.target.value)}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-28"
                />
              </div>
            </div>

            {/* Right: Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Serial, provider, cabinet, mix..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-64 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs
                    text-slate-800 dark:text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>
              {isAllLocations && (
                <select value={locFilter} onChange={e => setLocFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none">
                  {locations.map(l => <option key={l} value={l}>{l === 'all' ? 'Toate Locațiile' : l}</option>)}
                </select>
              )}
              <select value={provFilter} onChange={e => setProvFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none">
                {providers.map(p => <option key={p} value={p}>{p === 'all' ? 'Toți Providerii' : p}</option>)}
              </select>
              <select value={cabFilter} onChange={e => setCabFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none">
                {cabinets.map(c => <option key={c} value={c}>{c === 'all' ? 'Toate Cabinetele' : c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard title="Total IN" value={totals.in} suffix="RON" icon={DollarSign} accent="emerald" />
          <KPICard
            title="Bonus Cost"
            value={totals.bet > 0 ? ((totals.jackpot + totals.raffle + totals.hh + totals.cbReal + totals.cbBirthday) / totals.bet * 100).toFixed(2) : '0.00'}
            suffix={`% (${fmt(totals.jackpot + totals.raffle + totals.hh + totals.cbReal + totals.cbBirthday)} lei)`}
            icon={TrendingDown} accent="rose"
          />
          <KPICard title="Total BET" value={totals.bet} suffix="RON" icon={BarChart2} accent="blue" />
          <KPICard title="WIN.BET %" value={totals.bet > 0 ? ((totals.win / totals.bet) * 100).toFixed(2) : '0.00'} suffix="%" icon={Percent} accent="purple" />
          <KPICard title="GGR (IN-OUT)" value={fmt(totals.profit)} suffix="RON" icon={Percent} accent="amber" changeLabel={totals.in > 0 ? `${((totals.profit / totals.in) * 100).toFixed(2)}% din IN` : ''} change={0} />
          <KPICard title="Aparate" value={displayed.length} suffix="" icon={Cpu} accent="cyan" changeLabel={`din ${slots.length} total`} change={0} />
        </div>

        {/* ── Mid Section: Stats & Charts ────────────────────────── */}
        {!loading && !error && displayed.length > 0 && (
          <>
          {/* ── Summary Tables Row ────────────────────────────── */}
          <div className={`grid gap-4 mt-2 mb-4 ${isAllLocations ? 'grid-cols-1 2xl:grid-cols-2' : 'grid-cols-1'}`}>

            {/* Left: Provider Summary Table */}
            {providerStats.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Centralizator Producători</h3>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Producător</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ap.</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">IN</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">GGR</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">BET</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jackpot</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Raffles</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">%WIN/BET</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">%IN/OUT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {providerStats.map(s => {
                        const winBet = s.totalBet > 0 ? (s.totalWin / s.totalBet) * 100 : 0
                        const inOut = s.totalOut > 0 ? (s.totalIn / s.totalOut) * 100 : 0
                        return (
                          <tr key={s.provider} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-2 py-2 text-slate-800 dark:text-slate-200 font-medium">{s.provider}</td>
                            <td className="px-2 py-2 text-right text-slate-500 dark:text-slate-400 tabular-nums">{s.count}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalIn)}</td>
                            <td className={`px-2 py-2 text-right font-bold tabular-nums ${s.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
                              {fmt(s.totalProfit)}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalBet)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalJackpot)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalRaffle)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${winBet >= 98 ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                : winBet >= 95 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                {pct(winBet)}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{pct(inOut)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Centralizator Locații (only in 'all' mode) */}
            {isAllLocations && locationStats.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Centralizator Locații</h3>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Locație</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ap.</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">IN</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">GGR</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">BET</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jackpot</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Raffles</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">%WIN/BET</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">%IN/OUT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {locationStats.map(s => {
                        const winBet = s.totalBet > 0 ? (s.totalWin / s.totalBet) * 100 : 0
                        const inOut = s.totalOut > 0 ? (s.totalIn / s.totalOut) * 100 : 0
                        return (
                          <tr key={s.location} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-2 py-2 text-slate-800 dark:text-slate-200 font-medium capitalize">{s.location}</td>
                            <td className="px-2 py-2 text-right text-slate-500 dark:text-slate-400 tabular-nums">{s.count}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalIn)}</td>
                            <td className={`px-2 py-2 text-right font-bold tabular-nums ${s.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
                              {fmt(s.totalProfit)}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalBet)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalJackpot)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.totalRaffle)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${winBet >= 98 ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                : winBet >= 95 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                {pct(winBet)}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{pct(inOut)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

            {/* Charts Row: Pie Charts + GGR Bar */}
            <div className={`grid gap-4 mb-4 ${isAllLocations ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center shrink-0">Distribuție BET pe Cabinete (Top 10)</h3>
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cabinetBetStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                        label={(props) => {
                          const { cx, cy, midAngle, outerRadius, percent, index, name } = props;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius * 1.15;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text
                              x={x} y={y}
                              fill={COLORS[index % COLORS.length]}
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize={11}
                              fontWeight={500}
                              className="drop-shadow-md"
                            >
                              {`${name} ${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {cabinetBetStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [fmt(value) + ' lei', 'BET']}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center shrink-0">Distribuție BET pe Mix-uri (Top 10)</h3>
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mixBetStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                        label={(props) => {
                          const { cx, cy, midAngle, outerRadius, percent, index, name } = props;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius * 1.15;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text
                              x={x} y={y}
                              fill={COLORS[index % COLORS.length]}
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize={11}
                              fontWeight={500}
                              className="drop-shadow-md"
                            >
                              {`${name} ${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {mixBetStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [fmt(value) + ' lei', 'BET']}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                        itemStyle={{ color: '#8b5cf6' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GGR by Location Bar Chart (only in 'all' mode) */}
              {isAllLocations && locationGgrStats.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center shrink-0">GGR pe Locații</h3>
                  <div className="flex-1 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationGgrStats} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmt(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={120} />
                        <Tooltip formatter={(value) => [fmt(value) + ' lei', 'GGR']} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {locationGgrStats.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.value >= 0 ? COLORS[index % COLORS.length] : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" /> Se încarcă datele...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-400 text-sm">{ typeof error === "object" ? (error?.message || "Eroare") : error }</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Nu există date pentru această perioadă / filtre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-8">#</th>
                    {isAllLocations && <Th col="locationName">Locație</Th>}
                    <Th col="serialNumber">Serial</Th>
                    <Th col="provider">Provider</Th>
                    <Th col="cabinet">Cabinet</Th>
                    <Th col="gameMix">Mix</Th>
                    <Th col="totalIn" right>IN (lei)</Th>
                    <Th col="totalOut" right>OUT (lei)</Th>
                    <Th col="totalWin" right>WIN (lei)</Th>
                    <Th col="totalBet" right>BET (lei)</Th>
                    <Th col="winBetPct" right>%WIN/BET</Th>
                    <Th col="inOutPct" right>%IN/OUT</Th>
                    <Th col="totalProfit" right>GGR (lei)</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {displayed.map((row, idx) => {
                    const ggrPos = row.totalProfit >= 0
                    return (
                      <tr key={row.serialNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2 text-slate-500 text-xs">{idx + 1}</td>
                        {isAllLocations && <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium capitalize">{row.locationName || '—'}</td>}
                        <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{row.serialNumber}</td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{row.provider}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.cabinet}</td>
                        <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{row.gameMix || ''}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.totalIn)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.totalOut)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.totalWin)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.totalBet)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${row.winBetPct >= 98 ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            : row.winBetPct >= 95 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            }`}>
                            {pct(row.winBetPct)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{pct(row.inOutPct)}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${ggrPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
                          {fmt(row.totalProfit)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                  <tr className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    <td colSpan={isAllLocations ? 6 : 5} className="px-3 py-2.5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      TOTAL · {displayed.length} aparate
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 tabular-nums">{fmt(totals.in)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 tabular-nums">{fmt(totals.out)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 tabular-nums">{fmt(totals.win)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-200 tabular-nums">{fmt(totals.bet)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                      {totals.bet > 0 ? pct((totals.win / totals.bet) * 100) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-cyan-600 dark:text-cyan-400 tabular-nums">
                      {totals.out > 0 ? pct((totals.in / totals.out) * 100) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${totals.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
                      {fmt(totals.profit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default LocationPLDetail
