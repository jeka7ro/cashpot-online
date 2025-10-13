import React, { useState, useEffect } from 'react'
import { Building2, Plus, Search, Eye, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import ProprietarModal from './modals/ProprietarModal'

const LocationProprietari = ({ locationId, locationName }) => {
  const { proprietari, createItem, updateItem, deleteItem } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProprietar, setEditingProprietar] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter proprietari for this location (based on contracts)
  const filteredProprietari = (proprietari || []).filter(proprietar => 
    proprietar.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proprietar.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proprietar.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proprietar.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddProprietar = () => {
    setEditingProprietar(null)
    setShowAddModal(true)
  }

  const handleViewProprietar = (proprietar) => {
    console.log('View proprietar:', proprietar)
  }

  const handleEditProprietar = (proprietar) => {
    setEditingProprietar(proprietar)
    setShowAddModal(true)
  }

  const handleDeleteProprietar = async (proprietar) => {
    if (window.confirm(`Sigur doriți să ștergeți proprietarul "${proprietar.name}"?`)) {
      try {
        await deleteItem('proprietari', proprietar.id)
      } catch (error) {
        console.error('Error deleting proprietar:', error)
      }
    }
  }

  const handleSaveProprietar = async (proprietarData) => {
    try {
      if (editingProprietar) {
        await updateItem('proprietari', editingProprietar.id, proprietarData)
      } else {
        await createItem('proprietari', proprietarData)
      }
      setShowAddModal(false)
      setEditingProprietar(null)
    } catch (error) {
      console.error('Error saving proprietar:', error)
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Persoana Fizica':
        return 'bg-blue-100 text-blue-800'
      case 'Persoana Juridica':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Activ':
        return 'bg-green-100 text-green-800'
      case 'Inactiv':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Proprietari</h2>
          <p className="text-slate-600">Gestionează proprietarii pentru {locationName}</p>
        </div>
        <button
          onClick={handleAddProprietar}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Adaugă Proprietar</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Caută proprietari..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Proprietari List */}
      {filteredProprietari.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProprietari.map((proprietar) => (
            <div key={proprietar.id} className="card p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {proprietar.name}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {proprietar.contact_person}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleViewProprietar(proprietar)}
                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditProprietar(proprietar)}
                    className="p-2 text-slate-400 hover:text-green-500 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProprietar(proprietar)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Contact Info */}
                <div className="space-y-2">
                  {proprietar.email && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{proprietar.email}</span>
                    </div>
                  )}
                  {proprietar.phone && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{proprietar.phone}</span>
                    </div>
                  )}
                  {proprietar.address && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{proprietar.address}</span>
                    </div>
                  )}
                </div>

                {/* Type and Status */}
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTypeColor(proprietar.type)}`}>
                    {proprietar.type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(proprietar.status)}`}>
                    {proprietar.status}
                  </span>
                </div>

                {/* CNP/CUI */}
                {proprietar.cnp_cui && (
                  <div className="text-xs text-slate-500">
                    {proprietar.type === 'Persoana Fizica' ? 'CNP:' : 'CUI:'} {proprietar.cnp_cui}
                  </div>
                )}

                {/* Notes */}
                {proprietar.notes && (
                  <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                    {proprietar.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-12 text-center">
          <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl inline-block mb-6">
            <Building2 className="w-20 h-20 text-blue-500 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-4">Nu există proprietari</h3>
          <p className="text-slate-600 mb-6">
            Adaugă primul proprietar pentru această locație
          </p>
          <button 
            onClick={handleAddProprietar}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <Plus size={18} />
            <span>Adaugă Proprietar</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <ProprietarModal
          item={editingProprietar}
          onClose={() => {
            setShowAddModal(false)
            setEditingProprietar(null)
          }}
          onSave={handleSaveProprietar}
        />
      )}
    </div>
  )
}

export default LocationProprietari


