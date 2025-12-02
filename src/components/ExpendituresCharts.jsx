import React, { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Label } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Building2, Briefcase } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const ExpendituresCharts = ({ expendituresData, dateRange, onDepartmentClick, onLocationClick, onTrendRangeSelect }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [hoveredDepartment, setHoveredDepartment] = useState(null)
  // Process data for charts
  const processDepartmentData = () => {
    const deptMap = {}
    
    expendituresData.forEach(item => {
      const dept = item.department_name || 'Unknown'
      
      // SKIP "Unknown" (user NU vrea să-l vadă!)
      if (dept.toLowerCase().trim() === 'unknown' || dept.trim() === '') {
        return
      }
      
      // SKIP 4 DEPARTAMENTE DEBIFATE (POS, Registru de Casă, Bancă, Alte Cheltuieli)
      const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
      if (excludedDepartments.includes(dept)) {
        return
      }
      
      if (!deptMap[dept]) {
        deptMap[dept] = 0
      }
      deptMap[dept] += parseFloat(item.amount || 0)
    })
    
    return Object.entries(deptMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Top 5
  }
  
  const processLocationData = () => {
    const locMap = {}
    
    expendituresData.forEach(item => {
      const loc = item.location_name || 'Unknown'
      if (!locMap[loc]) {
        locMap[loc] = 0
      }
      locMap[loc] += parseFloat(item.amount || 0)
    })
    
    return Object.entries(locMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }
  
  const processTrendData = () => {
    // Detectăm dacă e selectată doar o lună
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    const isSingleMonth = (
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth()
    )
    
    if (isSingleMonth) {
      // AGREGARE PE ZI (când e selectată o singură lună)
      const dayMap = {}
      
      expendituresData.forEach(item => {
        const dateObj = new Date(item.operational_date)
        const dayKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
        
        if (!dayMap[dayKey]) {
          dayMap[dayKey] = 0
        }
        dayMap[dayKey] += parseFloat(item.amount || 0)
      })
      
      // Sortare CRONOLOGICĂ
      const sortedData = Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dayKey, value]) => {
          const [year, month, day] = dayKey.split('-')
          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          return {
            date: dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
            value: Math.round(value),
            originalDate: dayKey
          }
        })
      
      // EXCLUDE prima zi dacă are valoare MULT mai mare decât media (outlier)
      // Acest lucru ajută la vizualizare când prima zi are cheltuieli lunare mari (taxe, salarii)
      if (sortedData.length > 3) {
        const firstDayValue = sortedData[0].value
        const restValues = sortedData.slice(1).map(d => d.value)
        const avgRest = restValues.reduce((sum, v) => sum + v, 0) / restValues.length
        
        // Dacă prima zi este de >10x mai mare decât media restului, o excludem
        if (firstDayValue > avgRest * 10) {
          console.log(`📊 Excludem prima zi (${sortedData[0].date}) din grafic - outlier: ${firstDayValue} vs media ${Math.round(avgRest)}`)
          return sortedData.slice(1) // Exclude prima zi
        }
      }
      
      return sortedData
    } else {
      // AGREGARE PE LUNĂ (când e selectat interval mai mare)
      const monthMap = {}
      
      expendituresData.forEach(item => {
        const dateObj = new Date(item.operational_date)
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = 0
        }
        monthMap[monthKey] += parseFloat(item.amount || 0)
      })
      
      // Sortare CRONOLOGICĂ
      const sortedEntries = Object.entries(monthMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
      
      // Log pentru debugging - verifică ce luni lipsesc
      if (sortedEntries.length > 0) {
        const firstMonth = sortedEntries[0][0]
        const lastMonth = sortedEntries[sortedEntries.length - 1][0]
        const [firstYear, firstMonthNum] = firstMonth.split('-')
        const [lastYear, lastMonthNum] = lastMonth.split('-')
        
        // Verifică dacă există goluri între luni
        const monthsWithData = sortedEntries.map(([monthKey]) => monthKey)
        console.log('📊 Luni cu date în grafic:', monthsWithData)
        
        // Detectează luni lipsă între prima și ultima lună cu date
        const missingMonths = []
        const startDate = new Date(parseInt(firstYear), parseInt(firstMonthNum) - 1, 1)
        const endDate = new Date(parseInt(lastYear), parseInt(lastMonthNum) - 1, 1)
        
        for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthsWithData.includes(monthKey)) {
            missingMonths.push(monthKey)
          }
        }
        
        if (missingMonths.length > 0) {
          console.warn('⚠️ Luni fără date detectate:', missingMonths)
          console.warn('💡 Sfat: Folosește butonul "Import Toate Datele" pentru a aduce toate datele din toate sursele (SQL, API, Google Sheets)')
        }
      }
      
      return sortedEntries.map(([monthKey, value]) => {
        const [year, month] = monthKey.split('-')
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          date: dateObj.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
          value: Math.round(value),
          originalDate: monthKey
        }
      })
    }
  }
  
  const departmentData = processDepartmentData()
  const locationData = processLocationData()
  const trendData = processTrendData()
  
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']
  
  const totalAmount = expendituresData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }

  // Calculează distribuția pe locații pentru fiecare departament
  const departmentLocationDistribution = useMemo(() => {
    const distribution = {}
    departmentData.forEach((dept) => {
      const deptExpenditures = expendituresData.filter(
        (item) => item.department_name === dept.name
      )
      const locMap = {}
      deptExpenditures.forEach((item) => {
        const loc = item.location_name || 'Fără locație'
        if (!locMap[loc]) {
          locMap[loc] = 0
        }
        locMap[loc] += parseFloat(item.amount || 0)
      })
      distribution[dept.name] = Object.entries(locMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    })
    return distribution
  }, [departmentData, expendituresData])

  // Calculează distribuția pe locații și departamente pentru fiecare perioadă din trend
  const periodDistribution = useMemo(() => {
    const distribution = {}
    
    trendData.forEach((period) => {
      const originalDate = period.originalDate // Format: "YYYY-MM" sau "YYYY-MM-DD"
      
      // Filtrează datele pentru această perioadă
      const periodExpenditures = expendituresData.filter((item) => {
        const itemDate = new Date(item.operational_date)
        const itemDateStr = item.operational_date.split('T')[0] // "YYYY-MM-DD"
        
        if (originalDate.length === 7) {
          // Perioadă lunară "YYYY-MM"
          const itemMonthStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
          return itemMonthStr === originalDate
        } else {
          // Perioadă zilnică "YYYY-MM-DD"
          return itemDateStr === originalDate
        }
      })
      
      // Calculează distribuția pe locații
      const locationMap = {}
      const departmentMap = {}
      
      periodExpenditures.forEach((item) => {
        const dept = (item.department_name || '').trim()
        
        // SKIP "Unknown" (user NU vrea să-l vadă!)
        if (dept.toLowerCase() === 'unknown' || dept === '') {
          return
        }
        
        // SKIP 4 DEPARTAMENTE DEBIFATE (POS, Registru de Casă, Bancă, Alte Cheltuieli)
        const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
        if (excludedDepartments.includes(dept)) {
          return
        }
        
        const loc = item.location_name || 'Fără locație'
        const amount = parseFloat(item.amount || 0)
        
        // Distribuție pe locații
        if (!locationMap[loc]) {
          locationMap[loc] = 0
        }
        locationMap[loc] += amount
        
        // Distribuție pe departamente
        if (!departmentMap[dept]) {
          departmentMap[dept] = 0
        }
        departmentMap[dept] += amount
      })
      
      distribution[originalDate] = {
        locations: Object.entries(locationMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5), // Top 5 locații
        departments: Object.entries(departmentMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5) // Top 5 departamente
      }
    })
    
    return distribution
  }, [trendData, expendituresData])

  const handleTrendClick = (state) => {
    if (!onTrendRangeSelect) return
    if (!state || !state.activePayload || !state.activePayload[0]) return

    const payload = state.activePayload[0].payload
    const originalDate = payload.originalDate
    if (!originalDate) return

    let startDate
    let endDate

    if (originalDate.length === 7) {
      // Format "YYYY-MM" → toată luna
      const [yearStr, monthStr] = originalDate.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10) - 1
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      startDate = formatDateLocal(start)
      endDate = formatDateLocal(end)
    } else if (originalDate.length === 10) {
      // Format "YYYY-MM-DD" → o singură zi
      const [yearStr, monthStr, dayStr] = originalDate.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10) - 1
      const day = parseInt(dayStr, 10)
      const d = new Date(year, month, day)
      startDate = formatDateLocal(d)
      endDate = formatDateLocal(d)
    } else {
      return
    }

    onTrendRangeSelect({ startDate, endDate, originalDate })
  }

  // Tooltip custom pentru departamente cu distribuție pe locații
  const CustomDepartmentTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null

    const departmentName = payload[0].payload.name
    const departmentValue = payload[0].value
    const locationBreakdown = departmentLocationDistribution[departmentName] || []

    return (
      <div
        className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-600 rounded-2xl shadow-2xl p-4 max-w-xs"
        style={{ zIndex: 1400, backgroundColor: '#1e293b', background: '#1e293b' }}
      >
        <div className="mb-3 border-b border-slate-700 dark:border-slate-600 pb-2">
          <p className="font-bold text-white text-sm">{departmentName}</p>
          <p className="text-blue-400 text-xs mt-1">
            Total: {formatCurrency(departmentValue)} RON
          </p>
        </div>
        {locationBreakdown.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2 font-semibold">Distribuție pe locații:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {locationBreakdown.map((loc, idx) => {
                const percentage = ((loc.value / departmentValue) * 100).toFixed(1)
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-slate-300 truncate flex-1 mr-2">{loc.name}</span>
                    <span className="text-slate-400 font-semibold">
                      {formatCurrency(loc.value)} ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Tooltip custom pentru graficul de evoluție cu distribuție pe locații și departamente
  const CustomTrendTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null

    const periodData = payload[0].payload
    const periodValue = payload[0].value
    const originalDate = periodData.originalDate
    const distribution = periodDistribution[originalDate] || { locations: [], departments: [] }

    return (
      <div
        className="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-600 rounded-2xl shadow-2xl p-4 max-w-sm"
        style={{ zIndex: 1400, backgroundColor: '#1e293b', background: '#1e293b' }}
      >
        <div className="mb-3 border-b border-slate-700 dark:border-slate-600 pb-2">
          <p className="font-bold text-white text-sm">{periodData.date}</p>
          <p className="text-blue-400 text-xs mt-1">
            Total: {formatCurrency(periodValue)} RON
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Distribuție pe locații */}
          {distribution.locations.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-semibold">Top Locații:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {distribution.locations.map((loc, idx) => {
                  const percentage = ((loc.value / periodValue) * 100).toFixed(1)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="text-slate-300 truncate flex-1 mr-2 text-[10px]">{loc.name}</span>
                      <span className="text-slate-400 font-semibold text-[10px]">
                        {formatCurrency(loc.value)} ({percentage}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Distribuție pe departamente */}
          {distribution.departments.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-semibold">Top Departamente:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {distribution.departments.map((dept, idx) => {
                  const percentage = ((dept.value / periodValue) * 100).toFixed(1)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="text-slate-300 truncate flex-1 mr-2 text-[10px]">{dept.name}</span>
                      <span className="text-slate-400 font-semibold text-[10px]">
                        {formatCurrency(dept.value)} ({percentage}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Trend Chart - Card mare */}
      <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Evoluție Cheltuieli</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {dateRange.startDate} - {dateRange.endDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAmount)} RON
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-end mt-1">
              <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
              Total perioadă
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} onClick={handleTrendClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b" 
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              content={<CustomTrendTooltip />}
              cursor={false}
              wrapperStyle={{ 
                backgroundColor: 'transparent',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                margin: 0
              }}
              contentStyle={{ 
                backgroundColor: 'transparent',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                margin: 0
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            >
              <LabelList 
                dataKey="value" 
                position="top" 
                formatter={(value) => formatCurrency(value)}
                style={{ fontSize: '10px', fontWeight: 'bold', fill: isDark ? '#60a5fa' : '#1e40af' }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Department Chart */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
          <Briefcase className="w-5 h-5 mr-2 text-purple-500" />
          Top Departamente
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={departmentData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis 
              type="number" 
              stroke="#64748b"
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#64748b"
              style={{ fontSize: '11px' }}
              width={100}
            />
            <Tooltip 
              content={<CustomDepartmentTooltip />}
              cursor={false}
              wrapperStyle={{ 
                backgroundColor: 'transparent',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                margin: 0
              }}
              contentStyle={{ 
                backgroundColor: 'transparent',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                margin: 0
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 8, 8, 0]}
              onMouseEnter={(data) => {
                if (data && data.name) {
                  setHoveredDepartment(data.name)
                }
              }}
              onMouseLeave={() => setHoveredDepartment(null)}
              onClick={(data) => {
                if (onDepartmentClick && data && data.name) {
                  onDepartmentClick(data.name)
                }
              }}
              cursor="pointer"
              style={{ 
                cursor: 'pointer'
              }}
            >
              {departmentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList 
                dataKey="value" 
                position={(props) => {
                  // Calculăm spațiul disponibil în bară (ca % din max)
                  const maxValue = Math.max(...departmentData.map(d => d.value))
                  const percentage = (props.value / maxValue) * 100
                  // Dacă bara e mai mică de 20% din max → afișăm în exterior (right)
                  return percentage < 20 ? 'right' : 'insideRight'
                }}
                formatter={(value) => formatCurrency(value)}
                content={(props) => {
                  const { x, y, width, height, value } = props
                  const maxValue = Math.max(...departmentData.map(d => d.value))
                  const percentage = (value / maxValue) * 100
                  const isSmall = percentage < 20
                  
                  return (
                    <text
                      x={isSmall ? x + width + 5 : x + width - 5}
                      y={y + height / 2}
                      fill={isSmall ? (isDark ? '#60a5fa' : '#1e40af') : '#ffffff'}
                      fontSize="14px"
                      fontWeight="bold"
                      textAnchor={isSmall ? 'start' : 'end'}
                      dominantBaseline="middle"
                      style={isSmall ? {} : { textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                    >
                      {formatCurrency(value)}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Location Distribution Chart */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-green-500" />
          Distribuție pe Locații
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={locationData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent, value }) => {
                // Afișează PROCENT + SUMĂ RON
                const sumRON = formatCurrency(value)
                return `${name} (${(percent * 100).toFixed(0)}%) - ${sumRON} RON`
              }}
              labelLine={false}
              onClick={(data) => {
                if (onLocationClick && data && data.name) {
                  onLocationClick(data.name)
                }
              }}
              cursor="pointer"
            >
              {locationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ExpendituresCharts

