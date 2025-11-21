import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BarChart3, Database, Loader2, ArrowLeft, AlertCircle, Settings } from 'lucide-react'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import { toast } from 'react-hot-toast'

const CyberTable = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_visible_columns')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null })
  const [selectedIds, setSelectedIds] = useState([])
  const [pageSize, setPageSize] = useState('250')
  const [page, setPage] = useState(1)
  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_columns_order')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [columnLabels, setColumnLabels] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_column_labels')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [visibleLocations, setVisibleLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_visible_locations')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const loadPreview = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/incasari/cyber-preview')
        if (response.data?.success) {
        const cols = response.data.columns || []
        setColumns(cols)
        setRows(response.data.rows || [])

        // Dacă nu avem încă un dateRange setat, îl inițializăm după datele din rows
        if (!dateRange.startDate || !dateRange.endDate) {
          const allRows = response.data.rows || []
          if (allRows.length > 0) {
            let minTime = null
            let maxTime = null
            allRows.forEach((row) => {
              const rawDate = row.date || row.audit_date || row.operational_date || row.day
              if (!rawDate) return
              const d = new Date(rawDate)
              if (Number.isNaN(d.getTime())) return
              const t = d.getTime()
              if (minTime === null || t < minTime) minTime = t
              if (maxTime === null || t > maxTime) maxTime = t
            })
            if (minTime !== null && maxTime !== null) {
              const start = new Date(minTime)
              const end = new Date(maxTime)
              const year = start.getFullYear()
              const endYear = end.getFullYear()
              // Default: anul întreg al datelor (sau intervalul complet dacă sunt ani diferiți)
              const startDate =
                year === endYear
                  ? `${year}-01-01`
                  : `${start.getFullYear()}-01-01`
              const endDate =
                year === endYear
                  ? `${endYear}-12-31`
                  : `${end.getFullYear()}-12-31`
              setDateRange({ startDate, endDate })
            }
          }
        }

        // Dacă nu avem încă selecție salvată, alegem câteva coloane standard (date + in/out/bet/win/profit)
        if (!visibleColumns || visibleColumns.length === 0) {
          const preferredOrder = [
            'date',
            'location',
            'location_id',
            'machine_id',
            'serial_number',
            'in',
            'out',
            'bet',
            'win',
            'profit'
          ]
          const initial = cols
            .map((c) => c.name)
            .filter((name) => preferredOrder.includes(name.toLowerCase()) || preferredOrder.includes(name))
          if (initial.length > 0) {
            setVisibleColumns(initial)
            try {
              localStorage.setItem('incasari_visible_columns', JSON.stringify(initial))
            } catch {
              // ignore
            }
          }
        }

        // Dacă nu avem ordinea salvată, folosim ordinea din backend
        if (!columnOrder || columnOrder.length === 0) {
          const order = cols.map((c) => c.name)
          setColumnOrder(order)
          try {
            localStorage.setItem('incasari_columns_order', JSON.stringify(order))
          } catch {
            // ignore
          }
        }
      } else {
        setColumns([])
        setRows([])
        setError(response.data?.error || 'Nu am putut încărca datele din Cyber')
      }
    } catch (err) {
      console.error('Error loading Cyber preview:', err)
      setError(err.response?.data?.error || err.message || 'Eroare necunoscută')
      toast.error('Eroare la încărcarea datelor din Cyber')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ascultă schimbările listelor de locații vizibile din pagina de setări Încasări
  useEffect(() => {
    const handleVisibleLocationsChanged = () => {
      try {
        const saved = localStorage.getItem('incasari_visible_locations')
        setVisibleLocations(saved ? JSON.parse(saved) : [])
      } catch {
        // ignore
      }
    }

    window.addEventListener('incasari-visible-locations-changed', handleVisibleLocationsChanged)
    return () =>
      window.removeEventListener(
        'incasari-visible-locations-changed',
        handleVisibleLocationsChanged
      )
  }, [])

  // Ascultă schimbările de coloane / etichete din pagina de setări
  useEffect(() => {
    const handleColumnsChanged = () => {
      try {
        const savedOrder = localStorage.getItem('incasari_columns_order')
        if (savedOrder) {
          setColumnOrder(JSON.parse(savedOrder))
        }
        const savedVisible = localStorage.getItem('incasari_visible_columns')
        if (savedVisible) {
          setVisibleColumns(JSON.parse(savedVisible))
        }
        const savedLabels = localStorage.getItem('incasari_column_labels')
        if (savedLabels) {
          setColumnLabels(JSON.parse(savedLabels))
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener('incasari-columns-changed', handleColumnsChanged)
    return () => window.removeEventListener('incasari-columns-changed', handleColumnsChanged)
  }, [])

  const formatDateLocal = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return null
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatNumberRo = (value, fractionDigits = 2) => {
    if (value === null || value === undefined || value === '') return ''
    const num = typeof value === 'string' ? parseFloat(value) : Number(value)
    if (!Number.isFinite(num)) return String(value)
    return num.toLocaleString('ro-RO', {
      // Nu mai mult de 2 zecimale; dacă e număr întreg, afișăm fără zecimale
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits
    })
  }

  const formatDateDisplay = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    // Format dd.mm.yyyy (fără oră, fără secunde)
    return `${day}.${month}.${year}`
  }

  // Derivăm „data de referință” din ultimele date disponibile (max date)
  const referenceDate = useMemo(() => {
    if (!rows || rows.length === 0) return null
    let maxTime = null
    rows.forEach((row) => {
      const rawDate = row.date || row.audit_date || row.operational_date || row.day
      if (!rawDate) return
      const d = new Date(rawDate)
      if (Number.isNaN(d.getTime())) return
      const t = d.getTime()
      if (maxTime === null || t > maxTime) {
        maxTime = t
      }
    })
    return maxTime !== null ? new Date(maxTime) : null
  }, [rows])

  const applyQuickDateFilter = (filterType) => {
    const base = referenceDate || new Date()
    let startDate = null
    let endDate = null

    switch (filterType) {
      case 'today': {
        const s = new Date(base.getFullYear(), base.getMonth(), base.getDate())
        startDate = formatDateLocal(s)
        endDate = startDate
        break
      }
      case 'thisMonth': {
        const s = new Date(base.getFullYear(), base.getMonth(), 1)
        const e = new Date(base.getFullYear(), base.getMonth() + 1, 0)
        startDate = formatDateLocal(s)
        endDate = formatDateLocal(e)
        break
      }
      case 'lastMonth': {
        const s = new Date(base.getFullYear(), base.getMonth() - 1, 1)
        const e = new Date(base.getFullYear(), base.getMonth(), 0)
        startDate = formatDateLocal(s)
        endDate = formatDateLocal(e)
        break
      }
      case 'thisYear': {
        const s = new Date(base.getFullYear(), 0, 1)
        const e = new Date(base.getFullYear(), 11, 31)
        startDate = formatDateLocal(s)
        endDate = formatDateLocal(e)
        break
      }
      case 'all':
      default:
        startDate = null
        endDate = null
        break
    }

    setDateRange({ startDate, endDate })
  }

  const toggleColumn = (name) => {
    setVisibleColumns((prev) => {
      let next
      if (!prev || prev.length === 0) {
        next = [name]
      } else if (prev.includes(name)) {
        next = prev.filter((c) => c !== name)
      } else {
        next = [...prev, name]
      }
      try {
        localStorage.setItem('incasari_visible_columns', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const setAllColumns = (mode) => {
    if (mode === 'all') {
      const all = columns.map((c) => c.name)
      setVisibleColumns(all)
      try {
        localStorage.setItem('incasari_visible_columns', JSON.stringify(all))
      } catch {
        // ignore
      }
    } else {
      setVisibleColumns([])
      try {
        localStorage.setItem('incasari_visible_columns', JSON.stringify([]))
      } catch {
        // ignore
      }
    }
  }

  const orderedColumns = useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) return columns
    const byName = new Map(columns.map((c) => [c.name, c]))
    const ordered = columnOrder
      .map((name) => byName.get(name))
      .filter(Boolean)
    // include new columns that may have apărut în backend
    columns.forEach((c) => {
      if (!ordered.find((x) => x.name === c.name)) {
        ordered.push(c)
      }
    })
    return ordered
  }, [columns, columnOrder])

  const displayedColumns =
    !visibleColumns || visibleColumns.length === 0
      ? orderedColumns
      : orderedColumns.filter((c) => visibleColumns.includes(c.name))

  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return []
    if (!dateRange.startDate || !dateRange.endDate) return rows

    const { startDate, endDate } = dateRange
    const hasVisibleLocations = visibleLocations && visibleLocations.length > 0

    return rows.filter((row) => {
      const rawDate = row.date || row.audit_date || row.operational_date || row.day
      if (!rawDate) return false
      const value = formatDateLocal(rawDate)
      if (!value || value < startDate || value > endDate) return false

      if (!hasVisibleLocations) return true
      const loc =
        row.location ||
        row.location_name ||
        row.locationName ||
        row.sala ||
        row.sala_name ||
        null
      if (!loc) return true
      return visibleLocations.includes(String(loc))
    })
  }, [rows, dateRange, visibleLocations])

  const paginationInfo = useMemo(() => {
    const totalRows = filteredRows.length
    if (totalRows === 0) {
      return {
        totalRows: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: 'all',
        rowsOnPage: []
      }
    }

    if (pageSize === 'all') {
      return {
        totalRows,
        totalPages: 1,
        currentPage: 1,
        pageSize: 'all',
        rowsOnPage: filteredRows
      }
    }

    const numericPageSize = Number(pageSize) || 250
    const totalPages = Math.max(1, Math.ceil(totalRows / numericPageSize))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const startIndex = (safePage - 1) * numericPageSize
    const endIndex = startIndex + numericPageSize

    return {
      totalRows,
      totalPages,
      currentPage: safePage,
      pageSize: numericPageSize,
      rowsOnPage: filteredRows.slice(startIndex, endIndex)
    }
  }, [filteredRows, pageSize, page])

  const stats = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) {
      return { totalRows: 0, distinctMachines: 0, distinctDays: 0, totalProfit: 0 }
    }

    const totalRows = filteredRows.length
    const machineIds = new Set(
      filteredRows.map((r) => r.machine_id || r.serial_number || r.machineId || r.id)
    )
    const distinctMachines = machineIds.size

    const daySet = new Set()
    filteredRows.forEach((r) => {
      const rawDate = r.date || r.audit_date || r.operational_date || r.day
      const d = rawDate ? formatDateLocal(rawDate) : null
      if (d) daySet.add(d)
    })
    const distinctDays = daySet.size

    const totalProfit = filteredRows.reduce((sum, r) => {
      // Profit = IN - OUT (dacă avem aceste coloane)
      const inVal = Number(r.in ?? r.in_amount ?? 0)
      const outVal = Number(r.out ?? r.out_amount ?? 0)
      let profitField = inVal - outVal

      // Dacă nu avem IN/OUT, încercăm câmpurile existente (fallback)
      if (!Number.isFinite(profitField) || (inVal === 0 && outVal === 0)) {
        profitField =
          r.profit ??
          r.profit_amount ??
          (r.win !== undefined || r.bet !== undefined
            ? Number(r.win || 0) - Number(r.bet || 0)
            : 0)
      }

      const val =
        typeof profitField === 'string' ? parseFloat(profitField) : Number(profitField || 0)
      return sum + (Number.isFinite(val) ? val : 0)
    }, 0)

    return { totalRows, distinctMachines, distinctDays, totalProfit }
  }, [filteredRows])

  const handleDateRangeChange = (range) => {
    // DateRangeSelector / QuickDateButtons trimit { startDate, endDate }
    setDateRange({ startDate: range.startDate, endDate: range.endDate })
  }

  const getRowId = (row, index) => {
    return row.id ?? row.machine_id ?? row.serial_number ?? index
  }

  const toggleSelectOne = (row, index) => {
    const id = getRowId(row, index)
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllVisible = () => {
    const visibleRows = paginationInfo.rowsOnPage || []
    if (!visibleRows || visibleRows.length === 0) return
    const allIds = visibleRows.map(getRowId)
    const allSelected = allIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : allIds)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-emerald-500" />
              Tabel Cyber – Preview Încasări
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-3xl">
              Aici vezi direct toate coloanele din{' '}
              <span className="font-semibold">cyberslot_dbn.machine_audit_summaries</span>. După ce
              alegem împreună ce coloane sunt importante, vom construi pagina finală de
              <span className="font-semibold"> Încasări</span> și filtrele.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/incasari')}
              className="inline-flex items-center px-3 py-2 rounded-2xl text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-100 bg-slate-900/60 hover:bg-slate-800/80"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Înapoi la Încasări</span>
            </button>
          </div>
        </div>

        <div className="card p-5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-white/40 dark:border-slate-700/50 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Database className="w-4 h-4 mr-2 text-emerald-500" />
              Preview machine_audit_summaries (primele rânduri)
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/incasari/settings')}
                className="inline-flex items-center px-3 py-2 rounded-2xl text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Settings className="w-4 h-4 mr-1" />
                <span>Setări tabel</span>
              </button>
              <button
                onClick={loadPreview}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 rounded-2xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reîncarcă...
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 mr-2" />
                    Reîncarcă preview
                  </>
                )}
              </button>
            </div>
          </div>

          {columns.length > 0 && (
            <div className="mb-4 flex flex-col lg:flex-row items-start gap-6">
              <div className="mb-4 lg:mb-0 flex-1 min-w-[260px] max-w-md space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Perioadă rapidă
                  </p>
                  <QuickDateButtons onChange={handleDateRangeChange} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Interval detaliat</p>
                  <DateRangeSelector
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={handleDateRangeChange}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Coloane vizibile
                </p>
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    onClick={() => setAllColumns('all')}
                  >
                    Selectează toate
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    onClick={() => setAllColumns('none')}
                  >
                    Deselectează toate
                  </button>
                </div>
                <div className="max-h-40 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs space-y-1 bg-slate-50/60 dark:bg-slate-900/40">
                  {columns.map((col) => (
                    <label
                      key={col.name}
                      className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        className="w-3 h-3 rounded border-slate-300 dark:border-slate-600 text-emerald-600"
                        checked={
                          !visibleColumns || visibleColumns.length === 0
                            ? true
                            : visibleColumns.includes(col.name)
                        }
                        onChange={() => toggleColumn(col.name)}
                      />
                      <span>{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {columns.length > 0 && (
            <div className="mb-4 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4">
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {stats.distinctMachines.toLocaleString('ro-RO')}
                </span>{' '}
                sloturi distincte în perioada selectată
              </span>
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {stats.totalRows.toLocaleString('ro-RO')}
                </span>{' '}
                înregistrări (zile × sloturi)
              </span>
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {stats.distinctDays.toLocaleString('ro-RO')}
                </span>{' '}
                zile distincte în perioada selectată
              </span>
              <span>
                Profit total:{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.totalProfit.toLocaleString('ro-RO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}{' '}
                  RON
                </span>
              </span>
              {selectedIds.length > 0 && (
                <span>
                  Selectate:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {selectedIds.length.toLocaleString('ro-RO')} rânduri
                  </span>
                </span>
              )}
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Total rânduri:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {paginationInfo.totalRows.toLocaleString('ro-RO')}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span>Rânduri / pagină:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value)
                      setPage(1)
                    }}
                    className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="250">250</option>
                    <option value="400">400</option>
                    <option value="all">Toate</option>
                  </select>
                </div>
                {pageSize !== 'all' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={paginationInfo.currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Anterioara
                    </button>
                    <span>
                      Pagina{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {paginationInfo.currentPage}
                      </span>{' '}
                      din{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {paginationInfo.totalPages}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={paginationInfo.currentPage >= paginationInfo.totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(paginationInfo.totalPages, p + 1))
                      }
                      className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Următoarea
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-semibold">Eroare la încărcare</p>
                <p className="text-sm whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            {loading ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Se încarcă datele din Cyber...</span>
              </div>
            ) : columns.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center space-y-3">
                <Database className="w-8 h-8 opacity-60" />
                <span>Nu am găsit coloane în machine_audit_summaries sau nu există drepturi de acces.</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600"
                        checked={
                          filteredRows.length > 0 &&
                          filteredRows
                            .map(getRowId)
                            .every((id) => selectedIds.includes(id))
                        }
                        onChange={toggleSelectAllVisible}
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">
                      #
                    </th>
                    {displayedColumns.map((col) => (
                      <th
                        key={col.name}
                        className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                      >
                        <div className="flex flex-col">
                          <span>{columnLabels[col.name] || col.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {col.dataType}
                            {col.isNullable ? '' : ' · NOT NULL'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                  {paginationInfo.rowsOnPage.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600"
                          checked={selectedIds.includes(getRowId(row, idx))}
                          onChange={() => toggleSelectOne(row, idx)}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {(
                          (paginationInfo.currentPage - 1) *
                            (paginationInfo.pageSize === 'all'
                              ? paginationInfo.totalRows
                              : paginationInfo.pageSize) +
                          idx +
                          1
                        ).toLocaleString('ro-RO')}
                      </td>
                      {displayedColumns.map((col) => {
                        const raw = row[col.name]
                        const isDateColumn = ['date', 'audit_date', 'operational_date', 'day'].includes(
                          col.name
                        )
                        const isMoneyColumn = [
                          'in',
                          'out',
                          'bet',
                          'win',
                          'profit',
                          'in_m',
                          'out_m',
                          'cb_real',
                          'cashback'
                        ].includes(col.name)

                        const value = isDateColumn
                          ? formatDateDisplay(raw)
                          : isMoneyColumn
                          ? formatNumberRo(raw)
                          : raw

                        return (
                          <td
                            key={col.name}
                            className={`px-3 py-2 whitespace-nowrap ${
                              isMoneyColumn
                                ? 'text-right tabular-nums text-slate-900 dark:text-slate-50'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {value === null || value === undefined ? '' : String(value)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CyberTable


