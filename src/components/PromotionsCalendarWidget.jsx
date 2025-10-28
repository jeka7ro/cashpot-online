import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'

const PromotionsCalendarWidget = () => {
  const [promotions, setPromotions] = useState([])
  const [locationColors, setLocationColors] = useState({})
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      const response = await axios.get('/api/promotions')
      // Filter out test promotions
      const filtered = response.data.filter(p => 
        !p.name?.toLowerCase().includes('test') && 
        !p.description?.toLowerCase().includes('test')
      )
      // Parse prizes / locations and prepare color mapping per location
      const palette = [
        '#0ea5e9', // sky-500
        '#22c55e', // green-500
        '#f59e0b', // amber-500
        '#ef4444', // red-500
        '#a855f7', // violet-500
        '#10b981', // emerald-500
        '#f97316', // orange-500
        '#14b8a6', // teal-500
        '#eab308', // yellow-500
        '#6366f1'  // indigo-500
      ]

      const colorMap = {}
      let colorIdx = 0

      const normalized = filtered.map(p => {
        // prizes can be array or JSON string
        let prizes = []
        if (Array.isArray(p.prizes)) prizes = p.prizes
        else if (typeof p.prizes === 'string') {
          try { prizes = JSON.parse(p.prizes) } catch (_) {}
        }

        // locations can be array or JSON string
        let locations = []
        if (Array.isArray(p.locations)) locations = p.locations
        else if (typeof p.locations === 'string') {
          try { locations = JSON.parse(p.locations) } catch (_) {}
        }

        // Assign colors per location deterministically for this session
        const primaryLocation = p.location || locations[0]?.location || 'Nespecificat'
        if (!colorMap[primaryLocation]) {
          colorMap[primaryLocation] = palette[colorIdx % palette.length]
          colorIdx++
        }

        return {
          ...p,
          __prizes: prizes,
          __locations: locations,
          __primaryLocation: primaryLocation
        }
      })

      setLocationColors(colorMap)
      setPromotions(normalized)
    } catch (error) {
      console.error('Error fetching promotions:', error)
    } finally {
      setLoading(false)
    }
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

  // Build list of prize items that happen exactly on the given date
  const getPrizeItemsForDate = (date) => {
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    const items = []
    for (const promo of promotions) {
      const prizes = promo.__prizes || []
      for (const prize of prizes) {
        if (!prize?.date) continue
        const d = new Date(prize.date)
        d.setHours(0, 0, 0, 0)
        if (d.getTime() === checkDate.getTime()) {
          const loc = promo.__primaryLocation
          items.push({
            id: `${promo.id}-${prize.date}-${loc}`,
            name: promo.name,
            location: loc,
            amount: prize.amount,
            color: locationColors[loc] || '#64748b'
          })
        }
      }
    }
    return items
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
    const monthName = currentMonth.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })

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
          title={hasPromotions ? prizeItems.map(it => `${it.name} @ ${it.location} - ${Number(it.amount||0).toLocaleString('ro-RO')} RON`).join(', ') : ''}
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
                  {it.location}: {Number(it.amount||0).toLocaleString('ro-RO')} RON
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

