import React from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
    const dateMap = {}
    
    expendituresData.forEach(item => {
      const date = new Date(item.operational_date).toISOString().split('T')[0]
      if (!dateMap[date]) {
        dateMap[date] = 0
      }
      dateMap[date] += parseFloat(item.amount || 0)
    })
    
    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ 
        date: new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }), 
        value: Math.round(value) 
      }))
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
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
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
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Department Chart */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
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
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
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
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Location Distribution Chart */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6">
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
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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

