import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import PDFViewer from '../components/PDFViewer'
import DataTable from '../components/DataTable'
import LocationModal from '../components/modals/LocationModal'
// import LocationDetailModal from '../components/modals/LocationDetailModal' // REMOVED - use full page instead!
import LocationContracts from '../components/LocationContracts'
import LocationProprietari from '../components/LocationProprietari'
import { MapPin, Plus, Search, Upload, Download, FileText, Edit, Trash2, Building2, Eye, X, Database } from 'lucide-react'
import { toast } from 'react-hot-toast'

const Locations = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { locations, contracts, slots, createItem, updateItem, deleteItem, exportToExcel, exportToPDF, loading } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  // const [viewingItem, setViewingItem] = useState(null)  // REMOVED - use navigate instead!
  // const [showDetailModal, setShowDetailModal] = useState(false)  // REMOVED!

  // Auto-open modal dacă există parametrul ?edit=ID
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && locations && locations.length > 0) {
      const locationToEdit = locations.find(l => l.id === parseInt(editId))
      if (locationToEdit) {
        console.log('🔧 Auto-opening edit modal for location:', locationToEdit.name)
        setEditingItem(locationToEdit)
        setShowModal(true)
        // Șterge parametrul din URL după ce deschidem modalul
        setSearchParams({})
      }
    }
  }, [searchParams, locations, setSearchParams])

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
    setShowBulkDeleteModal(true)
  }

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedItems) {
        await deleteItem('locations', id)
      }
      setSelectedItems([])
      setShowBulkActions(false)
      setShowBulkDeleteModal(false)
      toast.success(`${selectedItems.length} locații șterse cu succes!`)
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Eroare la ștergerea locațiilor!')
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
  const getSlotCount = (locationName) => {
    const locationSlots = slots.filter(s => s.location === locationName && s.status !== 'Depozit')
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
  
  // Helper function to format days as "X ani, Y luni, Z zile"
  const formatDaysAsYearsMonthsDays = (totalDays) => {
    const absDay = Math.abs(totalDays)
    const years = Math.floor(absDay / 365)
    const months = Math.floor((absDay % 365) / 30)
    const days = absDay % 30
    
    const parts = []
    if (years > 0) parts.push(`${years} ${years === 1 ? 'an' : 'ani'}`)
    if (months > 0) parts.push(`${months} ${months === 1 ? 'lună' : 'luni'}`)
    if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'zi' : 'zile'}`)
    
    return parts.join(', ')
  }

  // Helper function to calculate total surface from contracts (as user requested!)
  const getSurfaceFromContracts = (locationId) => {
    const locationContracts = contracts.filter(c => c.location_id === locationId)
    const totalSurface = locationContracts.reduce((sum, contract) => {
      const surface = parseFloat(contract.surface_area) || 0
      return sum + surface
    }, 0)
    
    // Debug log for Valcea (location_id = 4)
    if (locationId === 4) {
      console.log('🔍 DEBUG Valcea Surface:', {
        locationId,
        contractCount: locationContracts.length,
        contracts: locationContracts.map(c => ({
          id: c.id,
          contract_number: c.contract_number,
          surface_area: c.surface_area
        })),
        totalSurface
      })
    }
    
    return totalSurface
  }

  // Helper function to calculate cost per m² (returns value + currency)
  const getCostPerM2 = (locationId, surface) => {
    const locationContracts = contracts.filter(c => c.location_id === locationId && c.status === 'Active')
    if (locationContracts.length === 0 || !surface) return null

    // Get the most recent active contract
    const activeContract = locationContracts.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0]
    
    if (!activeContract.monthly_rent) return null

    const costPerM2 = activeContract.monthly_rent / surface
    const currency = activeContract.currency || 'EUR'
    
    return {
      value: costPerM2.toFixed(2),
      currency: currency
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Nume Locație',
      sortable: true,
      render: (item) => (
        <div>
          <button
            onClick={() => navigate(`/locations/${item.id}`)}
            className="text-slate-900 dark:text-slate-100 hover:text-green-700 dark:hover:text-green-400 transition-colors text-left font-medium"
          >
            {item.name}
          </button>
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
          render: (item) => {
            const surfaceFromContracts = getSurfaceFromContracts(item.id)
            return (
              <div className="text-slate-600 dark:text-slate-400">
                {surfaceFromContracts > 0 ? `${surfaceFromContracts.toFixed(2)} m²` : 'N/A'}
              </div>
            )
          }
        },
        {
          key: 'contracts_count',
          label: 'Contracte',
          sortable: true,
          render: (item) => {
            const contractsCount = contracts.filter(c => c.location_id === item.id).length
            const activeCount = contracts.filter(c => c.location_id === item.id && c.status === 'Active').length
            return (
              <div className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-green-600 dark:text-green-400">{activeCount}</span>
                {contractsCount > activeCount && (
                  <span className="text-slate-400"> / {contractsCount}</span>
                )}
              </div>
            )
          }
        },
        {
          key: 'capacity',
          label: 'Capacitate (Sloturi)',
          sortable: true,
          render: (item) => {
            const slotCount = getSlotCount(item.name)
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
            const surfaceFromContracts = getSurfaceFromContracts(item.id)
            const costData = getCostPerM2(item.id, surfaceFromContracts)
            
            if (costData === null) {
              return (
                <span className="text-slate-400 dark:text-slate-500 italic">
                  N/A
                </span>
              )
            }

            return (
              <div className="flex items-center space-x-1">
                <span className="text-blue-600 dark:text-blue-400">
                  {costData.value}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {costData.currency}/m²
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
        const formattedTime = formatDaysAsYearsMonthsDays(daysRemaining)
        
        return (
          <div className={`font-semibold ${
            isExpired 
              ? 'text-red-600 dark:text-red-400' 
              : isExpiringSoon 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            {isExpired && '❌ '}
            {formattedTime}
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
    if (confirm(`Sigur doriți să ștergeți locația "${item.name}"?`)) {
      try {
        await deleteItem('locations', item.id)
        toast.success('Locația a fost ștearsă cu succes!')
      } catch (error) {
        toast.error('Eroare la ștergerea locației')
      }
    }
  }

  const handleSave = async (data) => {
    try {
      // Always use JSON (Base64 for files)
      const jsonData = {
        ...data,
        plan_file: data.planFile // Map planFile → plan_file for backend compatibility
      }
      delete jsonData.planFile
      delete jsonData.planFileName
      
      console.log('💾 Saving location:')
      console.log('   Name:', jsonData.name)
      console.log('   plan_file type:', typeof jsonData.plan_file)
      console.log('   plan_file is Base64?', jsonData.plan_file?.startsWith('data:'))
      console.log('   plan_file length:', jsonData.plan_file?.length || 0, 'chars')
      if (jsonData.plan_file) {
        console.log('   plan_file preview:', jsonData.plan_file.substring(0, 100) + '...')
      }
      
      if (editingItem) {
        const response = await fetch(`/api/locations/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData)
        })
        if (!response.ok) throw new Error('Failed to update location')
      } else {
        const response = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData)
        })
        if (!response.ok) throw new Error('Failed to create location')
      }
      
      // Refresh data
      window.location.reload()
      
      setShowModal(false)
      setEditingItem(null)
      toast.success(editingItem ? 'Locația a fost actualizată cu succes!' : 'Locația a fost creată cu succes!')
    } catch (error) {
      console.error('Error saving location:', error)
      console.error('Error details:', error.message)
      toast.error(`Eroare la salvare locație: ${error.message}`)
    }
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('locations')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('locations')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    }
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
      // Convertește Base64 → Blob → Object URL → deschide în tab nou
      try {
        // Extrage Base64 data (fără "data:application/pdf;base64,")
        const base64Data = location.plan_file.split(',')[1] || location.plan_file
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        
        // Deschide în tab nou
        window.open(blobUrl, '_blank')
        
        // Cleanup după 1 minut (pentru a nu leak memory)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      } catch (error) {
        console.error('Error opening plan:', error)
        toast.error('❌ Eroare la deschiderea planului')
      }
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
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="locations"
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
                  onClick={() => navigate('/slots/cyber-import')}
                  className="btn-success flex items-center space-x-2"
                >
                  <Database className="w-4 h-4" />
                  <span>Import Cyber</span>
                </button>
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
          onRowClick={(item) => {
            navigate(`/locations/${item.id}`)  // Navigate to FULL detail page!
          }}
          onViewProprietari={handleViewProprietari}
          loading={loading.locations}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          moduleColor="blue"
        />

        {/* Total Slots Summary */}
        {filteredLocations.length > 0 && (
          <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📊</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Total sloturi în toate locațiile:
                </span>
              </div>
              <div className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-xl">
                {filteredLocations.reduce((total, location) => total + getSlotCount(location.name), 0)} sloturi
              </div>
            </div>
          </div>
        )}

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

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Șterge {selectedItems.length} Locații
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Această acțiune nu poate fi anulată
                  </p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Ești sigur că vrei să ștergi {selectedItems.length} locații selectate? Toate datele asociate vor fi șterse permanent.
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Șterge {selectedItems.length} Locații
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal - REMOVED! User wants FULL page, not modal! */}
      </div>
    </Layout>
  )
}

export default Locations
