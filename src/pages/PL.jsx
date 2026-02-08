import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { Download, RefreshCw, Loader2, DollarSign, TrendingUp, Activity, Target, Menu, FileSpreadsheet, LayoutDashboard, Table2, BrainCircuit } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'

// Import new smart tools
import NarrativeInsights from '../components/NarrativeInsights'
import CostAnalysis from '../components/CostAnalysis'
import SlotOptimizer from '../components/SlotOptimizer'

// Import existing components
import KPICard from '../components/KPICard'
import ProfitHeatmap from '../components/ProfitHeatmap'
import WaterfallChart from '../components/WaterfallChart'
import ComparisonCharts from '../components/ComparisonCharts'
import PredictiveAnalytics from '../components/PredictiveAnalytics'
import TopPerformers from '../components/TopPerformers'
import PLTable from '../components/PLTable'
import SmartDatePicker from '../components/SmartDatePicker'
import ExpendituresDepartmentTable from '../components/ExpendituresDepartmentTable'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'

// Import utilities
import {
    calculateHealthScore,
    predictNextMonths,
    transformToHeatmap,
    transformToPLTableData,
    calculateWaterfallData,
    calculateYoYGrowth,
    getTopPerformers
} from '../utils/plUtils'

const PLDashboard = () => {
    const { user } = useAuth()
    const { locations: allLocations, visibleLocations } = useData()

    // State
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [monthlyData, setMonthlyData] = useState([])
    const [showMenu, setShowMenu] = useState(false)
    const [activeTab, setActiveTab] = useState('data')
    const [expendituresForTable, setExpendituresForTable] = useState([])

    // Date range state (default to current year)
    const [dateRange, setDateRange] = useState({
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`
    })

    const currentSelectionYear = new Date(dateRange.startDate).getFullYear()

    // Format date helper
    const formatDate = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Fetch monthly P&L data
    const fetchMonthlyData = async () => {
        try {
            setLoading(true)

            const start = new Date(dateRange.startDate)
            const end = new Date(dateRange.endDate)

            // We fetch the entire range + the previous year for comparison
            const fetchStart = `${start.getFullYear() - 1}-01-01`
            const fetchEnd = `${end.getFullYear()}-12-31`

            const params = {
                startDate: fetchStart,
                endDate: fetchEnd
            }

            if (visibleLocations && visibleLocations.length > 0) {
                params.includeLocations = visibleLocations.join(',')
            }

            const response = await axios.get('/api/incasari/monthly-by-location', {
                params: {
                    ...params,
                    _t: Date.now() // Prevent browser caching
                },
                timeout: 60000
            })

            if (response.data?.success && Array.isArray(response.data.rows)) {
                // Transform data
                const monthNames = [
                    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
                ]

                const byMonth = new Map()

                response.data.rows.forEach((row) => {
                    const locName = (row.locationName || '').trim()
                    if (!locName) return

                    const year = parseInt(row.year) || 0
                    const month = parseInt(row.month) || 0
                    if (!year || !month) return

                    const key = `${year}-${month}`
                    if (!byMonth.has(key)) {
                        byMonth.set(key, {
                            year,
                            month,
                            label: `${monthNames[month - 1]} ${year}`,
                            plByLoc: []
                        })
                    }

                    const ggr = Number(row.totalGgr || 0)
                    const expenses = Number(row.totalExpenditures || 0)
                    // Marketing is usually jackpot + hh + etc.
                    const marketing =
                        Number(row.totalJackpot || 0) + Number(row.totalHh || 0) +
                        Number(row.totalCbReal || 0) + Number(row.totalCbBirthday || 0) + Number(row.totalCbRaffle || 0)

                    byMonth.get(key).plByLoc.push({
                        locationName: locName,
                        totalIn: Number(row.totalIn || 0),
                        bet: Number(row.totalBet || 0),
                        win: Number(row.totalWin || 0),
                        ggr,
                        marketing,
                        expenses,
                        pl: ggr - expenses,
                        profitMargin: ggr > 0 ? ((ggr - expenses) / ggr) * 100 : 0,
                        slotsCount: Number(row.slotsCount || 0)
                    })
                })

                const data = Array.from(byMonth.values())
                    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

                setMonthlyData(data)
                console.log(`✅ Loaded ${data.length} months of P&L data`)
            }
        } catch (error) {
            console.error('❌ Error fetching monthly data:', error)
            toast.error('Eroare la încărcarea datelor P&L')
        } finally {
            setLoading(false)
        }
    }

    // Fetch expenditures for the department table
    const fetchExpendituresForTable = async () => {
        try {
            const { startDate, endDate } = dateRange
            console.log(`🔍 [DEPT TABLE] Fetching FILTERED expenditures... Range: ${startDate} to ${endDate}`)
            const response = await axios.get('/api/expenditures/sql-table', {
                params: {
                    startDate,
                    endDate,
                    pageSize: 'all'
                }
            })
            if (response.data?.success) {
                const data = response.data.data || []
                console.log(`✅ [DEPT TABLE] Received ${data.length} filtered records`)
                setExpendituresForTable(data)
            }
        } catch (error) {
            console.error('❌ Error fetching expenditures for table:', error)
            setExpendituresForTable([])
        }
    }

    // Initial load
    useEffect(() => {
        fetchMonthlyData()
        fetchExpendituresForTable()
    }, [visibleLocations, dateRange.startDate, dateRange.endDate])

    // Prepare data for Slot Optimizer (aggregated latest state)
    const optimizerData = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return []

        const locMap = new Map()

        // Use most recent month for Slot Count, but Average GGR over the year
        monthlyData.forEach(m => {
            m.plByLoc.forEach(l => {
                if (!locMap.has(l.locationName)) {
                    locMap.set(l.locationName, {
                        locationName: l.locationName,
                        totalGgr: 0,
                        months: 0,
                        lastSlotsCount: l.slotsCount
                    })
                }
                const record = locMap.get(l.locationName)
                record.totalGgr += l.ggr
                record.months += 1
                if (l.slotsCount > 0) record.lastSlotsCount = l.slotsCount
            })
        })

        return Array.from(locMap.values()).map(l => ({
            locationName: l.locationName,
            slotsCount: l.lastSlotsCount,
            avgGgrPerSlot: l.months > 0 && l.lastSlotsCount > 0
                ? (l.totalGgr / l.months) / l.lastSlotsCount
                : 0
        }))
    }, [monthlyData])

    // Calculate aggregated metrics
    const metrics = useMemo(() => {
        if (monthlyData.length === 0) return null

        // Get selection boundaries
        const start = new Date(dateRange.startDate)
        const end = new Date(dateRange.endDate)

        // Filter data for the EXACT selected range
        const currentData = monthlyData.filter(m => {
            const mDate = new Date(m.year, m.month - 1, 1)
            return mDate >= new Date(start.getFullYear(), start.getMonth(), 1) &&
                mDate <= new Date(end.getFullYear(), end.getMonth(), 1)
        })

        // Filter data for the SAME months in the previous year
        const previousData = monthlyData.filter(m => {
            const mDate = new Date(m.year + 1, m.month - 1, 1)
            return mDate >= new Date(start.getFullYear(), start.getMonth(), 1) &&
                mDate <= new Date(end.getFullYear(), end.getMonth(), 1)
        })

        // Aggregate totals
        const aggregateYear = (data) => {
            return data.reduce((acc, month) => {
                month.plByLoc.forEach(loc => {
                    acc.ggr += loc.ggr
                    acc.expenses += loc.expenses
                    acc.pl += loc.pl
                    acc.marketing += loc.marketing
                })
                return acc
            }, { ggr: 0, expenses: 0, pl: 0, marketing: 0 })
        }

        const current = aggregateYear(currentData)
        const previous = aggregateYear(previousData)

        // Calculate YoY changes
        const plChange = calculateYoYGrowth(current.pl, previous.pl) || 0
        const ggrChange = calculateYoYGrowth(current.ggr, previous.ggr) || 0
        const expensesChange = calculateYoYGrowth(current.expenses, previous.expenses) || 0

        // Calculate profit margin
        const profitMargin = current.ggr > 0 ? (current.pl / current.ggr) * 100 : 0
        const previousProfitMargin = previous.ggr > 0 ? (previous.pl / previous.ggr) * 100 : 0
        const marginChange = profitMargin - previousProfitMargin

        return {
            current,
            previous,
            plChange,
            ggrChange,
            expensesChange,
            profitMargin,
            marginChange,
            currentYearData: currentData,
            previousYearData: previousData
        }
    }, [monthlyData, dateRange])

    // Prepare data for visualizations
    const visualizationData = useMemo(() => {
        if (!metrics) return null

        // All locations from all months
        const allLocationNames = new Set()
        monthlyData.forEach(month => {
            month.plByLoc.forEach(loc => allLocationNames.add(loc.locationName))
        })

        // Heatmap data (Locations as Rows, Months as Columns)
        const heatmapData = transformToHeatmap(metrics.currentYearData, Array.from(allLocationNames))

        // Detailed Table data (Months as Rows, Locations as Columns)
        const tableData = transformToPLTableData(metrics.currentYearData, Array.from(allLocationNames))

        // Waterfall data (current year)
        const currentYearLocations = metrics.currentYearData.flatMap(m => m.plByLoc)
        const waterfallData = calculateWaterfallData(currentYearLocations)

        // Top/Bottom performers (current year)
        const locationTotals = new Map()
        metrics.currentYearData.forEach(month => {
            month.plByLoc.forEach(loc => {
                if (!locationTotals.has(loc.locationName)) {
                    locationTotals.set(loc.locationName, { locationName: loc.locationName, pl: 0, ggr: 0 })
                }
                const total = locationTotals.get(loc.locationName)
                total.pl += loc.pl
                total.ggr += loc.ggr
            })
        })

        const locationsArray = Array.from(locationTotals.values()).map(loc => ({
            ...loc,
            profitMargin: loc.ggr > 0 ? (loc.pl / loc.ggr) * 100 : 0
        }))

        const topPerformers = getTopPerformers(locationsArray, 'pl', 5, false)
        const bottomPerformers = getTopPerformers(locationsArray, 'pl', 5, true)

        // Predictions
        // Predictions (use longer history for better accuracy)
        const historicalForPredictions = [
            ...metrics.previousYearData.map(m => ({
                label: m.label,
                pl: m.plByLoc.reduce((sum, loc) => sum + loc.pl, 0),
                ggr: m.plByLoc.reduce((sum, loc) => sum + loc.ggr, 0),
                expenses: m.plByLoc.reduce((sum, loc) => sum + loc.expenses, 0)
            })),
            ...metrics.currentYearData.map(m => ({
                label: m.label,
                pl: m.plByLoc.reduce((sum, loc) => sum + loc.pl, 0),
                ggr: m.plByLoc.reduce((sum, loc) => sum + loc.ggr, 0),
                expenses: m.plByLoc.reduce((sum, loc) => sum + loc.expenses, 0)
            }))
        ].sort((a, b) => {
            // Simple sort by year/month if labels are standard, but they are localized strings
            // Since we construct the array from sorted source data (previous then current), it should be fine chronologically
            return 0
        })

        const predictions = predictNextMonths(historicalForPredictions, 3)

        return {
            heatmapData,
            tableData,
            waterfallData,
            topPerformers,
            bottomPerformers,
            predictions,
            monthlyProfits: historicalForPredictions // Show full history in chart
        }
    }, [monthlyData, metrics])

    // Export to Excel
    const exportToExcel = () => {
        try {
            const wb = XLSX.utils.book_new()

            // Summary sheet
            const summaryData = [
                ['P&L Dashboard - Export'],
                ['Generat:', new Date().toLocaleString('ro-RO')],
                [],
                ['Metrici Anuale',
                    `${currentSelectionYear}`,
                    `${currentSelectionYear - 1}`,
                    'Schimbare %'
                ],
                ['Profit Net', metrics.current.pl, metrics.previous.pl, metrics.plChange.toFixed(1)],
                ['GGR', metrics.current.ggr, metrics.previous.ggr, metrics.ggrChange.toFixed(1)],
                ['Cheltuieli', metrics.current.expenses, metrics.previous.expenses, metrics.expensesChange.toFixed(1)],
                ['Marjă Profit %', metrics.profitMargin.toFixed(1), '', '']
            ]

            const ws = XLSX.utils.aoa_to_sheet(summaryData)
            XLSX.utils.book_append_sheet(wb, ws, 'Sumar')

            // Monthly data sheet (only for selected year)
            const monthlyRows = metrics.currentYearData.flatMap(month =>
                month.plByLoc.map(loc => ({
                    'An': month.year,
                    'Lună': month.label,
                    'Locație': loc.locationName,
                    'GGR': loc.ggr,
                    'Cheltuieli': loc.expenses,
                    'Profit Net': loc.pl,
                    'Marjă %': loc.profitMargin.toFixed(1)
                }))
            )

            const ws2 = XLSX.utils.json_to_sheet(monthlyRows)
            XLSX.utils.book_append_sheet(wb, ws2, 'Date Lunare')

            XLSX.writeFile(wb, `PL_Dashboard_${formatDate(new Date())}.xlsx`)
            toast.success('Export Excel reușit!')
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Eroare la export')
        }
    }

    // Handle refresh
    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchMonthlyData()
        setRefreshing(false)
        toast.success('Date actualizate!')
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">Încărcare date P&L...</p>
                    </div>
                </div>
            </Layout>
        )
    }

    if (!metrics || !visualizationData) {
        return (
            <Layout>
                <div className="p-6">
                    <p className="text-center text-slate-600 dark:text-slate-400">Nu există date disponibile</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="max-w-[1800px] mx-auto p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                P&L Smart Command Center
                            </h1>
                            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                                {/* Advanced Date Selector */}
                                <div className="flex items-center gap-4">
                                    <SmartDatePicker
                                        dateRange={dateRange}
                                        onChange={setDateRange}
                                    />
                                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                                    <QuickDateButtons
                                        selectedFilter={null}
                                        onFilterSelect={(id) => {
                                            // Optional: if QuickDateButtons from DateRangeSelector.jsx supports it
                                            // For now just keep it or replace logic
                                        }}
                                        onChange={setDateRange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative ml-auto">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="inline-flex items-center justify-center p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 transition-all hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl z-50 py-2">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-2">
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Acțiuni
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleRefresh()
                                                setShowMenu(false)
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-3 transition-colors"
                                        >
                                            <RefreshCw className={`w-4 h-4 text-blue-500 ${refreshing ? 'animate-spin' : ''}`} />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                Actualizare date
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                exportToExcel()
                                                setShowMenu(false)
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-3 transition-colors"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                Export Excel
                                            </span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* KPI Cards Strip (Always Visible) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            title={`Profit Net ${currentSelectionYear}`}
                            value={metrics.current.pl}
                            change={metrics.plChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                            trend={visualizationData.monthlyProfits.map(m => m.pl)}
                        />

                        <KPICard
                            title="GGR Total"
                            value={metrics.current.ggr}
                            change={metrics.ggrChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                            trend={visualizationData.monthlyProfits.map(m => m.ggr)}
                        />

                        <KPICard
                            title="Cheltuieli Totale"
                            value={metrics.current.expenses}
                            change={metrics.expensesChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                            trend={visualizationData.monthlyProfits.map(m => m.expenses)}
                        />

                        <KPICard
                            title="Marjă Profit"
                            value={`${metrics.profitMargin.toFixed(1)}%`}
                            change={metrics.marginChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                        />
                    </div>

                    {/* TAB NAVIGATION */}
                    <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl">
                        <button
                            onClick={() => setActiveTab('data')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'data'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Table2 className="w-4 h-4" />
                            Date Detaliate
                        </button>
                        <button
                            onClick={() => setActiveTab('comparison')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'comparison'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Analiză Comparativă
                        </button>
                        <button
                            onClick={() => setActiveTab('insights')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'insights'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <BrainCircuit className="w-4 h-4" />
                            Smart Insights
                        </button>
                    </div>

                    {/* TAB CONTENT */}

                    {/* 1. INSIGHTS TAB */}
                    {activeTab === 'insights' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Narrative AI */}
                            <NarrativeInsights
                                metrics={metrics}
                                topPerformers={visualizationData.topPerformers}
                                bottomPerformers={visualizationData.bottomPerformers}
                            />

                            {/* COST ANALYSIS (NON-TAX) */}
                            <CostAnalysis
                                dateRange={dateRange}
                                locations={visibleLocations}
                            />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <WaterfallChart data={visualizationData.waterfallData} />
                                <PredictiveAnalytics
                                    historicalData={visualizationData.monthlyProfits}
                                    predictions={visualizationData.predictions}
                                />
                            </div>

                            <TopPerformers
                                topLocations={visualizationData.topPerformers}
                                bottomLocations={visualizationData.bottomPerformers}
                            />
                        </div>
                    )}

                    {/* 2. DATA TAB */}
                    {activeTab === 'data' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <PLTable
                                months={visualizationData.tableData}
                                locations={Array.from(new Set(monthlyData.flatMap(m => m.plByLoc.map(l => l.locationName))))}
                            />

                            {allLocations && (
                                <ExpendituresDepartmentTable
                                    data={expendituresForTable}
                                    locations={allLocations.map(l => l.name || l)}
                                    dateRange={dateRange}
                                />
                            )}

                            <ProfitHeatmap
                                data={visualizationData.heatmapData}
                                onCellClick={(location, month, data) => {
                                    console.log('Clicked:', location, month, data)
                                }}
                            />
                        </div>
                    )}

                    {/* 3. COMPARISON TAB */}
                    {activeTab === 'comparison' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ComparisonCharts
                                currentYearData={metrics.currentYearData.map(m => ({
                                    ...m,
                                    pl: m.plByLoc.reduce((sum, loc) => sum + loc.pl, 0)
                                }))}
                                previousYearData={metrics.previousYearData.map(m => ({
                                    ...m,
                                    pl: m.plByLoc.reduce((sum, loc) => sum + loc.pl, 0)
                                }))}
                            />

                            {/* SLOT OPTIMIZER */}
                            <SlotOptimizer locationData={optimizerData} />
                        </div>
                    )}

                </div>
            </div>
        </Layout>
    )
}

export default PLDashboard
