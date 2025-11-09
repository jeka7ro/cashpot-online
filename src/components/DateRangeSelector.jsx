import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Local state
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)
  
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
  
  const handleApply = () => {
    onChange({
      startDate: localStartDate,
      endDate: localEndDate
    })
    setIsOpen(false)
  }
  
  const handleCancel = () => {
    setLocalStartDate(startDate)
    setLocalEndDate(endDate)
    setIsOpen(false)
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
      
      {/* Modal - ULTRA SIMPLU! */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
            onClick={handleCancel}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-blue-500 p-8 z-[9999]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-blue-500" />
                Selectează Perioada
              </h3>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            
            {/* Date Inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
                  Data Start:
                </label>
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
                  Data End:
                </label>
                <input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-semibold transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                ✓ Aplică
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector
