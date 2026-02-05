import React, { useMemo, useRef } from 'react'
import { formatCompactNumber } from '../utils/plUtils'
import { FileText, Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'

const ProfitHeatmap = ({ data, onCellClick }) => {
    const exportRef = useRef(null)

    const handleExportPDF = async () => {
        try {
            toast.loading('📄 Generare PDF...', { id: 'pdf-export-heatmap' })

            if (!exportRef.current) {
                toast.error('Eroare: zona de export nu a fost găsită', { id: 'pdf-export-heatmap' })
                return
            }

            const element = exportRef.current
            const canvas = await html2canvas(element, {
                scale: 3, // Increased scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
                windowWidth: 1600, // Fixed width for consistent capture
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('[ref="exportRef"]') || clonedDoc.body.firstChild
                    if (el) el.style.padding = '40px'
                }
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const imgWidth = pageWidth - 20 // 10mm margins
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)

            const fileName = `Profitabilitate_Sali_${new Date().toISOString().split('T')[0]}.pdf`
            pdf.save(fileName)

            toast.success('✅ PDF exportat cu succes!', { id: 'pdf-export-heatmap' })
        } catch (error) {
            console.error('Error exporting heatmap to PDF:', error)
            toast.error('❌ Eroare la export PDF: ' + error.message, { id: 'pdf-export-heatmap' })
        }
    }

    // Extract unique months across all locations
    const months = useMemo(() => {
        if (!data || data.length === 0) return []
        const monthSet = new Set()
        data.forEach(loc => {
            loc.months?.forEach(m => monthSet.add(JSON.stringify({ month: m.month, label: m.label })))
        })
        return Array.from(monthSet)
            .map(s => JSON.parse(s))
            .sort((a, b) => a.month.localeCompare(b.month))
    }, [data])

    const locations = useMemo(() => {
        if (!data) return []
        return data
            .map(d => d.location)
            .filter(loc => loc && !loc.toLowerCase().includes('depozit'))
            .sort()
    }, [data])

    // Calculate color scale for all profits
    const allProfits = useMemo(() => {
        if (!data) return []
        return data.flatMap(loc =>
            loc.months?.map(m => m.profit) || []
        )
    }, [data])

    const maxProfit = Math.max(...allProfits, 100000)
    const minProfit = Math.min(...allProfits, -50000)

    const getColor = (profit, isTotal = false) => {
        if (profit === 0) return 'rgba(148, 163, 184, 0.1)'

        if (profit > 0) {
            const scaleFactor = isTotal ? Math.max(maxProfit * 1.5, profit) : maxProfit
            const intensity = Math.min(0.9, 0.15 + (profit / scaleFactor) * 0.75)
            return `rgba(16, 185, 129, ${intensity})`
        } else {
            const scaleFactor = isTotal ? Math.max(Math.abs(minProfit) * 1.5, Math.abs(profit)) : Math.abs(minProfit)
            const intensity = Math.min(0.9, 0.15 + (Math.abs(profit) / scaleFactor) * 0.75)
            return `rgba(239, 68, 68, ${intensity})`
        }
    }

    if (!data || data.length === 0) return null

    // Grid configuration: 1.5fr for Label, 1fr for each Month, 1.2fr for Total
    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `minmax(120px, 1.5fr) repeat(${months.length}, minmax(0, 1fr)) minmax(70px, 1.2fr)`,
        gap: '4px'
    }

    return (
        <div ref={exportRef} className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-4 md:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                        Grafic Profitabilitate
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold opacity-70 uppercase tracking-wider">Distribuție lunară per punct de lucru</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/40 px-4 py-2 rounded-2xl border border-white/20">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 tracking-widest">Legendă Profit Net</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-red-500">PIERDERE</span>
                                <div className="w-24 md:w-32 h-2 rounded-full bg-gradient-to-r from-red-500 via-slate-200 dark:via-slate-700 to-emerald-500 shadow-inner" />
                                <span className="text-[9px] font-black text-emerald-500">PROFIT</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleExportPDF}
                        data-html2canvas-ignore
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                        title="Descarcă PDF"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Export PDF</span>
                    </button>
                </div>
            </div>

            <div className="w-full">
                {/* Header row */}
                <div style={gridStyle} className="mb-3 px-1">
                    <div className="flex items-end pb-1 pr-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sală / Lună</span>
                    </div>
                    {months.map(m => (
                        <div key={m.month} className="text-center group overflow-hidden">
                            <div className="bg-slate-100/40 dark:bg-slate-900/20 rounded-lg py-1.5 px-0.5 border border-slate-200/30 dark:border-slate-700/30">
                                <span className="text-[10px] md:text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-tight leading-none block truncate">
                                    {m.label.split(' ')[0]}
                                </span>
                                <span className="text-[8px] md:text-[9px] font-bold text-slate-500/80 dark:text-slate-400/80 block leading-none mt-0.5">
                                    {m.label.split(' ')[1]}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="text-center group overflow-hidden">
                        <div className="bg-indigo-50/40 dark:bg-indigo-900/20 rounded-lg py-1.5 px-0.5 border border-indigo-500/10 dark:border-indigo-400/10">
                            <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none block">
                                TOTAL
                            </span>
                        </div>
                    </div>
                </div>

                {/* Data rows */}
                <div className="space-y-1 px-1">
                    {locations.map(locName => {
                        const locEntry = data.find(d => d.location === locName)
                        const locTotalProfit = locEntry?.months?.reduce((sum, m) => sum + (m.profit || 0), 0) || 0
                        const locTotalGgr = locEntry?.months?.reduce((sum, m) => sum + (m.ggr || 0), 0) || 0
                        const locTotalExp = locEntry?.months?.reduce((sum, m) => sum + (m.expenses || 0), 0) || 0
                        const locAvgMargin = locTotalGgr > 0 ? (locTotalProfit / locTotalGgr) * 100 : 0

                        return (
                            <div key={locName} style={gridStyle} className="group/row items-stretch">
                                {/* Location Label */}
                                <div className="flex items-center pr-2 group-hover/row:translate-x-1 transition-transform">
                                    <span className="text-[11px] md:text-[12px] font-black text-slate-800 dark:text-slate-200 truncate block uppercase tracking-tight">
                                        {locName}
                                    </span>
                                </div>

                                {/* Monthly Cells */}
                                {months.map(mInfo => {
                                    const mData = locEntry?.months?.find(m => m.month === mInfo.month)
                                    const profit = mData?.profit || 0
                                    const profitMargin = mData?.profitMargin || 0

                                    return (
                                        <div
                                            key={mInfo.month}
                                            className="h-12 md:h-14 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-xl group/cell relative border border-white/5 dark:border-white/5 shadow-sm"
                                            style={{ backgroundColor: getColor(profit) }}
                                            onClick={() => onCellClick?.(locName, mInfo.month, mData)}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-3 bg-slate-900/95 backdrop-blur-xl text-white text-[10px] rounded-2xl opacity-0 group-hover/cell:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/20">
                                                <div className="font-black text-sm mb-1 text-emerald-400">{locName}</div>
                                                <div className="text-slate-400 font-bold mb-2 pb-1 border-b border-white/10">{mInfo.label}</div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between gap-6">
                                                        <span className="text-slate-400 font-medium">GGR:</span>
                                                        <span className="font-black">{formatCompactNumber(mData?.ggr || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-6">
                                                        <span className="text-slate-400 font-medium">Cheltuieli:</span>
                                                        <span className="font-black text-orange-400">-{formatCompactNumber(mData?.expenses || 0)}</span>
                                                    </div>
                                                    <div className="h-px bg-white/10 my-1" />
                                                    <div className="flex justify-between gap-6">
                                                        <span className="text-slate-400 font-medium">Profit Net:</span>
                                                        <span className={`font-black ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {formatCompactNumber(profit)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-6">
                                                        <span className="text-slate-400 font-medium">Marjă:</span>
                                                        <span className="font-black">{profitMargin.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-slate-900/95" />
                                            </div>

                                            <div className="w-full h-full flex flex-col items-center justify-center p-1">
                                                <span className={`text-[9px] md:text-[10px] font-black leading-tight ${profit >= 0 ? 'text-emerald-950 dark:text-emerald-50' : 'text-red-950 dark:text-red-50'}`}>
                                                    {formatCompactNumber(profit)}
                                                </span>
                                                <span className="text-[7px] md:text-[8px] font-bold opacity-60 dark:opacity-50 mt-0.5">
                                                    {profitMargin.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Total Cell */}
                                <div
                                    className="h-12 md:h-14 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-xl group/total relative border-2 border-indigo-500/20 dark:border-indigo-400/20 shadow-lg"
                                    style={{ backgroundColor: getColor(locTotalProfit, true) }}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-3 bg-indigo-950/95 backdrop-blur-xl text-white text-[10px] rounded-2xl opacity-0 group-hover/total:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-indigo-400/30">
                                        <div className="font-black text-sm mb-1 text-indigo-300">{locName} (Total)</div>
                                        <div className="text-indigo-200/60 font-bold mb-2 pb-1 border-b border-indigo-500/30 text-[8px] uppercase tracking-widest">Toată Perioada</div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between gap-6">
                                                <span className="text-indigo-200/60 font-medium">GGR Total:</span>
                                                <span className="font-black">{formatCompactNumber(locTotalGgr)}</span>
                                            </div>
                                            <div className="flex justify-between gap-6">
                                                <span className="text-indigo-200/60 font-medium">Chelt. Total:</span>
                                                <span className="font-black text-orange-400">-{formatCompactNumber(locTotalExp)}</span>
                                            </div>
                                            <div className="h-px bg-white/10 my-1" />
                                            <div className="flex justify-between gap-6">
                                                <span className="text-indigo-200/60 font-medium">Profit Net:</span>
                                                <span className={`font-black ${locTotalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {formatCompactNumber(locTotalProfit)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-6">
                                                <span className="text-indigo-200/60 font-medium">Marjă:</span>
                                                <span className="font-black">{locAvgMargin.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-indigo-950/95" />
                                    </div>

                                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                                        <span className={`text-[10px] md:text-[11px] font-black leading-tight ${locTotalProfit >= 0 ? 'text-emerald-950 dark:text-emerald-50' : 'text-red-950 dark:text-red-50'}`}>
                                            {formatCompactNumber(locTotalProfit)}
                                        </span>
                                        <span className="text-[8px] font-bold text-indigo-900/60 dark:text-indigo-200/60 mt-0.5">
                                            {locAvgMargin.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default ProfitHeatmap
