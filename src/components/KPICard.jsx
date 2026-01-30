import React from 'react'
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, AlertCircle } from 'lucide-react'
import { formatCompactNumber, getValueColor } from '../utils/plUtils'

const KPICard = ({ title, value, change, changeLabel, icon: Icon, trend, healthScore }) => {
    const isPositive = change >= 0
    const trendColor = getValueColor(change)

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-600/50 p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent dark:from-white/15 dark:to-transparent" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <Icon className={`w-6 h-6 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                    </div>
                    {healthScore !== undefined && (
                        <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                                <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke={healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="4"
                                        strokeDasharray={`${(healthScore / 100) * 125.6} 125.6`}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{healthScore}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{title}</h3>

                {/* Value */}
                <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        {typeof value === 'number' ? formatCompactNumber(value) : value}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">RON</span>
                </div>

                {/* Trend */}
                <div className="flex items-center gap-2">
                    {isPositive ? (
                        <TrendingUp className="w-4 h-4" style={{ color: trendColor }} />
                    ) : (
                        <TrendingDown className="w-4 h-4" style={{ color: trendColor }} />
                    )}
                    <span className="text-sm font-semibold" style={{ color: trendColor }}>
                        {isPositive ? '+' : ''}{change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{changeLabel}</span>
                </div>

                {/* Trend indicator bar */}
                {trend && trend.length > 0 && (
                    <div className="mt-4 h-12 flex items-end gap-1">
                        {trend.slice(-12).map((val, idx) => {
                            const maxVal = Math.max(...trend.slice(-12))
                            const height = maxVal > 0 ? (val / maxVal) * 100 : 0
                            return (
                                <div
                                    key={idx}
                                    className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: val >= 0 ? '#22c55e' : '#ef4444',
                                        opacity: 0.3 + (idx / trend.length) * 0.7
                                    }}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default KPICard
