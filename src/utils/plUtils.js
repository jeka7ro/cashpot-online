// Utility functions for P&L calculations and data transformations

/**
 * Calculate health score for a location (0-100)
 * Based on profitability, growth trend, and consistency
 */
export const calculateHealthScore = (locationData) => {
    if (!locationData || locationData.length === 0) return 0

    let score = 50 // Base score

    // Factor 1: Profitability (40 points max)
    const avgProfitMargin = locationData.reduce((sum, month) => {
        const margin = month.ggr > 0 ? ((month.ggr - month.expenses) / month.ggr) * 100 : 0
        return sum + margin
    }, 0) / locationData.length

    score += Math.min(40, Math.max(-20, avgProfitMargin))

    // Factor 2: Growth trend (30 points max)
    if (locationData.length >= 2) {
        const recentProfit = locationData.slice(-3).reduce((sum, m) => sum + (m.ggr - m.expenses), 0)
        const olderProfit = locationData.slice(0, 3).reduce((sum, m) => sum + (m.ggr - m.expenses), 0)
        const growthRate = olderProfit > 0 ? ((recentProfit - olderProfit) / olderProfit) * 100 : 0
        score += Math.min(30, Math.max(-30, growthRate))
    }

    // Factor 3: Consistency (20 points max)
    const profits = locationData.map(m => m.ggr - m.expenses)
    const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length
    const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = avgProfit !== 0 ? (stdDev / Math.abs(avgProfit)) : 1
    score += Math.max(0, 20 - (coefficientOfVariation * 20))

    return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Simple linear regression for predictions
 */
export const predictNextMonths = (historicalData, monthsAhead = 3) => {
    if (!historicalData || historicalData.length < 3) return []

    const n = historicalData.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = historicalData.map(d => d.ggr - d.expenses)

    // Calculate slope and intercept
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R² for confidence
    const yMean = sumY / n
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const ssResidual = y.reduce((sum, yi, i) => {
        const predicted = slope * x[i] + intercept
        return sum + Math.pow(yi - predicted, 2)
    }, 0)
    const r2 = 1 - (ssResidual / ssTotal)

    // Generate predictions
    const predictions = []
    for (let i = 1; i <= monthsAhead; i++) {
        const nextX = n + i - 1
        const predicted = slope * nextX + intercept
        predictions.push({
            value: Math.round(predicted),
            confidence: Math.round(r2 * 100)
        })
    }

    return predictions
}

/**
 * Transform monthly data for P&L Table (Rows = Months, Columns = Locations)
 */
export const transformToPLTableData = (monthlyData, locations) => {
    // Sort months chronologically
    const sortedMonths = [...monthlyData].sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month
    )

    return sortedMonths.map(monthEntry => {
        const monthKey = `${monthEntry.year}-${String(monthEntry.month).padStart(2, '0')}`

        const locMap = {}
        locations.forEach(locName => {
            const locData = monthEntry.plByLoc?.find(l => l.locationName === locName)
            locMap[locName] = {
                profit: locData ? locData.pl : 0,
                ggr: locData ? locData.ggr : 0,
                expenses: locData ? locData.expenses : 0,
                profitMargin: locData && locData.ggr > 0 ? (locData.pl / locData.ggr) * 100 : 0
            }
        })

        return {
            month: monthKey,
            label: monthEntry.label,
            locations: locMap
        }
    })
}

/**
 * Transform monthly data for Heatmap (Rows = Locations, Columns = Months)
 */
export const transformToHeatmap = (monthlyData, locations) => {
    const heatmapData = []

    locations.forEach(location => {
        const locationData = monthlyData
            .filter(m => m.plByLoc?.some(l => l.locationName === location))
            .map(m => {
                const locData = m.plByLoc.find(l => l.locationName === location)
                return {
                    month: `${m.year}-${String(m.month).padStart(2, '0')}`,
                    label: m.label,
                    profit: locData ? locData.pl : 0,
                    ggr: locData ? locData.ggr : 0,
                    expenses: locData ? locData.expenses : 0,
                    profitMargin: locData && locData.ggr > 0
                        ? ((locData.pl / locData.ggr) * 100)
                        : 0
                }
            })

        heatmapData.push({
            location,
            months: locationData
        })
    })

    return heatmapData
}

/**
 * Calculate waterfall data for P&L breakdown
 */
export const calculateWaterfallData = (data) => {
    if (!data) return []

    const totalGgr = data.reduce((sum, m) => sum + (m.ggr || 0), 0)
    const totalMarketing = data.reduce((sum, m) => sum + (m.marketing || 0), 0)
    const totalExpenses = data.reduce((sum, m) => sum + (m.expenses || 0), 0)

    // Adjusted Net Profit (GGR - Marketing - OpEx)
    // Note: If PL was calculated differently elsewhere, this might show a different profit than KPI cards
    const netProfit = totalGgr - totalMarketing - totalExpenses

    return [
        { name: 'GGR', value: totalGgr, cumulative: totalGgr },
        { name: 'Marketing', value: -totalMarketing, cumulative: totalGgr - totalMarketing },
        { name: 'Cheltuieli Op.', value: -totalExpenses, cumulative: netProfit },
        { name: 'Profit Net', value: netProfit, cumulative: netProfit, isTotal: true }
    ]
}

/**
 * Format large numbers with K/M suffix
 */
export const formatCompactNumber = (num) => {
    if (Math.abs(num) >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
    }
    if (Math.abs(num) >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
    }
    return num.toFixed(0)
}

/**
 * Get color based on value (red for negative, green for positive)
 */
export const getValueColor = (value, threshold = 0) => {
    if (value > threshold) return '#22c55e' // green
    if (value < threshold) return '#ef4444' // red
    return '#64748b' // gray
}

/**
 * Calculate YoY growth percentage
 */
export const calculateYoYGrowth = (currentYear, previousYear) => {
    if (!previousYear || previousYear === 0) return null
    return ((currentYear - previousYear) / Math.abs(previousYear)) * 100
}

/**
 * Get top N performers by metric
 */
export const getTopPerformers = (data, metric = 'pl', n = 10, ascending = false) => {
    const sorted = [...data].sort((a, b) =>
        ascending ? a[metric] - b[metric] : b[metric] - a[metric]
    )
    return sorted.slice(0, n)
}
