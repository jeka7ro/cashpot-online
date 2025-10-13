import React, { useState, useEffect } from 'react'
import { X, Building2, Upload, Download, Eye, FileText, Image } from 'lucide-react'
import PDFViewer from '../PDFViewer'

const CompanyModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Furnizor',
    license: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    status: 'Activ',
    notes: '',
    cui: '',
    cuiFile: null,
    cuiPreview: null
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        type: item.type || 'Furnizor',
        license: item.license || '',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
        contactPerson: item.contact_person || '',
        status: item.status || 'Activ',
        notes: item.notes || '',
        cui: item.cui || '',
        cuiFile: item.cuiFile || null,
        cuiPreview: item.cuiFile || null
      })
    }
  }, [item])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCuiFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target.result
        setFormData(prev => ({
          ...prev,
          cuiFile: base64String,
          cuiPreview: base64String
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownloadCui = () => {
    if (formData.cuiFile) {
      const link = document.createElement('a')
      link.href = formData.cuiFile
      link.download = `CUI_${formData.name || 'company'}.${formData.cuiFile.includes('data:image') ? 'jpg' : 'pdf'}`
      link.click()
    }
  }

  const handleDeleteCui = () => {
    if (window.confirm('Sigur doriți să ștergeți documentul CUI?')) {
      setFormData(prev => ({
        ...prev,
        cuiFile: null,
        cuiPreview: null
      }))
    }
  }

  const getFileIcon = (file) => {
    if (!file) return <FileText className="w-4 h-4" />
    return file.includes('data:image') ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Convert contactPerson to contact_person for backend
    const submitData = {
      ...formData,
      contact_person: formData.contactPerson
    }
    delete submitData.contactPerson
    onSave(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Companie' : 'Adaugă Companie'}
              </h2>
              <p className="text-blue-100 text-sm font-medium">
                Completează informațiile despre companie
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
              {/* Company Type */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Tip Companie *
                </label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleChange} 
                  className="input-field"
                  required
                >
                  <option value="Operator">Operator (Proprietar)</option>
                  <option value="Furnizor">Furnizor (pentru contracte)</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Operator = compania ta de bază | Furnizor = companii externe pentru contracte
                </p>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Nume Companie *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: BRML Industries SRL"
                  required
                />
              </div>

              {/* License */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Număr Licență *
                </label>
                <input 
                  type="text" 
                  name="license" 
                  value={formData.license} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: L-2024-001"
                  required
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Persoană de Contact *
                </label>
                <input 
                  type="text" 
                  name="contactPerson" 
                  value={formData.contactPerson} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: Ion Popescu"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Email *
                </label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: contact@brml.ro"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Telefon *
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: +40 21 123 4567"
                  required
                />
              </div>

              {/* CUI */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  CUI (Certificat Unic de Înregistrare)
                </label>
                <input 
                  type="text" 
                  name="cui" 
                  value={formData.cui} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: RO12345678"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
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
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Adresă Completă *
              </label>
              <textarea 
                name="address" 
                value={formData.address} 
                onChange={handleChange} 
                className="input-field min-h-[100px] resize-none" 
                placeholder="ex: Str. Centrală nr. 1, București, România"
                required
              />
            </div>

            {/* CUI Document Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Document CUI (PDF sau JPG)
              </label>
              
              {/* Upload Section */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="cuiFile"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleCuiFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="cuiFile"
                  className="cursor-pointer flex flex-col items-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {formData.cuiFile ? 'Schimbă documentul' : 'Încarcă document CUI'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">PDF, JPG, PNG (max 10MB)</p>
                  </div>
                </label>
              </div>

              {/* PDF Viewer Section */}
              {formData.cuiPreview && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(formData.cuiFile)}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Document CUI
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteCui}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Șterge documentul"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* PDF Viewer */}
                  {formData.cuiFile.includes('data:image') ? (
                    <div className="aspect-[3/4] bg-white rounded-lg border-2 border-slate-200 overflow-hidden">
                      <img
                        src={formData.cuiPreview}
                        alt="CUI Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <PDFViewer 
                      pdfUrl={formData.cuiPreview}
                      title={`CUI Document ${formData.name}`}
                      placeholder="Documentul CUI nu este disponibil"
                      placeholderSubtext="Atașează documentul CUI pentru vizualizare"
                    />
                  )}
                </div>
              )}
            </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                    Note Adiționale
                  </label>
                  <textarea 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleChange} 
                    className="input-field min-h-[80px] resize-none" 
                    placeholder="Informații suplimentare despre companie..."
                  />
                </div>

            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-8 border-t-2 border-slate-200/50 dark:border-slate-700/50 mt-8">
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
                  {item ? 'Actualizează' : 'Adaugă'} Companie
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CompanyModal
