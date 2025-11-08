import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [granularity, setGranularity] = useState('month') // year, quarter, month, day
  const [isOpen, setIsOpen] = useState(false)
  const sliderRef = useRef(null)
  const [isDragging, setIsDragging] = useState(null) // 'start' | 'end' | null
  
  // Parse dates
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Generate months for current year
  const currentYear = new Date().getFullYear()
  const months = [
    { label: 'ian.', value: 0, quarter: 1 },
    { label: 'feb.', value: 1, quarter: 1 },
    { label: 'mar.', value: 2, quarter: 1 },
    { label: 'apr.', value: 3, quarter: 2 },
    { label: 'mai', value: 4, quarter: 2 },
    { label: 'iun.', value: 5, quarter: 2 },
    { label: 'iul.', value: 6, quarter: 3 },
    { label: 'aug.', value: 7, quarter: 3 },
    { label: 'sep.', value: 8, quarter: 3 },
    { label: 'oct.', value: 9, quarter: 4 },
    { label: 'nov.', value: 10, quarter: 4 },
    { label: 'dec.', value: 11, quarter: 4 }
  ]
  
  const formatRange = () => {
    const monthNames = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
    return `${monthNames[start.getMonth()]}. ${start.getFullYear()} - ${monthNames[end.getMonth()]}. ${end.getFullYear()}`
  }
  
  const handleQuickSelect = (type) => {
    const today = new Date()
    let newStart, newEnd
    
    switch (type) {
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
    setIsOpen(false)
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
      
      {/* Expanded Selector (Dropdown) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[600px] bg-slate-800 dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 p-6 z-50">
          {/* Granularity Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              {[
                { id: 'year', label: 'An', key: 'Y' },
                { id: 'quarter', label: 'Trim', key: 'Q' },
                { id: 'month', label: 'Lună', key: 'M' },
                { id: 'day', label: 'Zi', key: 'D' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickSelect(option.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    granularity === option.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-sm font-semibold"
            >
              Închide
            </button>
          </div>
          
          {/* Month Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>Selectează perioada</span>
              <span className="font-semibold text-blue-400">{formatRange()}</span>
            </div>
            
            <div className="relative h-12 bg-slate-700 dark:bg-slate-800 rounded-full overflow-hidden">
              {/* Month Labels */}
              <div className="absolute inset-0 flex items-center justify-around px-4">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className={`text-xs text-center ${
                      idx >= start.getMonth() && idx <= end.getMonth()
                        ? 'text-white font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    <div>{month.label}</div>
                    {idx % 3 === 0 && (
                      <div className="text-[10px] text-slate-400">Q{month.quarter}</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Selected Range Overlay */}
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-30"
                style={{
                  left: `${(start.getMonth() / 12) * 100}%`,
                  right: `${((11 - end.getMonth()) / 12) * 100}%`
                }}
              />
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => handleQuickSelect('month')}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Luna curentă
              </button>
              <button
                onClick={() => handleQuickSelect('year')}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Anul curent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangeSelector

