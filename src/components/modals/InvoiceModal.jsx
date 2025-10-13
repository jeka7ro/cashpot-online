import React, { useState, useEffect } from 'react'
import { X, Save, Receipt, Building2, Calendar, DollarSign } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PDFViewer from '../PDFViewer'

const InvoiceModal = ({ item, onClose, onSave }) => {
  const { companies, locations, providers } = useData()
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    serial_numbers: '', // Multiple serial numbers separated by newlines
    buyer: '', // Cumpărător (Company)
    seller: '', // Vânzător (Provider)
    type: 'Sale', // Vânzare/Chirie
    amount: '',
    currency: 'RON',
    rates: '', // Optional
    locations: [], // Multiple locations as array
    pdf_file: null // PDF file
  })

  useEffect(() => {
    if (item) {
      setFormData({
        invoice_number: item.invoice_number || '',
        serial_numbers: item.serial_number ? 
          (typeof item.serial_number === 'string' ? JSON.parse(item.serial_number).join('\n') : item.serial_number.join('\n')) 
          : '',
        buyer: item.company || '',
        seller: item.seller || '',
        type: item.invoice_type || 'Sale',
        amount: item.amount || '',
        currency: item.currency || 'RON',
        rates: item.rates || '',
        locations: item.location ? 
          (typeof item.location === 'string' ? JSON.parse(item.location) : item.location) 
          : [],
        pdf_file: item.pdf_file || null
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target
    
    if (type === 'checkbox') {
      // Handle multiple locations
      if (name === 'location') {
        setFormData(prev => ({
          ...prev,
          locations: checked 
            ? [...prev.locations, value]
            : prev.locations.filter(loc => loc !== value)
        }))
      }
    } else if (type === 'file') {
      // Handle file upload
      setFormData(prev => ({
        ...prev,
        [name]: files[0] || null
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Create FormData for file upload
    const formDataToSend = new FormData()
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      if (key === 'locations') {
        // Handle array of locations
        formDataToSend.append(key, JSON.stringify(formData[key]))
      } else if (key === 'pdf_file') {
        // Handle file upload
        if (formData[key]) {
          formDataToSend.append(key, formData[key])
        }
      } else {
        formDataToSend.append(key, formData[key])
      }
    })
    
    onSave(formDataToSend)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Factură' : 'Adaugă Factură Nouă'}
              </h2>
              <p className="text-blue-100 text-sm font-medium">
                Completează informațiile despre factură
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
              {/* Număr Factură */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Număr Factură *</label>
                <input 
                  type="text" 
                  name="invoice_number" 
                  value={formData.invoice_number} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="ex: INV-2024-001" 
                  required 
                />
              </div>

              {/* Serii */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Serii</label>
                <textarea 
                  name="serial_numbers" 
                  value={formData.serial_numbers} 
                  onChange={handleChange} 
                  rows={3} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Introduceți seriile, câte una pe rând" 
                />
              </div>

              {/* Cumpărător */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Cumpărător *</label>
                <select 
                  name="buyer" 
                  value={formData.buyer} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required
                >
                  <option value="">Selectează compania</option>
                  {companies?.map(company => (
                    <option key={company.id} value={company.name}>{company.name}</option>
                  ))}
                </select>
              </div>

              {/* Vânzător */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Vânzător *</label>
                <select 
                  name="seller" 
                  value={formData.seller} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required
                >
                  <option value="">Selectează furnizorul</option>
                  {providers?.map(provider => (
                    <option key={provider.id} value={provider.name}>{provider.name}</option>
                  ))}
                </select>
              </div>

              {/* Tip */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Tip *</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required
                >
                  <option value="Sale">Vânzare</option>
                  <option value="Rental">Chirie</option>
                </select>
              </div>

              {/* Suma */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Suma *</label>
                <input 
                  type="number" 
                  name="amount" 
                  value={formData.amount} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="0.00" 
                  step="0.01"
                  required 
                />
              </div>

              {/* Valută */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Valută</label>
                <select 
                  name="currency" 
                  value={formData.currency} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {/* Rate */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Rate (opțional)</label>
                <input 
                  type="text" 
                  name="rates" 
                  value={formData.rates} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="ex: 3 rate de 1000 RON" 
                />
              </div>

              {/* PDF Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">PDF Factură *</label>
                <input 
                  type="file" 
                  name="pdf_file" 
                  onChange={handleChange} 
                  accept=".pdf"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required
                />
                {formData.pdf_file && (
                  <p className="text-sm text-green-600">
                    Fișier selectat: {formData.pdf_file.name}
                  </p>
                )}
              </div>
            </div>

            {/* Locații */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Locații</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {locations?.map(location => (
                  <label key={location.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="location"
                      value={location.name}
                      checked={formData.locations.includes(location.name)}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{location.name}</span>
                  </label>
                ))}
              </div>
              {formData.locations.length === locations.length && (
                <p className="text-sm text-blue-600 font-medium">Toate locațiile</p>
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
                <Save className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Factură</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default InvoiceModal