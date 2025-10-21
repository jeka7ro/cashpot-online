import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { TrendingUp, MapPin, Building2, Calendar, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

const ONJNStatsWidget = ({ stats: propsStats, loading: propsLoading, onRefresh }) => {
  // Use props if available, otherwise fallback to local state
  const [localStats, setLocalStats] = useState(null)
  const [localLoading, setLocalLoading] = useState(true)

  const stats = propsStats || localStats
  const loading = propsLoading !== undefined ? propsLoading : localLoading

  useEffect(() => {
    // Only load locally if props are not provided
    if (propsStats === undefined && propsLoading === undefined) {
      loadStats()
    }
  }, [])

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/onjn-operators/stats')
      setLocalStats(response.data)
      // Also call the parent's refresh function if provided
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const activeCount = stats.byStatus.find(s => s.status === 'În exploatare')?.count || 0
  const inactiveCount = stats.byStatus.find(s => s.status === 'Scos din funcțiune')?.count || 0
  const activePercentage = stats.total > 0 ? ((activeCount / stats.total) * 100).toFixed(1) : 0

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/25">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Statistici Generale</h3>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
          title="Actualizează statisticile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="space-y-4">
        {/* Total & Active */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Aparate</span>
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
              {stats.total.toLocaleString('ro-RO')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">În Exploatare</span>
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {activeCount.toLocaleString('ro-RO')}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              {activePercentage}% din total
            </div>
          </div>
        </div>

        {/* Warnings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">Licențe Expirate</span>
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">
              {stats.expired}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">Expiră în 30 zile</span>
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
              {stats.expiringSoon}
            </div>
          </div>
        </div>

        {/* Geographic Coverage */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Acoperire Geografică</span>
            <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {stats.byCounty.length} județe
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Top: {stats.byCounty[0]?.county || 'N/A'} ({stats.byCounty[0]?.count || 0} aparate)
          </div>
        </div>
      </div>
    </div>
  )
}

export default ONJNStatsWidget

