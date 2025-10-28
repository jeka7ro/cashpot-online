import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, MapPin, Award, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import axios from 'axios'

const PromotionsWidget = () => {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivePromotions()
    const onUpdated = () => fetchActivePromotions()
    window.addEventListener('promotionsUpdated', onUpdated)
    return () => window.removeEventListener('promotionsUpdated', onUpdated)
  }, [])

  const fetchActivePromotions = async () => {
    try {
      const response = await axios.get('/api/promotions')

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const normalized = (response.data || [])
        // remove test promos
        .filter(p => !p.name?.toLowerCase().includes('test') && !p.description?.toLowerCase().includes('test'))
        // normalize locations/prizes and compute period + pool
        .map(p => {
          // Parse locations (array or JSON string)
          let locations = []
          if (Array.isArray(p.locations)) locations = p.locations
          else if (typeof p.locations === 'string') {
            try { locations = JSON.parse(p.locations) } catch (_) {}
          }

          const firstLocation = locations && locations.length > 0 ? locations[0] : null
          const startDate = firstLocation?.start_date || p.start_date
          const endDate = firstLocation?.end_date || p.end_date

          // Parse prizes (array or JSON string)
          let prizes = []
          if (Array.isArray(p.prizes)) prizes = p.prizes
          else if (typeof p.prizes === 'string') {
            try { prizes = JSON.parse(p.prizes) } catch (_) {}
          }

          const prizePool = prizes.reduce((sum, it) => sum + (Number(it?.amount) || 0), 0)

          return {
            ...p,
            __locations: locations,
            __primaryLocation: p.location || firstLocation?.location || 'Nespecificat',
            __startDate: startDate,
            __endDate: endDate,
            __prizes: prizes,
            __prizePool: prizePool
          }
        })
        // keep only active by date range
        .filter(p => {
          const start = p.__startDate ? new Date(p.__startDate) : null
          const end = p.__endDate ? new Date(p.__endDate) : null
          if (start) start.setHours(0, 0, 0, 0)
          if (end) end.setHours(0, 0, 0, 0)
          // active if today within [start, end] if both exist; or if end in future; or if any prize date in future
          if (start && end) return today >= start && today <= end
          if (end && today <= end) return true
          // fallback: active if any prize in future
          const anyFuturePrize = (p.__prizes || []).some(pr => {
            if (!pr?.date) return false
            const d = new Date(pr.date); d.setHours(0,0,0,0)
            return d >= today
          })
          return anyFuturePrize
        })

      setPromotions(normalized)
    } catch (error) {
      console.error('Error fetching active promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const totalPrizePool = promotions.reduce((sum, p) => sum + (Number(p.__prizePool) || 0), 0)

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Promoții Active</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {promotions.length} campanii în desfășurare
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600 dark:text-slate-400">Fond Total</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalPrizePool.toLocaleString('ro-RO')} RON
          </p>
        </div>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-8">
          <TrendingUp className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Nu există promoții active</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.slice(0, 5).map((promo) => {
            const daysRemaining = getDaysRemaining(promo.__endDate)
            const isExpiringSoon = daysRemaining <= 7

            return (
              <div 
                key={promo.id}
                className={`p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer ${
                  isExpiringSoon 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{promo.name}</h4>
                      {isExpiringSoon && (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        <span>{promo.__primaryLocation}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{promo.__endDate ? new Date(promo.__endDate).toLocaleDateString('ro-RO') : '-'}</span>
                      </div>
                    </div>

                    {promo.__prizePool > 0 && (
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {Number(promo.__prizePool).toLocaleString('ro-RO')} RON
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {daysRemaining}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {daysRemaining === 1 ? 'zi rămasă' : 'zile rămase'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {promotions.length > 5 && (
        <button className="mt-4 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center justify-center space-x-1">
          <span>Vezi toate ({promotions.length})</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default PromotionsWidget

