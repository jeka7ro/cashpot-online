import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { Package, Plus, Search, Upload, Edit, Trash2, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'
import DataTable from '../components/DataTable'
import ImportProductsModal from '../components/modals/ImportProductsModal'
import StatCard from '../components/StatCard'
import { toast } from 'react-hot-toast'
import axios from 'axios'

const Products = () => {
  const navigate = useNavigate()
  const { warehouse, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  // Filter warehouse items that are products (have cod in notes)
  const products = warehouse.filter(item => {
    try {
      const notes = item.notes ? JSON.parse(item.notes) : {}
      return notes.cod || notes.code || item.serial_number?.startsWith('PROD-')
    } catch {
      return false
    }
  })

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  const filteredProducts = products.filter(item => {
    try {
      const notes = item.notes ? JSON.parse(item.notes) : {}
      const cod = notes.cod || notes.code || ''
      const nume = notes.nume || notes.name || notes.product_name || item.game_mix || ''
      const provider = item.provider || ''
      const location = item.location || ''
      
      return (
        cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } catch {
      return item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.provider?.toLowerCase().includes(searchTerm.toLowerCase())
    }
  })

  // Statistics
  const totalProducts = products.length
  const activeProducts = products.filter(item => item.status === 'Active').length
  const productsBySupplier = {}
  products.forEach(item => {
    const supplier = item.provider || 'N/A'
    productsBySupplier[supplier] = (productsBySupplier[supplier] || 0) + 1
  })
  const uniqueSuppliers = Object.keys(productsBySupplier).length

  const columns = [
    {
      key: 'cod',
      label: 'COD',
      sortable: true,
      render: (item) => {
        try {
          const notes = item.notes ? JSON.parse(item.notes) : {}
          const cod = notes.cod || notes.code || item.serial_number || 'N/A'
          return (
            <div className="text-slate-800 font-mono font-semibold text-base">
              {cod}
            </div>
          )
        } catch {
          return (
            <div className="text-slate-800 font-mono font-semibold text-base">
              {item.serial_number || 'N/A'}
            </div>
          )
        }
      }
    },
    {
      key: 'nume',
      label: 'NUME PRODUS',
      sortable: true,
      render: (item) => {
        try {
          const notes = item.notes ? JSON.parse(item.notes) : {}
          const nume = notes.nume || notes.name || notes.product_name || item.game_mix || 'N/A'
          return (
            <div className="text-slate-800 font-medium text-base">
              {nume}
            </div>
          )
        } catch {
          return (
            <div className="text-slate-800 font-medium text-base">
              {item.game_mix || 'N/A'}
            </div>
          )
        }
      }
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
      label: 'ORAȘ',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.location || 'N/A'}
        </div>
      )
    },
    {
      key: 'unitate',
      label: 'UNITATE',
      sortable: true,
      render: (item) => {
        try {
          const notes = item.notes ? JSON.parse(item.notes) : {}
          const unitate = notes.unitate || notes.unit || 'N/A'
          return (
            <div className="text-slate-800 font-medium text-base">
              {unitate}
            </div>
          )
        } catch {
          return <div className="text-slate-800 font-medium text-base">N/A</div>
        }
      }
    },
    {
      key: 'pret',
      label: 'PREȚ',
      sortable: true,
      render: (item) => {
        try {
          const notes = item.notes ? JSON.parse(item.notes) : {}
          const pret = notes.pret || notes.price || 'N/A'
          return (
            <div className="text-slate-800 font-medium text-base">
              {pret !== 'N/A' ? `${pret} RON` : 'N/A'}
            </div>
          )
        } catch {
          return <div className="text-slate-800 font-medium text-base">N/A</div>
        }
      }
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => {
        const status = item.status?.toLowerCase() || ''
        const isActive = status === 'activ' || status === 'active'
        
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              isActive 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {isActive ? 'Activ' : 'Inactiv'}
            </span>
          </div>
        )
      }
    },
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sigur vrei să ștergi acest produs?')) {
      try {
        await deleteItem('warehouse', id)
        toast.success('Produs șters cu succes!')
      } catch (error) {
        toast.error('Eroare la ștergerea produsului')
        console.error('Error deleting product:', error)
      }
    }
  }

  const handleSave = async (itemData) => {
    try {
      if (editingItem) {
        await updateItem('warehouse', editingItem.id, itemData)
        toast.success('Produs actualizat cu succes!')
      } else {
        await createItem('warehouse', itemData)
        toast.success('Produs adăugat cu succes!')
      }
      setShowModal(false)
      setEditingItem(null)
    } catch (error) {
      toast.error('Eroare la salvarea produsului')
      console.error('Error saving product:', error)
    }
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('warehouse', filteredProducts)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('warehouse', filteredProducts)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredProducts.map(item => item.id))
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/25">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Produse</h2>
                <p className="text-slate-600">Gestionare produse importate din API</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/warehouse/inventory-centralizer')}
                className="btn-secondary flex items-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>Inventar Centralizator</span>
              </button>
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="products"
              />
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Importă din API</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Produse"
            value={totalProducts}
            icon={BarChart3}
            color="blue"
            trend={null}
          />
          <StatCard
            title="Produse Active"
            value={activeProducts}
            icon={CheckCircle}
            color="green"
            trend={null}
          />
          <StatCard
            title="Furnizori"
            value={uniqueSuppliers}
            icon={Package}
            color="purple"
            trend={null}
          />
          <StatCard
            title="Inactive"
            value={totalProducts - activeProducts}
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
                placeholder="Caută după cod, nume, furnizor sau oraș..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există produse</h3>
              <p className="text-slate-500 mb-4">Importă produse din API pentru a începe</p>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Importă din API</span>
              </button>
            </div>
          ) : (
            <DataTable
              data={filteredProducts}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              moduleColor="emerald"
            />
          )}
        </div>

        {/* Import Products Modal */}
        {showImportModal && (
          <ImportProductsModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImportComplete={(data) => {
              // Refresh data after import
              window.location.reload()
            }}
          />
        )}
      </div>
    </Layout>
  )
}

export default Products




