import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'
import { formatCompactNumber, calculateYoYGrowth } from '../utils/plUtils'

const ComparisonCharts = ({ currentYearData, previousYearData }) => {
    // Prepare YoY comparison data
    const yoyData = currentYearData.map((current, idx) => {
        const previous = previousYearData[idx]
        const growth = calculateYoYGrowth(current.pl, previous?.pl || 0)

        return {
            month: current.label,
            current: current.pl,
            previous: previous?.pl || 0,
            growth: growth || 0
        }
    })

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null

        return (
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
                <p className="font-bold mb-2">{label}</p>
                {payload.map((entry, idx) => (
                    <p key={idx} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {formatCompactNumber(entry.value)} RON
                    </p>
                ))}
                {payload.length === 2 && (
                    <p className="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">
                        Creștere: {payload[0].payload.growth >= 0 ? '+' : ''}{payload[0].payload.growth.toFixed(1)}%
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* YoY Comparison */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-white/10 via-white/5 to-transparent" />

                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        Comparație An-cu-An
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={yoyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                            <XAxis
                                dataKey="month"
                                stroke="#64748b"
                                style={{ fontSize: '11px' }}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '11px' }}
                                tickFormatter={(value) => formatCompactNumber(value)}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '12px' }}
                                iconType="circle"
                            />
                            <Bar
                                dataKey="previous"
                                name="2025"
                                fill="#94a3b8"
                                radius={[4, 4, 0, 0]}
                                opacity={0.7}
                            />
                            <Bar
                                dataKey="current"
                                name="2026"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MoM Growth Trend */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-white/10 via-white/5 to-transparent" />

                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                        Trend Creștere Lunară
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={yoyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                            <XAxis
                                dataKey="month"
                                stroke="#64748b"
                                style={{ fontSize: '11px' }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#64748b"
                                style={{ fontSize: '11px' }}
                                tickFormatter={(value) => formatCompactNumber(value)}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#64748b"
                                style={{ fontSize: '11px' }}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '12px' }}
                                iconType="circle"
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="current"
                                name="Profit 2026"
                                stroke="#22c55e"
                                strokeWidth={3}
                                dot={{ fill: '#22c55e', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="growth"
                                name="Creștere YoY (%)"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                                opacity={0.6}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

export default ComparisonCharts
