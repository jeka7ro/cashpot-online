import React, { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const ProviderModal = ({ item, onClose, onSave }) => {
  const { companies } = useData()
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    contact: '',
    phone: '',
    company: '',
    status: 'Activ',
    notes: '',
    logo: {
      type: 'upload',
      url: '',
      file: null
    }
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        contact_person: item.contact_person || '',
        contact: item.contact || '',
        phone: item.phone || '',
        company: item.company || '',
        status: item.status || 'Activ',
        notes: item.notes || '',
        logo: item.logo ? (typeof item.logo === 'object' ? item.logo : {
          type: 'upload',
          url: '',
          file: null
        }) : {
          type: 'upload',
          url: '',
          file: null
        }
      })
    }
  }, [item])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleLogoTypeChange = (type) => {
    setFormData({
      ...formData,
      logo: { ...formData.logo, type }
    })
  }

  const handleLogoUrlChange = (url) => {
    setFormData({
      ...formData,
      logo: { ...formData.logo, url }
    })
  }

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({
          ...formData,
          logo: { ...formData.logo, file: reader.result }
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-violet-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-violet-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Furnizor' : 'Adaugă Furnizor'}
              </h2>
              <p className="text-purple-100 text-sm font-medium">
                Completează informațiile despre furnizor
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
              {/* Provider Name */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Nume Furnizor *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: EGT Digital"
                  required
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Persoana de Contact *
                </label>
                <input 
                  type="text" 
                  name="contact_person" 
                  value={formData.contact_person} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: Ion Popescu"
                  required
                />
              </div>

              {/* Company */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Companie Furnizor *
                </label>
                <input 
                  type="text" 
                  name="company" 
                  value={formData.company} 
                  onChange={handleChange} 
                  className="input-field"
                  placeholder="Introdu numele companiei"
                  required
                />
                <p className="text-xs text-slate-500">
                  Compania care deține furnizorul (pentru facturi și contracte)
                </p>
              </div>

              {/* Contact Email */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Email Contact *
                </label>
                <input 
                  type="email" 
                  name="contact" 
                  value={formData.contact} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: contact@egt-digital.com"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Telefon *
                </label>
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: +40 21 555 1234"
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Status
                </label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange} 
                  className="input-field"
                >
                  <option value="Activ">Activ</option>
                  <option value="Inactiv">Inactiv</option>
                  <option value="Suspendat">Suspendat</option>
                </select>
              </div>

              {/* Logo Furnizor */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-bold text-slate-700">
                  Logo Furnizor
                </label>
                
                <div className="flex space-x-4 mb-4">
                  <button
                    type="button"
                    onClick={() => handleLogoTypeChange('upload')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      formData.logo.type === 'upload'
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Upload Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogoTypeChange('link')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      formData.logo.type === 'link'
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Link URL
                  </button>
                </div>

                {formData.logo.type === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {formData.logo.file && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center space-x-4">
                        <img src={formData.logo.file} alt="Logo Preview" className="h-9 w-9 object-contain rounded" />
                        <span className="text-sm text-green-600 font-medium">✓ Logo încărcat</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formData.logo.url}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      className="input-field"
                      placeholder="https://example.com/logo.png"
                    />
                    {formData.logo.url && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center space-x-4">
                        <img src={formData.logo.url} alt="Logo Preview" className="h-9 w-9 object-contain rounded" />
                        <span className="text-sm text-green-600 font-medium">✓ Logo settat</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Note Adiționale
              </label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                className="input-field min-h-[80px] resize-none" 
                placeholder="Informații suplimentare despre furnizor..."
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-8 border-t-2 border-slate-200/50 mt-8">
              <button 
                type="button"
                onClick={onClose} 
                className="btn-secondary group"
              >
                <span className="group-hover:-translate-x-1 transition-transform inline-block">Anulează</span>
              </button>
              <button 
                type="submit" 
                className="btn-primary group"
              >
                <span className="group-hover:translate-x-1 transition-transform inline-block">
                  {item ? 'Actualizează' : 'Adaugă'} Furnizor
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProviderModal

