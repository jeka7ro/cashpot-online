import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Brain, Sun, Snowflake, PartyPopper, DollarSign, AlertCircle, ArrowUpDown, Clock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList } from 'recharts'
import Layout from '../components/Layout'
import axios from 'axios'

const POSBancaAIAnalysis = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { expendituresData: initialData = [], dateRange: initialDateRange = {} } = location.state || {}
  
  // Format date local
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(initialDateRange || {
    startDate: formatDateLocal(new Date(new Date().getFullYear(), 0, 1)),
    endDate: formatDateLocal(new Date())
  })
  const [expendituresData, setExpendituresData] = useState(initialData)

  // Quick date filters
  const applyQuickDateFilter = (filterType) => {
    const today = new Date()
    let startDate, endDate
    
    switch (filterType) {
      case 'azi':
        startDate = formatDateLocal(today)
        endDate = formatDateLocal(today)
        break
      case 'saptamana-curenta':
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        startDate = formatDateLocal(monday)
        endDate = formatDateLocal(today)
        break
      case 'luna-curenta':
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        startDate = formatDateLocal(currentMonthStart)
        endDate = formatDateLocal(currentMonthEnd)
        break
      case 'luna-anterioara':
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        startDate = formatDateLocal(prevMonthStart)
        endDate = formatDateLocal(prevMonthEnd)
        break
      case 'anul-curent':
        startDate = formatDateLocal(new Date(today.getFullYear(), 0, 1))
        endDate = formatDateLocal(new Date(today.getFullYear(), 11, 31))
        break
      case 'anul-trecut':
        startDate = formatDateLocal(new Date(today.getFullYear() - 1, 0, 1))
        endDate = formatDateLocal(new Date(today.getFullYear() - 1, 11, 31))
        break
      case 'toate':
        startDate = '2020-01-01'
        endDate = formatDateLocal(new Date(today.getFullYear() + 1, 11, 31))
        break
      default:
        return
    }
    
    setDateRange({ startDate, endDate })
  }
  const [sortColumn, setSortColumn] = useState('pos')
  const [sortDirection, setSortDirection] = useState('desc')
  const [activeTab, setActiveTab] = useState('toate') // 'toate', 'pos', 'banca'

  // Încarcă datele din backend
  const loadExpendituresData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data')
      setExpendituresData(response.data || [])
      console.log('✅ Expenditures data loaded:', response.data?.length || 0)
    } catch (error) {
      console.error('Error loading expenditures:', error)
      // Fallback la initialData dacă există
      if (initialData.length > 0) {
        setExpendituresData(initialData)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData.length) {
      // Dacă nu avem date inițiale, încercăm să le încărcăm
      loadExpendituresData()
    } else {
      setExpendituresData(initialData)
      setLoading(false)
    }
  }, [initialData])

  // REÎNCĂRCARE DATE CÂND SE SCHIMBĂ PERIOADA
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate) return
    
    // Reîncărcăm datele din backend pentru noua perioadă
    loadExpendituresData()
  }, [dateRange])

  // FILTRARE DATE DUPĂ dateRange (după ce sunt încărcate)
  const filteredExpendituresData = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return expendituresData
    
    const startDate = new Date(dateRange.startDate)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateRange.endDate)
    endDate.setHours(23, 59, 59, 999)
    
    return expendituresData.filter(item => {
      if (!item.operational_date) return false
      const itemDate = new Date(item.operational_date)
      return itemDate >= startDate && itemDate <= endDate
    })
  }, [expendituresData, dateRange])

  // HELPER FUNCTIONS (TREBUIE ÎNAINTE DE useMemo!)
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }

  const calculateStdDev = (values) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
    const squareDiffs = values.map(val => Math.pow(val - avg, 2))
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length
    return Math.sqrt(avgSquareDiff)
  }

  // SORTARE TABEL
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // EXTRAGE LOCAȚII UNICE
  const locations = useMemo(() => {
    return [...new Set(filteredExpendituresData.map(item => item.location_name))].filter(Boolean).sort()
  }, [filteredExpendituresData])

  // FILTRARE DATE POS & BANCĂ
  const posData = useMemo(() => {
    return filteredExpendituresData.filter(item => item.department_name === 'POS')
  }, [filteredExpendituresData])

  const bancaData = useMemo(() => {
    return filteredExpendituresData.filter(item => item.department_name === 'Bancă')
  }, [filteredExpendituresData])

  // ANALIZĂ ZILE SĂPTĂMÂNĂ (Luni-Duminică) CU LOCAȚII
  const weekdayAnalysis = useMemo(() => {
    const weekdays = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const posWeekdays = Array(7).fill(0)
    const bancaWeekdays = Array(7).fill(0)
    const locationsByDay = weekdays.map(() => ({}))

    posData.forEach(item => {
      const date = new Date(item.operational_date)
      const dayIdx = date.getDay()
      const loc = item.location_name || 'Unknown'
      
      posWeekdays[dayIdx] += parseFloat(item.amount || 0)
      
      if (!locationsByDay[dayIdx][loc]) {
        locationsByDay[dayIdx][loc] = { pos: 0, banca: 0 }
      }
      locationsByDay[dayIdx][loc].pos += parseFloat(item.amount || 0)
    })

    bancaData.forEach(item => {
      const date = new Date(item.operational_date)
      const dayIdx = date.getDay()
      const loc = item.location_name || 'Unknown'
      
      bancaWeekdays[dayIdx] += parseFloat(item.amount || 0)
      
      if (!locationsByDay[dayIdx][loc]) {
        locationsByDay[dayIdx][loc] = { pos: 0, banca: 0 }
      }
      locationsByDay[dayIdx][loc].banca += parseFloat(item.amount || 0)
    })

    return weekdays.map((day, idx) => ({
      day,
      pos: posWeekdays[idx],
      banca: bancaWeekdays[idx],
      total: posWeekdays[idx] + bancaWeekdays[idx],
      locations: locationsByDay[idx]
    }))
  }, [posData, bancaData])

  // ANALIZĂ ZILE DIN LUNĂ (1-31)
  const dayOfMonthAnalysis = useMemo(() => {
    const posDays = Array(31).fill(0)
    const bancaDays = Array(31).fill(0)

    posData.forEach(item => {
      const date = new Date(item.operational_date)
      const day = date.getDate() - 1
      if (day >= 0 && day < 31) {
        posDays[day] += parseFloat(item.amount || 0)
      }
    })

    bancaData.forEach(item => {
      const date = new Date(item.operational_date)
      const day = date.getDate() - 1
      if (day >= 0 && day < 31) {
        bancaDays[day] += parseFloat(item.amount || 0)
      }
    })

    return Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      pos: posDays[i],
      banca: bancaDays[i],
      total: posDays[i] + bancaDays[i]
    })).filter(item => item.total > 0)
  }, [posData, bancaData])

  // ANALIZĂ SEZONIERĂ (Iarnă, Primăvară, Vară, Toamnă)
  const seasonalAnalysis = useMemo(() => {
    const seasons = {
      'Iarnă': { pos: 0, banca: 0 },
      'Primăvară': { pos: 0, banca: 0 },
      'Vară': { pos: 0, banca: 0 },
      'Toamnă': { pos: 0, banca: 0 }
    }

    const getSeason = (month) => {
      if (month === 11 || month <= 1) return 'Iarnă'
      if (month >= 2 && month <= 4) return 'Primăvară'
      if (month >= 5 && month <= 7) return 'Vară'
      return 'Toamnă'
    }

    posData.forEach(item => {
      const date = new Date(item.operational_date)
      const season = getSeason(date.getMonth())
      seasons[season].pos += parseFloat(item.amount || 0)
    })

    bancaData.forEach(item => {
      const date = new Date(item.operational_date)
      const season = getSeason(date.getMonth())
      seasons[season].banca += parseFloat(item.amount || 0)
    })

    return Object.entries(seasons).map(([season, values]) => ({
      season,
      pos: values.pos,
      banca: values.banca,
      total: values.pos + values.banca
    }))
  }, [posData, bancaData])

  // SĂRBĂTORI LEGALE ROMÂNIA
  const holidayAnalysis = useMemo(() => {
    const holidays = {
      '01-01': 'Anul Nou',
      '01-02': 'Anul Nou',
      '01-24': 'Unirea Principatelor',
      '05-01': '1 Mai',
      '06-01': 'Ziua Copilului',
      '08-15': 'Adormirea Maicii Domnului',
      '11-30': 'Sfântul Andrei',
      '12-01': 'Ziua Națională',
      '12-25': 'Crăciun',
      '12-26': 'Crăciun'
    }

    const holidayData = {}
    
    ;[...posData, ...bancaData].forEach(item => {
      const date = new Date(item.operational_date)
      const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      
      if (holidays[key]) {
        if (!holidayData[holidays[key]]) {
          holidayData[holidays[key]] = { pos: 0, banca: 0, name: holidays[key] }
        }
        if (item.department_name === 'POS') {
          holidayData[holidays[key]].pos += parseFloat(item.amount || 0)
        } else {
          holidayData[holidays[key]].banca += parseFloat(item.amount || 0)
        }
      }
    })

    return Object.values(holidayData).map(item => ({
      ...item,
      total: item.pos + item.banca
    })).sort((a, b) => b.total - a.total)
  }, [posData, bancaData])

  // Detectează dacă este o singură lună selectată
  const isSingleMonth = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return false
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    const startMonth = start.getFullYear() * 12 + start.getMonth()
    const endMonth = end.getFullYear() * 12 + end.getMonth()
    return startMonth === endMonth
  }, [dateRange])

  // EVOLUȚIE LUNARĂ/ZILNICĂ POS VS BANCĂ
  const monthlyTrend = useMemo(() => {
    // Dacă este o singură lună, agregăm pe zile
    if (isSingleMonth) {
      const dailyData = {}

      posData.forEach(item => {
        const date = new Date(item.operational_date)
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const dayLabel = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { month: dayLabel, pos: 0, banca: 0, sortKey: dayKey }
        }
        dailyData[dayKey].pos += parseFloat(item.amount || 0)
      })

      bancaData.forEach(item => {
        const date = new Date(item.operational_date)
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const dayLabel = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { month: dayLabel, pos: 0, banca: 0, sortKey: dayKey }
        }
        dailyData[dayKey].banca += parseFloat(item.amount || 0)
      })

      const historicalData = Object.values(dailyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      
      // Pentru o singură lună, nu generăm predicție AI (prea puține date)
      return historicalData
    }

    // Agregare pe luni (logica originală)
    const monthlyData = {}

    posData.forEach(item => {
      const date = new Date(item.operational_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'short' })
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, pos: 0, banca: 0, sortKey: monthKey }
      }
      monthlyData[monthKey].pos += parseFloat(item.amount || 0)
    })

    bancaData.forEach(item => {
      const date = new Date(item.operational_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'short' })
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, pos: 0, banca: 0, sortKey: monthKey }
      }
      monthlyData[monthKey].banca += parseFloat(item.amount || 0)
    })

    const historicalData = Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    
    // ===== PREDICȚIE AI - SMART TREND ANALYSIS =====
    // Predicție doar pentru agregare lunară (nu pentru zile)
    if (!isSingleMonth && historicalData.length >= 3) {
      const lastMonths = historicalData.slice(-3) // Ultimele 3 luni pentru trend recent
      
      // Calculăm SCHIMBAREA MEDIE LUNARĂ (nu slope absolut!)
      const posChanges = []
      const bancaChanges = []
      
      for (let i = 1; i < lastMonths.length; i++) {
        const posChange = lastMonths[i].pos - lastMonths[i - 1].pos
        const bancaChange = lastMonths[i].banca - lastMonths[i - 1].banca
        posChanges.push(posChange)
        bancaChanges.push(bancaChange)
      }
      
      // Media schimbării lunare
      const avgPosChange = posChanges.reduce((sum, val) => sum + val, 0) / posChanges.length
      const avgBancaChange = bancaChanges.reduce((sum, val) => sum + val, 0) / bancaChanges.length
      
      // Limitare: maxim ±30% schimbare per lună pentru realism
      const lastPos = historicalData[historicalData.length - 1].pos
      const lastBanca = historicalData[historicalData.length - 1].banca
      const maxPosChange = lastPos * 0.3
      const maxBancaChange = lastBanca * 0.3
      
      const limitedPosChange = Math.max(-maxPosChange, Math.min(maxPosChange, avgPosChange))
      const limitedBancaChange = Math.max(-maxBancaChange, Math.min(maxBancaChange, avgBancaChange))
      
      // Generăm 3 luni de predicție
      const lastDate = new Date(historicalData[historicalData.length - 1].sortKey + '-01')
      const predictions = []
      
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(lastDate)
        futureDate.setMonth(lastDate.getMonth() + i)
        const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`
        const monthName = futureDate.toLocaleDateString('ro-RO', { year: 'numeric', month: 'short' })
        
        // Aplicăm schimbarea medie de i ori
        const predictedPos = lastPos + (limitedPosChange * i)
        const predictedBanca = lastBanca + (limitedBancaChange * i)
        
        predictions.push({
          month: monthName + ' (Predicție)',
          posPrediction: Math.max(lastPos * 0.3, predictedPos), // Minim 30% din ultima valoare
          bancaPrediction: Math.max(lastBanca * 0.3, predictedBanca),
          sortKey: monthKey,
          isPrediction: true
        })
      }
      
      return [...historicalData, ...predictions]
    }
    
    return historicalData
  }, [posData, bancaData, isSingleMonth])

  // AI INSIGHTS - DEDICATE PE TAB
  const aiInsights = useMemo(() => {
    const insights = []
    const totalPos = posData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    const totalBanca = bancaData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)

    // === TAB POS - DOAR INSIGHTS DESPRE POS ===
    if (activeTab === 'pos') {
      // 1. Cea mai profitabilă zi POS
      const bestWeekdayPos = [...weekdayAnalysis].sort((a, b) => b.pos - a.pos)[0]
      if (bestWeekdayPos && bestWeekdayPos.pos > 0) {
        insights.push({
          type: 'success',
          title: `🏆 Cea mai profitabilă zi POS: ${bestWeekdayPos.day}`,
          description: `Încasări POS: ${formatCurrency(bestWeekdayPos.pos)} RON`
        })
      }

      // 2. Cea mai slabă zi POS
      const worstWeekdayPos = [...weekdayAnalysis].sort((a, b) => a.pos - b.pos).find(item => item.pos > 0)
      if (worstWeekdayPos && worstWeekdayPos.pos > 0) {
        insights.push({
          type: 'warning',
          title: `📉 Cea mai slabă zi POS: ${worstWeekdayPos.day}`,
          description: `Încasări POS: ${formatCurrency(worstWeekdayPos.pos)} RON`
        })
      }

      // 3. Ziua din lună cu cele mai mari încasări POS
      const bestDayOfMonthPos = [...dayOfMonthAnalysis].sort((a, b) => b.pos - a.pos)[0]
      if (bestDayOfMonthPos && bestDayOfMonthPos.pos > 0) {
        insights.push({
          type: 'info',
          title: `📅 Ziua ${bestDayOfMonthPos.day} - Cele mai mari încasări POS`,
          description: `Medie POS: ${formatCurrency(bestDayOfMonthPos.pos)} RON pe luna`
        })
      }

      // 4. Sezonul cel mai profitabil pentru POS
      const bestSeasonPos = [...seasonalAnalysis].sort((a, b) => b.pos - a.pos)[0]
      if (bestSeasonPos && bestSeasonPos.pos > 0) {
        const icon = bestSeasonPos.season === 'Vară' ? '☀️' : bestSeasonPos.season === 'Iarnă' ? '❄️' : bestSeasonPos.season === 'Primăvară' ? '🌸' : '🍂'
        insights.push({
          type: 'success',
          title: `${icon} Sezonul POS: ${bestSeasonPos.season}`,
          description: `Încasări POS: ${formatCurrency(bestSeasonPos.pos)} RON`
        })
      }

      // 5. Total POS
      insights.push({
        type: 'info',
        title: '💳 Total Încasări POS',
        description: `Total POS în perioada selectată: ${formatCurrency(totalPos)} RON`
      })

      // 6. Volatilitate POS
      const posStdDev = calculateStdDev(monthlyTrend.map(m => m.pos).filter(v => v > 0))
      insights.push({
        type: 'warning',
        title: '📊 Volatilitate POS',
        description: `Deviație standard: ${formatCurrency(posStdDev)} RON. Fluctuații lunare în încasările POS.`
      })
    }

    // === TAB BANCĂ - DOAR INSIGHTS DESPRE BANCĂ ===
    else if (activeTab === 'banca') {
      // 1. Cea mai profitabilă zi Bancă
      const bestWeekdayBanca = [...weekdayAnalysis].sort((a, b) => b.banca - a.banca)[0]
      if (bestWeekdayBanca && bestWeekdayBanca.banca > 0) {
        insights.push({
          type: 'success',
          title: `🏆 Cea mai profitabilă zi Bancă: ${bestWeekdayBanca.day}`,
          description: `Depuneri Bancă: ${formatCurrency(bestWeekdayBanca.banca)} RON`
        })
      }

      // 2. Cea mai slabă zi Bancă
      const worstWeekdayBanca = [...weekdayAnalysis].sort((a, b) => a.banca - b.banca).find(item => item.banca > 0)
      if (worstWeekdayBanca && worstWeekdayBanca.banca > 0) {
        insights.push({
          type: 'warning',
          title: `📉 Cea mai slabă zi Bancă: ${worstWeekdayBanca.day}`,
          description: `Depuneri Bancă: ${formatCurrency(worstWeekdayBanca.banca)} RON`
        })
      }

      // 3. Ziua din lună cu cele mai mari depuneri Bancă
      const bestDayOfMonthBanca = [...dayOfMonthAnalysis].sort((a, b) => b.banca - a.banca)[0]
      if (bestDayOfMonthBanca && bestDayOfMonthBanca.banca > 0) {
        insights.push({
          type: 'info',
          title: `📅 Ziua ${bestDayOfMonthBanca.day} - Cele mai mari depuneri Bancă`,
          description: `Medie Bancă: ${formatCurrency(bestDayOfMonthBanca.banca)} RON pe lună`
        })
      }

      // 4. Sezonul cel mai profitabil pentru Bancă
      const bestSeasonBanca = [...seasonalAnalysis].sort((a, b) => b.banca - a.banca)[0]
      if (bestSeasonBanca && bestSeasonBanca.banca > 0) {
        const icon = bestSeasonBanca.season === 'Vară' ? '☀️' : bestSeasonBanca.season === 'Iarnă' ? '❄️' : bestSeasonBanca.season === 'Primăvară' ? '🌸' : '🍂'
        insights.push({
          type: 'success',
          title: `${icon} Sezonul Bancă: ${bestSeasonBanca.season}`,
          description: `Depuneri Bancă: ${formatCurrency(bestSeasonBanca.banca)} RON`
        })
      }

      // 5. Total Bancă
      insights.push({
        type: 'info',
        title: '🏦 Total Depuneri Bancă',
        description: `Total Bancă în perioada selectată: ${formatCurrency(totalBanca)} RON`
      })

      // 6. Volatilitate Bancă
      const bancaStdDev = calculateStdDev(monthlyTrend.map(m => m.banca).filter(v => v > 0))
      insights.push({
        type: 'warning',
        title: '📊 Volatilitate Bancă',
        description: `Deviație standard: ${formatCurrency(bancaStdDev)} RON. Fluctuații lunare în depunerile Bancă.`
      })
    }

    // === TAB TOATE - INSIGHTS COMPARATIVE ===
    else {
      // 1. Cea mai profitabilă zi (Total)
      const bestWeekday = [...weekdayAnalysis].sort((a, b) => b.total - a.total)[0]
      if (bestWeekday) {
        insights.push({
          type: 'success',
          title: `🏆 Cea mai profitabilă zi: ${bestWeekday.day}`,
          description: `Încasări totale: ${formatCurrency(bestWeekday.total)} RON (POS: ${formatCurrency(bestWeekday.pos)}, Bancă: ${formatCurrency(bestWeekday.banca)})`
        })
      }

      // 2. Cea mai slabă zi (Total)
      const worstWeekday = [...weekdayAnalysis].sort((a, b) => a.total - b.total).find(item => item.total > 0)
      if (worstWeekday && worstWeekday.total > 0) {
        insights.push({
          type: 'warning',
          title: `📉 Cea mai slabă zi: ${worstWeekday.day}`,
          description: `Încasări totale: ${formatCurrency(worstWeekday.total)} RON (POS: ${formatCurrency(worstWeekday.pos)}, Bancă: ${formatCurrency(worstWeekday.banca)})`
        })
      }

      // 3. Ziua din lună
      const bestDayOfMonth = [...dayOfMonthAnalysis].sort((a, b) => b.total - a.total)[0]
      if (bestDayOfMonth) {
        insights.push({
          type: 'info',
          title: `📅 Cea mai profitabilă zi din lună: Ziua ${bestDayOfMonth.day}`,
          description: `Încasări totale: ${formatCurrency(bestDayOfMonth.total)} RON (medie pe toate lunile)`
        })
      }

      // 4. Sezonul cel mai profitabil
      const bestSeason = [...seasonalAnalysis].sort((a, b) => b.total - a.total)[0]
      if (bestSeason) {
        const icon = bestSeason.season === 'Vară' ? '☀️' : bestSeason.season === 'Iarnă' ? '❄️' : bestSeason.season === 'Primăvară' ? '🌸' : '🍂'
        insights.push({
          type: 'success',
          title: `${icon} Sezonul cel mai profitabil: ${bestSeason.season}`,
          description: `Încasări totale: ${formatCurrency(bestSeason.total)} RON (POS: ${formatCurrency(bestSeason.pos)}, Bancă: ${formatCurrency(bestSeason.banca)})`
        })
      }

      // 5. Distribuție POS vs Bancă
      const posPercent = ((totalPos / (totalPos + totalBanca)) * 100).toFixed(1)
      const bancaPercent = ((totalBanca / (totalPos + totalBanca)) * 100).toFixed(1)
      insights.push({
        type: 'info',
        title: '💳 Distribuție POS vs Bancă',
        description: `POS: ${posPercent}% (${formatCurrency(totalPos)} RON) | Bancă: ${bancaPercent}% (${formatCurrency(totalBanca)} RON)`
      })

      // 6. Volatilitate comparativă
      const posStdDev = calculateStdDev(monthlyTrend.map(m => m.pos).filter(v => v > 0))
      const bancaStdDev = calculateStdDev(monthlyTrend.map(m => m.banca).filter(v => v > 0))
      
      if (posStdDev > bancaStdDev) {
        insights.push({
          type: 'warning',
          title: '📊 POS are volatilitate mai mare',
          description: `Deviație standard: ${formatCurrency(posStdDev)} RON (POS) vs ${formatCurrency(bancaStdDev)} RON (Bancă). Recomandare: monitorizați fluctuațiile POS.`
        })
      } else {
        insights.push({
          type: 'warning',
          title: '📊 Bancă are volatilitate mai mare',
          description: `Deviație standard: ${formatCurrency(bancaStdDev)} RON (Bancă) vs ${formatCurrency(posStdDev)} RON (POS). Recomandare: monitorizați fluctuațiile Bancă.`
        })
      }
    }

    return insights
  }, [weekdayAnalysis, dayOfMonthAnalysis, seasonalAnalysis, posData, bancaData, monthlyTrend, formatCurrency, activeTab])

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* HEADER */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenditures/pos-banca')}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
                <Brain className="w-8 h-8 mr-3 text-purple-500" />
                🤖 Analiză AI Avansată - {activeTab === 'pos' ? 'POS' : activeTab === 'banca' ? 'Bancă' : 'POS & Bancă'}
              </h1>
            </div>
          </div>
          
          {/* TABS PENTRU POS / BANCĂ / TOATE */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('toate')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'toate'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              📊 Toate
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'pos'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              💳 POS
            </button>
            <button
              onClick={() => setActiveTab('banca')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'banca'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              🏦 Bancă
            </button>
          </div>
        </div>
        
        {/* FILTRU PERIOADĂ */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            📅 Selectează Perioada pentru Analiză
          </label>
          <div className="mb-4">
            {/* Input-uri de date */}
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2">
              {/* Date Inputs - Clasic și Simplu */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    De la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Până la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>

              {/* Săgeți Navigare Perioadă */}
              <div className="flex items-center gap-1 border-l border-r border-slate-200 dark:border-slate-700 px-3">
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() - diffDays - 1)
                    end.setDate(end.getDate() - diffDays - 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă anterioară"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() + diffDays + 1)
                    end.setDate(end.getDate() + diffDays + 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă următoare"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Text Perioadă Afișată */}
              <div className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.startDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {' – '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.endDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Butoane Rapide cu Iconițe și Text - Sub Input-uri */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
              {[
                { id: 'azi', label: 'Azi', icon: Clock },
                { id: 'saptamana-curenta', label: 'Săpt', icon: CalendarDays },
                { id: 'luna-curenta', label: 'Luna curentă', icon: Calendar },
                { id: 'luna-anterioara', label: 'Luna trecută', icon: CalendarRange },
                { id: 'anul-curent', label: 'Anul curent', icon: Calendar },
                { id: 'anul-trecut', label: 'Anul trecut', icon: Calendar },
                { id: 'toate', label: 'Toate', icon: Calendar }
              ].map((btn) => {
                const IconComponent = btn.icon
                return (
                  <button
                    key={btn.id}
                    onClick={() => applyQuickDateFilter(btn.id)}
                    className="relative inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    title={btn.label}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{btn.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            ℹ️ Toate graficele și analizele AI se vor actualiza automat pentru perioada selectată
          </p>
        </div>
      </div>

      {/* AI INSIGHTS CARDS - DARK MODE ÎNTUNECAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiInsights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border-l-4 shadow-lg ${
              insight.type === 'success' 
                ? 'border-green-500 bg-green-50 dark:bg-gradient-to-br dark:from-green-950/80 dark:to-emerald-950/70' 
                : insight.type === 'warning' 
                ? 'border-yellow-500 bg-yellow-50 dark:bg-gradient-to-br dark:from-yellow-950/80 dark:to-amber-950/70' 
                : 'border-blue-500 bg-blue-50 dark:bg-gradient-to-br dark:from-blue-950/80 dark:to-cyan-950/70'
            }`}
          >
            <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">{insight.title}</h3>
            <p className="text-sm text-slate-700 dark:text-slate-200">{insight.description}</p>
          </div>
        ))}
      </div>

      {/* EVOLUȚIE LUNARĂ - CONDITIONAL PE TAB */}
      {(activeTab === 'toate' || activeTab === 'pos' || activeTab === 'banca') && (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
            📈 Evoluție {isSingleMonth ? 'Zilnică' : 'Lunară'}: {activeTab === 'pos' ? 'POS' : activeTab === 'banca' ? 'Bancă' : 'POS vs Bancă'}
            {!isSingleMonth && <span className="ml-3 text-sm font-normal text-purple-600 dark:text-purple-400">🤖 cu Predicție AI</span>}
          </h2>
          {posData.length === 0 && activeTab === 'pos' && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg border border-yellow-300 dark:border-yellow-700">
              ⚠️ Nu există date POS pentru perioada selectată. Rulează sincronizarea pentru {dateRange.startDate && dateRange.endDate ? `${dateRange.startDate} - ${dateRange.endDate}` : 'perioada selectată'}.
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => formatCurrency(value) + ' RON'}
            />
            <Legend />
            
            {/* DATE ISTORICE - POS */}
            {(activeTab === 'toate' || activeTab === 'pos') && (
              <Line type="monotone" dataKey="pos" stroke="#10b981" strokeWidth={3} name="POS (Istoric)" dot={{ r: 5 }}>
                <LabelList 
                  dataKey="pos" 
                  position="top" 
                  formatter={(value) => value ? formatCurrency(value) : ''}
                  style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    fill: document.documentElement.classList.contains('dark') ? '#ffffff' : '#1e40af',
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}
                />
              </Line>
            )}
            
            {/* PREDICȚIE AI - POS */}
            {(activeTab === 'toate' || activeTab === 'pos') && (
              <Line 
                type="monotone" 
                dataKey="posPrediction" 
                stroke="#a855f7" 
                strokeWidth={3} 
                strokeDasharray="5 5" 
                name="POS (Predicție AI)" 
                dot={{ r: 6, fill: '#a855f7' }}
              >
                <LabelList 
                  dataKey="posPrediction" 
                  position="top" 
                  formatter={(value) => value ? '🤖 ' + formatCurrency(value) : ''}
                  style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    fill: '#a855f7',
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}
                />
              </Line>
            )}
            
            {/* DATE ISTORICE - BANCĂ */}
            {(activeTab === 'toate' || activeTab === 'banca') && (
              <Line type="monotone" dataKey="banca" stroke="#3b82f6" strokeWidth={3} name="Bancă (Istoric)" dot={{ r: 5 }}>
                <LabelList 
                  dataKey="banca" 
                  position="top" 
                  formatter={(value) => value ? formatCurrency(value) : ''}
                  style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    fill: document.documentElement.classList.contains('dark') ? '#ffffff' : '#1e40af',
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}
                />
              </Line>
            )}
            
            {/* PREDICȚIE AI - BANCĂ */}
            {(activeTab === 'toate' || activeTab === 'banca') && (
              <Line 
                type="monotone" 
                dataKey="bancaPrediction" 
                stroke="#f97316" 
                strokeWidth={3} 
                strokeDasharray="5 5" 
                name="Bancă (Predicție AI)" 
                dot={{ r: 6, fill: '#f97316' }}
              >
                <LabelList 
                  dataKey="bancaPrediction" 
                  position="top" 
                  formatter={(value) => value ? '🤖 ' + formatCurrency(value) : ''}
                  style={{ 
                    fontSize: '10px', 
                    fontWeight: 'bold', 
                    fill: '#f97316',
                    textShadow: '0 0 4px rgba(0,0,0,0.8)'
                  }}
                />
              </Line>
            )}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Explicație Predicție */}
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
          <p className="text-sm text-purple-800 dark:text-purple-300">
            <strong>🤖 Predicție AI:</strong> Liniile punctate arată predicția bazată pe trend-ul ultimelor 6 luni. 
            {monthlyTrend.some(m => m.posPrediction && m.posPrediction > (monthlyTrend[monthlyTrend.length - 5]?.pos || 0)) ? 
              ' Tendință de CREȘTERE 📈' : ' Tendință de SCĂDERE 📉'}
          </p>
        </div>
      </div>
      )}

      {/* ZILE SĂPTĂMÂNĂ - CONDITIONAL */}
      {(activeTab === 'toate') && (
      <div className="card p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-green-500" />
          📅 Cele mai profitabile zile din săptămână (POS + Bancă)
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={weekdayAnalysis}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => formatCurrency(value) + ' RON'}
            />
            <Legend />
            <Bar dataKey="pos" fill="#10b981" name="POS" />
            <Bar dataKey="banca" fill="#3b82f6" name="Bancă" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* STATISTICA DETALIATĂ POS - ZILE SĂPTĂMÂNĂ */}
      {(activeTab === 'toate' || activeTab === 'pos') && (
      <div className="card p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-green-500" />
          💳 Analiză POS - Performanță pe Zile Săptămână
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={weekdayAnalysis}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '13px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => formatCurrency(value) + ' RON'}
            />
            <Legend />
            <Bar dataKey="pos" fill="#10b981" name="Încasări POS" radius={[8, 8, 0, 0]}>
              <LabelList 
                dataKey="pos" 
                position="top" 
                formatter={(value) => formatCurrency(value)}
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold', 
                  fill: '#ffffff',
                  textShadow: '0 0 4px rgba(0,0,0,0.8)'
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* GRAFIC POS PE ZILE DIN LUNĂ (1-31) */}
      {(activeTab === 'toate' || activeTab === 'pos') && (
      <div className="card p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-purple-500" />
          📆 Încasări POS pe Zile din Lună (1-31)
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dayOfMonthAnalysis}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '11px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => formatCurrency(value) + ' RON'}
            />
            <Legend />
            <Line type="monotone" dataKey="pos" stroke="#10b981" strokeWidth={3} name="POS" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="banca" stroke="#3b82f6" strokeWidth={2} name="Bancă" dot={{ r: 3 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* TABEL ANALIZĂ STATISTICĂ - CONDITIONAL */}
      {(activeTab === 'toate' || activeTab === 'pos') && (
      <div className="card p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
          📊 Tabel Analiză Statistică - {activeTab === 'pos' ? 'POS' : activeTab === 'banca' ? 'Bancă' : 'POS'} pe Zile Săptămână & Locații
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                <th 
                  onClick={() => handleSort('day')}
                  className="text-left py-3 px-4 text-slate-900 dark:text-white font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center">
                    Zi Săptămână
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('pos')}
                  className="text-right py-3 px-4 text-slate-900 dark:text-white font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end">
                    Total POS (RON)
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                {locations.map(loc => (
                  <th 
                    key={loc}
                    onClick={() => handleSort(loc)}
                    className="text-right py-3 px-4 text-slate-900 dark:text-white font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-end">
                      {loc}
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </div>
                  </th>
                ))}
                {activeTab !== 'pos' && (
                  <th 
                    onClick={() => handleSort('banca')}
                    className="text-right py-3 px-4 text-slate-900 dark:text-white font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-end">
                      Total Bancă (RON)
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </div>
                  </th>
                )}
                {activeTab === 'toate' && (
                  <th 
                    onClick={() => handleSort('total')}
                    className="text-right py-3 px-4 text-slate-900 dark:text-white font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-end">
                      Total General (RON)
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </div>
                  </th>
                )}
                <th 
                  onClick={() => handleSort('percentage')}
                  className="text-right py-3 px-4 text-slate-900 dark:text-white font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end">
                    % din Total
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...weekdayAnalysis]
                .sort((a, b) => {
                  let aVal, bVal
                  if (sortColumn === 'day') {
                    aVal = a.day
                    bVal = b.day
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                  } else if (sortColumn === 'percentage') {
                    const totalAll = weekdayAnalysis.reduce((sum, d) => sum + d.total, 0)
                    aVal = (a.total / totalAll) * 100
                    bVal = (b.total / totalAll) * 100
                  } else if (locations.includes(sortColumn)) {
                    aVal = (a.locations[sortColumn]?.pos || 0)
                    bVal = (b.locations[sortColumn]?.pos || 0)
                  } else {
                    aVal = a[sortColumn]
                    bVal = b[sortColumn]
                  }
                  return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                })
                .map((item, idx) => {
                  // CALCULĂM % DOAR PE BAZA TAB-ULUI ACTIV
                  const totalAll = activeTab === 'pos' 
                    ? weekdayAnalysis.reduce((sum, d) => sum + d.pos, 0)
                    : activeTab === 'banca'
                    ? weekdayAnalysis.reduce((sum, d) => sum + d.banca, 0)
                    : weekdayAnalysis.reduce((sum, d) => sum + d.total, 0)
                  
                  const itemValue = activeTab === 'pos' ? item.pos : activeTab === 'banca' ? item.banca : item.total
                  const percentage = ((itemValue / totalAll) * 100).toFixed(1)
                  const avgPos = item.pos // Aici e deja suma totală pentru ziua respectivă
                  
                  return (
                    <tr key={idx} className={`border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${
                      idx === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''
                    }`}>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                        {idx === 0 ? '🏆 ' : ''}{item.day}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-semibold">
                        {formatCurrency(item.pos)}
                      </td>
                      {locations.map(loc => (
                        <td key={loc} className="py-3 px-4 text-right text-slate-600 dark:text-slate-400 text-xs">
                          {formatCurrency(item.locations[loc]?.pos || 0)}
                        </td>
                      ))}
                      {activeTab !== 'pos' && (
                        <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                          {formatCurrency(item.banca)}
                        </td>
                      )}
                      {activeTab === 'toate' && (
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold">
                          {formatCurrency(item.total)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {percentage}%
                      </td>
                    </tr>
                  )
                })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800/50 border-t-2 border-slate-300 dark:border-slate-600">
              <tr className="font-bold">
                <td className="py-3 px-4 text-slate-900 dark:text-white">TOTAL</td>
                <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                  {formatCurrency(weekdayAnalysis.reduce((sum, d) => sum + d.pos, 0))}
                </td>
                {locations.map(loc => {
                  const total = weekdayAnalysis.reduce((sum, d) => sum + (d.locations[loc]?.pos || 0), 0)
                  return (
                    <td key={loc} className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 text-xs">
                      {formatCurrency(total)}
                    </td>
                  )
                })}
                {activeTab !== 'pos' && (
                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(weekdayAnalysis.reduce((sum, d) => sum + d.banca, 0))}
                  </td>
                )}
                {activeTab === 'toate' && (
                  <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                    {formatCurrency(weekdayAnalysis.reduce((sum, d) => sum + d.total, 0))}
                  </td>
                )}
                <td className="py-3 px-4 text-right text-slate-900 dark:text-white">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* GRID: ZILE LUNĂ + SEZONAL */}
      {activeTab === 'toate' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ZILE DIN LUNĂ */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-purple-500" />
            📆 Performanță pe zile din lună (1-31)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dayOfMonthAnalysis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '10px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => formatCurrency(value) + ' RON'}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} name="Total" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ANALIZĂ SEZONIERĂ */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
            <Sun className="w-6 h-6 mr-2 text-yellow-500" />
            🌦️ Analiză Sezonieră
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={seasonalAnalysis}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="season" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <PolarRadiusAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => formatCurrency(value) + ' RON'}
              />
              <Legend />
              <Radar name="POS" dataKey="pos" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Radar name="Bancă" dataKey="banca" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* SĂRBĂTORI LEGALE */}
      {activeTab === 'toate' && holidayAnalysis.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
            <PartyPopper className="w-6 h-6 mr-2 text-pink-500" />
            🎉 Impact Sărbători Legale
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={holidayAnalysis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} angle={-15} textAnchor="end" />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => formatCurrency(value) + ' RON'}
              />
              <Legend />
              <Bar dataKey="pos" fill="#10b981" name="POS" />
              <Bar dataKey="banca" fill="#3b82f6" name="Bancă" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FOOTER */}
      <div className="card p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          🤖 Această analiză a fost generată automat pe baza datelor din perioada selectată. 
          Pentru recomandări personalizate, consultați echipa de analiză financiară.
        </p>
      </div>
    </div>
    </Layout>
  )
}

export default POSBancaAIAnalysis

