import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

const ONJNClass2 = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [totalResults, setTotalResults] = useState(null)

  const [filters, setFilters] = useState({
    operator: '',
    county: '',
    city: '',
    status: ''
  })

  const loadData = async (pageNum = page) => {
    setLoading(true)
    setError('')
    try {
      const params = { page: pageNum }
      if (filters.operator) params.operator = filters.operator
      if (filters.county) params.county = filters.county
      if (filters.city) params.city = filters.city
      if (filters.status) params.status = filters.status
      const res = await axios.get('/api/onjn/class2', { params, timeout: 30000 })
      setItems(res.data.items || [])
      setHasNext(!!res.data.hasNext)
      setTotalResults(res.data.totalResults || null)
    } catch (e) {
      setError(e?.message || 'Eroare la încărcare')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFilterSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    loadData(1)
  }

  // Derived filter options from current page items
  const operators = Array.from(new Set(items.map(i => i.operator).filter(Boolean))).sort()
  const counties = Array.from(new Set(items.map(i => (i.address || '').match(/JUDEȚUL\s+([^,]+)/i)?.[1] || '').filter(Boolean))).sort()
  const cities = Array.from(new Set(items.map(i => {
    const addr = i.address || ''
    const parts = addr.split(',').map(s => s.trim())
    return parts.length > 0 ? parts[0] : ''
  }).filter(Boolean))).sort()
  const statuses = Array.from(new Set(items.map(i => i.status).filter(Boolean))).sort()

  // Client-side filtered view
  const displayItems = items.filter(i => {
    const opOk = !filters.operator || i.operator === filters.operator
    const stOk = !filters.status || i.status === filters.status
    const ctOk = !filters.city || (i.address || '').toLowerCase().includes(filters.city.toLowerCase())
    const coOk = !filters.county || (i.address || '').toLowerCase().includes(filters.county.toLowerCase())
    return opOk && stOk && ctOk && coOk
  })

  const StatusBadge = ({ value }) => {
    const v = (value || '').toLowerCase()
    const cls = v.includes('închiriat')
      ? 'bg-amber-100 text-amber-800'
      : v.includes('vândut')
        ? 'bg-slate-200 text-slate-800'
        : v.includes('depozit')
          ? 'bg-blue-100 text-blue-800'
          : 'bg-green-100 text-green-800'
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{value || '-'}</span>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">ONJN — Mijloace de joc: Clasa II</h2>
              <p className="text-slate-600 dark:text-slate-400">Listă sincronizată cu registrul ONJN</p>
            </div>
            <button
              onClick={() => loadData(page)}
              className="btn-secondary flex items-center space-x-2"
              title="Reîncarcă"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reîncarcă</span>
            </button>
          </div>
        </div>

        <div className="card p-6">
          <form onSubmit={onFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select
                  value={filters.operator}
                  onChange={(e) => setFilters(prev => ({ ...prev, operator: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Toți operatorii</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            </div>
            <select
              value={filters.county}
              onChange={(e) => setFilters(prev => ({ ...prev, county: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Toate județele</option>
              {counties.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
            <select
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Toate localitățile</option>
              {cities.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Toate statusurile</option>
              {statuses.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
            <div className="md:col-span-5 flex justify-end">
              <button type="submit" className="btn-primary">Aplică filtre</button>
            </div>
          </form>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Se încarcă...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nu există rezultate</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="text-left p-3">Serie</th>
                    <th className="text-left p-3">Tip</th>
                    <th className="text-left p-3">Adresă</th>
                    <th className="text-left p-3">Operator</th>
                    <th className="text-left p-3">Licență</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((it) => (
                    <tr key={it.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 text-indigo-600 font-semibold cursor-pointer" onClick={() => navigate(`/onjn-class-2/${it.id}`)}>
                        {it.serial}
                      </td>
                      <td className="p-3">{it.type}</td>
                      <td className="p-3">{it.address}</td>
                      <td className="p-3">{it.operator}</td>
                      <td className="p-3">{it.license}</td>
                      <td className="p-3"><StatusBadge value={it.status} /></td>
                      <td className="p-3">{it.transfer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-slate-600 text-sm">
            {totalResults ? `${totalResults} rezultate` : ''}
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadData(p) }}
              className="btn-secondary disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Înapoi
            </button>
            <span className="text-sm text-slate-600">Pagina {page}</span>
            <button
              disabled={!hasNext || loading}
              onClick={() => { const p = page + 1; setPage(p); loadData(p) }}
              className="btn-secondary disabled:opacity-50"
            >
              Înainte
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ONJNClass2


