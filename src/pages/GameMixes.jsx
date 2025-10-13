import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import GameMixModal from '../components/modals/GameMixModal'
import GamesLibrary from './GamesLibrary'
import { Cherry, Plus, Search, Filter, Download, Upload, Edit, Trash2, Gamepad2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'

const GameMixes = () => {
  const { gameMixes, createItem, updateItem, deleteItem, refreshData } = useData()
  const [activeTab, setActiveTab] = useState('mixes')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  const handleAdd = () => {
    setSelectedItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  const handleSave = async (formData) => {
    try {
      console.log('🎮 GameMixes handleSave:', { selectedItem, formData })
      if (selectedItem) {
        console.log('🎮 Updating game mix:', selectedItem.id, formData)
        await updateItem('gameMixes', selectedItem.id, formData)
      } else {
        console.log('🎮 Creating game mix:', formData)
        await createItem('gameMixes', formData)
      }
      await refreshData()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving game mix:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Ești sigur că vrei să ștergi acest game mix?')) {
      try {
        await deleteItem('gameMixes', id)
      } catch (error) {
        console.error('Error deleting game mix:', error)
      }
    }
  }

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredGameMixes.map(item => item.id))
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
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} game mix-uri?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('gameMixes', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting game mixes:', error)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    // Implement bulk edit logic here
    console.log('Bulk edit for:', selectedItems)
  }

  // Filter and search
  const filteredGameMixes = gameMixes.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.provider?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const columns = [
    {
      key: 'name',
      label: 'Nume Game Mix',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg">
            <Cherry className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900">{item.name}</div>
            <div className="text-sm text-slate-500">ID: {item.id}</div>
          </div>
        </div>
      )
    },
    {
      key: 'provider',
      label: 'Furnizor',
      sortable: true,
      render: (item) => (
        <span className="bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
          {item.provider || 'N/A'}
        </span>
      )
    },
    {
      key: 'games',
      label: 'Jocuri',
      render: (item) => {
        const games = typeof item.games === 'string' ? JSON.parse(item.games) : item.games
        const gameCount = Array.isArray(games) ? games.length : 0
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-lg">
              {gameCount}
            </div>
            <span className="text-sm font-medium text-slate-700">
              {gameCount} jocuri
            </span>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => {
        const status = item.status?.toLowerCase() || ''
        const isActive = status === 'activ' || status === 'active'
        
        return (
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
            isActive
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
              : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
          }`}>
            {item.status}
          </span>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Data Creare',
      sortable: true,
      render: (item) => (
        <div className="text-sm text-slate-600">
          {new Date(item.created_at).toLocaleDateString('ro-RO')}
        </div>
      )
    },
    {
      key: 'created_by',
      label: 'Creat de',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">
            {item.created_by?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="text-sm font-medium text-slate-700">
            {item.created_by || 'Sistem'}
          </span>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl shadow-lg shadow-red-500/25">
              <Cherry className="w-6 h-6 text-white" />
            </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Management Game Mixes</h2>
                <p className="text-slate-600">Gestionează mixurile de jocuri și biblioteca de jocuri</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'mixes' && showBulkActions && (
                <>
                  <button
                    onClick={handleBulkEdit}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Bulk Edit ({selectedItems.length})</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="btn-danger flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Bulk Delete ({selectedItems.length})</span>
                  </button>
                </>
              )}
              {activeTab === 'mixes' && (
                <button
                  onClick={handleAdd}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Adaugă Game Mix</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('mixes')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all duration-200 ${
                activeTab === 'mixes'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Cherry className="w-4 h-4" />
              <span className="font-medium">Game Mixes</span>
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all duration-200 ${
                activeTab === 'games'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="font-medium">Biblioteca Jocuri</span>
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'mixes' ? (
          <>
            {/* Filters */}
            <div className="card p-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Caută game mix sau furnizor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Toate statusurile</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="btn-secondary flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button className="btn-secondary flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Import</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="card">
              <DataTable
                data={filteredGameMixes}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                searchTerm={searchTerm}
                emptyMessage="Nu există game mixes în sistem"
                selectedItems={selectedItems}
                onSelectAll={handleSelectAll}
                onSelectItem={handleSelectItem}
              />
            </div>
          </>
        ) : (
          <GamesLibrary />
        )}

        {/* Modal */}
        {isModalOpen && (
          <GameMixModal
            item={selectedItem}
            onClose={handleCloseModal}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}

export default GameMixes
