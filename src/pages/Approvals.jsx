import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, FileText, Edit, Trash2, Eye, Download, Upload } from 'lucide-react'
import Layout from '../components/Layout'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import ApprovalModal from '../components/modals/ApprovalModal'

const Approvals = () => {
  const navigate = useNavigate()
  const { approvals, providers, cabinets, gameMixes, createItem, updateItem, deleteItem } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterCabinet, setFilterCabinet] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)

  // Filter approvals
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.cabinet?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProvider = !filterProvider || approval.provider === filterProvider
    const matchesCabinet = !filterCabinet || approval.cabinet === filterCabinet
    
    return matchesSearch && matchesProvider && matchesCabinet
  })

  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = (item) => {
    setDeletingItem(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deletingItem) {
      try {
        await deleteItem('approvals', deletingItem.id)
        toast.success('Aprobarea a fost ștearsă cu succes')
      } catch (error) {
        toast.error('Eroare la ștergerea aprobării')
      }
    }
    setShowDeleteModal(false)
    setDeletingItem(null)
  }

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await updateItem('approvals', editingItem.id, data)
        toast.success('Aprobarea a fost actualizată cu succes')
      } else {
        await createItem('approvals', data)
        toast.success('Aprobarea a fost creată cu succes')
      }
      setShowModal(false)
      setEditingItem(null)
    } catch (error) {
      toast.error('Eroare la salvarea aprobării')
    }
  }

  const handleViewDetail = (item) => {
    navigate(`/approval-detail/${item.id}`)
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Aprobări de Tip</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Gestionează aprobările de tip pentru software-ul de jocuri
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg hover:shadow-emerald-500/25"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Adaugă Aprobare</span>
              </div>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Caută aprobări..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Provider Filter */}
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">Toate furnizorii</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>

              {/* Cabinet Filter */}
              <select
                value={filterCabinet}
                onChange={(e) => setFilterCabinet(e.target.value)}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">Toate cabinetele</option>
                {cabinets.map(cabinet => (
                  <option key={cabinet.id} value={cabinet.name}>
                    {cabinet.name}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterProvider('')
                  setFilterCabinet('')
                }}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Filter className="w-5 h-5 inline mr-2" />
                Resetează
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-800 via-green-800 to-teal-800">
                <tr>
                  <th className="px-6 py-4 text-left text-white font-semibold">Numele</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Furnizor</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Cabinet</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Game Mix</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Autoritatea</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Checksums</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Atasamente</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Creat de</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {approval.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        {approval.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                        {approval.cabinet}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                        {approval.game_mix || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 dark:text-slate-400">
                        {approval.issuing_authority || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {approval.checksum_md5 && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                            MD5
                          </span>
                        )}
                        {approval.checksum_sha256 && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded text-xs">
                            SHA256
                          </span>
                        )}
                        {!approval.checksum_md5 && !approval.checksum_sha256 && (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-600 dark:text-slate-400">
                          {Array.isArray(approval.attachments) ? approval.attachments.length : 0}
                        </span>
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 dark:text-slate-400">
                        <div className="font-medium">{approval.created_by}</div>
                        <div className="text-sm">
                          {new Date(approval.created_at).toLocaleDateString('ro-RO')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(approval)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                          title="Vezi detalii"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(approval)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editează"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(approval)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Șterge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredApprovals.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Nu există aprobări
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchTerm || filterProvider || filterCabinet
                  ? 'Nu s-au găsit aprobări care să corespundă filtrilor selectate.'
                  : 'Începe prin a adăuga prima aprobare de tip.'}
              </p>
              {!searchTerm && !filterProvider && !filterCabinet && (
                <button
                  onClick={handleCreate}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all"
                >
                  Adaugă Prima Aprobare
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <ApprovalModal
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={handleSave}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Confirmă ștergerea
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Ești sigur că vrei să ștergi această aprobare?
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Șterge
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Approvals
