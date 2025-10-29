import React, { useState, useEffect, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'

const PromotionsCalendarWidget = () => {
  const [promotions, setPromotions] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
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
    } catch (error) {
      console.error('Error fetching promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate color map for locations
  const locationColors = useMemo(() => {
    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#10b981', '#f97316', '#14b8a6', '#eab308', '#6366f1']
    const colorMap = {}
    let colorIdx = 0

    promotions.forEach(promo => {
      if (promo.__locations && promo.__locations.length > 0) {
        promo.__locations.forEach(loc => {
          if (loc.location && !colorMap[loc.location]) {
            colorMap[loc.location] = colors[colorIdx % colors.length]
            colorIdx++
          }
        })
      } else if (promo.location && !colorMap[promo.location]) {
        colorMap[promo.location] = colors[colorIdx % colors.length]
        colorIdx++
      }
    })

    return colorMap
  }, [promotions])

  // Get prize items for a specific date
  const getPrizeItemsForDate = (date) => {
    // Normalize the check date to YYYY-MM-DD format for comparison
    const checkDate = new Date(date)
    const checkYear = checkDate.getFullYear()
    const checkMonth = checkDate.getMonth()
    const checkDay = checkDate.getDate()
    const items = []

    for (const promo of promotions) {
      const prizes = promo.__prizes || []
      
      for (const prize of prizes) {
        if (!prize.date) continue
        
        try {
          // Handle different date formats (Date object, ISO string, YYYY-MM-DD string)
          let prizeDate = null
          if (prize.date instanceof Date) {
            prizeDate = prize.date
          } else if (typeof prize.date === 'string') {
            // If it's already YYYY-MM-DD, create date directly
            if (/^\d{4}-\d{2}-\d{2}/.test(prize.date)) {
              prizeDate = new Date(prize.date + 'T00:00:00')
            } else {
              prizeDate = new Date(prize.date)
            }
          }
          
          if (!prizeDate || isNaN(prizeDate.getTime())) continue
          
          const prizeYear = prizeDate.getFullYear()
          const prizeMonth = prizeDate.getMonth()
          const prizeDay = prizeDate.getDate()
          
          // Compare year, month, day (ignoring time)
          if (prizeYear === checkYear && prizeMonth === checkMonth && prizeDay === checkDay) {
            // Find the location for this prize - check all locations
            let location = promo.location || 'Nespecificat'
            
            // Try to find location from __locations array
            if (promo.__locations && promo.__locations.length > 0) {
              // Use first location as default
              location = promo.__locations[0].location || location
              
              // If we have location info in prize or promo, use it
              if (promo.location) {
                location = promo.location
              }
            }
            
            items.push({
              id: `${promo.id}-${prize.date}-${location}-${prize.amount}`,
              name: promo.name || promo.title || 'Promoție',
              location: location,
              amount: parseFloat(prize.amount) || 0,
              color: locationColors[location] || '#64748b'
            })
          }
        } catch (e) {
          console.warn('Error parsing prize date:', prize.date, e)
        }
      }
    }

    return items
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const prizeItems = getPrizeItemsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const hasPromotions = prizeItems.length > 0

      days.push(
        <div
          key={day}
          className={`aspect-square p-2 border border-slate-200 dark:border-slate-700 rounded-lg transition-all ${
            isToday 
              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600' 
              : hasPromotions 
              ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700 hover:bg-pink-100 dark:hover:bg-pink-900/30 cursor-pointer'
              : 'hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
          title={hasPromotions ? prizeItems.map(it => `${it.name} @ ${it.location} - ${it.amount.toLocaleString('ro-RO')} RON`).join(', ') : ''}
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{day}</div>
          {hasPromotions && (
            <div className="space-y-1">
              {prizeItems.slice(0, 2).map((it) => (
                <div
                  key={it.id}
                  className="text-[10px] text-white px-1 py-0.5 rounded truncate"
                  title={`${it.name} @ ${it.location}`}
                  style={{ backgroundColor: it.color }}
                >
                  {it.location}: {Number(it.amount).toLocaleString('ro-RO')} RON
                </div>
              ))}
              {prizeItems.length > 2 && (
                <div className="text-[9px] text-pink-600 dark:text-pink-400 font-semibold">
                  +{prizeItems.length - 2} mai multe
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return days
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Calendar Promoții</h3>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
          {currentMonth.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
        </h4>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 p-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-600 rounded"></div>
          <span className="text-slate-600 dark:text-slate-400">Astăzi</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-300 dark:border-pink-700 rounded"></div>
          <span className="text-slate-600 dark:text-slate-400">Cu promoții</span>
        </div>
      </div>
    </div>
  )
}

export default PromotionsCalendarWidget

