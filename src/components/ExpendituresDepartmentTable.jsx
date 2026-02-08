import React, { useMemo, useState } from 'react'
import { Building2, Loader2, X, ChevronRight, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'
import * as XLSX from 'xlsx'
import { toast } from 'react-hot-toast'

const ExpendituresDepartmentTable = ({ data, locations }) => {
    const [expandedDepts, setExpandedDepts] = useState(new Set())
    const [expandedTypes, setExpandedTypes] = useState(new Set())

    // Aggregate data into nested structure: Dept -> Type -> Location
    const { departmentData, totalsRow } = useMemo(() => {
        if (!data || !locations) return { departmentData: {}, totalsRow: {} }

        const deptMap = {}
        const totals = { total: 0 }

        // Init totals
        locations.forEach(loc => totals[loc] = 0)

        data.forEach(item => {
            const dept = item.department_name || 'Nespecificat'
            const type = item.expenditure_type || 'Nespecificat'
            const loc = item.location_name
            const amount = parseFloat(item.amount) || 0

            // Init department
            if (!deptMap[dept]) {
                deptMap[dept] = {
                    total: 0,
                    locations: {},
                    types: {}
                }
                locations.forEach(l => deptMap[dept].locations[l] = 0)
            }

            // Init type within department
            if (!deptMap[dept].types[type]) {
                deptMap[dept].types[type] = {
                    total: 0,
                    locations: {}
                }
                locations.forEach(l => deptMap[dept].types[type].locations[l] = 0)
            }

            // Aggregate amounts
            if (locations.includes(loc)) {
                deptMap[dept].locations[loc] += amount
                deptMap[dept].types[type].locations[loc] += amount
                totals[loc] += amount
            }
            deptMap[dept].total += amount
            deptMap[dept].types[type].total += amount
            totals.total += amount
        })

        return { departmentData: deptMap, totalsRow: totals }
    }, [data, locations])

    const toggleDept = (deptName) => {
        setExpandedDepts(prev => {
            const next = new Set(prev)
            if (next.has(deptName)) {
                next.delete(deptName)
                // Also collapse all types under this dept
                setExpandedTypes(prevTypes => {
                    const nextTypes = new Set(prevTypes)
                    Object.keys(departmentData[deptName]?.types || {}).forEach(type => {
                        nextTypes.delete(`${deptName}-${type}`)
                    })
                    return nextTypes
                })
            } else {
                next.add(deptName)
            }
            return next
        })
    }

    const toggleType = (deptName, typeName) => {
        const key = `${deptName}-${typeName}`
        setExpandedTypes(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    const exportToExcel = () => {
        try {
            const wb = XLSX.utils.book_new()
            const exportData = []

            // Header row
            const headerRow = ['Departament', ...locations, 'Total General']
            exportData.push(headerRow)

            // Department rows
            Object.keys(departmentData).sort((a, b) => a.localeCompare(b)).forEach(deptName => {
                const dept = departmentData[deptName]
                const deptRow = [
                    deptName,
                    ...locations.map(loc => dept.locations[loc] || 0),
                    dept.total
                ]
                exportData.push(deptRow)

                // Type rows (indented)
                Object.keys(dept.types).sort((a, b) => a.localeCompare(b)).forEach(typeName => {
                    const typeData = dept.types[typeName]
                    const typeRow = [
                        `  ${typeName}`,
                        ...locations.map(loc => typeData.locations[loc] || 0),
                        typeData.total
                    ]
                    exportData.push(typeRow)

                    // Location rows (double indented)
                    locations.forEach(locName => {
                        const locAmount = typeData.locations[locName]
                        if (locAmount > 0) {
                            const locRow = [
                                `    → ${locName}`,
                                ...locations.map(col => col === locName ? locAmount : 0),
                                locAmount
                            ]
                            exportData.push(locRow)
                        }
                    })
                })
            })

            // Total row
            const totalRow = [
                'TOTAL GENERAL',
                ...locations.map(loc => totalsRow[loc] || 0),
                totalsRow.total
            ]
            exportData.push(totalRow)

            const ws = XLSX.utils.aoa_to_sheet(exportData)
            XLSX.utils.book_append_sheet(wb, ws, 'Departamente')

            const fileName = `PL_Departamente_${new Date().toISOString().split('T')[0]}.xlsx`
            XLSX.writeFile(wb, fileName)
            toast.success('Export Excel reușit!')
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Eroare la export')
        }
    }

    if (!data) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-20 shadow-sm text-center mt-8">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-bold">Încărcare date departamente...</p>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-20 shadow-sm text-center mt-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <X className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    Nu s-au găsit date pentru departamente
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mt-2">
                    Nu există cheltuieli înregistrate (sau incluse în filtre) pentru perioada selectată.
                </p>
            </div>
        )
    }

    const sortedDepts = Object.keys(departmentData).sort((a, b) => a.localeCompare(b))

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Sumar P&L pe Departamente
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Distribuția costurilor operaționale pe locații (click pentru detalii)
                        </p>
                    </div>
                </div>
                <button
                    onClick={exportToExcel}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-sm font-medium">Export Excel</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-white/90 dark:bg-slate-800/90 z-20 backdrop-blur-md">
                                Departament
                            </th>
                            {locations.map(loc => (
                                <th key={loc} colSpan="3" className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">
                                    {loc}
                                </th>
                            ))}
                            <th colSpan="3" className="px-4 py-3 text-center text-xs font-bold text-orange-500 uppercase tracking-wider border-l-2 border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10">
                                Total General
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {sortedDepts.map((deptName) => {
                            const dept = departmentData[deptName]
                            const isDeptExpanded = expandedDepts.has(deptName)
                            const sortedTypes = Object.keys(dept.types).sort((a, b) => a.localeCompare(b))

                            return (
                                <React.Fragment key={deptName}>
                                    {/* Level 1: Department Row */}
                                    <tr
                                        className="hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                                        onClick={() => toggleDept(deptName)}
                                    >
                                        <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white/90 dark:bg-slate-800/90 z-10 group-hover:bg-white group-hover:dark:bg-slate-700 backdrop-blur-md">
                                            <div className="flex items-center gap-2">
                                                {isDeptExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}
                                                {deptName}
                                            </div>
                                        </td>
                                        {locations.map(locName => (
                                            <td key={`${deptName}-${locName}`} colSpan="3" className="px-4 py-3 text-xs text-center text-orange-500/80 border-l border-slate-100 dark:border-slate-800">
                                                {dept.locations[locName] > 0 ? formatCompactNumber(dept.locations[locName]) : '-'}
                                            </td>
                                        ))}
                                        <td colSpan="3" className="px-4 py-3 text-xs font-black text-center text-orange-600 border-l-2 border-orange-200 dark:border-orange-800 bg-orange-50/10 dark:bg-orange-900/10">
                                            {formatCompactNumber(dept.total)}
                                        </td>
                                    </tr>

                                    {/* Level 2: Expenditure Types (if dept expanded) */}
                                    {isDeptExpanded && sortedTypes.map((typeName) => {
                                        const typeData = dept.types[typeName]
                                        const typeKey = `${deptName}-${typeName}`
                                        const isTypeExpanded = expandedTypes.has(typeKey)

                                        return (
                                            <React.Fragment key={typeKey}>
                                                <tr
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group cursor-pointer bg-slate-50/50 dark:bg-slate-800/30"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleType(deptName, typeName)
                                                    }}
                                                >
                                                    <td className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50/90 dark:bg-slate-800/70 z-10 group-hover:bg-slate-50 group-hover:dark:bg-slate-700/40 backdrop-blur-md">
                                                        <div className="flex items-center gap-2 pl-6">
                                                            {isTypeExpanded ? (
                                                                <ChevronDown className="w-3 h-3 text-slate-400" />
                                                            ) : (
                                                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                                            )}
                                                            <span className="italic">{typeName}</span>
                                                        </div>
                                                    </td>
                                                    {locations.map(locName => (
                                                        <td key={`${typeKey}-${locName}`} colSpan="3" className="px-4 py-2 text-xs text-center font-medium text-slate-600 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                                                            {typeData.locations[locName] > 0 ? formatCompactNumber(typeData.locations[locName]) : '-'}
                                                        </td>
                                                    ))}
                                                    <td colSpan="3" className="px-4 py-2 text-xs font-bold text-center text-slate-700 dark:text-slate-200 border-l-2 border-orange-200 dark:border-orange-800 bg-slate-50/20 dark:bg-slate-800/20">
                                                        {formatCompactNumber(typeData.total)}
                                                    </td>
                                                </tr>

                                                {/* Level 3: Location Breakdown (if type expanded) */}
                                                {isTypeExpanded && locations.map((locName) => {
                                                    const locAmount = typeData.locations[locName]
                                                    if (locAmount <= 0) return null

                                                    return (
                                                        <tr key={`${typeKey}-loc-${locName}`} className="bg-slate-100/50 dark:bg-slate-900/30">
                                                            <td className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-100/90 dark:bg-slate-900/70 z-10 backdrop-blur-md">
                                                                <div className="pl-12">
                                                                    → {locName}
                                                                </div>
                                                            </td>
                                                            {locations.map(colLoc => (
                                                                <td key={`${typeKey}-loc-${locName}-col-${colLoc}`} colSpan="3" className="px-4 py-1.5 text-xs text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800">
                                                                    {colLoc === locName ? formatCompactNumber(locAmount) : '-'}
                                                                </td>
                                                            ))}
                                                            <td colSpan="3" className="px-4 py-1.5 text-xs text-center font-medium text-slate-600 dark:text-slate-400 border-l-2 border-orange-200 dark:border-orange-800">
                                                                {formatCompactNumber(locAmount)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </React.Fragment>
                                        )
                                    })}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900/50 font-black">
                        <tr>
                            <td className="px-4 py-4 text-sm uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Total General</td>
                            {locations.map(locName => (
                                <td key={`${locName}-footer`} colSpan="3" className="px-4 py-4 text-xs text-center text-orange-600 border-l border-slate-200 dark:border-slate-700">
                                    {formatCompactNumber(totalsRow[locName])}
                                </td>
                            ))}
                            <td colSpan="3" className="px-4 py-4 text-sm text-center border-l-2 border-orange-300 dark:border-orange-700 bg-orange-100/50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                                {formatCompactNumber(totalsRow.total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}

export default ExpendituresDepartmentTable
