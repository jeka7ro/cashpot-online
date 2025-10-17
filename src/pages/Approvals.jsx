import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import ApprovalModal from '../components/modals/ApprovalModal'
import { FileText, Plus, Search, Download, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Approvals = () => {
  const { approvals, providers, cabinets, gameMixes, createItem, updateItem, deleteItem, exportData, loading } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredApprovals.map(item => item.id))
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
    setShowBulkDeleteModal(false)
    const totalItems = selectedItems.length
    let successCount = 0
    let errorCount = 0

    try {
      const loadingToast = toast.loading(`Șterg ${totalItems} elemente...`, { duration: Infinity })
      const batchSize = 5
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize)
        const promises = batch.map(async (id) => {
          try {
            await deleteItem('approvals', id, true)
            successCount++
          } catch (error) {
            errorCount++
            console.error(`Error deleting approval ${id}:`, error)
          }
        })
        await Promise.all(promises)
        const processed = Math.min(i + batchSize, totalItems)
        toast.loading(`Șterg ${totalItems} elemente... (${processed}/${totalItems})`, { id: loadingToast })
      }
      toast.dismiss(loadingToast)
      if (errorCount === 0) {
        toast.success(`✅ ${successCount} elemente șterse cu succes!`, { duration: 5000 })
      } else if (successCount > 0) {
        toast.success(`⚠️ ${successCount} elemente șterse, ${errorCount} erori`, { duration: 5000 })
      } else {
        toast.error(`❌ Eroare la ștergerea tuturor ${totalItems} elemente`, { duration: 5000 })
      }
      setSelectedItems([])
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Eroare la ștergerea elementelor!')
      setShowBulkDeleteModal(false)
    }
  }

  const filteredApprovals = approvals.filter(approval =>
    approval.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.cabinet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.game_mix?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      label: 'Nume Aprobare',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="font-bold text-slate-900">{item.name}</div>
        </div>
      )
    },
    { key: 'provider', label: 'Furnizor', sortable: true },
    { key: 'cabinet', label: 'Cabinet', sortable: true },
    { key: 'game_mix', label: 'Game Mix', sortable: true },
    { key: 'issuing_authority', label: 'Autoritate Emitentă', sortable: true },
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

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('approvals', editingItem.id, data)
    } else {
      await createItem('approvals', data)
    }
    setShowModal(false)
  }

  const handleDelete = async (item) => {
    const id = typeof item === 'object' ? item.id : item;
    if (window.confirm('Sigur vrei să ștergi această aprobare?')) {
      await deleteItem('approvals', id)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Caută aprobări..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-12"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportData('approvals')}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Export</span>
              </button>
              {showBulkActions && (
                <>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Șterge ({selectedItems.length})</span>
                  </button>
                </>
              )}
              <button
                onClick={handleAdd}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>Adaugă Aprobare</span>
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <DataTable
            data={filteredApprovals}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRowClick={(item) => navigate(`/approval-detail/${item.id}`)}
            loading={loading}
            selectedItems={selectedItems}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectItem}
            moduleColor="blue"
          />
        </div>
      </div>

      {showModal && (
        <ApprovalModal
          item={editingItem}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          providers={providers}
          cabinets={cabinets}
          gameMixes={gameMixes}
        />
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Șterge {selectedItems.length} Elemente
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Această acțiune nu poate fi anulată
                  </p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Ești sigur că vrei să ștergi {selectedItems.length} elemente selectate? Toate datele asociate vor fi șterse permanent.
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
        </div>
      )}
    </Layout>
  )
}

export default Approvals
