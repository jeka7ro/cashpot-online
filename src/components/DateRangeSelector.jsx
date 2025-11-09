import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState('month') // year, quarter, month, day
  
  // Parse dates
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Current year
  const currentYear = new Date().getFullYear()
  
  const months = [
    { label: 'ian', value: 0, quarter: 1 },
    { label: 'feb', value: 1, quarter: 1 },
    { label: 'mar', value: 2, quarter: 1 },
    { label: 'apr', value: 3, quarter: 2 },
    { label: 'mai', value: 4, quarter: 2 },
    { label: 'iun', value: 5, quarter: 2 },
    { label: 'iul', value: 6, quarter: 3 },
    { label: 'aug', value: 7, quarter: 3 },
    { label: 'sep', value: 8, quarter: 3 },
    { label: 'oct', value: 9, quarter: 4 },
    { label: 'nov', value: 10, quarter: 4 },
    { label: 'dec', value: 11, quarter: 4 }
  ]
  
  const formatRange = () => {
    const monthNames = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
    return `${monthNames[start.getMonth()]}. ${start.getFullYear()} - ${monthNames[end.getMonth()]}. ${end.getFullYear()}`
  }
  
  // Local selection state (NU se sincronizează cu props până la Apply)
  const [tempSelectedMonths, setTempSelectedMonths] = useState(() => {
    const months = new Set()
    for (let i = start.getMonth(); i <= end.getMonth(); i++) {
      months.add(i)
    }
    return months
  })
  
  const handleMonthClick = (monthIndex) => {
    setTempSelectedMonths(prev => {
      const newSelected = new Set(prev)
      
      if (newSelected.has(monthIndex)) {
        // Toggle OFF
        newSelected.delete(monthIndex)
      } else {
        // Toggle ON
        newSelected.add(monthIndex)
      }
      
      // Nu permite 0 luni
      if (newSelected.size === 0) {
        return prev
      }
      
      return newSelected
    })
  }
  
  const applyAndClose = () => {
    // Apply selection
    if (tempSelectedMonths.size > 0) {
      const monthsArray = Array.from(tempSelectedMonths).sort((a, b) => a - b)
      const minMonth = monthsArray[0]
      const maxMonth = monthsArray[monthsArray.length - 1]
      
      const newStart = new Date(currentYear, minMonth, 1)
      const newEnd = new Date(currentYear, maxMonth + 1, 0)
      
      onChange({
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0]
      })
    }
    
    setIsOpen(false)
  }
  
  const handleReset = () => {
    // Reset to current selection from props
    const months = new Set()
    for (let i = start.getMonth(); i <= end.getMonth(); i++) {
      months.add(i)
    }
    setTempSelectedMonths(months)
  }
  
  // Quick select
  const handleQuickSelect = (type) => {
    const today = new Date()
    let newStart, newEnd
    
    switch (type) {
      case 'day':
        // Ziua curentă
        newStart = today
        newEnd = today
        break
      case 'month':
        newStart = new Date(today.getFullYear(), today.getMonth(), 1)
        newEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3)
        newStart = new Date(today.getFullYear(), quarter * 3, 1)
        newEnd = new Date(today.getFullYear(), (quarter + 1) * 3, 0)
        break
      case 'year':
        newStart = new Date(today.getFullYear(), 0, 1)
        newEnd = new Date(today.getFullYear(), 11, 31)
        break
      default:
        return
    }
    
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
    
    setViewMode(type)
  }
  
  const handlePrevPeriod = () => {
    const newStart = new Date(start)
    const newEnd = new Date(end)
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    
    newStart.setMonth(newStart.getMonth() - diffMonths - 1)
    newEnd.setMonth(newEnd.getMonth() - diffMonths - 1)
    
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  const handleNextPeriod = () => {
    const newStart = new Date(start)
    const newEnd = new Date(end)
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    
    newStart.setMonth(newStart.getMonth() + diffMonths + 1)
    newEnd.setMonth(newEnd.getMonth() + diffMonths + 1)
    
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
  }
  
  return (
    <div className="relative">
      {/* Compact Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center space-x-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all"
      >
        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevPeriod()
            }}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {formatRange()}
          </span>
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
      
      {/* Modal Selector */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal - MARE + SCROLLABLE */}
          <div className="fixed inset-4 md:inset-8 lg:inset-12 overflow-y-auto bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-3xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 p-8 z-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">📅 Selectează Perioada</h3>
                <p className="text-blue-300 text-sm">
                  Perioadă curentă: <span className="font-bold">{formatRange()}</span>
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-3 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400 hover:text-white" />
              </button>
            </div>
            
            {/* View Mode Selector */}
            <div className="flex items-center justify-center space-x-3 mb-8">
              {[
                { id: 'year', label: 'An' },
                { id: 'quarter', label: 'Trimestru' },
                { id: 'month', label: 'Lună' },
                { id: 'day', label: 'Zi' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-6 py-3 rounded-xl text-base font-bold transition-all ${
                    viewMode === mode.id
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-110'
                      : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            
            {/* Content based on view mode */}
            {viewMode === 'month' && (
              <div className="space-y-6 bg-slate-900/50 rounded-2xl p-6 border border-blue-500/30">
                {/* Year Info */}
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <div className="text-3xl font-bold">{currentYear}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      Click pe o lună pentru a o selecta
                    </div>
                  </div>
                  <div className="text-right text-blue-300 text-sm">
                    <div className="font-semibold">{formatRange()}</div>
                    <div className="text-slate-400 text-xs mt-1">Interval selectat</div>
                  </div>
                </div>
                
                {/* Month Grid (MULTI-SELECT cu TOGGLE) */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {months.map((month, idx) => {
                    const isSelected = tempSelectedMonths.has(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => handleMonthClick(idx)}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-105'
                        }`}
                      >
                        <div>{month.label}</div>
                        <div className="text-xs opacity-70">Q{month.quarter}</div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                {/* Info + Apply Button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400">
                    💡 Click pe luni pentru a le selecta/deselecta • {tempSelectedMonths.size} {tempSelectedMonths.size === 1 ? 'lună' : 'luni'} selectat{tempSelectedMonths.size === 1 ? 'ă' : 'e'}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors text-sm"
                    >
                      ↺ Reset
                    </button>
                    <button
                      onClick={applyAndClose}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      ✓ Aplică
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {viewMode === 'quarter' && (
              <div className="space-y-6 bg-slate-900/50 rounded-2xl p-6 border border-blue-500/30">
                <div className="text-white mb-4">
                  <div className="text-2xl font-bold mb-2">Selectează Trimestrul</div>
                  <div className="text-sm text-slate-400">Click pe un trimestru</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { q: 1, label: 'Q1', months: 'Ian - Mar', start: 0, end: 2 },
                    { q: 2, label: 'Q2', months: 'Apr - Iun', start: 3, end: 5 },
                    { q: 3, label: 'Q3', months: 'Iul - Sep', start: 6, end: 8 },
                    { q: 4, label: 'Q4', months: 'Oct - Dec', start: 9, end: 11 }
                  ].map((quarter) => (
                    <button
                      key={quarter.q}
                      onClick={() => {
                        const newStart = new Date(currentYear, quarter.start, 1)
                        const newEnd = new Date(currentYear, quarter.end + 1, 0)
                        onChange({
                          startDate: newStart.toISOString().split('T')[0],
                          endDate: newEnd.toISOString().split('T')[0]
                        })
                        setIsOpen(false)
                      }}
                      className="px-8 py-6 bg-slate-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl transition-all text-center hover:scale-105"
                    >
                      <div className="text-3xl font-bold mb-2">{quarter.label}</div>
                      <div className="text-sm text-slate-300">{quarter.months}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {viewMode === 'year' && (
              <div className="space-y-6 bg-slate-900/50 rounded-2xl p-6 border border-blue-500/30">
                <div className="text-white mb-4">
                  <div className="text-2xl font-bold mb-2">Selectează Anul</div>
                  <div className="text-sm text-slate-400">Click pe un an</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        const newStart = new Date(year, 0, 1)
                        const newEnd = new Date(year, 11, 31)
                        onChange({
                          startDate: newStart.toISOString().split('T')[0],
                          endDate: newEnd.toISOString().split('T')[0]
                        })
                        setIsOpen(false)
                      }}
                      className={`px-8 py-6 rounded-2xl transition-all text-center ${
                        year === currentYear
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-105'
                      }`}
                    >
                      <div className="text-3xl font-bold">{year}</div>
                      {year === currentYear && (
                        <div className="text-xs text-blue-100 mt-1">Anul curent</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {viewMode === 'day' && (
              <div className="space-y-6 bg-slate-900/50 rounded-2xl p-6 border border-blue-500/30">
                <div className="text-white mb-4">
                  <div className="text-2xl font-bold mb-2">Selectează Ziua Exactă</div>
                  <div className="text-sm text-slate-400">Alege data de început și sfârșit</div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      📅 Data Început
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        onChange({
                          startDate: e.target.value,
                          endDate: endDate
                        })
                      }}
                      className="w-full px-4 py-3 bg-slate-700 border-2 border-blue-500 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      📅 Data Sfârșit
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        onChange({
                          startDate: startDate,
                          endDate: e.target.value
                        })
                      }}
                      className="w-full px-4 py-3 bg-slate-700 border-2 border-cyan-500 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Quick Day Actions */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { label: 'Azi', days: 0 },
                    { label: 'Ultimele 7 zile', days: 7 },
                    { label: 'Ultimele 30 zile', days: 30 },
                    { label: 'Ultimele 90 zile', days: 90 }
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        const today = new Date()
                        const pastDate = new Date()
                        pastDate.setDate(today.getDate() - option.days)
                        
                        onChange({
                          startDate: (option.days === 0 ? today : pastDate).toISOString().split('T')[0],
                          endDate: today.toISOString().split('T')[0]
                        })
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions Footer */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button
                  onClick={() => {
                    handleQuickSelect('month')
                    setIsOpen(false)
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all text-base font-bold shadow-lg hover:shadow-xl"
                >
                  🗓️ Luna curentă
                </button>
                <button
                  onClick={() => {
                    handleQuickSelect('quarter')
                    setIsOpen(false)
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all text-base font-bold shadow-lg hover:shadow-xl"
                >
                  📊 Trimestrul curent
                </button>
                <button
                  onClick={() => {
                    handleQuickSelect('year')
                    setIsOpen(false)
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all text-base font-bold shadow-lg hover:shadow-xl"
                >
                  📅 Anul curent
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={applyAndClose}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl transition-all text-base font-bold shadow-lg hover:shadow-xl"
                >
                  ✓ Închide și Aplică
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector
