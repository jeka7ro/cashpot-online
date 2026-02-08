import React from 'react'
import { formatCompactNumber } from '../utils/plUtils'
import { FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

const PLTable = ({ months, locations }) => {
    if (!months || months.length === 0) return null

    const exportToExcel = () => {
        try {
            // First header row: Main Categories
            const header1 = ['Lună']
            locations.forEach(loc => {
                header1.push(loc, '', '')
            })
            header1.push('Total Rețea', '', '')

            // Second header row: Sub-metrics
            const header2 = ['']
            locations.forEach(() => {
                header2.push('GGR', 'Chelt', 'Profit')
            })
            header2.push('GGR', 'Chelt', 'Profit')

            // Data rows
            const dataRows = months.map(m => {
                const row = [m.label]
                let monthTotalGgr = 0
                let monthTotalExp = 0
                let monthTotalPl = 0

                locations.forEach(locName => {
                    const locData = m.locations[locName]
                    const ggr = locData?.ggr || 0
                    const exp = locData?.expenses || 0
                    const profit = locData?.profit || 0

                    monthTotalGgr += ggr
                    monthTotalExp += exp
                    monthTotalPl += profit

                    row.push(ggr, exp, profit)
                })

                row.push(monthTotalGgr, monthTotalExp, monthTotalPl)
                return row
            })

            // Total footer row
            const footerRow = ['Total Perioadă']
            locations.forEach(locName => {
                const totalGgr = months.reduce((sum, m) => sum + (m.locations[locName]?.ggr || 0), 0)
                const totalExp = months.reduce((sum, m) => sum + (m.locations[locName]?.expenses || 0), 0)
                const totalPl = totalGgr - totalExp
                footerRow.push(totalGgr, totalExp, totalPl)
            })

            const grandGgr = months.reduce((s, m) => s + Object.values(m.locations).reduce((ss, l) => ss + (l.ggr || 0), 0), 0)
            const grandExp = months.reduce((s, m) => s + Object.values(m.locations).reduce((ss, l) => ss + (l.expenses || 0), 0), 0)
            const grandPl = grandGgr - grandExp
            footerRow.push(grandGgr, grandExp, grandPl)

            const aoa = [header1, header2, ...dataRows, footerRow]
            const ws = XLSX.utils.aoa_to_sheet(aoa)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'P&L Detaliat')

            XLSX.writeFile(wb, `PL_Detaliat_${new Date().toISOString().split('T')[0]}.xlsx`)
        } catch (error) {
            console.error('Error exporting P&L Table to Excel:', error)
        }
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Tabel detaliat P&L
                </h3>
                <button
                    onClick={exportToExcel}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-white/90 dark:bg-slate-800/90 z-20 backdrop-blur-md">
                                Lună
                            </th>
                            {locations.map(loc => (
                                <th key={loc} colSpan="3" className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-l border-slate-200 dark:border-slate-700">
                                    {loc}
                                </th>
                            ))}
                            <th colSpan="3" className="px-4 py-3 text-center text-xs font-bold text-indigo-500 uppercase tracking-wider border-l-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10">
                                Total Rețea
                            </th>
                        </tr>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                            <th className="sticky left-0 bg-white/90 dark:bg-slate-800/90 z-20" />
                            {locations.map(loc => (
                                <React.Fragment key={`${loc}-sub`}>
                                    <th className="px-2 py-2 text-[10px] font-bold text-slate-400 text-right border-l border-slate-200 dark:border-slate-700">GGR</th>
                                    <th className="px-2 py-2 text-[10px] font-bold text-slate-400 text-right">Chelt</th>
                                    <th className="px-2 py-2 text-[10px] font-bold text-slate-400 text-right">Profit</th>
                                </React.Fragment>
                            ))}
                            <th className="px-2 py-2 text-[10px] font-bold text-indigo-400 text-right border-l-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10">GGR</th>
                            <th className="px-2 py-2 text-[10px] font-bold text-indigo-400 text-right bg-indigo-50/30 dark:bg-indigo-900/10">Chelt</th>
                            <th className="px-2 py-2 text-[10px] font-bold text-indigo-400 text-right bg-indigo-50/30 dark:bg-indigo-900/10">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {months.map(m => {
                            let monthTotalGgr = 0
                            let monthTotalExp = 0
                            let monthTotalPl = 0

                            return (
                                <tr key={m.month} className="hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors group">
                                    <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white/90 dark:bg-slate-800/90 z-10 group-hover:bg-white group-hover:dark:bg-slate-700 backdrop-blur-md">
                                        {m.label}
                                    </td>
                                    {locations.map(locName => {
                                        const locData = m.locations[locName]
                                        const ggr = locData?.ggr || 0
                                        const exp = locData?.expenses || 0
                                        const profit = locData?.profit || 0

                                        monthTotalGgr += ggr
                                        monthTotalExp += exp
                                        monthTotalPl += profit

                                        return (
                                            <React.Fragment key={`${m.month}-${locName}`}>
                                                <td className="px-2 py-3 text-xs text-right text-slate-600 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800">
                                                    {formatCompactNumber(ggr)}
                                                </td>
                                                <td className="px-2 py-3 text-xs text-right text-orange-500/80">
                                                    {formatCompactNumber(exp)}
                                                </td>
                                                <td className={`px-2 py-3 text-xs font-bold text-right ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {formatCompactNumber(profit)}
                                                </td>
                                            </React.Fragment>
                                        )
                                    })}
                                    {/* Month Total (Network) */}
                                    <td className="px-2 py-3 text-xs font-black text-right text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10">
                                        {formatCompactNumber(monthTotalGgr)}
                                    </td>
                                    <td className="px-2 py-3 text-xs font-black text-right text-orange-600 bg-indigo-50/30 dark:bg-indigo-900/10">
                                        {formatCompactNumber(monthTotalExp)}
                                    </td>
                                    <td className={`px-2 py-3 text-sm font-black text-right border-r border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 ${monthTotalPl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCompactNumber(monthTotalPl)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900/50 font-black">
                        <tr>
                            <td className="px-4 py-4 text-sm uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Total Perioadă</td>
                            {locations.map(locName => {
                                const totalGgr = months.reduce((sum, m) => sum + (m.locations[locName]?.ggr || 0), 0)
                                const totalExp = months.reduce((sum, m) => sum + (m.locations[locName]?.expenses || 0), 0)
                                const totalPl = totalGgr - totalExp

                                return (
                                    <React.Fragment key={`${locName}-footer`}>
                                        <td className="px-2 py-4 text-xs text-right border-l border-slate-200 dark:border-slate-700">{formatCompactNumber(totalGgr)}</td>
                                        <td className="px-2 py-4 text-xs text-right text-orange-600">{formatCompactNumber(totalExp)}</td>
                                        <td className={`px-2 py-4 text-sm text-right ${totalPl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCompactNumber(totalPl)}</td>
                                    </React.Fragment>
                                )
                            })}
                            {/* Grand Total Footer (Network + All Months) */}
                            {(() => {
                                const grandGgr = months.reduce((s, m) => s + Object.values(m.locations).reduce((ss, l) => ss + (l.ggr || 0), 0), 0)
                                const grandExp = months.reduce((s, m) => s + Object.values(m.locations).reduce((ss, l) => ss + (l.expenses || 0), 0), 0)
                                const grandPl = grandGgr - grandExp
                                return (
                                    <>
                                        <td className="px-2 py-4 text-xs text-right border-l-2 border-indigo-300 dark:border-indigo-700 bg-indigo-100/50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">{formatCompactNumber(grandGgr)}</td>
                                        <td className="px-2 py-4 text-xs text-right bg-indigo-100/50 dark:bg-indigo-900/40 text-orange-700 dark:text-orange-400">{formatCompactNumber(grandExp)}</td>
                                        <td className={`px-2 py-4 text-base text-right bg-indigo-200/50 dark:bg-indigo-900/60 ${grandPl >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-400'}`}>{formatCompactNumber(grandPl)}</td>
                                    </>
                                )
                            })()}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}

export default PLTable

