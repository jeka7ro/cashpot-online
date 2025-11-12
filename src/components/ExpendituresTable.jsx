import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, ChevronRight, Maximize2, Minimize2,
  Users, Coffee, Home, Sparkles, ShieldCheck, Box, Music, Briefcase,
  DollarSign, Coins, Zap, Truck, Megaphone, Wrench, Scale,
  FileText, Settings, Wine, Banknote, Building2, Factory,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'

const ExpendituresTable = ({ matrix, locations, expenditureTypes, totalsRow, expendituresData }) => {
  const [expandedDepartments, setExpandedDepartments] = useState(new Set())
  const [allExpanded, setAllExpanded] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }) // SORTARE!
  
  // ICONIȚE PENTRU FIECARE DEPARTAMENT!
  const getDepartmentIcon = (deptName) => {
    const iconMap = {
      'Salarii': Users,
      'Bar': Coffee,
      'Chirie': Home,
      'Servicii de Curățenie': Sparkles,
      'Pază și Intervenție': ShieldCheck,
      'Achiziții Sloturi și accesorii': Box,
      'Asociația pentru drepturi de autor': Music,
      'Birou': Briefcase,
      'Cheltuieli Administrative': FileText,
      'Comisioane': DollarSign,
      'Electricitate': Zap,
      'Logistica': Truck,
      'Marketing': Megaphone,
      'Mentenanța': Wrench,
      'Metrologie': Scale,
      'Plată utilități': Banknote,
      'Prestări servicii': Settings,
      'Protocol': Wine,
      'POS': Coins,
      'Bancă': Building2,
      'Registru de Casă': Coins,
      'Alte Cheltuieli': Briefcase
    }
    
    const IconComponent = iconMap[deptName] || Factory
    return <IconComponent className="w-5 h-5" />
  }
  
  // Group categories by department
  const groupByDepartment = () => {
    const deptMap = {}
    
    expendituresData.forEach(item => {
      const dept = item.department_name || 'Unknown'
      
      // SKIP "Unknown" department (user NU vrea să-l vadă!)
      if (dept.toLowerCase().trim() === 'unknown' || dept.trim() === '') {
        return
      }
      
      // SKIP 4 DEPARTAMENTE DEBIFATE (POS, Registru de Casă, Bancă, Alte Cheltuieli)
      const excludedDepartments = ['POS', 'Registru de Casă', 'Bancă', 'Alte Cheltuieli']
      if (excludedDepartments.includes(dept)) {
        return
      }
      
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
  
  // === SORTARE LOGIC ===
  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }
  
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600 dark:text-blue-400" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600 dark:text-blue-400" />
  }
  
  // Sortare departamente
  const sortedDepartments = [...departments].sort((a, b) => {
    if (!sortConfig.key) return 0 // Fără sortare
    
    let valueA, valueB
    
    if (sortConfig.key === 'department') {
      valueA = a.name.toLowerCase()
      valueB = b.name.toLowerCase()
      return sortConfig.direction === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA)
    } else if (sortConfig.key === 'total') {
      valueA = a.total
      valueB = b.total
    } else {
      // Sortare după locație (ex: "CRAIOVA")
      valueA = a.byLocation[sortConfig.key] || 0
      valueB = b.byLocation[sortConfig.key] || 0
    }
    
    return sortConfig.direction === 'desc'
      ? valueB - valueA
      : valueA - valueB
  })
  
  const toggleDepartment = (deptName) => {
    const newExpanded = new Set(expandedDepartments)
    if (newExpanded.has(deptName)) {
      newExpanded.delete(deptName)
    } else {
      newExpanded.add(deptName)
    }
    setExpandedDepartments(newExpanded)
  }
  
  const toggleAllDepartments = () => {
    if (allExpanded) {
      // Collapse all
      setExpandedDepartments(new Set())
      setAllExpanded(false)
    } else {
      // Expand all
      const allDepts = new Set(departments.map(d => d.name))
      setExpandedDepartments(allDepts)
      setAllExpanded(true)
    }
  }
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }
  
  return (
    <div>
      {/* Expand/Collapse All Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          📊 <strong>{departments.length}</strong> departamente • Click pentru a expanda categoriile
        </div>
        <button
          onClick={toggleAllDepartments}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          {allExpanded ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span>Collapse All</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span>Expand All</span>
            </>
          )}
        </button>
      </div>
      
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
          <tr>
            <th 
              className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              onClick={() => handleSort('department')}
            >
              <div className="flex items-center justify-between">
                <span>Departament / Categorie</span>
                {getSortIcon('department')}
              </div>
            </th>
            {locations.map(loc => (
              <th 
                key={loc} 
                className="px-4 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                onClick={() => handleSort(loc)}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>{loc}</span>
                  {getSortIcon(loc)}
                </div>
              </th>
            ))}
            <th 
              className="px-4 py-4 text-right text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              onClick={() => handleSort('total')}
            >
              <div className="flex items-center justify-end space-x-1">
                <span>TOTAL</span>
                {getSortIcon('total')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {sortedDepartments.map((dept, deptIdx) => (
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
                    <span className="text-blue-600 dark:text-blue-400">
                      {getDepartmentIcon(dept.name)}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {dept.name}
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
                  className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3 ml-12">
                      <div className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500"></div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {category.name}
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
    </div>
  )
}

export default ExpendituresTable

