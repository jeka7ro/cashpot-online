import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'

const ONJNClass2Operator = () => {
  const { name } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // Load first few pages and filter by operator server-side in the future; for now fetch page 1..3
        const pages = [1, 2, 3]
        const results = await Promise.all(pages.map(p => axios.get('/api/onjn/class2', { params: { page: p }, timeout: 20000 })))
        const all = results.flatMap(r => r.data.items || [])
        const filtered = all.filter(i => (i.operator || '').toLowerCase() === decodeURIComponent(name).toLowerCase())
        setItems(filtered)
      } catch (e) {
        setError(e?.message || 'Eroare la încărcare')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [name])

  const beneficiaries = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      const t = it.transfer || ''
      const m = t.match(/Către:\s*(.+)$/i)
      const key = m ? m[1].trim() : 'N/A'
      map.set(key, (map.get(key) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [items])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/onjn-class-2')} className="btn-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi</span>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{decodeURIComponent(name)}</h2>
              <p className="text-slate-600 dark:text-slate-400">Statistici operator</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-2xl font-bold">{items.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-600">Beneficiari unici</div>
            <div className="text-2xl font-bold">{beneficiaries.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-600">Top beneficiar</div>
            <div className="text-lg font-semibold">{beneficiaries[0]?.[0] || 'N/A'}</div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Beneficiari (din "Transfer")</h3>
          {beneficiaries.length === 0 ? (
            <div className="text-slate-500">Nu există date</div>
          ) : (
            <div className="space-y-2">
              {beneficiaries.map(([b, count]) => (
                <div key={b} className="flex justify-between">
                  <span className="text-slate-800 dark:text-slate-200">{b}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNClass2Operator


