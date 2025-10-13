import React, { useState, useEffect, useCallback } from 'react'
import { History, Filter, Search, Download, Calendar, User, ArrowLeft, Clock, Database } from 'lucide-react'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const SlotHistory = () => {
  const navigate = useNavigate()
  const { slots, users, loading: dataContextLoading } = useData()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    slot_id: '',
    serial_number: '',
    field_name: '',
    user_id: '',
    username: '',
    start_date: '',
    end_date: '',
    change_type: '',
  })
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    currentPage: 1,
    totalPages: 1,
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: (pagination.currentPage - 1) * pagination.limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      }

      // Clean up empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key]
        }
      })

      const response = await axios.get('/api/slot-history', { params })
      setHistory(response.data.data || response.data.history || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || response.data.total || 0,
        totalPages: Math.ceil((response.data.pagination?.total || response.data.total || 0) / prev.limit),
      }))
    } catch (err) {
      console.error('Error fetching slot history:', err)
      setError('Eroare la încărcarea istoricului sloturilor.')
      toast.error('Eroare la încărcarea istoricului sloturilor.')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, pagination.currentPage, sortBy, sortOrder])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
    setPagination(prev => ({ ...prev, currentPage: 1, offset: 0 })) // Reset pagination on filter change
  }

  // Helper function to format date to YYYY-MM-DD in local timezone
  const formatLocalDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to check which quick filter is active
  const getActiveQuickFilter = () => {
    if (!filters.start_date || !filters.end_date) return 'all'
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayStr = formatLocalDate(today)
    
    // Check for "today"
    if (filters.start_date === todayStr && filters.end_date === todayStr) {
      return 'today'
    }
    
    // Check for "thisWeek"
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() + diff)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    if (filters.start_date === formatLocalDate(startOfWeek) && 
        filters.end_date === formatLocalDate(endOfWeek)) {
      return 'thisWeek'
    }
    
    // Check for "thisMonth"
    const startOfMonth = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
    const endOfMonth = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    if (filters.start_date === startOfMonth && filters.end_date === endOfMonth) {
      return 'thisMonth'
    }
    
    // Check for "thisYear"
    const startOfYear = formatLocalDate(new Date(now.getFullYear(), 0, 1))
    const endOfYear = formatLocalDate(new Date(now.getFullYear(), 11, 31))
    if (filters.start_date === startOfYear && filters.end_date === endOfYear) {
      return 'thisYear'
    }
    
    // Check for "lastYear"
    const startOfLastYear = formatLocalDate(new Date(now.getFullYear() - 1, 0, 1))
    const endOfLastYear = formatLocalDate(new Date(now.getFullYear() - 1, 11, 31))
    if (filters.start_date === startOfLastYear && filters.end_date === endOfLastYear) {
      return 'lastYear'
    }
    
    return 'custom'
  }

  const handleQuickDateFilter = (period) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    let startDate = ''
    let endDate = ''
    
    switch (period) {
      case 'today':
        // Pentru "azi", folosim intervalul de la începutul zilei până la sfârșitul zilei (timezone local)
        startDate = formatLocalDate(today)
        endDate = formatLocalDate(today)
        break
      case 'thisWeek':
        // Luni = începutul săptămânii
        const startOfWeek = new Date(today)
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Duminica = 0, deci ajustăm
        startOfWeek.setDate(today.getDate() + diff)
        startDate = formatLocalDate(startOfWeek)
        // Duminică = sfârșitul săptămânii
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endDate = formatLocalDate(endOfWeek)
        break
      case 'thisMonth':
        // Prima zi a lunii curente
        startDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
        // Ultima zi a lunii curente
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endDate = formatLocalDate(endOfMonth)
        break
      case 'thisYear':
        // 1 Ianuarie anul curent
        startDate = formatLocalDate(new Date(now.getFullYear(), 0, 1))
        // 31 Decembrie anul curent
        const endOfYear = new Date(now.getFullYear(), 11, 31)
        endDate = formatLocalDate(endOfYear)
        break
      case 'lastYear':
        // 1 Ianuarie anul precedent
        startDate = formatLocalDate(new Date(now.getFullYear() - 1, 0, 1))
        // 31 Decembrie anul precedent
        const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31)
        endDate = formatLocalDate(endOfLastYear)
        break
      case 'all':
        startDate = ''
        endDate = ''
        break
    }
    
    setFilters(prev => ({ ...prev, start_date: startDate, end_date: endDate }))
    setPagination(prev => ({ ...prev, currentPage: 1, offset: 0 }))
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(column)
      setSortOrder('ASC')
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage, offset: (newPage - 1) * prev.limit }))
    }
  }

  const getSlotSerialNumber = (slotId, serialNumber = null) => {
    // First try to use the serial_number from history data
    if (serialNumber) {
      return serialNumber
    }
    // Fallback to finding the slot in current slots array
    const slot = slots?.find(s => s.id === slotId)
    return slot ? slot.serial_number : 'N/A'
  }

  const getUsername = (userId) => {
    const user = users?.find(u => u.id === userId)
    return user ? user.username : 'Sistem'
  }

  const getFieldBadgeClass = (fieldName) => {
    switch (fieldName.toLowerCase()) {
      case 'location':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'status':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'game_mix':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'serial_number':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
      case 'provider':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'cabinet':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Da' : 'Nu'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  if (dataContextLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă istoricul modificărilor...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
            <button
              onClick={() => fetchHistory()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Reîncearcă
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <History className="w-6 h-6 mr-3 text-indigo-600" />
            Istoric Modificări Sloturi
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi
          </button>
        </div>

        {/* Filter and Search Section */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg shadow-inner mb-6">
          {/* Quick Date Filters */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Filtre rapide:</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickDateFilter('today')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  getActiveQuickFilter() === 'today'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                } border border-slate-300 dark:border-slate-600`}
              >
                Azi
              </button>
              <button
                onClick={() => handleQuickDateFilter('thisWeek')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  getActiveQuickFilter() === 'thisWeek'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                } border border-slate-300 dark:border-slate-600`}
              >
                Săptămâna curentă
              </button>
              <button
                onClick={() => handleQuickDateFilter('thisMonth')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  getActiveQuickFilter() === 'thisMonth'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                } border border-slate-300 dark:border-slate-600`}
              >
                Luna curentă
              </button>
              <button
                onClick={() => handleQuickDateFilter('thisYear')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  getActiveQuickFilter() === 'thisYear'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                } border border-slate-300 dark:border-slate-600`}
              >
                Anul curent
              </button>
              <button
                onClick={() => handleQuickDateFilter('lastYear')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  getActiveQuickFilter() === 'lastYear'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                } border border-slate-300 dark:border-slate-600`}
              >
                Anul precedent
              </button>
              <button
                onClick={() => handleQuickDateFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  getActiveQuickFilter() === 'all'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                } border border-slate-300 dark:border-slate-600`}
              >
                Toate
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="serial_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Număr Serie Slot
              </label>
              <input
                type="text"
                name="serial_number"
                id="serial_number"
                value={filters.serial_number}
                onChange={handleFilterChange}
                placeholder="Caută după număr serie"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="field_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Câmp Modificat
              </label>
              <input
                type="text"
                name="field_name"
                id="field_name"
                value={filters.field_name}
                onChange={handleFilterChange}
                placeholder="Ex: location, status"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Utilizator
              </label>
              <input
                type="text"
                name="username"
                id="username"
                value={filters.username}
                onChange={handleFilterChange}
                placeholder="Nume utilizator"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="change_type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tip Modificare
              </label>
              <select
                name="change_type"
                id="change_type"
                value={filters.change_type}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="">Toate</option>
                <option value="CREATE">Creare</option>
                <option value="UPDATE">Actualizare</option>
                <option value="DELETE">Ștergere</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data Început
              </label>
              <input
                type="date"
                name="start_date"
                id="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data Sfârșit
              </label>
              <input
                type="date"
                name="end_date"
                id="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700 flex items-center">
            <Clock className="w-6 h-6 text-indigo-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Modificări</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{pagination.total}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700 flex items-center">
            <Database className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sloturi Modificate</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {new Set(history.map(item => item.slot_id)).size}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700 flex items-center">
            <User className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Utilizatori Unici</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {new Set(history.map(item => item.user_id)).size}
              </p>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  Data
                  {sortBy === 'created_at' && (
                    <span className="ml-1">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('serial_number')}
                >
                  Slot
                  {sortBy === 'serial_number' && (
                    <span className="ml-1">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('field_name')}
                >
                  Câmp
                  {sortBy === 'field_name' && (
                    <span className="ml-1">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Valoare Veche
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Valoare Nouă
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('username')}
                >
                  Utilizator
                  {sortBy === 'username' && (
                    <span className="ml-1">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('change_type')}
                >
                  Tip
                  {sortBy === 'change_type' && (
                    <span className="ml-1">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-4 text-center text-slate-500 dark:text-slate-400">
                    Nu s-au găsit modificări.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {new Date(item.created_at).toLocaleString('ro-RO')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      <button onClick={() => navigate(`/slots/${item.slot_id}`)} className="hover:underline">
                        {item.slot_serial || getSlotSerialNumber(item.slot_id, item.serial_number)}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getFieldBadgeClass(item.field_name)}`}>
                        {item.field_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {renderValue(item.old_value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {renderValue(item.new_value)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {item.username || getUsername(item.user_id)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.change_type === 'CREATE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : item.change_type === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {item.change_type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <nav
            className="flex items-center justify-between px-4 py-3 sm:px-6 mt-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700"
            aria-label="Pagination"
          >
            <div className="flex-1 flex justify-between sm:justify-end">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Următor
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Afișez{' '}
                  <span className="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span>
                  {' '}până la{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.total)}
                  </span>
                  {' '}din{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}rezultate
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      aria-current={page === pagination.currentPage ? 'page' : undefined}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.currentPage
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-400'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </nav>
        )}

        {/* Export CSV Button */}
        <div className="mt-6 text-right">
          <button
            // onClick={handleExportCSV} // Implement CSV export logic later
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportă CSV
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default SlotHistory