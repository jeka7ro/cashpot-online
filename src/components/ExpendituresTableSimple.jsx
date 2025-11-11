import React, { useState } from 'react'
import { Coins, Building2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const ExpendituresTableSimple = ({ expendituresData, dateRange }) => {
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '-'
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  // Process data pentru POS și Bancă
  const processData = () => {
    const departments = ['POS', 'Bancă']
    const result = []
    
    departments.forEach(dept => {
      // Get unique locations
      const locations = [...new Set(expendituresData
        .filter(item => item.department_name === dept)
        .map(item => item.location_name)
      )].sort()
      
      // Calculate totals per location
      const locationTotals = {}
      let deptTotal = 0
      
      locations.forEach(loc => {
        const total = expendituresData
          .filter(item => item.department_name === dept && item.location_name === loc)
          .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
        
        locationTotals[loc] = total
        deptTotal += total
      })
      
      // Get monthly breakdown
      const monthlyData = {}
      expendituresData
        .filter(item => item.department_name === dept)
        .forEach(item => {
          const dateObj = new Date(item.operational_date)
          const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
          const monthName = dateObj.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              name: monthName,
              locations: {},
              total: 0
            }
          }
          
          const loc = item.location_name
          if (!monthlyData[monthKey].locations[loc]) {
            monthlyData[monthKey].locations[loc] = 0
          }
          
          monthlyData[monthKey].locations[loc] += parseFloat(item.amount || 0)
          monthlyData[monthKey].total += parseFloat(item.amount || 0)
        })
      
      result.push({
        department: dept,
        locations,
        locationTotals,
        total: deptTotal,
        monthlyData: Object.entries(monthlyData)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, data]) => data)
      })
    })
    
    return result
  }
  
  const data = processData()
  const allLocations = [...new Set(expendituresData.map(item => item.location_name))].sort()
  
  // Sortare date după sortConfig
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0
    
    let aValue, bValue
    
    if (sortConfig.key === 'department') {
      aValue = a.department
      bValue = b.department
    } else if (sortConfig.key === 'total') {
      aValue = a.total
      bValue = b.total
    } else {
      // Sortare după locație
      aValue = a.locationTotals[sortConfig.key] || 0
      bValue = b.locationTotals[sortConfig.key] || 0
    }
    
    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    } else {
      return sortConfig.direction === 'asc' 
        ? aValue - bValue
        : bValue - aValue
    }
  })
  
  const toggleExpand = (dept) => {
    const newExpanded = new Set(expandedDepts)
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept)
    } else {
      newExpanded.add(dept)
    }
    setExpandedDepts(newExpanded)
  }
  
  // Sortare funcție
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }
  
  // Sortare icon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-500" />
      : <ArrowDown className="w-4 h-4 text-blue-500" />
  }
  
  const getDeptIcon = (dept) => {
    return dept === 'POS' ? <Coins className="w-5 h-5 text-green-600" /> : <Building2 className="w-5 h-5 text-blue-600" />
  }
  
  // Calculate grand total
  const grandTotal = data.reduce((sum, dept) => sum + dept.total, 0)
  const grandLocationTotals = {}
  allLocations.forEach(loc => {
    grandLocationTotals[loc] = data.reduce((sum, dept) => sum + (dept.locationTotals[loc] || 0), 0)
  })
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 sticky top-0 z-10">
          <tr>
            <th 
              className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b-2 border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              onClick={() => handleSort('department')}
            >
              <div className="flex items-center justify-between">
                <span>Departament</span>
                {getSortIcon('department')}
              </div>
            </th>
            {allLocations.map(loc => (
              <th 
                key={loc} 
                className="px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b-2 border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                onClick={() => handleSort(loc)}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>{loc}</span>
                  {getSortIcon(loc)}
                </div>
              </th>
            ))}
            <th 
              className="px-4 py-3 text-right text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider border-b-2 border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              onClick={() => handleSort('total')}
            >
              <div className="flex items-center justify-end space-x-2">
                <span>Total</span>
                {getSortIcon('total')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {sortedData.map((dept, deptIdx) => (
            <React.Fragment key={dept.department}>
              {/* Main Department Row */}
              <tr 
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                onClick={() => toggleExpand(dept.department)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {expandedDepts.has(dept.department) ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                    {getDeptIcon(dept.department)}
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {dept.department}
                    </span>
                  </div>
                </td>
                {allLocations.map(loc => (
                  <td key={loc} className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(dept.locationTotals[loc] || 0)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                  {formatCurrency(dept.total)}
                </td>
              </tr>
              
              {/* Monthly Breakdown (Expanded) */}
              {expandedDepts.has(dept.department) && dept.monthlyData.map((month, monthIdx) => (
                <tr key={`${dept.department}-${monthIdx}`} className="bg-slate-50 dark:bg-slate-900/50">
                  <td className="px-4 py-2 pl-12 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      {month.name}
                    </span>
                  </td>
                  {allLocations.map(loc => (
                    <td key={loc} className="px-4 py-2 text-right text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(month.locations[loc] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                    {formatCurrency(month.total)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          {/* Grand Total Row */}
          <tr className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 font-bold border-t-2 border-blue-400 dark:border-blue-600">
            <td className="px-4 py-4 text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Coins className="w-5 h-5 text-blue-600" />
              <span>TOTAL GENERAL</span>
            </td>
            {allLocations.map(loc => (
              <td key={loc} className="px-4 py-4 text-right text-slate-900 dark:text-slate-100">
                {formatCurrency(grandLocationTotals[loc])}
              </td>
            ))}
            <td className="px-4 py-4 text-right text-blue-700 dark:text-blue-400 text-lg bg-blue-100 dark:bg-blue-900/40">
              {formatCurrency(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
      
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 flex items-center space-x-2">
        <ChevronRight className="w-4 h-4" />
        <span>Click pe departament pentru a vedea detalii pe luni</span>
      </div>
    </div>
  )
}

export default ExpendituresTableSimple

