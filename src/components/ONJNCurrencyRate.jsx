import React, { useState } from 'react'
import { Euro, TrendingUp, Calendar, RefreshCw } from 'lucide-react'

const ONJNCurrencyRate = () => {
  const [loading, setLoading] = useState(false)

  // Cursuri valutare ONJN (conform Jurnalul Oficial al Uniunii Europene)
  const currencyRates = {
    EUR_2024_OCT: 4.9759, // Curs EUR stabilit în prima zi lucrătoare octombrie 2024 (JOUE)
    EUR_2025_OCT: 5.0820, // Curs EUR pentru 1 octombrie 2025 (BNR oficial)
    lastUpdated_2024: '2024-10-01',
    lastUpdated_2025: '2025-10-01',
    source: 'JOUE/BNR'
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Curs Valutar ONJN</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cursuri de referință</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Currency Cards - 2 smaller cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EUR Prima zi lucrătoare Octombrie 2024 */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Euro className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">EUR - Oct 2024</p>
                <p className="text-xs text-blue-500 dark:text-blue-300">Prima zi lucrătoare</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{currencyRates.EUR_2024_OCT.toFixed(4)}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">RON</p>
            </div>
          </div>
        </div>

        {/* EUR 1 Octombrie 2025 */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-100 dark:border-green-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Euro className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">EUR - 1 Oct 2025</p>
                <p className="text-xs text-green-500 dark:text-green-300">1 Octombrie 2025</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-green-800 dark:text-green-200">{currencyRates.EUR_2025_OCT.toFixed(4)}</p>
              <p className="text-xs text-green-600 dark:text-green-400">RON</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Cursuri oficiale JOUE/BNR</span>
          </div>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium">
            Sursa: {currencyRates.source}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ONJNCurrencyRate

