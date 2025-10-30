import React, { useState, useEffect } from 'react'
import { X, Save, Activity, FileCheck, Calendar, CheckCircle } from 'lucide-react'
import axios from 'axios'
import PDFViewer from '../PDFViewer'

const MetrologyModal = ({ item, onClose, onSave }) => {
  const [authorities, setAuthorities] = useState([])
  const [providers, setProviders] = useState([])
  const [cabinets, setCabinets] = useState([])
  const [gameMixes, setGameMixes] = useState([])
  const [approvals, setApprovals] = useState([])
  const [software, setSoftware] = useState([])
  const [formData, setFormData] = useState({
    cvt_series: '',
    serial_number: '',
    cvt_type: 'Periodică',
    cvt_date: '',
    expiry_date: '',
    issuing_authority: '',
    provider: '',
    cabinet: '',
    game_mix: '',
    approval_type: '',
    software: '',
    cvtFile: null,
    cvtPreview: null,
    notes: ''
  })

  useEffect(() => {
    // Load all data
    const loadAllData = async () => {
      try {
        const [authoritiesRes, providersRes, cabinetsRes, gameMixesRes, approvalsRes, softwareRes] = await Promise.all([
          fetch('/api/authorities'),
          fetch('/api/providers'),
          fetch('/api/cabinets'),
          fetch('/api/gameMixes'),
          fetch('/api/approvals'),
          fetch('/api/software')
        ])
        
        const [authoritiesData, providersData, cabinetsData, gameMixesData, approvalsData, softwareData] = await Promise.all([
          authoritiesRes.json(),
          providersRes.json(),
          cabinetsRes.json(),
          gameMixesRes.json(),
          approvalsRes.json(),
          softwareRes.json()
        ])
        
        setAuthorities(Array.isArray(authoritiesData) ? authoritiesData : [])
        setProviders(Array.isArray(providersData) ? providersData : [])
        setCabinets(Array.isArray(cabinetsData) ? cabinetsData : [])
        setGameMixes(Array.isArray(gameMixesData) ? gameMixesData : [])
        setApprovals(Array.isArray(approvalsData) ? approvalsData : [])
        setSoftware(Array.isArray(softwareData) ? softwareData : [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadAllData()

    if (item) {
      // Format dates for date inputs (YYYY-MM-DD format)
      const formatDateForInput = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ''
        return date.toISOString().split('T')[0]
      }

      setFormData({
        cvt_series: item.cvt_series || item.cvt_number || '',
        serial_number: item.serial_number || '',
        cvt_type: item.cvt_type || 'Periodică',
        cvt_date: formatDateForInput(item.cvt_date),
        expiry_date: formatDateForInput(item.expiry_date),
        issuing_authority: item.issuing_authority || '',
        provider: item.provider || '',
        cabinet: item.cabinet || '',
        game_mix: item.game_mix || '',
        approval_type: item.approval_type || '',
        software: item.software || '',
        cvtFile: null, // Don't store existing file data
        cvtPreview: item.cvtFile || null, // Store file path for display
        notes: item.notes || ''
      })
    }
  }, [item])

  // Funcții pentru filtrarea în cascadă
  const getFilteredCabinets = () => {
    if (!formData.provider) return cabinets
    return cabinets.filter(cabinet => 
      cabinet.provider === formData.provider || 
      cabinet.provider_name === formData.provider
    )
  }

  const getFilteredGameMixes = () => {
    if (!formData.provider) return gameMixes
    return gameMixes.filter(gameMix => 
      gameMix.provider === formData.provider || 
      gameMix.provider_name === formData.provider
    )
  }

  const getFilteredApprovals = () => {
    if (!formData.cabinet) return approvals
    // Filtrează aprobările pe baza cabinetului selectat
    const selectedCabinet = cabinets.find(cab => 
      cab.name === formData.cabinet || 
      cab.model === formData.cabinet
    )
    if (!selectedCabinet) return approvals
    
    return approvals.filter(approval => 
      approval.cabinet === formData.cabinet ||
      approval.model === selectedCabinet.model
    )
  }

  const getFilteredSoftware = () => {
    if (!formData.game_mix) return software
    // Filtrează software-ul pe baza game mix-ului selectat
    const selectedGameMix = gameMixes.find(gm => gm.name === formData.game_mix)
    if (!selectedGameMix) return software
    
    return software.filter(soft => 
      soft.game_mix === formData.game_mix ||
      soft.provider === selectedGameMix.provider
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // Logica în cascadă pentru filtre
      if (name === 'provider') {
        // Când se schimbă furnizorul, resetează toate câmpurile dependente
        newData.cabinet = ''
        newData.game_mix = ''
        newData.approval_type = ''
        newData.software = ''
      } else if (name === 'cabinet') {
        // Când se schimbă cabinetul, resetează câmpurile dependente
        newData.approval_type = ''
        newData.software = ''
      } else if (name === 'game_mix') {
        // Când se schimbă game mix-ul, resetează software-ul
        newData.software = ''
      }
      
      // Calcul automat pentru data expirării
      if (name === 'cvt_type' || name === 'cvt_date') {
        if (newData.cvt_type === 'Periodică' || newData.cvt_type === 'Inițială') {
          if (newData.cvt_date) {
            const cvtDate = new Date(newData.cvt_date)
            const expiryDate = new Date(cvtDate)
            expiryDate.setFullYear(expiryDate.getFullYear() + 1)
            expiryDate.setDate(expiryDate.getDate() - 1)
            newData.expiry_date = expiryDate.toISOString().split('T')[0]
          }
        }
      }
      
      return newData
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Store the actual File object, not base64
      setFormData(prev => ({
        ...prev,
        cvtFile: file,
        cvtPreview: file // For preview
      }))
    }
  }

  const handleDeleteCvt = async () => {
    if (window.confirm('Sigur doriți să ștergeți documentul CVT?')) {
      setFormData(prev => ({
        ...prev,
        cvtFile: null,
        cvtPreview: null
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // If there's a new file to upload, upload it first
    let filePath = formData.cvtPreview
    
    // Check if cvtFile is a File object (new upload)
    if (formData.cvtFile instanceof File) {
      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.cvtFile)
        
        const uploadResponse = await axios.post('/api/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        })
        
        if (uploadResponse.data) {
          filePath = uploadResponse.data.url || uploadResponse.data.file_path || uploadResponse.data.file?.url
        }
      } catch (error) {
        console.error('Error uploading file:', error)
        // Fallback: proceed without the file to avoid blocking creation
        filePath = null
      }
    }
    
    // Prepare payload - send only URL for file
    const dataToSave = {
      ...formData,
      cvtFile: filePath,
      cvtPreview: filePath
    }
    if (dataToSave.cvtFile instanceof File) {
      delete dataToSave.cvtFile
    }
    
    onSave(dataToSave)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-cyan-800 to-teal-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-teal-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Certificat' : 'Adaugă Certificat Nou'}
              </h2>
              <p className="text-cyan-100 text-sm font-medium">
                Completează informațiile despre certificatul de metrologie
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="relative z-10 text-white hover:bg-white/20 rounded-2xl p-3 transition-all duration-200 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informații CVT */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
              Informații CVT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Seria CVT</label>
                <input type="text" name="cvt_series" value={formData.cvt_series} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="Seria CVT" />
                <p className="text-xs text-slate-500">Seria de identificare CVT</p>
              </div>
              {/* Removed CVT number input; series is the primary identifier */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">Număr de Serie Slot *</label>
                <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="Serial number slot" required />
                <p className="text-xs text-slate-500">Numărul de serie care leagă CVT-ul cu slot-ul din aplicație</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Tip CVT *</label>
                <select name="cvt_type" value={formData.cvt_type} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" required>
                  <option value="Periodică">Periodică</option>
                  <option value="Inițială">Inițială</option>
                  <option value="Reparație">Reparație</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Data CVT *</label>
                <input type="date" name="cvt_date" value={formData.cvt_date} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" required />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Data expirării *</label>
                <input 
                  type="date" 
                  name="expiry_date" 
                  value={formData.expiry_date} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
                  required
                  disabled={formData.cvt_type === 'Periodică' || formData.cvt_type === 'Inițială'}
                />
                {formData.cvt_type === 'Periodică' || formData.cvt_type === 'Inițială' ? (
                  <p className="text-xs text-slate-500">Calculat automat: 1 an - 1 zi</p>
                ) : (
                  <p className="text-xs text-slate-500">Completează manual pentru Reparație</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Autoritatea emitentă</label>
                <select name="issuing_authority" value={formData.issuing_authority} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                  <option value="">Selectează autoritatea emitentă</option>
                  {authorities.map(authority => (
                    <option key={authority.id} value={authority.name}>
                      {authority.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Informații Dispozitiv */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
              Informații Dispozitiv
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Furnizor</label>
                <select name="provider" value={formData.provider} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                  <option value="">Selectează furnizorul</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.name}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Cabinet</label>
                <select 
                  name="cabinet" 
                  value={formData.cabinet} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={!formData.provider}
                >
                  <option value="">
                    {formData.provider ? "Selectează cabinetul" : "Selectează mai întâi furnizorul"}
                  </option>
                  {getFilteredCabinets().map(cabinet => (
                    <option key={cabinet.id} value={cabinet.name}>
                      {cabinet.name}
                    </option>
                  ))}
                </select>
                {!formData.provider && (
                  <p className="text-xs text-slate-500">Cabinetul depinde de furnizorul selectat</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Game Mix</label>
                <select 
                  name="game_mix" 
                  value={formData.game_mix} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={!formData.provider}
                >
                  <option value="">
                    {formData.provider ? "Selectează game mix-ul" : "Selectează mai întâi furnizorul"}
                  </option>
                  {getFilteredGameMixes().map(gameMix => (
                    <option key={gameMix.id} value={gameMix.name}>
                      {gameMix.name}
                    </option>
                  ))}
                </select>
                {!formData.provider && (
                  <p className="text-xs text-slate-500">Game mix-ul depinde de furnizorul selectat</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Aprobare de Tip</label>
                <select 
                  name="approval_type" 
                  value={formData.approval_type} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={!formData.cabinet}
                >
                  <option value="">
                    {formData.cabinet ? "Selectează aprobarea de tip" : "Selectează mai întâi cabinetul"}
                  </option>
                  {getFilteredApprovals().map(approval => (
                    <option key={approval.id} value={approval.name}>
                      {approval.name}
                    </option>
                  ))}
                </select>
                {!formData.cabinet && (
                  <p className="text-xs text-slate-500">Aprobarea de tip depinde de cabinetul selectat</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Software</label>
                <select 
                  name="software" 
                  value={formData.software} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={!formData.game_mix}
                >
                  <option value="">
                    {formData.game_mix ? "Selectează software-ul" : "Selectează mai întâi game mix-ul"}
                  </option>
                  {getFilteredSoftware().map(soft => (
                    <option key={soft.id} value={soft.name}>
                      {soft.name}
                    </option>
                  ))}
                </select>
                {!formData.game_mix && (
                  <p className="text-xs text-slate-500">Software-ul depinde de game mix-ul selectat</p>
                )}
              </div>
            </div>
          </div>

          {/* CVT PDF Upload Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Document CVT (PDF)</label>
            <input
              type="file"
              name="cvtFile"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
            />
            {formData.cvtPreview && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileCheck className="w-5 h-5 text-cyan-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {formData.cvtPreview instanceof File 
                          ? 'Document CVT nou' 
                          : 'Document CVT existent'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">PDF Document</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteCvt}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Șterge documentul"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* PDF Viewer */}
                {formData.cvtPreview instanceof File ? (
                  <iframe
                    src={URL.createObjectURL(formData.cvtPreview)}
                    className="w-full h-[600px] rounded-lg border-2 border-slate-300 dark:border-slate-600"
                    title="PDF Preview"
                  />
                ) : formData.cvtPreview ? (
                  <div className="w-full h-[600px]">
                    <PDFViewer 
                      pdfUrl={formData.cvtPreview}
                      title={`CVT Document ${formData.cvt_series || ''}`}
                      placeholder="Documentul CVT nu este disponibil"
                      placeholderSubtext="Atașează documentul CVT pentru vizualizare"
                    />
                  </div>
                ) : null}
              </div>
            )}
            <p className="text-xs text-slate-500">Încărcați documentul CVT în format PDF</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Note</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="Note adiționale" />
          </div>
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
              <button 
                type="button" 
                onClick={onClose}
                className="btn-secondary"
              >
                Anulează
              </button>
              <button 
                type="submit"
                className="btn-primary flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Certificat</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MetrologyModal
