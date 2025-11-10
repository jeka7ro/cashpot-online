import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [granularity, setGranularity] = useState('M') // Y, Q, M, D
  const sliderRef = useRef(null)
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const currentYear = start.getFullYear()
  
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
  
  const startMonth = start.getMonth()
  const endMonth = end.getMonth()
  
  const formatRange = () => {
    return `${start.toLocaleDateString('ro-RO')} - ${end.toLocaleDateString('ro-RO')}`
  }
  
  const formatShortRange = () => {
    if (granularity === 'Y') {
      return `${currentYear}`
    } else if (granularity === 'Q') {
      const startQ = Math.floor(startMonth / 3) + 1
      const endQ = Math.floor(endMonth / 3) + 1
      return `Q${startQ} ${currentYear} - Q${endQ} ${currentYear}`
    } else if (granularity === 'M') {
      return `${months[startMonth]}. ${currentYear} - ${months[endMonth]}. ${currentYear}`
    } else {
      return `${start.toLocaleDateString('ro-RO')} - ${end.toLocaleDateString('ro-RO')}`
    }
  }
  
  const handlePrevPeriod = () => {
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    const newStart = new Date(start.getFullYear(), start.getMonth() - diffMonths - 1, 1)
    const newEnd = new Date(end.getFullYear(), end.getMonth() - diffMonths - 1, 0)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  const handleNextPeriod = () => {
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    const newStart = new Date(start.getFullYear(), start.getMonth() + diffMonths + 1, 1)
    const newEnd = new Date(end.getFullYear(), end.getMonth() + diffMonths + 1, 0)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  // QUICK ACTIONS (Azi, Săptămâna curentă, Luna curentă, Luna trecută, Anul curent)
  const handleQuickAction = (action) => {
    const now = new Date()
    let newStart, newEnd
    
    switch (action) {
      case 'today':
        newStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        newEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'thisWeek':
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Luni
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Duminică
        newStart = startOfWeek
        newEnd = endOfWeek
        break
      case 'thisMonth':
        newStart = new Date(now.getFullYear(), now.getMonth(), 1)
        newEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // PÂNĂ AZI, nu până la 31!
        break
      case 'lastMonth':
        newStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        newEnd = lastDayOfPrevMonth // Ultima zi a lunii precedente
        break
      case 'thisYear':
        newStart = new Date(now.getFullYear(), 0, 1)
        newEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // PÂNĂ AZI, nu până la 31 decembrie!
        break
      default:
        return
    }
    
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
    setIsOpen(false)
  }
  
  // MONTH MODE - Click pe lună
  const handleMonthClick = (monthIndex) => {
    const newStart = new Date(currentYear, monthIndex, 1)
    const newEnd = new Date(currentYear, monthIndex + 1, 0)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  // QUARTER MODE - Click pe trimestru
  const handleQuarterClick = (quarterIndex) => {
    const newStart = new Date(currentYear, quarterIndex * 3, 1)
    const newEnd = new Date(currentYear, quarterIndex * 3 + 3, 0)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  // YEAR MODE - Selectare an
  const handleYearClick = (year) => {
    const newStart = new Date(year, 0, 1)
    const newEnd = new Date(year, 11, 31)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  // DAY MODE - Calendar simplu (30 zile înainte/după)
  const handleDayClick = (dayOffset) => {
    const now = new Date()
    const newDate = new Date(now)
    newDate.setDate(now.getDate() + dayOffset)
    onChange({
      startDate: newDate.toISOString().split('T')[0],
      endDate: newDate.toISOString().split('T')[0]
    })
  }
  
  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all shadow-lg"
      >
        <Calendar className="w-4 h-4" />
        <span>{formatRange()}</span>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevPeriod()
            }}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNextPeriod()
            }}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </button>
      
      {/* Modal - PORTAL (deasupra TUTUROR!) */}
      {isOpen && ReactDOM.createPortal(
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            style={{ zIndex: 999998 }}
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="fixed top-1/2 left-1/2 w-[900px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl border-4 border-blue-400 p-8"
            style={{ 
              transform: 'translate(-50%, -50%)', 
              zIndex: 999999 
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3">
                  {/* Granularity Buttons - CA ÎN SCREENSHOT! */}
                  <div className="flex items-center space-x-2">
                    {[
                      { id: 'Y', label: 'An' },
                      { id: 'Q', label: 'Trimestru' },
                      { id: 'M', label: 'Lună' },
                      { id: 'D', label: 'Zi' }
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGranularity(g.id)}
                        className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                          granularity === g.id
                            ? 'bg-white text-blue-900 shadow-lg'
                            : 'bg-blue-700 text-white hover:bg-blue-600 border border-blue-500'
                        }`}
                      >
                        {g.id}
                      </button>
                    ))}
                  </div>
                  <div className="text-white text-sm font-semibold">
                    {granularity === 'Y' && 'An'}
                    {granularity === 'Q' && 'Trimestru'}
                    {granularity === 'M' && 'Lună'}
                    {granularity === 'D' && 'Zi'}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-white font-bold text-lg">{formatShortRange()}</div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            {/* QUICK ACTIONS - PESTE TOT! */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'today', label: '📅 Azi' },
                { id: 'thisWeek', label: '📆 Săptămâna curentă' },
                { id: 'thisMonth', label: '📊 Luna curentă' },
                { id: 'lastMonth', label: '⏮️ Luna trecută' },
                { id: 'thisYear', label: '🗓️ Anul curent' }
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-sm transition-all shadow-lg"
                >
                  {action.label}
                </button>
              ))}
            </div>
            
            {/* Timeline - CA ÎN SCREENSHOT! */}
            <div className="bg-blue-900/50 rounded-2xl p-6 border-2 border-blue-500/50">
              
              {/* YEAR MODE */}
              {granularity === 'Y' && (
                <div className="space-y-4">
                  <div className="text-white text-2xl font-bold mb-4">Selectează An</div>
                  <div className="grid grid-cols-4 gap-3">
                    {[2023, 2024, 2025, 2026, 2027].map(year => (
                      <button
                        key={year}
                        onClick={() => handleYearClick(year)}
                        className={`p-4 rounded-xl font-bold transition-all ${
                          currentYear === year
                            ? 'bg-white text-blue-900 shadow-lg'
                            : 'bg-blue-700 text-white hover:bg-blue-600'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* QUARTER MODE */}
              {granularity === 'Q' && (
                <div className="space-y-4">
                  <div className="text-white text-2xl font-bold mb-4">{currentYear}</div>
                  <div className="grid grid-cols-4 gap-4">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => {
                      const isSelected = Math.floor(startMonth / 3) === idx || Math.floor(endMonth / 3) === idx
                      return (
                        <button
                          key={q}
                          onClick={() => handleQuarterClick(idx)}
                          className={`p-6 rounded-xl font-bold text-lg transition-all ${
                            isSelected
                              ? 'bg-white text-blue-900 shadow-lg'
                              : 'bg-blue-700 text-white hover:bg-blue-600'
                          }`}
                        >
                          {q}
                          <div className="text-xs mt-2 opacity-70">
                            {months[idx * 3]} - {months[idx * 3 + 2]}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* MONTH MODE */}
              {granularity === 'M' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <div className="text-white text-3xl font-bold">{currentYear}</div>
                    <div className="text-blue-300 text-sm">Q{Math.floor(startMonth / 3) + 1}</div>
                    <div className="text-white text-lg">{months[startMonth]}.</div>
                  </div>
                  
                  {/* Quarter markers */}
                  <div className="flex justify-between mb-2 px-2">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                      <div key={q} className="text-blue-300 text-xs font-bold" style={{ marginLeft: idx === 0 ? 0 : '12%' }}>
                        {q}
                      </div>
                    ))}
                  </div>
                  
                  {/* Month labels */}
                  <div className="flex justify-between mb-2 text-xs text-white font-semibold">
                    {months.map((m, idx) => (
                      <div key={idx} className={idx >= startMonth && idx <= endMonth ? 'text-cyan-300' : 'text-blue-400'}>
                        {m}
                      </div>
                    ))}
                  </div>
                  
                  {/* Slider bar - CA ÎN SCREENSHOT! */}
                  <div ref={sliderRef} className="relative h-4 bg-blue-700 rounded-full mb-4">
                    {/* Selected range (WHITE!) */}
                    <div
                      className="absolute h-full bg-white rounded-full"
                      style={{
                        left: `${(startMonth / 11) * 100}%`,
                        width: `${((endMonth - startMonth) / 11) * 100}%`
                      }}
                    />
                    
                    {/* START Handle (GRI!) */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-400 rounded-full border-2 border-white cursor-pointer shadow-lg z-10"
                      style={{ left: `${(startMonth / 11) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      title="Start"
                    />
                    
                    {/* END Handle (GRI!) */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-400 rounded-full border-2 border-white cursor-pointer shadow-lg z-10"
                      style={{ left: `${(endMonth / 11) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      title="End"
                    />
                  </div>
                  
                  {/* Month click areas - DEASUPRA HANDLES! */}
                  <div className="flex justify-between relative z-20">
                    {months.map((month, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleMonthClick(idx)}
                        className={`flex-1 h-10 text-sm transition-all rounded-lg font-semibold ${
                          idx >= startMonth && idx <= endMonth
                            ? 'text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg'
                            : 'text-blue-300 hover:text-white hover:bg-blue-600 bg-blue-800/50'
                        }`}
                        title={`Selectează ${months[idx]}`}
                      >
                        {months[idx]}
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-4 text-right">
                    <div className="text-white text-sm font-semibold">{formatShortRange()}</div>
                    <div className="text-blue-300 text-xs">Interval selectat</div>
                  </div>
                </div>
              )}
              
              {/* DAY MODE */}
              {granularity === 'D' && (
                <div className="space-y-4">
                  <div className="text-white text-2xl font-bold mb-4">Selectează Zi</div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 30 }, (_, i) => i - 15).map(dayOffset => {
                      const date = new Date()
                      date.setDate(date.getDate() + dayOffset)
                      const isToday = dayOffset === 0
                      return (
                        <button
                          key={dayOffset}
                          onClick={() => handleDayClick(dayOffset)}
                          className={`p-3 rounded-lg text-sm transition-all ${
                            isToday
                              ? 'bg-cyan-500 text-white font-bold shadow-lg'
                              : 'bg-blue-700 text-white hover:bg-blue-600'
                          }`}
                        >
                          <div className="font-bold">{date.getDate()}</div>
                          <div className="text-xs opacity-70">{months[date.getMonth()]}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default DateRangeSelector
