import React, { useMemo } from 'react'
import { Building2, Loader2, X } from 'lucide-react'
import { formatCompactNumber } from '../utils/plUtils'

const ExpendituresDepartmentTable = ({ data, locations }) => {
    // Aggregate data by Department -> Location
    const { departmentRows, totalsRow } = useMemo(() => {
        if (!data || !locations) return { departmentRows: [], totalsRow: {} }

        const deptMap = {}
        const totals = { total: 0 }

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

            if (locations.includes(loc)) {
                deptMap[dept][loc] += amount
                totals[loc] += amount
            }
            deptMap[dept].total += amount
            totals.total += amount
        })

        const rows = Object.entries(deptMap).map(([name, values]) => ({
            name,
            ...values
        })).sort((a, b) => a.name.localeCompare(b.name))

        return { departmentRows: rows, totalsRow: totals }
    }, [data, locations])

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

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Sumar P&L pe Departamente
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Distribuția costurilor operaționale pe locații
                    </p>
                </div>
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
                                Total Rețea
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {departmentRows.map((row) => (
                            <tr key={row.name} className="hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors group">
                                <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white/90 dark:bg-slate-800/90 z-10 group-hover:bg-white group-hover:dark:bg-slate-700 backdrop-blur-md">
                                    {row.name}
                                </td>
                                {locations.map(locName => (
                                    <td key={`${row.name}-${locName}`} colSpan="3" className="px-4 py-3 text-xs text-center text-orange-500/80 border-l border-slate-100 dark:border-slate-800">
                                        {row[locName] > 0 ? formatCompactNumber(row[locName]) : '-'}
                                    </td>
                                ))}
                                <td colSpan="3" className="px-4 py-3 text-xs font-black text-center text-orange-600 border-l-2 border-orange-200 dark:border-orange-800 bg-orange-50/10 dark:bg-orange-900/10">
                                    {formatCompactNumber(row.total)}
                                </td>
                            </tr>
                        ))}
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
