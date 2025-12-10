import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { BarChart3, Plus, Search, Upload, Download, Edit, Trash2, Filter, Activity, AlertCircle, CheckCircle, Wrench, History, Database, Package, Menu, Settings } from 'lucide-react'
import DataTable from '../components/DataTable'
import SlotModal from '../components/modals/SlotModal'
import StatCard from '../components/StatCard'
import { formatGameMixName } from '../utils/gameMixFormatter'
import CyberImport from './CyberImport'
import { toast } from 'react-hot-toast'

const Slots = () => {
  const { slots, invoices, warehouse, loading, createItem, updateItem, deleteItem, loadAllData } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Load data when component mounts
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Debug logging
  useEffect(() => {
    console.log('📊 Slots data loaded:', slots.length)
    if (slots.length > 0) {
      console.log('📦 First slot:', slots[0])
    }
  }, [slots])
  const [searchTerm, setSearchTerm] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all')
  const [commissionFilters, setCommissionFilters] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState(null)
  const [showCyberImportModal, setShowCyberImportModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  
  // Card visibility settings - default OFF
  const [cardVisibility, setCardVisibility] = useState({
    totalSlots: false,
    activeSlots: false,
    inactiveSlots: false,
    maintenanceSlots: false,
    ownedSlots: false,
    rentedSlots: false
  })

  // Încarcă comisiile
  const [commissions, setCommissions] = useState([])
  useEffect(() => {
    const loadCommissions = async () => {
      try {
        const response = await axios.get('/api/commissions')
        setCommissions(response.data)
      } catch (error) {
        console.error('Error loading commissions:', error)
      }
    }
    loadCommissions()
  }, [])

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

  // Filter and search logic - caută în TOATE câmpurile slotului
  const filteredSlots = slots.filter(slot => {
    const searchLower = searchTerm.toLowerCase()
    // Caută în TOATE câmpurile disponibile din slot
    const matchesSearch = !searchTerm || 
      Object.values(slot).some(value => {
        if (value === null || value === undefined) return false
        // Convertește la string și caută
        const stringValue = String(value).toLowerCase()
        return stringValue.includes(searchLower)
      })
    const matchesProvider = providerFilter === 'all' || slot.provider === providerFilter
    const matchesLocation = locationFilter === 'all' || slot.location === locationFilter
    const matchesPropertyType = propertyTypeFilter === 'all' || slot.property_type === propertyTypeFilter
    const matchesCommission = commissionFilters.length === 0 || 
      commissionFilters.some(commDate => {
        const slotCommDate = slot.commission_date ? new Date(slot.commission_date).toISOString().split('T')[0] : null
        return slotCommDate === commDate
      })
    return matchesSearch && matchesProvider && matchesLocation && matchesPropertyType && matchesCommission
  })

  // Get unique providers for filter
  const uniqueProviders = [...new Set(slots.map(slot => slot.provider).filter(Boolean))]
  const uniqueLocations = [...new Set(slots.map(slot => slot.location).filter(Boolean))].sort()

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
          {formatGameMixName(item.game_mix_name || item.game_mix)}
        </div>
      )
    },
    {
      key: 'commission_date',
      label: 'DATA COMISIE',
      sortable: true,
      render: (item) => {
        const commissionDate = item.commission_date ? new Date(item.commission_date) : null
        const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null
        
        // Calculate days remaining until expiry (not commission date)
        const daysRemaining = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null
        
        return (
          <div className="text-slate-800 font-medium text-base">
            {commissionDate ? (
              <div>
                <div>{commissionDate.toLocaleDateString('ro-RO')}</div>
                {daysRemaining !== null && (
                  <div className={`text-xs ${daysRemaining <= 0 ? 'text-red-600' : daysRemaining <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {daysRemaining <= 0 ? 'Expirat' : `${daysRemaining} zile până la expirare`}
                  </div>
                )}
              </div>
            ) : 'N/A'}
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
      key: 'cvt_date',
      label: 'DATA CVT',
      sortable: true,
      render: (item) => {
        const cvtDate = item.cvt_date ? new Date(item.cvt_date) : null
        const daysRemaining = cvtDate ? Math.ceil((cvtDate - new Date()) / (1000 * 60 * 60 * 24)) : null
        
        return (
          <div className="text-slate-800 font-medium text-base">
            {cvtDate ? (
              <div>
                <div>{cvtDate.toLocaleDateString('ro-RO')}</div>
                {daysRemaining !== null && (
                  <div className={`text-xs ${daysRemaining <= 0 ? 'text-red-600' : daysRemaining <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {daysRemaining <= 0 ? 'Expirat' : `${daysRemaining} zile rămase`}
                  </div>
                )}
              </div>
            ) : 'N/A'}
          </div>
        )
      }
    },
    {
      key: 'address',
      label: 'ADRESĂ',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          <div className="text-sm">{item.address || 'N/A'}</div>
          {item.city && (
            <div className="text-xs text-slate-500">{item.city}</div>
          )}
        </div>
      )
    },
    {
      key: 'jackpot',
      label: 'JACKPOT',
      sortable: false,
      render: (item) => {
        if (item.jackpot_name) {
          return (
            <div className="text-slate-800 font-medium text-base">
              <div className="text-sm font-semibold text-green-600">{item.jackpot_name}</div>
              <div className="text-xs text-slate-500">
                {item.current_amount ? `${item.current_amount.toLocaleString('ro-RO')} RON` : 'N/A'}
              </div>
              {item.jackpot_type && (
                <div className="text-xs text-slate-400">{item.jackpot_type}</div>
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
      key: 'manufacture_year',
      label: 'AN FABRICAT',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium text-base">
          {item.manufacture_year || 'N/A'}
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
    // Închide modal-ul imediat
    setShowBulkDeleteModal(false)
    
    const totalItems = selectedItems.length
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    try {
      // Pornește loading toast
      const loadingToast = toast.loading(`Șterg ${totalItems} sloturi...`, {
        duration: Infinity
      })
      
      // Șterge în batch-uri pentru performanță mai bună
      const batchSize = 10
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize)
        
        // Procesează batch-ul în paralel
        const promises = batch.map(async (id) => {
          try {
            await deleteItem('slots', id, true) // silent = true pentru bulk delete
            successCount++
          } catch (error) {
            errorCount++
            errors.push(`Slot ${id}: ${error.message}`)
          }
        })
        
        await Promise.all(promises)
        
        // Update progress
        const processed = Math.min(i + batchSize, totalItems)
        toast.loading(`Șterg ${totalItems} sloturi... (${processed}/${totalItems})`, {
          id: loadingToast
        })
      }
      
      // Cleanup
      setSelectedItems([])
      setShowBulkActions(false)
      
      // Clear loading toast
      toast.dismiss(loadingToast)
      
      // Afișează un singur rezultat final
      if (errorCount === 0) {
        toast.success(`✅ ${successCount}/${totalItems} sloturi șterse`, {
          duration: 3000
        })
      } else if (successCount > 0) {
        toast.success(`⚠️ ${successCount}/${totalItems} șterse, ${errorCount} erori`, {
          duration: 3000
        })
      } else {
        toast.error(`❌ Eroare la ștergerea tuturor sloturilor`, {
          duration: 3000
        })
      }
      
    } catch (error) {
      console.error('Error bulk deleting slots:', error)
      toast.error('Eroare la ștergerea sloturilor!')
      setShowBulkDeleteModal(false)
    }
  }

  const handleBulkEdit = async () => {
    if (selectedItems.length === 0) return
    
    const confirmMove = window.confirm(
      `Sigur vrei să muți ${selectedItems.length} sloturi selectate în DEPOZIT?\n\n` +
      `Sloturile vor fi șterse din tabelul Sloturi și mutate în Warehouse.`
    )
    
    if (!confirmMove) return
    
    try {
      const loadingToast = toast.loading(`Mutare ${selectedItems.length} sloturi în depozit...`, { id: 'bulk-move' })
      
      // Get selected slots data
      const selectedSlots = slots.filter(slot => selectedItems.includes(slot.id))
      let successCount = 0
      
      // Move each slot to warehouse
      for (const slot of selectedSlots) {
        try {
          // Create warehouse entry
          await createItem('warehouse', {
            serial_number: slot.serial_number,
            provider: slot.provider,
            cabinet: slot.cabinet,
            game_mix: slot.game_mix,
            status: 'In Depozit',
            location: 'Depozit',
            notes: `Mutat din ${slot.location || 'Unknown'} la ${new Date().toLocaleDateString('ro-RO')}`
          }, true) // silent = true pentru bulk operations
          
          // Delete from slots
          await deleteItem('slots', slot.id, true) // silent = true pentru bulk operations
          successCount++
        } catch (error) {
          console.error(`Error moving slot ${slot.id}:`, error)
        }
      }
      
      setSelectedItems([])
      setShowBulkActions(false)
      
      // Dismiss loading and show single result
      toast.dismiss(loadingToast)
      toast.success(`✅ ${successCount}/${selectedSlots.length} sloturi mutate în Depozit`, {
        duration: 3000
      })
      
      // Refresh data
      if (loadAllData) {
        loadAllData()
      }
    } catch (error) {
      console.error('Error moving slots to warehouse:', error)
      toast.dismiss('bulk-move')
      toast.error('Eroare la mutarea sloturilor în depozit!')
    }
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


  // Calculează datele pentru Centralizator pe Locații
  const calculateLocationCentralizer = () => {
    const locations = ['Craiova', 'Pitesti', 'Ploiesti (Centru)', 'Ploiesti (Nord)', 'Valcea']
    const providers = [...new Set(slots.map(slot => slot.provider).filter(Boolean))].sort()
    
    // Funcție helper pentru matching locații
    const matchesLocation = (slotLocation, targetLocation) => {
      if (!slotLocation) return false
      const slotLoc = slotLocation.toLowerCase().trim()
      
      if (targetLocation === 'Craiova') {
        return slotLoc.includes('craiova')
      } else if (targetLocation === 'Pitesti') {
        return slotLoc.includes('pitesti') || slotLoc.includes('pitești')
      } else if (targetLocation === 'Ploiesti (Centru)') {
        return (slotLoc.includes('ploiesti') || slotLoc.includes('ploiești')) && 
               !slotLoc.includes('nord') && 
               !slotLoc.includes('centru') === false
      } else if (targetLocation === 'Ploiesti (Nord)') {
        return (slotLoc.includes('ploiesti') || slotLoc.includes('ploiești')) && 
               slotLoc.includes('nord')
      } else if (targetLocation === 'Valcea') {
        return slotLoc.includes('valcea') || slotLoc.includes('vâlcea')
      }
      return false
    }
    
    const centralizerData = providers.map(provider => {
      const providerSlots = slots.filter(slot => slot.provider === provider)
      const row = { provider }
      
      locations.forEach(location => {
        const locationSlots = providerSlots.filter(slot => matchesLocation(slot.location, location))
        
        // Folosește datele REALE din baza de date - property_type din slot
        const total = locationSlots.length
        // CHIRIE = sloturi cu property_type = 'Rented' (din baza de date)
        const chirie = locationSlots.filter(slot => 
          slot.property_type === 'Rented' || 
          slot.property_type === 'rented' || 
          slot.property_type?.toLowerCase() === 'rented'
        ).length
        
        row[location] = { total, chirie }
      })
      
      // Total general pentru furnizor - folosește datele REALE din baza de date
      const totalGeneral = providerSlots.length
      // CHIRIE = sloturi cu property_type = 'Rented' (din baza de date)
      const chirieGeneral = providerSlots.filter(slot => 
        slot.property_type === 'Rented' || 
        slot.property_type === 'rented' || 
        slot.property_type?.toLowerCase() === 'rented'
      ).length
      row.total = { total: totalGeneral, chirie: chirieGeneral }
      
      return row
    })
    
    // Adaugă rândul de total general - folosește datele REALE din baza de date
    const totalRow = { provider: 'TOTAL' }
    locations.forEach(location => {
      const locationSlots = slots.filter(slot => matchesLocation(slot.location, location))
      
      const total = locationSlots.length
      // CHIRIE = sloturi cu property_type = 'Rented' (din baza de date)
      const chirie = locationSlots.filter(slot => 
        slot.property_type === 'Rented' || 
        slot.property_type === 'rented' || 
        slot.property_type?.toLowerCase() === 'rented'
      ).length
      totalRow[location] = { total, chirie }
    })
    
    const totalGeneral = slots.length
    // CHIRIE = sloturi cu property_type = 'Rented' (din baza de date)
    const chirieGeneral = slots.filter(slot => 
      slot.property_type === 'Rented' || 
      slot.property_type === 'rented' || 
      slot.property_type?.toLowerCase() === 'rented'
    ).length
    totalRow.total = { total: totalGeneral, chirie: chirieGeneral }
    
    return [...centralizerData, totalRow]
  }

  const centralizerData = calculateLocationCentralizer()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6 relative z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg shadow-emerald-500/25">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Management Sloturi</h2>
              </div>
            </div>
            
            {/* Meniu Hamburger - În header */}
            <div className="relative z-[60]">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="inline-flex items-center justify-center p-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 transition-all hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm"
                title="Meniu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  />
                  
                  {/* Menu List */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl z-50 py-2">
                    <button
                      onClick={() => {
                        setShowCardSettings(true)
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Setări Carduri</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/slots/history')
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <History className="w-4 h-4" />
                      <span className="text-sm font-medium">Istoric Sloturi</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/slots/cyber-import')
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Database className="w-4 h-4" />
                      <span className="text-sm font-medium">Import Cyber</span>
                    </button>

                    <button
                      onClick={() => {
                        handleCreate()
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Adaugă Slot</span>
                    </button>
                  </div>
                </>
              )}
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

        {/* Grand Total Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Grand Total</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Slots */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {(() => {
                  const activeInSlots = slots.filter(slot => {
                    const status = slot.status?.toLowerCase() || ''
                    return status === 'active' || status === 'activ'
                  }).length
                  // Numără toate sloturile din warehouse (nu doar cele cu status "active")
                  const activeInWarehouse = warehouse?.length || 0
                  return activeInSlots + activeInWarehouse
                })()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {(() => {
                  const activeInSlots = slots.filter(slot => {
                    const status = slot.status?.toLowerCase() || ''
                    return status === 'active' || status === 'activ'
                  }).length
                  // Numără toate sloturile din warehouse (nu doar cele cu status "active")
                  const activeInWarehouse = warehouse?.length || 0
                  return `${activeInSlots} în slots, ${activeInWarehouse} în depozit`
                })()}
              </div>
            </div>
            
            {/* Proprii (Owned) */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Proprii</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {(() => {
                  const ownedInSlots = slots.filter(slot => {
                    const propType = slot.property_type?.toLowerCase() || ''
                    return propType === 'owned'
                  }).length
                  const ownedInWarehouse = warehouse?.filter(item => {
                    if (item.property_type !== undefined && item.property_type !== null) {
                      const propType = item.property_type?.toLowerCase() || ''
                      return propType === 'owned'
                    }
                    return false
                  }).length || 0
                  return ownedInSlots + ownedInWarehouse
                })()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {(() => {
                  const ownedInSlots = slots.filter(slot => {
                    const propType = slot.property_type?.toLowerCase() || ''
                    return propType === 'owned'
                  }).length
                  const ownedInWarehouse = warehouse?.filter(item => {
                    if (item.property_type !== undefined && item.property_type !== null) {
                      const propType = item.property_type?.toLowerCase() || ''
                      return propType === 'owned'
                    }
                    return false
                  }).length || 0
                  return `${ownedInSlots} în slots, ${ownedInWarehouse} în depozit`
                })()}
              </div>
            </div>
            
            {/* Închiriate (Rented) */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Închiriate</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {(() => {
                  const rentedInSlots = slots.filter(slot => {
                    const propType = slot.property_type?.toLowerCase() || ''
                    return propType === 'rented'
                  }).length
                  const rentedInWarehouse = warehouse?.filter(item => {
                    if (item.property_type !== undefined && item.property_type !== null) {
                      const propType = item.property_type?.toLowerCase() || ''
                      return propType === 'rented'
                    }
                    return false
                  }).length || 0
                  return rentedInSlots + rentedInWarehouse
                })()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {(() => {
                  const rentedInSlots = slots.filter(slot => {
                    const propType = slot.property_type?.toLowerCase() || ''
                    return propType === 'rented'
                  }).length
                  const rentedInWarehouse = warehouse?.filter(item => {
                    if (item.property_type !== undefined && item.property_type !== null) {
                      const propType = item.property_type?.toLowerCase() || ''
                      return propType === 'rented'
                    }
                    return false
                  }).length || 0
                  return `${rentedInSlots} în slots, ${rentedInWarehouse} în depozit`
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Centralizator pe Locații */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Centralizator pe Locații
          </h3>
          <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                    FURNIZOR
                  </th>
                  <th colSpan="2" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                    CRAIOVA
                  </th>
                  <th colSpan="2" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                    PITESTI
                  </th>
                  <th colSpan="2" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                    PLOIESTI (CENTRU)
                  </th>
                  <th colSpan="2" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                    PLOIESTI (NORD)
                  </th>
                  <th colSpan="2" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                    VALCEA
                  </th>
                  <th colSpan="2" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                    TOTAL
                  </th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10"></th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">TOTAL</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">CHIRIE</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">TOTAL</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">CHIRIE</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">TOTAL</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">CHIRIE</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">TOTAL</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">CHIRIE</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">TOTAL</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">CHIRIE</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">TOTAL</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">CHIRIE</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {centralizerData.map((row, index) => {
                  const isTotalRow = row.provider === 'TOTAL'
                  const rowBgClass = isTotalRow 
                    ? 'bg-slate-100 dark:bg-slate-800' 
                    : 'bg-white dark:bg-slate-800'
                  const rowHoverClass = isTotalRow 
                    ? '' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  
                  return (
                    <tr 
                      key={row.provider} 
                      className={`${rowBgClass} ${rowHoverClass} ${
                        isTotalRow ? 'font-semibold border-t-2 border-slate-300 dark:border-slate-700' : ''
                      }`}
                    >
                      <td className={`px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 ${rowBgClass}`} style={{ backgroundColor: isTotalRow ? 'rgb(241 245 249)' : undefined }}>
                        {row.provider}
                      </td>
                      {['Craiova', 'Pitesti', 'Ploiesti (Centru)', 'Ploiesti (Nord)', 'Valcea'].map((location, locIndex) => (
                        <React.Fragment key={location}>
                          <td className={`px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 ${rowBgClass}`}>
                            {row[location]?.total !== undefined ? row[location].total : '-'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300 ${rowBgClass}`}>
                            {row[location]?.chirie !== undefined ? row[location].chirie : '-'}
                          </td>
                        </React.Fragment>
                      ))}
                      <td className={`px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300 border-l-2 border-slate-300 dark:border-slate-600 ${rowBgClass}`}>
                        {row.total?.total !== undefined ? row.total.total : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300 ${rowBgClass}`}>
                        {row.total?.chirie !== undefined ? row.total.chirie : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advanced Search and Filters - Mutat sub tabelul centralizator */}
        <div className="card p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search Bar - aceeași înălțime ca filtrele */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută în toate câmpurile sloturilor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-20 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {/* Bula cu rezultatele căutării */}
              {searchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                    {filteredSlots.length} / {slots.length}
                  </span>
                </div>
              )}
            </div>
            
            {/* Advanced Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Filtre:</span>
              </div>
              
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
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="all">Toate Locațiile</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
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
              
              {/* Commission Filter */}
              <select
                value={commissionFilters.length > 0 ? commissionFilters[0] : 'all'}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setCommissionFilters([])
                  } else {
                    setCommissionFilters([e.target.value])
                  }
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toate Comisiile</option>
                {commissions.map((commission) => {
                  const dateStr = new Date(commission.commission_date).toISOString().split('T')[0]
                  return (
                    <option key={commission.id} value={dateStr}>
                      {commission.name} ({new Date(commission.commission_date).toLocaleDateString('ro-RO')})
                    </option>
                  )
                })}
              </select>
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
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              moduleColor="blue"
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
