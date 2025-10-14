import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { Package, Plus, Search, Upload, Download, Edit, Trash2, Eye, BarChart3, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import DataTable from '../components/DataTable'
import WarehouseModal from '../components/modals/WarehouseModal'
import StatCard from '../components/StatCard'
import { toast } from 'react-hot-toast'

const Warehouse = () => {
  const { warehouse, slots, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
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
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} elemente?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('warehouse', id)
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
          {item.game_mix || 'N/A'}
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
          moduleColor="red"
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
      </div>
    </Layout>
  )
}

export default Warehouse
