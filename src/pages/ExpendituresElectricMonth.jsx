import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useTheme } from '../contexts/ThemeContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Building2, AlertTriangle, CheckCircle, Brain, FileText, Download, Eye } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const ExpendituresElectricMonth = () => {
  const { monthKey } = useParams() // format: 2024-07
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([]) // Facturile cu info despre PDF
  const [loadingPdf, setLoadingPdf] = useState(null) // ID-ul facturii care se încarcă

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

  // Parse monthKey
  const [year, month] = monthKey ? monthKey.split('-').map(Number) : [2024, 1]
  const monthName = monthNames[month - 1] || 'N/A'

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Încarcă datele NLC
        const response = await axios.get('/api/expenditures/electric-nlc-centralizer')
        if (response.data?.success) {
          setRawData(response.data.rawData || response.data.data || [])
        }
        
        // Încarcă lista de facturi pentru această lună (cu info despre PDF)
        if (monthKey) {
          const invoicesResponse = await axios.get(`/api/expenditures/electric-invoices-by-month/${monthKey}`)
          if (invoicesResponse.data?.success) {
            setInvoices(invoicesResponse.data.invoices || [])
          }
        }
      } catch (error) {
        console.error('Eroare:', error)
        toast.error('Eroare la încărcare')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [monthKey])

  // Funcție pentru vizualizarea/descărcarea PDF-ului
  const handleViewPdf = async (invoiceNumber) => {
    setLoadingPdf(invoiceNumber)
    try {
      const response = await axios.get(`/api/expenditures/electric-invoice-pdf/${encodeURIComponent(invoiceNumber)}`)
      if (response.data?.success && response.data.pdfData) {
        // Deschide PDF-ul într-o fereastră nouă
        const pdfWindow = window.open('')
        pdfWindow.document.write(`
          <html>
            <head><title>Factura ${invoiceNumber}</title></head>
            <body style="margin:0;padding:0;">
              <iframe src="${response.data.pdfData}" style="width:100vw;height:100vh;border:none;"></iframe>
            </body>
          </html>
        `)
      } else {
        toast.error('PDF-ul nu a fost găsit')
      }
    } catch (error) {
      console.error('Error loading PDF:', error)
      toast.error('Eroare la încărcarea PDF-ului')
    } finally {
      setLoadingPdf(null)
    }
  }

  // Funcție pentru descărcarea PDF-ului
  const handleDownloadPdf = async (invoiceNumber, filename) => {
    setLoadingPdf(invoiceNumber)
    try {
      const response = await axios.get(`/api/expenditures/electric-invoice-pdf/${encodeURIComponent(invoiceNumber)}`)
      if (response.data?.success && response.data.pdfData) {
        // Creează link de descărcare
        const link = document.createElement('a')
        link.href = response.data.pdfData
        link.download = filename || `Factura_${invoiceNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('PDF descărcat!')
      } else {
        toast.error('PDF-ul nu a fost găsit')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Eroare la descărcarea PDF-ului')
    } finally {
      setLoadingPdf(null)
    }
  }

  // Filter data for this month only
  const monthData = useMemo(() => {
    return rawData.filter(item => {
      if (!item.perioada_facturare) return false
      const match = item.perioada_facturare.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (!match) return false
      const itemMonth = parseInt(match[2])
      const itemYear = parseInt(match[3])
      return itemMonth === month && itemYear === year
    })
  }, [rawData, month, year])

  // Group by location
  const byLocation = useMemo(() => {
    const grouped = {}
    monthData.forEach(item => {
      const loc = item.location_name || 'N/A'
      if (!grouped[loc]) {
        grouped[loc] = { ron: 0, kwh: 0, nlcs: [] }
      }
      grouped[loc].ron += parseFloat(item.total_suma || item.suma_totala || 0)
      grouped[loc].kwh += parseFloat(item.total_consum || item.consum_kwh || 0)
      grouped[loc].nlcs.push(item)
    })
    return grouped
  }, [monthData])

  // Totals
  const totals = useMemo(() => {
    let ron = 0, kwh = 0
    Object.values(byLocation).forEach(loc => {
      ron += loc.ron
      kwh += loc.kwh
    })
    return { ron, kwh, avgPrice: kwh > 0 ? ron / kwh : 0 }
  }, [byLocation])

  // Chart data - Pie by location
  const pieData = useMemo(() => {
    return Object.entries(byLocation).map(([name, data]) => ({
      name,
      value: Math.round(data.ron),
      kwh: Math.round(data.kwh)
    })).sort((a, b) => b.value - a.value)
  }, [byLocation])

  // Chart data - Bar comparison
  const barData = useMemo(() => {
    return Object.entries(byLocation).map(([name, data]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
      fullName: name,
      cost: Math.round(data.ron),
      consum: Math.round(data.kwh),
      pret: data.kwh > 0 ? (data.ron / data.kwh).toFixed(4) : 0
    })).sort((a, b) => b.cost - a.cost)
  }, [byLocation])

  // AI Analysis
  const aiAnalysis = useMemo(() => {
    if (Object.keys(byLocation).length === 0) return null

    const insights = []
    const locations = Object.entries(byLocation)
    
    // Find max consumer
    const maxConsumer = locations.reduce((max, [name, data]) => 
      data.kwh > (max.kwh || 0) ? { name, ...data } : max, { kwh: 0 })
    
    // Find min consumer
    const minConsumer = locations.reduce((min, [name, data]) => 
      data.kwh < (min.kwh || Infinity) ? { name, ...data } : min, { kwh: Infinity })

    // Find highest price per kWh
    const pricesPerKwh = locations.map(([name, data]) => ({
      name,
      price: data.kwh > 0 ? data.ron / data.kwh : 0
    })).filter(p => p.price > 0)
    
    const maxPrice = pricesPerKwh.reduce((max, p) => p.price > max.price ? p : max, { price: 0 })
    const minPrice = pricesPerKwh.reduce((min, p) => p.price < min.price ? p : min, { price: Infinity })

    // Insights
    if (maxConsumer.name) {
      const percent = totals.kwh > 0 ? ((maxConsumer.kwh / totals.kwh) * 100).toFixed(1) : 0
      insights.push({
        type: 'warning',
        icon: Zap,
        title: 'Cel mai mare consumator',
        text: `${maxConsumer.name} consumă ${maxConsumer.kwh.toLocaleString('ro-RO')} kWh (${percent}% din total)`,
        value: `${maxConsumer.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei`
      })
    }

    if (minConsumer.name && minConsumer.kwh < Infinity) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Cel mai mic consumator',
        text: `${minConsumer.name} - ${minConsumer.kwh.toLocaleString('ro-RO')} kWh`,
        value: `${minConsumer.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei`
      })
    }

    if (maxPrice.name && maxPrice.price > 0) {
      insights.push({
        type: maxPrice.price > totals.avgPrice * 1.1 ? 'danger' : 'info',
        icon: TrendingUp,
        title: 'Preț maxim per kWh',
        text: `${maxPrice.name} plătește cel mai mult per kWh`,
        value: `${maxPrice.price.toFixed(4)} lei/kWh`
      })
    }

    if (minPrice.name && minPrice.price < Infinity) {
      insights.push({
        type: 'success',
        icon: TrendingDown,
        title: 'Preț minim per kWh',
        text: `${minPrice.name} are cel mai bun preț`,
        value: `${minPrice.price.toFixed(4)} lei/kWh`
      })
    }

    // Cost distribution analysis
    const topConsumers = locations.filter(([_, data]) => data.ron > totals.ron * 0.2)
    if (topConsumers.length > 0 && topConsumers.length < locations.length) {
      insights.push({
        type: 'info',
        icon: Building2,
        title: 'Distribuție costuri',
        text: `${topConsumers.length} locații reprezintă peste 20% fiecare din costurile totale`,
        value: `${topConsumers.map(([n]) => n).join(', ')}`
      })
    }

    // Efficiency recommendation
    const avgPricePerKwh = totals.avgPrice
    const inefficient = pricesPerKwh.filter(p => p.price > avgPricePerKwh * 1.05)
    if (inefficient.length > 0) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Recomandare eficiență',
        text: `${inefficient.length} locații plătesc peste media de ${avgPricePerKwh.toFixed(4)} lei/kWh`,
        value: inefficient.map(p => p.name).join(', ')
      })
    }

    return insights
  }, [byLocation, totals])

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/expenditures/electric')}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {monthName} {year}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Detalii consum și costuri energie electrică
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-2xl shadow-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cost</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {totals.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-500">lei</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg border border-blue-200 dark:border-blue-800">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Consum</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {totals.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-slate-500">kWh</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-800">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Preț Mediu</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {totals.avgPrice.toFixed(4)}
            </p>
            <p className="text-sm text-slate-500">lei/kWh</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-lg border border-purple-200 dark:border-purple-800">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Locații</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              {Object.keys(byLocation).length}
            </p>
            <p className="text-sm text-slate-500">active</p>
          </div>
        </div>

        {/* Facturi / PDF-uri */}
        {invoices.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Facturi ({invoices.length})</h2>
            </div>
            <div className="space-y-3">
              {invoices.map((invoice, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {invoice.numar_factura}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {invoice.furnizor || 'Furnizor necunoscut'} • {invoice.perioada_facturare}
                    </p>
                  </div>
                  {invoice.has_pdf ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewPdf(invoice.numar_factura)}
                        disabled={loadingPdf === invoice.numar_factura}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {loadingPdf === invoice.numar_factura ? 'Se încarcă...' : 'Vizualizează'}
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(invoice.numar_factura, invoice.pdf_filename)}
                        disabled={loadingPdf === invoice.numar_factura}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descarcă
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500 italic">
                      PDF neatașat
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        {aiAnalysis && aiAnalysis.length > 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Analiză AI</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiAnalysis.map((insight, idx) => {
                const IconComponent = insight.icon
                const bgColors = {
                  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
                  danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }
                const iconColors = {
                  success: 'text-green-600 dark:text-green-400',
                  warning: 'text-amber-600 dark:text-amber-400',
                  danger: 'text-red-600 dark:text-red-400',
                  info: 'text-blue-600 dark:text-blue-400'
                }
                return (
                  <div key={idx} className={`p-4 rounded-xl border ${bgColors[insight.type]}`}>
                    <div className="flex items-start gap-3">
                      <IconComponent className={`w-5 h-5 mt-0.5 ${iconColors[insight.type]}`} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                          {insight.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                          {insight.text}
                        </p>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-2">
                          {insight.value}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart - Cost Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              Distribuție Costuri per Locație
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value.toLocaleString('ro-RO')} lei (${props.payload.kwh.toLocaleString('ro-RO')} kWh)`,
                      props.payload.name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart - Comparison */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              Comparație Cost vs Consum
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'cost' ? `${value.toLocaleString('ro-RO')} lei` : `${value.toLocaleString('ro-RO')} kWh`,
                      name === 'cost' ? 'Cost' : 'Consum'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="cost" fill="#10b981" name="Cost (lei)" />
                  <Bar dataKey="consum" fill="#3b82f6" name="Consum (kWh)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Detalii per Locație
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Locație</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Cost (lei)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Consum (kWh)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Preț/kWh</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">% din Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">NLC-uri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {Object.entries(byLocation)
                  .sort((a, b) => b[1].ron - a[1].ron)
                  .map(([loc, data]) => {
                    const pricePerKwh = data.kwh > 0 ? data.ron / data.kwh : 0
                    const percentOfTotal = totals.ron > 0 ? (data.ron / totals.ron) * 100 : 0
                    return (
                      <tr key={loc} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{loc}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {data.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                          {data.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                          {pricePerKwh.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-emerald-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                              {percentOfTotal.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-600 dark:text-slate-400">
                            {data.nlcs.length}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-900 font-bold">
                <tr>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">TOTAL</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {totals.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                    {totals.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {totals.avgPrice.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">100%</td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {monthData.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ExpendituresElectricMonth

