import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { BarChart3, Plus, Search, Upload, Download, Edit, Trash2, Eye, Filter, Activity, AlertCircle, CheckCircle, Wrench, History, Database } from 'lucide-react'
import DataTable from '../components/DataTable'
import SlotModal from '../components/modals/SlotModal'
import StatCard from '../components/StatCard'
import ExportButtons from '../components/ExportButtons'
import { toast } from 'react-hot-toast'

const Slots = () => {
  const { slots, invoices, warehouse, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState(null)
  
  // Card visibility settings - default OFF
  const [cardVisibility, setCardVisibility] = useState({
    totalSlots: false,
    activeSlots: false,
    inactiveSlots: false,
    maintenanceSlots: false,
    ownedSlots: false,
    rentedSlots: false
  })

  // Încarcă preferințele de pe server
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.id) {
        try {
          const response = await axios.get(`/api/users/${user.id}`)
          const userData = response.data
          const preferences = userData.preferences || {}
          
          if (preferences.slots?.cardVisibility) {
            setCardVisibility(preferences.slots.cardVisibility)
          }
        } catch (error) {
          console.error('Error loading slots preferences:', error)
        }
      }
    }
    
    loadPreferences()
  }, [user?.id])

  // Salvează preferințele pe server
  const saveCardVisibility = async (newVisibility) => {
    if (user?.id) {
      try {
        await axios.put(`/api/users/${user.id}/preferences`, {
          preferences: {
            slots: {
              cardVisibility: newVisibility
            }
          }
        })
      } catch (error) {
        console.error('Error saving slots preferences:', error)
      }
    }
  }
  const [showCardSettings, setShowCardSettings] = useState(false)

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Card visibility settings are not saved - always default OFF
  // No localStorage loading/saving for card visibility

  // Toggle card visibility (saves to server)
  const toggleCardVisibility = (cardKey) => {
    const newVisibility = {
      ...cardVisibility,
      [cardKey]: !cardVisibility[cardKey]
    }
    setCardVisibility(newVisibility)
    saveCardVisibility(newVisibility)
  }

  // Select all cards
  const selectAllCards = () => {
    const newVisibility = {
      totalSlots: true,
      activeSlots: true,
      inactiveSlots: true,
      maintenanceSlots: true,
      ownedSlots: true,
      rentedSlots: true
    }
    setCardVisibility(newVisibility)
    saveCardVisibility(newVisibility)
  }

  // Deselect all cards
  const deselectAllCards = () => {
    const newVisibility = {
      totalSlots: false,
      activeSlots: false,
      inactiveSlots: false,
      maintenanceSlots: false,
      ownedSlots: false,
      rentedSlots: false
    }
    setCardVisibility(newVisibility)
    saveCardVisibility(newVisibility)
  }

  // Filter and search logic
  const filteredSlots = slots.filter(slot => {
    const matchesSearch = slot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slot.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slot.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slot.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slot.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || slot.status === statusFilter
    const matchesProvider = providerFilter === 'all' || slot.provider === providerFilter
    const matchesPropertyType = propertyTypeFilter === 'all' || slot.property_type === propertyTypeFilter
    return matchesSearch && matchesStatus && matchesProvider && matchesPropertyType
  })

  // Get unique providers for filter
  const uniqueProviders = [...new Set(slots.map(slot => slot.provider).filter(Boolean))]

  // Advanced Statistics (8 indicators)
  const totalSlots = slots.length
  const activeSlots = slots.filter(slot => slot.status === 'Active').length
  const inactiveSlots = slots.filter(slot => slot.status === 'Inactive').length
  const maintenanceSlots = slots.filter(slot => slot.status === 'Maintenance').length
  const ownedSlots = slots.filter(slot => slot.property_type === 'Owned').length
  const rentedSlots = slots.filter(slot => slot.property_type === 'Rented').length

  const columns = [
    {
      key: 'serial_number',
      label: 'SERIAL NUMBER',
      sortable: true,
      render: (item) => (
        <button
          onClick={() => navigate(`/slots/${item.id}`)}
          className="text-blue-600 hover:text-blue-800 font-semibold text-base hover:underline transition-colors text-left"
        >
          {item.serial_number || 'N/A'}
        </button>
      )
    },
    {
      key: 'provider',
      label: 'FURNIZOR',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.provider || 'N/A'}
        </div>
      )
    },
    {
      key: 'location',
      label: 'LOCAȚIE',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.location || 'N/A'}
        </div>
      )
    },
    {
      key: 'cabinet',
      label: 'CABINET',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.cabinet || 'N/A'}
        </div>
      )
    },
    {
      key: 'game_mix',
      label: 'GAME MIX',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.game_mix || 'N/A'}
        </div>
      )
    },
    {
      key: 'property_type',
      label: 'TIP PROPRIETATE',
      sortable: true,
      render: (item) => {
        // Găsește factura pentru acest slot pentru a determina tipul de proprietate
        const relatedInvoice = invoices?.find(invoice => {
          if (!invoice.serial_number || !item.serial_number) return false
          
          // În PostgreSQL, serial_number este stocat ca JSON string cu array
          let serialNumbers = []
          try {
            if (typeof invoice.serial_number === 'string') {
              serialNumbers = JSON.parse(invoice.serial_number)
            } else if (Array.isArray(invoice.serial_number)) {
              serialNumbers = invoice.serial_number
            } else {
              serialNumbers = [invoice.serial_number]
            }
          } catch (e) {
            serialNumbers = [invoice.serial_number.toString()]
          }
          
          return serialNumbers.some(serial => serial.toString() === item.serial_number.toString())
        })
        
        let propertyType = item.property_type || 'Necunoscut'
        
        // Dacă avem factură asociată, folosim tipul din factură
        if (relatedInvoice && relatedInvoice.invoice_type) {
          if (relatedInvoice.invoice_type === 'Vânzare') {
            propertyType = 'Proprietate'
          } else if (relatedInvoice.invoice_type === 'Chirie') {
            propertyType = 'Închiriat'
          } else {
            propertyType = relatedInvoice.invoice_type
          }
        }
        
        // Mapează valorile pentru afișare
        const displayPropertyType = propertyType === 'Owned' ? 'Proprietate' : 
                                   propertyType === 'Rented' ? 'Închiriat' : 
                                   propertyType === 'Proprietate' ? 'Proprietate' :
                                   propertyType === 'Închiriat' ? 'Închiriat' :
                                   propertyType
        
        return (
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {displayPropertyType}
          </div>
        )
      }
    },
    {
      key: 'invoice',
      label: 'FACTURĂ',
      sortable: false,
      render: (item) => {
        // Găsește factura pentru acest slot
        const relatedInvoice = invoices?.find(invoice => {
          if (!invoice.serial_number || !item.serial_number) return false
          
          // În PostgreSQL, serial_number este stocat ca JSON string cu array
          let serialNumbers = []
          try {
            if (typeof invoice.serial_number === 'string') {
              serialNumbers = JSON.parse(invoice.serial_number)
            } else if (Array.isArray(invoice.serial_number)) {
              serialNumbers = invoice.serial_number
            } else {
              serialNumbers = [invoice.serial_number]
            }
          } catch (e) {
            serialNumbers = [invoice.serial_number.toString()]
          }
          
          return serialNumbers.some(serial => serial.toString() === item.serial_number.toString())
        })
        
        if (relatedInvoice) {
          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/invoices/${relatedInvoice.id}`)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm hover:underline transition-colors"
              >
                {relatedInvoice.invoice_number}
              </button>
              {relatedInvoice.file_path && (
                <button
                  onClick={() => window.open(relatedInvoice.file_path, '_blank')}
                  className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                  title="Vezi factura"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        }
        
        return (
          <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
        )
      }
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => {
        const handleStatusToggle = async () => {
          const currentStatus = item.status?.toLowerCase() || ''
          const isCurrentlyActive = currentStatus === 'activ' || currentStatus === 'active'
          const newStatus = isCurrentlyActive ? 'Inactive' : 'Active'
          
          try {
            if (newStatus === 'Inactive') {
              // Move slot to warehouse table
              await createItem('warehouse', {
                serial_number: item.serial_number,
                provider: item.provider,
                location: 'Depozit',
                cabinet: item.cabinet,
                game_mix: item.game_mix,
                status: 'Inactive',
                notes: `Mutat automat din sloturi când a devenit inactiv`
              })
              
              // Delete from slots table
              await deleteItem('slots', item.id)
              toast.success('Slot mutat în Depozit')
            } else {
              // Just update status for active slots
              await updateItem('slots', item.id, { ...item, status: newStatus })
              toast.success(`Status schimbat în ${newStatus}`)
            }
          } catch (error) {
            toast.error('Eroare la actualizare status')
            console.error('Error updating slot status:', error)
          }
        }
        
        const status = item.status?.toLowerCase() || ''
        const isActive = status === 'activ' || status === 'active'
        
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleStatusToggle}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-bold ${
              isActive ? 'text-green-600' : 'text-gray-600'
            }`}>
              {isActive ? 'ON' : 'OFF'}
            </span>
          </div>
        )
      }
    },
    {
      key: 'created_at',
      label: 'DATA CREARE',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
  ]

  const handleCreate = () => {
    setEditingSlot(null)
    setShowModal(true)
  }

  const handleEdit = (slot) => {
    setEditingSlot(slot)
    setShowModal(true)
  }

  const handleView = (slot) => {
    navigate(`/slots/${slot.id}`)
  }

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredSlots.map(slot => slot.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(slotId => slotId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    setShowBulkDeleteModal(true)
  }

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedItems) {
        await deleteItem('slots', id)
      }
      setSelectedItems([])
      setShowBulkActions(false)
      setShowBulkDeleteModal(false)
      toast.success(`${selectedItems.length} sloturi șterse cu succes!`)
    } catch (error) {
      console.error('Error bulk deleting slots:', error)
      toast.error('Eroare la ștergerea sloturilor!')
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    // Implement bulk edit logic here
    console.log('Bulk edit for slots:', selectedItems)
    toast.info('Funcționalitatea de editare în masă va fi implementată în curând!')
  }

  const handleDelete = async (id) => {
    setDeleteItemId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      await deleteItem('slots', deleteItemId)
      setShowDeleteModal(false)
      setDeleteItemId(null)
      toast.success('Slot șters cu succes!')
    } catch (error) {
      toast.error('Eroare la ștergerea slotului')
      console.error('Error deleting slot:', error)
    }
  }

  const handleSave = async (slotData) => {
    try {
      if (editingSlot) {
        await updateItem('slots', editingSlot.id, slotData)
        toast.success('Slot actualizat cu succes!')
      } else {
        await createItem('slots', slotData)
        toast.success('Slot adăugat cu succes!')
      }
      setShowModal(false)
      setEditingSlot(null)
    } catch (error) {
      toast.error('Eroare la salvarea slotului')
      console.error('Error saving slot:', error)
    }
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('slots')
    } catch (error) {
      toast.error('Eroare la exportarea în Excel')
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('slots')
    } catch (error) {
      toast.error('Eroare la exportarea în PDF')
      console.error('Error exporting to PDF:', error)
    }
  }

  const handleImport = () => {
    // Implementare pentru import sloturi
    toast.info('Funcționalitatea de import va fi implementată în curând')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg shadow-emerald-500/25">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Management Sloturi</h2>
                <p className="text-slate-600">Gestionează sloturile de gaming din sistem</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCardSettings(!showCardSettings)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Setări Carduri</span>
              </button>
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="slots"
              />
              <div className="flex space-x-3">
                {showBulkActions && (
                  <>
                    <button
                      onClick={handleBulkEdit}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Bulk Edit</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="btn-danger flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Bulk Delete</span>
                    </button>
                  </>
                )}
            <button
              onClick={() => navigate('/slots/history')}
              className="btn-secondary flex items-center space-x-2"
            >
              <History className="w-4 h-4" />
              <span>Istoric Sloturi</span>
            </button>
            <button
              onClick={() => navigate('/slots/marina-import')}
              className="btn-success flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>Import Cyber</span>
            </button>
                <button
                  onClick={handleCreate}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă Slot</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Settings Modal */}
        {showCardSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Setări Carduri</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Selectează ce carduri să afișezi</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selectează tot</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllCards}
                      className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Selectează tot
                    </button>
                    <button
                      onClick={deselectAllCards}
                      className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Deselectează tot
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'totalSlots', label: 'Total Sloturi' },
                    { key: 'activeSlots', label: 'Active' },
                    { key: 'inactiveSlots', label: 'Inactive' },
                    { key: 'maintenanceSlots', label: 'Mentenanță' },
                    { key: 'ownedSlots', label: 'Proprietate' },
                    { key: 'rentedSlots', label: 'Închiriate' }
                  ].map((card) => (
                    <div key={card.key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{card.label}</span>
                      <input
                        type="checkbox"
                        checked={cardVisibility[card.key]}
                        onChange={() => toggleCardVisibility(card.key)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setShowCardSettings(false)}
                  className="btn-primary px-6 py-2"
                >
                  Salvează
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Statistics Cards (8 indicators) */}
        {cardVisibility.totalSlots && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sloturi"
              value={totalSlots}
              icon={BarChart3}
              color="blue"
              trend={null}
            />
            {cardVisibility.activeSlots && (
              <StatCard
                title="Active"
                value={activeSlots}
                icon={CheckCircle}
                color="green"
                trend={null}
              />
            )}
            {cardVisibility.inactiveSlots && (
              <StatCard
                title="Inactive"
                value={inactiveSlots}
                icon={AlertCircle}
                color="red"
                trend={null}
              />
            )}
            {cardVisibility.maintenanceSlots && (
              <StatCard
                title="Mentenanță"
                value={maintenanceSlots}
                icon={Wrench}
                color="yellow"
                trend={null}
              />
            )}
          </div>
        )}

        {(cardVisibility.ownedSlots || cardVisibility.rentedSlots) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cardVisibility.ownedSlots && (
              <StatCard
                title="Proprietate"
                value={ownedSlots}
                icon={CheckCircle}
                color="emerald"
                trend={null}
              />
            )}
            {cardVisibility.rentedSlots && (
              <StatCard
                title="Închiriate"
                value={rentedSlots}
                icon={AlertCircle}
                color="orange"
                trend={null}
              />
            )}
          </div>
        )}

        {/* Advanced Search and Filters */}
        <div className="card p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search Bar - narrower */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută după nume, model, furnizor, locație sau numărul de serie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            {/* Advanced Filters - moved to the right */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Filtre:</span>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="all">Toate Statusurile</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Mentenanță</option>
              </select>
              
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="all">Toți Furnizorii</option>
                {uniqueProviders.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="all">Toate Tipurile</option>
                <option value="Owned">Proprietate</option>
                <option value="Rented">Închiriate</option>
              </select>
              
              <button
                onClick={handleImport}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Importă</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există sloturi</h3>
              <p className="text-slate-500">Adaugă primul slot pentru a începe</p>
            </div>
          ) : (
            <DataTable
              data={filteredSlots}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <SlotModal
            item={editingSlot}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
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
                    Șterge Slot
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Această acțiune nu poate fi anulată
                  </p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Ești sigur că vrei să ștergi acest slot? Toate datele asociate vor fi șterse permanent.
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteItemId(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Șterge
                </button>
              </div>
            </div>
          </div>
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
                    Șterge {selectedItems.length} Sloturi
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Această acțiune nu poate fi anulată
                  </p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Ești sigur că vrei să ștergi {selectedItems.length} sloturi selectate? Toate datele asociate vor fi șterse permanent.
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
                  Șterge {selectedItems.length} Sloturi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Slots
