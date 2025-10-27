import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Download, Upload, CheckCircle, AlertCircle, Settings, Building2, Wrench, Package } from 'lucide-react'
import Layout from '../components/Layout'
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
  const [showSettings, setShowSettings] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    const foundApproval = approvals.find(a => a.id === parseInt(id))
    if (foundApproval) {
      setApproval(foundApproval)
      // Load attachments if they exist
      if (foundApproval.attachments) {
        try {
          const parsedAttachments = typeof foundApproval.attachments === 'string' 
            ? JSON.parse(foundApproval.attachments)
            : foundApproval.attachments
          setAttachments(Array.isArray(parsedAttachments) ? parsedAttachments : [])
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

  const handleDelete = async () => {
    try {
      await deleteItem('approvals', approval.id)
      toast.success('Aprobarea a fost ștearsă cu succes')
      navigate('/metrology?tab=approvals')
    } catch (error) {
      toast.error('Eroare la ștergerea aprobării')
    }
  }

  const handleEdit = async (data) => {
    try {
      await updateItem('approvals', approval.id, data)
      toast.success('Aprobarea a fost actualizată cu succes')
      setShowEditModal(false)
      // Update local state
      setApproval({ ...approval, ...data })
    } catch (error) {
      toast.error('Eroare la actualizarea aprobării')
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', 'approval')
      formData.append('entityId', approval.id.toString())
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const data = await response.json()
          const newAttachment = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: data.fileUrl,
            uploaded: true
          }
          
          const updatedAttachments = [...attachments, newAttachment]
          setAttachments(updatedAttachments)
          
          // Update approval in backend with new attachments
          await updateItem('approvals', approval.id, {
            attachments: JSON.stringify(updatedAttachments)
          })
          
          toast.success(`${file.name} încărcat cu succes`)
        } else {
          toast.error(`Eroare la încărcarea ${file.name}`)
        }
      } catch (error) {
        toast.error(`Eroare la încărcarea ${file.name}`)
      }
    }
  }

  const removeAttachment = async (attachmentId) => {
    const updatedAttachments = attachments.filter(att => att.id !== attachmentId)
    setAttachments(updatedAttachments)
    
    try {
      await updateItem('approvals', approval.id, {
        attachments: JSON.stringify(updatedAttachments)
      })
      toast.success('Atașament șters')
    } catch (error) {
      toast.error('Eroare la ștergerea atașamentului')
    }
  }

  const getProviderName = (providerId) => {
    const provider = providers.find(prov => prov.id === providerId || prov.name === providerId)
    return provider ? provider.name : providerId
  }

  const getCabinetName = (cabinetId) => {
    const cabinet = cabinets.find(cab => cab.id === cabinetId || cab.name === cabinetId)
    return cabinet ? cabinet.name : cabinetId
  }

  // Using imported getGameMixName helper function

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!approval) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Aprobarea nu a fost găsită</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Aprobarea pe care o căutați nu există sau a fost ștearsă.</p>
            <button
              onClick={() => navigate('/metrology?tab=approvals')}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors"
            >
              Înapoi la Metrologie
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header compact - same as SlotDetail */}
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
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {approval.name}
                    </h1>
                    <p className="text-emerald-100">
                      {approval.provider} | {approval.cabinet}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Setări"
                  >
                    <Settings className="w-5 h-5 text-white" />
                  </button>
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

            {/* Main Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Furnizor</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{getProviderName(approval.provider) || 'N/A'}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Cabinet</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{getCabinetName(approval.cabinet) || 'N/A'}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Game Mix</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{getGameMixName(approval.game_mix_name || approval.game_mix, gameMixes)}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Autoritate</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{approval.issuing_authority || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Checksums */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-500" />
                    Note
                  </h3>
                  <p className="text-slate-800 dark:text-slate-200">{approval.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* File Upload - Only show if showAttachments is true */}
              {showAttachments && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
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
                      <div className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-green-500 transition-colors cursor-pointer text-center">
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
                            <div className="flex items-center space-x-3 flex-1">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{attachment.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {attachment.url && (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => removeAttachment(attachment.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

      {/* Edit Modal */}
      {showEditModal && (
        <ApprovalModal
          item={approval}
          onClose={() => setShowEditModal(false)}
          onSave={handleEdit}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Setări Vizualizare
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-slate-300">Afișează Atașamente</label>
                <button
                  onClick={() => {
                    setShowAttachments(!showAttachments)
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showAttachments ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showAttachments ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ApprovalDetail
