import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { Users as UsersIcon, Plus, Search, Upload, Download, Edit, Trash2 } from 'lucide-react'
import DataTable from '../components/DataTable'
import UserModal from '../components/modals/UserModal'

const Users = () => {
  const { users, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredUsers.map(user => user.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(userId => userId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} utilizatori?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('users', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting users:', error)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    console.log('Bulk edit for users:', selectedItems)
  }

  const filteredUsers = users.filter(item =>
    item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { 
      key: 'full_name', 
      label: 'NUME COMPLET', 
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {item.avatar ? (
              <img 
                src={item.avatar} 
                alt={item.full_name || item.username} 
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                {(item.full_name || item.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {item.full_name || 'N/A'}
            </p>
            <p className="text-sm text-slate-500 truncate">
              @{item.username}
            </p>
          </div>
        </div>
      )
    },
    { key: 'email', label: 'EMAIL', sortable: true },
    { key: 'role', label: 'ROL', sortable: true },
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { key: 'created_at', label: 'DATA CREARE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
      </div>
    )}
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Sigur vrei să ștergi acest utilizator?')
    if (!confirmed) return
    
    try {
      const result = await deleteItem('users', id)
      if (!result.success) {
        toast.error('Eroare la ștergerea utilizatorului')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Eroare la ștergerea utilizatorului')
    }
  }

  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleSave = async (itemData) => {
    if (editingItem) {
      await updateItem('users', editingItem.id, itemData)
    } else {
      await createItem('users', itemData)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('users')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('users')
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
              <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl shadow-lg shadow-purple-500/25">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Management Utilizatori</h2>
                <p className="text-slate-600">Gestionează utilizatorii din sistem</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="users"
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
                  onClick={handleCreate}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă Utilizator</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută utilizatori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există utilizatori</h3>
              <p className="text-slate-500">Adaugă primul utilizator pentru a începe</p>
            </div>
          ) : (
            <DataTable
              data={filteredUsers}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
          moduleColor="purple"
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <UserModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}

export default Users
