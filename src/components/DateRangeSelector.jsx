import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [granularity, setGranularity] = useState('M') // Y, Q, M, D
  const [selectedMonths, setSelectedMonths] = useState([]) // Pentru multi-select
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const formatRange = () => {
    return `${start.toLocaleDateString('ro-RO')} - ${end.toLocaleDateString('ro-RO')}`
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
  
  // QUICK ACTIONS
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
        startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        newStart = startOfWeek
        newEnd = endOfWeek
        break
      case 'thisMonth':
        newStart = new Date(now.getFullYear(), now.getMonth(), 1)
        newEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'lastMonth':
        newStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        newEnd = lastDayOfPrevMonth
        break
      case 'thisYear':
        newStart = new Date(now.getFullYear(), 0, 1)
        newEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
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
  
  // MONTH MULTI-SELECT (CHECKBOX MODE!)
  const toggleMonth = (monthIndex) => {
    const newSelected = [...selectedMonths]
    const idx = newSelected.indexOf(monthIndex)
    
    if (idx > -1) {
      newSelected.splice(idx, 1) // Remove
    } else {
      newSelected.push(monthIndex) // Add
    }
    
    setSelectedMonths(newSelected.sort((a, b) => a - b))
    
    // Update date range
    if (newSelected.length > 0) {
      const firstMonth = Math.min(...newSelected)
      const lastMonth = Math.max(...newSelected)
      const newStart = new Date(selectedYear, firstMonth, 1)
      const newEnd = new Date(selectedYear, lastMonth + 1, 0)
      onChange({
        startDate: newStart.toISOString().split('T')[0],
        endDate: newEnd.toISOString().split('T')[0]
      })
    }
  }
  
  // QUARTER SELECT
  const handleQuarterClick = (quarterIndex) => {
    const newStart = new Date(selectedYear, quarterIndex * 3, 1)
    const newEnd = new Date(selectedYear, quarterIndex * 3 + 3, 0)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
    setIsOpen(false)
  }
  
  // YEAR SELECT
  const handleYearClick = (year) => {
    const newStart = new Date(year, 0, 1)
    const newEnd = new Date(year, 11, 31)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
    setIsOpen(false)
  }
  
  return (
    <div className="space-y-4">
      {/* Trigger Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all shadow-lg"
        >
          <Calendar className="w-4 h-4" />
          <span>{formatRange()}</span>
        </button>
        
        <button
          onClick={handlePrevPeriod}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNextPeriod}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* CARD MODE (NU MODAL!) - Integrat în pagină */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              {/* Granularity Buttons */}
              <div className="flex items-center space-x-2">
                {[
                  { id: 'Y', label: 'An' },
                  { id: 'Q', label: 'Trimestru' },
                  { id: 'M', label: 'Luni' },
                  { id: 'D', label: 'Zile' }
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGranularity(g.id)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      granularity === g.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
            >
              Închide
            </button>
          </div>
          
          {/* QUICK ACTIONS */}
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
                className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-sm transition-all"
              >
                {action.label}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            
            {/* YEAR MODE */}
            {granularity === 'Y' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Selectează An</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[2023, 2024, 2025, 2026, 2027].map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearClick(year)}
                      className={`p-4 rounded-xl font-bold transition-all ${
                        selectedYear === year
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{selectedYear}</h3>
                <div className="grid grid-cols-4 gap-4">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                    <button
                      key={q}
                      onClick={() => handleQuarterClick(idx)}
                      className="p-6 rounded-xl font-bold text-lg transition-all bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-300"
                    >
                      {q}
                      <div className="text-xs mt-2 opacity-70">
                        {months[idx * 3]} - {months[idx * 3 + 2]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* MONTH MODE - MULTI-SELECT CHECKBOXES! */}
            {granularity === 'M' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedYear}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  {months.map((month, idx) => {
                    const isSelected = selectedMonths.includes(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleMonth(idx)}
                        className={`p-4 rounded-xl font-semibold transition-all border-2 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{month}</span>
                          {isSelected && <span className="text-xl">✓</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
                
                {selectedMonths.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                      ✓ Selectate: {selectedMonths.map(i => months[i]).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* DAY MODE - CALENDAR SIMPLU */}
            {granularity === 'D' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Calendar Simplu</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Folosește Quick Actions de sus pentru selectare rapidă, sau filtrele clasice (săptămână, lună, an)
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
                    <div key={idx} className="text-center font-bold text-slate-500 text-sm">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      className="p-3 rounded-lg text-center font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all"
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangeSelector
