import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, MapPin, Award, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import axios from 'axios'

const PromotionsWidget = () => {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPromotions()
    window.addEventListener('promotionsUpdated', fetchPromotions)
    return () => window.removeEventListener('promotionsUpdated', fetchPromotions)
  }, [])

  const fetchPromotions = async () => {
    try {
      const response = await axios.get('/api/promotions')
      const allPromotions = Array.isArray(response.data) ? response.data : []
      
      // Filter out test promotions
      const filteredPromotions = allPromotions.filter(p => 
        !p.name?.toLowerCase().includes('test') && 
        !p.description?.toLowerCase().includes('test')
      )

      // Calculate active promotions based on actual dates from locations
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const activePromotions = filteredPromotions.filter(p => {
        // Parse locations
        let locations = []
        if (Array.isArray(p.locations)) {
          locations = p.locations
        } else if (typeof p.locations === 'string') {
          try {
            locations = JSON.parse(p.locations)
          } catch (_) {
            locations = []
          }
        }

        // Check if any location is currently active
        for (const loc of locations) {
          const startDate = loc.start_date ? new Date(loc.start_date) : null
          const endDate = loc.end_date ? new Date(loc.end_date) : null
          
          if (startDate) startDate.setHours(0, 0, 0, 0)
          if (endDate) endDate.setHours(0, 0, 0, 0)

          // If we have both dates, check if today is within range
          if (startDate && endDate) {
            if (today >= startDate && today <= endDate) {
              return true
            }
          }
          // If we only have end date, check if not expired
          else if (endDate && today <= endDate) {
            return true
          }
        }

        // Fallback: use global dates if no locations
        if (locations.length === 0) {
          const startDate = p.start_date ? new Date(p.start_date) : null
          const endDate = p.end_date ? new Date(p.end_date) : null
          
          if (startDate) startDate.setHours(0, 0, 0, 0)
          if (endDate) endDate.setHours(0, 0, 0, 0)

          if (startDate && endDate && today >= startDate && today <= endDate) {
            return true
          }
          if (endDate && today <= endDate) {
            return true
          }
        }

        return false
      })

      // Parse prizes and locations for each promotion
      const parsedPromotions = activePromotions.map(p => {
        let prizes = []
        if (Array.isArray(p.prizes)) {
          prizes = p.prizes
        } else if (typeof p.prizes === 'string') {
          try {
            prizes = JSON.parse(p.prizes)
          } catch (_) {
            prizes = []
          }
        }

        let locations = []
        if (Array.isArray(p.locations)) {
          locations = p.locations
        } else if (typeof p.locations === 'string') {
          try {
            locations = JSON.parse(p.locations)
          } catch (_) {
            locations = []
          }
        }

        // Get the primary location and period
        const firstLocation = locations.length > 0 ? locations[0] : null
        const startDate = firstLocation?.start_date || p.start_date
        const endDate = firstLocation?.end_date || p.end_date

        // Calculate total prize pool
        const prizePool = prizes.reduce((sum, prize) => {
          const amount = parseFloat(prize.amount) || 0
          const qty = parseInt(prize.quantity || prize.qty || 1)
          return sum + (amount * qty)
        }, 0)

        return {
          ...p,
          __prizes: prizes,
          __locations: locations,
          __startDate: startDate,
          __endDate: endDate,
          __prizePool: prizePool,
          __location: firstLocation?.location || p.location || 'Nespecificat'
        }
      })

      setPromotions(parsedPromotions)
    } catch (error) {
      console.error('Error fetching promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end - today
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return days
  }

  const totalPrizePool = promotions.reduce((sum, p) => sum + (p.__prizePool || 0), 0)

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
            const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7

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
                        <span>{promo.__location}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {promo.__endDate ? new Date(promo.__endDate).toLocaleDateString('ro-RO') : '-'}
                        </span>
                      </div>
                    </div>

                    {promo.__prizePool > 0 && (
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {promo.__prizePool.toLocaleString('ro-RO')} RON
                        </span>
                      </div>
                    )}
                  </div>

                  {daysRemaining !== null && (
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
                  )}
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

