import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const ExpendituresTable = ({ matrix, locations, expenditureTypes, totalsRow, expendituresData }) => {
  const [expandedDepartments, setExpandedDepartments] = useState(new Set())
  
  // Group categories by department
  const groupByDepartment = () => {
    const deptMap = {}
    
    expendituresData.forEach(item => {
      const dept = item.department_name || 'Unknown'
      const category = item.expenditure_type || 'Unknown'
      const location = item.location_name || 'Unknown'
      const amount = parseFloat(item.amount || 0)
      
      if (!deptMap[dept]) {
        deptMap[dept] = {
          name: dept,
          total: 0,
          byLocation: {},
          categories: {}
        }
      }
      
      // Department totals
      deptMap[dept].total += amount
      if (!deptMap[dept].byLocation[location]) {
        deptMap[dept].byLocation[location] = 0
      }
      deptMap[dept].byLocation[location] += amount
      
      // Category details
      if (!deptMap[dept].categories[category]) {
        deptMap[dept].categories[category] = {
          name: category,
          total: 0,
          byLocation: {}
        }
      }
      deptMap[dept].categories[category].total += amount
      if (!deptMap[dept].categories[category].byLocation[location]) {
        deptMap[dept].categories[category].byLocation[location] = 0
      }
      deptMap[dept].categories[category].byLocation[location] += amount
    })
    
    return Object.values(deptMap).sort((a, b) => b.total - a.total)
  }
  
  const departments = groupByDepartment()
  
  const toggleDepartment = (deptName) => {
    const newExpanded = new Set(expandedDepartments)
    if (newExpanded.has(deptName)) {
      newExpanded.delete(deptName)
    } else {
      newExpanded.add(deptName)
    }
    setExpandedDepartments(newExpanded)
  }
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Departament / Categorie
            </th>
            {locations.map(loc => (
              <th key={loc} className="px-4 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {loc}
              </th>
            ))}
            <th className="px-4 py-4 text-right text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {departments.map((dept, deptIdx) => (
            <React.Fragment key={dept.name}>
              {/* Department Row */}
              <tr 
                className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                  deptIdx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''
                }`}
                onClick={() => toggleDepartment(dept.name)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {expandedDepartments.has(dept.name) ? (
                      <ChevronDown className="w-5 h-5 text-blue-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      🏢 {dept.name}
                    </span>
                  </div>
                </td>
                {locations.map(loc => (
                  <td key={loc} className="px-4 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(dept.byLocation[loc] || 0)}
                  </td>
                ))}
                <td className="px-4 py-4 text-right text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                  {formatCurrency(dept.total)}
                </td>
              </tr>
              
              {/* Category Rows (expanded) */}
              {expandedDepartments.has(dept.name) && Object.values(dept.categories).map((category, catIdx) => (
                <tr 
                  key={`${dept.name}-${category.name}`}
                  className="bg-slate-100 dark:bg-slate-900/50"
                >
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2 ml-8">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        └─ {category.name}
                      </span>
                    </div>
                  </td>
                  {locations.map(loc => (
                    <td key={loc} className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
                      {category.byLocation[loc] ? formatCurrency(category.byLocation[loc]) : '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                    {formatCurrency(category.total)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          {/* Grand Total Row */}
          <tr className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 font-bold">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 uppercase">
              💰 TOTAL GENERAL
            </td>
            {locations.map(loc => (
              <td key={loc} className="px-4 py-4 text-right text-sm text-slate-900 dark:text-slate-100">
                {formatCurrency(totalsRow[loc] || 0)}
              </td>
            ))}
            <td className="px-4 py-4 text-right text-lg font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40">
              {formatCurrency(totalsRow.total || 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default ExpendituresTable

