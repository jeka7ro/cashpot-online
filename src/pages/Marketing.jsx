import React, { useState } from 'react'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { TrendingUp, Plus, Search } from 'lucide-react'
import DataTable from '../components/DataTable'
import MarketingModal from '../components/modals/MarketingModal'
import MarketingDetailModal from '../components/modals/MarketingDetailModal'

const Marketing = () => {
  const { promotions, loading, createItem, updateItem, deleteItem } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewingItem, setViewingItem] = useState(null)

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
      key: 'start_date', 
      label: 'DATA ÎNCEPERE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.start_date ? new Date(item.start_date).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
    { 
      key: 'end_date', 
      label: 'DATA SFÂRȘIT', 
      sortable: true,
      render: (item) => {
        const endDate = item.end_date ? new Date(item.end_date) : null
        const today = new Date()
        const isExpired = endDate && endDate < today
        
        return (
          <div className={`font-medium text-base ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
            {item.end_date ? new Date(item.end_date).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        )
      }
    },
    { 
      key: 'discount_percent', 
      label: 'REDUCERE', 
      sortable: true,
      render: (item) => (
        <div className="text-green-600 font-bold text-lg">
          {item.discount_percent ? `${item.discount_percent}%` : 'N/A'}
        </div>
      )
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
      key: 'created_by', 
      label: 'CREAT DE', 
      sortable: true, 
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.created_by || 'N/A'}
        </div>
      )
    },
    { 
      key: 'created_at', 
      label: 'DATA CREARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 text-sm">
          {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
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