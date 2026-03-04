import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Upload, CheckCircle, AlertCircle, Settings, Calendar, Building2, Wrench, Wand2, Activity } from 'lucide-react'
import Layout from '../components/Layout'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import MetrologyModal from '../components/modals/MetrologyModal'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'
import { getGameMixName } from '../utils/gameMixFormatter'

const CVTDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { metrology, providers, cabinets, gameMixes, commissions, updateItem, deleteItem } = useData()
  const [cvt, setCvt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Helper array to keep track of blob URLs for cleanup
  const [blobUrls, setBlobUrls] = useState([])

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

  // Cleanup blobs unmount
  useEffect(() => {
    return () => {
      blobUrls.forEach(url => {
        try { URL.revokeObjectURL(url) } catch (e) { }
      })
    }
  }, [blobUrls])

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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600"></div>
        </div>
      </Layout>
    )
  }

  const calculateDaysRemaining = () => {
    if (!cvt?.expiry_date) return null
    const today = new Date()
    const expiryDate = new Date(cvt.expiry_date)
    const diffTime = expiryDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = calculateDaysRemaining()

  // STATISTICI SMART
  const sameCommissionCount = cvt?.commission_name
    ? metrology.filter(m => m.commission_name === cvt.commission_name).length
    : 0;

  const sameExpiryCount = cvt?.expiry_date
    ? metrology.filter(m => m.expiry_date === cvt.expiry_date && m.id !== cvt.id).length
    : 0;

  const getStatusColor = () => {
    if (daysRemaining === null) return 'text-slate-400'
    if (daysRemaining < 0) return 'text-red-600'
    if (daysRemaining <= 30) return 'text-orange-600'
    return 'text-green-600'
  }

  // Deduce real Commission Date
  const cvtCommission = commissions?.find(c => c.serial_numbers?.includes(String(cvt?.serial_number)) || c.name === cvt?.commission_name);

  const getStatusBg = () => {
    if (daysRemaining === null) return 'bg-slate-100'
    if (daysRemaining < 0) return 'bg-red-100'
    if (daysRemaining <= 30) return 'bg-orange-100'
    return 'bg-green-100'
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

  // Removed the misplaced useState

  const getObjectUrlFromBase64 = (base64String) => {
    if (!base64String) return null

    const isBase64 = base64String.startsWith('data:') || (base64String.length > 500 && !base64String.includes(' '))
    if (!isBase64) return base64String // Assume normal URL

    try {
      const b64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String
      const byteCharacters = atob(b64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      return blobUrl
    } catch (e) {
      console.error('Error creating object URL from base64:', e)
      return base64String.startsWith('data:') ? base64String : `data:application/pdf;base64,${base64String}` // Fallback
    }
  }

  // Prepare CVT file for MultiPDFViewer
  const cvtFiles = []
  if (cvt.cvt_file || cvt.cvtFile) {
    let rawFile = cvt.cvt_file || cvt.cvtFile
    let fileUrl
    if (rawFile === 'true' || rawFile === true || rawFile === 'false' || rawFile === false) {
      if ((rawFile === 'true' || rawFile === true) && cvt.id) {
        let backend = (typeof window !== 'undefined' && window.APP_BACKEND_URL) || 'https://cashpot-backend.onrender.com'
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          backend = 'http://localhost:5001';
        }
        fileUrl = `${backend}/api/cvt-pdf/${cvt.id}`
      } else {
        fileUrl = null
      }
    } else {
      fileUrl = getObjectUrlFromBase64(rawFile)
    }

    if (fileUrl) {
      if (fileUrl.startsWith('blob:')) blobUrls.push(fileUrl)

      cvtFiles.push({
        name: cvt.cvt_filename || `CVT ${cvt.cvt_series || cvt.cvt_number}`,
        type: 'Document Principal CVT',
        file_path: fileUrl,
        url: fileUrl,
        id: 'cvt-main'
      })
    }
  }

  // Support for multiple files
  if (cvt.additional_files && Array.isArray(cvt.additional_files)) {
    cvt.additional_files.forEach((file, index) => {
      const fileUrl = getObjectUrlFromBase64(file.url || file.file_path || file.base64)
      if (fileUrl && fileUrl.startsWith('blob:')) blobUrls.push(fileUrl)

      cvtFiles.push({
        name: file.name || `Atașament ${index + 1}`,
        type: file.type || 'Atașament',
        file_path: fileUrl,
        url: fileUrl,
        id: `additional-${index}`
      })
    })
  }

  // Cleanup moved to top to prevent React hooks rule violations
  const handleAdditionalFileUpload = async (event) => {
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
        const newFile = {
          name: file.name,
          type: 'Atașament Extra',
          base64: base64String
        }

        const existingFiles = Array.isArray(cvt.additional_files) ? cvt.additional_files : []
        const updatedFiles = [...existingFiles, newFile]

        await updateItem('metrology', cvt.id, {
          additional_files: updatedFiles
        })
        setCvt({ ...cvt, additional_files: updatedFiles })
        toast.success('Atașament încărcat cu succes')
      } catch (error) {
        toast.error('Eroare la încărcarea atașamentului')
      }
      setUploading(false)
    }
    reader.onerror = () => {
      toast.error('Eroare la citirea fișierului')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  // We add onDelete handler for MultiPDFViewer
  const handleFileDelete = async (fileToDelete) => {
    if (fileToDelete.id === 'cvt-main') {
      try {
        await updateItem('metrology', cvt.id, { cvt_file: null, cvt_filename: null })
        setCvt({ ...cvt, cvt_file: null, cvtFile: null, cvt_filename: null })
        toast.success('Documentul principal șters')
      } catch (e) {
        toast.error('Eroare la ștergerea documentului principal')
      }
    } else if (fileToDelete.id.startsWith('additional-')) {
      const index = parseInt(fileToDelete.id.split('-')[1])
      try {
        const updatedFiles = [...(cvt.additional_files || [])]
        updatedFiles.splice(index, 1)
        await updateItem('metrology', cvt.id, { additional_files: updatedFiles })
        setCvt({ ...cvt, additional_files: updatedFiles })
        toast.success('Atașament șters')
      } catch (e) {
        toast.error('Eroare la ștergerea atașamentului')
      }
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 mx-auto overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-cyan-800 via-teal-800 to-emerald-800 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/metrology')}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all shadow-sm"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-4 bg-white/10 rounded-2xl ring-1 ring-white/30 shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="bg-white dark:bg-slate-700 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                <Building2 className="w-8 h-8 text-blue-500 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Furnizor</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{cvt.provider || 'N/A'}</p>
              </div>

              <div className="bg-white dark:bg-slate-700 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                <Wrench className="w-8 h-8 text-purple-500 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cabinet</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{cvt.cabinet || 'N/A'}</p>
              </div>

              <div className="bg-white dark:bg-slate-700 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                <FileText className="w-8 h-8 text-green-500 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aprobare Tip</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{cvt.approval_type || 'N/A'}</p>
              </div>

              <div className="bg-white dark:bg-slate-700 p-5 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                <Calendar className="w-8 h-8 text-amber-500 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Data Emitere CVT</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {cvt.cvt_date ? new Date(cvt.cvt_date).toLocaleDateString('ro-RO') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content - SMART GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Info & Stats */}
            <div className="space-y-8">

              {/* Statistici Noi */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-24 h-24" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-cyan-600" />
                  Intelligence Radar
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total pe această Comisie</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{sameCommissionCount}</span>
                  </div>
                  <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Expira în aceeași zi</span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400">+{sameExpiryCount}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
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
                  {cvt.commission_name && (
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700/50 pt-3">
                      <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Comisie Asociată</label>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{cvt.commission_name}</p>
                      </div>
                      {cvtCommission && cvtCommission.commission_date && (
                        <div className="text-right">
                          <label className="text-sm font-medium text-indigo-500/80 dark:text-indigo-400/80">🗓 Data Comisie</label>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold">{new Date(cvtCommission.commission_date).toLocaleDateString('ro-RO')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Raw CVT Data */}
                {cvt.raw_cvt_data && Object.keys(cvt.raw_cvt_data).length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-slate-900/30 rounded-2xl border border-indigo-100 dark:border-slate-700 p-5 mt-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-indigo-500" /> Date Originale (CVT)
                    </h3>
                    <div className="space-y-3">
                      {cvt.raw_cvt_data.provider_cvt && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Furnizor Orig.</label>
                          <p className="text-slate-800 dark:text-slate-200">{cvt.raw_cvt_data.provider_cvt}</p>
                        </div>
                      )}
                      {cvt.raw_cvt_data.cabinet_cvt && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cabinet Orig.</label>
                          <p className="text-slate-800 dark:text-slate-200">{cvt.raw_cvt_data.cabinet_cvt}</p>
                        </div>
                      )}
                      {cvt.raw_cvt_data.software_cvt && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Software Orig.</label>
                          <p className="text-slate-800 dark:text-slate-200">{cvt.raw_cvt_data.software_cvt}</p>
                        </div>
                      )}
                      {cvt.raw_cvt_data.game_mix_cvt && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Game Mix Orig.</label>
                          <p className="text-slate-800 dark:text-slate-200 text-sm italic">{cvt.raw_cvt_data.game_mix_cvt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {cvt.notes && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h3>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{cvt.notes}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="bg-indigo-50/50 dark:bg-slate-800/80 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
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
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-cyan-500" />
                    Încarcă Documente
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase">Document Principal CVT</span>
                      <label className="block">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf"
                          disabled={uploading}
                        />
                        <div className={`w-full p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-cyan-500 transition-colors cursor-pointer text-center ${uploading ? 'opacity-50' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {uploading ? 'Se încarcă...' : 'Adaugă/Înlocuiește Principal'}
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase">Atașamente Opționale</span>
                      <label className="block">
                        <input
                          type="file"
                          onChange={handleAdditionalFileUpload}
                          className="hidden"
                          accept=".pdf"
                          disabled={uploading}
                        />
                        <div className={`w-full p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 transition-colors cursor-pointer text-center ${uploading ? 'opacity-50' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
                            <span className="text-lg font-bold">+</span> Adaugă Fișier Extra
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div> {/* <-- End of Left Column */}

            {/* Right Column - DOCUMENT CVT */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 h-full">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-cyan-600" />
                  Document CVT
                </h3>

                {/* MultiPDFViewer - AFIȘAT MEREU */}
                <MultiPDFViewer
                  files={cvtFiles}
                  title="Documente"
                  placeholder="Nu există document CVT încărcat"
                  placeholderSubtext="Încarcă un document principal sau anexă din panoul lateral"
                  onDelete={handleFileDelete}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Confirmă ștergerea"
        itemName={cvt?.cvt_series || cvt?.cvt_number || 'CVT Selectat'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

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













