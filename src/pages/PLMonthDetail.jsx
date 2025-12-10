import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Activity, Percent, FileSpreadsheet } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts'

const PLMonthDetail = () => {
  const { year, month } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [expenditures, setExpenditures] = useState([])
  const [incasari, setIncasari] = useState([])
  
  // Calculează startDate și endDate pentru luna selectată
  const startDate = useMemo(() => {
    const d = new Date(parseInt(year), parseInt(month) - 1, 1)
    return d.toISOString().split('T')[0]
  }, [year, month])
  
  const endDate = useMemo(() => {
    const d = new Date(parseInt(year), parseInt(month), 0)
    return d.toISOString().split('T')[0]
  }, [year, month])
  
  const monthLabel = useMemo(() => {
    const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                        'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }, [year, month])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch cheltuieli
        const [expendituresResp, incasariResp] = await Promise.all([
          axios.get('/api/expenditures/sql-table', {
            params: {
              startDate,
              endDate,
              department: 'all',
              type: 'all',
              location: 'all',
              dataSource: 'all',
              sortBy: 'operational_date',
              order: 'asc',
              page: 1,
              pageSize: 10000
            }
          }),
          axios.get('/api/incasari/avg-in-by-location', {
            params: {
              startDate,
              endDate
            }
          })
        ])

        // Procesează cheltuielile - grupează pe departament și tip
        const expendituresData = expendituresResp.data?.success ? (expendituresResp.data.data || []) : []
        
        // Verifică dacă există mai multe pagini
        const totalRecords = expendituresResp.data?.pagination?.total || 0
        const pageSize = 10000
        const needsPagination = totalRecords > pageSize
        
        let allExpendituresData = expendituresData
        if (needsPagination) {
          const totalPages = Math.ceil(totalRecords / pageSize)
          const additionalPages = []
          
          for (let page = 2; page <= totalPages; page++) {
            try {
              const pageResp = await axios.get('/api/expenditures/sql-table', {
                params: {
                  startDate,
                  endDate,
                  department: 'all',
                  type: 'all',
                  location: 'all',
                  dataSource: 'all',
                  sortBy: 'operational_date',
                  order: 'asc',
                  page,
                  pageSize
                }
              })
              
              if (pageResp.data?.success && pageResp.data.data) {
                additionalPages.push(...pageResp.data.data)
              }
            } catch (error) {
              console.error(`❌ Eroare la încărcarea paginii ${page}:`, error)
            }
          }
          
          allExpendituresData = [...expendituresData, ...additionalPages]
        }
        
        const expendituresByDeptType = new Map()
        
        allExpendituresData.forEach((item) => {
          const dept = item.department_name || 'Nespecificat'
          const type = item.expenditure_type || 'Nespecificat'
          const key = `${dept}|||${type}`
          const amount = Number(item.amount || 0)
          
          if (expendituresByDeptType.has(key)) {
            const existing = expendituresByDeptType.get(key)
            existing.amount += amount
            existing.count += 1
          } else {
            expendituresByDeptType.set(key, {
              department: dept,
              type: type,
              amount: amount,
              count: 1
            })
          }
        })

        const sortedExpenditures = Array.from(expendituresByDeptType.values()).sort((a, b) => {
          if (a.department !== b.department) {
            return a.department.localeCompare(b.department)
          }
          return a.type.localeCompare(b.type)
        })
        
        setExpenditures(sortedExpenditures)

        // Procesează încasările
        if (incasariResp.data?.success) {
          setIncasari(incasariResp.data.rows || [])
        } else {
          setIncasari([])
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea detaliilor:', error)
        toast.error('Eroare la încărcarea detaliilor')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate])

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0'
    const num = Number(value)
    if (Number.isNaN(num)) return '0'
    return Math.round(num).toLocaleString('ro-RO', { 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    })
  }

  // Calculează totalurile
  const totals = useMemo(() => {
    const totalExpenditures = expenditures.reduce((sum, item) => sum + item.amount, 0)
    const totalGgr = incasari.reduce((sum, item) => sum + (item.totalProfit || 0), 0)
    const totalIn = incasari.reduce((sum, item) => sum + (item.totalIn || 0), 0)
    const totalBet = incasari.reduce((sum, item) => sum + (item.totalBet || item.total_bet || 0), 0)
    const totalMarketing = incasari.reduce((sum, item) => 
      sum + 
      (item.totalJackpot || item.total_jackpot || 0) +
      (item.totalHh || item.total_hh || 0) +
      (item.totalCbReal || item.total_cb_real || 0) +
      (item.totalCbBirthday || item.total_cb_birthday || 0) +
      (item.totalCbRaffle || item.total_cb_raffle || 0)
    , 0)
    const pl = totalGgr - totalExpenditures
    const plPercent = totalGgr > 0 ? (pl / totalGgr) * 100 : 0
    const expensesPercent = totalGgr > 0 ? (totalExpenditures / totalGgr) * 100 : 0
    
    return {
      totalExpenditures,
      totalGgr,
      totalIn,
      totalBet,
      totalMarketing,
      pl,
      plPercent,
      expensesPercent
    }
  }, [expenditures, incasari])

  // Date pentru graficul cheltuieli pe departament
  const expendituresByDept = useMemo(() => {
    const deptMap = new Map()
    expenditures.forEach(item => {
      const dept = item.department
      if (deptMap.has(dept)) {
        deptMap.set(dept, deptMap.get(dept) + item.amount)
      } else {
        deptMap.set(dept, item.amount)
      }
    })
    return Array.from(deptMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [expenditures])

  // Date pentru graficul cheltuieli pe tip
  const expendituresByType = useMemo(() => {
    const typeMap = new Map()
    expenditures.forEach(item => {
      const type = item.type
      if (typeMap.has(type)) {
        typeMap.set(type, typeMap.get(type) + item.amount)
      } else {
        typeMap.set(type, item.amount)
      }
    })
    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 tipuri
  }, [expenditures])

  // Date pentru graficul încasări pe locație
  const incasariByLocation = useMemo(() => {
    return incasari
      .map(item => ({
        name: item.locationName || 'Nespecificat',
        ggr: item.totalProfit || 0,
        in: item.totalIn || 0,
        bet: item.totalBet || item.total_bet || 0
      }))
      .sort((a, b) => b.ggr - a.ggr)
      .slice(0, 15) // Top 15 locații
  }, [incasari])

  // Culori pentru grafice
  const COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

  // Export Excel pentru tabelul de cheltuieli
  const handleExportExpendituresExcel = () => {
    try {
      if (expenditures.length === 0) {
        toast.error('Nu există date de exportat')
        return
      }

      const expendituresData = []
      expendituresData.push(['Departament', 'Tip', 'Sumă (RON)', 'Număr înregistrări', '% din Total'])
      
      expenditures.forEach((item) => {
        const percent = totals.totalExpenditures > 0 
          ? (item.amount / totals.totalExpenditures) * 100 
          : 0
        expendituresData.push([
          item.department,
          item.type,
          item.amount,
          item.count,
          percent.toFixed(2) + '%'
        ])
      })
      
      // Rând de total pentru cheltuieli
      expendituresData.push([
        'TOTAL Cheltuieli',
        '',
        totals.totalExpenditures,
        expenditures.reduce((sum, item) => sum + item.count, 0),
        '100%'
      ])

      const ws = XLSX.utils.aoa_to_sheet(expendituresData)
      ws['!cols'] = [
        { wch: 25 }, // Departament
        { wch: 30 }, // Tip
        { wch: 15 }, // Sumă
        { wch: 18 }, // Număr înregistrări
        { wch: 12 }  // %
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cheltuieli')

      const fileName = `PL_Cheltuieli_${monthLabel.replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success('✅ Excel exportat cu succes!')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  // Export Excel pentru tabelul de încasări
  const handleExportIncasariExcel = () => {
    try {
      if (incasari.length === 0) {
        toast.error('Nu există date de exportat')
        return
      }

      const incasariData = []
      incasariData.push(['Locație', 'IN (RON)', 'BET (RON)', 'GGR (RON)', 'Marketing (RON)'])
      
      incasari.forEach((item) => {
        const marketing = 
          (item.totalJackpot || item.total_jackpot || 0) +
          (item.totalHh || item.total_hh || 0) +
          (item.totalCbReal || item.total_cb_real || 0) +
          (item.totalCbBirthday || item.total_cb_birthday || 0) +
          (item.totalCbRaffle || item.total_cb_raffle || 0)
        
        incasariData.push([
          item.locationName || 'Nespecificat',
          item.totalIn || 0,
          item.totalBet || item.total_bet || 0,
          item.totalProfit || 0,
          marketing
        ])
      })
      
      // Rând de total pentru încasări
      incasariData.push([
        'TOTAL Încasări',
        totals.totalIn,
        totals.totalBet,
        totals.totalGgr,
        totals.totalMarketing
      ])

      const ws = XLSX.utils.aoa_to_sheet(incasariData)
      ws['!cols'] = [
        { wch: 25 }, // Locație
        { wch: 15 }, // IN
        { wch: 15 }, // BET
        { wch: 15 }, // GGR
        { wch: 15 }  // Marketing
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Încasări')

      const fileName = `PL_Incasari_${monthLabel.replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success('✅ Excel exportat cu succes!')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500 dark:text-slate-400">Se încarcă datele...</div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/pl')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Detalii P&L - {monthLabel}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {startDate} – {endDate}
              </p>
            </div>
          </div>
        </div>

        {/* Carduri cu totaluri */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total GGR</p>
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(totals.totalGgr)} RON
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cheltuieli</p>
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatNumber(totals.totalExpenditures)} RON
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {totals.expensesPercent.toFixed(1)}% din GGR
            </p>
          </div>
          
          <div className={`bg-gradient-to-br ${totals.pl >= 0 ? 'from-emerald-50 to-green-50' : 'from-red-50 to-pink-50'} dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">P&L</p>
              {totals.pl >= 0 ? (
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <p className={`text-3xl font-bold ${totals.pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatNumber(totals.pl)} RON
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {totals.plPercent.toFixed(1)}% din GGR
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total IN</p>
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(totals.totalIn)} RON
            </p>
          </div>
        </div>

        {/* Grafice */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafic cheltuieli pe departament */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Cheltuieli pe Departament
            </h3>
            <div className="h-80">
              {expendituresByDept.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                  Nu există date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expendituresByDept}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {expendituresByDept.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value) + ' RON'} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Grafic cheltuieli pe tip */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Top 10 Tipuri de Cheltuieli
            </h3>
            <div className="h-80">
              {expendituresByType.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                  Nu există date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expendituresByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis 
                      type="number" 
                      stroke="#64748b"
                      tickFormatter={(v) => formatNumber(v)} 
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#64748b"
                      width={150}
                    />
                    <Tooltip formatter={(value) => formatNumber(value) + ' RON'} />
                    <Bar dataKey="value" fill="#3b82f6">
                      {expendituresByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Grafic încasări pe locație */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Top 15 Locații - GGR
          </h3>
          <div className="h-96">
            {incasariByLocation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                Nu există date
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incasariByLocation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tickFormatter={(v) => formatNumber(v)} 
                  />
                  <Tooltip formatter={(value) => formatNumber(value) + ' RON'} />
                  <Legend />
                  <Bar dataKey="ggr" name="GGR" fill="#22c55e" />
                  <Bar dataKey="in" name="IN" fill="#3b82f6" />
                  <Bar dataKey="bet" name="BET" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabel cheltuieli pe departament și tip */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Cheltuieli pe Departament și Tip
            </h3>
            {expenditures.length > 0 && (
              <button
                onClick={handleExportExpendituresExcel}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 8px 28px rgba(22, 163, 74, 0.5)'
                }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 text-left text-slate-700 dark:text-slate-300 font-semibold">Departament</th>
                  <th className="py-3 px-4 text-left text-slate-700 dark:text-slate-300 font-semibold">Tip</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">Sumă</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">Număr înregistrări</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">% din Total</th>
                </tr>
              </thead>
              <tbody>
                {expenditures.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                      Nu există cheltuieli pentru această lună
                    </td>
                  </tr>
                ) : (
                  <>
                    {expenditures.map((item, idx) => {
                      const percent = totals.totalExpenditures > 0 
                        ? (item.amount / totals.totalExpenditures) * 100 
                        : 0
                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-200 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">{item.department}</td>
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{item.type}</td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">
                            {formatNumber(item.amount)} RON
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {item.count}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {percent.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 font-semibold">
                      <td colSpan="2" className="py-4 px-4 text-slate-900 dark:text-slate-100">TOTAL Cheltuieli</td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">
                        {formatNumber(totals.totalExpenditures)} RON
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">
                        {expenditures.reduce((sum, item) => sum + item.count, 0)}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">100%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel încasări pe locație */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Încasări pe Locație
            </h3>
            {incasari.length > 0 && (
              <button
                onClick={handleExportIncasariExcel}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 8px 28px rgba(22, 163, 74, 0.5)'
                }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 text-left text-slate-700 dark:text-slate-300 font-semibold">Locație</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">IN</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">BET</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">GGR</th>
                  <th className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {incasari.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                      Nu există încasări pentru această lună
                    </td>
                  </tr>
                ) : (
                  <>
                    {incasari.map((item, idx) => {
                      const marketing = 
                        (item.totalJackpot || item.total_jackpot || 0) +
                        (item.totalHh || item.total_hh || 0) +
                        (item.totalCbReal || item.total_cb_real || 0) +
                        (item.totalCbBirthday || item.total_cb_birthday || 0) +
                        (item.totalCbRaffle || item.total_cb_raffle || 0)
                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-200 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">{item.locationName || 'Nespecificat'}</td>
                          <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-100">
                            {formatNumber(item.totalIn || 0)} RON
                          </td>
                          <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-100">
                            {formatNumber(item.totalBet || item.total_bet || 0)} RON
                          </td>
                          <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-100 font-semibold">
                            {formatNumber(item.totalProfit || 0)} RON
                          </td>
                          <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-100">
                            {formatNumber(marketing)} RON
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 font-semibold">
                      <td className="py-4 px-4 text-slate-900 dark:text-slate-100">TOTAL Încasări</td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">
                        {formatNumber(totals.totalIn)} RON
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">
                        {formatNumber(totals.totalBet)} RON
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">
                        {formatNumber(totals.totalGgr)} RON
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100">
                        {formatNumber(totals.totalMarketing)} RON
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PLMonthDetail


