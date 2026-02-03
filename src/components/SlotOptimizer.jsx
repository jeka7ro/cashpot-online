import React, { useState, useMemo } from 'react'
import { Calculator, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'

const SlotOptimizer = ({ locationData }) => {
    // locationData should be { locationName: 'Pitesti', slotsCount: 50, avgGgrPerSlot: 10000, ... }
    const [selectedLocation, setSelectedLocation] = useState(locationData?.[0]?.locationName || '')
    const [slotsToRemove, setSlotsToRemove] = useState(1)
    const [taxPerSlot, setTaxPerSlot] = useState(9000) // Default monthly tax estimation (RON)

    const currentLocation = useMemo(() =>
        locationData?.find(l => l.locationName === selectedLocation),
        [selectedLocation, locationData])

    const calculation = useMemo(() => {
        if (!currentLocation) return null

        // Est. GGR Loss: We assume we remove the LEAST performing slots.
        // Rule of thumb: Bottom slots might produce ~40% of the average.
        const retentionFactor = 0.4
        const estimatedGgrLoss = slotsToRemove * (currentLocation.avgGgrPerSlot || 0) * retentionFactor

        const taxSavings = slotsToRemove * taxPerSlot
        const netImpact = taxSavings - estimatedGgrLoss

        return { estimatedGgrLoss, taxSavings, netImpact }
    }, [currentLocation, slotsToRemove, taxPerSlot])

    if (!locationData || locationData.length === 0) return null

    return (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <Calculator size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Simulator Optimizare Taxe</h3>
                    <p className="text-slate-400 text-xs">Calculează impactul scoaterii sloturilor</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                            Alege Locația
                        </label>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full bg-slate-800 border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {locationData.map(l => (
                                <option key={l.locationName} value={l.locationName}>
                                    {l.locationName} ({l.slotsCount} sloturi)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex justify-between">
                            <span>Scoate Sloturi: {slotsToRemove}</span>
                            <span className="text-indigo-400">{slotsToRemove} buc</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max={Math.min(10, currentLocation?.slotsCount || 10)}
                            value={slotsToRemove}
                            onChange={(e) => setSlotsToRemove(Number(e.target.value))}
                            className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                            Taxă Lunară per Slot (RON)
                        </label>
                        <input
                            type="number"
                            value={taxPerSlot}
                            onChange={(e) => setTaxPerSlot(Number(e.target.value))}
                            className="w-full bg-slate-800 border-slate-600 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                {/* Results */}
                {calculation && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 flex flex-col justify-center space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-400 flex items-center gap-1">
                                <TrendingUp size={14} /> Economie Taxe
                            </span>
                            <span className="font-bold text-lg text-emerald-400">
                                +{formatCompactNumber(calculation.taxSavings)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-red-400 flex items-center gap-1">
                                <TrendingDown size={14} /> Pierdere GGR (Est.)
                            </span>
                            <span className="font-bold text-lg text-red-400">
                                -{formatCompactNumber(calculation.estimatedGgrLoss)}
                            </span>
                        </div>

                        <div className="h-px bg-slate-700 my-2"></div>

                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-300">Impact Net Lunar</span>
                            <span className={`font-bold text-2xl ${calculation.netImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {calculation.netImpact >= 0 ? '+' : ''}{formatCompactNumber(calculation.netImpact)} RON
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
                            *Estimare bazată pe ipoteza că se scot sloturile cu performanță slabă (40% din medie).
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SlotOptimizer
