import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

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
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-3xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 p-8 z-50">
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
          
          {/* Granularity Selector */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            {[
              { id: 'year', label: 'An', key: 'Y' },
              { id: 'quarter', label: 'Trim', key: 'Q' },
              { id: 'month', label: 'Lună', key: 'M' },
              { id: 'day', label: 'Zi', key: 'D' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleQuickSelect(option.id)}
                className={`px-6 py-3 rounded-xl text-base font-bold transition-all ${
                  granularity === option.id
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-110'
                    : 'bg-slate-700 dark:bg-slate-800 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Month Slider - Elegant Design */}
          <div className="space-y-6 bg-slate-900/50 rounded-2xl p-6 border border-blue-500/30">
            {/* Year & Quarter Info */}
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="text-3xl font-bold">{currentYear}</div>
                <div className="text-sm text-slate-400 mt-1">
                  Q{Math.floor(start.getMonth() / 3) + 1} • {months[start.getMonth()].label}
                </div>
              </div>
              <div className="text-right text-blue-300 text-sm">
                <div className="font-semibold">{formatRange()}</div>
                <div className="text-slate-400 text-xs mt-1">Interval selectat</div>
              </div>
            </div>
            
            {/* Visual Slider */}
            <div className="relative">
              {/* Quarter Labels */}
              <div className="flex justify-between mb-2 px-2">
                {[1, 2, 3, 4].map(q => (
                  <div key={q} className="text-xs text-slate-400 font-semibold">
                    Q{q}
                  </div>
                ))}
              </div>
              
              {/* Month Labels */}
              <div className="flex justify-around mb-3">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className={`text-xs text-center transition-all ${
                      idx >= start.getMonth() && idx <= end.getMonth()
                        ? 'text-white font-bold scale-110'
                        : 'text-slate-500'
                    }`}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              
              {/* Slider Track */}
              <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                {/* Selected Range */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 shadow-lg"
                  style={{
                    left: `${(start.getMonth() / 12) * 100}%`,
                    right: `${((11 - end.getMonth()) / 12) * 100}%`
                  }}
                >
                  {/* Left Handle */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-xl border-2 border-blue-500 cursor-grab hover:scale-110 transition-transform" />
                  
                  {/* Right Handle */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-xl border-2 border-cyan-500 cursor-grab hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-slate-700 flex items-center justify-center space-x-4">
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
        </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector

