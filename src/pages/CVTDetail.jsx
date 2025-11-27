import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Upload, CheckCircle, AlertCircle, Settings, Calendar, Building2, Wrench } from 'lucide-react'
import Layout from '../components/Layout'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import MetrologyModal from '../components/modals/MetrologyModal'
import { getGameMixName } from '../utils/gameMixFormatter'

const CVTDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { metrology, providers, cabinets, gameMixes, updateItem, deleteItem } = useData()
  const [cvt, setCvt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const foundCvt = metrology.find(m => m.id === parseInt(id))
    if (foundCvt) {
      setCvt(foundCvt)
      setLoading(false)
    } else {
      toast.error('CVT-ul nu a fost găsit')
      navigate('/metrology')
    }
  }, [id, metrology, navigate])

  const handleDelete = async () => {
    try {
      await deleteItem('metrology', cvt.id)
      toast.success('CVT-ul a fost șters cu succes')
      navigate('/metrology')
    } catch (error) {
      toast.error('Eroare la ștergerea CVT-ului')
    }
  }

  const handleEdit = async (data) => {
    try {
      await updateItem('metrology', cvt.id, data)
      toast.success('CVT-ul a fost actualizat cu succes')
      setShowEditModal(false)
      setCvt({ ...cvt, ...data })
    } catch (error) {
      toast.error('Eroare la actualizarea CVT-ului')
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fișierul este prea mare! Maxim 10MB.')
      return
    }
    
    setUploading(true)
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64String = e.target.result
      try {
        await updateItem('metrology', cvt.id, {
          cvt_file: base64String,
          cvt_filename: file.name
        })
        setCvt({ ...cvt, cvt_file: base64String, cvt_filename: file.name })
        toast.success('Document CVT încărcat cu succes')
      } catch (error) {
        toast.error('Eroare la încărcarea documentului')
      }
      setUploading(false)
    }
    reader.onerror = () => {
      toast.error('Eroare la citirea fișierului')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const calculateDaysRemaining = () => {
    if (!cvt?.expiry_date) return null
    const today = new Date()
    const expiryDate = new Date(cvt.expiry_date)
    const diffTime = expiryDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = calculateDaysRemaining()

  const getStatusColor = () => {
    if (daysRemaining === null) return 'text-slate-400'
    if (daysRemaining < 0) return 'text-red-600'
    if (daysRemaining <= 30) return 'text-orange-600'
    return 'text-green-600'
  }

  const getStatusBg = () => {
    if (daysRemaining === null) return 'bg-slate-100'
    if (daysRemaining < 0) return 'bg-red-100'
    if (daysRemaining <= 30) return 'bg-orange-100'
    return 'bg-green-100'
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600"></div>
        </div>
      </Layout>
    )
  }

  if (!cvt) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">CVT nu a fost găsit</h2>
            <button
              onClick={() => navigate('/metrology')}
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              Înapoi la Metrologie
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // Prepare CVT file for MultiPDFViewer
  const cvtFiles = []
  if (cvt.cvt_file || cvt.cvtFile) {
    cvtFiles.push({
      name: cvt.cvt_filename || `CVT ${cvt.cvt_series || cvt.cvt_number}`,
      type: 'Document CVT',
      file_path: cvt.cvt_file || cvt.cvtFile,
      url: cvt.cvt_file || cvt.cvtFile,
      id: 'cvt-main'
    })
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6">
            <div className="bg-gradient-to-r from-cyan-800 via-teal-800 to-emerald-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/metrology')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      CVT {cvt.cvt_series || cvt.cvt_number}
                    </h1>
                    <p className="text-cyan-100">
                      {cvt.cvt_type || 'Certificate de Verificare Tehnică'}
                    </p>
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

            {/* Status Badge */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-full ${getStatusBg()} ${getStatusColor()} font-semibold flex items-center`}>
                  {daysRemaining !== null && daysRemaining >= 0 ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  )}
                  {daysRemaining === null ? 'N/A' : daysRemaining < 0 ? `Expirat (${Math.abs(daysRemaining)} zile)` : `${daysRemaining} zile rămase`}
                </div>
                <span className="text-slate-500 dark:text-slate-400">
                  Expirare: {cvt.expiry_date ? new Date(cvt.expiry_date).toLocaleDateString('ro-RO') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Furnizor</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{cvt.provider || 'N/A'}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Cabinet</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{cvt.cabinet || 'N/A'}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Aprobare Tip</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{cvt.approval_type || 'N/A'}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Data CVT</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {cvt.cvt_date ? new Date(cvt.cvt_date).toLocaleDateString('ro-RO') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content - EXACT CA LA CONTRACTE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Info */}
            <div className="space-y-6">
              {/* Additional Info */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Informații Suplimentare</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Software</label>
                    <p className="text-slate-800 dark:text-slate-200">{cvt.software || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Game Mix</label>
                    <p className="text-slate-800 dark:text-slate-200">{getGameMixName(cvt.game_mix_name || cvt.game_mix, gameMixes)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Autoritatea Emitentă</label>
                    <p className="text-slate-800 dark:text-slate-200">{cvt.issuing_authority || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {cvt.notes && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h3>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{cvt.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Metadata</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat de</label>
                    <p className="text-slate-800 dark:text-slate-200">{cvt.created_by || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat la</label>
                    <p className="text-slate-800 dark:text-slate-200">
                      {cvt.created_at ? new Date(cvt.created_at).toLocaleString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload CVT */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-cyan-500" />
                  Încarcă Document CVT
                </h3>
                <label className="block">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf"
                    disabled={uploading}
                  />
                  <div className={`w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-cyan-500 transition-colors cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
                    <Upload className={`w-6 h-6 text-slate-400 mx-auto mb-2 ${uploading ? 'animate-pulse' : ''}`} />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {uploading ? 'Se încarcă...' : 'Adaugă/Înlocuiește PDF'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column - DOCUMENT CVT (2 coloane) - VIZIBIL AUTOMAT */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-cyan-600" />
                  Document CVT
                </h3>
                
                {/* MultiPDFViewer - AFIȘAT MEREU */}
                <MultiPDFViewer 
                  files={cvtFiles}
                  title="Document CVT"
                  placeholder="Nu există document CVT încărcat"
                  placeholderSubtext="Încarcă documentul PDF din panoul din stânga"
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
              Ești sigur că vrei să ștergi CVT-ul "{cvt.cvt_series || cvt.cvt_number}"?
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
        <MetrologyModal
          item={cvt}
          onClose={() => setShowEditModal(false)}
          onSave={handleEdit}
          providers={providers}
          cabinets={cabinets}
          gameMixes={gameMixes}
        />
      )}
    </Layout>
  )
}

export default CVTDetail


