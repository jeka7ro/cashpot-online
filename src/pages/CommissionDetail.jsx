import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Download, Upload, Users, Calendar, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import Layout from '../components/Layout'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { toast } from 'react-hot-toast'

const CommissionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [commission, setCommission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)
  const [attachments, setAttachments] = useState([])
  const [members, setMembers] = useState([])

  useEffect(() => {
    loadCommission()
  }, [id])

  const loadCommission = async () => {
    try {
      const response = await fetch(`/api/commissions/${id}`)
      if (!response.ok) {
        toast.error('Comisia nu a fost găsită')
        navigate('/metrology')
        return
      }
      const data = await response.json()
      
      setCommission(data)
      
      // Load attachments
      if (data.attachments) {
        try {
          const parsedAttachments = typeof data.attachments === 'string' 
            ? JSON.parse(data.attachments)
            : data.attachments
          setAttachments(Array.isArray(parsedAttachments) ? parsedAttachments : [])
        } catch (e) {
          setAttachments([])
        }
      }
      
      // Load members (serial_numbers)
      if (data.serial_numbers) {
        try {
          const parsedMembers = typeof data.serial_numbers === 'string' 
            ? JSON.parse(data.serial_numbers)
            : data.serial_numbers
          setMembers(Array.isArray(parsedMembers) ? parsedMembers : [])
        } catch (e) {
          setMembers([])
        }
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading commission:', error)
      toast.error('Eroare la încărcarea comisiei')
      navigate('/metrology')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/commissions/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        toast.success('Comisia a fost ștearsă cu succes')
        navigate('/metrology')
      } else {
        toast.error('Eroare la ștergerea comisiei')
      }
    } catch (error) {
      console.error('Error deleting commission:', error)
      toast.error('Eroare la ștergerea comisiei')
    }
  }

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

  if (!commission) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Comisia nu a fost găsită</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Comisia pe care o căutați nu există sau a fost ștearsă.</p>
            <button
              onClick={() => navigate('/metrology')}
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
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6">
            <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-teal-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/metrology')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {commission.name || `Comisie #${commission.id}`}
                    </h1>
                    <p className="text-emerald-100">
                      {commission.commission_date && new Date(commission.commission_date).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Toggle atașamente"
                  >
                    <FileText className="w-5 h-5 text-white" />
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
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Data Formării</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {commission.commission_date ? new Date(commission.commission_date).toLocaleDateString('ro-RO') : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Data Expirării</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {commission.expiry_date ? new Date(commission.expiry_date).toLocaleDateString('ro-RO') : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Număr Membri</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{members.length}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Status</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {commission.expiry_date && new Date(commission.expiry_date) > new Date() ? 'Activă' : 'Expirată'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Members and Notes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Members */}
              {members.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-500" />
                    Membri ({members.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {members.map((member, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                      >
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {typeof member === 'string' ? member : member.serial_number || member}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {commission.notes && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-500" />
                    Note
                  </h3>
                  <p className="text-slate-800 dark:text-slate-200">{commission.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Attachments and Metadata */}
            <div className="space-y-6">
              {/* PDF VIEWER AUTOMAT - Afișează TOATE fișierele */}
              {showAttachments && attachments.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-500" />
                    Preview Documente
                  </h3>
                  <MultiPDFViewer 
                    files={attachments}
                    title="Atașamente Comisie"
                    placeholder="Nu există documente de afișat"
                    placeholderSubtext="Adaugă documente pentru preview automat"
                  />
                </div>
              )}

              {/* Attachments Upload Area */}
              {showAttachments && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-blue-500" />
                    Atașamente ({attachments.length})
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Upload Button */}
                    <label className="block">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          // Handle file upload
                          const files = Array.from(e.target.files)
                          files.forEach(file => {
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('entityType', 'commission')
                            formData.append('entityId', commission.id.toString())
                            
                            fetch('/api/upload', {
                              method: 'POST',
                              body: formData
                            })
                            .then(res => res.json())
                            .then(data => {
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
                              
                              // Update in backend
                              fetch(`/api/commissions/${commission.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ attachments: JSON.stringify(updatedAttachments) })
                              })
                              
                              toast.success(`${file.name} încărcat cu succes`)
                            })
                            .catch(() => toast.error(`Eroare la încărcarea ${file.name}`))
                          })
                        }}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <div className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 transition-colors cursor-pointer text-center">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600 dark:text-slate-400">Apasă pentru a adăuga fișiere</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500">PDF, DOC, JPG, PNG (Multiple fișiere)</p>
                      </div>
                    </label>

                    {/* Compact Attachments List */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {attachments.length} fișier{attachments.length !== 1 ? 'e' : ''} atașat{attachments.length !== 1 ? 'e' : ''}
                        </p>
                        {attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                {attachment.name || `Atașament ${index + 1}`}
                              </span>
                              {attachment.size && (
                                <span className="text-slate-500 dark:text-slate-500">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </span>
                              )}
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
                    <p className="text-slate-800 dark:text-slate-200">{commission.created_by || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat la</label>
                    <p className="text-slate-800 dark:text-slate-200">
                      {commission.created_at ? new Date(commission.created_at).toLocaleString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                  {commission.updated_at && (
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Actualizat la</label>
                      <p className="text-slate-800 dark:text-slate-200">
                        {new Date(commission.updated_at).toLocaleString('ro-RO')}
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
              Ești sigur că vrei să ștergi comisia "{commission.name}"? Această acțiune nu poate fi anulată.
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
    </Layout>
  )
}

export default CommissionDetail
