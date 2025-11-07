/**
 * AI INSIGHTS ENGINE - Cashpot Cheltuieli
 * Analizează datele și generează insights automate
 */

export const generateAIInsights = (expendituresData, dateRange) => {
  if (!expendituresData || expendituresData.length === 0) {
    return []
  }
  
  const insights = []
  
  // 1. TREND ANALYSIS - Luna curentă vs luna anterioară
  const trendInsight = analyzeTrend(expendituresData, dateRange)
  if (trendInsight) insights.push(trendInsight)
  
  // 2. DEPARTMENT COMPARISON - Cel mai mare spender
  const deptInsight = analyzeDepartments(expendituresData)
  if (deptInsight) insights.push(deptInsight)
  
  // 3. LOCATION COMPARISON - Locație cu cea mai mare creștere
  const locationInsight = analyzeLocations(expendituresData)
  if (locationInsight) insights.push(locationInsight)
  
  // 4. ANOMALY DETECTION - Spikes sau drop-uri neașteptate
  const anomalyInsight = detectAnomalies(expendituresData)
  if (anomalyInsight) insights.push(anomalyInsight)
  
  // 5. CATEGORY INSIGHTS - Categorii cu cele mai mari variații
  const categoryInsight = analyzeCategories(expendituresData)
  if (categoryInsight) insights.push(categoryInsight)
  
  // 6. PREDICTION - Estimare luna următoare
  const predictionInsight = predictNextMonth(expendituresData)
  if (predictionInsight) insights.push(predictionInsight)
  
  return insights
}

// === HELPER FUNCTIONS ===

const analyzeTrend = (data, dateRange) => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  // Current month data
  const currentMonthData = data.filter(item => {
    const date = new Date(item.operational_date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })
  
  // Previous month data
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const prevMonthData = data.filter(item => {
    const date = new Date(item.operational_date)
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear
  })
  
  if (currentMonthData.length === 0 || prevMonthData.length === 0) {
    return null
  }
  
  const currentTotal = currentMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const prevTotal = prevMonthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  
  const diff = currentTotal - prevTotal
  const percentChange = prevTotal > 0 ? ((diff / prevTotal) * 100) : 0
  
  const monthName = now.toLocaleDateString('ro-RO', { month: 'long' })
  const prevMonthName = new Date(prevYear, prevMonth).toLocaleDateString('ro-RO', { month: 'long' })
  
  if (Math.abs(percentChange) < 5) {
    return {
      type: 'neutral',
      icon: '📊',
      title: 'Cheltuieli Stabile',
      message: `Cheltuielile din ${monthName} (${formatCurrency(currentTotal)} RON) sunt similare cu ${prevMonthName} (${formatCurrency(prevTotal)} RON). Diferență: ${percentChange.toFixed(1)}%`,
      severity: 'info',
      recommendation: 'Continua monitorizarea pentru menținerea constantei.'
    }
  } else if (percentChange > 0) {
    return {
      type: 'increase',
      icon: '📈',
      title: `Creștere cu ${Math.abs(percentChange).toFixed(1)}%`,
      message: `Cheltuielile din ${monthName} au crescut cu ${formatCurrency(Math.abs(diff))} RON față de ${prevMonthName}. Atenție la bugete!`,
      severity: percentChange > 20 ? 'warning' : 'info',
      recommendation: percentChange > 20 ? 'URGENT: Analizează categoriile cu cele mai mari creșteri.' : 'Monitorizează categoriile care au crescut.'
    }
  } else {
    return {
      type: 'decrease',
      icon: '📉',
      title: `Scădere cu ${Math.abs(percentChange).toFixed(1)}%`,
      message: `Cheltuielile din ${monthName} au scăzut cu ${formatCurrency(Math.abs(diff))} RON față de ${prevMonthName}. Economie reușită!`,
      severity: 'success',
      recommendation: 'Excelent! Identifică ce acțiuni au dus la economii și continuă.'
    }
  }
}

const analyzeDepartments = (data) => {
  const deptMap = {}
  
  data.forEach(item => {
    const dept = item.department_name || 'Unknown'
    if (!deptMap[dept]) {
      deptMap[dept] = 0
    }
    deptMap[dept] += parseFloat(item.amount || 0)
  })
  
  const sortedDepts = Object.entries(deptMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
  
  if (sortedDepts.length === 0) return null
  
  const topDept = sortedDepts[0]
  const totalAmount = sortedDepts.reduce((sum, d) => sum + d.total, 0)
  const percentage = (topDept.total / totalAmount * 100).toFixed(1)
  
  return {
    type: 'department',
    icon: '🏢',
    title: `${topDept.name} - Cel Mai Mare Buget`,
    message: `Departamentul "${topDept.name}" are cele mai mari cheltuieli: ${formatCurrency(topDept.total)} RON (${percentage}% din total)`,
    severity: percentage > 50 ? 'warning' : 'info',
    recommendation: percentage > 50 ? `Concentrează-te pe reducerea costurilor în ${topDept.name}.` : `Monitorizează ${topDept.name} pentru optimizări.`
  }
}

const analyzeLocations = (data) => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  
  const locationMap = {}
  
  data.forEach(item => {
    const loc = item.location_name || 'Unknown'
    const date = new Date(item.operational_date)
    const isCurrent = date.getMonth() === currentMonth && date.getFullYear() === currentYear
    const isPrev = date.getMonth() === prevMonth && date.getFullYear() === prevYear
    
    if (!locationMap[loc]) {
      locationMap[loc] = { current: 0, prev: 0 }
    }
    
    if (isCurrent) {
      locationMap[loc].current += parseFloat(item.amount || 0)
    } else if (isPrev) {
      locationMap[loc].prev += parseFloat(item.amount || 0)
    }
  })
  
  const growthData = Object.entries(locationMap)
    .map(([name, data]) => {
      const growth = data.prev > 0 ? ((data.current - data.prev) / data.prev * 100) : 0
      return { name, growth, current: data.current, prev: data.prev }
    })
    .filter(item => item.prev > 0) // Only locations with previous data
    .sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))
  
  if (growthData.length === 0) return null
  
  const topGrowth = growthData[0]
  
  if (topGrowth.growth > 15) {
    return {
      type: 'location_increase',
      icon: '⚠️',
      title: `${topGrowth.name} - Creștere Alertă`,
      message: `Locația "${topGrowth.name}" are o creștere de ${topGrowth.growth.toFixed(1)}% (${formatCurrency(topGrowth.current - topGrowth.prev)} RON) vs luna anterioară`,
      severity: 'warning',
      recommendation: `Investighează cauzele creșterii la ${topGrowth.name}. Posibile cauze: reparații, utilități, evenimente speciale.`
    }
  } else if (topGrowth.growth < -15) {
    return {
      type: 'location_decrease',
      icon: '✅',
      title: `${topGrowth.name} - Economie Excelentă`,
      message: `Locația "${topGrowth.name}" a redus cheltuielile cu ${Math.abs(topGrowth.growth).toFixed(1)}% (${formatCurrency(Math.abs(topGrowth.current - topGrowth.prev))} RON)`,
      severity: 'success',
      recommendation: `Excelent! Documentează ce s-a schimbat la ${topGrowth.name} pentru a replica succesul.`
    }
  }
  
  return null
}

const detectAnomalies = (data) => {
  // Group by category and month
  const categoryMonthMap = {}
  
  data.forEach(item => {
    const category = item.expenditure_type || 'Unknown'
    const date = new Date(item.operational_date)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    
    if (!categoryMonthMap[category]) {
      categoryMonthMap[category] = {}
    }
    
    if (!categoryMonthMap[category][monthKey]) {
      categoryMonthMap[category][monthKey] = 0
    }
    
    categoryMonthMap[category][monthKey] += parseFloat(item.amount || 0)
  })
  
  // Find anomalies (values > 2x average)
  const anomalies = []
  
  Object.entries(categoryMonthMap).forEach(([category, months]) => {
    const values = Object.values(months)
    if (values.length < 3) return // Need at least 3 months
    
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length)
    
    values.forEach((value, idx) => {
      if (value > avg + 2 * stdDev) {
        anomalies.push({
          category,
          value,
          avg,
          deviation: ((value - avg) / avg * 100).toFixed(1)
        })
      }
    })
  })
  
  if (anomalies.length === 0) return null
  
  const topAnomaly = anomalies.sort((a, b) => b.deviation - a.deviation)[0]
  
  return {
    type: 'anomaly',
    icon: '🚨',
    title: `Anomalie Detectată - ${topAnomaly.category}`,
    message: `Categoria "${topAnomaly.category}" are cheltuieli neobișnuit de mari: ${formatCurrency(topAnomaly.value)} RON (${topAnomaly.deviation}% peste medie)`,
    severity: 'error',
    recommendation: `URGENT: Verifică facturile pentru "${topAnomaly.category}". Posibile cauze: eroare de introducere, eveniment neplanificat, creștere de preț.`
  }
}

const analyzeCategories = (data) => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  
  const categoryMap = {}
  
  data.forEach(item => {
    const cat = item.expenditure_type || 'Unknown'
    const date = new Date(item.operational_date)
    const isCurrent = date.getMonth() === currentMonth && date.getFullYear() === currentYear
    const isPrev = date.getMonth() === prevMonth && date.getFullYear() === prevYear
    
    if (!categoryMap[cat]) {
      categoryMap[cat] = { current: 0, prev: 0 }
    }
    
    if (isCurrent) {
      categoryMap[cat].current += parseFloat(item.amount || 0)
    } else if (isPrev) {
      categoryMap[cat].prev += parseFloat(item.amount || 0)
    }
  })
  
  const changes = Object.entries(categoryMap)
    .map(([name, data]) => {
      const change = data.prev > 0 ? ((data.current - data.prev) / data.prev * 100) : 0
      return { name, change, current: data.current, prev: data.prev }
    })
    .filter(item => item.prev > 0 && Math.abs(item.change) > 10)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  
  if (changes.length === 0) return null
  
  const topChange = changes[0]
  
  if (topChange.change > 0) {
    return {
      type: 'category_increase',
      icon: '💸',
      title: `${topChange.name} - Creștere ${topChange.change.toFixed(1)}%`,
      message: `Categoria "${topChange.name}" a crescut cu ${formatCurrency(topChange.current - topChange.prev)} RON față de luna anterioară`,
      severity: 'warning',
      recommendation: `Analizează factorii care au dus la creșterea la "${topChange.name}".`
    }
  } else {
    return {
      type: 'category_decrease',
      icon: '💰',
      title: `${topChange.name} - Economie ${Math.abs(topChange.change).toFixed(1)}%`,
      message: `Categoria "${topChange.name}" a scăzut cu ${formatCurrency(Math.abs(topChange.current - topChange.prev))} RON. Economie bună!`,
      severity: 'success',
      recommendation: `Excelent! Continuă strategia pentru "${topChange.name}".`
    }
  }
}

const predictNextMonth = (data) => {
  // Simple linear regression for next month prediction
  const monthlyTotals = {}
  
  data.forEach(item => {
    const date = new Date(item.operational_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = 0
    }
    
    monthlyTotals[monthKey] += parseFloat(item.amount || 0)
  })
  
  const sortedMonths = Object.entries(monthlyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6) // Last 6 months
  
  if (sortedMonths.length < 3) return null
  
  const values = sortedMonths.map(([_, total]) => total)
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  
  // Simple trend: compare last 3 months vs previous 3
  const recent3 = values.slice(-3)
  const prev3 = values.slice(-6, -3)
  
  if (prev3.length === 0) return null
  
  const recentAvg = recent3.reduce((sum, v) => sum + v, 0) / recent3.length
  const prevAvg = prev3.reduce((sum, v) => sum + v, 0) / prev3.length
  
  const trendPercent = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg * 100) : 0
  const prediction = recentAvg * (1 + trendPercent / 100)
  
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthName = nextMonth.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
  
  return {
    type: 'prediction',
    icon: '🔮',
    title: `Predicție ${nextMonthName}`,
    message: `Bazat pe trendul ultimelor luni, estimez cheltuieli de ~${formatCurrency(prediction)} RON pentru ${nextMonthName} (${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}% trend)`,
    severity: trendPercent > 15 ? 'warning' : 'info',
    recommendation: trendPercent > 15 ? 'Pregătește bugete suplimentare sau găsește oportunități de economisire.' : 'Trendul este stabil. Menține bugetul curent.'
  }
}

// === UTILITY ===

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ro-RO', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(amount)
}

// === EXPORT ===

export default generateAIInsights

