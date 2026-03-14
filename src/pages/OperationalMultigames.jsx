import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import { Activity, Search, Download, Filter, RefreshCw, Gamepad2, Coins, Trophy } from 'lucide-react'
import axios from 'axios'
import { useData } from '../contexts/DataContext'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts'

const OperationalMultigames = () => {
  const { slots } = useData()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [error, setError] = useState(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVenue, setFilterVenue] = useState('')
  const [filterManufacturer, setFilterManufacturer] = useState('')
  const [filterCabinet, setFilterCabinet] = useState('')
  const [filterMix, setFilterMix] = useState('')

  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    return {
      startDate: formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatDateLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    }
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/operational/multigames`, {
        params: { 
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined
        }
      })
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to fetch data')
      }
      
      setData(response.data.data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching operational multigames:', err)
    } finally {
      setLoading(false)
    }
  }

  const [syncing, setSyncing] = useState(false)

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

  useEffect(() => {
    fetchData()
  }, [dateRange.startDate, dateRange.endDate])

  // Extragere valori unice pentru dropdown-uri
  const filterOptions = useMemo(() => {
    const venues = new Set();
    const manufacturers = new Set();
    const cabinets = new Set();
    const mixes = new Set();

    data.forEach(item => {
      if (item.Venue) venues.add(item.Venue);
      if (item.Manufacturer) manufacturers.add(item.Manufacturer);
      if (item.Cabinet) cabinets.add(item.Cabinet);
      if (item.Game_Slot) mixes.add(item.Game_Slot);
    });

    return {
      venues: Array.from(venues).sort(),
      manufacturers: Array.from(manufacturers).sort(),
      cabinets: Array.from(cabinets).sort(),
      mixes: Array.from(mixes).sort()
    };
  }, [data]);

  // Advanced filtering
  const filteredData = data.filter(item => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = (
        (item.Venue && item.Venue.toLowerCase().includes(searchLower)) ||
        (item.Serial_Number && item.Serial_Number.toLowerCase().includes(searchLower)) ||
        (item.Manufacturer && item.Manufacturer.toLowerCase().includes(searchLower)) ||
        (item.Cabinet && item.Cabinet.toLowerCase().includes(searchLower)) ||
        (item.Game_Slot && item.Game_Slot.toLowerCase().includes(searchLower)) ||
        (item.Game_Name_Mutligame && item.Game_Name_Mutligame.toLowerCase().includes(searchLower))
      );
      if (!matchSearch) return false;
    }

    if (filterVenue && (!item.Venue || !item.Venue.toLowerCase().includes(filterVenue.toLowerCase()))) return false;
    if (filterManufacturer && (!item.Manufacturer || !item.Manufacturer.toLowerCase().includes(filterManufacturer.toLowerCase()))) return false;
    if (filterCabinet && (!item.Cabinet || !item.Cabinet.toLowerCase().includes(filterCabinet.toLowerCase()))) return false;
    if (filterMix && (!item.Game_Slot || !item.Game_Slot.toLowerCase().includes(filterMix.toLowerCase()))) return false;

    return true;
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  const stats = useMemo(() => {
    let totalPlayed = 0;
    let totalBet = 0;
    let totalWin = 0;
    const gameMap = {};
    const manufacturerMap = {};
    const mixMap = {};

    filteredData.forEach(item => {
      const played = Number(item.Played_Games) || 0;
      const bet = Number(item.Bet) || 0;
      const win = Number(item.Win) || 0;
      const gameName = item.Game_Name_Mutligame || 'Necunoscut';
      const manufacturer = item.Manufacturer || 'Necunoscut';
      const mixSlot = item.Game_Slot || 'Necunoscut';

      totalPlayed += played;
      totalBet += bet;
      totalWin += win;

      if (played > 0) {
        gameMap[gameName] = (gameMap[gameName] || 0) + played;
        manufacturerMap[manufacturer] = (manufacturerMap[manufacturer] || 0) + played;
        mixMap[mixSlot] = (mixMap[mixSlot] || 0) + played;
      }
    });

    const topGames = Object.entries(gameMap)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const mfgData = Object.entries(manufacturerMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const mixData = Object.entries(mixMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 mixuri

    return { totalPlayed, totalBet, totalWin, totalProfit: totalBet - totalWin, topGames, mfgData, mixData };
  }, [filteredData]);

  // Map data to include computed RTP values for sorting
  const tableData = useMemo(() => {
    return filteredData.map(item => {
      const bet = (Number(item.Bet) || 0) / 100;
      const win = (Number(item.Win) || 0) / 100;
      const liveRtp = bet > 0 ? Number(((win / bet) * 100).toFixed(2)) : 0;
      
      let rtpCvt = null;
      let serialNumber = item.Serial_Number || null;

      if (slots && item.machine_id) {
        const slot = slots.find(s => String(s.id_server) === String(item.machine_id));
        if (slot) {
          if (slot.rtp) rtpCvt = Number(slot.rtp);
          if (slot.serial_number && !serialNumber) serialNumber = slot.serial_number;
        }
      }

      return {
        ...item,
        Serial_Number: serialNumber,
        Live_RTP: liveRtp,
        RTP_CVT: rtpCvt
      };
    });
  }, [filteredData, slots]);

  const columns = [
    {
      key: 'Venue',
      label: 'Venue',
      sortable: true,
      render: (item) => <span className="font-semibold text-slate-800">{item.Venue || '-'}</span>
    },
    {
      key: 'Serial_Number',
      label: 'Nr. Serie',
      sortable: true,
      render: (item) => <span className="font-mono text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">{item.Serial_Number || '-'}</span>
    },
    {
      key: 'Manufacturer',
      label: 'Manufacturer',
      sortable: true,
      render: (item) => <span className="text-slate-600">{item.Manufacturer || '-'}</span>
    },
    {
      key: 'Cabinet',
      label: 'Cabinet',
      sortable: true,
      render: (item) => <span className="text-slate-600 text-xs">{item.Cabinet || '-'}</span>
    },
    {
      key: 'Game_Slot',
      label: 'Mix / Slot',
      sortable: true,
      render: (item) => <span className="text-slate-700 font-medium text-xs">{item.Game_Slot || '-'}</span>
    },
    {
      key: 'Game_Name_Mutligame',
      label: 'Game Name',
      sortable: true,
      render: (item) => <span className="text-slate-800 font-bold text-xs">{item.Game_Name_Mutligame || '-'}</span>
    },
    {
      key: 'Played_Games',
      label: 'Played Games',
      sortable: true,
      render: (item) => <span className="text-blue-700 font-bold">{item.Played_Games?.toLocaleString('ro-RO') || '0'}</span>
    },
    {
      key: 'Bet',
      label: 'Bet',
      sortable: true,
      render: (item) => <span className="text-slate-700">{((Number(item.Bet) || 0) / 100).toLocaleString('ro-RO', { style: 'currency', currency: 'RON' })}</span>
    },
    {
      key: 'Win',
      label: 'Win',
      sortable: true,
      render: (item) => <span className="text-emerald-700 font-semibold">{((Number(item.Win) || 0) / 100).toLocaleString('ro-RO', { style: 'currency', currency: 'RON' })}</span>
    },
    {
      key: 'Profit',
      label: 'Profit (Bet−Win)',
      sortable: true,
      render: (item) => {
        const profit = ((Number(item.Bet)||0) - (Number(item.Win)||0)) / 100
        return <span className={`font-bold ${profit >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
          {profit.toLocaleString('ro-RO', { style: 'currency', currency: 'RON' })}
        </span>
      }
    },
    {
      key: 'Live_RTP',
      label: 'Live RTP',
      sortable: true,
      render: (item) => <span className="font-bold text-blue-700">{item.Live_RTP > 0 ? `${item.Live_RTP.toFixed(2)}%` : '0.00%'}</span>
    },
    {
      key: 'RTP_CVT',
      label: 'RTP CVT',
      sortable: true,
      render: (item) => <span className="font-bold text-purple-700">{item.RTP_CVT ? `${item.RTP_CVT}%` : '-'}</span>
    },
    {
      key: 'Last_Update',
      label: 'Last Update',
      sortable: true,
      render: (item) => <span className="text-slate-500 text-[10px]">{item.Last_Update ? new Date(item.Last_Update).toLocaleString('ro-RO') : '-'}</span>
    }
  ]

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header & Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">Operațional: Multigames</h1>
                <p className="text-xs text-slate-500 mt-0.5">Meters Snapshot (Lifetime)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto flex-nowrap pb-1">
              {/* Date Filters */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0">
                <QuickDateButtons onChange={setDateRange} />
                <div className="w-px h-6 bg-slate-300"></div>
                <DateRangeSelector
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={setDateRange}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-500/30 transition-all disabled:opacity-70 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Se sincronizează...' : 'Sincronizează Date'}</span>
              </button>
              
              <button 
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-3 border-t border-slate-100 mt-4 pt-4">
            <div className="flex flex-wrap items-center gap-3 w-full">
              {/* Main Search */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Căutare generală..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Column-level filters */}
              <select
                value={filterVenue}
                onChange={(e) => setFilterVenue(e.target.value)}
                className="w-24 md:w-32 px-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="">Locație Toate</option>
                {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select
                value={filterManufacturer}
                onChange={(e) => setFilterManufacturer(e.target.value)}
                className="w-24 md:w-32 px-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="">Prod. Toate</option>
                {filterOptions.manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={filterCabinet}
                onChange={(e) => setFilterCabinet(e.target.value)}
                className="w-24 md:w-32 px-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="">Cab. Toate</option>
                {filterOptions.cabinets.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterMix}
                onChange={(e) => setFilterMix(e.target.value)}
                className="w-24 md:w-32 px-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
              >
                <option value="">Mix Toate</option>
                {filterOptions.mixes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {(filterVenue || filterManufacturer || filterCabinet || filterMix || searchTerm) && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilterVenue(''); setFilterManufacturer(''); setFilterCabinet(''); setFilterMix(''); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline decoration-blue-300 underline-offset-2 shrink-0 px-2"
                >
                  Resetează
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Export Button */}
              <div className="shrink-0">
                <button className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-start">
            <div className="font-bold mr-2">Eroare BD:</div>
            <div>{error}</div>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && data.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-600 shadow-lg shadow-blue-500/30 text-white rounded-xl">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800/70 uppercase tracking-wider mb-0.5">Total Mâini Jucate</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalPlayed.toLocaleString('ro-RO')}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-amber-500 shadow-lg shadow-amber-500/30 text-white rounded-xl">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800/70 uppercase tracking-wider mb-0.5">Total Bet</p>
                  <p className="text-2xl font-bold text-amber-900">RON {stats.totalBet.toLocaleString('ro-RO', {maximumFractionDigits: 0})}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-500 shadow-lg shadow-emerald-500/30 text-white rounded-xl">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800/70 uppercase tracking-wider mb-0.5">Total Win</p>
                  <p className="text-2xl font-bold text-emerald-900">RON {stats.totalWin.toLocaleString('ro-RO', {maximumFractionDigits: 0})}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-violet-600 shadow-lg shadow-violet-500/30 text-white rounded-xl">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-800/70 uppercase tracking-wider mb-0.5">Profit (Bet − Win)</p>
                  <p className="text-2xl font-bold text-violet-900">RON {stats.totalProfit.toLocaleString('ro-RO', {maximumFractionDigits: 0})}</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Top 5 Tipuri de Jocuri (Mâini jucate)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topGames} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(val) => (val/1000).toFixed(0) + 'k'} style={{ fontSize: '10px' }} />
                      <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px', fontWeight: 600, fill: '#475569' }} />
                      <RechartsTooltip 
                        formatter={(value) => [value.toLocaleString('ro-RO'), 'Mâini jucate']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#f1f5f9'}}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                        {stats.topGames.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                  Market Share Producători
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.mfgData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.mfgData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [value.toLocaleString('ro-RO'), 'Mâini jucate']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  Market Share Mixuri
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.mixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.mixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [value.toLocaleString('ro-RO'), 'Mâini jucate']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          <DataTable
            data={tableData}
            columns={columns}
            searchQuery=""
            itemsPerPage={50}
            compact={true}
          />

          {/* Total row - toate înregistrările filtrate */}
          {!loading && tableData.length > 0 && (() => {
            const totalBet   = tableData.reduce((s, r) => s + (Number(r.Bet)  || 0), 0) / 100
            const totalWin   = tableData.reduce((s, r) => s + (Number(r.Win)  || 0), 0) / 100
            const totalGames = tableData.reduce((s, r) => s + (Number(r.Played_Games) || 0), 0)
            const totalProfit = totalBet - totalWin
            const totalRTP   = totalBet > 0 ? (totalWin / totalBet * 100).toFixed(2) : '0.00'
            const fmtRON = v => v.toLocaleString('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 })
            return (
              <div className="border-t-2 border-slate-300 bg-slate-800 text-white px-4 py-2.5 flex flex-wrap gap-6 text-sm font-bold">
                <span className="text-slate-400 uppercase text-xs tracking-wider self-center">
                  TOTAL ({tableData.length.toLocaleString('ro-RO')} rânduri)
                </span>
                <span>Bet: <span className="text-blue-300">{fmtRON(totalBet)}</span></span>
                <span>Win: <span className="text-emerald-300">{fmtRON(totalWin)}</span></span>
                <span>Profit: <span className={totalProfit >= 0 ? 'text-violet-300' : 'text-red-400'}>{fmtRON(totalProfit)}</span></span>
                <span>Jocuri: <span className="text-amber-300">{totalGames.toLocaleString('ro-RO')}</span></span>
                <span>RTP Live: <span className="text-purple-300">{totalRTP}%</span></span>
              </div>
            )
          })()}
        </div>
      </div>
    </Layout>
  )
}

export default OperationalMultigames
