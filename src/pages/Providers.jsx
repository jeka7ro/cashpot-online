import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import DataTable from '../components/DataTable'
import ProviderModal from '../components/modals/ProviderModal'
import ProviderDetailModal from '../components/modals/ProviderDetailModal'
import { Users, Plus, Search, Upload, Download, Edit, Trash2 } from 'lucide-react'

const Providers = () => {
  const { providers, games, createItem, updateItem, deleteItem, exportToExcel, exportToPDF, loading } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [viewingItem, setViewingItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Calculate games count for each provider
  const getGamesCountForProvider = (providerName) => {
    if (!games || !providerName) return 0
    
    return games.filter(game => 
      game.provider && game.provider.toLowerCase() === providerName.toLowerCase()
    ).length
  }

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredProviders.map(item => item.id))
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
          await deleteItem('providers', id)
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

  const filteredProviders = providers.filter(provider =>
    provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.contractType?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      label: 'Nume Furnizor',
      sortable: true,
      render: (item) => {
        const logoUrl = item.logo?.file || item.logo?.url
        
        return (
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={item.name} 
                className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 bg-white shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg"
              style={{ display: logoUrl ? 'none' : 'flex' }}
            >
              {item.name?.charAt(0) || 'F'}
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              {item.name}
            </div>
          </div>
        )
      }
    },
    {
      key: 'company',
      label: 'Companie',
      sortable: true,
      render: (item) => (
        <span className="text-slate-800 font-medium text-base">
          {item.company || 'N/A'}
        </span>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 font-medium text-base">{item.contact}</div>
          <div className="text-slate-600 font-medium text-base">{item.phone}</div>
        </div>
      )
    },
    {
      key: 'games_count',
      label: 'Nr. Jocuri',
      sortable: true,
      render: (item) => {
        const gamesCount = getGamesCountForProvider(item.name)
        return (
          <span className="text-slate-800 font-medium text-base">
            {gamesCount} jocuri
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
          <span className={`px-4 py-2 rounded-2xl text-base font-medium shadow-lg ${
            isActive
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/25' 
              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-500/25'
          }`}>
            {isActive ? 'Activ' : 'Inactiv'}
          </span>
        )
      }
    },
    {
      key: 'created_info',
      label: 'CREAT DE / DATA',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 font-medium text-base">
            {item.created_by || 'N/A'}
          </div>
          <div className="text-slate-500 text-sm">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Sigur doriți să ștergeți furnizorul "${item.name}"?`)) {
      await deleteItem('providers', item.id)
    }
  }

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('providers', editingItem.id, data)
    } else {
      await createItem('providers', data)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('providers')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('providers')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    }
  }

  const handleImport = () => {
    console.log('Import functionality to be implemented')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Caută furnizori..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && searchTerm.length > 0) {
                    // Auto-complete with first matching provider name
                    const match = providers.find(provider => 
                      provider.name?.toLowerCase().startsWith(searchTerm.toLowerCase())
                    )
                    if (match) {
                      setSearchTerm(match.name)
                    }
                  }
                }}
                className="input-field pl-12" 
              />
              {/* Autocomplete suggestions */}
              {searchTerm.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {providers
                    .filter(provider => 
                      provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      provider.contact?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((provider, index) => (
                      <button
                        key={provider.id}
                        onClick={() => setSearchTerm(provider.name)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-600 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 last:border-b-0"
                      >
                        {provider.name}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            <button 
              onClick={handleImport}
              className="btn-secondary flex items-center space-x-2"
            >
              <Upload size={16} />
              <span>Importă</span>
            </button>
            <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="providers"
              />
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
              onClick={handleAdd}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Adaugă Furnizor</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={filteredProviders}
          columns={columns}
          loading={loading.providers}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={(item) => {
            setViewingItem(item)
            setShowDetailModal(true)
          }}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          moduleColor="blue"
        />

        {/* Modal */}
        {showModal && (
          <ProviderModal
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={handleSave}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && (
          <ProviderDetailModal
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

export default Providers
