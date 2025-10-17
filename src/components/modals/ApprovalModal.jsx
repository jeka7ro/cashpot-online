import React, { useState, useEffect } from 'react'
import { X, Save, FileCheck, Upload, Trash2 } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const ApprovalModal = ({ item, onClose, onSave }) => {
  const { providers, cabinets, gameMixes } = useData()
  const [authorities, setAuthorities] = useState([])
  
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    cabinet: '',
    gameMix: '',
    issuingAuthority: '',
    checksumMD5: '',
    checksumSHA256: '',
    attachments: [],
    notes: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    // Load authorities list for dropdown
    const loadAuthorities = async () => {
      try {
        const res = await fetch('/api/authorities')
        const data = await res.json()
        setAuthorities(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Error loading authorities:', e)
      }
    }
    loadAuthorities()

    if (item) {
      setFormData({
        name: item.name || '',
        provider: item.provider || '',
        cabinet: item.cabinet || '',
        gameMix: item.game_mix || item.gameMix || '',
        issuingAuthority: item.issuing_authority || item.issuingAuthority || '',
        checksumMD5: item.checksum_md5 || item.checksumMD5 || '',
        checksumSHA256: item.checksum_sha256 || item.checksumSHA256 || '',
        attachments: item.attachments || [],
        notes: item.notes || ''
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      }
      
      // Reset gameMix when provider changes
      if (name === 'provider') {
        newData.gameMix = ''
      }
      
      return newData
    })
  }
  
  // Filter game mixes based on selected provider
  const filteredGameMixes = gameMixes.filter(gm => {
    // Must match selected provider
    if (formData.provider && gm.provider !== formData.provider) return false
    return true
  })

  // File upload handlers
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        return {
          name: file.name,
          url: response.data.url,
          size: file.size,
          type: file.type
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`Eroare la upload pentru ${file.name}`)
        return null
      }
    })
    
    try {
      const results = await Promise.all(uploadPromises)
      const validResults = results.filter(result => result !== null)
      
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...validResults]
      }))
      
      toast.success(`${validResults.length} fișiere încărcate cu succes`)
    } catch (error) {
      toast.error('Eroare la încărcarea fișierelor')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileUpload(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Transform to snake_case for backend
    const dataToSave = {
      name: formData.name,
      provider: formData.provider,
      cabinet: formData.cabinet,
      game_mix: formData.gameMix,
      issuing_authority: formData.issuingAuthority,
      checksum_md5: formData.checksumMD5,
      checksum_sha256: formData.checksumSHA256,
      attachments: formData.attachments,
      notes: formData.notes
    }
    onSave(dataToSave)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {item ? 'Editează Aprobare de Tip' : 'Adaugă Aprobare de Tip'}
                </h2>
                <p className="text-green-100">
                  {item ? 'Modifică datele aprobării' : 'Adaugă o aprobare de tip nouă'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Numele */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Numele *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Introdu numele aprobării"
                required
              />
            </div>

            {/* Furnizor */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Furnizor *
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Selectează furnizorul</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cabinet */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Cabinet *
              </label>
              <select
                name="cabinet"
                value={formData.cabinet}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Selectează cabinetul</option>
                {cabinets
                  .filter(cabinet => !formData.provider || cabinet.provider === formData.provider)
                  .map(cabinet => (
                    <option key={cabinet.id} value={cabinet.name}>
                      {cabinet.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Game Mix */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Game Mix
              </label>
              <select
                name="gameMix"
                value={formData.gameMix}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={!formData.provider}
              >
                <option value="">Selectează game mix-ul</option>
                {filteredGameMixes.map(gameMix => (
                  <option key={gameMix.id} value={gameMix.name}>
                    {gameMix.name}
                  </option>
                ))}
              </select>
            </div>

          {/* Autoritate emitentă */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Autoritate emitentă
            </label>
            <select
              name="issuingAuthority"
              value={formData.issuingAuthority}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Selectează autoritatea</option>
              {authorities.map(auth => (
                <option key={auth.id} value={auth.name}>{auth.name}</option>
              ))}
            </select>
          </div>
          </div>

          {/* Checksums */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Checksum MD5 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Checksum MD5
              </label>
              <input
                type="text"
                name="checksumMD5"
                value={formData.checksumMD5}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Introdu checksum MD5"
              />
            </div>

            {/* Checksum SHA256 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Checksum SHA256
              </label>
              <input
                type="text"
                name="checksumSHA256"
                value={formData.checksumSHA256}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Introdu checksum SHA256"
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Atașamente
            </label>
            
            {/* Drag & Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 mb-2">Trage și plasează fișierele aici sau</p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Se încarcă...' : 'Selectează fișiere'}
              </label>
              <p className="text-xs text-slate-500 mt-2">
                Suportă: PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>

            {/* Attachments List */}
            {formData.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">Fișiere atașate:</p>
                {formData.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{attachment.name}</p>
                        <p className="text-xs text-slate-500">
                          {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Note
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Adaugă note suplimentare"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-green-500/25"
            >
              <div className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Salvează'}</span>
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApprovalModal

