import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'

const ONJNClass2Detail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`/api/onjn/class2/${id}`, { timeout: 30000 })
        setData(res.data)
      } catch (e) {
        setError(e?.message || 'Eroare la încărcare')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/onjn/class-2')} className="btn-secondary flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi</span>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Detalii mijloc de joc</h2>
              <p className="text-slate-600 dark:text-slate-400">ID: {id}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          {loading ? (
            <div className="text-center text-slate-500">Se încarcă...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : !data ? (
            <div className="text-center text-slate-500">Nu există date</div>
          ) : (
            <div className="space-y-4">
              {data.title && (
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{data.title}</h3>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <tbody>
                    {Object.entries(data.details || {}).map(([k, v]) => (
                      <tr key={k} className="border-b">
                        <td className="p-3 w-1/3 text-slate-600 dark:text-slate-400 font-medium">{k}</td>
                        <td className="p-3">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.source && (
                <div className="text-sm text-slate-500">Sursă: <a href={data.source} target="_blank" rel="noreferrer" className="text-indigo-600 underline">ONJN</a></div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ONJNClass2Detail




