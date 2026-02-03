import React, { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { AlertCircle, Wallet, Zap, Coffee } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'
import axios from 'axios'

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6']

const CostAnalysis = ({ dateRange, locations }) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            if (!dateRange?.startDate) return
            setLoading(true)
            try {
                // CRITICAL: Do NOT send locations parameter - we want ALL expenses
                const res = await axios.get('/api/incasari/expenses-analysis', {
                    params: {
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate
                        // locations parameter REMOVED to show all expenses
                    }
                })
                if (res.data.success) {
                    setData(res.data.data)
                }
            } catch (err) {
                console.error('Failed to fetch cost analysis', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [dateRange]) // Removed 'locations' dependency

    const analysis = useMemo(() => {
        if (!data.length) return null

        // Backend now returns aggregated by department only
        const topDepts = data
            .slice(0, 10)
            .map(row => ({
                name: row.department || 'nespecificat',
                value: Number(row.total)
            }))

        // Anomalies: departments with unusually high costs (excluding rent/utilities)
        const anomalies = data
            .filter(row => {
                const dept = row.department || ''
                return !['chirie', 'electricitate', 'plata utilitati'].includes(dept) &&
                    Number(row.total) > 50000
            })
            .slice(0, 5)

        return { topDepts, anomalies }
    }, [data])

    if (loading) return <div className="p-10 text-center animate-pulse">Analiză Costuri...</div>
    if (!analysis) return null

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-red-500" />
                    Top Scurgeri de Bani (Fără Taxe)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysis.topDepts} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis type="number" tickFormatter={formatCompactNumber} />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                formatter={(val) => `${formatCompactNumber(val)} RON`}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {analysis.topDepts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Anomalies List */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Cheltuieli Mari Identificate
                </h3>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {analysis.anomalies.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                    {item.department === 'electricitate' ? <Zap size={16} /> :
                                        item.department === 'protocol' ? <Coffee size={16} /> :
                                            <AlertCircle size={16} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                                        {item.department}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Cheltuială mare detectată
                                    </p>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-red-500">
                                -{formatCompactNumber(Number(item.total))}
                            </span>
                        </div>
                    ))}
                    {analysis.anomalies.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-8">
                            Nu s-au detectat anomalii majore de costuri.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CostAnalysis
