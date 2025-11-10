import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [granularity, setGranularity] = useState('M') // Y, Q, M, D
  const [isDragging, setIsDragging] = useState(null) // 'start' or 'end'
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
    return `${months[startMonth]}. ${currentYear} - ${months[endMonth]}. ${currentYear}`
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
  
  const handleSliderClick = (monthIndex) => {
    // Click pe o lună → setează range la acea lună
    const newStart = new Date(currentYear, monthIndex, 1)
    const newEnd = new Date(currentYear, monthIndex + 1, 0)
    onChange({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0]
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
      
      {/* Modal - CA ÎN SCREENSHOT! */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl border-4 border-blue-400 p-8 z-[9999]">
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
                        className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${
                          granularity === g.id
                            ? 'bg-white text-blue-900'
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
            
            {/* Timeline - CA ÎN SCREENSHOT! */}
            <div className="bg-blue-900/50 rounded-2xl p-6 border-2 border-blue-500/50">
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
              
              {/* Month click areas */}
              <div className="flex justify-between">
                {months.map((month, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSliderClick(idx)}
                    className={`flex-1 h-6 text-xs transition-all ${
                      idx >= startMonth && idx <= endMonth
                        ? 'text-cyan-300 font-bold'
                        : 'text-blue-400 hover:text-blue-200'
                    }`}
                    title={`Selectează ${month}`}
                  >
                    {idx >= startMonth && idx <= endMonth && '●'}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 text-right">
                <div className="text-white text-sm font-semibold">{formatShortRange()}</div>
                <div className="text-blue-300 text-xs">Interval selectat</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector
