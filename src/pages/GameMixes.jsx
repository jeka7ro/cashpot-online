import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import GameMixModal from '../components/modals/GameMixModal'
import GamesLibrary from './GamesLibrary'
import { Cherry, Plus, Search, Filter, Download, Upload, Edit, Trash2, Gamepad2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'

const GameMixes = () => {
  const navigate = useNavigate()
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
        <div>
          <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
          <div className="text-[11px] text-slate-500">ID: {item.id}</div>
        </div>
      )
    },
    {
      key: 'provider',
      label: 'Furnizor',
      sortable: true,
      render: (item) => (
        <span className="text-xs font-semibold text-slate-700">
          {item.provider || '-'}
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
          <span className="text-sm font-medium text-slate-700">
            {gameCount}
          </span>
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
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border ${
            isActive
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {item.status}
          </span>
        )
      }
    },
    {
      key: 'created_info',
      label: 'Creat De / Data',
      sortable: true,
      render: (item) => (
        <div>
          <div className="text-slate-800 font-medium text-[13px]">
            {item.created_by || '-'}
          </div>
          <div className="text-slate-500 text-[11px]">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : '-'}
          </div>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-md">
                <Gamepad2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Management Game Mixes</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gestionează mixurile și biblioteca de jocuri</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                <button
                  onClick={() => setActiveTab('mixes')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                    activeTab === 'mixes'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Game Mixes
                </button>
                <button
                  onClick={() => setActiveTab('games')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                    activeTab === 'games'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Biblioteca Jocuri
                </button>
              </div>

              {activeTab === 'mixes' && showBulkActions && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleBulkEdit}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition-colors border border-slate-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="font-semibold">Bulk Edit ({selectedItems.length})</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs transition-colors border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">Bulk Delete ({selectedItems.length})</span>
                  </button>
                </div>
              )}

              {activeTab === 'mixes' && (
                <button
                  onClick={handleAdd}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs transition-colors shadow-sm font-semibold tracking-wide"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adaugă Game Mix</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'mixes' ? (
          <>
            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative w-64 text-sm">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Caută game mix..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded px-3 py-1.5 outline-none focus:border-slate-400 cursor-pointer"
                    >
                      <option value="all">Toate statusurile</option>
                      <option value="Activ">Activ</option>
                      <option value="Inactiv">Inactiv</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded text-xs font-semibold uppercase tracking-wide transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded text-xs font-semibold uppercase tracking-wide transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <DataTable
                data={filteredGameMixes}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRowClick={(item) => navigate(`/game-mixes/${item.id}`)}
                searchTerm={searchTerm}
                emptyMessage="Nu există game mixes în sistem"
                selectedItems={selectedItems}
                onSelectAll={handleSelectAll}
                onSelectItem={handleSelectItem}
          moduleColor="blue"
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
