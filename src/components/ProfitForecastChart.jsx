import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart } from 'recharts'
import { TrendingUp, AlertTriangle } from 'lucide-react'

const ProfitForecastChart = ({ monthlyData }) => {
    const chartData = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return { historical: [], forecast: [] }

        // Get last 12 months of actual data
        const historical = monthlyData.slice(-12).map((month, idx) => ({
            month: month.label || month.month,
            profit: month.pl || 0,
            isActual: true,
            index: idx
        }))

        // Simple linear regression for forecasting
        const n = historical.length
        const sumX = historical.reduce((sum, _, i) => sum + i, 0)
        const sumY = historical.reduce((sum, d) => sum + d.profit, 0)
        const sumXY = historical.reduce((sum, d, i) => sum + i * d.profit, 0)
        const sumX2 = historical.reduce((sum, _, i) => sum + i * i, 0)

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        const intercept = (sumY - slope * sumX) / n

        // Generate 3-month forecast
        const forecast = []
        const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const lastMonth = historical[historical.length - 1]

        for (let i = 1; i <= 3; i++) {
            const forecastValue = slope * (n + i - 1) + intercept
            forecast.push({
                month: monthNames[(monthNames.indexOf(lastMonth.month.substring(0, 3)) + i) % 12],
                profit: null,
                forecast: forecastValue,
                isActual: false,
                index: n + i - 1
            })
        }

        return { historical, forecast, combined: [...historical, ...forecast] }
    }, [monthlyData])

    const avgProfit = useMemo(() => {
        if (chartData.historical.length === 0) return 0
        return chartData.historical.reduce((sum, d) => sum + d.profit, 0) / chartData.historical.length
    }, [chartData])

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            const value = data.profit || data.forecast
            const isRisk = value < avgProfit * 0.8

            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white">{data.month}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {data.isActual ? 'Profit: ' : 'Predicție: '}
                        <span className={isRisk ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                            {value?.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
                        </span>
                    </p>
                    {isRisk && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Sub medie cu {((1 - value / avgProfit) * 100).toFixed(0)}%
                        </p>
                    )}
                </div>
            )
        }
        return null
    }

    if (!chartData.historical.length) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Trend Profit & Predicție
                    </h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nu există date disponibile</p>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Trend Profit & Predicție (3 luni)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Ultimele 12 luni + predicție bazată pe trend
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Medie lunară</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {avgProfit.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON
                    </p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData.combined} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="month"
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* Risk zone (below 80% of average) */}
                    <ReferenceLine
                        y={avgProfit * 0.8}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        label={{ value: 'Zonă Risc', position: 'right', fill: '#ef4444', fontSize: 11 }}
                    />

                    {/* Average line */}
                    <ReferenceLine
                        y={avgProfit}
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                        label={{ value: 'Medie', position: 'right', fill: '#3b82f6', fontSize: 11 }}
                    />

                    {/* Actual profit line */}
                    <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 4 }}
                        name="Profit Real"
                        connectNulls={false}
                    />

                    {/* Forecast line */}
                    <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#f59e0b', r: 4 }}
                        name="Predicție"
                        connectNulls={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-green-500" />
                    <span className="text-slate-600 dark:text-slate-400">Profit Real</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-orange-500 border-dashed border-t-2 border-orange-500" />
                    <span className="text-slate-600 dark:text-slate-400">Predicție</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-red-500 border-dashed border-t-2 border-red-500" />
                    <span className="text-slate-600 dark:text-slate-400">Zonă Risc</span>
                </div>
            </div>
        </div>
    )
}

export default ProfitForecastChart
