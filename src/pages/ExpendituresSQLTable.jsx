import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { Filter, Table2, Search, Loader2, ArrowLeft, ArrowRight, Pencil, Trash2, X, Save, Database, FileSpreadsheet, FileDown, CheckSquare, Square, AlertTriangle, Plus, Edit2, Calendar, Clock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'

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

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleString('ro-RO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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
  { value: 'electric_invoice', label: 'Facturi Electricitate' },
  { value: 'google_sheets', label: 'Google Sheets' },
  { value: 'manual', label: 'Manual' }
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
  const { user } = useAuth() // Pentru a obține informații despre utilizator
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
  const [pagination, setPagination] = useState(() => {
    try {
      const savedPageSize = localStorage.getItem('expenditures_sql_pageSize')
      return { 
        page: 1, 
        pageSize: savedPageSize ? (savedPageSize === 'all' ? 'all' : parseInt(savedPageSize)) : 50, 
        total: 0, 
        totalPages: 1, 
        totalAmount: 0 
      }
    } catch {
      return { page: 1, pageSize: 50, total: 0, totalPages: 1, totalAmount: 0 }
    }
  })

  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [allTableData, setAllTableData] = useState([]) // Toate datele pentru calculare tipuri filtrate
  const [deletingId, setDeletingId] = useState(null)
  const [exportingFormat, setExportingFormat] = useState(null)
  const [showAll, setShowAll] = useState(false) // Toggle pentru a afișa TOATE înregistrările ignorând filtrele
  
  // Selectare multiplă și ștergere multiplă
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  
  // Căutare duplicate SMART
  const [searchingDuplicates, setSearchingDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState([]) // Grupuri de duplicate
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
  const [selectedDuplicatesToKeep, setSelectedDuplicatesToKeep] = useState(new Map()) // Map<groupId, Set<id>> - ce să păstrăm
  const [deletingDuplicates, setDeletingDuplicates] = useState(false)
  
  // Pentru filtrare în cascadă în modalul de editare și filtrele principale
  const [departmentTypeMap, setDepartmentTypeMap] = useState(new Map()) // Map<department, Set<types>>
  const [mapVersion, setMapVersion] = useState(0) // Pentru a forța recalcularea useMemo
  
  // Pentru adăugare tip nou
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [addingType, setAddingType] = useState(false)
  
  // Pentru redenumire tip
  const [showRenameTypeModal, setShowRenameTypeModal] = useState(false)
  const [renameTypeName, setRenameTypeName] = useState('')
  const [renamingType, setRenamingType] = useState(false)
  const [typeToRename, setTypeToRename] = useState('')
  
  // Pentru bulk edit
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [bulkEditDepartment, setBulkEditDepartment] = useState('')
  const [bulkEditType, setBulkEditType] = useState('')
  const [bulkEditing, setBulkEditing] = useState(false)
  
  // Pentru confirmări custom (înlocuiește window.confirm)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ 
    message: '', 
    title: '',
    confirmText: 'Confirmă',
    cancelText: 'Anulează',
    onConfirm: null, 
    onCancel: null,
    type: 'danger' // 'danger' pentru ștergere, 'warning' pentru editare
  })

  // Helper pentru a afișa confirmare custom
  const showConfirm = (config) => {
    return new Promise((resolve) => {
      setConfirmConfig({
        ...config,
        onConfirm: () => {
          setShowConfirmModal(false)
          resolve(true)
        },
        onCancel: () => {
          setShowConfirmModal(false)
          resolve(false)
        }
      })
      setShowConfirmModal(true)
    })
  }
  
  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.size > 0)
  }, [selectedItems])

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

        // Handle different response formats (array or object with data property)
        const deptData = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.departments || deptRes.data?.data || [])
        const typeData = Array.isArray(typeRes.data) ? typeRes.data : (typeRes.data?.types || typeRes.data?.data || [])
        const locData = Array.isArray(locRes.data) ? locRes.data : (locRes.data?.locations || locRes.data?.data || [])
        
        const allDepartments = deptData.map((item) => typeof item === 'string' ? item : item.name).filter(Boolean)
        const allTypes = typeData.map((item) => typeof item === 'string' ? item : item.name).filter(Boolean)
        const allLocations = locData.map((item) => typeof item === 'string' ? item : item.name).filter(Boolean)

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

    // DEBUG: Log parametrii trimiși
    if (filters.dataSource === 'electric_invoice') {
      console.log('🔍 FRONTEND DEBUG - Request params:', params)
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

  // Calculează tipurile disponibile pentru fiecare departament din TOATE datele (nu doar cele filtrate)
  // PĂSTREAZĂ tipurile noi adăugate manual
  useEffect(() => {
    const fetchAllDepartmentTypes = async () => {
      try {
        // Fetch toate datele fără filtre pentru a construi maparea completă
        const response = await axios.get('/api/expenditures/sql-table', {
          params: {
            page: 1,
            pageSize: 'all', // Toate datele
            // Nu aplicăm filtre pentru a obține toate combinațiile
          }
        })
        
        if (response.data?.success && response.data.data) {
          // PĂSTREAZĂ maparea existentă (care poate conține tipuri noi adăugate manual)
          setDepartmentTypeMap((prevMap) => {
            const newMap = new Map(prevMap) // Copiază maparea existentă
            
            // Adaugă tipurile din baza de date
            response.data.data.forEach((row) => {
              const dept = row.department_name
              const type = row.expenditure_type
              if (dept && type) {
                if (!newMap.has(dept)) {
                  newMap.set(dept, new Set())
                }
                newMap.get(dept).add(type)
              }
            })
            
            console.log('✅ Mapare departament → tipuri actualizată:', newMap.size, 'departamente')
            return newMap
          })
        }
      } catch (error) {
        console.error('Eroare la încărcarea mapării departament → tipuri:', error)
        // Nu reseta maparea dacă există deja tipuri adăugate manual
      }
    }
    
    if (settingsReady) {
      fetchAllDepartmentTypes()
    }
  }, [settingsReady]) // Recalculează doar când setările sunt gata

  // Calculează tipurile disponibile pentru departamentul selectat în filtrele principale
  const availableTypesForFilter = useMemo(() => {
    if (filters.department === 'all') return types
    const typesForDept = departmentTypeMap.get(filters.department)
    if (typesForDept && typesForDept.size > 0) {
      return Array.from(typesForDept).sort()
    }
    // Dacă nu găsim tipuri în datele existente, folosim toate tipurile disponibile
    return types
  }, [filters.department, departmentTypeMap, types])

  // Calculează tipurile disponibile pentru departamentul selectat în editForm
  const availableTypesForDepartment = useMemo(() => {
    if (!editForm?.department_name) {
      console.log('⚠️ Nu există departament selectat în editForm')
      return types
    }
    const typesForDept = departmentTypeMap.get(editForm.department_name)
    console.log(`🔍 Tipuri pentru departament "${editForm.department_name}" (versiune ${mapVersion}):`, typesForDept ? Array.from(typesForDept) : 'nu există')
    if (typesForDept && typesForDept.size > 0) {
      const sorted = Array.from(typesForDept).sort()
      console.log(`✅ Returnăm ${sorted.length} tipuri pentru "${editForm.department_name}":`, sorted)
      return sorted
    }
    // Dacă nu găsim tipuri în datele existente, folosim toate tipurile disponibile
    console.log(`⚠️ Nu s-au găsit tipuri pentru "${editForm.department_name}", folosim toate tipurile:`, types)
    return types
  }, [editForm?.department_name, departmentTypeMap, types, mapVersion]) // Adăugat mapVersion pentru a forța recalcularea

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

  // Când se schimbă departamentul, verifică dacă tipul cheltuială este valid
  const handleDepartmentChange = (newDepartment) => {
    const newTypes = departmentTypeMap.get(newDepartment)
    const currentType = editForm?.expenditure_type
    
    // Dacă tipul curent nu este în lista de tipuri pentru noul departament, resetează-l
    let newType = currentType
    if (newTypes && !newTypes.has(currentType)) {
      newType = ''
    }
    
    setEditForm((prev) => ({
      ...prev,
      department_name: newDepartment,
      expenditure_type: newType
    }))
  }

  // Adaugă tip nou de cheltuială - automat asociat cu departamentul selectat și PĂSTRAT
  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Introdu numele tipului de cheltuială')
      return
    }

    if (!editForm?.department_name) {
      toast.error('Selectează mai întâi un departament')
      return
    }

    setAddingType(true)
    try {
      const newType = newTypeName.trim()
      const department = editForm.department_name

      // Verifică dacă tipul există deja pentru acest departament
      const existingTypes = departmentTypeMap.get(department)
      if (existingTypes && existingTypes.has(newType)) {
        toast.error(`Tipul "${newType}" există deja pentru departamentul "${department}"`)
        setAddingType(false)
        return
      }

      // Actualizează maparea departament → tipuri (PĂSTREAZĂ permanent pentru acest departament)
      setDepartmentTypeMap((prev) => {
        const newMap = new Map(prev)
        if (!newMap.has(department)) {
          newMap.set(department, new Set())
        }
        newMap.get(department).add(newType)
        const allTypes = Array.from(newMap.get(department))
        console.log(`✅ Tip "${newType}" adăugat și PĂSTRAT pentru departamentul "${department}"`)
        console.log(`📋 Toate tipurile pentru "${department}":`, allTypes)
        console.log(`📋 Mapare completă după adăugare:`, Array.from(newMap.entries()).map(([dept, types]) => [dept, Array.from(types)]))
        // Forțează recalcularea useMemo
        setMapVersion((v) => v + 1)
        return newMap
      })

      // Actualizează lista de tipuri globale (dacă nu există deja)
      if (!types.includes(newType)) {
        setTypes((prev) => {
          const updated = [...prev, newType].sort()
          console.log(`✅ Tip "${newType}" adăugat în lista globală de tipuri`)
          return updated
        })
      }

      // Așteaptă puțin pentru ca state-ul să se actualizeze, apoi setează tipul
      setTimeout(() => {
        setEditForm((prev) => {
          if (prev && prev.department_name === department) {
            console.log(`🔄 Actualizăm editForm cu noul tip: "${newType}"`)
            return {
              ...prev,
              expenditure_type: newType
            }
          }
          return prev
        })
      }, 100)

      toast.success(`Tip "${newType}" adăugat și asociat permanent cu departamentul "${department}"!`)
      setShowAddTypeModal(false)
      setNewTypeName('')
    } catch (error) {
      console.error('Error adding new type:', error)
      toast.error('Eroare la adăugarea tipului')
    } finally {
      setAddingType(false)
    }
  }

  // Redenumește tip de cheltuială - actualizează în toate locurile
  const handleRenameType = async () => {
    if (!renameTypeName.trim()) {
      toast.error('Introdu noul nume pentru tip')
      return
    }

    if (!editForm?.department_name) {
      toast.error('Selectează mai întâi un departament')
      return
    }

    if (renameTypeName.trim() === typeToRename) {
      toast.info('Numele este același')
      setShowRenameTypeModal(false)
      return
    }

    setRenamingType(true)
    try {
      const oldType = typeToRename
      const newType = renameTypeName.trim()
      const department = editForm.department_name

      // Verifică dacă noul nume există deja pentru acest departament
      const existingTypes = departmentTypeMap.get(department)
      if (existingTypes && existingTypes.has(newType)) {
        toast.error(`Tipul "${newType}" există deja pentru departamentul "${department}"`)
        setRenamingType(false)
        return
      }

      // Actualizează maparea departament → tipuri (înlocuiește vechiul nume cu noul)
      setDepartmentTypeMap((prev) => {
        const newMap = new Map(prev)
        if (newMap.has(department)) {
          const typesSet = newMap.get(department)
          if (typesSet.has(oldType)) {
            typesSet.delete(oldType)
            typesSet.add(newType)
            console.log(`✅ Tip "${oldType}" redenumit în "${newType}" pentru departamentul "${department}"`)
          }
        }
        return newMap
      })

      // Actualizează lista de tipuri globale (înlocuiește vechiul cu noul)
      setTypes((prev) => {
        const index = prev.indexOf(oldType)
        if (index !== -1) {
          const updated = [...prev]
          updated[index] = newType
          return updated.sort()
        }
        // Dacă nu există în lista globală, adaugă-l
        if (!prev.includes(newType)) {
          return [...prev, newType].sort()
        }
        return prev
      })

      // Actualizează tipul în formular
      setEditForm((prev) => ({
        ...prev,
        expenditure_type: newType
      }))

      toast.success(`Tip "${oldType}" redenumit în "${newType}"!`)
      setShowRenameTypeModal(false)
      setRenameTypeName('')
      setTypeToRename('')
    } catch (error) {
      console.error('Error renaming type:', error)
      toast.error('Eroare la redenumirea tipului')
    } finally {
      setRenamingType(false)
    }
  }

  const handleQuickFilter = (range) => {
    setFilters((prev) => ({ ...prev, startDate: range.startDate, endDate: range.endDate }))
    setPagination((prev) => ({ ...prev, page: 1 })) // NU mai setăm pageSize - păstrăm preferința utilizatorului
  }

  const handleDateChange = (range) => {
    setFilters((prev) => ({ ...prev, startDate: range.startDate, endDate: range.endDate }))
    setPagination((prev) => ({ ...prev, page: 1 })) // NU mai setăm pageSize - păstrăm preferința utilizatorului
  }

  // Format date local
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

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
    
    handleDateChange({ startDate, endDate })
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value }
      
      // Dacă selectezi "Facturi Electricitate", setează automat departamentul la "Electricitate"
      if (key === 'dataSource' && value === 'electric_invoice') {
        newFilters.department = 'Electricitate'
        console.log('✅ Auto-set department to Electricitate for electric_invoice')
      }
      // Dacă schimbi sursa de la "Facturi Electricitate" la altceva, resetează departamentul
      else if (key === 'dataSource' && prev.dataSource === 'electric_invoice' && value !== 'electric_invoice') {
        // Nu resetează departamentul - lasă utilizatorul să decidă
      }
      
      // Dacă se schimbă departamentul, resetează tipul dacă nu mai este valid
      if (key === 'department') {
        const typesForDept = departmentTypeMap.get(value)
        if (value !== 'all' && typesForDept && prev.type !== 'all') {
          // Verifică dacă tipul curent este valid pentru noul departament
          if (!typesForDept.has(prev.type)) {
            newFilters.type = 'all'
          }
        } else if (value === 'all') {
          // Dacă se selectează "Toate", păstrează tipul curent
        }
      }
      return newFilters
    })
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
      
      if (response.data?.success && response.data?.record) {
        const updatedRecord = response.data.record
        
        // Verifică dacă înregistrarea actualizată respectă filtrele curente
        const matchesFilters = 
          (filters.department === 'all' || updatedRecord.department_name === filters.department) &&
          (filters.type === 'all' || updatedRecord.expenditure_type === filters.type) &&
          (filters.location === 'all' || updatedRecord.location_name === filters.location) &&
          (filters.dataSource === 'all' || updatedRecord.data_source === filters.dataSource)
        
        if (matchesFilters) {
          // Dacă respectă filtrele, actualizează în listă
          setData((prev) => prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item)))
          toast.success('Înregistrare actualizată')
        } else {
          // Dacă nu respectă filtrele, reîncarcă datele pentru a o elimina din listă
          // și afișează un mesaj
          await fetchTableData()
          toast.success('Înregistrare actualizată. Nu mai apare în lista curentă din cauza filtrelor active.')
        }
        
        // Actualizează maparea departament → tipuri cu noile valori
        if (updatedRecord.department_name && updatedRecord.expenditure_type) {
          setDepartmentTypeMap((prev) => {
            const newMap = new Map(prev)
            if (!newMap.has(updatedRecord.department_name)) {
              newMap.set(updatedRecord.department_name, new Set())
            }
            newMap.get(updatedRecord.department_name).add(updatedRecord.expenditure_type)
            setMapVersion((v) => v + 1) // Forțează recalcularea
            return newMap
          })
        }
      } else {
        // Dacă nu avem răspuns valid, reîncarcă datele
        await fetchTableData()
        toast.success('Înregistrare actualizată')
      }
      
      setEditingRecord(null)
      setEditForm(null)
    } catch (error) {
      console.error('Error updating record:', error)
      toast.error('Nu am putut salva modificările')
    } finally {
      setSavingEdit(false)
    }
  }

  const handlePageSizeSelect = (value) => {
    const normalized = value === 'all' ? 'all' : Math.min(Math.max(parseInt(value, 10) || 50, 1), 500)
    // Salvează preferința în localStorage
    localStorage.setItem('expenditures_sql_pageSize', String(normalized))
    setPagination((prev) => ({
      ...prev,
      page: 1,
      pageSize: normalized
    }))
  }

  const handleDelete = async (record) => {
    if (!record) return
    const confirmed = await showConfirm({
      title: 'Confirmă ștergerea',
      message: `Ești sigur că vrei să ștergi înregistrarea din ${formatDate(record.operational_date)} (${formatCurrency(record.amount)} RON)?`,
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      type: 'danger'
    })
    if (!confirmed) return

    try {
      setDeletingId(record.id)
      await axios.delete(`/api/expenditures/sql-table/${record.id}`, {
        data: { confirmDelete: true }
      })
      toast.success('Înregistrare ștearsă')
      setData((prev) => prev.filter((item) => item.id !== record.id))
      setPagination((prev) => ({
        ...prev,
        total: Math.max(prev.total - 1, 0),
        totalAmount: Math.max(prev.totalAmount - Number(record.amount || 0), 0)
      }))
      // Remove from selectedItems if was selected
      const newSelected = new Set(selectedItems)
      newSelected.delete(record.id)
      setSelectedItems(newSelected)
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error('Nu am putut șterge înregistrarea')
    } finally {
      setDeletingId(null)
    }
  }
  
  // Selectare multiplă
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(data.map(item => item.id)))
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
    
    const confirmed = await showConfirm({
      title: 'Confirmă ștergerea multiplă',
      message: `Ești sigur că vrei să ștergi ${selectedItems.size} înregistrări? Această acțiune nu poate fi anulată!`,
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      type: 'danger'
    })
    if (!confirmed) return
    
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
      fetchTableData()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error(`Eroare la ștergere multiplă: ${error.message}`)
    } finally {
      setBulkDeleting(false)
    }
  }

  // Calculează tipurile disponibile pentru departamentul selectat în bulk edit
  const availableTypesForBulkEdit = useMemo(() => {
    if (!bulkEditDepartment) return types
    const typesForDept = departmentTypeMap.get(bulkEditDepartment)
    if (typesForDept && typesForDept.size > 0) {
      return Array.from(typesForDept).sort()
    }
    return types
  }, [bulkEditDepartment, departmentTypeMap, types, mapVersion])

  // Când se schimbă departamentul în bulk edit, resetează tipul dacă nu mai este valid
  const handleBulkEditDepartmentChange = (newDepartment) => {
    setBulkEditDepartment(newDepartment)
    const newTypes = departmentTypeMap.get(newDepartment)
    if (newTypes && bulkEditType && !newTypes.has(bulkEditType)) {
      setBulkEditType('')
    }
  }

  // Bulk edit - actualizează departament și tip pentru toate înregistrările selectate
  const handleBulkEdit = async () => {
    if (selectedItems.size === 0) {
      toast.error('Selectează cel puțin o înregistrare pentru editare')
      return
    }

    if (!bulkEditDepartment || !bulkEditType) {
      toast.error('Selectează departament și tip cheltuială')
      return
    }

    const confirmed = await showConfirm({
      title: 'Confirmă editarea în masă',
      message: `Ești sigur că vrei să actualizezi departamentul și tipul pentru ${selectedItems.size} înregistrări?\n\nDepartament: ${bulkEditDepartment}\nTip: ${bulkEditType}`,
      confirmText: 'Actualizează',
      cancelText: 'Anulează',
      type: 'warning'
    })
    if (!confirmed) return

    setBulkEditing(true)
    try {
      toast.loading(`Se actualizează ${selectedItems.size} înregistrări...`, { id: 'bulk-edit' })
      const idsToUpdate = Array.from(selectedItems)
      
      // Actualizează fiecare înregistrare
      let successCount = 0
      let failedCount = 0
      
      for (const id of idsToUpdate) {
        try {
          // Obține înregistrarea curentă pentru a păstra celelalte câmpuri
          const currentRecord = data.find(item => item.id === id)
          if (!currentRecord) {
            failedCount++
            continue
          }

          const payload = {
            operational_date: currentRecord.operational_date,
            amount: currentRecord.amount,
            location_name: currentRecord.location_name,
            department_name: bulkEditDepartment,
            expenditure_type: bulkEditType,
            description: currentRecord.description || ''
          }

          await axios.put(`/api/expenditures/sql-table/${id}`, payload)
          successCount++
        } catch (error) {
          console.error(`Error updating record ${id}:`, error)
          failedCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} înregistrări actualizate cu succes!${failedCount > 0 ? ` (${failedCount} eșuate)` : ''}`, { id: 'bulk-edit' })
        
        // Actualizează maparea departament → tipuri
        setDepartmentTypeMap((prev) => {
          const newMap = new Map(prev)
          if (!newMap.has(bulkEditDepartment)) {
            newMap.set(bulkEditDepartment, new Set())
          }
          newMap.get(bulkEditDepartment).add(bulkEditType)
          setMapVersion((v) => v + 1)
          return newMap
        })

        // Reîncarcă datele
        await fetchTableData()
        setSelectedItems(new Set())
        setShowBulkEditModal(false)
        setBulkEditDepartment('')
        setBulkEditType('')
      } else {
        toast.error('Nu s-au putut actualiza înregistrările', { id: 'bulk-edit' })
      }
    } catch (error) {
      console.error('Error bulk editing:', error)
      toast.error(`Eroare la actualizarea înregistrărilor: ${error.response?.data?.error || error.message}`, { id: 'bulk-edit' })
    } finally {
      setBulkEditing(false)
    }
  }
  
  // Căutare duplicate SMART - caută după: suma, locație, data (operational_date)
  const handleSearchDuplicates = async () => {
    setSearchingDuplicates(true)
    setDuplicateGroups([])
    setShowDuplicatesModal(false)
    setSelectedDuplicatesToKeep(new Map())
    
    try {
      // Încarcă toate datele pentru a găsi duplicatele - IGNORĂ TOATE FILTRELE!
      const params = {
        page: 1,
        pageSize: 'all',
        // NU aplicăm filtre - vrem TOATE datele pentru a găsi duplicatele
        startDate: undefined,
        endDate: undefined,
        department: undefined,
        type: undefined,
        location: undefined,
        dataSource: undefined,
        search: undefined
      }
      
      console.log('🔍 Căutare duplicate - încărcare date fără filtre...')
      const response = await axios.get('/api/expenditures/sql-table', { params })
      
      if (!response.data.success) {
        throw new Error('Nu s-au putut încărca datele')
      }
      
      const allRows = response.data.rows || []
      console.log('🔍 Date încărcate pentru căutare duplicate:', allRows.length, 'înregistrări')
      
      // Găsește duplicatele bazate pe: suma, locație, LUNA (nu ziua!), departament, tip
      const duplicatesMap = new Map()
      
      allRows.forEach((row, index) => {
        // Normalizează suma - gestionează atât punct cât și virgulă
        let amountStr = String(row.amount || 0).trim()
        // Elimină toate spațiile
        amountStr = amountStr.replace(/\s/g, '')
        
        // Dacă are virgulă, înlocuiește cu punct (format românesc: 1.234,56)
        if (amountStr.includes(',')) {
          // Format românesc: elimină punctele (separatori mii) și înlocuiește virgula cu punct
          amountStr = amountStr.replace(/\./g, '').replace(',', '.')
        }
        // Dacă are doar puncte, verifică dacă e format american (1,234.56) sau românesc (1.234)
        else if (amountStr.includes('.')) {
          // Dacă are mai multe puncte, e format românesc cu puncte ca separatori mii
          const parts = amountStr.split('.')
          if (parts.length > 2) {
            // Format românesc: elimină toate punctele
            amountStr = parts.join('')
          }
          // Altfel e format american (1,234.56) - lasă-l așa
        }
        
        // Parsează și normalizează la 2 zecimale
        const parsedAmount = parseFloat(amountStr)
        const amount = isNaN(parsedAmount) ? '0.00' : parsedAmount.toFixed(2)
        
        // Normalizează câmpurile text (elimină spații, lowercase, trim)
        const location = (row.location_name || '').trim().toLowerCase()
        const department = (row.department_name || '').trim().toLowerCase()
        const expenditureType = (row.expenditure_type || '').trim().toLowerCase()
        
        // Extrage LUNA și ANUL (nu ziua!)
        let monthYear = ''
        if (row.operational_date) {
          const date = new Date(row.operational_date)
          if (!isNaN(date.getTime())) {
            monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
          }
        }
        
        // Cheie: LUNA + suma + locație + departament + tip
        const key = `${monthYear}_${amount}_${location}_${department}_${expenditureType}`
        
        if (!duplicatesMap.has(key)) {
          duplicatesMap.set(key, [])
        }
        duplicatesMap.get(key).push(row)
      })
      
      // Debug: afișează toate cheile și grupurile pentru debugging
      console.log('🔍 Duplicate detection - All keys:', Array.from(duplicatesMap.keys()).slice(0, 20))
      
      // Debug: afișează statistici despre duplicate
      const groupsWithMultiple = Array.from(duplicatesMap.entries()).filter(([key, items]) => items.length > 1)
      console.log('🔍 Duplicate detection stats:', {
        totalRows: allRows.length,
        uniqueKeys: duplicatesMap.size,
        duplicateGroups: groupsWithMultiple.length,
        totalDuplicates: groupsWithMultiple.reduce((sum, [key, items]) => sum + items.length, 0)
      })
      
      if (groupsWithMultiple.length > 0) {
        console.log('✅ GĂSITE DUPLICATE! Sample duplicate groups (first 10):', groupsWithMultiple.slice(0, 10).map(([key, items]) => ({
          key,
          count: items.length,
          items: items.map(item => ({
            id: item.id,
            date: item.operational_date,
            amount: item.amount,
            location: item.location_name,
            department: item.department_name,
            type: item.expenditure_type,
            source: item.data_source
          }))
        })))
      } else {
        console.warn('⚠️ NU S-AU GĂSIT DUPLICATE! Verifică datele...')
        // Afișează câteva chei pentru debugging
        const sampleKeys = Array.from(duplicatesMap.keys()).slice(0, 10)
        console.log('🔍 Sample keys (first 10):', sampleKeys)
      }
      
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
      console.error('Search duplicates error:', error)
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
    
    const confirmed = await showConfirm({
      title: 'Confirmă ștergerea duplicatelor',
      message: `Ești sigur că vrei să ștergi ${idsToDelete.length} duplicate?\nSe vor păstra ${duplicateGroups.reduce((sum, g) => sum + (selectedDuplicatesToKeep.get(g.id)?.size || 0), 0)} înregistrări.`,
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      type: 'danger'
    })
    if (!confirmed) return
    
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
      fetchTableData() // Reîncarcă datele
    } catch (error) {
      console.error('Error deleting duplicates:', error)
      toast.error(`Eroare la ștergerea duplicate-urilor: ${error.response?.data?.error || error.message}`, { id: 'delete-duplicates' })
    } finally {
      setDeletingDuplicates(false)
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

          {/* Rând 1: Bară de Căutare + Filtre - Pe același rând */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Bară de Căutare - Ocupă spațiul rămas */}
            <div className="relative flex-1 min-w-[250px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Căutare
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Caută în Descriere, Locație, Departament, Tip, Sumă..."
                  className="w-full pl-10 pr-10 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  disabled={showAll}
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                    title="Șterge căutarea"
                  >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre Departament, Tip, Locație, Sursă */}
            <div className="flex items-end gap-3">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Departament
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tip
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  disabled={filters.department === 'all' ? false : availableTypesForFilter.length === 0}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  style={{ 
                    minWidth: '180px',
                    opacity: filters.department === 'all' ? 1 : (availableTypesForFilter.length === 0 ? 0.5 : 1)
                  }}
                >
                  <option value="all">Toate</option>
                  {availableTypesForFilter.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Locație
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Sursă
                </label>
                <select
                  value={filters.dataSource}
                  onChange={(e) => handleFilterChange('dataSource', e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  style={{ minWidth: '180px' }}
                >
                  {dataSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Toggle "Afișează toate" */}
              <button
                onClick={() => {
                  setShowAll(!showAll)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500 flex items-center gap-2"
                style={{ minWidth: '180px', height: '40px' }}
              >
                <Database className="w-4 h-4" />
                <span>{showAll ? 'Afișează toate' : 'Filtre active'}</span>
              </button>
            </div>
          </div>

          {/* Rând 2: Perioadă + Căutare + Info + Export - aliniate frumos pe un singur rând */}
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
                    value={filters.startDate}
                    onChange={(e) => handleDateChange({ startDate: e.target.value, endDate: filters.endDate })}
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
                    value={filters.endDate}
                    onChange={(e) => handleDateChange({ startDate: filters.startDate, endDate: e.target.value })}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>

              {/* Săgeți Navigare Perioadă */}
              <div className="flex items-center gap-1 border-l border-r border-slate-200 dark:border-slate-700 px-3">
                <button
                  onClick={() => {
                    const start = new Date(filters.startDate)
                    const end = new Date(filters.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() - diffDays - 1)
                    end.setDate(end.getDate() - diffDays - 1)
                    
                    handleDateChange({
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
                    const start = new Date(filters.startDate)
                    const end = new Date(filters.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() + diffDays + 1)
                    end.setDate(end.getDate() + diffDays + 1)
                    
                    handleDateChange({
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
                  {new Date(filters.startDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {' – '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(filters.endDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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

          {/* Rând 3: Info + Export */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="flex items-end gap-3 flex-shrink-0">
              <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap hidden lg:block">
                {pagination.total.toLocaleString('ro-RO')} înregistrări • {tableSummary.totalAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
              </div>
              
              {/* Buton căutare duplicate */}
              <button
                onClick={handleSearchDuplicates}
                disabled={searchingDuplicates}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 6px 18px rgba(245, 158, 11, 0.45)'
                }}
              >
                {searchingDuplicates ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="whitespace-nowrap">Caută Duplicate</span>
              </button>
              
              {/* Butoane acțiuni multiple */}
              {showBulkActions && (
                <>
                  <button
                    onClick={() => setShowBulkEditModal(true)}
                    disabled={bulkEditing}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    style={{
                      height: '40px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 6px 18px rgba(59, 130, 246, 0.45)'
                    }}
                  >
                    <Pencil className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Editare ({selectedItems.size})</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-xs font-semibold border transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    style={{
                      height: '40px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 6px 18px rgba(239, 68, 68, 0.45)'
                    }}
                  >
                    {bulkDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span className="whitespace-nowrap">Șterge {selectedItems.size}</span>
                  </button>
                </>
              )}
              
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.size > 0 && selectedItems.size === data.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </th>
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
                    <td colSpan={Object.keys(sortColumns).length + 4} className="py-12 text-center">
                      <div className="flex flex-col items-center space-y-3 text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Se încarcă datele SQL...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={Object.keys(sortColumns).length + 4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      <Database className="w-10 h-10 mx-auto mb-3 opacity-60" />
                      <p>Nu există înregistrări pentru filtrele selectate</p>
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(row.id)}
                          onChange={(e) => handleSelectItem(row.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
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
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{userLabel(row.updated_by)}</div>
                        <div>{formatDateTime(row.updated_at)}</div>
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
                  <td colSpan={1}></td>
                  <td className="px-4 py-3 text-right">Total pagină</td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{formatCurrency(tableSummary.totalAmount)}</td>
                  <td colSpan={10}></td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
                  <td colSpan={1}></td>
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
                <select
                  value={editForm.department_name || ''}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selectează departament</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block flex items-center justify-between">
                  <span>Tip cheltuială</span>
                  {editForm.department_name && (
                    <div className="flex items-center space-x-2">
                      {editForm.expenditure_type && (
                        <button
                          type="button"
                          onClick={() => {
                            setTypeToRename(editForm.expenditure_type)
                            setRenameTypeName(editForm.expenditure_type)
                            setShowRenameTypeModal(true)
                          }}
                          className="text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors flex items-center space-x-1"
                          title="Redenumește tipul"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs">Redenumește</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddTypeModal(true)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center space-x-1"
                        title="Adaugă tip nou"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs">Adaugă tip</span>
                      </button>
                    </div>
                  )}
                </label>
                <select
                  value={editForm.expenditure_type || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expenditure_type: e.target.value }))}
                  className="input-field"
                  disabled={!editForm.department_name}
                >
                  <option value="">Selectează tip cheltuială</option>
                  {availableTypesForDepartment.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
                Ultima actualizare: {formatDateTime(editingRecord?.updated_at)} • {userLabel(editingRecord?.updated_by)}
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

      {/* Modal pentru adăugare tip nou */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/70 backdrop-blur">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                <Plus className="w-5 h-5 mr-2 text-blue-500" /> Adaugă tip nou de cheltuială
              </h3>
              <button
                onClick={() => {
                  setShowAddTypeModal(false)
                  setNewTypeName('')
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Departament: <span className="font-bold text-blue-600 dark:text-blue-400">{editForm?.department_name || 'N/A'}</span>
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Nume tip cheltuială
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddNewType()
                    }
                  }}
                  className="input-field"
                  placeholder="Ex: Salarii personal curățenie"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowAddTypeModal(false)
                  setNewTypeName('')
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4 inline mr-2" /> Anulează
              </button>
              <button
                onClick={handleAddNewType}
                disabled={addingType || !newTypeName.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingType ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pentru redenumire tip */}
      {showRenameTypeModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/70 backdrop-blur">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                <Edit2 className="w-5 h-5 mr-2 text-orange-500" /> Redenumește tip cheltuială
              </h3>
              <button
                onClick={() => {
                  setShowRenameTypeModal(false)
                  setRenameTypeName('')
                  setTypeToRename('')
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Departament: <span className="font-bold text-blue-600 dark:text-blue-400">{editForm?.department_name || 'N/A'}</span>
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Nume vechi
                </label>
                <input
                  type="text"
                  value={typeToRename}
                  disabled
                  className="input-field bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Nume nou
                </label>
                <input
                  type="text"
                  value={renameTypeName}
                  onChange={(e) => setRenameTypeName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameType()
                    }
                  }}
                  className="input-field"
                  placeholder="Introdu noul nume"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowRenameTypeModal(false)
                  setRenameTypeName('')
                  setTypeToRename('')
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4 inline mr-2" /> Anulează
              </button>
              <button
                onClick={handleRenameType}
                disabled={renamingType || !renameTypeName.trim() || renameTypeName.trim() === typeToRename}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renamingType ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit2 className="w-4 h-4 mr-2" />
                )}
                Redenumește
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pentru Bulk Edit */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/70 backdrop-blur">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                <Pencil className="w-5 h-5 mr-2 text-blue-500" /> Editare în masă ({selectedItems.size} înregistrări)
              </h3>
              <button
                onClick={() => {
                  setShowBulkEditModal(false)
                  setBulkEditDepartment('')
                  setBulkEditType('')
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{selectedItems.size}</strong> înregistrări selectate vor fi actualizate cu noul departament și tip.
                </p>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Departament
                </label>
                <select
                  value={bulkEditDepartment}
                  onChange={(e) => handleBulkEditDepartmentChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selectează departament</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Tip cheltuială
                </label>
                <select
                  value={bulkEditType}
                  onChange={(e) => setBulkEditType(e.target.value)}
                  className="input-field"
                  disabled={!bulkEditDepartment}
                >
                  <option value="">Selectează tip cheltuială</option>
                  {availableTypesForBulkEdit.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowBulkEditModal(false)
                  setBulkEditDepartment('')
                  setBulkEditType('')
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4 inline mr-2" /> Anulează
              </button>
              <button
                onClick={handleBulkEdit}
                disabled={bulkEditing || !bulkEditDepartment || !bulkEditType}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkEditing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Pencil className="w-4 h-4 mr-2" />
                )}
                Actualizează {selectedItems.size} înregistrări
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal pentru Duplicate SMART */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-3 text-orange-500" />
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
                          <span className="font-semibold ml-2">Data:</span> {formatDate(group.items[0]?.operational_date)}
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
                                    {isBAT ? '🟢 BAT (Prioritar)' : item.data_source === 'google_sheets' ? 'Google Sheets' : 'Altă sursă'}
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

      {/* Modal pentru Confirmări Custom (înlocuiește window.confirm) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/70 backdrop-blur">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-semibold flex items-center ${
                confirmConfig.type === 'danger' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {confirmConfig.type === 'danger' ? (
                  <AlertTriangle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2" />
                )}
                {confirmConfig.title || 'Confirmă acțiunea'}
              </h3>
              <button
                onClick={() => {
                  if (confirmConfig.onCancel) confirmConfig.onCancel()
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {confirmConfig.message}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  if (confirmConfig.onCancel) confirmConfig.onCancel()
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {confirmConfig.cancelText || 'Anulează'}
              </button>
              <button
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm()
                }}
                className={`px-4 py-2 rounded-lg text-white flex items-center ${
                  confirmConfig.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {confirmConfig.confirmText || 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ExpendituresSQLTable
