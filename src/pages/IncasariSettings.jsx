import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Settings,
  ArrowLeft,
  GripVertical,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  MapPin,
  Database,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const LOCAL_VISIBLE_KEY = 'incasari_visible_columns'
const LOCAL_ORDER_KEY = 'incasari_columns_order'
const LOCAL_LABELS_KEY = 'incasari_column_labels'

const IncasariSettings = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [columns, setColumns] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [locations, setLocations] = useState([])
  const [visibleLocations, setVisibleLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_visible_locations')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_VISIBLE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ORDER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [columnLabels, setColumnLabels] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_LABELS_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (!user) return

    const loadColumns = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/incasari/cyber-preview?limit=1')
        if (response.data?.success) {
          const cols = response.data.columns || []
          setColumns(cols)

          // Dacă nu avem ordinea salvată, folosim ordinea din backend
          if (!columnOrder || columnOrder.length === 0) {
            const initialOrder = cols.map((c) => c.name)
            setColumnOrder(initialOrder)
            try {
              localStorage.setItem(LOCAL_ORDER_KEY, JSON.stringify(initialOrder))
            } catch {
              // ignore
            }
          }

          // Dacă nu avem vizibilitatea salvată, facem toate coloanele vizibile
          if (!visibleColumns || visibleColumns.length === 0) {
            const all = cols.map((c) => c.name)
            setVisibleColumns(all)
            try {
              localStorage.setItem(LOCAL_VISIBLE_KEY, JSON.stringify(all))
            } catch {
              // ignore
            }
          }
        } else {
          toast.error(response.data?.error || 'Nu am putut încărca coloanele pentru Încasări')
        }
      } catch (error) {
        console.error('Error loading incasari columns:', error)
        toast.error(error.response?.data?.error || error.message || 'Eroare la încărcarea coloanelor')
      } finally {
        setLoading(false)
      }
    }

    loadColumns()

    // Load locations
    const loadLocations = async () => {
      try {
        const response = await axios.get('/api/incasari/filters-metadata')
        if (response.data?.success) {
          setLocations(response.data.locations || [])
          // If no saved visible locations, show all by default
          if (visibleLocations.length === 0) {
            setVisibleLocations(response.data.locations || [])
            try {
              localStorage.setItem('incasari_visible_locations', JSON.stringify(response.data.locations || []))
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }
    loadLocations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleSync = async (forceCurrentMonth = false) => {
    try {
      setSyncing(true)
      
      // Verifică mai întâi dacă există deja o sincronizare în curs
      try {
        const statusResp = await axios.get('/api/incasari/sync-status')
        if (statusResp.data?.running) {
          toast.info('Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.')
          setSyncing(false)
          return
        }
      } catch (statusError) {
        // Ignoră eroarea de status, continuă cu sync-ul
        console.log('Nu s-a putut verifica statusul sincronizării, continuăm...')
      }
      
      const response = await axios.post('/api/incasari/sync', {
        forceCurrentMonth: forceCurrentMonth
      })
      if (response.data?.success) {
        toast.success(response.data.message || 'Sincronizare începută cu succes')
      } else {
        toast.error(response.data?.error || 'Eroare la pornirea sincronizării')
      }
    } catch (error) {
      console.error('Error syncing incasari:', error)
      // Dacă eroarea este 400 (sincronizare deja în curs), afișează mesaj informativ
      if (error.response?.status === 400) {
        toast.info(error.response?.data?.error || 'Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.')
      } else {
        toast.error(error.response?.data?.error || error.message || 'Eroare la sincronizare')
      }
    } finally {
      setSyncing(false)
    }
  }

  const toggleLocation = (location) => {
    setVisibleLocations((prev) => {
      const next = prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
      try {
        localStorage.setItem('incasari_visible_locations', JSON.stringify(next))
      } catch {
        // ignore
      }
      // Notificăm restul paginilor (Încasări, Tabel Cyber) că s-a schimbat lista de locații vizibile
      window.dispatchEvent(new Event('incasari-visible-locations-changed'))
      return next
    })
  }

  const orderedColumns = React.useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) return columns
    const byName = new Map(columns.map((c) => [c.name, c]))
    const ordered = columnOrder
      .map((name) => byName.get(name))
      .filter(Boolean)
    // include any new columns not yet in order
    columns.forEach((c) => {
      if (!ordered.find((x) => x.name === c.name)) {
        ordered.push(c)
      }
    })
    return ordered
  }, [columns, columnOrder])

  const toggleVisible = (name) => {
    setVisibleColumns((prev) => {
      const current = prev && prev.length > 0 ? prev : columns.map((c) => c.name)
      const exists = current.includes(name)
      const next = exists ? current.filter((c) => c !== name) : [...current, name]
      try {
        localStorage.setItem(LOCAL_VISIBLE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const setAll = (mode) => {
    if (mode === 'all') {
      const all = columns.map((c) => c.name)
      setVisibleColumns(all)
      try {
        localStorage.setItem(LOCAL_VISIBLE_KEY, JSON.stringify(all))
      } catch {
        // ignore
      }
    } else {
      setVisibleColumns([])
      try {
        localStorage.setItem(LOCAL_VISIBLE_KEY, JSON.stringify([]))
      } catch {
        // ignore
      }
    }
  }

  const moveColumn = (name, direction) => {
    setColumnOrder((prev) => {
      const current = prev && prev.length > 0 ? [...prev] : columns.map((c) => c.name)
      const index = current.indexOf(name)
      if (index === -1) return current
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= current.length) return current
      const tmp = current[index]
      current[index] = current[newIndex]
      current[newIndex] = tmp
      try {
        localStorage.setItem(LOCAL_ORDER_KEY, JSON.stringify(current))
      } catch {
        // ignore
      }
      // Notifică Tabelul Cyber că setările s-au schimbat
      window.dispatchEvent(new Event('incasari-columns-changed'))
      toast.success('Ordinea coloanelor salvată', { id: 'incasari-order' })
      return current
    })
  }

  // Permite setarea directă a poziției (coloana „Ordine” editabilă)
  const setColumnPosition = (name, newPosition) => {
    setColumnOrder((prev) => {
      const current = prev && prev.length > 0 ? [...prev] : columns.map((c) => c.name)
      const index = current.indexOf(name)
      if (index === -1) return current

      const total = current.length
      let pos = parseInt(newPosition, 10)
      if (Number.isNaN(pos)) return current
      pos = Math.min(Math.max(pos, 1), total) - 1 // convert to 0-based

      if (pos === index) return current

      const [removed] = current.splice(index, 1)
      current.splice(pos, 0, removed)

      try {
        localStorage.setItem(LOCAL_ORDER_KEY, JSON.stringify(current))
      } catch {
        // ignore
      }

      window.dispatchEvent(new Event('incasari-columns-changed'))
      toast.success('Ordinea coloanelor actualizată', { id: 'incasari-order' })
      return current
    })
  }

  // Etichetă afişată în Tabel Cyber (denumire „frumoasă" a coloanei)
  const handleLabelChange = (name, value) => {
    setColumnLabels((prev) => {
      const next = { ...prev, [name]: value }
      try {
        localStorage.setItem(LOCAL_LABELS_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event('incasari-columns-changed'))
      return next
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <Settings className="w-8 h-8 mr-3 text-emerald-500" />
              Setări Încasări
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-3xl">
              Aici controlezi ce <strong>locații</strong> intră în toate calculele de{' '}
              <strong>Încasări</strong> și cum arată <strong>Tabelul Cyber</strong>.
            </p>
          </div>
          <button
            onClick={() => navigate('/incasari')}
            className="inline-flex items-center px-3 py-2 rounded-2xl text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-100 bg-slate-900/60 hover:bg-slate-800/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Înapoi la Încasări</span>
          </button>
        </div>

        {/* Locații vizibile + acțiuni Cyber */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-white/40 dark:border-slate-700/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                Locații vizibile în Încasări
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setVisibleLocations(locations)
                    try {
                      localStorage.setItem('incasari_visible_locations', JSON.stringify(locations))
                    } catch {
                      // ignore
                    }
                    window.dispatchEvent(new Event('incasari-visible-locations-changed'))
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Toate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisibleLocations([])
                    try {
                      localStorage.setItem('incasari_visible_locations', JSON.stringify([]))
                    } catch {
                      // ignore
                    }
                    window.dispatchEvent(new Event('incasari-visible-locations-changed'))
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Niciuna
                </button>
              </div>
            </div>

            {locations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nu am putut încărca lista de locații. Încearcă să reîncarci pagina.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => {
                  const active = visibleLocations.includes(loc)
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => toggleLocation(loc)}
                      className={`px-3 py-1.5 rounded-2xl text-xs font-semibold border ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900/40 border-slate-600 text-slate-200'
                      }`}
                    >
                      {loc}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card p-5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-white/40 dark:border-slate-700/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Database className="w-4 h-4 mr-2 text-emerald-500" />
                Acțiuni Cyber
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Pornește manual sincronizarea încasărilor din Cyber. Butonul de jos forțează importul pentru toată luna curentă.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-2xl text-sm font-semibold bg-slate-900/60 text-slate-100 border border-slate-700 hover:bg-slate-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizare în curs...
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 mr-2" />
                    Sincronizează datele Cyber (normal)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSync(true)}
                disabled={syncing}
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-2xl text-sm font-semibold bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Import în curs...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Import forțat pentru luna curentă
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-white/40 dark:border-slate-700/50 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <GripVertical className="w-4 h-4 mr-2 text-emerald-500" />
              Coloane Tabel Cyber
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAll('all')}
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Selectează toate
              </button>
              <button
                type="button"
                onClick={() => setAll('none')}
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Deselectează toate
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Se încarcă coloanele...</p>
          ) : orderedColumns.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nu am găsit coloane. Încearcă să reîncarci pagina.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Ordine
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Coloană
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Etichetă în tabel
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Tip
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Vizibilă
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Mută
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {orderedColumns.map((col, index) => {
                    const allVisible =
                      !visibleColumns || visibleColumns.length === 0
                        ? true
                        : visibleColumns.includes(col.name)
                    return (
                      <tr key={col.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                          <input
                            type="number"
                            min={1}
                            max={orderedColumns.length}
                            value={index + 1}
                            onChange={(e) => setColumnPosition(col.name, e.target.value)}
                            className="w-16 px-2 py-1 rounded-lg bg-slate-900/40 border border-slate-700 text-xs text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">
                          {col.name}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="w-full px-2 py-1 rounded-lg bg-slate-900/40 border border-slate-700 text-xs text-slate-100"
                            value={columnLabels[col.name] || ''}
                            onChange={(e) => handleLabelChange(col.name, e.target.value)}
                            placeholder="(implicit = numele coloanei)"
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                          {col.dataType || 'number'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600"
                            checked={allVisible}
                            onChange={() => toggleVisible(col.name)}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveColumn(col.name, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded-full border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Mută în sus"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveColumn(col.name, 'down')}
                              disabled={index === orderedColumns.length - 1}
                              className="p-1 rounded-full border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Mută în jos"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default IncasariSettings


