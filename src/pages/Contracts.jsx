import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import ContractModal from '../components/modals/ContractModal'
import ExportButtons from '../components/ExportButtons'
import { FileText, Plus, Search, Eye, Edit, Trash2, Calendar, MapPin, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'

const Contracts = () => {
  const navigate = useNavigate()
  const { contracts, locations, proprietari, createItem, updateItem, deleteItem, exportToExcel, exportToPDF, loading } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.type?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const columns = [
    {
      key: 'contract_number',
      label: 'NUMĂR CONTRACT',
      sortable: true,
      render: (item) => (
        <button
          onClick={() => navigate(`/contracts/${item.id}`)}
          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold text-base hover:underline transition-colors"
        >
          {item.contract_number}
        </button>
      )
    },
    {
      key: 'title',
      label: 'TITLU',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium">
          {item.title}
        </div>
      )
    },
    {
      key: 'location',
      label: 'LOCAȚIE',
      sortable: true,
      render: (item) => {
        const location = locations?.find(l => l.id === item.location_id)
        return (
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-slate-800 dark:text-slate-200">{location?.name || 'N/A'}</span>
          </div>
        )
      }
    },
    {
      key: 'proprietar',
      label: 'PROPRIETAR',
      sortable: true,
      render: (item) => {
        const proprietar = proprietari?.find(p => p.id === item.proprietar_id)
        return (
          <div className="text-slate-800 dark:text-slate-200">{proprietar?.name || 'N/A'}</div>
        )
      }
    },
    {
      key: 'period',
      label: 'PERIOADĂ',
      sortable: false,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 text-sm">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{item.start_date ? new Date(item.start_date).toLocaleDateString('ro-RO') : 'N/A'}</span>
          </div>
          <div className="text-xs text-slate-500">
            până {item.end_date ? new Date(item.end_date).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'monthly_rent',
      label: 'CHIRIE LUNARĂ',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="text-slate-800 dark:text-slate-200 font-semibold">
            {parseFloat(item.monthly_rent || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {item.currency}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          item.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
          item.status === 'Expired' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}>
          {item.status}
        </span>
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

  const handleSave = async (formData) => {
    try {
      if (editingItem) {
        await updateItem('contracts', editingItem.id, formData)
        toast.success('Contract actualizat cu succes!')
      } else {
        await createItem('contracts', formData)
        toast.success('Contract creat cu succes!')
      }
      setShowModal(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Error saving contract:', error)
      toast.error('Eroare la salvarea contractului')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sigur vrei să ștergi acest contract?')) {
      try {
        await deleteItem('contracts', id)
        toast.success('Contract șters cu succes!')
      } catch (error) {
        console.error('Error deleting contract:', error)
        toast.error('Eroare la ștergerea contractului')
      }
    }
  }

  const handleView = (item) => {
    navigate(`/contracts/${item.id}`)
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2 flex items-center">
                <div className="mr-4 p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                Management Contracte
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Gestionează contractele de chirie din sistem</p>
            </div>
            <ExportButtons
              onExportExcel={() => exportToExcel(filteredContracts, 'Contracte')}
              onExportPDF={() => exportToPDF(filteredContracts, 'Contracte', columns)}
            />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută după număr, titlu, tip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="all">Toate Statusurile</option>
              <option value="Active">Active</option>
              <option value="Expired">Expirate</option>
              <option value="Pending">În Așteptare</option>
            </select>
            <button
              onClick={handleAdd}
              className="btn-primary flex items-center space-x-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span>Adaugă Contract</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={filteredContracts}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          searchTerm={searchTerm}
          selectedItems={selectedItems}
          loading={loading.contracts}
          moduleColor="green"
        />

        {/* Contract Modal */}
        {showModal && (
          <ContractModal
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}

export default Contracts

