import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Upload, CheckCircle, AlertCircle, Building2, Wrench, Package, Shield } from 'lucide-react'
import Layout from '../components/Layout'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import ApprovalModal from '../components/modals/ApprovalModal'
import { getGameMixName } from '../utils/gameMixFormatter'

const ApprovalDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { approvals, providers, cabinets, gameMixes, updateItem, deleteItem } = useData()
  const [approval, setApproval] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const foundApproval = approvals.find(a => a.id === parseInt(id))
    if (foundApproval) {
      setApproval(foundApproval)
      // Parse attachments
      if (foundApproval.attachments) {
        try {
          const parsed = typeof foundApproval.attachments === 'string' 
            ? JSON.parse(foundApproval.attachments)
            : foundApproval.attachments
          setAttachments(Array.isArray(parsed) ? parsed : [])
        } catch (e) {
          setAttachments([])
        }
      }
      setLoading(false)
    } else {
      toast.error('Aprobarea nu a fost găsită')
      navigate('/metrology?tab=approvals')
    }
  }, [id, approvals, navigate])

  // Re-sync attachments when approval changes
  useEffect(() => {
    if (approval?.attachments) {
      try {
        const parsed = typeof approval.attachments === 'string' 
          ? JSON.parse(approval.attachments)
          : approval.attachments
        setAttachments(Array.isArray(parsed) ? parsed : [])
      } catch (e) {
        setAttachments([])
      }
    }
  }, [approval])

  const handleDelete = async () => {
    try {
      await deleteItem('approvals', approval.id)
      toast.success('Aprobarea a fost ștearsă')
      navigate('/metrology?tab=approvals')
    } catch (error) {
      toast.error('Eroare la ștergere')
    }
  }

  const handleEdit = async (data) => {
    try {
      await updateItem('approvals', approval.id, data)
      toast.success('Actualizat cu succes!')
      setShowEditModal(false)
      setApproval({ ...approval, ...data })
    } catch (error) {
      toast.error('Eroare la actualizare')
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return
    
    setUploading(true)
    const newAttachments = []
    let processed = 0
    
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} prea mare (max 10MB)`)
        processed++
        if (processed === files.length) finishUpload(newAttachments)
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        newAttachments.push({
          id: Date.now() + Math.random(),
          name: file.name,
          url: e.target.result,
          file_path: e.target.result,
          size: file.size,
          type: file.type
        })
        processed++
        if (processed === files.length) finishUpload(newAttachments)
      }
      reader.onerror = () => {
        toast.error(`Eroare citire ${file.name}`)
        processed++
        if (processed === files.length) finishUpload(newAttachments)
      }
      reader.readAsDataURL(file)
    })
    
    async function finishUpload(valid) {
      if (valid.length > 0) {
        const updated = [...attachments, ...valid]
        setAttachments(updated)
        try {
          await updateItem('approvals', approval.id, {
            attachments: JSON.stringify(updated)
          })
          setApproval(prev => ({ ...prev, attachments: JSON.stringify(updated) }))
          toast.success(`${valid.length} fișier${valid.length > 1 ? 'e' : ''} încărcat${valid.length > 1 ? 'e' : ''}`)
        } catch (error) {
          toast.error('Eroare salvare')
        }
      }
      setUploading(false)
    }
  }

  const removeAttachment = async (attId) => {
    const updated = attachments.filter(a => a.id !== attId)
    setAttachments(updated)
    try {
      await updateItem('approvals', approval.id, {
        attachments: JSON.stringify(updated)
      })
      setApproval(prev => ({ ...prev, attachments: JSON.stringify(updated) }))
      toast.success('Atașament șters')
    } catch (error) {
      toast.error('Eroare ștergere')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    )
  }

  if (!approval) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Aprobare negăsită</h2>
            <button
              onClick={() => navigate('/metrology?tab=approvals')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Înapoi la Metrologie
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // Prepare files for MultiPDFViewer
  const approvalFiles = attachments.map((att, idx) => ({
    name: att.name || att.filename || `Document ${idx + 1}`,
    type: 'Atașament Aprobare',
    file_path: att.url || att.file_path,
    url: att.url || att.file_path,
    id: att.id || `att-${idx}`
  }))

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header - EXACT CA LA CVT */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6">
            <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-teal-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/metrology?tab=approvals')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{approval.name}</h1>
                    <p className="text-emerald-100">{approval.provider} • {approval.cabinet}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Editează"
                  >
                    <Edit className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Șterge"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Info Cards - sub header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Furnizor</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{approval.provider || 'N/A'}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Cabinet</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{approval.cabinet || 'N/A'}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Game Mix</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{getGameMixName(approval.game_mix_name || approval.game_mix, gameMixes)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Autoritate</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{approval.issuing_authority || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Main Content - LAYOUT CA LA CVT: 1 col stânga, 2 col dreapta */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Info + Upload */}
            <div className="space-y-6">
              {/* Checksums - specific pentru Aprobări */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-green-500" />
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h3>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{approval.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Metadata</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat de</label>
                    <p className="text-slate-800 dark:text-slate-200">{approval.created_by || 'N/A'}</p>
                  </div>
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

              {/* Upload Section - CA LA CVT */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-green-500" />
                  Încarcă Documente
                </h3>
                <label className="block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    disabled={uploading}
                  />
                  <div className={`w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-green-500 transition-colors cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
                    <Upload className={`w-6 h-6 text-slate-400 mx-auto mb-2 ${uploading ? 'animate-pulse' : ''}`} />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {uploading ? 'Se încarcă...' : 'Adaugă fișiere PDF'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column - DOCUMENTE (2 coloane) - VIZIBIL AUTOMAT CA LA CVT */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Documente Aprobare ({attachments.length})
                </h3>
                
                {/* MultiPDFViewer - AFIȘAT MEREU */}
                <MultiPDFViewer 
                  files={approvalFiles}
                  title="Documente Aprobare"
                  placeholder="Nu există documente atașate"
                  placeholderSubtext="Încarcă documente PDF din panoul din stânga"
                  onDelete={(file) => removeAttachment(file.id)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Confirmă ștergerea</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ești sigur că vrei să ștergi aprobarea "{approval.name}"?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ApprovalModal
          item={approval}
          onClose={() => setShowEditModal(false)}
          onSave={handleEdit}
        />
      )}
    </Layout>
  )
}

export default ApprovalDetail


