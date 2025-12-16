import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  ChevronDown, ChevronRight, Maximize2, Minimize2,
  Users, Coffee, Home, Sparkles, ShieldCheck, Box, Music, Briefcase,
  DollarSign, Coins, Zap, Truck, Megaphone, Wrench, Scale,
  FileText, Settings, Wine, Banknote, Building2, Factory,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'

// Normalize diacritics for location name comparison (same as Expenditures.jsx)
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

// Normalize location name for consistent comparison
const normalizeLocationName = (str) => {
  if (!str) return ''
  return normalizeDiacritics(str.toLowerCase().trim())
}

const ExpendituresTable = ({ matrix, locations, expenditureTypes, totalsRow, expendituresData, onAmountClick, allExpanded, onToggleAll }) => {
  const [expandedDepartments, setExpandedDepartments] = useState(new Set())
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }) // SORTARE!
  const prevAllExpandedRef = useRef(undefined)
  const prevDepartmentNamesKeyRef = useRef('')
  
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
  
  // Group categories by department - MEMOIZED to prevent infinite loops
  const departments = useMemo(() => {
    const deptMap = {}
    
    if (!expendituresData || expendituresData.length === 0) {
      return []
    }
    
    // Create a map from normalized location names to actual location names from the locations prop
    // This ensures we match locations correctly even if they have different diacritics
    const locationMap = new Map()
    if (locations && locations.length > 0) {
      locations.forEach(loc => {
        const normalized = normalizeLocationName(loc)
        // Store the original location name from the locations prop
        if (!locationMap.has(normalized)) {
          locationMap.set(normalized, loc)
        }
      })
      
      // DEBUG: Log location mapping for Salarii department
      if (expendituresData.some(item => item.department_name === 'Salarii')) {
        console.log('🔍 [ExpendituresTable] Location mapping:', {
          locationsFromProp: locations,
          locationMap: Array.from(locationMap.entries()),
          sampleSalariiLocations: [...new Set(expendituresData.filter(item => item.department_name === 'Salarii').map(item => item.location_name))]
        })
      }
    }
    
    // Helper function to find matching location name from locations prop
    const findMatchingLocation = (itemLocation) => {
      if (!itemLocation) return 'Unknown'
      
      // First, try exact match
      if (locations && locations.includes(itemLocation)) {
        return itemLocation
      }
      
      // Then try normalized match
      const normalizedItem = normalizeLocationName(itemLocation)
      if (locationMap.has(normalizedItem)) {
        return locationMap.get(normalizedItem)
      }
      
      // If no match found, return original (will be grouped separately)
      return itemLocation
    }
    
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
      const itemLocation = item.location_name || 'Unknown'
      // Normalize location name to match with locations prop
      const location = findMatchingLocation(itemLocation)
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
  }, [expendituresData, locations])
  
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
  
  // Folosim funcția primită ca prop sau funcție locală
  const toggleAllDepartments = () => {
    if (onToggleAll) {
      onToggleAll()
    } else {
      // Fallback: funcționalitate locală
      const allDepts = new Set(departments.map(d => d.name))
      if (allExpanded) {
        // Collapse all
        setExpandedDepartments(new Set())
      } else {
        // Expand all
        setExpandedDepartments(allDepts)
      }
    }
  }
  
  // Sincronizează expandedDepartments cu allExpanded prop
  // Memoize department names string to prevent infinite loops
  const departmentNamesKey = useMemo(() => {
    return departments.map(d => d.name).sort().join(',')
  }, [departments])
  
  useEffect(() => {
    if (allExpanded === undefined || !departments || departments.length === 0) {
      return
    }
    
    // Only update if allExpanded or departmentNamesKey actually changed
    if (prevAllExpandedRef.current === allExpanded && prevDepartmentNamesKeyRef.current === departmentNamesKey) {
      return
    }
    
    prevAllExpandedRef.current = allExpanded
    prevDepartmentNamesKeyRef.current = departmentNamesKey
    
    if (allExpanded) {
      const allDepts = new Set(departments.map(d => d.name))
      setExpandedDepartments(allDepts)
    } else {
      setExpandedDepartments(new Set())
    }
  }, [allExpanded, departmentNamesKey, departments]) // Use departments for the actual logic
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }
  
  return (
    <div>
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
                  <td
                    key={loc}
                    className="px-4 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {formatCurrency(dept.byLocation[loc] || 0)}
                  </td>
                ))}
                <td className="px-4 py-4 text-right text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onAmountClick) {
                        onAmountClick({ department: dept.name, category: null })
                      }
                    }}
                    className="underline-offset-2 hover:underline"
                  >
                    {formatCurrency(dept.total)}
                  </button>
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onAmountClick) {
                          onAmountClick({ department: dept.name, category: category.name })
                        }
                      }}
                      className="underline-offset-2 hover:underline"
                    >
                      {formatCurrency(category.total)}
                    </button>
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
            {locations.map(loc => {
              // Calculează totalul pentru fiecare locație din datele grupate după departament
              const locationTotal = departments.reduce((sum, dept) => sum + (dept.byLocation[loc] || 0), 0)
              return (
                <td key={loc} className="px-4 py-4 text-right text-sm text-slate-900 dark:text-slate-100">
                  {formatCurrency(locationTotal)}
                </td>
              )
            })}
            <td className="px-4 py-4 text-right text-lg font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40">
              {formatCurrency(departments.reduce((sum, dept) => sum + dept.total, 0))}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  )
}

export default ExpendituresTable

