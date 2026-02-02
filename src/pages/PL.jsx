import React, { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { Download, RefreshCw, Loader2, DollarSign, TrendingUp, Activity, Target } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import * as XLSX from 'xlsx'

// Import new components
import KPICard from '../components/KPICard'
import ProfitHeatmap from '../components/ProfitHeatmap'
import WaterfallChart from '../components/WaterfallChart'
import ComparisonCharts from '../components/ComparisonCharts'
import PredictiveAnalytics from '../components/PredictiveAnalytics'
import TopPerformers from '../components/TopPerformers'
import PLTable from '../components/PLTable'
import DateRangeSelector from '../components/DateRangeSelector'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

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
                params,
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
                        profitMargin: ggr > 0 ? ((ggr - expenses) / ggr) * 100 : 0
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

    // Initial load
    useEffect(() => {
        fetchMonthlyData()
    }, [visibleLocations, dateRange.startDate, dateRange.endDate])

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

        return {
            current,
            previous,
            plChange,
            ggrChange,
            expensesChange,
            profitMargin,
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
        const monthlyProfits = metrics.currentYearData.map(m => ({
            label: m.label,
            pl: m.plByLoc.reduce((sum, loc) => sum + loc.pl, 0),
            ggr: m.plByLoc.reduce((sum, loc) => sum + loc.ggr, 0)
        }))
        const predictions = predictNextMonths(monthlyProfits, 3)

        return {
            heatmapData,
            tableData,
            waterfallData,
            topPerformers,
            bottomPerformers,
            predictions,
            monthlyProfits
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="max-w-[1800px] mx-auto p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                P&L Dashboard
                            </h1>
                            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                                <p className="text-sm font-medium">Analiză profitabilitate</p>

                                {/* Advanced Date Selector */}
                                <DateRangeSelector
                                    startDate={dateRange.startDate}
                                    endDate={dateRange.endDate}
                                    onChange={setDateRange}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/60 dark:border-slate-600/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all shadow-lg disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>

                            <button
                                onClick={exportToExcel}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                <span>Export Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            title={`Profit Net ${currentSelectionYear}`}
                            value={metrics.current.pl}
                            change={metrics.plChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                            icon={DollarSign}
                            trend={visualizationData.monthlyProfits.map(m => m.pl)}
                        />

                        <KPICard
                            title="GGR Total"
                            value={metrics.current.ggr}
                            change={metrics.ggrChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                            icon={TrendingUp}
                            trend={visualizationData.monthlyProfits.map(m => m.ggr)}
                        />

                        <KPICard
                            title="Cheltuieli Totale"
                            value={metrics.current.expenses}
                            change={metrics.expensesChange}
                            changeLabel={`vs ${currentSelectionYear - 1}`}
                            icon={Activity}
                        />

                        <KPICard
                            title="Marjă Profit"
                            value={`${metrics.profitMargin.toFixed(1)}%`}
                            change={metrics.plChange}
                            changeLabel="trend"
                            icon={Target}
                        />
                    </div>

                    {/* Detailed P&L Table */}
                    <PLTable
                        months={visualizationData.tableData}
                        locations={Array.from(new Set(monthlyData.flatMap(m => m.plByLoc.map(l => l.locationName))))}
                    />

                    {/* Heatmap */}
                    <ProfitHeatmap
                        data={visualizationData.heatmapData}
                        onCellClick={(location, month, data) => {
                            console.log('Clicked:', location, month, data)
                        }}
                    />

                    {/* Waterfall and Predictions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WaterfallChart data={visualizationData.waterfallData} />
                        <PredictiveAnalytics
                            historicalData={visualizationData.monthlyProfits}
                            predictions={visualizationData.predictions}
                        />
                    </div>

                    {/* Comparison Charts */}
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

                    {/* Top Performers */}
                    <TopPerformers
                        topLocations={visualizationData.topPerformers}
                        bottomLocations={visualizationData.bottomPerformers}
                    />
                </div>
            </div>
        </Layout>
    )
}

export default PLDashboard
