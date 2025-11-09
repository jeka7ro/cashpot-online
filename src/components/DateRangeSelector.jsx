import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Local state (NU se aplică până la click "Aplică"!)
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)
  
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
  
  // Apply selection
  const handleApply = () => {
    onChange({
      startDate: localStartDate,
      endDate: localEndDate
    })
    setIsOpen(false)
  }
  
  // Quick select
  const handleQuickSelect = (type) => {
    const today = new Date()
    const year = today.getFullYear()
    let newStart, newEnd
    
    switch (type) {
      case 'current-month':
        newStart = new Date(year, today.getMonth(), 1)
        newEnd = new Date(year, today.getMonth() + 1, 0)
        break
      
      case 'previous-month':
        newStart = new Date(year, today.getMonth() - 1, 1)
        newEnd = new Date(year, today.getMonth(), 0)
        break
      
      case 'q1':
        newStart = new Date(year, 0, 1)
        newEnd = new Date(year, 2, 31)
        break
      
      case 'q2':
        newStart = new Date(year, 3, 1)
        newEnd = new Date(year, 5, 30)
        break
      
      case 'q3':
        newStart = new Date(year, 6, 1)
        newEnd = new Date(year, 8, 30)
        break
      
      case 'q4':
        newStart = new Date(year, 9, 1)
        newEnd = new Date(year, 11, 31)
        break
      
      case 'year':
        newStart = new Date(year, 0, 1)
        newEnd = new Date(year, 11, 31)
        break
      
      default:
        return
    }
    
    const startStr = newStart.toISOString().split('T')[0]
    const endStr = newEnd.toISOString().split('T')[0]
    
    setLocalStartDate(startStr)
    setLocalEndDate(endStr)
    
    // Apply instant for quick actions
    onChange({ startDate: startStr, endDate: endStr })
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
      
      {/* Modal Selector - SIMPLU ȘI FUNCȚIONAL! */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
            onClick={() => {
              setIsOpen(false)
              // Reset local state on cancel
              setLocalStartDate(startDate)
              setLocalEndDate(endDate)
            }}
          />
          
          {/* Modal - DESIGN SIMPLU! */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 rounded-3xl shadow-2xl border-4 border-cyan-400 p-8 z-[9999]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2 flex items-center">
                  <Calendar className="w-8 h-8 mr-3 text-cyan-400" />
                  Selectează Perioada
                </h3>
                <p className="text-cyan-300 text-base">
                  Alege perioada pentru raport
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setLocalStartDate(startDate)
                  setLocalEndDate(endDate)
                }}
                className="p-3 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-8 h-8 text-white hover:text-cyan-400" />
              </button>
            </div>
            
            {/* Quick Actions (PRINCIPAL!) */}
            <div className="mb-8">
              <h4 className="text-white text-lg font-semibold mb-4">🚀 Selecție Rapidă:</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickSelect('current-month')}
                  className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
                >
                  📅 Luna Curentă
                </button>
                <button
                  onClick={() => handleQuickSelect('previous-month')}
                  className="px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
                >
                  📅 Luna Anterioară
                </button>
                <button
                  onClick={() => handleQuickSelect('q1')}
                  className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  Q1 (Ian-Mar)
                </button>
                <button
                  onClick={() => handleQuickSelect('q2')}
                  className="px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  Q2 (Apr-Iun)
                </button>
                <button
                  onClick={() => handleQuickSelect('q3')}
                  className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  Q3 (Iul-Sep)
                </button>
                <button
                  onClick={() => handleQuickSelect('q4')}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  Q4 (Oct-Dec)
                </button>
                <button
                  onClick={() => handleQuickSelect('year')}
                  className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg col-span-2"
                >
                  📅 Tot Anul {new Date().getFullYear()}
                </button>
              </div>
            </div>
            
            {/* Manual Selection (OPȚIONAL) */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border-2 border-cyan-500/50">
              <h4 className="text-white text-lg font-semibold mb-4">🎯 Selecție Manuală:</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-semibold mb-2 text-base">Data Start:</label>
                  <input
                    type="date"
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border-2 border-cyan-500 text-white rounded-xl text-lg font-semibold focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-white font-semibold mb-2 text-base">Data End:</label>
                  <input
                    type="date"
                    value={localEndDate}
                    onChange={(e) => setLocalEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border-2 border-cyan-500 text-white rounded-xl text-lg font-semibold focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  />
                </div>
              </div>
              
              {/* Apply Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleApply}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
                >
                  ✓ Aplică Selecția
                </button>
              </div>
            </div>
            
            {/* Info */}
            <div className="mt-6 text-center text-cyan-300 text-sm">
              💡 Folosește butoanele rapide pentru selecție instant, sau alege manual și apasă "Aplică"
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeSelector
