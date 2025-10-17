import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'

const ApprovalDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { approvals, updateItem, deleteItem } = useData()
  const [approval, setApproval] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    const foundApproval = approvals.find(a => a.id === parseInt(id))
    if (foundApproval) {
      setApproval(foundApproval)
      setLoading(false)
    } else {
      toast.error('Aprobarea nu a fost găsită')
      navigate('/metrology')
    }
  }, [id, approvals, navigate])

  const handleDelete = async () => {
    try {
      await deleteItem('approvals', approval.id)
      toast.success('Aprobarea a fost ștearsă cu succes')
      navigate('/metrology')
    } catch (error) {
      toast.error('Eroare la ștergerea aprobării')
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploaded: false
    }))
    setAttachments(prev => [...prev, ...newAttachments])
    toast.success(`${files.length} fișiere adăugate`)
  }

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Aprobarea nu a fost găsită</h2>
          <p className="text-slate-600 mb-4">Aprobarea pe care o căutați nu există sau a fost ștearsă.</p>
          <button
            onClick={() => navigate('/metrology')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Înapoi la Metrologie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/metrology')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Înapoi la Metrologie"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/25">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {approval.name}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Aprobare de Tip - {approval.provider} | {approval.cabinet}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Editează</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Șterge</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-500" />
                Informații Aprobare
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Numele Aprobării</label>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold text-lg">{approval.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Furnizor</label>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{approval.provider || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cabinet</label>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{approval.cabinet || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Game Mix</label>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{approval.game_mix || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Autoritate Emitentă</label>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{approval.issuing_authority || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat de</label>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{approval.created_by || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Checksums */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-blue-500" />
                Checksums
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">MD5</label>
                  <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-slate-800 dark:text-slate-200 font-mono text-sm break-all">
                      {approval.checksum_md5 || 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">SHA256</label>
                  <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-slate-800 dark:text-slate-200 font-mono text-sm break-all">
                      {approval.checksum_sha256 || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {approval.notes && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h3>
                <p className="text-slate-800 dark:text-slate-200">{approval.notes}</p>
              </div>
            )}
          </div>

          {/* Attachments Sidebar */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-500" />
                Atașamente
              </h3>
              
              <div className="space-y-4">
                <label className="block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <div className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 transition-colors cursor-pointer text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600 dark:text-slate-400">Apasă pentru a adăuga fișiere</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">PDF, DOC, JPG, PNG</p>
                  </div>
                </label>

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{attachment.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Metadata</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat la</label>
                  <p className="text-slate-800 dark:text-slate-200">
                    {approval.created_at ? new Date(approval.created_at).toLocaleString('ro-RO') : 'N/A'}
                  </p>
                </div>
                {approval.updated_at && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Actualizat la</label>
                    <p className="text-slate-800 dark:text-slate-200">
                      {new Date(approval.updated_at).toLocaleString('ro-RO')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Confirmă ștergerea
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ești sigur că vrei să ștergi aprobarea "{approval.name}"? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApprovalDetail
