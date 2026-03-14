import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import { Activity, Search, Download, Filter, RefreshCw, Users, Zap, Clock, MapPin, Gamepad2, Percent } from 'lucide-react'
import axios from 'axios'
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Cell, LabelList
} from 'recharts'

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const SHIFTS = [
  { id: 'all', label: 'Toată ziua (00:00 - 23:59)' },
  { id: 'morning', label: 'Dimineață (06:00 - 14:00)', hours: [6,7,8,9,10,11,12,13] },
  { id: 'afternoon', label: 'După-amiază (14:00 - 22:00)', hours: [14,15,16,17,18,19,20,21] },
  { id: 'night', label: 'Noapte (22:00 - 06:00)', hours: [22,23,0,1,2,3,4,5] }
]

// Ziua operationala: 08:00 - 08:00 (urmatoarea zi)
// Daca e inainte de 08:00, "azi" operational = ieri calendar
const getOperationalToday = () => {
  const now = new Date()
  if (now.getHours() < 8) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return d
  }
  return now
}

const getQuickDates = () => {
  const opToday = getOperationalToday()
  const opYesterday = new Date(opToday); opYesterday.setDate(opToday.getDate() - 1)
  const monthStart = new Date(opToday.getFullYear(), opToday.getMonth(), 1)
  const yearStart  = new Date(opToday.getFullYear(), 0, 1)
  return {
    azi:  { start: formatDateLocal(opToday),     end: formatDateLocal(opToday),     label: 'Azi' },
    ieri: { start: formatDateLocal(opYesterday), end: formatDateLocal(opYesterday), label: 'Ieri' },
    luna: { start: formatDateLocal(monthStart),  end: formatDateLocal(opToday),     label: 'Luna curentă' },
    an:   { start: formatDateLocal(yearStart),   end: formatDateLocal(opToday),     label: 'Anul curent' },
  }
}

const ActiveMachines = () => {
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState([])
  const [capacityData, setCapacityData] = useState([])
  const [error, setError] = useState(null)
  const [isRange, setIsRange] = useState(false)

  const opYesterday = new Date(getOperationalToday()); opYesterday.setDate(opYesterday.getDate() - 1)
  const [startDate, setStartDate] = useState(formatDateLocal(opYesterday))
  const [endDate, setEndDate] = useState(formatDateLocal(opYesterday))
  const [activeQuick, setActiveQuick] = useState('ieri')
  const [selectedShift, setSelectedShift] = useState('all')
  const [selectedLocations, setSelectedLocations] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [locDropdownOpen, setLocDropdownOpen] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await axios.post('/api/operational/sync', { days: 7 })
      if(res.data.success) {
        await fetchData()
      } else {
        setError(res.data.error || 'Eroare la sincronizare.')
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleQuickDate = (key) => {
    const q = getQuickDates()[key]
    setStartDate(q.start)
    setEndDate(q.end)
    setActiveQuick(key)
  }

  // Available locations from backend capacity
  const availableLocations = useMemo(() => {
    return capacityData
      .filter(c => c.Venue && !c.Venue.toLowerCase().includes('depozit'))
      .map(c => ({ id: c.Venue, label: c.Venue }))
      .sort((a,b) => a.label.localeCompare(b.label))
  }, [capacityData])

  const toggleLocation = (id) => {
    setSelectedLocations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = {
        startDate,
        endDate,
        locations: selectedLocations.length > 0 ? selectedLocations.join(',') : undefined
      }
      const response = await axios.get('/api/operational/active-machines', { params })
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to fetch active machines data')
      }
      setRawData(response.data.data || [])
      setCapacityData(response.data.capacity || [])
      setIsRange(response.data.isRange || false)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching active machines:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startDate && endDate) fetchData()
  }, [startDate, endDate, selectedLocations])

  // Filter data by shift
  const filteredData = useMemo(() => {
    let data = [...rawData]
    
    if (selectedShift !== 'all') {
      const shiftObj = SHIFTS.find(s => s.id === selectedShift)
      if (shiftObj) {
        data = data.filter(row => shiftObj.hours.includes(row.hour))
      }
    }
    
    return data
  }, [rawData, selectedShift])

  // Process data for charts and KPIs
  const processed = useMemo(() => {
    let totalSpins = 0

    // Track MAX active machines per venue (peak concurrent - distinct machines)
    const venueMaxMap = {}  // venue -> max active_machines in any single hour
    const venueCarded = {}  // venue -> max carded in any single hour

    // Per-hour, per-venue tracking to compute average per venue
    const hourVenueActive = {}  // hour -> { venue: value }
    const hourVenueCarded = {}

    // Hourly aggregation for the ComposedChart
    const hourlyMap = {}
    for (let i = 0; i < 24; i++) {
        hourlyMap[i] = { hour: i, hourLabel: `${i.toString().padStart(2, '0')}:00`, active: 0, carded: 0, spins: 0 }
        hourVenueActive[i] = {}
        hourVenueCarded[i] = {}
    }

    // Location aggregation for Occupancy
    const locationMap = {}
    capacityData.forEach(c => {
        locationMap[c.Venue] = {
            total_capacity: c.total_machines,
            active_sessions: 0,
            carded_sessions: 0,
            spins: 0,
            hours_active: new Set()
        }
    })

    filteredData.forEach(row => {
        const am = Number(row.active_machines) || 0
        const cp = Number(row.carded_players) || 0
        const sp = Number(row.total_spins) || 0

        // Track peak per venue (MAX, not SUM across hours)
        if (!venueMaxMap[row.Venue] || am > venueMaxMap[row.Venue]) venueMaxMap[row.Venue] = am
        if (!venueCarded[row.Venue] || cp > venueCarded[row.Venue]) venueCarded[row.Venue] = cp

        totalSpins += sp

        // Per-hour, per-venue tracking (keep max per venue per hour)
        if (hourlyMap[row.hour]) {
            if (!hourVenueActive[row.hour][row.Venue] || am > hourVenueActive[row.hour][row.Venue])
                hourVenueActive[row.hour][row.Venue] = am
            if (!hourVenueCarded[row.hour][row.Venue] || cp > hourVenueCarded[row.hour][row.Venue])
                hourVenueCarded[row.hour][row.Venue] = cp
            hourlyMap[row.hour].spins += sp
        }

        // Location
        if (!locationMap[row.Venue]) {
             locationMap[row.Venue] = {
                total_capacity: 0,
                active_sessions: 0,
                carded_sessions: 0,
                spins: 0,
                hours_active: new Set()
            }
        }
        locationMap[row.Venue].active_sessions += am
        locationMap[row.Venue].carded_sessions += cp
        locationMap[row.Venue].spins += sp
        locationMap[row.Venue].hours_active.add(row.hour)
    })

    // Put per-venue data directly in hourlyMap for stacked chart
    const chartVenueSet = new Set()
    Object.keys(hourlyMap).forEach(h => {
        const hi = Number(h)
        let totalActive = 0, totalCarded = 0
        Object.entries(hourVenueActive[hi]).forEach(([venue, val]) => {
            hourlyMap[hi][venue] = Math.round(val)
            totalActive += val
            chartVenueSet.add(venue)
        })
        Object.entries(hourVenueCarded[hi]).forEach(([venue, val]) => {
            totalCarded += val
        })
        hourlyMap[hi].active = Math.round(totalActive)
        hourlyMap[hi].carded = Math.round(Object.values(hourVenueCarded[hi]).reduce((s,v) => s+v, 0))
    })
    const chartVenues = [...chartVenueSet].sort()

    // sumActive = SUM of MAX per venue (distinct machines at peak across locations)
    const sumActive = Object.values(venueMaxMap).reduce((s, v) => s + v, 0)
    const sumCaredPeak = Object.values(venueCarded).reduce((s, v) => s + v, 0)

    // Prepare hourly chart array
    const hourlyChartData = Object.values(hourlyMap).filter(h => {
        if (selectedShift === 'all') return true;
        const shiftObj = SHIFTS.find(s => s.id === selectedShift)
        return shiftObj && shiftObj.hours.includes(h.hour);
    })

    // topLocations: always use rawData so all venues appear even when 1 location is filtered
    const rawLocMap = {}
    capacityData.forEach(c => {
        rawLocMap[c.Venue] = { total_capacity: c.total_machines, active_sessions: 0, hours_active: new Set() }
    })
    rawData.forEach(row => {
        const am = Number(row.active_machines) || 0
        if (!rawLocMap[row.Venue]) rawLocMap[row.Venue] = { total_capacity: 0, active_sessions: 0, hours_active: new Set() }
        rawLocMap[row.Venue].active_sessions += am
        rawLocMap[row.Venue].hours_active.add(row.hour)
    })
    const topLocations = Object.entries(rawLocMap)
      .filter(([venue]) => !venue.toLowerCase().includes('depozit'))
      .map(([venue, data]) => {
        const hoursCount = data.hours_active.size > 0 ? data.hours_active.size : 1
        const avgActivePerHour = data.active_sessions / hoursCount
        let occupancy = 0
        if (data.total_capacity > 0) occupancy = (avgActivePerHour / data.total_capacity) * 100
        const cleanVenue = venue.replace(/ E\.S/gi, '').trim()
        return {
            name: cleanVenue,
            fullName: cleanVenue,
            occupancy: Math.round(occupancy),
            avgActive: Number(avgActivePerHour.toFixed(1)),
            capacity: data.total_capacity
        }
    }).sort((a,b) => b.occupancy - a.occupancy).filter(l => l.capacity > 0).slice(0, 10)

    // Global KPIs
    const totalCapacity = capacityData.reduce((sum, c) => {
        if (selectedLocations.length === 0 || selectedLocations.includes(c.Venue)) {
             return sum + Number(c.total_machines || 0)
        }
        return sum
    }, 0)

    // Occupancy: peak active machines / total capacity
    const globalOccupancy = totalCapacity > 0 ? (sumActive / totalCapacity) * 100 : 0
    const cardingPercentage = sumActive > 0 ? (sumCaredPeak / sumActive) * 100 : 0

    return {
        sumActive,
        sumCared: sumCaredPeak,
        totalSpins,
        globalOccupancy,
        cardingPercentage,
        hourlyChartData,
        topLocations,
        chartVenues
    }

  }, [filteredData, rawData, capacityData, selectedShift, selectedLocations])

  // Columns for DataTable
  const columns = [
    {
      key: 'Venue',
      label: 'Locație',
      sortable: true,
      render: (item) => <span className="font-semibold text-slate-800">{item.Venue?.replace(/ E\.S/gi, '')?.trim()}</span>
    },
    {
      key: 'hour',
      label: 'Oră',
      sortable: true,
      render: (item) => <span className="text-slate-600 font-medium">{item.hour.toString().padStart(2, '0')}:00</span>
    },
    {
      key: 'active_machines',
      label: 'Aparate Active',
      sortable: true,
      render: (item) => <span className="text-blue-700 font-bold">{item.active_machines}</span>
    },
    {
      key: 'carded_players',
      label: 'Jucători cu card',
      sortable: true,
      render: (item) => <span className="text-purple-600 font-semibold">{item.carded_players}</span>
    },
    {
      key: 'total_spins',
      label: 'Total Spin-uri',
      sortable: true,
      render: (item) => <span className="text-emerald-700 font-bold">{Number(item.total_spins).toLocaleString('ro-RO')}</span>
    },
    {
      key: 'avg_spins',
      label: 'Spin-uri / Aparat',
      sortable: true,
      render: (item) => {
          const avg = item.active_machines > 0 ? item.total_spins / item.active_machines : 0;
          return <span className="text-slate-700">{Math.round(avg).toLocaleString('ro-RO')}</span>
      }
    }
  ]

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header & Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">Aparate Active</h1>
                <p className="text-xs text-slate-500 mt-0.5">Analiză orară a gradului de ocupare și cardare jucători</p>
              </div>
            </div>
            
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
             {/* Quick date shortcuts */}
             <div className="flex items-center gap-2">
               <span className="text-xs font-semibold text-slate-500 uppercase shrink-0">Perioadă:</span>
               {Object.entries(getQuickDates()).map(([key, val]) => (
                 <button
                   key={key}
                   onClick={() => handleQuickDate(key)}
                   className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                     activeQuick === key
                       ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                       : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                   }`}
                 >
                   {val.label}
                 </button>
               ))}
             </div>

             <div className="w-px h-6 bg-slate-300" />

             {/* Date range pickers */}
             <div className="flex items-center gap-2">
               <input
                 type="date"
                 value={startDate}
                 onChange={(e) => { setStartDate(e.target.value); setActiveQuick(null); }}
                 className="px-2 py-1.5 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
               />
               <span className="text-xs text-slate-400 font-medium">→</span>
               <input
                 type="date"
                 value={endDate}
                 min={startDate}
                 onChange={(e) => { setEndDate(e.target.value); setActiveQuick(null); }}
                 className="px-2 py-1.5 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
               />
               {isRange && (
                 <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                   Medie zilnică
                 </span>
               )}
             </div>

             <div className="w-px h-6 bg-slate-300" />

             {/* Shift Selector */}
             <div className="flex items-center gap-2">
               <span className="text-xs font-semibold text-slate-500 uppercase">Schimb:</span>
               <select
                 value={selectedShift}
                 onChange={(e) => setSelectedShift(e.target.value)}
                 className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
               >
                 {SHIFTS.map(s => (
                   <option key={s.id} value={s.id}>{s.label}</option>
                 ))}
               </select>
             </div>

             <div className="w-px h-6 bg-slate-300" />

             {/* Location dropdown with checkboxes */}
             <div className="relative">
               <button
                 onClick={() => setLocDropdownOpen(o => !o)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:border-indigo-400 transition-all font-medium"
               >
                 <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                 {selectedLocations.length === 0
                   ? 'Toate locațiile'
                   : `${selectedLocations.length} locație${selectedLocations.length > 1 ? 'i' : ''} selectată${selectedLocations.length > 1 ? 'te' : ''}`}
                 <span className="text-slate-400 text-xs">▾</span>
               </button>
               {locDropdownOpen && (
                 <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[200px] overflow-hidden">
                   <div className="p-2 border-b border-slate-100">
                     <button
                       onClick={() => { setSelectedLocations([]); setLocDropdownOpen(false); }}
                       className="w-full text-left px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                     >
                       ✓ Toate locațiile
                     </button>
                   </div>
                   <div className="p-2 space-y-1">
                     {availableLocations.map(loc => (
                       <label
                         key={loc.id}
                         className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                       >
                         <input
                           type="checkbox"
                           checked={selectedLocations.includes(loc.id)}
                           onChange={() => toggleLocation(loc.id)}
                           className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                         />
                         <span className="text-sm text-slate-700 font-medium">{loc.label}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center shadow-sm">
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Dashboard KPIs */}
        {!error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Aparate (Average Hourly Active) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Gamepad2 className="w-16 h-16 text-blue-600" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                     <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Aparate Active</p>
                     <p className="text-3xl font-black text-slate-800">{Math.round(processed.sumActive).toLocaleString('ro-RO')}</p>
                     <p className="text-xs text-slate-400">{isRange ? 'Sumă perioade selectate' : 'Total aparate-oră în zi'}</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Grad de Ocupare */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Percent className="w-16 h-16 text-emerald-600" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Grad Ocupare</p>
                    <p className="text-3xl font-black text-emerald-600">{processed.globalOccupancy.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400">Din total aparate per locație</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg">
                    <Percent className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Total Spins */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <RefreshCw className="w-16 h-16 text-indigo-600" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Spin-uri</p>
                     <p className="text-3xl font-black text-slate-800">{Math.round(processed.totalSpins).toLocaleString('ro-RO')}</p>
                    <p className="text-xs text-slate-400">În intervalul selectat</p>
                  </div>
                  <div className="p-2.5 bg-indigo-50 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Procent Cardare */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users className="w-16 h-16 text-purple-600" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Procent Cardare</p>
                    <p className="text-3xl font-black text-purple-600">{processed.cardingPercentage.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400">Jucători cu card din vizite</p>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Trend Chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                    Trend Orar (Aparate Active vs Cardare)
                  </h3>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={processed.hourlyChartData} margin={{ top: 24, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="hourLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#3b82f6' }} dx={-10} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8b5cf6' }} dx={10} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13, fontWeight: 600 }}
                        cursor={{ fill: 'rgba(59,130,246,0.06)' }}
                        formatter={(value, name) => [Math.round(value).toLocaleString('ro-RO'), name]}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}/>
                       {/* Stacked bars per venue - user can see each location's contribution */}
                       {(processed.chartVenues || []).map((venue, idx) => (
                         <Bar key={venue} yAxisId="left" dataKey={venue} name={venue} stackId="locations"
                           fill={COLORS[idx % COLORS.length]} maxBarSize={40}
                           radius={idx === (processed.chartVenues || []).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                         >
                           {idx === (processed.chartVenues || []).length - 1 && (
                             <LabelList dataKey="active" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#1e40af' }} formatter={(v) => v > 0 ? Math.round(v).toLocaleString('ro-RO') : ''} />
                           )}
                         </Bar>
                       ))}
                      <Line yAxisId="right" type="monotone" dataKey="carded" name="Jucători cu card" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Locations by Occupancy */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                    Top Grad Ocupare
                  </h3>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processed.topLocations} layout="vertical" margin={{ top: 0, right: 50, left: 20, bottom: 0 }} style={{ cursor: "pointer" }} onClick={(data) => { if (data && data.activePayload && data.activePayload[0]) { const venue = data.activePayload[0].payload.fullName; setSelectedLocations(prev => prev.length === 1 && prev[0] === venue ? [] : [venue]); setLocDropdownOpen(false); } }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} width={130} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value, name) => {
                          if (name === 'occupancy') return [`${Math.round(value)}%`, 'Grad Ocupare']
                          return [Math.round(value), name]
                        }}
                      />
                      <Bar dataKey="occupancy" name="occupancy" radius={[0, 4, 4, 0]} barSize={24}>
                        {processed.topLocations.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                         <LabelList dataKey="occupancy" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} formatter={(v) => v > 0 ? `${Math.round(v)}%` : ''} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wide">
                     Tabel Detaliat (Orar / Locație)
                   </h3>
                   <span className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-600 shadow-sm">
                       {filteredData.length} Rânduri
                   </span>
                </div>
                <div className="p-4">
                  <DataTable 
                      data={filteredData}
                      columns={columns}
                      initialSort={{ key: 'hour', direction: 'desc' }}
                  />
                </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default ActiveMachines
