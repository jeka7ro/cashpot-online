import React from 'react'
import { Trophy, TrendingUp, TrendingDown, Award } from 'lucide-react'
import { formatCompactNumber, getValueColor } from '../utils/plUtils'

const TopPerformers = ({ topLocations, bottomLocations }) => {
    const PerformerCard = ({ location, rank, isTop }) => {
        const Icon = rank === 1 ? Trophy : Award
        const iconColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-slate-400' : 'text-amber-600'

        return (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200 border border-slate-100 dark:border-transparent">
                {/* Rank badge */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${rank === 1 ? 'bg-yellow-500/20' : rank === 2 ? 'bg-slate-400/20' : 'bg-amber-600/20'
                    }`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {location.locationName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Marjă: {location.profitMargin?.toFixed(1)}%
                    </p>
                </div>

                {/* Value */}
                <div className="text-right">
                    <p className={`font-bold ${isTop ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCompactNumber(location.pl)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">RON</p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-white/10 via-white/5 to-transparent" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-emerald-500/20">
                            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Top Locații Profitabile
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {topLocations.map((location, idx) => (
                            <PerformerCard
                                key={location.locationName}
                                location={location}
                                rank={idx + 1}
                                isTop={true}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Performers */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-white/10 via-white/5 to-transparent" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-red-500/20">
                            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Locații cu Provocări
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {bottomLocations.map((location, idx) => (
                            <PerformerCard
                                key={location.locationName}
                                location={location}
                                rank={idx + 1}
                                isTop={false}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TopPerformers
