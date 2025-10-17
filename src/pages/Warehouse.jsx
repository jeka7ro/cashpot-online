import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { Package, Plus, Search, Upload, Download, Edit, Trash2, Eye, BarChart3, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import DataTable from '../components/DataTable'
import WarehouseModal from '../components/modals/WarehouseModal'
import StatCard from '../components/StatCard'
import { toast } from 'react-hot-toast'
import { formatGameMixName } from '../utils/gameMixFormatter'

const Warehouse = () => {
  const { warehouse, slots, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredWarehouse.map(item => item.id))
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
    // Închide modal-ul imediat
    setShowBulkDeleteModal(false)
    
    const totalItems = selectedItems.length
    let successCount = 0
    let errorCount = 0
    
    try {
      // Pornește loading toast
      const loadingToast = toast.loading(`Șterg ${totalItems} elemente...`, {
        duration: Infinity
      })
      
      // Șterge în batch-uri pentru performanță mai bună
      const batchSize = 10
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize)
        
        // Procesează batch-ul în paralel
        const promises = batch.map(async (id) => {
          try {
            await deleteItem('warehouse', id, true) // silent = true pentru bulk delete
            successCount++
          } catch (error) {
            errorCount++
          }
        })
        
        await Promise.all(promises)
        
        // Update progress
        const processed = Math.min(i + batchSize, totalItems)
        toast.loading(`Șterg ${totalItems} elemente... (${processed}/${totalItems})`, {
          id: loadingToast
        })
      }
      
      // Clear loading toast
      toast.dismiss(loadingToast)
      
      // Afișează rezultatul final
      if (errorCount === 0) {
        toast.success(`✅ ${successCount} elemente șterse cu succes!`, {
          duration: 5000
        })
      } else if (successCount > 0) {
        toast.success(`⚠️ ${successCount} elemente șterse, ${errorCount} erori`, {
          duration: 5000
        })
      } else {
        toast.error(`❌ Eroare la ștergerea tuturor ${totalItems} elemente`, {
          duration: 5000
        })
      }
      
      // Cleanup
      setSelectedItems([])
      setShowBulkActions(false)
      
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Eroare la ștergerea elementelor!')
      setShowBulkDeleteModal(false)
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    console.log('Bulk edit for:', selectedItems)
  }
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const filteredWarehouse = warehouse.filter(item =>
    item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cabinet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.game_mix?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Statistics
  const totalWarehouse = warehouse.length
  const inactiveWarehouse = warehouse.filter(item => item.status === 'Inactive').length

  const columns = [
    {
      key: 'serial_number',
      label: 'SERIAL NUMBER',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-semibold text-base">
          {item.serial_number || 'N/A'}
        </div>
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
          {formatGameMixName(item.game_mix)}
        </div>
      )
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
            if (newStatus === 'Active') {
              // Move slot back to slots table
              await createItem('slots', {
                name: 'Slot Machine',
                serial_number: item.serial_number,
                provider: item.provider,
                location: 'Locație principală',
                game: '',
                cabinet: item.cabinet,
                game_mix: item.game_mix,
                denomination: 0.01,
                max_bet: null,
                rtp: null,
                gaming_places: 1,
                property_type: 'Owned',
                commission_date: null,
                invoice_number: null,
                status: 'Active',
                notes: `Mutat automat din depozit când a devenit activ`
              })
              
              // Delete from warehouse table
              await deleteItem('warehouse', item.id)
              toast.success('Slot mutat înapoi în sloturi')
            } else {
              // Just update status for inactive slots
              await updateItem('warehouse', item.id, { ...item, status: newStatus })
              toast.success(`Status schimbat în ${newStatus}`)
            }
          } catch (error) {
            toast.error('Eroare la actualizare status')
            console.error('Error updating warehouse slot status:', error)
          }
        }
        
        const status = item.status?.toLowerCase() || ''
        const isActive = status === 'activ' || status === 'active'
        
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleStatusToggle}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-9' : 'translate-x-1'
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
      key: 'created_by',
      label: 'CREAT DE',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.created_by || 'N/A'}
        </div>
      )
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
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sigur vrei să ștergi acest slot din depozit?')) {
      try {
        await deleteItem('warehouse', id)
        toast.success('Slot șters din depozit cu succes!')
      } catch (error) {
        toast.error('Eroare la ștergerea slotului')
        console.error('Error deleting slot from warehouse:', error)
      }
    }
  }

  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleSave = async (itemData) => {
    try {
      if (editingItem) {
        await updateItem('warehouse', editingItem.id, itemData)
        toast.success('Slot actualizat cu succes!')
      } else {
        await createItem('warehouse', itemData)
        toast.success('Slot adăugat în depozit cu succes!')
      }
      setShowModal(false)
      setEditingItem(null)
    } catch (error) {
      toast.error('Eroare la salvarea slotului')
      console.error('Error saving slot to warehouse:', error)
    }
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('warehouse')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('warehouse')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-slate-500 to-gray-500 rounded-2xl shadow-lg shadow-slate-500/25">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Depozit Sloturi</h2>
                <p className="text-slate-600">Sloturile inactive din depozit</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="warehouse"
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
                onClick={handleCreate}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă Slot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sloturi"
            value={totalWarehouse}
            icon={BarChart3}
            color="blue"
            trend={null}
          />
          <StatCard
            title="Inactive"
            value={inactiveWarehouse}
            icon={AlertCircle}
            color="red"
            trend={null}
          />
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută după numărul de serie, furnizor, locație, cabinet sau game mix..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <button className="btn-secondary flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Importă</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>
            </div>
          ) : filteredWarehouse.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există sloturi în depozit</h3>
              <p className="text-slate-500">Sloturile inactive vor apărea aici automat</p>
            </div>
          ) : (
            <DataTable
              data={filteredWarehouse}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
          moduleColor="blue"
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <WarehouseModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
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
                    Șterge {selectedItems.length} Elemente
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Această acțiune nu poate fi anulată
                  </p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Ești sigur că vrei să ștergi {selectedItems.length} elemente selectate din depozit? Toate datele asociate vor fi șterse permanent.
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
                  Șterge {selectedItems.length} Elemente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Warehouse
