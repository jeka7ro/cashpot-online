import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState('month') // year, quarter, month, day
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const currentYear = start.getFullYear()
  
  // Month range selection (slider with handles)
  const [rangeStart, setRangeStart] = useState(start.getMonth()) // 0-11
  const [rangeEnd, setRangeEnd] = useState(end.getMonth()) // 0-11
  
  const months = [
    { label: 'ian', quarter: 1 },
    { label: 'feb', quarter: 1 },
    { label: 'mar', quarter: 1 },
    { label: 'apr', quarter: 2 },
    { label: 'mai', quarter: 2 },
    { label: 'iun', quarter: 2 },
    { label: 'iul', quarter: 3 },
    { label: 'aug', quarter: 3 },
    { label: 'sep', quarter: 3 },
    { label: 'oct', quarter: 4 },
    { label: 'nov', quarter: 4 },
    { label: 'dec', quarter: 4 }
  ]
  
  const formatRange = () => {
    const monthNames = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
    return `${monthNames[start.getMonth()]}. ${start.getFullYear()} - ${monthNames[end.getMonth()]}. ${end.getFullYear()}`
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
  
  // Apply range selection
  const applyRange = () => {
    const newStart = new Date(currentYear, rangeStart, 1)
    const newEnd = new Date(currentYear, rangeEnd + 1, 0) // Last day of rangeEnd month
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
    })
    setIsOpen(false)
  }
  
  // Quick select actions
  const handleQuickSelect = (type) => {
    const today = new Date()
    let newStart, newEnd
    
    switch (type) {
      case 'year':
        newStart = new Date(currentYear, 0, 1)
        newEnd = new Date(currentYear, 11, 31)
        setRangeStart(0)
        setRangeEnd(11)
        break
      
      case 'q1':
        newStart = new Date(currentYear, 0, 1)
        newEnd = new Date(currentYear, 2, 31)
        setRangeStart(0)
        setRangeEnd(2)
        break
      
      case 'q2':
        newStart = new Date(currentYear, 3, 1)
        newEnd = new Date(currentYear, 5, 30)
        setRangeStart(3)
        setRangeEnd(5)
        break
      
      case 'q3':
        newStart = new Date(currentYear, 6, 1)
        newEnd = new Date(currentYear, 8, 30)
        setRangeStart(6)
        setRangeEnd(8)
        break
      
      case 'q4':
        newStart = new Date(currentYear, 9, 1)
        newEnd = new Date(currentYear, 11, 31)
        setRangeStart(9)
        setRangeEnd(11)
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
  
  // Sync with props
  useEffect(() => {
    setRangeStart(start.getMonth())
    setRangeEnd(end.getMonth())
  }, [startDate, endDate])
  
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
      
      {/* Modal Selector */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal - SLIDER CU HANDLES (ca în screenshot!) */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-5xl bg-gradient-to-br from-slate-800 via-blue-900 to-slate-800 rounded-3xl shadow-2xl border-4 border-cyan-400 p-8 z-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2 flex items-center">
                  <Calendar className="w-8 h-8 mr-3 text-cyan-400" />
                  Selectează Perioada
                </h3>
                <p className="text-cyan-300 text-base">
                  Perioadă curentă: <span className="font-bold text-white">{formatRange()}</span>
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-3 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-8 h-8 text-white hover:text-cyan-400" />
              </button>
            </div>
            
            {/* Granularity Selector */}
            <div className="flex items-center space-x-4 mb-8">
              <div className="text-white text-lg font-semibold">Granularitate:</div>
              {[
                { id: 'year', label: 'An', shortLabel: 'Y' },
                { id: 'quarter', label: 'Trimestru', shortLabel: 'Q' },
                { id: 'month', label: 'Lună', shortLabel: 'M' },
                { id: 'day', label: 'Zi', shortLabel: 'D' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-6 py-3 rounded-xl text-lg font-bold transition-all ${
                    viewMode === mode.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg scale-110 ring-2 ring-cyan-300'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div>{mode.shortLabel}</div>
                  <div className="text-xs">{mode.label}</div>
                </button>
              ))}
            </div>
            
            {/* Month Slider (ca în screenshot!) */}
            {viewMode === 'month' && (
              <div className="bg-slate-900/70 rounded-2xl p-8 border-2 border-cyan-500/50">
                {/* Year + Selected Range */}
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white">
                    <div className="text-4xl font-bold">{currentYear}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      Trage handle-urile pentru a selecta perioada
                    </div>
                  </div>
                  <div className="text-right text-cyan-300 text-lg">
                    <div className="font-semibold">{months[rangeStart].label}. {currentYear} - {months[rangeEnd].label}. {currentYear}</div>
                    <div className="text-slate-400 text-xs mt-1">Interval selectat</div>
                  </div>
                </div>
                
                {/* Quarter Labels */}
                <div className="flex justify-between mb-2 px-4">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                    <div key={q} className="text-slate-400 text-sm font-semibold">
                      {q}
                    </div>
                  ))}
                </div>
                
                {/* Month Timeline (SLIDER!) */}
                <div className="relative h-32 bg-slate-800 rounded-2xl p-4 mb-6">
                  {/* Month Labels */}
                  <div className="flex justify-between mb-2">
                    {months.map((month, idx) => (
                      <div
                        key={idx}
                        className={`text-xs font-semibold transition-all ${
                          idx >= rangeStart && idx <= rangeEnd
                            ? 'text-cyan-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {month.label}
                      </div>
                    ))}
                  </div>
                  
                  {/* Slider Bar */}
                  <div className="relative h-3 bg-slate-700 rounded-full">
                    {/* Selected Range Highlight */}
                    <div
                      className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{
                        left: `${(rangeStart / 11) * 100}%`,
                        width: `${((rangeEnd - rangeStart) / 11) * 100}%`
                      }}
                    />
                    
                    {/* START Handle */}
                    <button
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl hover:scale-125 transition-all cursor-grab active:cursor-grabbing border-4 border-cyan-400 z-10"
                      style={{ left: `${(rangeStart / 11) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (rangeStart > 0) setRangeStart(rangeStart - 1)
                      }}
                      title="Începutul perioadei - Click pentru a muta"
                    >
                      <div className="text-[10px] font-bold text-slate-800">◀</div>
                    </button>
                    
                    {/* END Handle */}
                    <button
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl hover:scale-125 transition-all cursor-grab active:cursor-grabbing border-4 border-blue-400 z-10"
                      style={{ left: `${(rangeEnd / 11) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (rangeEnd < 11) setRangeEnd(rangeEnd + 1)
                      }}
                      title="Sfârșitul perioadei - Click pentru a muta"
                    >
                      <div className="text-[10px] font-bold text-slate-800">▶</div>
                    </button>
                  </div>
                  
                  {/* Month Click Areas (pentru selecție directă) */}
                  <div className="flex justify-between mt-3">
                    {months.map((month, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          // Click pe o lună → setează range la acea lună singură
                          setRangeStart(idx)
                          setRangeEnd(idx)
                        }}
                        className={`flex-1 h-8 rounded-lg transition-all text-xs font-bold ${
                          idx >= rangeStart && idx <= rangeEnd
                            ? 'bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50'
                            : 'bg-slate-700/30 text-slate-400 hover:bg-slate-600'
                        }`}
                        title={`Click pentru a selecta doar ${month.label}`}
                      >
                        {idx >= rangeStart && idx <= rangeEnd && '●'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleQuickSelect('year')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      📅 Tot Anul
                    </button>
                    <button
                      onClick={() => handleQuickSelect('q1')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Q1
                    </button>
                    <button
                      onClick={() => handleQuickSelect('q2')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Q2
                    </button>
                    <button
                      onClick={() => handleQuickSelect('q3')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Q3
                    </button>
                    <button
                      onClick={() => handleQuickSelect('q4')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Q4
                    </button>
                  </div>
                  
                  <button
                    onClick={applyRange}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
                  >
                    ✓ Aplică Selecția
                  </button>
                </div>
              </div>
            )}
            
            {/* Quarter View */}
            {viewMode === 'quarter' && (
              <div className="bg-slate-900/70 rounded-2xl p-8 border-2 border-cyan-500/50">
                <div className="text-white mb-6">
                  <div className="text-3xl font-bold mb-2">Selectează Trimestrul</div>
                  <div className="text-sm text-slate-400">Click pe un trimestru pentru {currentYear}</div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { q: 1, label: 'Q1', months: 'Ian - Mar', start: 0, end: 2, color: 'from-blue-600 to-cyan-600' },
                    { q: 2, label: 'Q2', months: 'Apr - Iun', start: 3, end: 5, color: 'from-green-600 to-emerald-600' },
                    { q: 3, label: 'Q3', months: 'Iul - Sep', start: 6, end: 8, color: 'from-orange-600 to-amber-600' },
                    { q: 4, label: 'Q4', months: 'Oct - Dec', start: 9, end: 11, color: 'from-purple-600 to-pink-600' }
                  ].map((quarter) => (
                    <button
                      key={quarter.q}
                      onClick={() => handleQuickSelect(`q${quarter.q}`)}
                      className={`px-8 py-8 bg-gradient-to-r ${quarter.color} hover:scale-105 text-white rounded-2xl transition-all text-center shadow-xl`}
                    >
                      <div className="text-5xl font-bold mb-2">{quarter.label}</div>
                      <div className="text-base opacity-90">{quarter.months}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Year View */}
            {viewMode === 'year' && (
              <div className="bg-slate-900/70 rounded-2xl p-8 border-2 border-cyan-500/50">
                <div className="text-center">
                  <div className="text-white text-3xl font-bold mb-6">Selectează Anul</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[2023, 2024, 2025, 2026, 2027, 2028].map((year) => (
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
                        className={`px-8 py-6 rounded-2xl text-2xl font-bold transition-all ${
                          year === currentYear
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xl scale-110'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-105'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Day View */}
            {viewMode === 'day' && (
              <div className="bg-slate-900/70 rounded-2xl p-8 border-2 border-cyan-500/50">
                <div className="text-white mb-6">
                  <div className="text-3xl font-bold mb-2">Selectează Zilele</div>
                  <div className="text-sm text-slate-400">Alege perioada exactă</div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">Data Start:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        onChange({ startDate: e.target.value, endDate })
                      }}
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-cyan-500 text-white rounded-xl text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Data End:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        onChange({ startDate, endDate: e.target.value })
                      }}
                      className="w-full px-4 py-3 bg-slate-800 border-2 border-cyan-500 text-white rounded-xl text-lg"
                    />
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      onChange({ startDate: today, endDate: today })
                      setIsOpen(false)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Astăzi
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const last7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                      onChange({
                        startDate: last7.toISOString().split('T')[0],
                        endDate: today.toISOString().split('T')[0]
                      })
                      setIsOpen(false)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Ultimele 7 zile
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                      onChange({
                        startDate: last30.toISOString().split('T')[0],
                        endDate: today.toISOString().split('T')[0]
                      })
                      setIsOpen(false)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Ultimele 30 zile
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector
