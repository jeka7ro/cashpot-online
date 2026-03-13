import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { Calendar, MapPin, Download, RefreshCw, BarChart2, Activity } from 'lucide-react'
import axios from 'axios'
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts'

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const OperationalPerformanceMix = () => {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [rawData, setRawData] = useState([])
  const [error, setError] = useState(null)
  
  const _yesterday = new Date(); _yesterday.setDate(_yesterday.getDate() - 1);
  const [selectedDate, setSelectedDate] = useState(formatDateLocal(_yesterday))
  const [selectedLocations, setSelectedLocations] = useState([])

  // Calculate unique venues from incoming data if needed for simple filtering
  const [availableLocations, setAvailableLocations] = useState([])

  const fetchFilters = async () => {
    try {
      // Just a quick fetch from active-machines to get venues since performance-mix won't have capacity mapped initially
      const res = await axios.get('/api/operational/active-machines', { params: { date: selectedDate } });
      if (res.data?.capacity) {
        setAvailableLocations(res.data.capacity.map(c => ({ id: c.Venue, label: c.Venue })));
      }
    } catch (e) { console.error('Error fetching filters:', e) }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/operational/performance-mix', {
        params: { 
          date: selectedDate,
          locations: selectedLocations.length > 0 ? selectedLocations.join(',') : undefined
        }
      })
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Eroare la preluarea datelor.')
      }
      
      setRawData(response.data.data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching performance mix:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFilters();
  }, [selectedDate])

  useEffect(() => {
    if (selectedDate) fetchData()
  }, [selectedDate, selectedLocations])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await axios.post('/api/operational/sync', { days: 7 })
      if(res.data.success) {
        await fetchData()
        await fetchFilters()
      } else {
        setError(res.data.error || 'Eroare la sincronizare.')
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setSyncing(false)
    }
  }

  const processed = useMemo(() => {
    // We want 0-23 hours
    const hourlyMap = {}
    for (let i = 0; i < 24; i++) {
        hourlyMap[i] = { 
            hour: i, 
            hourLabel: `${i.toString().padStart(2, '0')}:00`, 
            total_in: 0, 
            total_money_in: 0, 
            games_played: 0,
            active_machines: 0
        }
    }

    let sumTI = 0;
    let sumTMI = 0;
    let sumGP = 0;

    rawData.forEach(row => {
        const h = row.hour;
        if(hourlyMap[h]) {
            const ti = Number(row.total_in) || 0;
            const tmi = Number(row.total_money_in) || 0;
            const gp = Number(row.games_played) || 0;
            const am = Number(row.active_machines) || 0;

            hourlyMap[h].total_in += ti;
            hourlyMap[h].total_money_in += tmi;
            hourlyMap[h].games_played += gp;
            // For active_machines, we should take the max across locations per hour? Or sum? Sum makes sense if we look at total estate.
            hourlyMap[h].active_machines += am;
            
            sumTI += ti;
            sumTMI += tmi;
            sumGP += gp;
        }
    });

    // Calculate %CT and Averages
    const finalData = Object.values(hourlyMap).map(h => {
        const pctTI = sumTI > 0 ? (h.total_in / sumTI) * 100 : 0;
        const pctTMI = sumTMI > 0 ? (h.total_money_in / sumTMI) * 100 : 0;
        const pctGP = sumGP > 0 ? (h.games_played / sumGP) * 100 : 0;
        
        const avrBet = h.games_played > 0 ? (h.total_in / h.games_played) : 0;
        // Eficienta Orara = Total Bet / Active Machines
        const eficienta = h.active_machines > 0 ? (h.total_in / h.active_machines) : 0;

        return {
            ...h,
            pctTI,
            pctTMI,
            pctGP,
            avrBet,
            eficienta
        }
    });

    return { hourly: finalData, sumTI, sumTMI, sumGP }

  }, [rawData])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-700">
          <p className="font-bold text-slate-800 dark:text-white mb-3 text-lg border-b border-slate-200 dark:border-slate-700 pb-2">Ora: {label}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex justify-between items-center space-x-6">
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {entry.name.includes('%') 
                    ? entry.value.toFixed(2) + '%' 
                    : new Intl.NumberFormat('ro-RO').format(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const exportCSV = () => {
    const headers = ['Ora', '%CT gGP', '%CT TI', '%CT TMI', 'Total In (TI)', 'Total Money In (TMI)', 'Games Played', 'Miza Medie (Avr Bet)', 'Eficienta Orara', 'Aparate Active']
    const csvContent = [
      headers.join(','),
      ...processed.hourly.map(r => [
        r.hourLabel,
        r.pctGP.toFixed(2),
        r.pctTI.toFixed(2),
        r.pctTMI.toFixed(2),
        r.total_in,
        r.total_money_in,
        r.games_played,
        r.avrBet.toFixed(2),
        r.eficienta.toFixed(2),
        r.active_machines
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mix_performanta_${selectedDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center">
              <Activity className="w-8 h-8 mr-3 text-blue-600" />
              Analiză Mix de Performanță
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Corelație Ocupare vs. Volum Financiar</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Se sincronizează...' : 'Sincronizează Date'}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2 text-indigo-500" />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl">
                <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-4">
            {/* Date Picker */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                Data Analizei
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Location Filter */}
            <div className="flex-[2] min-w-[300px]">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                Locații
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-h-[120px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => setSelectedLocations([])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedLocations.length === 0
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Toate / Total Rețea
                </button>
                {availableLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      if (selectedLocations.includes(loc.id)) {
                        setSelectedLocations(selectedLocations.filter(id => id !== loc.id))
                      } else {
                        setSelectedLocations([...selectedLocations, loc.id])
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedLocations.includes(loc.id)
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
            <div className="space-y-6">
                 {/* Main Chart */}
                 <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg shadow-indigo-500/30">
                            <BarChart2 className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Trend de Volume (% din Total)</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Vizualizare vârfuri pe ore (Clustered Column Chart)</p>
                        </div>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={processed.hourly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                <XAxis dataKey="hourLabel" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `${val}%`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={10} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                
                                <Bar yAxisId="left" dataKey="pctGP" name="%CT gGP (Ocupare)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar yAxisId="left" dataKey="pctTI" name="%CT TI (Bet)" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar yAxisId="left" dataKey="pctTMI" name="%CT TMI (Bani Intr.)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                
                                {/* Overlay average bet or eficienta on secondary axis as line trend */}
                                <Line yAxisId="right" type="monotone" dataKey="eficienta" name="Eficiență Orară (Bet/Aparat)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff'}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table Matrix */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                            Matrice Comparativă Orară
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Ora</th>
                                    <th className="px-6 py-4 font-bold text-right text-blue-600">%CT gGP<br/>(Ocupare)</th>
                                    <th className="px-6 py-4 font-bold text-right text-purple-600">%CT TI<br/>(Vol. Pariere)</th>
                                    <th className="px-6 py-4 font-bold text-right text-emerald-600">%CT TMI<br/>(Flux Cash)</th>
                                    <th className="px-6 py-4 font-bold text-right text-orange-600">Avr Bet<br/>(Miza Medie)</th>
                                    <th className="px-6 py-4 font-bold text-right text-indigo-600">Eficiență Orară<br/>(Bet/Aparat)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processed.hourly.map((row, idx) => (
                                    <tr key={idx} className="border-b dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">
                                            {row.hourLabel}
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium">
                                            {row.pctGP > 0 ? `${row.pctGP.toFixed(2)}%` : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium">
                                            {row.pctTI > 0 ? `${row.pctTI.toFixed(2)}%` : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium">
                                            {row.pctTMI > 0 ? `${row.pctTMI.toFixed(2)}%` : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                                            {row.avrBet > 0 ? new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(row.avrBet) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                            {row.eficienta > 0 ? new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(row.eficienta) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  )
}

export default OperationalPerformanceMix
