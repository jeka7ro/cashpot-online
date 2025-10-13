import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { Trophy, Plus, Search, Upload, Download } from 'lucide-react'
import DataTable from '../components/DataTable'
import JackpotModal from '../components/modals/JackpotModal'

const Jackpots = () => {
  const { jackpots, loading, createItem, updateItem, deleteItem, exportData } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredJackpots.map(item => item.id))
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
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} elemente?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('jackpots', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting:', error)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    console.log('Bulk edit for:', selectedItems)
  }
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const filteredJackpots = jackpots.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.game?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'id', label: '#', sortable: true },
    { key: 'name', label: 'NUME JACKPOT', sortable: true },
    { key: 'game', label: 'JOC', sortable: true },
    { key: 'amount', label: 'SUMA', sortable: true },
    { key: 'location', label: 'LOCAȚIE', sortable: true },
    { key: 'status', label: 'STATUS', sortable: true },
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { key: 'created_at', label: 'DATA CREARE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
      </div>
    )},
    { key: 'actions', label: 'ACȚIUNI', sortable: false }
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sigur vrei să ștergi acest jackpot?')) {
      await deleteItem('jackpots', id)
    }
  }

  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleSave = async (itemData) => {
    if (editingItem) {
      await updateItem('jackpots', editingItem.id, itemData)
    } else {
      await createItem('jackpots', itemData)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleExport = () => {
    exportData('jackpots')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl shadow-lg shadow-yellow-500/25">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Management Jackpots</h2>
                <p className="text-slate-600">Gestionează jackpot-urile din sistem</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportă</span>
              </button>
              {showBulkActions && (
                <>
                  <button onClick={handleBulkEdit} className="btn-secondary flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Bulk Edit</span>
                  </button>
                  <button onClick={handleBulkDelete} className="btn-danger flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Bulk Delete</span>
                  </button>
                </>
              )}
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă Jackpot</span>
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
                placeholder="Caută jackpot-uri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <button className="btn-secondary flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Importă</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : filteredJackpots.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există jackpot-uri</h3>
              <p className="text-slate-500">Adaugă primul jackpot pentru a începe</p>
            </div>
          ) : (
            <DataTable
              data={filteredJackpots}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
          moduleColor="orange"
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <JackpotModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}

export default Jackpots
