import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import PDFViewer from '../components/PDFViewer'
import DataTable from '../components/DataTable'
import LocationModal from '../components/modals/LocationModal'
import LocationContracts from '../components/LocationContracts'
import LocationProprietari from '../components/LocationProprietari'
import { MapPin, Plus, Search, Upload, Download, FileText, Edit, Trash2, Building2, Eye, X } from 'lucide-react'

const Locations = () => {
  const { locations, contracts, slots, createItem, updateItem, deleteItem, exportData, loading } = useData()
  const [showModal, setShowModal] = useState(false)
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
      setSelectedItems(filteredLocations.map(item => item.id))
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
          await deleteItem('locations', id)
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
  const [activeTab, setActiveTab] = useState('locations')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)

  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helper function to calculate number of slots for a location
  const getSlotCount = (locationId) => {
    const locationSlots = slots.filter(s => s.location_id === locationId && s.status !== 'Depozit')
    return locationSlots.length
  }

  // Helper function to calculate days until contract expiration
  const getDaysUntilExpiration = (locationId) => {
    const locationContracts = contracts.filter(c => c.location_id === locationId && c.status === 'Active')
    if (locationContracts.length === 0) return null

    // Get the most recent active contract
    const activeContract = locationContracts.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0]
    
    if (!activeContract.end_date) return null

    const today = new Date()
    const expirationDate = new Date(activeContract.end_date)
    const diffTime = expirationDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  // Helper function to calculate cost per m²
  const getCostPerM2 = (locationId, surface) => {
    const locationContracts = contracts.filter(c => c.location_id === locationId && c.status === 'Active')
    if (locationContracts.length === 0 || !surface) return null

    // Get the most recent active contract
    const activeContract = locationContracts.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0]
    
    if (!activeContract.monthly_rent) return null

    const costPerM2 = activeContract.monthly_rent / surface
    return costPerM2.toFixed(2)
  }

  const columns = [
    {
      key: 'name',
      label: 'Nume Locație',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <button
            onClick={() => navigate(`/locations/${item.id}`)}
            className="text-slate-900 dark:text-slate-100 hover:text-green-700 dark:hover:text-green-400 transition-colors text-left font-medium"
          >
            {item.name}
          </button>
          <div className="text-slate-600 dark:text-slate-400">
            {item.address}
          </div>
        </div>
      )
    },
    {
      key: 'company',
      label: 'Companie',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
              <span className="text-blue-800 dark:text-blue-300">
            {item.company}
          </span>
          <div className="flex items-center space-x-2">
            {item.contact_person ? (
              <>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                  {item.contact_person.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-700">
                  {item.contact_person}
                </span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic">Nu este setată</span>
            )}
          </div>
        </div>
      )
    },
        {
          key: 'surface',
          label: 'Suprafață (m²)',
          sortable: true,
          render: (item) => (
            <div className="text-slate-600">
              {item.surface ? `${item.surface} m²` : 'N/A'}
            </div>
          )
        },
        {
          key: 'capacity',
          label: 'Capacitate (Sloturi)',
          sortable: true,
          render: (item) => {
            const slotCount = getSlotCount(item.id)
            return (
              <div className="text-slate-600">
                {slotCount} sloturi
              </div>
            )
          }
        },
        {
          key: 'cost_per_m2',
          label: 'Cost/m²',
          sortable: false,
          render: (item) => {
            const costPerM2 = getCostPerM2(item.id, item.surface)
            
            if (costPerM2 === null) {
              return (
                <span className="text-slate-400 dark:text-slate-500 italic">
                  N/A
                </span>
              )
            }

            return (
              <div className="flex items-center space-x-1">
                <span className="text-blue-600 dark:text-blue-400">
                  {costPerM2}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  RON/m²
                </span>
              </div>
            )
          }
        },
    {
      key: 'plan_file',
      label: 'Plan Locație',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          {item.plan_file ? (
            <>
              <button
                onClick={() => handleViewDocument(item)}
                className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                title="Vizualizează planul"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownloadDocument(item)}
                className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                title="Descarcă planul"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteDocument(item)}
                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                title="Șterge planul"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 text-sm italic">Nu există plan</span>
          )}
        </div>
      )
    },
    {
      key: 'contract_expiration',
      label: 'Zile Rămase Contract',
      sortable: false,
      render: (item) => {
        const daysRemaining = getDaysUntilExpiration(item.id)
        
        if (daysRemaining === null) {
          return (
            <span className="text-slate-400 dark:text-slate-500 italic">
              Fără contract activ
            </span>
          )
        }

        const isExpired = daysRemaining < 0
        const isExpiringSoon = daysRemaining <= 30 && daysRemaining >= 0
        
        return (
          <div className={`flex items-center space-x-1 ${
            isExpired 
              ? 'text-red-600 dark:text-red-400' 
              : isExpiringSoon 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            <span>
              {isExpired ? Math.abs(daysRemaining) : daysRemaining}
            </span>
            <span>
              {isExpired ? 'zile expirat' : 'zile rămase'}
            </span>
          </div>
        )
      }
    },
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
    if (window.confirm(`Sigur doriți să ștergeți locația "${item.name}"?`)) {
      await deleteItem('locations', item.id)
    }
  }

  const handleSave = async (data) => {
    try {
      const formData = new FormData()
      
      // Add all fields to FormData
      Object.keys(data).forEach(key => {
        if (key === 'planFile' && data[key] instanceof File) {
          formData.append('planFile', data[key])
        } else if (key !== 'planFile') {
          formData.append(key, data[key])
        }
      })
      
      if (editingItem) {
        // Update existing location
        const response = await fetch(`/api/locations/${editingItem.id}`, {
          method: 'PUT',
          body: formData
        })
        if (!response.ok) throw new Error('Failed to update location')
      } else {
        // Create new location
        const response = await fetch('/api/locations', {
          method: 'POST',
          body: formData
        })
        if (!response.ok) throw new Error('Failed to create location')
      }
      
      // Refresh data
      window.location.reload()
      
      setShowModal(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Eroare la salvare locație')
    }
  }

  const handleExport = async () => {
    await exportData('locations', 'excel')
  }

  const handleImport = () => {
    // TODO: Implement import functionality
    console.log('Import functionality to be implemented')
  }

  const handleViewContracts = (location) => {
    setSelectedLocation(location)
    setActiveTab('contracts')
  }

  const handleViewProprietari = (location) => {
    setSelectedLocation(location)
    setActiveTab('proprietari')
  }

  const handleViewDocument = (location) => {
    if (location.plan_file) {
      setSelectedDocument(location.plan_file)
      setShowDocumentViewer(true)
    }
  }

  const handleDeleteDocument = async (location) => {
    if (window.confirm(`Sigur doriți să ștergeți planul locației "${location.name}"?`)) {
      try {
        await updateItem('locations', location.id, { plan_file: null })
      } catch (error) {
        console.error('Error deleting document:', error)
      }
    }
  }

  const handleDownloadDocument = (location) => {
    if (location.plan_file) {
      const link = document.createElement('a')
      link.href = location.plan_file
      link.download = `Plan_${location.name || 'location'}.pdf`
      link.click()
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="card p-6">
          <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeTab === 'locations'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MapPin size={20} />
                <span>Locații</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeTab === 'contracts'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <FileText size={20} />
                <span>Contracte</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('proprietari')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeTab === 'proprietari'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Building2 size={20} />
                <span>Proprietari</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'locations' ? (
          <>
            {/* Header Actions */}
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Caută locații..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="input-field pl-12 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400" 
                />
              </div>
              <button 
                onClick={handleImport}
                className="btn-secondary flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>Importă</span>
              </button>
              <button 
                onClick={handleExport}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download size={16} />
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
                  onClick={handleAdd}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>Adaugă Locație</span>
                </button>
              </div>
            </div>

        {/* Data Table */}
        <DataTable
          data={filteredLocations}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewContracts={handleViewContracts}
          onViewProprietari={handleViewProprietari}
          loading={loading.locations}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          moduleColor="green"
        />

            {/* Modal */}
            {showModal && (
              <LocationModal
                item={editingItem}
                onClose={() => {
                  setShowModal(false)
                  setEditingItem(null)
                }}
                onSave={handleSave}
              />
            )}

            {/* Document Viewer Modal */}
            {showDocumentViewer && selectedDocument && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center">
                      <FileText className="w-6 h-6 mr-2" />
                      Vizualizare Plan Locație
                    </h3>
                    <button
                      onClick={() => {
                        setShowDocumentViewer(false)
                        setSelectedDocument(null)
                      }}
                      className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {/* PDF Viewer */}
                  <div className="h-full p-6">
                    <PDFViewer 
                      pdfUrl={selectedDocument}
                      title="Plan Locație"
                      placeholder="Planul locației nu este disponibil"
                      placeholderSubtext="Atașează planul locației pentru vizualizare"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'contracts' ? (
          /* Contracts Tab */
          <LocationContracts 
            locationId={selectedLocation?.id || null} 
            locationName={selectedLocation?.name || 'Toate Contractele'} 
          />
        ) : (
          /* Proprietari Tab */
          <LocationProprietari 
            locationId={selectedLocation?.id} 
            locationName={selectedLocation?.name || 'Selectați o locație'} 
          />
        )}
      </div>
    </Layout>
  )
}

export default Locations
