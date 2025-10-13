import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'

const ONJNCalendar = () => {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  // Calendarul provizoriu al ședințelor Comitetului de Supraveghere 2025
  const mockCommissions = [
    {
      id: 1,
      title: 'Comitetul de Supraveghere',
      date: '2025-10-16',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 16 octombrie 2025 (joi)'
    },
    {
      id: 2,
      title: 'Comitetul de Supraveghere',
      date: '2025-10-29',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 29 octombrie 2025 (miercuri)'
    },
    {
      id: 3,
      title: 'Comitetul de Supraveghere',
      date: '2025-11-13',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 13 noiembrie 2025 (joi)'
    },
    {
      id: 4,
      title: 'Comitetul de Supraveghere',
      date: '2025-11-27',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 27 noiembrie 2025 (joi)'
    },
    {
      id: 5,
      title: 'Comitetul de Supraveghere',
      date: '2025-12-11',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 11 decembrie 2025 (joi)'
    },
    {
      id: 6,
      title: 'Comitetul de Supraveghere',
      date: '2025-12-18',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 18 decembrie 2025 (joi)'
    },
    {
      id: 7,
      title: 'Comitetul de Supraveghere',
      date: '2026-01-15',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 15 ianuarie 2026 (joi)'
    },
    {
      id: 8,
      title: 'Comitetul de Supraveghere',
      date: '2026-01-29',
      time: '10:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Supraveghere',
      status: 'Programată',
      description: 'Ședința din 29 ianuarie 2026 (joi)'
    }
  ]

  useEffect(() => {
    loadCommissions()
  }, [])

  const loadCommissions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulare încărcare date - în producție se va face request la ONJN
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Filtrare pentru următoarele ședințe (următoarele 3 luni)
      const today = new Date()
      const nextThreeMonths = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
      
      const upcomingCommissions = mockCommissions.filter(commission => {
        const commissionDate = new Date(commission.date)
        return commissionDate >= today && commissionDate <= nextThreeMonths
      })
      
      setCommissions(upcomingCommissions)
    } catch (err) {
      setError('Eroare la încărcarea calendarului ONJN')
      console.error('Error loading ONJN calendar:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Programată':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'În desfășurare':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'Finalizată':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'Anulată':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Supraveghere':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'Autorizare':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
      case 'Metrologie':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
      case 'Control':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    return timeString
  }

  // Funcții pentru navigarea între luni
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(new Date().getMonth())
    setCurrentYear(new Date().getFullYear())
  }

  // Helper pentru a obține zilele din luna curentă
  const getCurrentMonthDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek, year: currentYear, month: currentMonth }
  }

  // Verifică dacă o zi are evenimente
  const hasEvent = (day) => {
    const { year, month } = getCurrentMonthDays()
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return mockCommissions.some(comm => comm.date === dateStr)
  }

  // Obține evenimentul pentru o zi specifică
  const getEventForDay = (day) => {
    const { year, month } = getCurrentMonthDays()
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return mockCommissions.find(comm => comm.date === dateStr)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Prima parte - Lista ședințe */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ședințe ONJN</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Următoarele 3 luni</p>
            </div>
          </div>
          <button
            onClick={loadCommissions}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizează calendarul"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      ) : commissions.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">Nu există ședințe ale Comitetului de Supraveghere în următoarele 3 luni</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {commissions.slice(0, 3).map((commission) => (
            <div
              key={commission.id}
              className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/20 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {commission.title}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(commission.type)}`}>
                      {commission.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(commission.status)}`}>
                      {commission.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{commission.description}</p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {formatDate(commission.date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {formatTime(commission.time)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs font-medium truncate">
                        {commission.location}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => window.open('https://onjn.gov.ro/structura-organizatorica/autorizare/', '_blank')}
                  className="ml-2 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Vezi pe site-ul ONJN"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {commissions.length > 3 && (
            <div className="text-center pt-2">
              <button
                onClick={() => window.open('/metrology', '_blank')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Vezi toate ședințele ({commissions.length})
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* A doua parte - Calendar vizual */}
      <div className="card p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Calendar Evenimente</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(currentYear, currentMonth).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            
            {/* Controale navigare */}
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                title="Luna anterioară"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-lg transition-colors"
                title="Azi"
              >
                Azi
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                title="Luna următoare"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Grid calendar */}
        <div className="space-y-2">
          {/* Zilele săptămânii */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
              <div key={index} className="text-center text-xs font-bold text-slate-600 dark:text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Zilele lunii */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const { daysInMonth, startingDayOfWeek, year, month } = getCurrentMonthDays()
              const days = []
              const today = new Date().getDate()
              const currentMonth = new Date().getMonth()
              const currentYear = new Date().getFullYear()
              
              // Adaugă celule goale pentru zilele înainte de prima zi a lunii
              for (let i = 0; i < startingDayOfWeek; i++) {
                days.push(
                  <div key={`empty-${i}`} className="aspect-square"></div>
                )
              }
              
              // Adaugă zilele lunii
              for (let day = 1; day <= daysInMonth; day++) {
                const isToday = day === today && month === currentMonth && year === currentYear
                const hasEventDay = hasEvent(day)
                const event = getEventForDay(day)
                
                days.push(
                  <div
                    key={day}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold'
                        : hasEventDay
                        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-semibold hover:shadow-md cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    title={event ? `${event.title} - ${event.time}` : ''}
                  >
                    {day}
                  </div>
                )
              }
              
              return days
            })()}
          </div>

          {/* Legendă */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Astăzi</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Ședință ONJN</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ONJNCalendar
