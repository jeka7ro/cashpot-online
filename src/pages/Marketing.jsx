import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { TrendingUp, Plus, Search, Eye, Calendar, Clock, Brain } from 'lucide-react'
import DataTable from '../components/DataTable'
import MarketingModal from '../components/modals/MarketingModal'
import MarketingDetailModal from '../components/modals/MarketingDetailModal'
import PromotionsWidget from '../components/PromotionsWidget'
import PromotionsCalendarWidget from '../components/PromotionsCalendarWidget'
import { useNavigate } from 'react-router-dom'

const Marketing = () => {
  const { promotions, loading, createItem, updateItem, deleteItem, createTestWeeklyTombola, loadAllData } = useData()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewingItem, setViewingItem] = useState(null)

  // Ensure data is loaded when arriving directly on Marketing (refresh/deep link)
  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update showBulkActions based on selectedItems
  React.useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Filter promotions
  const filteredPromotions = promotions.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredPromotions.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} promoții?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('promotions', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting:', error)
      }
    }
  }

  // Modal functions
  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    const itemName = item.title || item.name || 'această promoție'
    if (window.confirm(`Sigur vrei să ștergi ${itemName}?`)) {
      await deleteItem('promotions', item.id)
    }
  }

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('promotions', editingItem.id, data)
    } else {
      await createItem('promotions', data)
    }
    setShowModal(false)
    setEditingItem(null)

    // Notify widgets to refresh their own API data immediately
    try {
      window.dispatchEvent(new Event('promotionsUpdated'))
    } catch (e) {}
  }

  // Helper function to calculate days remaining/expired
  const calculateDaysInfo = (item) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Parse locations to get actual period per location
    let locations = []
    if (item.locations) {
      try {
        locations = typeof item.locations === 'string' ? JSON.parse(item.locations) : item.locations
      } catch (e) {
        console.error('Error parsing locations in calculateDaysInfo:', e)
      }
    }
    
    // If locations exist, use the first one's period, otherwise use global dates
    const firstLocation = locations && locations.length > 0 ? locations[0] : null
    const startDate = firstLocation?.start_date || item.start_date
    const endDate = firstLocation?.end_date || item.end_date
    
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(0, 0, 0, 0)
    
    // Check if not started yet
    if (start && start > today) {
      const daysUntilStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24))
      return {
        text: `Începe în ${daysUntilStart} ${daysUntilStart === 1 ? 'zi' : 'zile'}`,
        color: 'text-blue-600',
        icon: Calendar
      }
    }
    
    // Check if expired
    if (end && end < today) {
      const daysExpired = Math.ceil((today - end) / (1000 * 60 * 60 * 24))
      return {
        text: `Expirat de ${daysExpired} ${daysExpired === 1 ? 'zi' : 'zile'}`,
        color: 'text-red-600',
        icon: Clock
      }
    }
    
    // Active - show days until end
    if (end && end >= today) {
      const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
      return {
        text: `${daysRemaining} ${daysRemaining === 1 ? 'zi' : 'zile'} rămase`,
        color: 'text-green-600',
        icon: Clock
      }
    }
    
    return { text: '-', color: 'text-gray-400', icon: Clock }
  }

  // Define columns for promotions table
  const columns = [
    { 
      key: 'title', 
      label: 'TITLU PROMOȚIE', 
      sortable: true,
      render: (item) => (
        <button
          onClick={() => {
            setViewingItem(item)
            setShowDetailModal(true)
          }}
          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
        >
          {item.title || item.name || 'Fără titlu'}
        </button>
      )
    },
    { 
      key: 'description', 
      label: 'DESCRIERE', 
      sortable: false,
      render: (item) => (
        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">
          {item.description ? (
            item.description.length > 60 
              ? `${item.description.substring(0, 60)}...` 
              : item.description
          ) : 'Fără descriere'}
        </div>
      )
    },
    { 
      key: 'dates_period', 
      label: 'PERIOADA', 
      sortable: true,
      render: (item) => {
        // Parse locations to get actual period per location
        let locations = []
        if (item.locations) {
          try {
            locations = typeof item.locations === 'string' ? JSON.parse(item.locations) : item.locations
          } catch (e) {
            console.error('Error parsing locations:', e)
          }
        }
        
        // If locations exist, show the first one's period, otherwise use global dates
        const firstLocation = locations && locations.length > 0 ? locations[0] : null
        const startDate = firstLocation?.start_date || item.start_date
        const endDate = firstLocation?.end_date || item.end_date
        
        return (
          <div className="space-y-1">
            <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 mr-1 text-green-600" />
              {startDate ? new Date(startDate).toLocaleDateString('ro-RO') : 'N/A'}
            </div>
            <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 mr-1 text-red-600" />
              {endDate ? new Date(endDate).toLocaleDateString('ro-RO') : 'N/A'}
            </div>
          </div>
        )
      }
    },
    {
      key: 'days_info',
      label: 'ZILE',
      sortable: false,
      render: (item) => {
        const info = calculateDaysInfo(item)
        const Icon = info.icon
        return (
          <div className={`flex items-center space-x-1 font-medium text-sm ${info.color}`}>
            <Icon className="w-4 h-4" />
            <span>{info.text}</span>
          </div>
        )
      }
    },
    { 
      key: 'status', 
      label: 'STATUS', 
      sortable: true,
      render: (item) => {
        const today = new Date()
        const endDate = item.end_date ? new Date(item.end_date) : null
        const startDate = item.start_date ? new Date(item.start_date) : null
        const isActive = endDate && endDate >= today && (!startDate || startDate <= today)
        const isPending = startDate && startDate > today
        const isExpired = endDate && endDate < today
        
        let statusText = 'Inactiv'
        let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        
        if (isActive) {
          statusText = 'Activ'
          colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        } else if (isPending) {
          statusText = 'În așteptare'
          colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        } else if (isExpired) {
          statusText = 'Expirat'
          colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
            {statusText}
          </span>
        )
      }
    },
    { 
      key: 'rules_document', 
      label: 'REGULAMENT', 
      sortable: false,
      render: (item) => {
        if (!item.rules_document && !item.documents_url) {
          return (
            <div className="text-slate-400 text-sm">
              -
            </div>
          )
        }
        
        const documentUrl = item.rules_document || item.documents_url
        
        return (
          <div className="flex justify-center">
            <button
              onClick={() => window.open(documentUrl, '_blank')}
              className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
              title="Vizualizează regulamentul"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        )
      }
    },
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA', 
      sortable: true, 
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Marketing</h2>
                <p className="text-slate-600 dark:text-slate-400">Gestionare promoții și campanii</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/marketing-ai')}
                className="btn-secondary flex items-center space-x-2"
              >
                <Brain className="w-4 h-4" />
                <span>Analiză AI</span>
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă Promoție</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută în promoții..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Marketing Tools - Smart Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PromotionsWidget />
          <PromotionsCalendarWidget />
        </div>

        {/* Promotions Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există promoții</h3>
              <p className="text-slate-500">Adaugă prima promoție pentru a începe</p>
            </div>
          ) : (
            <DataTable
              data={filteredPromotions}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              moduleColor="blue"
            />
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <MarketingModal
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={handleSave}
          />
        )}

        {showDetailModal && (
          <MarketingDetailModal
            item={viewingItem}
            onClose={() => {
              setShowDetailModal(false)
              setViewingItem(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}

export default Marketing