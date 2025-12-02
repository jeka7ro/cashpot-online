import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { ArrowLeft, Filter, TrendingUp, Building2, FileSpreadsheet, Trash2, AlertCircle, CheckSquare, Square, MapPin, Loader2, X, Calendar, Clock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'

const ExpendituresDetail = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { department, category, dateRange: initialDateRange } = location.state || {}

  useEffect(() => {
    if (!department) {
      navigate('/expenditures')
    }
  }, [department, navigate])

  // Format date local
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [dateRange, setDateRange] = useState(
    initialDateRange || {
      startDate: formatDateLocal(new Date(new Date().getFullYear(), 0, 1)),
      endDate: formatDateLocal(new Date())
    }
  )

  // Quick date filters
  const applyQuickDateFilter = (filterType) => {
    const today = new Date()
    let startDate, endDate
    
    switch (filterType) {
      case 'azi':
        startDate = formatDateLocal(today)
        endDate = formatDateLocal(today)
        break
      case 'saptamana-curenta':
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        startDate = formatDateLocal(monday)
        endDate = formatDateLocal(today)
        break
      case 'luna-curenta':
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        startDate = formatDateLocal(currentMonthStart)
        endDate = formatDateLocal(currentMonthEnd)
        break
      case 'luna-anterioara':
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        startDate = formatDateLocal(prevMonthStart)
        endDate = formatDateLocal(prevMonthEnd)
        break
      case 'anul-curent':
        startDate = formatDateLocal(new Date(today.getFullYear(), 0, 1))
        endDate = formatDateLocal(new Date(today.getFullYear(), 11, 31))
        break
      case 'anul-trecut':
        startDate = formatDateLocal(new Date(today.getFullYear() - 1, 0, 1))
        endDate = formatDateLocal(new Date(today.getFullYear() - 1, 11, 31))
        break
      case 'toate':
        startDate = '2020-01-01'
        endDate = formatDateLocal(new Date(today.getFullYear() + 1, 11, 31))
        break
      default:
        return
    }
    
    setDateRange({ startDate, endDate })
  }

  const [expendituresData, setExpendituresData] = useState([])
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState(category || 'all')
  const [locationFilter, setLocationFilter] = useState('all') // NEW: Filtru de locație
  const [summaryGranularity, setSummaryGranularity] = useState('month') // 'day', 'month', 'quarter', 'year'
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  
  // Selectare multiplă și ștergere multiplă
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  
  // Căutare duplicate SMART
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [searchingDuplicates, setSearchingDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
  const [selectedDuplicatesToKeep, setSelectedDuplicatesToKeep] = useState(new Map())
  const [deletingDuplicates, setDeletingDuplicates] = useState(false)

  // Load expenditures data
  const loadExpendituresData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data')
      setExpendituresData(response.data || [])
    } catch (error) {
      console.error('Error loading expenditures detail:', error)
      toast.error('Eroare la încărcarea cheltuielilor pentru detalii')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpendituresData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter data for this department / category / date range
  const filteredData = useMemo(() => {
    let data = expendituresData
    if (!department) return []

    data = data.filter((item) => item.department_name === department)

    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)

    data = data.filter((item) => {
      const d = new Date(item.operational_date)
      return d >= start && d <= end
    })

    if (categoryFilter && categoryFilter !== 'all') {
      data = data.filter((item) => (item.expenditure_type || '') === categoryFilter)
    }
    
    // Filtru de locație
    if (locationFilter && locationFilter !== 'all') {
      data = data.filter((item) => (item.location_name || '') === locationFilter)
    }

    return data
  }, [expendituresData, department, categoryFilter, locationFilter, dateRange])

  const categories = useMemo(() => {
    const set = new Set()
    filteredData.forEach((item) => {
      if (item.expenditure_type) set.add(item.expenditure_type)
    })
    return Array.from(set).sort()
  }, [filteredData])
  
  // Locații unice pentru filtru - din datele ORIGINALE (nefiltrate), nu din filteredData!
  const uniqueLocations = useMemo(() => {
    const set = new Set()
    expendituresData.forEach((item) => {
      if (item.location_name && item.department_name === department) {
        // Verifică și dacă este în perioada selectată
        const itemDate = new Date(item.operational_date)
        const start = new Date(dateRange.startDate)
        const end = new Date(dateRange.endDate)
        if (itemDate >= start && itemDate <= end) {
          set.add(item.location_name)
        }
      }
    })
    return Array.from(set).sort()
  }, [expendituresData, department, dateRange])
  
  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.size > 0)
  }, [selectedItems])
  
  // Selectare multiplă
  const handleSelectAll = (checked) => {
    if (checked) {
      // Selectează TOATE elementele din filteredData, nu doar cele de pe pagina curentă
      setSelectedItems(new Set(filteredData.map(item => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }
  
  const handleSelectItem = (id, checked) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }
  
  // Ștergere multiplă
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    
    if (!window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.size} înregistrări?`)) return
    
    setBulkDeleting(true)
    try {
      let deleted = 0
      let errors = 0
      
      for (const id of selectedItems) {
        try {
          await axios.delete(`/api/expenditures/sql-table/${id}`, {
            data: { confirmDelete: true }
          })
          deleted++
        } catch (error) {
          console.error(`Error deleting ${id}:`, error)
          errors++
        }
      }
      
      if (deleted > 0) {
        toast.success(`${deleted} înregistrări șterse cu succes`)
      }
      if (errors > 0) {
        toast.error(`${errors} erori la ștergere`)
      }
      
      setSelectedItems(new Set())
      loadExpendituresData()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error(`Eroare la ștergere multiplă: ${error.message}`)
    } finally {
      setBulkDeleting(false)
    }
  }
  
  // Căutare duplicate SMART - caută după: suma, locație, LUNA (nu ziua!), departament, tip
  const handleSearchDuplicates = () => {
    setSearchingDuplicates(true)
    setDuplicateGroups([])
    setShowDuplicatesModal(false)
    setSelectedDuplicatesToKeep(new Map())
    
    try {
      // Găsește duplicatele bazate pe: LUNA + suma + locație + departament + tip
      const duplicatesMap = new Map()
      
      filteredData.forEach((row) => {
        // Normalizează valorile pentru comparație
        const amount = parseFloat(row.amount || 0).toFixed(2)
        const location = (row.location_name || '').trim().toLowerCase()
        const department = (row.department_name || '').trim().toLowerCase()
        const expenditureType = (row.expenditure_type || '').trim().toLowerCase()
        
        // Extrage LUNA și ANUL (nu ziua!)
        let monthYear = ''
        if (row.operational_date) {
          const date = new Date(row.operational_date)
          monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
        }
        
        // Cheie: LUNA + suma + locație + departament + tip
        const key = `${monthYear}_${amount}_${location}_${department}_${expenditureType}`
        
        if (!duplicatesMap.has(key)) {
          duplicatesMap.set(key, [])
        }
        duplicatesMap.get(key).push(row)
      })
      
      // Filtrează doar grupurile cu mai mult de 1 înregistrare
      const groups = Array.from(duplicatesMap.values())
        .filter(group => group.length > 1)
        .map((group, index) => ({
          id: `group-${index}`,
          items: group,
          // Prioritar: cel din BAT (data_source = 'bat_sync')
          priorityItem: group.find(item => item.data_source === 'bat_sync') || group[0]
        }))
      
      setDuplicateGroups(groups)
      
      // Selectează automat prioritar (cel din BAT sau primul)
      const initialSelection = new Map()
      groups.forEach(group => {
        const keepId = group.priorityItem.id
        initialSelection.set(group.id, new Set([keepId]))
      })
      setSelectedDuplicatesToKeep(initialSelection)
      
      if (groups.length > 0) {
        setShowDuplicatesModal(true)
        toast.success(`Găsite ${groups.length} grupuri de duplicate (${groups.reduce((sum, g) => sum + g.items.length, 0)} înregistrări)`)
      } else {
        toast.success('Nu s-au găsit duplicate')
      }
    } catch (error) {
      console.error('Error searching duplicates:', error)
      toast.error(`Eroare la căutarea duplicate-urilor: ${error.message}`)
    } finally {
      setSearchingDuplicates(false)
    }
  }
  
  // Toggle selecție pentru o înregistrare dintr-un grup
  const toggleDuplicateSelection = (groupId, itemId) => {
    setSelectedDuplicatesToKeep(prev => {
      const newMap = new Map(prev)
      const groupSelection = newMap.get(groupId) || new Set()
      const newSelection = new Set(groupSelection)
      
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId)
      } else {
        newSelection.add(itemId)
      }
      
      // Asigură-te că cel puțin unul este selectat
      if (newSelection.size === 0) {
        const group = duplicateGroups.find(g => g.id === groupId)
        if (group) {
          newSelection.add(group.priorityItem.id)
        }
      }
      
      newMap.set(groupId, newSelection)
      return newMap
    })
  }
  
  // Șterge duplicatele (păstrează doar cele selectate)
  const handleDeleteDuplicates = async () => {
    if (duplicateGroups.length === 0) return
    
    const idsToDelete = []
    duplicateGroups.forEach(group => {
      const keepIds = selectedDuplicatesToKeep.get(group.id) || new Set()
      group.items.forEach(item => {
        if (!keepIds.has(item.id)) {
          idsToDelete.push(item.id)
        }
      })
    })
    
    if (idsToDelete.length === 0) {
      toast.info('Nu sunt duplicate de șters (toate sunt selectate să fie păstrate)')
      return
    }
    
    const confirm = window.confirm(
      `Ești sigur că vrei să ștergi ${idsToDelete.length} duplicate?\nSe vor păstra ${duplicateGroups.reduce((sum, g) => sum + (selectedDuplicatesToKeep.get(g.id)?.size || 0), 0)} înregistrări.`
    )
    if (!confirm) return
    
    setDeletingDuplicates(true)
    try {
      toast.loading(`Se șterg ${idsToDelete.length} duplicate...`, { id: 'delete-duplicates' })
      await axios.post('/api/expenditures/sql-table/bulk-delete', { 
        ids: idsToDelete,
        confirmDelete: true
      })
      toast.success(`${idsToDelete.length} duplicate șterse cu succes!`, { id: 'delete-duplicates' })
      setShowDuplicatesModal(false)
      setDuplicateGroups([])
      setSelectedDuplicatesToKeep(new Map())
      loadExpendituresData() // Refresh data
    } catch (error) {
      console.error('Error deleting duplicates:', error)
      toast.error(`Eroare la ștergerea duplicate-urilor: ${error.response?.data?.error || error.message}`, { id: 'delete-duplicates' })
    } finally {
      setDeletingDuplicates(false)
    }
  }
  
  // Export Excel
  const handleExportExcel = () => {
    try {
      if (!paginatedData || paginatedData.length === 0) {
        toast.error('Nu există date de exportat')
        return
      }

      const wb = XLSX.utils.book_new()
      
      // Pregătește datele pentru export
      const exportData = []
      
      // Header row
      const header = ['Data', 'Locație', 'Tip', 'Descriere', 'Sursă', 'Sumă (RON)']
      exportData.push(header)
      
      // Date rows
      paginatedData.forEach(row => {
        exportData.push([
          row.operational_date ? new Date(row.operational_date).toLocaleDateString('ro-RO') : '-',
          row.location_name || '-',
          row.expenditure_type || '-',
          row.description || 'N/A',
          row.data_source === 'google_sheets' ? 'Google Sheets' : row.data_source === 'api_sync' ? 'API Extern' : row.data_source === 'bat_sync' ? 'BAT Sync' : 'Baza de date',
          row.amount || 0
        ])
      })
      
      // Creează worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData)
      
      // Setează lățimea coloanelor
      const colWidths = [
        { wch: 12 }, // Data
        { wch: 20 }, // Locație
        { wch: 25 }, // Tip
        { wch: 30 }, // Descriere
        { wch: 15 }, // Sursă
        { wch: 15 }  // Sumă
      ]
      ws['!cols'] = colWidths
      
      // Adaugă worksheet la workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Cheltuieli')
      
      // Generează nume fișier
      const fileName = `Cheltuieli_${department}_${dateRange.startDate}_${dateRange.endDate}.xlsx`
      
      // Exportă
      XLSX.writeFile(wb, fileName)
      
      toast.success('✅ Excel exportat cu succes!')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Eroare la export Excel')
    }
  }

  // Pagination calculations
  const paginatedData = useMemo(() => {
    if (rowsPerPage === 'all') {
      return filteredData
    }
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, rowsPerPage])

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all') return 1
    return Math.ceil(filteredData.length / rowsPerPage)
  }, [filteredData.length, rowsPerPage])

  const startIndex = rowsPerPage === 'all' ? 0 : (currentPage - 1) * rowsPerPage
  const endIndex = rowsPerPage === 'all' ? filteredData.length : Math.min(startIndex + rowsPerPage, filteredData.length)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, dateRange, department])

  // Reset to page 1 when rowsPerPage changes
  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value)
    setCurrentPage(1)
  }

  const availableDays = useMemo(() => {
    const daysSet = new Set()
    filteredData.forEach((item) => {
      if (item.operational_date) {
        const day = item.operational_date.split('T')[0]
        daysSet.add(day)
      }
    })
    return Array.from(daysSet).sort()
  }, [filteredData])

  // === DATA PENTRU GRAFICE (TREND + LOCAȚII) ===
  const trendData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    const isSingleMonth =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth()

    if (isSingleMonth) {
      const dayMap = {}
      filteredData.forEach((item) => {
        const dateObj = new Date(item.operational_date)
        const dayKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
          dateObj.getDate()
        ).padStart(2, '0')}`
        if (!dayMap[dayKey]) dayMap[dayKey] = 0
        dayMap[dayKey] += parseFloat(item.amount || 0)
      })

      return Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => {
          const [year, month, day] = key.split('-')
          const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          return {
            date: d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
            value: Math.round(value)
          }
        })
    }

    const monthMap = {}
    filteredData.forEach((item) => {
      const dateObj = new Date(item.operational_date)
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[monthKey]) monthMap[monthKey] = 0
      monthMap[monthKey] += parseFloat(item.amount || 0)
    })

    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, month] = key.split('-')
        const d = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          date: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
          value: Math.round(value)
        }
      })
  }, [filteredData, dateRange])

  const locationChartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const map = {}
    filteredData.forEach((item) => {
      const loc = item.location_name || 'Fără locație'
      if (!map[loc]) map[loc] = 0
      map[loc] += parseFloat(item.amount || 0)
    })

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  const locationSummary = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const map = {}
    filteredData.forEach((item) => {
      const loc = item.location_name || 'Fără locație'
      if (!map[loc]) {
        map[loc] = { total: 0, count: 0 }
      }
      map[loc].total += parseFloat(item.amount || 0)
      map[loc].count += 1
    })

    return Object.entries(map)
      .map(([location, info]) => ({ location, total: info.total, count: info.count }))
      .sort((a, b) => b.total - a.total)
  }, [filteredData])

  // Format currency - definit înainte de a fi folosit în useMemo
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0))
  }

  const detailInsights = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const total = filteredData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    const count = filteredData.length

    const byDay = {}
    filteredData.forEach((item) => {
      const key = item.operational_date?.split('T')[0]
      if (!key) return
      if (!byDay[key]) byDay[key] = 0
      byDay[key] += parseFloat(item.amount || 0)
    })

    const topDayEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]

    const insights = [
      {
        icon: '💰',
        title: 'Total cheltuieli pe această categorie',
        message: `În perioada selectată ai ${formatCurrency(total)} RON cheltuiți în ${department}${category ? ` / ${category}` : ''}.`,
        recommendation: ''
      },
      {
        icon: '🏬',
        title: 'Distribuția pe locații',
        message:
          locationSummary.length === 0
            ? 'Nu există suficiente date pe locații.'
            : `Cea mai mare parte a sumei vine din ${locationSummary[0].location} (${formatCurrency(
                locationSummary[0].total
              )} RON).`,
        recommendation: ''
      }
    ]

    if (topDayEntry) {
      const [day, value] = topDayEntry
      insights.push({
        icon: '📅',
        title: 'Zi cu vârf de cheltuieli',
        message: `Ziua cu cele mai mari cheltuieli este ${new Date(day).toLocaleDateString('ro-RO')} cu ${formatCurrency(
          value
        )} RON.`,
        recommendation: ''
      })
    }

    return insights
  }, [filteredData, department, category, locationSummary])

  if (!department) {
    return null
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenditures')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-slate-800 dark:text-slate-100 text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Cheltuieli</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Detalii cheltuială – {department}
                {category && ` / ${category}`}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Perioadă: {dateRange.startDate} – {dateRange.endDate}
              </p>
            </div>
          </div>
        </div>

        {/* Filters - Card de perioadă DEASUPRA grafurilor */}
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl shadow-xl border border-transparent relative z-[3000]">
          <div className="mb-4">
            {/* Input-uri de date */}
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2">
              {/* Date Inputs - Clasic și Simplu */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    De la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Până la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>

              {/* Săgeți Navigare Perioadă */}
              <div className="flex items-center gap-1 border-l border-r border-slate-200 dark:border-slate-700 px-3">
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() - diffDays - 1)
                    end.setDate(end.getDate() - diffDays - 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă anterioară"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() + diffDays + 1)
                    end.setDate(end.getDate() + diffDays + 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă următoare"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Text Perioadă Afișată */}
              <div className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.startDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {' – '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.endDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Butoane Rapide cu Iconițe și Text - Sub Input-uri */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
              {[
                { id: 'azi', label: 'Azi', icon: Clock },
                { id: 'saptamana-curenta', label: 'Săpt', icon: CalendarDays },
                { id: 'luna-curenta', label: 'Luna curentă', icon: Calendar },
                { id: 'luna-anterioara', label: 'Luna trecută', icon: CalendarRange },
                { id: 'anul-curent', label: 'Anul curent', icon: Calendar },
                { id: 'anul-trecut', label: 'Anul trecut', icon: Calendar },
                { id: 'toate', label: 'Toate', icon: Calendar }
              ].map((btn) => {
                const IconComponent = btn.icon
                return (
                  <button
                    key={btn.id}
                    onClick={() => applyQuickDateFilter(btn.id)}
                    className="relative inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    title={btn.label}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{btn.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">

            {categories.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tip cheltuială
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">Toate</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {uniqueLocations.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                  Locație
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">Toate locațiile</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Charts - 2 grafice pe același rând: evoluție + locații */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-[1]">
          {/* Trend */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6 relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Evoluție cheltuieli</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {dateRange.startDate} – {dateRange.endDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(
                    filteredData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  )}{' '}
                  RON
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end mt-1">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  Total perioadă
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${formatCurrency(value)} RON`, 'Cheltuieli']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuție pe locații */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg p-6 relative z-[1]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-green-500" />
              Distribuție pe locații
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={locationChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {locationChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'][index % 6]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [
                    `${formatCurrency(value)} RON (${((value / locationChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                    name
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => `${value} (${formatCurrency(locationChartData.find(item => item.name === value)?.value || 0)} RON)`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights simplificate pentru această cheltuială */}
        {detailInsights.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Analiză AI pentru această cheltuială</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {detailInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-slate-900/40 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {insight.icon} {insight.title}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">{insight.message}</p>
                  {insight.recommendation && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{insight.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabel sumar pe locații - locațiile pe COLOANE */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Sumar pe locații ({locationSummary.length})
            </h2>
            {/* Selector granularitate */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Grupare:</label>
              <select
                value={summaryGranularity}
                onChange={(e) => setSummaryGranularity(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
              >
                <option value="day">Zi</option>
                <option value="month">Lună</option>
                <option value="quarter">Trimestru</option>
                <option value="year">An</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
                    {summaryGranularity === 'day' ? 'Data' : 
                     summaryGranularity === 'month' ? 'Lună' : 
                     summaryGranularity === 'quarter' ? 'Trimestru' : 'An'}
                  </th>
                  {locationSummary.map((loc) => (
                    <th
                      key={loc.location}
                      className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {loc.location}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Grupăm datele pe zi/lună/trimestru/an și locații în funcție de granularitate
                  const byPeriod = {}
                  
                  filteredData.forEach((item) => {
                    if (!item.operational_date) return
                    
                    const dateObj = new Date(item.operational_date)
                    let periodKey = ''
                    let periodLabel = ''
                    
                    switch (summaryGranularity) {
                      case 'day':
                        periodKey = item.operational_date.split('T')[0]
                        periodLabel = dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
                        break
                      case 'month':
                        periodKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                        periodLabel = dateObj.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
                        break
                      case 'quarter':
                        const quarter = Math.floor(dateObj.getMonth() / 3) + 1
                        periodKey = `${dateObj.getFullYear()}-Q${quarter}`
                        periodLabel = `T${quarter} ${dateObj.getFullYear()}`
                        break
                      case 'year':
                        periodKey = String(dateObj.getFullYear())
                        periodLabel = String(dateObj.getFullYear())
                        break
                      default:
                        periodKey = item.operational_date.split('T')[0]
                        periodLabel = dateObj.toLocaleDateString('ro-RO')
                    }
                    
                    const loc = item.location_name || 'Fără locație'
                    if (!byPeriod[periodKey]) {
                      byPeriod[periodKey] = {
                        label: periodLabel,
                        locations: {}
                      }
                    }
                    if (!byPeriod[periodKey].locations[loc]) {
                      byPeriod[periodKey].locations[loc] = 0
                    }
                    byPeriod[periodKey].locations[loc] += parseFloat(item.amount || 0)
                  })

                  // Sortăm perioadele
                  const periods = Object.keys(byPeriod).sort()

                  return periods.map((periodKey) => {
                    const period = byPeriod[periodKey]
                    const totals = locationSummary.reduce((acc, loc) => {
                      acc[loc.location] = period.locations[loc.location] || 0
                      return acc
                    }, {})
                    const rowTotal = Object.values(totals).reduce((sum, val) => sum + val, 0)

                    return (
                      <tr
                        key={periodKey}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                          {period.label}
                        </td>
                        {locationSummary.map((loc) => (
                          <td
                            key={loc.location}
                            className="px-3 py-2 text-right text-slate-900 dark:text-slate-100"
                          >
                            {totals[loc.location] > 0 ? formatCurrency(totals[loc.location]) : '-'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(rowTotal)}
                        </td>
                      </tr>
                    )
                  })
                })()}
                {/* Rând Total */}
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 font-semibold">
                  <td className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Total</td>
                  {locationSummary.map((loc) => (
                    <td
                      key={loc.location}
                      className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100"
                    >
                      {formatCurrency(loc.total)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      locationSummary.reduce((sum, loc) => sum + loc.total, 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed table pe fiecare înregistrare */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Înregistrări detaliate ({filteredData.length})
            </h2>
            <div className="flex items-center gap-4">
              {/* Buton Căutare Duplicate SMART */}
              <button
                onClick={handleSearchDuplicates}
                disabled={searchingDuplicates}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 ${
                  showDuplicatesModal ? 'bg-orange-500 border-orange-400 shadow-lg' : 'bg-blue-500 border-blue-400 shadow-lg'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {searchingDuplicates ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{searchingDuplicates ? 'Se caută...' : 'Caută Duplicate'}</span>
              </button>
              
              {/* Buton Export Excel */}
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-green-500 to-emerald-500 border-green-400 shadow-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              
              {/* Buton Ștergere Multiplă */}
              {showBulkActions && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-red-500 border-red-400 shadow-lg disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{bulkDeleting ? 'Se șterg...' : `Șterge ${selectedItems.size}`}</span>
                </button>
              )}
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">Rânduri per pagină:</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => {
                    const newValue = e.target.value === 'all' ? 'all' : Number(e.target.value)
                    handleRowsPerPageChange(newValue)
                  }}
                  className="border-2 border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-slate-100 min-w-[100px]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value="all">Toate</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        title={selectedItems.size === filteredData.length ? 'Deselectează toate' : `Selectează toate ${filteredData.length} înregistrări`}
                      />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Data</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Locație</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Tip</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Descriere</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Sursă</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Sumă (RON)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      showDuplicates && duplicates.some(d => d.id === item.id) ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {item.operational_date
                        ? new Date(item.operational_date).toLocaleDateString('ro-RO')
                        : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {item.location_name || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {item.expenditure_type || '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      {item.description || <span className="text-slate-400 dark:text-slate-500">N/A</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        item.data_source === 'google_sheets'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : item.data_source === 'api_sync'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                      }`}>
                        {item.data_source === 'google_sheets' 
                          ? 'Google Sheets' 
                          : item.data_source === 'api_sync'
                          ? 'API Extern'
                          : item.data_source === 'bat_sync'
                          ? 'BAT Sync'
                          : 'Baza de date'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {rowsPerPage !== 'all' && totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {startIndex + 1}-{endIndex} din {filteredData.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                  disabled={currentPage === 1} 
                  className="px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                >
                  Înapoi
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-200 font-bold bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl shadow-lg">
                    Pag {currentPage}/{totalPages}
                  </span>
                </div>
                <button 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                  disabled={currentPage === totalPages} 
                  className="px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                >
                  Înainte
                </button>
              </div>
            </div>
          )}
          {rowsPerPage === 'all' && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Afișate toate {filteredData.length} înregistrări
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal pentru Duplicate SMART */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <AlertCircle className="w-6 h-6 mr-3 text-orange-500" />
                  Duplicate Găsite ({duplicateGroups.length} grupuri)
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Selectează ce înregistrări să păstrezi. Prioritar: cel din BAT (bifă verde).
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDuplicatesModal(false)
                  setDuplicateGroups([])
                  setSelectedDuplicatesToKeep(new Map())
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {duplicateGroups.map((group, groupIndex) => {
                  const keepIds = selectedDuplicatesToKeep.get(group.id) || new Set()
                  const totalAmount = group.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  
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
                  
                  return (
                    <div
                      key={group.id}
                      className="border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4 bg-orange-50/50 dark:bg-orange-900/10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Grup {groupIndex + 1} - {group.items.length} duplicate
                        </h3>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">Suma:</span> {formatCurrency(totalAmount)} RON • 
                          <span className="font-semibold ml-2">Locație:</span> {group.items[0]?.location_name || 'N/A'} • 
                          <span className="font-semibold ml-2">Luna:</span> {group.items[0]?.operational_date ? new Date(group.items[0].operational_date).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }) : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const isSelected = keepIds.has(item.id)
                          const isBAT = item.data_source === 'bat_sync'
                          const isPriority = item.id === group.priorityItem.id
                          
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? isBAT || isPriority
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center pt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleDuplicateSelection(group.id, item.id)}
                                  className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer"
                                />
                              </div>
                              
                              <div className="flex-1 grid grid-cols-6 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">ID</p>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">{item.id}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suma</p>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.amount)} RON</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Departament</p>
                                  <p className="text-slate-900 dark:text-slate-100">{item.department_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tip</p>
                                  <p className="text-slate-900 dark:text-slate-100">{item.expenditure_type || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sursă</p>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                    isBAT
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : item.data_source === 'google_sheets'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                                  }`}>
                                    {isBAT ? '🟢 BAT (Prioritar)' : item.data_source === 'google_sheets' ? 'Google Sheets' : item.data_source === 'api_sync' ? 'API Extern' : 'Altă sursă'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data</p>
                                  <p className="text-slate-900 dark:text-slate-100">{formatDate(item.operational_date)}</p>
                                </div>
                              </div>
                              
                              {isPriority && (
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                  <CheckSquare className="w-5 h-5" title="Prioritar - va fi păstrat" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {keepIds.size > 0 ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            ✓ {keepIds.size} înregistrare{keepIds.size > 1 ? 'i' : ''} selectată{keepIds.size > 1 ? 'e' : ''} pentru păstrare
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            ⚠️ Selectează cel puțin o înregistrare!
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Footer - Butoane */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Total de șters: <span className="font-semibold text-red-600 dark:text-red-400">
                    {duplicateGroups.reduce((sum, g) => {
                      const keepIds = selectedDuplicatesToKeep.get(g.id) || new Set()
                      return sum + (g.items.length - keepIds.size)
                    }, 0)}
                  </span> înregistrări
                </p>
                <p className="mt-1">
                  Total de păstrat: <span className="font-semibold text-green-600 dark:text-green-400">
                    {duplicateGroups.reduce((sum, g) => {
                      const keepIds = selectedDuplicatesToKeep.get(g.id) || new Set()
                      return sum + keepIds.size
                    }, 0)}
                  </span> înregistrări
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowDuplicatesModal(false)
                    setDuplicateGroups([])
                    setSelectedDuplicatesToKeep(new Map())
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteDuplicates}
                  disabled={deletingDuplicates || duplicateGroups.length === 0}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deletingDuplicates ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Se șterg...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Șterge Duplicatele</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ExpendituresDetail


