import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import CabinetModal from '../components/modals/CabinetModal'
import PlatformModal from '../components/modals/PlatformModal'
import LocationPlatforms from '../components/LocationPlatforms'
import { Gamepad2, Plus, Search, Upload, Download, Cpu } from 'lucide-react'

const Cabinets = () => {
  const { cabinets, platforms, providers, createItem, updateItem, deleteItem, exportData, loading } = useData()
  const [showModal, setShowModal] = useState(false)
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
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
      setSelectedItems(filteredCabinets.map(item => item.id))
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
          await deleteItem('cabinets', id)
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
  const [activeTab, setActiveTab] = useState('cabinets') // 'cabinets' or 'platforms'

  // Cabinets filtering
  const filteredCabinets = cabinets.filter(cabinet =>
    cabinet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cabinet.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cabinet.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cabinet.platform?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Platforms filtering
  const filteredPlatforms = platforms?.filter(platform =>
    platform.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    platform.serial_numbers?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Cabinet columns
  const cabinetColumns = [
    {
      key: 'name',
      label: 'Nume Cabinet',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
            <Gamepad2 className="w-4 h-4 text-white" />
          </div>
          <div className="font-bold text-slate-900">{item.name}</div>
        </div>
      )
    },
    {
      key: 'provider',
      label: 'Furnizor',
      sortable: true,
      render: (item) => {
        const getProviderLogo = (cabinet) => {
          if (cabinet.provider_logo) {
            try {
              const logo = typeof cabinet.provider_logo === 'string' ? JSON.parse(cabinet.provider_logo) : cabinet.provider_logo
              return logo.file || logo.url || logo
            } catch (error) {
              return cabinet.provider_logo
            }
          }
          return null
        }
        
        const logoUrl = getProviderLogo(item)
        return (
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={item.provider_name || item.provider} 
                className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 bg-white shadow-md" 
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg"
              style={{ display: logoUrl ? 'none' : 'flex' }}
            >
              {(item.provider_name || item.provider)?.charAt(0) || 'F'}
            </div>
            <span className="text-purple-800 dark:text-purple-300 text-xs font-bold">
              {item.provider_name || item.provider || 'N/A'}
            </span>
          </div>
        )
      }
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true
    },
    {
      key: 'platform',
      label: 'Platformă',
      sortable: true,
      render: (item) => {
        const getPlatformAvatar = (cabinet) => {
          if (cabinet.platform_avatar_url && cabinet.platform_avatar_url.trim() !== '') {
            return cabinet.platform_avatar_url
          }
          if (cabinet.platform_avatar_file && cabinet.platform_avatar_file !== '{}' && cabinet.platform_avatar_file.trim() !== '') {
            return cabinet.platform_avatar_file
          }
          return null
        }
        
        const avatar = getPlatformAvatar(item)
        return (
          <div className="flex items-center space-x-3">
            {avatar ? (
              <img 
                src={avatar} 
                alt={item.platform_name || item.platform} 
                className="w-[60px] h-[30px] rounded object-contain border border-slate-200 bg-white shadow-sm" 
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className={`w-[60px] h-[30px] rounded flex items-center justify-center text-white font-bold shadow-sm ${avatar ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-cyan-500 to-blue-500'}`}
              style={{ display: avatar ? 'none' : 'flex' }}
            >
              <Cpu className={`w-5 h-5 ${avatar ? 'text-slate-600' : 'text-white'}`} />
            </div>
            <span className="text-cyan-800 dark:text-cyan-300 text-xs font-bold">
              {item.platform_name || item.platform || 'N/A'}
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
        const isActive = item.status?.toLowerCase() === 'activ' || item.status?.toLowerCase() === 'active'
        return (
          <span className={`px-4 py-2 rounded-2xl text-xs font-bold shadow-lg ${
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

  // State for expanded serials
  const [expandedPlatforms, setExpandedPlatforms] = useState({})

  const toggleSerials = (platformId) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }))
  }

  // Platform columns
  const platformColumns = [
    {
      key: 'name',
      label: 'Nume Platformă',
      sortable: true,
      render: (item) => {
        const getPlatformAvatar = (platform) => {
          if (platform.avatar_url && platform.avatar_url.trim() !== '') {
            return platform.avatar_url
          }
          if (platform.avatar_file && platform.avatar_file !== '{}' && platform.avatar_file.trim() !== '') {
            return platform.avatar_file
          }
          return null
        }
        
        const avatar = getPlatformAvatar(item)
        return (
          <div className="flex items-center space-x-3">
            {avatar ? (
              <img 
                src={avatar} 
                alt={item.name} 
                className="w-8 h-8 rounded-lg object-cover border-2 border-slate-200 bg-white shadow-md" 
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-white font-bold shadow-lg"
              style={{ display: avatar ? 'none' : 'flex' }}
            >
              <Cpu className="w-4 h-4 text-slate-600" />
            </div>
            <div className="font-bold text-slate-900">{item.name}</div>
          </div>
        )
      }
    },
    {
      key: 'provider',
      label: 'Furnizor',
      sortable: true,
      render: (item) => {
        if (!item.provider_name) {
          return <span className="text-slate-400 text-sm">-</span>
        }
        
        const getProviderLogo = (platform) => {
          if (platform.provider_logo) {
            try {
              const logo = typeof platform.provider_logo === 'string' ? JSON.parse(platform.provider_logo) : platform.provider_logo
              return logo.file || logo.url || logo
            } catch (error) {
              return platform.provider_logo
            }
          }
          return null
        }
        
        const logoUrl = getProviderLogo(item)
        return (
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={item.provider_name} 
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
              {item.provider_name?.charAt(0) || 'F'}
            </div>
            <div className="font-bold text-slate-900">
              {item.provider_name}
            </div>
          </div>
        )
      }
    },
    {
      key: 'serial_numbers',
      label: 'Numere Seriale',
      render: (item) => {
        // Split by comma OR newline, then trim and filter empty
        const serials = item.serial_numbers
          ?.split(/[,\n]+/)
          .map(s => s.trim())
          .filter(s => s) || []
        const isExpanded = expandedPlatforms[item.id]
        
        return (
          <div className="space-y-2">
            <button
              onClick={() => toggleSerials(item.id)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <span className="font-sans text-sm font-bold text-cyan-800">
                {serials.length} {serials.length === 1 ? 'serial' : 'seriale'}
              </span>
              <svg 
                className={`w-4 h-4 text-cyan-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isExpanded && (
              <div className="flex flex-wrap gap-1 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {serials.map((serial, idx) => (
                  <span key={idx} className="bg-white text-slate-700 px-2 py-1 rounded border border-slate-200 text-xs font-sans shadow-sm">
                    {serial}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => {
        const isActive = item.status?.toLowerCase() === 'activ' || item.status?.toLowerCase() === 'active'
        return (
          <span className={`px-4 py-2 rounded-2xl text-xs font-bold shadow-lg ${
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

  const handleAdd = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleAddPlatform = () => {
    setEditingItem(null)
    setShowPlatformModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    if (activeTab === 'cabinets') {
      setShowModal(true)
    } else {
      setShowPlatformModal(true)
    }
  }

  const handleSave = async (data) => {
    const entity = activeTab === 'cabinets' ? 'cabinets' : 'platforms'
    if (editingItem) {
      await updateItem(entity, editingItem.id, data)
    } else {
      await createItem(entity, data)
    }
    setShowModal(false)
    setShowPlatformModal(false)
  }

  const handleDelete = async (id) => {
    const entity = activeTab === 'cabinets' ? 'cabinets' : 'platforms'
    if (window.confirm(`Sigur vrei să ștergi acest ${activeTab === 'cabinets' ? 'cabinet' : 'platformă'}?`)) {
      await deleteItem(entity, id)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="card p-4">
          <div className="flex space-x-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => {
                setActiveTab('cabinets')
                setSearchTerm('')
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeTab === 'cabinets'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Gamepad2 size={20} />
                <span>CABINETE</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'cabinets' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cabinets.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('platforms')
                setSearchTerm('')
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeTab === 'platforms'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Cpu size={20} />
                <span>PLATFORME</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'platforms' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'
                }`}>
                  {platforms?.length || 0}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder={`Caută ${activeTab === 'cabinets' ? 'cabinete' : 'platforme'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-12"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => exportData(activeTab === 'cabinets' ? 'cabinets' : 'platforms')}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Export</span>
              </button>
              
              {showBulkActions && activeTab === 'cabinets' && (
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
                onClick={activeTab === 'cabinets' ? handleAdd : handleAddPlatform}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>{activeTab === 'cabinets' ? 'Adaugă Cabinet' : 'Adaugă Platformă'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'cabinets' ? (
          <div className="card p-6">
            <DataTable
              data={filteredCabinets}
              columns={cabinetColumns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
          moduleColor="blue"
            />
          </div>
        ) : (
          <LocationPlatforms 
            locationId={null} 
            locationName="Toate Platformele"
            hideSearchAndAdd={true}
          />
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <CabinetModal
          item={editingItem}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {showPlatformModal && (
        <PlatformModal
          item={editingItem}
          onClose={() => setShowPlatformModal(false)}
          onSave={handleSave}
        />
      )}
    </Layout>
  )
}

export default Cabinets
