import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
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
      
      {/* Modal - SIMPLU cu DATE INPUTS */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-blue-500 p-8 z-[9999]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-blue-500" />
                Selectează Perioada
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
                  Data Start:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value
                    console.log('📅 Date Selector - START changed to:', newStartDate)
                    onChange({ startDate: newStartDate, endDate })
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
                  Data End:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value
                    console.log('📅 Date Selector - END changed to:', newEndDate)
                    console.log('📅 Full range will be:', startDate, '-', newEndDate)
                    onChange({ startDate, endDate: newEndDate })
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                ✓ Închide
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector
