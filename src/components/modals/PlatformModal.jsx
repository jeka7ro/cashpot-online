import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const PlatformModal = ({ item, onClose, onSave }) => {
  const { providers } = useData()
  const [formData, setFormData] = useState({
    name: '',
    serial_numbers: '',
    provider_id: '',
    avatar_url: '',
    avatar_file: '',
    status: 'Active',
    notes: ''
  })
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        serial_numbers: item.serial_numbers || '',
        provider_id: item.provider_id || '',
        avatar_url: item.avatar_url || '',
        avatar_file: item.avatar_file || '',
        status: item.status || 'Active',
        notes: item.notes || ''
      })
      // Set preview image
      if (item.avatar_url) {
        setPreviewImage(item.avatar_url)
      } else if (item.avatar_file && item.avatar_file !== '{}') {
        setPreviewImage(item.avatar_file)
      } else {
        setPreviewImage(null)
      }
    }
  }, [item])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target.result
        setFormData(prev => ({ ...prev, avatar_file: base64String, avatar_url: '' }))
        setPreviewImage(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUrlChange = (e) => {
    setFormData(prev => ({ ...prev, avatar_url: e.target.value, avatar_file: '' }))
    if (e.target.value) {
      setPreviewImage(e.target.value)
    } else {
      setPreviewImage(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white px-8 py-6 flex items-center justify-between rounded-t-3xl shadow-lg">
          <h2 className="text-2xl font-bold flex items-center">
            {item ? 'Editează Platformă' : 'Adaugă Platformă Nouă'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nume Platformă */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">
                Nume Platformă *
              </label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm" 
                placeholder="Ex: Android 10 Pro"
                required 
              />
            </div>

            {/* Furnizor */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">
                Furnizor
              </label>
              <select 
                name="provider_id" 
                value={formData.provider_id} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
              >
                <option value="">Selectează furnizor</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

          {/* Avatar Platformă */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700">
              Avatar Platformă
            </label>
            <div className="space-y-3">
              {/* Preview */}
              {previewImage && (
                <div className="flex justify-center">
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 shadow-sm"
                  />
                </div>
              )}
              
              <input
                type="url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleUrlChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                placeholder="https://example.com/avatar.png"
              />
              <div className="relative">
                <input
                  type="file"
                  name="avatar_file"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                  accept="image/*"
                />
              </div>
            </div>
          </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">
                Status *
              </label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">
                Note
              </label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-none" 
                placeholder="Informații adiționale despre platformă..."
                rows={3}
              />
            </div>
          </div>

          {/* Numere Seriale - Full Width */}
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Numere Seriale *
            </label>
            <textarea 
              name="serial_numbers" 
              value={formData.serial_numbers} 
              onChange={handleChange} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm text-sm resize-none" 
              placeholder="Introdu numerele seriale, separate prin virgulă sau pe rânduri diferite:&#10;SN001, SN002, SN003&#10;sau:&#10;SN001&#10;SN002&#10;SN003"
              rows={4}
              required
            />
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                💡 Exemplu: SN12345, SN12346, SN12347
              </span>
              <span>sau pe rânduri separate</span>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              {item ? 'Actualizează' : 'Adaugă Platformă'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PlatformModal

