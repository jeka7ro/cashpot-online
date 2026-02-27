import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'

const ACCENTS = {
    blue: { bar: '#3b82f6', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', badgeBg: 'bg-blue-50 dark:bg-blue-900/30', badgeText: 'text-blue-600 dark:text-blue-300' },
    purple: { bar: '#a855f7', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500', badgeBg: 'bg-purple-50 dark:bg-purple-900/30', badgeText: 'text-purple-600 dark:text-purple-300' },
    emerald: { bar: '#10b981', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30', badgeText: 'text-emerald-600 dark:text-emerald-300' },
    amber: { bar: '#f59e0b', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', badgeBg: 'bg-amber-50 dark:bg-amber-900/30', badgeText: 'text-amber-600 dark:text-amber-300' },
    cyan: { bar: '#06b6d4', iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-500', badgeBg: 'bg-cyan-50 dark:bg-cyan-900/30', badgeText: 'text-cyan-600 dark:text-cyan-300' },
    rose: { bar: '#f43f5e', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', badgeBg: 'bg-rose-50 dark:bg-rose-900/30', badgeText: 'text-rose-600 dark:text-rose-300' },
}

const KPICard = ({
    title,
    value,
    change,
    changeLabel,
    suffix = '',
    accent = 'emerald',
    icon: Icon,
    thresholdMode = false,
    thresholdValue = 10,
}) => {
    const a = ACCENTS[accent] || ACCENTS.emerald
    const isPositive = (change || 0) >= 0

    const numericValue =
        typeof value === 'string' && value.includes('%')
            ? parseFloat(value.replace('%', ''))
            : typeof value === 'number' ? value : 0

    const meetsThreshold = numericValue >= thresholdValue
    const thresholdColor = meetsThreshold ? '#22c55e' : numericValue >= thresholdValue * 0.5 ? '#f59e0b' : '#ef4444'

    return (
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 flex flex-col">
            {/* Top accent line */}
            <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: a.bar }} />

            <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Icon */}
                {Icon && (
                    <div className={`${a.iconBg} rounded-lg p-2 shrink-0`}>
                        <Icon className={`w-4 h-4 ${a.iconColor}`} />
                    </div>
                )}

                {/* Label + Value */}
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                            {typeof value === 'number' ? formatCompactNumber(value) : value}
                        </span>
                        {suffix && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{suffix}</span>}
                    </div>
                </div>

                {/* Badge */}
                {!thresholdMode && change !== undefined && (
                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${a.badgeBg} ${a.badgeText}`}>
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {isPositive ? '+' : ''}{Number(change || 0).toFixed(1)}%
                    </div>
                )}
                {thresholdMode && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: `${thresholdColor}1a`, color: thresholdColor }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: thresholdColor }} />
                        {meetsThreshold ? 'OK' : 'Sub'}
                    </div>
                )}
            </div>

            {/* Bottom label */}
            {changeLabel && (
                <div className="px-3 pb-2 -mt-1">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{changeLabel}</p>
                </div>
            )}
        </div>
    )
}

export default KPICard
