import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Clock, Timer, CalendarCheck, CalendarX } from 'lucide-react'

const DateRangeSelector = ({ startDate, endDate, onChange, availableYears }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [granularity, setGranularity] = useState('M') // Y, Q, M, D
  const [selectedMonths, setSelectedMonths] = useState([]) // Pentru multi-select luni
  const [selectedQuarters, setSelectedQuarters] = useState([]) // Pentru multi-select trimestre
  const [selectedYears, setSelectedYears] = useState([]) // Pentru multi-select ani
  const [selectedDays, setSelectedDays] = useState([]) // Pentru multi-select zile
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  // Generate available years: ultimii 5 ani până la anul curent (NU viitori!)
  const currentYear = new Date().getFullYear()
  const yearsToShow = availableYears || Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)
  
  // FIX TIMEZONE BUG! Format date fără timezone issues
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const formatRange = () => {
    return `${start.toLocaleDateString('ro-RO')} - ${end.toLocaleDateString('ro-RO')}`
  }
  
  const handlePrevPeriod = () => {
    let newStart, newEnd
    
    switch (granularity) {
      case 'Y': // Ani - mergi cu 1 an înapoi
        newStart = new Date(start.getFullYear() - 1, 0, 1)
        newEnd = new Date(end.getFullYear() - 1, 11, 31)
        break
      case 'Q': // Trimestre - mergi cu 1 trimestru înapoi (3 luni)
        newStart = new Date(start.getFullYear(), start.getMonth() - 3, 1)
        newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 3, 0)
        break
      case 'M': // Luni - mergi cu 1 lună înapoi
        newStart = new Date(start.getFullYear(), start.getMonth() - 1, 1)
        newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0)
        break
      case 'D': // Zile - mergi cu diferența de zile înapoi
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
        newStart = new Date(start)
        newStart.setDate(start.getDate() - diffDays)
        newEnd = new Date(end)
        newEnd.setDate(end.getDate() - diffDays)
        break
      default:
        return
    }
    
    onChange({
      startDate: formatDateLocal(newStart),
      endDate: formatDateLocal(newEnd)
    })
  }
  
  const handleNextPeriod = () => {
    let newStart, newEnd
    
    switch (granularity) {
      case 'Y': // Ani - mergi cu 1 an înainte
        newStart = new Date(start.getFullYear() + 1, 0, 1)
        newEnd = new Date(end.getFullYear() + 1, 11, 31)
        break
      case 'Q': // Trimestre - mergi cu 1 trimestru înainte (3 luni)
        newStart = new Date(start.getFullYear(), start.getMonth() + 3, 1)
        newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 3, 0)
        break
      case 'M': // Luni - mergi cu 1 lună înainte
        newStart = new Date(start.getFullYear(), start.getMonth() + 1, 1)
        newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0)
        break
      case 'D': // Zile - mergi cu diferența de zile înainte
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
        newStart = new Date(start)
        newStart.setDate(start.getDate() + diffDays)
        newEnd = new Date(end)
        newEnd.setDate(end.getDate() + diffDays)
        break
      default:
        return
    }
    
    onChange({
      startDate: formatDateLocal(newStart),
      endDate: formatDateLocal(newEnd)
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
        // TOATĂ luna curentă (1 nov - 30 nov), NU doar până azi!
        const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        newEnd = lastDayThisMonth
        break
      case 'lastMonth':
        newStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        // TOATĂ luna precedentă (1 oct - 31 oct)
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        newEnd = lastDayOfPrevMonth
        break
      case 'thisYear':
        newStart = new Date(now.getFullYear(), 0, 1)
        // TOT anul curent (1 ian - 31 dec), NU doar până azi!
        newEnd = new Date(now.getFullYear(), 11, 31)
        break
      default:
        return
    }
    
    onChange({
      startDate: formatDateLocal(newStart),
      endDate: formatDateLocal(newEnd)
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
      
      // PRIMA ZI a primei luni selectate
      const newStart = new Date(selectedYear, firstMonth, 1)
      
      // ULTIMA ZI a ultimei luni selectate (nu ziua 0 a lunii următoare!)
      // Pentru iulie (month=6): new Date(2025, 6+1, 0) = 31 iulie
      const tempDate = new Date(selectedYear, lastMonth + 1, 1) // Prima zi a lunii următoare
      tempDate.setDate(tempDate.getDate() - 1) // Minus 1 zi = ultima zi a lunii curente
      const newEnd = tempDate
      
      console.log(`📅 SELECTARE LUNĂ: ${firstMonth} (${months[firstMonth]}) → ${lastMonth} (${months[lastMonth]})`)
      console.log(`   Start: ${formatDateLocal(newStart)}`)
      console.log(`   End: ${formatDateLocal(newEnd)}`)
      
      onChange({
        startDate: formatDateLocal(newStart),
        endDate: formatDateLocal(newEnd)
      })
    }
  }
  
  // QUARTER MULTI-SELECT
  const toggleQuarter = (quarterIndex) => {
    const newSelected = [...selectedQuarters]
    const idx = newSelected.indexOf(quarterIndex)
    
    if (idx > -1) {
      newSelected.splice(idx, 1) // Remove
    } else {
      newSelected.push(quarterIndex) // Add
    }
    
    setSelectedQuarters(newSelected.sort((a, b) => a - b))
    
    // Update date range
    if (newSelected.length > 0) {
      const firstQuarter = Math.min(...newSelected)
      const lastQuarter = Math.max(...newSelected)
      
      const newStart = new Date(selectedYear, firstQuarter * 3, 1)
      const newEnd = new Date(selectedYear, lastQuarter * 3 + 3, 0)
    
      console.log(`📅 MULTI-SELECT TRIMESTRE: Q${firstQuarter + 1} - Q${lastQuarter + 1}`)
    console.log(`   Start: ${formatDateLocal(newStart)}`)
    console.log(`   End: ${formatDateLocal(newEnd)}`)
    
    onChange({
      startDate: formatDateLocal(newStart),
      endDate: formatDateLocal(newEnd)
    })
    }
  }
  
  // YEAR MULTI-SELECT
  const toggleYear = (year) => {
    const newSelected = [...selectedYears]
    const idx = newSelected.indexOf(year)
    
    if (idx > -1) {
      newSelected.splice(idx, 1) // Remove
    } else {
      newSelected.push(year) // Add
    }
    
    setSelectedYears(newSelected.sort((a, b) => a - b))
    
    // Update date range
    if (newSelected.length > 0) {
      const firstYear = Math.min(...newSelected)
      const lastYear = Math.max(...newSelected)
      
      const newStart = new Date(firstYear, 0, 1)
      const newEnd = new Date(lastYear, 11, 31)
      
      console.log(`📅 MULTI-SELECT ANI: ${firstYear} - ${lastYear}`)
      console.log(`   Start: ${formatDateLocal(newStart)}`)
      console.log(`   End: ${formatDateLocal(newEnd)}`)
      
    onChange({
      startDate: formatDateLocal(newStart),
      endDate: formatDateLocal(newEnd)
    })
    }
  }
  
  return (
    <div className="relative">
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
      
      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[999]" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* DROPDOWN (ABSOLUTE) - Cade peste conținut */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 z-[1000] w-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
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
          
          
          {/* Content */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            
            {/* YEAR MODE - MULTI-SELECT */}
            {granularity === 'Y' && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Selectează Ani (Multi-select)</h3>
                <div className="grid grid-cols-5 gap-3">
                  {yearsToShow.map(year => {
                    const isSelected = selectedYears.includes(year)
                    return (
                    <button
                      key={year}
                        onClick={() => toggleYear(year)}
                        className={`p-4 rounded-xl font-bold transition-all border-2 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
                      }`}
                    >
                        <div className="flex items-center justify-between">
                          <span>{year}</span>
                          {isSelected && <span className="text-xl">✓</span>}
                        </div>
                    </button>
                    )
                  })}
                </div>
                
                {selectedYears.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                      ✓ Selectați: {selectedYears.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* QUARTER MODE - MULTI-SELECT */}
            {granularity === 'Q' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedYear}</h3>
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
                
                <div className="grid grid-cols-4 gap-2">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => {
                    const isSelected = selectedQuarters.includes(idx)
                    return (
                    <button
                      key={q}
                        onClick={() => toggleQuarter(idx)}
                        className={`p-3 rounded-lg font-bold text-sm transition-all border-2 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                          <span>{q}</span>
                          {isSelected && <span className="text-lg">✓</span>}
                        </div>
                      <div className="text-xs mt-1 opacity-70">
                        {months[idx * 3]} - {months[idx * 3 + 2]}
                      </div>
                    </button>
                    )
                  })}
                </div>
                
                {selectedQuarters.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                      ✓ Selectate: {selectedQuarters.map(i => `Q${i + 1}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* MONTH MODE - MULTI-SELECT CHECKBOXES! */}
            {granularity === 'M' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedYear}</h3>
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
                
                <div className="grid grid-cols-4 gap-2">
                  {months.map((month, idx) => {
                    const isSelected = selectedMonths.includes(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleMonth(idx)}
                        className={`p-2 rounded-lg font-semibold text-sm transition-all border-2 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{month}</span>
                          {isSelected && <span className="text-lg">✓</span>}
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
            
            {/* DAY MODE - RANGE PICKER */}
            {granularity === 'D' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Selectează Interval Zile</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold">{selectedYear}</span>
                    <button
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Data început:
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => onChange({ startDate: e.target.value, endDate })}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Data sfârșit:
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => onChange({ startDate, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                    💡 Selectează data început și data sfârșit pentru interval custom
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  )
}

// Export component pentru butoane rapide (folosit în header)
export const QuickDateButtons = ({ onChange }) => {
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const quickActions = [
    { id: 'today', label: 'Azi', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'thisWeek', label: 'Săpt', icon: <Clock className="w-4 h-4" /> },
    { id: 'thisMonth', label: 'Luna curentă', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'lastMonth', label: 'Luna trecută', icon: <CalendarX className="w-4 h-4" /> },
    { id: 'thisYear', label: 'Anul curent', icon: <CalendarCheck className="w-4 h-4" /> }
  ]
  
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
        const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        newEnd = lastDayThisMonth
        break
      case 'lastMonth':
        newStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        newEnd = lastDayOfPrevMonth
        break
      case 'thisYear':
        newStart = new Date(now.getFullYear(), 0, 1)
        newEnd = new Date(now.getFullYear(), 11, 31)
        break
      default:
        return
    }
    
    onChange({
      startDate: formatDateLocal(newStart),
      endDate: formatDateLocal(newEnd)
    })
  }
  
  return (
    <div className="flex items-center space-x-2">
      {quickActions.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => handleQuickAction(id)}
          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg font-medium text-xs transition-all flex items-center space-x-2"
          title={label}
        >
          <span className="text-blue-500">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

export default DateRangeSelector
