import React, { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X, CalendarDays, Clock, CalendarRange } from 'lucide-react'

const SmartDatePicker = ({ dateRange, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('months') // 'years', 'quarters', 'months', 'days'
    const [viewDate, setViewDate] = useState(new Date()) // Used for navigation
    const containerRef = useRef(null)

    // Initialize viewDate from current selection
    useEffect(() => {
        if (dateRange?.startDate) {
            setViewDate(new Date(dateRange.startDate))
        }
    }, [])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // --- HELPERS ---
    const formatDate = (d) => {
        if (!d) return ''
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}.${month}.${year}`
    }

    const getRangeText = () => {
        const start = new Date(dateRange.startDate)
        const end = new Date(dateRange.endDate)
        return `${formatDate(start)} - ${formatDate(end)}`
    }

    const navigateView = (direction) => {
        const newDate = new Date(viewDate)
        if (activeTab === 'years') {
            newDate.setFullYear(newDate.getFullYear() + (direction * 10))
        } else {
            newDate.setFullYear(newDate.getFullYear() + direction)
        }
        setViewDate(newDate)
    }

    const formatToIso = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- RANGE SELECTION LOGIC ---
    const handleSelection = (targetStart, targetEnd) => {
        const currentStart = new Date(dateRange.startDate)
        const currentEnd = new Date(dateRange.endDate)

        // If it's already a range, clicking a new one resets to a single selection
        // This prevents accidental massive ranges if the user just wants to "Jump"
        if (currentStart.getTime() !== currentEnd.getTime()) {
            onChange({
                startDate: formatToIso(targetStart),
                endDate: formatToIso(targetEnd)
            })
            return
        }

        const targetStartTime = targetStart.getTime()
        const currentStartTime = currentStart.getTime()

        let newStart = targetStart
        let newEnd = targetEnd

        if (targetStartTime < currentStartTime) {
            newStart = targetStart
            newEnd = currentEnd
        } else if (targetStartTime > currentStartTime) {
            newStart = currentStart
            newEnd = targetEnd
        } else {
            newStart = targetStart
            newEnd = targetEnd
        }

        onChange({
            startDate: formatToIso(newStart),
            endDate: formatToIso(newEnd)
        })
    }

    const isSelected = (unitStart, unitEnd) => {
        const currentStart = new Date(dateRange.startDate)
        const currentEnd = new Date(dateRange.endDate)

        // normalize times for comparison to avoid hour issues
        const uStart = unitStart.getTime()
        const uEnd = unitEnd.getTime()
        const cStart = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate()).getTime()
        const cEnd = new Date(currentEnd.getFullYear(), currentEnd.getMonth(), currentEnd.getDate(), 23, 59, 59).getTime()

        // Should return true if this unit is Fully Contained in the range OR Overlaps significantly?
        // Standard Grid Logic: Highlight if it is part of the range.
        return (uStart >= cStart && uEnd <= cEnd) || (uStart <= cEnd && uEnd >= cStart)
    }

    // --- TAB HANDLERS ---
    const selectYear = (year) => {
        const start = new Date(year, 0, 1)
        const end = new Date(year, 11, 31)
        handleSelection(start, end)
    }

    const selectQuarter = (qIndex) => { // 0 to 3
        const year = viewDate.getFullYear()
        const startMonth = qIndex * 3
        const endMonth = startMonth + 2
        const start = new Date(year, startMonth, 1)
        const end = new Date(year, endMonth + 1, 0)
        handleSelection(start, end)
    }

    const selectMonth = (mIndex) => { // 0 to 11
        const year = viewDate.getFullYear()
        const start = new Date(year, mIndex, 1)
        const end = new Date(year, mIndex + 1, 0)
        handleSelection(start, end)
    }


    // --- RENDERERS ---
    const renderYears = () => {
        const currentYear = viewDate.getFullYear()
        const startYear = Math.floor(currentYear / 10) * 10
        const years = []
        for (let i = 0; i < 12; i++) {
            years.push(startYear - 1 + i)
        }
        return (
            <div className="grid grid-cols-3 gap-2 mt-4">
                {years.map(y => {
                    const start = new Date(y, 0, 1)
                    const end = new Date(y, 11, 31)
                    const selected = isSelected(start, end)
                    return (
                        <button
                            key={y}
                            onClick={() => selectYear(y)}
                            className={`p-3 rounded-lg text-sm font-medium transition-colors border
                            ${selected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md transform scale-105'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500'}
                        `}
                        >
                            {y}
                        </button>
                    )
                })}
            </div>
        )
    }

    const renderQuarters = () => {
        const quarters = ['Q1 (Ian-Mar)', 'Q2 (Apr-Iun)', 'Q3 (Iul-Sep)', 'Q4 (Oct-Dec)']
        return (
            <div className="grid grid-cols-2 gap-3 mt-4">
                {quarters.map((q, idx) => {
                    const year = viewDate.getFullYear()
                    const startMonth = idx * 3
                    const endMonth = startMonth + 2
                    const start = new Date(year, startMonth, 1)
                    const end = new Date(year, endMonth + 1, 0)
                    const selected = isSelected(start, end)

                    return (
                        <button
                            key={idx}
                            onClick={() => selectQuarter(idx)}
                            className={`p-4 rounded-lg text-sm font-medium border transition-colors
                              ${selected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'}
                          `}
                        >
                            {q}
                        </button>
                    )
                })}
            </div>
        )
    }

    const renderMonths = () => {
        const months = [
            'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
            'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
        return (
            <div className="grid grid-cols-4 gap-2 mt-4">
                {months.map((m, idx) => {
                    const year = viewDate.getFullYear()
                    const start = new Date(year, idx, 1)
                    const end = new Date(year, idx + 1, 0)
                    const selected = isSelected(start, end)

                    return (
                        <button
                            key={idx}
                            onClick={() => selectMonth(idx)}
                            className={`p-3 rounded-lg text-sm font-medium border transition-all
                              ${selected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'}
                          `}
                        >
                            {m}
                        </button>
                    )
                })}
            </div>
        )
    }

    // Custom Date Range Picker (Simple version for "Zile")
    const renderDays = () => {
        return (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
                <p className="text-slate-400 text-sm mb-4">Selectează manual intervalul</p>
                <div className="flex items-center gap-2 justify-center">
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => onChange({ ...dateRange, startDate: e.target.value })}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => onChange({ ...dateRange, endDate: e.target.value })}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    />
                </div>
            </div>
        )
    }


    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm group"
            >
                <Calendar className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                <span className="text-sm font-medium text-slate-200">
                    {getRangeText()}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[380px] bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">

                    {/* Tabs */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex p-1 bg-slate-900/50 rounded-lg">
                            {['An', 'Trimestru', 'Luni', 'Zile'].map(tab => {
                                const map = { 'An': 'years', 'Trimestru': 'quarters', 'Luni': 'months', 'Zile': 'days' }
                                const key = map[tab]
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                                    ${activeTab === key ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}
                                `}
                                    >
                                        {tab}
                                    </button>
                                )
                            })}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                            title="Închide"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Navigation (Only for relevant views) */}
                    {activeTab !== 'days' && (
                        <div className="flex items-center justify-between mb-2 px-2 bg-slate-900/30 p-2 rounded-lg">
                            <button onClick={() => navigateView(-1)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            {/* Year Dropdown / Title */}
                            <div className="flex items-center gap-2">
                                {activeTab === 'years' ? (
                                    <span className="text-lg font-bold text-white">
                                        {Math.floor(viewDate.getFullYear() / 10) * 10} - {Math.floor(viewDate.getFullYear() / 10) * 10 + 9}
                                    </span>
                                ) : (
                                    <select
                                        value={viewDate.getFullYear()}
                                        onChange={(e) => {
                                            const newYear = parseInt(e.target.value)
                                            const newDate = new Date(viewDate)
                                            newDate.setFullYear(newYear)
                                            setViewDate(newDate)
                                        }}
                                        className="bg-transparent text-lg font-bold text-white border-none focus:ring-0 cursor-pointer appearance-none text-center hover:text-blue-400"
                                        style={{ textAlignLast: 'center' }}
                                    >
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                            <option key={y} value={y} className="bg-slate-800 text-white">
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <button onClick={() => navigateView(1)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Content View */}
                    <div className="min-h-[200px]">
                        {activeTab === 'years' && renderYears()}
                        {activeTab === 'quarters' && renderQuarters()}
                        {activeTab === 'months' && renderMonths()}
                        {activeTab === 'days' && renderDays()}
                    </div>

                    {/* Hint / Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                        <p className="text-xs text-slate-500 flex-1">
                            {activeTab === 'years' ? 'Click pt selecție multiplă (Interval)' : 'Click pt intervale'}
                        </p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                        >
                            Gata / Închide
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SmartDatePicker
