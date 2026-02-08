import React, { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Target } from 'lucide-react'

const LocationEfficiencyMatrix = ({ monthlyData, locations }) => {
    const chartData = useMemo(() => {
        if (!monthlyData || !locations) return []

        // Aggregate by location
        const locMap = {}

        monthlyData.forEach(month => {
            locations.forEach(loc => {
                if (!locMap[loc]) {
                    locMap[loc] = { location: loc, ggr: 0, pl: 0, expenses: 0 }
                }
                locMap[loc].ggr += month[`${loc}_ggr`] || 0
                locMap[loc].pl += month[`${loc}_pl`] || 0
                locMap[loc].expenses += month[`${loc}_expenses`] || 0
            })
        })

        // Calculate margin and format for chart
        return Object.values(locMap).map(loc => ({
            name: loc.location,
            ggr: loc.ggr,
            margin: loc.ggr > 0 ? (loc.pl / loc.ggr) * 100 : 0,
            expenses: loc.expenses
        })).filter(loc => loc.ggr > 0) // Only show locations with data
    }, [monthlyData, locations])

    const getColor = (margin) => {
        if (margin >= 10) return '#22c55e' // Green
        if (margin >= 5) return '#f59e0b' // Orange
        return '#ef4444' // Red
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white">{data.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        GGR: {data.ggr.toLocaleString('ro-RO')} RON
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Marjă: {data.margin.toFixed(1)}%
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
                        Matrice Eficiență Locații
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
                        Matrice Eficiență Locații
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        GGR vs Marjă Profit (Verde: &gt;10%, Portocaliu: 5-10%, Roșu: &lt;5%)
                    </p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        type="number"
                        dataKey="ggr"
                        name="GGR"
                        label={{ value: 'GGR Total (RON)', position: 'insideBottom', offset: -10 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                        type="number"
                        dataKey="margin"
                        name="Marjă"
                        label={{ value: 'Marjă Profit (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={10} stroke="#22c55e" strokeDasharray="3 3" label="Țintă 10%" />
                    <Scatter data={chartData} fill="#8884d8">
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.margin)} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-slate-600 dark:text-slate-400">Sănătos (&gt;10%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-slate-600 dark:text-slate-400">Moderat (5-10%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-slate-600 dark:text-slate-400">Risc (&lt;5%)</span>
                </div>
            </div>
        </div>
    )
}

export default LocationEfficiencyMatrix
