import React, { useState, useEffect } from 'react'
import { Cpu, Plus, Search, Eye, Edit, Trash2, Monitor, HardDrive } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import PlatformModal from './modals/PlatformModal'

const LocationPlatforms = ({ locationId, locationName, hideSearchAndAdd = false }) => {
  const { platforms, createItem, updateItem, deleteItem } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter platforms for this location
  const filteredPlatforms = platforms.filter(platform => 
    platform.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    platform.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    platform.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    platform.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddPlatform = () => {
    setEditingPlatform(null)
    setShowAddModal(true)
  }

  const handleViewPlatform = (platform) => {
    console.log('View platform:', platform)
  }

  const handleEditPlatform = (platform) => {
    setEditingPlatform(platform)
    setShowAddModal(true)
  }

  const handleDeletePlatform = async (platform) => {
    if (window.confirm(`Sigur doriți să ștergeți platforma "${platform.name}"?`)) {
      try {
        await deleteItem('platforms', platform.id)
      } catch (error) {
        console.error('Error deleting platform:', error)
      }
    }
  }

  const handleSavePlatform = async (platformData) => {
    try {
      if (editingPlatform) {
        await updateItem('platforms', editingPlatform.id, platformData)
      } else {
        await createItem('platforms', platformData)
      }
      setShowAddModal(false)
      setEditingPlatform(null)
    } catch (error) {
      console.error('Error saving platform:', error)
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Gaming':
        return 'bg-purple-100 text-purple-800'
      case 'Server':
        return 'bg-blue-100 text-blue-800'
      case 'Workstation':
        return 'bg-green-100 text-green-800'
      case 'Terminal':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Inactive':
        return 'bg-red-100 text-red-800'
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'Offline':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Gaming':
        return <Cpu className="w-6 h-6 text-white" />
      case 'Server':
        return <HardDrive className="w-6 h-6 text-white" />
      case 'Workstation':
        return <Monitor className="w-6 h-6 text-white" />
      case 'Terminal':
        return <Cpu className="w-6 h-6 text-white" />
      default:
        return <Cpu className="w-6 h-6 text-white" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Platforme</h2>
          <p className="text-slate-600">
            {locationId ? `Gestionează platformele pentru ${locationName}` : 'Toate platformele din sistem'}
          </p>
        </div>
        {!hideSearchAndAdd && (
          <button
            onClick={handleAddPlatform}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Adaugă Platformă</span>
          </button>
        )}
      </div>

      {/* Search */}
      {!hideSearchAndAdd && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Caută platforme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Platforms List */}
      {filteredPlatforms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatforms.map((platform) => (
            <div key={platform.id} className="card p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl">
                    {getTypeIcon(platform.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                      {platform.name}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {platform.type}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleViewPlatform(platform)}
                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditPlatform(platform)}
                    className="p-2 text-slate-400 hover:text-green-500 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlatform(platform)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Platform Info */}
                <div className="space-y-2">
                  {platform.description && (
                    <div className="text-sm text-slate-600">
                      {platform.description}
                    </div>
                  )}
                  {platform.specifications && (
                    <div className="text-xs text-slate-500">
                      <strong>Specs:</strong> {platform.specifications}
                    </div>
                  )}
                  {platform.location && (
                    <div className="text-xs text-slate-500">
                      <strong>Locație:</strong> {platform.location}
                    </div>
                  )}
                </div>

                {/* Type and Status */}
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeColor(platform.type)}`}>
                    {platform.type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(platform.status)}`}>
                    {platform.status === 'Active' ? 'Activ' : 
                     platform.status === 'Inactive' ? 'Inactiv' :
                     platform.status === 'Maintenance' ? 'În mentenanță' :
                     platform.status === 'Offline' ? 'Offline' : platform.status}
                  </span>
                </div>

                {/* Additional Info */}
                {platform.notes && (
                  <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                    {platform.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-12 text-center">
          <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl inline-block mb-6">
            <Cpu className="w-16 h-16 text-purple-500 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-4">Nu există platforme</h3>
          <p className="text-slate-600 mb-6">
            {locationId ? 'Adaugă prima platformă pentru această locație' : 'Nu există platforme în sistem'}
          </p>
          {!hideSearchAndAdd && (
            <button 
              onClick={handleAddPlatform}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus size={18} />
              <span>Adaugă Platformă</span>
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <PlatformModal
          item={editingPlatform}
          onClose={() => {
            setShowAddModal(false)
            setEditingPlatform(null)
          }}
          onSave={handleSavePlatform}
        />
      )}
    </div>
  )
}

export default LocationPlatforms









