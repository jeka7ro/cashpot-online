import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { TrendingUp, Brain, AlertCircle } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'

const PredictiveAnalytics = ({ historicalData, predictions }) => {
    if (!predictions || predictions.length === 0) return null

    // Combine historical and predicted data
    const chartData = [
        ...historicalData.slice(-6).map((d, idx) => ({
            month: d.label,
            actual: d.pl,
            type: 'historical',
            index: idx
        })),
        ...predictions.map((p, idx) => ({
            month: `Predicție ${idx + 1}`,
            predicted: p.value,
            confidence: p.confidence,
            type: 'predicted',
            index: historicalData.length + idx
        }))
    ]

    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null

        const data = payload[0].payload
        return (
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
                <p className="font-bold mb-2">{label}</p>
                {data.type === 'historical' ? (
                    <p className="text-emerald-400">
                        Actual: {formatCompactNumber(data.actual)} RON
                    </p>
                ) : (
                    <>
                        <p className="text-indigo-400">
                            Predicție: {formatCompactNumber(data.predicted)} RON
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Încredere: {data.confidence}%
                        </p>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-600/50 p-6 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/20">
                            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Predicții AI
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Următoarele {predictions.length} luni
                            </p>
                        </div>
                    </div>

                    {/* Confidence badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {avgConfidence.toFixed(0)}% încredere
                        </span>
                    </div>
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
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

                        {/* Historical line */}
                        <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ fill: '#22c55e', r: 4 }}
                            connectNulls
                        />

                        {/* Predicted line with area */}
                        <Area
                            type="monotone"
                            dataKey="predicted"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fill="url(#predictedGradient)"
                            strokeDasharray="5 5"
                            dot={{ fill: '#6366f1', r: 4 }}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>

                {/* Insights */}
                <div className="mt-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Insight AI
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                {predictions[0].value > historicalData[historicalData.length - 1].pl ? (
                                    <>
                                        Modelul prevede o <span className="font-semibold text-emerald-600 dark:text-emerald-400">creștere</span> de{' '}
                                        {formatCompactNumber(predictions[0].value - historicalData[historicalData.length - 1].pl)} RON{' '}
                                        în luna următoare.
                                    </>
                                ) : (
                                    <>
                                        Modelul prevede o <span className="font-semibold text-red-600 dark:text-red-400">scădere</span> de{' '}
                                        {formatCompactNumber(historicalData[historicalData.length - 1].pl - predictions[0].value)} RON{' '}
                                        în luna următoare.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PredictiveAnalytics
