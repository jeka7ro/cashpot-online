import React, { useMemo } from 'react'
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'

const NarrativeInsights = ({ metrics, topPerformers, bottomPerformers }) => {

    // Generate insights based on data
    const insights = useMemo(() => {
        if (!metrics) return []

        const list = []

        // 1. Profitability Trend
        if (metrics.plChange < -10) {
            list.push({
                type: 'critical',
                icon: TrendingDown,
                title: 'Scădere semnificativă a profitului',
                message: `Profitul net a scăzut cu ${Math.abs(metrics.plChange).toFixed(1)}% față de anul trecut, deși GGR-ul a variat cu ${metrics.ggrChange.toFixed(1)}%. Verifică eficiența operațională.`
            })
        } else if (metrics.plChange > 10) {
            list.push({
                type: 'success',
                icon: TrendingUp,
                title: 'Creștere solidă a profitabilității',
                message: `Performanță excelentă! Profitul a crescut cu ${metrics.plChange.toFixed(1)}%, depășind ritmul de creștere al cheltuielilor.`
            })
        }

        // 2. Margin Analysis
        if (metrics.profitMargin < 20) {
            list.push({
                type: 'warning',
                icon: AlertTriangle,
                title: 'Marjă de profit sub presiune',
                message: `Marja curentă este de doar ${metrics.profitMargin.toFixed(1)}%. Media industriei este de obicei peste 25-30%. Analizează taxele și chiriile.`
            })
        }

        // 3. Location Performance
        if (bottomPerformers && bottomPerformers.length > 0) {
            const worst = bottomPerformers[0]
            if (worst.pl < -10000) {
                list.push({
                    type: 'warning',
                    icon: AlertTriangle,
                    title: `Probleme critice la ${worst.locationName}`,
                    message: `Această locație a generat o pierdere de ${formatCompactNumber(worst.pl)} RON. Este responsabilă pentru o mare parte din scăderea totală.`
                })
            }
        }

        if (topPerformers && topPerformers.length > 0) {
            const best = topPerformers[0]
            list.push({
                type: 'info',
                icon: Lightbulb,
                title: `Starul rețelei: ${best.locationName}`,
                message: `A generat singură ${formatCompactNumber(best.pl)} RON profit (${best.profitMargin.toFixed(1)}% marjă). Poate funcționa ca model pentru celelalte locații.`
            })
        }

        return list
    }, [metrics, topPerformers, bottomPerformers])

    if (insights.length === 0) return null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {insights.map((insight, idx) => (
                <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start gap-4 transition-all hover:shadow-md
                        ${insight.type === 'critical' ? 'bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : ''}
                        ${insight.type === 'warning' ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : ''}
                        ${insight.type === 'success' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : ''}
                        ${insight.type === 'info' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : ''}
                    `}
                >
                    <div className={`p-2 rounded-lg 
                        ${insight.type === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : ''}
                        ${insight.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' : ''}
                        ${insight.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : ''}
                        ${insight.type === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : ''}
                    `}>
                        <insight.icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm mb-1
                             ${insight.type === 'critical' ? 'text-red-900 dark:text-red-200' : ''}
                             ${insight.type === 'warning' ? 'text-amber-900 dark:text-amber-200' : ''}
                             ${insight.type === 'success' ? 'text-emerald-900 dark:text-emerald-200' : ''}
                             ${insight.type === 'info' ? 'text-blue-900 dark:text-blue-200' : ''}
                        `}>
                            {insight.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {insight.message}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default NarrativeInsights
