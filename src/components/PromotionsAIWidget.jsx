import React, { useState, useEffect } from 'react'
import { Brain, AlertTriangle, CheckCircle, TrendingUp, Calendar, Zap, Info } from 'lucide-react'
import axios from 'axios'

const PromotionsAIWidget = () => {
  const [promotions, setPromotions] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPromotionsAndAnalyze()
    window.addEventListener('promotionsUpdated', fetchPromotionsAndAnalyze)
    return () => window.removeEventListener('promotionsUpdated', fetchPromotionsAndAnalyze)
  }, [])

  const fetchPromotionsAndAnalyze = async () => {
    try {
      const response = await axios.get('/api/promotions')
      const allPromotions = Array.isArray(response.data) ? response.data : []
      
      // Filter out test promotions
      const filteredPromotions = allPromotions.filter(p => 
        !p.name?.toLowerCase().includes('test') && 
        !p.description?.toLowerCase().includes('test')
      )

      // Parse all promotions with their locations and prizes
      const parsedPromotions = filteredPromotions.map(p => {
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

        return {
          ...p,
          __prizes: prizes,
          __locations: locations
        }
      })
      
      setPromotions(parsedPromotions)
      
      // AI Analysis using parsed data
      const aiInsights = analyzePromotions(parsedPromotions)
      setInsights(aiInsights)
    } catch (error) {
      console.error('Error fetching promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzePromotions = (promos) => {
    const insights = []

    // Group promotions by date - use locations array and prizes array
    const dateMap = new Map()
    
    promos.forEach(promo => {
      // Use locations array, or fallback to single location
      const locations = promo.__locations && promo.__locations.length > 0 
        ? promo.__locations 
        : (promo.location ? [{ location: promo.location, start_date: promo.start_date, end_date: promo.end_date }] : [])
      
      // Use prizes array for prize dates
      const prizes = promo.__prizes || []
      
      // For each location, check promotion period
      locations.forEach(loc => {
        const start = loc.start_date ? new Date(loc.start_date) : (promo.start_date ? new Date(promo.start_date) : null)
        const end = loc.end_date ? new Date(loc.end_date) : (promo.end_date ? new Date(promo.end_date) : null)
        
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return
        
        // Check each day in the promotion period
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0]
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, [])
          }
          dateMap.get(dateKey).push({ ...promo, __location: loc.location || promo.location })
        }
      })
      
      // Also check prize dates
      prizes.forEach(prize => {
        if (!prize.date) return
        try {
          const prizeDate = new Date(prize.date)
          if (isNaN(prizeDate.getTime())) return
          const dateKey = prizeDate.toISOString().split('T')[0]
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, [])
          }
          const location = locations[0]?.location || promo.location || 'Nespecificat'
          dateMap.get(dateKey).push({ ...promo, __location: location, __prizeDate: prizeDate })
        } catch (e) {
          console.warn('Error parsing prize date:', prize.date)
        }
      })
    })

    // AI INSIGHT 1: Detect same-day conflicts
    dateMap.forEach((promosOnDate, date) => {
      if (promosOnDate.length >= 2) {
        const locationGroups = {}
        promosOnDate.forEach(p => {
          const location = p.__location || p.location || 'Nespecificat'
          if (!locationGroups[location]) locationGroups[location] = []
          locationGroups[location].push(p)
        })

        Object.entries(locationGroups).forEach(([location, locPromos]) => {
          if (locPromos.length >= 2) {
            insights.push({
              type: 'critical',
              icon: AlertTriangle,
              title: '🔴 CONFLICT CRITIC',
              message: `${locPromos.length} promoții în aceeași zi (${new Date(date).toLocaleDateString('ro-RO')}) la ${location}`,
              details: locPromos.map(p => p.name || p.title || 'Promoție').join(', '),
              severity: 'high'
            })
          }
        })
      }
    })

    // AI INSIGHT 2: Detect consecutive days (1 day apart)
    const sortedDates = Array.from(dateMap.keys()).sort()
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const date1 = new Date(sortedDates[i])
      const date2 = new Date(sortedDates[i + 1])
      const dayDiff = Math.ceil((date2 - date1) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === 1) {
        const promo1 = dateMap.get(sortedDates[i])
        const promo2 = dateMap.get(sortedDates[i + 1])
        
        // Check if same location
        const loc1 = promo1[0]?.__location || promo1[0]?.location
        const loc2 = promo2[0]?.__location || promo2[0]?.location
        
        if (loc1 === loc2) {
          insights.push({
            type: 'warning',
            icon: AlertTriangle,
            title: '🟡 ZILE CONSECUTIVE',
            message: `Promoții la 1 zi distanță la ${loc1} (${date1.toLocaleDateString('ro-RO')} - ${date2.toLocaleDateString('ro-RO')})`,
            details: `Poate obosi audiența`,
            severity: 'medium'
          })
        }
      }
    }

    // AI INSIGHT 3: Optimization suggestions
    // Calculate total prize pool from prizes array
    const totalPrizePool = promos.reduce((sum, p) => {
      const prizes = p.__prizes || []
      return sum + prizes.reduce((prizeSum, prize) => {
        const amount = parseFloat(prize.amount) || 0
        const currency = prize.currency || 'RON'
        // Convert to RON for comparison
        if (currency === 'RON') return prizeSum + amount
        if (currency === 'EUR') return prizeSum + (amount * 5.0)
        if (currency === 'USD') return prizeSum + (amount * 4.5)
        return prizeSum + amount
      }, 0)
    }, 0)
    const avgPrize = promos.length > 0 ? totalPrizePool / promos.length : 0

    if (promos.length > 0) {
      const locationDistribution = {}
      promos.forEach(p => {
        // Count locations from locations array
        if (p.__locations && p.__locations.length > 0) {
          p.__locations.forEach(loc => {
            const locName = loc.location || p.location || 'Nespecificat'
            locationDistribution[locName] = (locationDistribution[locName] || 0) + 1
          })
        } else if (p.location) {
          locationDistribution[p.location] = (locationDistribution[p.location] || 0) + 1
        }
      })

      const mostActiveLocation = Object.entries(locationDistribution)
        .sort((a, b) => b[1] - a[1])[0]

      if (mostActiveLocation && mostActiveLocation[1] >= 3) {
        insights.push({
          type: 'info',
          icon: TrendingUp,
          title: '📊 ANALIZĂ DISTRIBUȚIE',
          message: `${mostActiveLocation[0]} are cele mai multe promoții (${mostActiveLocation[1]})`,
          details: 'Consideră diversificarea pe alte locații',
          severity: 'low'
        })
      }
    }

    // AI INSIGHT 4: Budget analysis
    if (promos.length > 0 && totalPrizePool > 0) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        title: '💰 ANALIZĂ BUGETE',
        message: `Fond total: ${totalPrizePool.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Lei`,
        details: `Premiu mediu: ${avgPrize.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Lei`,
        severity: 'low'
      })
    }

    // AI INSIGHT 5: Timeline gaps
    if (promos.length >= 2) {
      const dates = promos.flatMap(p => {
        // Use locations array dates or fallback to promo dates
        const locations = p.__locations && p.__locations.length > 0 ? p.__locations : []
        if (locations.length > 0) {
          return locations.flatMap(loc => {
            const start = loc.start_date ? new Date(loc.start_date) : (p.start_date ? new Date(p.start_date) : null)
            const end = loc.end_date ? new Date(loc.end_date) : (p.end_date ? new Date(p.end_date) : null)
            return [start, end].filter(d => d && !isNaN(d.getTime()))
          })
        } else {
          const start = p.start_date ? new Date(p.start_date) : null
          const end = p.end_date ? new Date(p.end_date) : null
          return [start, end].filter(d => d && !isNaN(d.getTime()))
        }
      }).sort((a, b) => a - b)

      const maxGap = Math.max(...dates.slice(1).map((date, i) => 
        Math.ceil((date - dates[i]) / (1000 * 60 * 60 * 24))
      ))

      if (maxGap > 14) {
        insights.push({
          type: 'info',
          icon: Calendar,
          title: '📅 GAP TEMPORAL',
          message: `Interval de ${maxGap} zile între promoții`,
          details: 'Consideră adăugarea unei promoții intermediare',
          severity: 'low'
        })
      }
    }

    // Sort by severity
    return insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Analiză AI Marketing</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {insights.length} insight-uri detectate
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            ✅ Totul arată perfect!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Nu sunt detectate conflicte sau probleme
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, idx) => {
            const Icon = insight.icon
            const colors = {
              critical: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
              warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400',
              info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400',
              success: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
            }

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${colors[insight.type]} transition-all hover:shadow-lg`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                    <p className="text-sm opacity-90 mb-1">{insight.message}</p>
                    {insight.details && (
                      <p className="text-xs opacity-75 italic">{insight.details}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Promoții Active</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{promotions.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Alerte Critice</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {insights.filter(i => i.severity === 'high').length}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PromotionsAIWidget

