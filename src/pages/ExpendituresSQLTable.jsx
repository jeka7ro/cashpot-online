import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import { Filter, Table2, Search, Loader2, ArrowLeft, ArrowRight, Pencil, Trash2, X, Save, Database, FileSpreadsheet, FileDown } from 'lucide-react'

const normalizeValue = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

const includesNormalized = (list, value) => {
  if (!Array.isArray(list) || list.length === 0) return true
  const normalized = normalizeValue(value)
  return list.some((item) => normalizeValue(item) === normalized)
}

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0,00'
  return new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('ro-RO')
  } catch (error) {
    return dateString
  }
}

const defaultDateRange = () => ({
  startDate: '2020-01-01', // Data foarte veche pentru a afișa TOATE datele
  endDate: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0] // Data viitoare pentru a afișa TOATE datele
})

const dataSourceOptions = [
  { value: 'all', label: 'Toate sursele' },
  { value: 'bat_sync', label: 'BAT Sync' },
  { value: 'google_sheets', label: 'Google Sheets' }
]

const sortColumns = {
  id: 'ID',
  operational_date: 'Data',
  amount: 'Suma',
  department_name: 'Departament',
  expenditure_type: 'Tip',
  location_name: 'Locație',
  data_source: 'Sursă',
  created_at: 'Creat',
  updated_at: 'Actualizat'
}

const ExpendituresSQLTable = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [departments, setDepartments] = useState([])
  const [types, setTypes] = useState([])
  const [locations, setLocations] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [allowedFilters, setAllowedFilters] = useState({
    departments: null,
    types: null,
    locations: null
  })
  const [settingsReady, setSettingsReady] = useState(false)

  const locationHook = useLocation()
  const initialFilters = locationHook.state?.initialFilters || {}

  const baseRange = defaultDateRange()

  const [filters, setFilters] = useState({
    startDate: initialFilters.startDate || baseRange.startDate,
    endDate: initialFilters.endDate || baseRange.endDate,
    department: initialFilters.department || 'all',
    type: initialFilters.type || 'all',
    location: 'all',
    dataSource: 'all',
    search: ''
  })
  const [searchInput, setSearchInput] = useState('')

  const [sort, setSort] = useState({ sortBy: 'operational_date', order: 'desc' })
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1, totalAmount: 0 })

  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [exportingFormat, setExportingFormat] = useState(null)
  const [showAll, setShowAll] = useState(false) // Toggle pentru a afișa TOATE înregistrările ignorând filtrele

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [deptRes, typeRes, locRes, settingsRes, usersRes] = await Promise.all([
          axios.get('/api/expenditures/departments'),
          axios.get('/api/expenditures/expenditure-types'),
          axios.get('/api/expenditures/external-locations'),
          axios.get('/api/expenditures/settings'),
          axios.get('/api/users')
        ])

        const allDepartments = deptRes.data?.map((item) => item.name).filter(Boolean) || []
        const allTypes = typeRes.data?.map((item) => item.name).filter(Boolean) || []
        const allLocations = locRes.data?.map((item) => item.name).filter(Boolean) || []

        const includedDepartments = Array.isArray(settingsRes.data?.includedDepartments)
          ? settingsRes.data.includedDepartments.filter(Boolean)
          : null
        const includedTypes = Array.isArray(settingsRes.data?.includedExpenditureTypes)
          ? settingsRes.data.includedExpenditureTypes.filter(Boolean)
          : null
        const includedLocations = Array.isArray(settingsRes.data?.includedLocations)
          ? settingsRes.data.includedLocations.filter(Boolean)
          : null

        setAllowedFilters({
          departments: includedDepartments,
          types: includedTypes,
          locations: includedLocations
        })

        setDepartments(
          allDepartments
            .filter((dept) => includesNormalized(includedDepartments, dept))
            .sort()
        )
        setTypes(
          allTypes
            .filter((type) => includesNormalized(includedTypes, type))
            .sort()
        )
        setLocations(
          allLocations
            .filter((loc) => includesNormalized(includedLocations, loc))
            .sort()
        )

        const map = {}
        ;(usersRes.data || []).forEach((user) => {
          map[user.id] = user.full_name || user.username || `User ${user.id}`
        })
        setUsersMap(map)
        setSettingsReady(true)
      } catch (error) {
        console.error('Error loading SQL table metadata:', error)
        toast.error('Eroare la încărcarea listelor pentru filtre')
        setSettingsReady(true)
      }
    }

    loadMeta()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      const trimmed = searchInput.trim()
      setFilters((prev) => ({ ...prev, search: trimmed }))
      setPagination((prev) => ({
        ...prev,
        page: 1,
        pageSize: trimmed ? 'all' : prev.pageSize
      }))
    }, 400)

    return () => clearTimeout(debounce)
  }, [searchInput])

  const buildQueryParamObject = (extra = {}, includePagination = true) => {
    const params = {}

    // Dacă showAll e activ, NU trimitem NICIUN filtru (doar sort + paginare)
    if (!showAll) {
      if (filters.startDate) {
        // Asigurăm formatul corect YYYY-MM-DD
        params.startDate = filters.startDate.split('T')[0]
      }
      if (filters.endDate) {
        // Asigurăm formatul corect YYYY-MM-DD
        params.endDate = filters.endDate.split('T')[0]
      }
      if (filters.department && filters.department !== 'all') params.department = filters.department
      if (filters.type && filters.type !== 'all') params.type = filters.type
      if (filters.location && filters.location !== 'all') params.location = filters.location
      if (filters.dataSource && filters.dataSource !== 'all') params.dataSource = filters.dataSource
      if (filters.search) params.search = filters.search
    }

    params.sortBy = sort.sortBy
    params.order = sort.order

    if (includePagination) {
      params.page = pagination.page
      params.pageSize = pagination.pageSize
    }

    // Log pentru debugging
    if (params.startDate || params.endDate) {
      console.log('📅 Filtru dată trimis backend:', { startDate: params.startDate, endDate: params.endDate })
    }

    return { ...params, ...extra }
  }

  const fetchTableData = async () => {
    if (!settingsReady) return
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/sql-table', {
        params: buildQueryParamObject()
      })
      if (response.data?.success) {
        setData(response.data.data || [])
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 1,
          totalAmount: response.data.pagination?.totalAmount || 0
        }))
      } else {
        setData([])
        toast.error('Nu am putut încărca datele SQL')
      }
    } catch (error) {
      console.error('Error loading SQL table data:', error)
      toast.error('Eroare la încărcarea datelor din SQL table')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!settingsReady) return
    fetchTableData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, pagination.pageSize, sort, settingsReady, showAll])

  useEffect(() => {
    if (editingRecord) {
      setEditForm({
        ...editingRecord,
        amount: Number(editingRecord.amount || 0).toFixed(2)
      })
    } else {
      setEditForm(null)
    }
  }, [editingRecord])

  const handleQuickFilter = (range) => {
    setFilters((prev) => ({ ...prev, startDate: range.startDate, endDate: range.endDate }))
    setPagination((prev) => ({ ...prev, page: 1, pageSize: 'all' }))
  }

  const handleDateChange = (range) => {
    setFilters((prev) => ({ ...prev, startDate: range.startDate, endDate: range.endDate }))
    setPagination((prev) => ({ ...prev, page: 1, pageSize: 'all' }))
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({
      ...prev,
      page: 1,
      pageSize: value !== 'all' ? 'all' : prev.pageSize
    }))
  }

  const handleSort = (column) => {
    setSort((prev) => {
      if (prev.sortBy === column) {
        return { sortBy: column, order: prev.order === 'asc' ? 'desc' : 'asc' }
      }
      return { sortBy: column, order: column === 'operational_date' ? 'desc' : 'asc' }
    })
  }

  const handlePageChange = (direction) => {
    setPagination((prev) => {
      if (prev.pageSize === 'all') return prev
      const nextPage = direction === 'next' ? prev.page + 1 : prev.page - 1
      if (nextPage < 1 || nextPage > prev.totalPages) return prev
      return { ...prev, page: nextPage }
    })
  }

  const handleEditSave = async () => {
    if (!editForm) return

    try {
      setSavingEdit(true)
      const payload = {
        operational_date: editForm.operational_date,
        amount: editForm.amount,
        location_name: editForm.location_name,
        department_name: editForm.department_name,
        expenditure_type: editForm.expenditure_type,
        description: editForm.description
      }

      const response = await axios.put(`/api/expenditures/sql-table/${editForm.id}`, payload)
      toast.success('Înregistrare actualizată')
      const updatedRecord = response.data?.record
      setData((prev) => prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item)))
      setEditingRecord(null)
    } catch (error) {
      console.error('Error updating record:', error)
      toast.error('Nu am putut salva modificările')
    } finally {
      setSavingEdit(false)
    }
  }

  const handlePageSizeSelect = (value) => {
    const normalized = value === 'all' ? 'all' : Math.min(Math.max(parseInt(value, 10) || 50, 1), 500)
    setPagination((prev) => ({
      ...prev,
      page: 1,
      pageSize: normalized
    }))
  }

  const handleDelete = async (record) => {
    if (!record) return
    const confirm = window.confirm(`Ștergi înregistrarea din ${formatDate(record.operational_date)} (${record.amount} RON)?`)
    if (!confirm) return

    try {
      setDeletingId(record.id)
      await axios.delete(`/api/expenditures/sql-table/${record.id}`)
      toast.success('Înregistrare ștearsă')
      setData((prev) => prev.filter((item) => item.id !== record.id))
      setPagination((prev) => ({
        ...prev,
        total: Math.max(prev.total - 1, 0),
        totalAmount: Math.max(prev.totalAmount - Number(record.amount || 0), 0)
      }))
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error('Nu am putut șterge înregistrarea')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async (format) => {
    try {
      setExportingFormat(format)
      toast.loading(`Se generează exportul ${format.toUpperCase()}...`, { id: `export-${format}` })

      const params = buildQueryParamObject({ format, exportAll: '1' }, false)
      const response = await axios.get('/api/expenditures/sql-table/export', {
        params,
        responseType: 'blob'
      })

      const blob = new Blob(
        [response.data],
        {
          type: format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv;charset=utf-8'
        }
      )

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `cheltuieli_sql_${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xlsx' : 'csv'}`
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Export ${format.toUpperCase()} generat`, { id: `export-${format}` })
    } catch (error) {
      console.error('Error exporting SQL table data:', error)
      toast.error('Nu am putut genera exportul', { id: `export-${format}` })
    } finally {
      setExportingFormat(null)
    }
  }

  const userLabel = (id) => {
    if (!id) return '-'
    return usersMap[id] || `User #${id}`
  }

  const tableSummary = useMemo(() => {
    const totalAmount = data.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    return {
      totalAmount,
      count: data.length
    }
  }, [data])

  const filteredTotalAmount = pagination.totalAmount || 0
  const pageSizeOptions = [
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 500, label: '500' },
    { value: 'all', label: 'Toate' }
  ]
  const isAllPageSize = pagination.pageSize === 'all'

  return (
    <Layout>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              <Table2 className="w-8 h-8 mr-3 text-blue-500" />
              Tabel SQL Cheltuieli
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Vizualizează și gestionează înregistrările combinate BAT & Google Sheets
            </p>
          </div>
          <button
            onClick={() => navigate('/expenditures')}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Înapoi la Cheltuieli</span>
          </button>
        </div>

        {/* Filters Card */}
        <div className="card p-5 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-white/40 dark:border-slate-700/50 backdrop-blur-2xl">
          {/* Header cu titlu */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Filter className="w-4 h-4 mr-2 text-blue-500" />
              Filtre SQL
            </h2>
          </div>

          {/* Rând 1: Quick Date Buttons (stânga) + Filtre & Toggle (aliniate la dreapta) */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Quick Date Buttons - stânga, fără label, doar butoanele */}
            <div className="flex items-center gap-2">
              {[
                { id: 'today', label: 'Azi' },
                { id: 'thisWeek', label: 'Săpt' },
                { id: 'thisMonth', label: 'Luna curentă' },
                { id: 'lastMonth', label: 'Luna trecută' },
                { id: 'thisYear', label: 'Anul curent' }
              ].map((action) => {
                const handleQuickAction = () => {
                  const now = new Date()
                  let newStart, newEnd
                  
                  switch (action.id) {
                    case 'today':
                      newStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                      newEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                      break
                    case 'thisWeek':
                      const dayOfWeek = now.getDay()
                      const startOfWeek = new Date(now)
                      startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
                      const endOfWeek = new Date(startOfWeek)
                      endOfWeek.setDate(startOfWeek.getDate() + 6)
                      newStart = startOfWeek
                      newEnd = endOfWeek
                      break
                    case 'thisMonth':
                      newStart = new Date(now.getFullYear(), now.getMonth(), 1)
                      newEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                      break
                    case 'lastMonth':
                      newStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                      newEnd = new Date(now.getFullYear(), now.getMonth(), 0)
                      break
                    case 'thisYear':
                      newStart = new Date(now.getFullYear(), 0, 1)
                      newEnd = new Date(now.getFullYear(), 11, 31)
                      break
                    default:
                      return
                  }
                  handleQuickFilter({ startDate: newStart.toISOString().split('T')[0], endDate: newEnd.toISOString().split('T')[0] })
                }
                
                return (
                  <button
                    key={action.id}
                    onClick={handleQuickAction}
                    className="relative px-3 py-2 rounded-2xl text-white text-xs font-semibold transition-all overflow-hidden border hover:scale-105 active:scale-95"
                    style={{
                      height: '40px',
                      minWidth: '80px',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                    }}
                  >
                    <span className="relative z-10">{action.label}</span>
                  </button>
                )
              })}
            </div>
            {/* Filtre + Toggle - grupate și împinse spre dreapta */}
            <div className="flex items-end gap-3 ml-auto">
              {/* Filtre Departament, Tip, Locație, Sursă - același stil cu butonul principal */}
              <div className="relative">
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="rounded-2xl text-white text-sm font-semibold border transition-all"
                  style={{
                    height: '40px',
                    paddingLeft: '12px',
                    paddingRight: '32px',
                    width: 'auto',
                    minWidth: '140px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <option value="all">Departament: Toate</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="rounded-2xl text-white text-sm font-semibold border transition-all"
                  style={{
                    height: '40px',
                    paddingLeft: '12px',
                    paddingRight: '32px',
                    width: 'auto',
                    minWidth: '140px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <option value="all">Tip: Toate</option>
                  {types.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="rounded-2xl text-white text-sm font-semibold border transition-all"
                  style={{
                    height: '40px',
                    paddingLeft: '12px',
                    paddingRight: '32px',
                    width: 'auto',
                    minWidth: '140px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <option value="all">Locație: Toate</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={filters.dataSource}
                  onChange={(e) => handleFilterChange('dataSource', e.target.value)}
                  className="rounded-2xl text-white text-sm font-semibold border transition-all"
                  style={{
                    height: '40px',
                    paddingLeft: '12px',
                    paddingRight: '32px',
                    width: 'auto',
                    minWidth: '140px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  {dataSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Toggle "Afișează toate" - la capătul din dreapta al grupului */}
              <button
                onClick={() => {
                  setShowAll(!showAll)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className={`
                  relative px-5 py-2.5 rounded-2xl font-semibold text-sm
                  transition-all duration-300 ease-out overflow-hidden
                  text-white
                  hover:scale-105 active:scale-95
                  border
                `}
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: showAll
                    ? '0 10px 28px rgba(37, 99, 235, 0.6)'
                    : '0 6px 18px rgba(37, 99, 235, 0.45)'
                }}
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <Database className={`w-4 h-4 ${showAll ? 'drop-shadow-lg' : ''}`} />
                  <span className="drop-shadow-sm">{showAll ? 'Afișează toate' : 'Filtre active'}</span>
                </span>
              </button>
            </div>
          </div>

          {/* Rând 2: Perioadă + Căutare + Info + Export - aliniate frumos pe un singur rând */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="flex-1 min-w-[260px] max-w-md">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Perioadă</label>
              <DateRangeSelector
                startDate={filters.startDate}
                endDate={filters.endDate}
                onChange={handleDateChange}
              />
            </div>
            <div className="flex-[2] min-w-[320px]">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Căutare</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Caută după descriere / locație / departament / tip"
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={showAll}
                />
              </div>
            </div>
            <div className="flex-1 min-w-[260px] flex items-end justify-end gap-3">
              <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap mr-3 hidden lg:block">
                {pagination.total.toLocaleString('ro-RO')} înregistrări • {tableSummary.totalAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.45)'
                }}
              >
                {exportingFormat === 'csv' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={exportingFormat !== null}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                style={{
                  height: '40px',
                  // Gradient verde tip „Excel”
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 8px 28px rgba(22, 163, 74, 0.5)'
                }}
              >
                {exportingFormat === 'xlsx' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">#</th>
              {Object.entries(sortColumns).map(([column, label]) => (
                    <th
                      key={column}
                      onClick={() => handleSort(column)}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer select-none"
                    >
                      <span className="flex items-center space-x-1">
                        <span>{label}</span>
                        {sort.sortBy === column && (
                          <span className="text-blue-500">{sort.order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Descriere</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-center">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={Object.keys(sortColumns).length + 3} className="py-12 text-center">
                      <div className="flex flex-col items-center space-y-3 text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Se încarcă datele SQL...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={Object.keys(sortColumns).length + 3} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      <Database className="w-10 h-10 mx-auto mb-3 opacity-60" />
                      <p>Nu există înregistrări pentru filtrele selectate</p>
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {(pagination.pageSize === 'all'
                          ? index + 1
                          : (pagination.page - 1) * (Number(pagination.pageSize) || 50) + index + 1
                        ).toLocaleString('ro-RO')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-900 dark:text-slate-100 font-semibold">{row.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-900 dark:text-slate-100 font-medium">{formatDate(row.operational_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{row.department_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{row.expenditure_type || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{row.location_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          row.data_source === 'google_sheets'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {row.data_source === 'google_sheets' ? 'Google Sheets' : 'BAT Sync'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                        <div>{userLabel(row.created_by)}</div>
                        <div>{formatDate(row.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                        <div>{userLabel(row.updated_by)}</div>
                        <div>{formatDate(row.updated_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs">
                        <div className="line-clamp-2" title={row.description || 'N/A'}>
                          {row.description || <span className="text-slate-400">N/A</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setEditingRecord(row)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/40 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20 transition-colors"
                            title="Editează"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="sr-only">Editează</span>
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/40 text-red-500 hover:bg-red-500/20 transition-colors"
                            disabled={deletingId === row.id}
                            title="Șterge"
                          >
                            {deletingId === row.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span className="sr-only">Șterge</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3 text-right">Total pagină</td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{formatCurrency(tableSummary.totalAmount)}</td>
                  <td colSpan={10}></td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3 text-right">Total filtrat</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(filteredTotalAmount)}</td>
                  <td colSpan={10}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Pagina {pagination.page} din {pagination.totalPages} • {pagination.total.toLocaleString('ro-RO')} înregistrări
              </span>
              <div className="flex items-center space-x-2">
                <span>Arată</span>
                <select
                  value={String(pagination.pageSize)}
                  onChange={(e) => handlePageSizeSelect(e.target.value)}
                  className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span>rânduri</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-slate-700 dark:text-slate-200">
                Total filtrat: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(filteredTotalAmount)} RON</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Total pagină: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(tableSummary.totalAmount)} RON</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={pagination.page <= 1 || isAllPageSize}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={pagination.page >= pagination.totalPages || isAllPageSize}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editForm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/70 backdrop-blur">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                <Pencil className="w-5 h-5 mr-2 text-blue-500" /> Editează înregistrarea #{editForm.id}
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Data operațională</label>
                <input
                  type="date"
                  value={editForm.operational_date?.split('T')[0] || editForm.operational_date || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, operational_date: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Suma (RON)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Departament</label>
                <input
                  value={editForm.department_name || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, department_name: e.target.value }))}
                  className="input-field"
                  placeholder="Departament"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Tip cheltuială</label>
                <input
                  value={editForm.expenditure_type || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expenditure_type: e.target.value }))}
                  className="input-field"
                  placeholder="Tip cheltuială"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Locație</label>
                <input
                  value={editForm.location_name || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location_name: e.target.value }))}
                  className="input-field"
                  placeholder="Locație"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Sursă</label>
                <input
                  value={editForm.data_source === 'google_sheets' ? 'Google Sheets' : 'BAT Sync'}
                  disabled
                  className="input-field bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Descriere</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explicație / detalii tranzacție"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Ultima actualizare: {formatDate(editingRecord?.updated_at)} • {userLabel(editingRecord?.updated_by)}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4 inline mr-2" /> Anulează
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ExpendituresSQLTable
