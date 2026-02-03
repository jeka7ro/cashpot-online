import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { formatCompactNumber } from '../utils/plUtils'

const WaterfallChart = ({ data }) => {
    if (!data || data.length === 0) return null

    // Transform data for waterfall effect
    const chartData = data.map((item, idx) => {
        const prevCumulative = idx > 0 ? data[idx - 1].cumulative : 0
        return {
            ...item,
            start: item.isTotal ? 0 : (item.value >= 0 ? prevCumulative : item.cumulative),
            end: item.isTotal ? item.cumulative : (item.value >= 0 ? item.cumulative : prevCumulative),
            displayValue: Math.abs(item.value)
        }
    })

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null

        const data = payload[0].payload
        return (
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
                <p className="font-bold mb-1">{data.name}</p>
                <p className={`text-lg ${data.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.value >= 0 ? '+' : ''}{formatCompactNumber(data.value)} RON
                </p>
                <p className="text-sm text-slate-400 mt-1">
                    Cumulat: {formatCompactNumber(data.cumulative)} RON
                </p>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-white/10 via-white/5 to-transparent" />

            <div className="relative z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                    Waterfall P&L
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => formatCompactNumber(value)}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />

                        {/* Invisible bar for start position */}
                        <Bar dataKey="start" stackId="a" fill="transparent" />

                        {/* Visible bar for value */}
                        <Bar dataKey="displayValue" stackId="a" radius={[8, 8, 8, 8]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.isTotal
                                            ? '#6366f1' // indigo for total
                                            : entry.name === 'Marketing'
                                                ? '#f59e0b' // amber for marketing
                                                : entry.value >= 0
                                                    ? '#22c55e' // green for positive
                                                    : '#ef4444' // red for negative
                                    }
                                />
                            ))}
                            <LabelList
                                dataKey="displayValue"
                                position="top"
                                formatter={(value) => formatCompactNumber(value)}
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    fill: '#fff',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-emerald-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Venit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Marketing</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">OpEx</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-indigo-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Profit Net</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WaterfallChart
