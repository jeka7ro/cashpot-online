import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'

const PromotionsCalendarWidget = () => {
  const [promotions, setPromotions] = useState([])
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
      setPromotions(filtered)
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

  const getPromotionsForDate = (date) => {
    return promotions.filter(promo => {
      const start = new Date(promo.start_date)
      const end = new Date(promo.end_date)
      const checkDate = new Date(date)
      
      // Set all to midnight for accurate comparison
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      checkDate.setHours(0, 0, 0, 0)
      
      return checkDate >= start && checkDate <= end
    })
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
      const dayPromotions = getPromotionsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const hasPromotions = dayPromotions.length > 0

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
          title={dayPromotions.length > 0 ? dayPromotions.map(p => p.name).join(', ') : ''}
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{day}</div>
          {hasPromotions && (
            <div className="space-y-1">
              {dayPromotions.slice(0, 2).map((promo, idx) => (
                <div 
                  key={idx}
                  className="text-[10px] bg-pink-500 text-white px-1 py-0.5 rounded truncate"
                  title={promo.name}
                >
                  {promo.name.substring(0, 15)}
                </div>
              ))}
              {dayPromotions.length > 2 && (
                <div className="text-[9px] text-pink-600 dark:text-pink-400 font-semibold">
                  +{dayPromotions.length - 2} mai multe
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

