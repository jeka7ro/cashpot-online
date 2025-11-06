import React, { useState, useEffect } from 'react'
import { X, Save, FileText, FileCheck, Calendar, DollarSign, Upload, Download, Eye, Trash2, Paperclip } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PDFViewer from '../PDFViewer'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const ContractModal = ({ item, onClose, onSave, locationId }) => {
  const { locations, proprietari } = useData()
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    contract_number: '',
    title: '',
    location_id: locationId || '',
    proprietar_id: '',
    type: 'Chirie Locație',
    status: 'Active',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    currency: 'RON',
    deposit: '',
    payment_terms: '',
    description: '',
    surface_area: '', // Câmp nou: Suprafață în m²
    contractFile: null,
    contractPreview: null,
    annexes: [] // Câmp nou pentru anexe
  })

  // Generate unique contract number
  const generateContractNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `CT-CH-${year}${month}${day}-${random}`
  }

  useEffect(() => {
    if (item) {
      setFormData({
        contract_number: item.contract_number || '',
        title: item.title || '',
        location_id: item.location_id || locationId || '',
        proprietar_id: item.proprietar_id || '',
        type: item.type || 'Chirie Locație',
        status: item.status || 'Active',
        start_date: item.start_date ? item.start_date.split('T')[0] : '',
        end_date: item.end_date ? item.end_date.split('T')[0] : '',
        monthly_rent: item.monthly_rent || '',
        currency: item.currency || 'RON',
        deposit: item.deposit || '',
        payment_terms: item.payment_terms || '',
        description: item.description || '',
        surface_area: item.surface_area || '',
        contractFile: item.contractFile || null,
        contractPreview: item.contractFile || null,
        annexes: item.annexes || [] // Încarcă anexele existente
      })
    } else {
      // Generate contract number for new contracts
      setFormData(prev => ({
        ...prev,
        contract_number: generateContractNumber()
      }))
    }
  }, [item, locationId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleContractFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    
    try {
      const response = await axios.post('/api/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 minute timeout pentru fișiere mari
      })
      
      const fileUrl = response.data.url || response.data.file_path
      setFormData(prev => ({
        ...prev,
        contractFile: fileUrl,
        contractPreview: fileUrl
      }))
      toast.success('Contract încărcat cu succes!')
    } catch (error) {
      console.error('Upload error:', error)
      if (error.code === 'ECONNABORTED') {
        toast.error('Timeout - fișierul este prea mare sau conexiunea este lentă')
      } else {
        toast.error('Eroare la încărcarea contractului: ' + (error.response?.data?.error || error.message))
      }
    } finally {
      setUploading(false)
    }
  }
  
  // Handle annexes upload (multiple files)
  const handleAnnexesUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    setUploading(true)
    const uploadPromises = files.map(async (file) => {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      
      try {
        const response = await axios.post('/api/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000 // 2 minute timeout
        })
        return {
          name: file.name,
          url: response.data.url || response.data.file_path,
          size: file.size,
          type: file.type
        }
      } catch (error) {
        console.error('Upload error:', error)
        if (error.code === 'ECONNABORTED') {
          toast.error(`Timeout pentru ${file.name} - fișier prea mare`)
        } else {
          toast.error(`Eroare la upload pentru ${file.name}`)
        }
        return null
      }
    })
    
    try {
      const results = await Promise.all(uploadPromises)
      const validResults = results.filter(result => result !== null)
      
      setFormData(prev => ({
        ...prev,
        annexes: [...prev.annexes, ...validResults]
      }))
      
      if (validResults.length > 0) {
        toast.success(`${validResults.length} anexe încărcate cu succes`)
      }
    } catch (error) {
      toast.error('Eroare la încărcarea anexelor')
    } finally {
      setUploading(false)
    }
  }
  
  const handleRemoveAnnex = (index) => {
    setFormData(prev => ({
      ...prev,
      annexes: prev.annexes.filter((_, i) => i !== index)
    }))
    toast.success('Anexă ștearsă')
  }

  const handleDownloadContract = () => {
    if (formData.contractFile) {
      const link = document.createElement('a')
      link.href = formData.contractFile
      link.download = `Contract_${formData.contract_number || 'contract'}.pdf`
      link.click()
    }
  }

  const handleDeleteContract = () => {
    if (window.confirm('Sigur doriți să ștergeți fișierul contractului?')) {
      setFormData(prev => ({
        ...prev,
        contractFile: null,
        contractPreview: null
      }))
    }
  }

  const getFileIcon = (file) => {
    if (!file) return <FileText className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-green-800 to-emerald-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Contract' : 'Adaugă Contract Nou'}
              </h2>
              <p className="text-green-100 text-sm font-medium">
                Completează informațiile despre contract
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
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contract Number */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Număr Contract *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                name="contract_number"
                value={formData.contract_number}
                onChange={handleChange}
                required
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="ex: CT-CH-2024-001"
              />
              {!item && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, contract_number: generateContractNumber() }))}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Generează număr nou"
                >
                  🔄
                </button>
              )}
            </div>
          </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Titlu Contract *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="ex: Contract Chirie Locație București"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Locație *
              </label>
              <select
                name="location_id"
                value={formData.location_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="">Selectează locația</option>
                {locations?.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Proprietar */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Proprietar *
              </label>
              <select
                name="proprietar_id"
                value={formData.proprietar_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="">Selectează proprietarul</option>
                {proprietari?.map(proprietar => (
                  <option key={proprietar.id} value={proprietar.id}>
                    {proprietar.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Tip Contract *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="Chirie Locație">Chirie Locație</option>
                <option value="Chirie Comercială">Chirie Comercială</option>
                <option value="Chirie Industrială">Chirie Industrială</option>
                <option value="Chirie Oficiu">Chirie Oficiu</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="Active">Activ</option>
                <option value="Inactive">Inactiv</option>
                <option value="Expired">Expirat</option>
                <option value="Pending">În așteptare</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Data Început *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Data Sfârșit *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Monthly Rent */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Chiria Lunară *
              </label>
              <input
                type="number"
                name="monthly_rent"
                value={formData.monthly_rent}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>

            {/* Deposit */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Depozit Garantie
              </label>
              <input
                type="number"
                name="deposit"
                value={formData.deposit}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>

            {/* Surface Area */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Suprafață (m²)
              </label>
              <input
                type="number"
                name="surface_area"
                value={formData.surface_area}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Monedă *
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Termeni de Plată
              </label>
              <input
                type="text"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="ex: Lunar, până în data de 5"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Descriere
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
              placeholder="Descrierea contractului..."
            />
          </div>

          {/* Contract File Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Fișier Contract (PDF)
            </label>
            
            {/* Upload Section */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors">
              <input
                type="file"
                id="contractFile"
                accept=".pdf"
                onChange={handleContractFileChange}
                className="hidden"
              />
              <label
                htmlFor="contractFile"
                className="cursor-pointer flex flex-col items-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {formData.contractFile ? 'Schimbă contractul' : 'Încarcă fișier contract'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PDF (max 10MB)</p>
                </div>
              </label>
            </div>

            {/* PDF Viewer Section */}
            {formData.contractPreview && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(formData.contractFile)}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Fișier Contract
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteContract}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Șterge fișierul"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* PDF Viewer */}
                <PDFViewer 
                  pdfUrl={formData.contractPreview}
                  title={`Contract ${formData.contract_number || formData.title}`}
                  placeholder="Contractul nu este disponibil"
                  placeholderSubtext="Atașează fișierul contractului pentru vizualizare"
                />
              </div>
            )}
          </div>

          {/* Annexes Section */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              <Paperclip className="w-4 h-4 inline mr-2" />
              Anexe Contract (Multiple Fișiere)
            </label>
            
            {/* Upload Annexes */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="annexFiles"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleAnnexesUpload}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="annexFiles"
                className="cursor-pointer flex flex-col items-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {uploading ? 'Se încarcă...' : 'Încarcă anexe contract'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PDF, DOC, DOCX (multiple files)
                  </p>
                </div>
              </label>
            </div>

            {/* List of Annexes */}
            {formData.annexes && formData.annexes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Anexe atașate ({formData.annexes.length})
                </p>
                {formData.annexes.map((annex, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {annex.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(annex.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => window.open(annex.url, '_blank')}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Vizualizează"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = annex.url
                          link.download = annex.name
                          link.click()
                        }}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="Descarcă"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnnex(index)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Șterge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <FileText className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Contract</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ContractModal
