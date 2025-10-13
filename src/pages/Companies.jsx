import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import CompanyModal from '../components/modals/CompanyModal'
import ConfirmModal from '../components/modals/ConfirmModal'
import useConfirm from '../hooks/useConfirm'
import { Building2, Plus, Search, Upload, Download, Eye, Phone, Mail, User, Edit, Trash2 } from 'lucide-react'

const Companies = () => {
  const navigate = useNavigate()
  const { companies, createItem, updateItem, deleteItem, exportData, loading } = useData()
  const { confirmState, confirm, close } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.license?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      key: 'companyInfo',
      label: 'Companie & CUI',
      sortable: true,
      render: (item) => (
        <div className="space-y-2">
          {/* Numele companiei */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <button
              onClick={() => navigate(`/companies/${item.id}`)}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-left"
            >
              {item.name}
            </button>
          </div>
          
          {/* Licența */}
          {item.license && (
            <div className="flex items-center space-x-2">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-bold">
                {item.license}
              </span>
            </div>
          )}
          
          {/* CUI */}
          {item.cui && (
            <div className="flex items-center space-x-2">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-bold">
                CUI: {item.cui}
              </span>
              {item.cuiFile && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => window.open(item.cuiFile, '_blank')}
                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                    title="Previzualizează CUI"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = item.cuiFile
                      link.download = `CUI_${item.name || 'company'}.${item.cuiFile.includes('data:image') ? 'jpg' : 'pdf'}`
                      link.click()
                    }}
                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                    title="Descarcă CUI"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'contactInfo',
      label: 'Contact',
      sortable: true,
      render: (item) => (
        <div className="space-y-2">
          {/* Contact Person */}
          {item.contact_person && (
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              <div className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                {item.contact_person}
              </div>
            </div>
          )}
          
          {/* Telefon */}
          {item.phone && (
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                {item.phone}
              </div>
            </div>
          )}
          
          {/* Email */}
          {item.email && (
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                {item.email}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => {
        const status = item.status?.toLowerCase() || ''
        const isActive = status === 'activ' || status === 'active'
        const isSuspended = status === 'suspendat' || status === 'suspended'
        
        return (
          <span className={`px-4 py-2 rounded-2xl text-xs font-bold shadow-lg ${
            isActive
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/25' 
              : isSuspended
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-yellow-500/25'
              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-500/25'
          }`}>
            {isActive ? 'Activ' : isSuspended ? 'Suspendat' : 'Inactiv'}
          </span>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Data Creare',
      sortable: true,
      render: (item) => (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {new Date(item.created_at).toLocaleDateString('ro-RO')}
        </div>
      )
    },
    {
      key: 'created_by',
      label: 'Creat de',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">
            {item.created_by?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {item.created_by || 'Sistem'}
          </span>
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
    const confirmed = await confirm({
      title: 'Șterge Companie',
      message: `Sigur doriți să ștergeți compania "${item.name}"?`,
      type: 'danger'
    })
    if (confirmed) {
      await deleteItem('companies', item.id)
    }
  }

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredCompanies.map(company => company.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(companyId => companyId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    
    const confirmed = await confirm({
      title: 'Șterge Companiile',
      message: `Ești sigur că vrei să ștergi ${selectedItems.length} companii?`,
      type: 'danger'
    })
    if (confirmed) {
      try {
        for (const id of selectedItems) {
          await deleteItem('companies', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting companies:', error)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    console.log('Bulk edit for companies:', selectedItems)
  }

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('companies', editingItem.id, data)
    } else {
      await createItem('companies', data)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleExport = async () => {
    await exportData('companies', 'excel')
  }

  const handleImport = () => {
    // TODO: Implement import functionality
    console.log('Import functionality to be implemented')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Management Companii</h2>
                <p className="text-slate-600 dark:text-slate-400">Gestionează companiile de gaming din sistem</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Caută companii..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="input-field pl-12 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400" 
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
                  onClick={handleAdd}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>Adaugă Companie</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={filteredCompanies}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading.companies}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
        />

        {/* Modal */}
        {showModal && (
          <CompanyModal
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={handleSave}
          />
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmState.isOpen}
          onClose={close}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          type={confirmState.type}
        />
      </div>
    </Layout>
  )
}

export default Companies
