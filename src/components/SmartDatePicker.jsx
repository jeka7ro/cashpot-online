import React, { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X, CalendarDays, Clock, CalendarRange } from 'lucide-react'

const SmartDatePicker = ({ dateRange, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('months') // 'years', 'quarters', 'months', 'days'
    const [viewDate, setViewDate] = useState(new Date()) // Used for navigation
    const [selectionStart, setSelectionStart] = useState(null) // Tracks the first click of a range
    const containerRef = useRef(null)

    const MAX_YEAR = new Date().getFullYear()

    // Initialize viewDate from current selection
    useEffect(() => {
        if (dateRange?.startDate) {
            const start = new Date(dateRange.startDate)
            if (start.getFullYear() <= MAX_YEAR) {
                setViewDate(start)
            } else {
                setViewDate(new Date(MAX_YEAR, 0, 1))
            }
        }
    }, [])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
                setSelectionStart(null) // Reset partial selection
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
        if (!dateRange?.startDate || !dateRange?.endDate) return 'Selectează perioada'
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

        // Clamp to MAX_YEAR
        if (newDate.getFullYear() > MAX_YEAR) {
            newDate.setFullYear(MAX_YEAR)
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
        if (!selectionStart) {
            // First point of range
            setSelectionStart(targetStart)
            // Just provide temporary visual feedback by setting range to this single unit
            onChange({
                startDate: formatToIso(targetStart),
                endDate: formatToIso(targetEnd)
            })
        } else {
            // Second point of range
            const start = selectionStart.getTime() < targetStart.getTime() ? selectionStart : targetStart
            const end = selectionStart.getTime() < targetStart.getTime() ? targetEnd : new Date(selectionStart.getFullYear(), selectionStart.getMonth() + 1, 0)

            // Wait, for years/months we need to be careful with targetEnd
            let finalStart, finalEnd;
            if (selectionStart.getTime() < targetStart.getTime()) {
                finalStart = selectionStart
                finalEnd = targetEnd
            } else {
                finalStart = targetStart
                // if selecting months/years, the end should be the end of the year/month
                // but targetEnd passed in already represents that.
                // However, if we click 2023 then 2021, targetStart is 2021-01-01, targetEnd is 2021-12-31.
                // selectionStart (2023) is after targetStart.
                // So finalStart = 2021-01-01, finalEnd = 2023-12-31 (end of selectionStart year)

                // Let's determine the "end" part of selectionStart
                // We need to know if selectionStart was a year, quarter, or month.
                // To keep it simple, let's assume the caller passes the boundaries correctly.
                // Since this is a shared handler, we'll just use the time comparison.

                // Better logic: track the "end" associated with selectionStart too.
                // But for now, let's just use the max of the two ends.
                const currentSelectionEnd = new Date(dateRange.endDate)
                finalEnd = targetEnd.getTime() > currentSelectionEnd.getTime() ? targetEnd : currentSelectionEnd
            }

            onChange({
                startDate: formatToIso(finalStart),
                endDate: formatToIso(finalEnd)
            })
            setSelectionStart(null)
        }
    }

    // More robust range handler for specific tabs
    const handleTabSelection = (unitStart, unitEnd) => {
        if (!selectionStart) {
            setSelectionStart({ start: unitStart, end: unitEnd })
            onChange({
                startDate: formatToIso(unitStart),
                endDate: formatToIso(unitEnd)
            })
        } else {
            let finalStart, finalEnd;
            if (unitStart.getTime() < selectionStart.start.getTime()) {
                finalStart = unitStart
                finalEnd = selectionStart.end
            } else {
                finalStart = selectionStart.start
                finalEnd = unitEnd
            }

            onChange({
                startDate: formatToIso(finalStart),
                endDate: formatToIso(finalEnd)
            })
            setSelectionStart(null)
        }
    }

    const isSelected = (unitStart, unitEnd) => {
        if (!dateRange?.startDate || !dateRange?.endDate) return false
        const cStart = new Date(dateRange.startDate).getTime()
        const cEnd = new Date(dateRange.endDate).getTime()
        const uStart = unitStart.getTime()
        const uEnd = unitEnd.getTime()

        // Highlight if unit overlaps with current selection
        return (uStart <= cEnd && uEnd >= cStart)
    }

    const isPartiallySelected = (unitStart, unitEnd) => {
        if (!selectionStart) return false
        const uStart = unitStart.getTime()
        const uEnd = unitEnd.getTime()
        const sStart = selectionStart.start.getTime()
        const sEnd = selectionStart.end.getTime()
        return (uStart <= sEnd && uEnd >= sStart)
    }

    // --- TAB HANDLERS ---
    const selectYear = (year) => {
        const start = new Date(year, 0, 1)
        const end = new Date(year, 11, 31)
        handleTabSelection(start, end)
    }

    const selectQuarter = (qIndex) => {
        const year = viewDate.getFullYear()
        const startMonth = qIndex * 3
        const endMonth = startMonth + 2
        const start = new Date(year, startMonth, 1)
        const end = new Date(year, endMonth + 1, 0)
        handleTabSelection(start, end)
    }

    const selectMonth = (mIndex) => {
        const year = viewDate.getFullYear()
        const start = new Date(year, mIndex, 1)
        const end = new Date(year, mIndex + 1, 0)
        handleTabSelection(start, end)
    }

    // --- RENDERERS ---
    const renderYears = () => {
        const currentYear = viewDate.getFullYear()
        const startYear = Math.floor(currentYear / 10) * 10
        const years = []
        for (let i = 0; i < 12; i++) {
            const y = startYear - 1 + i
            if (y <= MAX_YEAR) years.push(y)
        }
        return (
            <div className="grid grid-cols-3 gap-2 mt-4">
                {years.map(y => {
                    const start = new Date(y, 0, 1)
                    const end = new Date(y, 11, 31)
                    const selected = isSelected(start, end)
                    const partial = isPartiallySelected(start, end)
                    return (
                        <button
                            key={y}
                            onClick={() => selectYear(y)}
                            className={`p-3 rounded-lg text-sm font-medium transition-all border
                            ${selected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                    : partial
                                        ? 'bg-blue-900/50 border-blue-700 text-blue-200'
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

                    // Prevent future quarters
                    if (start > new Date()) return null;

                    const selected = isSelected(start, end)
                    const partial = isPartiallySelected(start, end)

                    return (
                        <button
                            key={idx}
                            onClick={() => selectQuarter(idx)}
                            className={`p-4 rounded-lg text-sm font-medium border transition-colors
                              ${selected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                    : partial
                                        ? 'bg-blue-900/50 border-blue-700 text-blue-200'
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

                    // Prevent future months
                    if (start > new Date()) return null;

                    const selected = isSelected(start, end)
                    const partial = isPartiallySelected(start, end)

                    return (
                        <button
                            key={idx}
                            onClick={() => selectMonth(idx)}
                            className={`p-3 rounded-lg text-sm font-medium border transition-all
                              ${selected
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                    : partial
                                        ? 'bg-blue-900/50 border-blue-700 text-blue-200'
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

    const renderDays = () => {
        return (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
                <p className="text-slate-400 text-sm mb-4">Selectează manual intervalul</p>
                <div className="flex items-center gap-2 justify-center">
                    <input
                        type="date"
                        value={dateRange.startDate}
                        max={formatToIso(new Date())}
                        onChange={(e) => onChange({ ...dateRange, startDate: e.target.value })}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        max={formatToIso(new Date())}
                        onChange={(e) => onChange({ ...dateRange, endDate: e.target.value })}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="relative" ref={containerRef}>
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

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[400px] bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex p-1 bg-slate-900/50 rounded-lg">
                            {['An', 'Trimestru', 'Luni', 'Zile'].map(tab => {
                                const map = { 'An': 'years', 'Trimestru': 'quarters', 'Luni': 'months', 'Zile': 'days' }
                                const key = map[tab]
                                return (
                                    <button
                                        key={key}
                                        onClick={() => { setActiveTab(key); setSelectionStart(null); }}
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
                            className="p-1 hover:bg-slate-700 rounded-full text-slate-400"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {activeTab !== 'days' && (
                        <div className="flex items-center justify-between mb-2 px-2 bg-slate-900/30 p-2 rounded-lg">
                            <button onClick={() => navigateView(-1)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2">
                                <select
                                    value={viewDate.getFullYear()}
                                    onChange={(e) => {
                                        const newYear = parseInt(e.target.value)
                                        const newDate = new Date(viewDate)
                                        newDate.setFullYear(newYear)
                                        setViewDate(newDate)
                                    }}
                                    className="bg-transparent text-lg font-bold text-white border-none focus:ring-0 cursor-pointer appearance-none text-center"
                                >
                                    {Array.from({ length: MAX_YEAR - 2020 + 1 }, (_, i) => 2020 + i).map(y => (
                                        <option key={y} value={y} className="bg-slate-800 text-white">
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={() => navigateView(1)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="min-h-[220px]">
                        {activeTab === 'years' && renderYears()}
                        {activeTab === 'quarters' && renderQuarters()}
                        {activeTab === 'months' && renderMonths()}
                        {activeTab === 'days' && renderDays()}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                        <p className="text-xs text-blue-400 font-medium">
                            {selectionStart ? 'Selectează al doilea punct pentru interval...' : 'Click pentru a începe selecția unui interval'}
                        </p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                        >
                            Gata
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SmartDatePicker
