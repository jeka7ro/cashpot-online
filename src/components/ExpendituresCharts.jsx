import React from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Label } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Building2, Briefcase } from 'lucide-react'

const ExpendituresCharts = ({ expendituresData, dateRange, onDepartmentClick, onLocationClick }) => {
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
      return Object.entries(dayMap)
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
    return Object.entries(monthMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, value]) => {
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
          <LineChart data={trendData}>
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
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
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
                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e40af' }}
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
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 8, 8, 0]}
              onClick={(data) => {
                if (onDepartmentClick && data && data.name) {
                  onDepartmentClick(data.name)
                }
              }}
              cursor="pointer"
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
                      fill={isSmall ? '#1e40af' : '#ffffff'}
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

