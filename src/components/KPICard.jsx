import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCompactNumber, getValueColor } from '../utils/plUtils'

const KPICard = ({ title, value, change, changeLabel, trend, healthScore, suffix = 'RON' }) => {
    const isPositive = change >= 0
    const trendColor = getValueColor(change)

    return (
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
            <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Header: Title and Trend (Top Row) */}
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-tight">{title}</h3>

                    {/* Trend Pill */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">
                        {isPositive ? (
                            <TrendingUp className="w-3 h-3" style={{ color: trendColor }} />
                        ) : (
                            <TrendingDown className="w-3 h-3" style={{ color: trendColor }} />
                        )}
                        <span className="font-semibold" style={{ color: trendColor }}>
                            {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Value (Middle) */}
                <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {typeof value === 'number' ? formatCompactNumber(value) : value}
                    </span>
                    {suffix && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{suffix}</span>
                    )}
                </div>

                {/* Footer: Trend Chart or Label */}
                <div className="h-8 flex flex-col justify-end">
                    {trend && trend.length > 0 ? (
                        <div className="h-8 flex items-end gap-0.5">
                            {trend.slice(-12).map((val, idx) => {
                                const maxVal = Math.max(...trend.slice(-12).map(Math.abs)) || 1
                                const height = (Math.abs(val) / maxVal) * 100
                                return (
                                    <div
                                        key={idx}
                                        className="flex-1 rounded-t-sm"
                                        style={{
                                            height: `${Math.max(height, 10)}%`, // Min height for visibility
                                            backgroundColor: val >= 0 ? '#22c55e' : '#ef4444',
                                            opacity: 0.5 + (idx / 12) * 0.5
                                        }}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                            {changeLabel}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default KPICard
