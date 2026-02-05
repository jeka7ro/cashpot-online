import React, { useMemo } from 'react'
import { Building2 } from 'lucide-react'

const ExpendituresDepartmentTable = ({ data, locations }) => {
    // Aggregate data by Department -> Location
    const { departmentRows, totalsRow } = useMemo(() => {
        const deptMap = {} // { "DeptName": { total: 0, "Location1": 100, "Location2": 50 } }
        const totals = { total: 0 } // { total: 0, "Location1": 0, ... }

        // Init totals
        locations.forEach(loc => totals[loc] = 0)

        data.forEach(item => {
            const dept = item.department_name || 'Nespecificat'
            const loc = item.location_name
            const amount = parseFloat(item.amount) || 0

            if (!deptMap[dept]) {
                deptMap[dept] = { total: 0 }
                locations.forEach(l => deptMap[dept][l] = 0)
            }

            // Add to department
            if (locations.includes(loc)) { // Only if location is in the active headers
                // Note: If location filtering logic in parent changes, 'locations' prop reflects active columns
                deptMap[dept][loc] += amount
            }
            // Add to department total
            deptMap[dept].total += amount

            // Add to grand totals
            // We sum ALL amounts in the filtered dataset, but split by displayed locations
            if (locations.includes(loc)) {
                totals[loc] += amount
            }
            totals.total += amount
        })

        // Convert map to array and sort
        const rows = Object.entries(deptMap).map(([name, values]) => ({
            name,
            ...values
        })).sort((a, b) => a.name.localeCompare(b.name))

        return { departmentRows: rows, totalsRow: totals }
    }, [data, locations])

    const formatCurrency = (val) => {
        if (!val || val === 0) return '-'
        return new Intl.NumberFormat('ro-RO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val)
    }

    if (!data || data.length === 0) return null

    return (
        <div className="mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Building2 className="w-6 h-6 mr-2 text-green-600" />
                    Sumar pe Departamente
                </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-h-[600px] overflow-y-auto font-mono text-sm">
                <table className="w-full border-collapse bg-white dark:bg-slate-800 text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="p-3 border-b border-r border-slate-300 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-300 min-w-[200px] sticky left-0 z-30 bg-slate-100 dark:bg-slate-900">
                                Departament
                            </th>
                            {locations.map(loc => (
                                <th key={loc} className="p-3 border-b border-slate-300 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-300 min-w-[120px] text-right whitespace-nowrap">
                                    {loc}
                                </th>
                            ))}
                            <th className="p-3 border-b border-l border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-white min-w-[120px] text-right bg-blue-50 dark:bg-slate-800/50 sticky right-0 z-20">
                                TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {departmentRows.map((row, idx) => (
                            <tr
                                key={row.name}
                                className={`
                    border-b border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors
                    ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}
                `}
                            >
                                <td className="p-3 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                    {row.name}
                                </td>
                                {locations.map(loc => (
                                    <td key={loc} className="p-3 text-right text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700/50">
                                        {formatCurrency(row[loc])}
                                    </td>
                                ))}
                                <td className="p-3 border-l border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-right bg-blue-50/50 dark:bg-slate-800/50">
                                    {formatCurrency(row.total)}
                                </td>
                            </tr>
                        ))}

                        {/* Totals Row */}
                        <tr className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-20 shadow-lg">
                            <td className="p-3 border-r border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white sticky left-0 z-30 bg-slate-100 dark:bg-slate-900">
                                TOTAL GENERAL
                            </td>
                            {locations.map(loc => (
                                <td key={loc} className="p-3 text-right text-slate-900 dark:text-white border-r border-slate-300 dark:border-slate-600">
                                    {formatCurrency(totalsRow[loc])}
                                </td>
                            ))}
                            <td className="p-3 border-l border-slate-300 dark:border-slate-600 text-right text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-slate-800 z-20">
                                {formatCurrency(totalsRow.total)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ExpendituresDepartmentTable
