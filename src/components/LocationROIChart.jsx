import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Target } from 'lucide-react'

const LocationROIChart = ({ monthlyData }) => {
    const chartData = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return []

        // Aggregate by location
        const locMap = {}

        monthlyData.forEach(month => {
            month.plByLoc.forEach(loc => {
                if (!locMap[loc.locationName]) {
                    locMap[loc.locationName] = { location: loc.locationName, profit: 0, expenses: 0 }
                }
                locMap[loc.locationName].profit += loc.pl
                locMap[loc.locationName].expenses += loc.expenses
            })
        })

        // Calculate ROI and sort
        return Object.values(locMap)
            .map(loc => ({
                location: loc.location,
                roi: loc.expenses > 0 ? (loc.profit / loc.expenses) * 100 : 0,
                profit: loc.profit,
                expenses: loc.expenses
            }))
            .sort((a, b) => b.roi - a.roi) // Sort descending by ROI
    }, [monthlyData])

    const getColor = (roi) => {
        if (roi >= 20) return '#22c55e' // Green
        if (roi >= 10) return '#f59e0b' // Yellow
        return '#ef4444' // Red
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white">{data.location}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        ROI: <span className="font-bold" style={{ color: getColor(data.roi) }}>
                            {data.roi.toFixed(1)}%
                        </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Profit: {data.profit.toLocaleString('ro-RO')} RON
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                        Cheltuieli: {data.expenses.toLocaleString('ro-RO')} RON
                    </p>
                </div>
            )
        }
        return null
    }

    if (chartData.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        ROI Ranking pe Locații
                    </h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nu există date disponibile</p>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        ROI Ranking pe Locații
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Return on Investment (Profit / Cheltuieli × 100)
                    </p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        type="number"
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'ROI (%)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                        type="category"
                        dataKey="location"
                        stroke="#94a3b8"
                        style={{ fontSize: '11px' }}
                        width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Target lines */}
                    <ReferenceLine
                        x={20}
                        stroke="#22c55e"
                        strokeDasharray="3 3"
                        label={{ value: 'Țintă 20%', position: 'top', fill: '#22c55e', fontSize: 10 }}
                    />
                    <ReferenceLine
                        x={10}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        label={{ value: 'Min 10%', position: 'top', fill: '#f59e0b', fontSize: 10 }}
                    />

                    <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.roi)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-slate-600 dark:text-slate-400">Excelent (≥20%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span className="text-slate-600 dark:text-slate-400">Acceptabil (10-20%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-slate-600 dark:text-slate-400">Risc (&lt;10%)</span>
                </div>
            </div>
        </div>
    )
}

export default LocationROIChart
