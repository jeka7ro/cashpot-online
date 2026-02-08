import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

const ExpenseCategoryChart = ({ data }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Aggregate by department
        const deptMap = {}
        data.forEach(item => {
            const dept = item.department_name || 'Nespecificat'
            const amount = parseFloat(item.amount) || 0
            deptMap[dept] = (deptMap[dept] || 0) + amount
        })

        // Convert to array and sort
        const sorted = Object.entries(deptMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // Top 5 + Others
        const top5 = sorted.slice(0, 5)
        const others = sorted.slice(5).reduce((sum, item) => sum + item.value, 0)

        if (others > 0) {
            top5.push({ name: 'Altele', value: others })
        }

        return top5
    }, [data])

    const total = chartData.reduce((sum, item) => sum + item.value, 0)

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const percent = ((payload[0].value / total) * 100).toFixed(1)
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white">{payload[0].name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {payload[0].value.toLocaleString('ro-RO')} RON
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{percent}%</p>
                </div>
            )
        }
        return null
    }

    if (chartData.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Distribuție Cheltuieli pe Categorii
                    </h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nu există date disponibile</p>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Distribuție Cheltuieli pe Categorii
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Top 5 departamente cu cele mai mari cheltuieli
                    </p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

export default ExpenseCategoryChart
