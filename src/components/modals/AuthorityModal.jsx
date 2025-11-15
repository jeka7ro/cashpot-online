import React, { useState, useEffect } from 'react'
import { X, Save, FileCheck, Building, MapPin, DollarSign } from 'lucide-react'

const AuthorityModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    price_initiala: '',
    price_reparatie: '',
    price_periodica: '',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        address: item.address || '',
        price_initiala: item.price_initiala || '',
        price_reparatie: item.price_reparatie || '',
        price_periodica: item.price_periodica || '',
        notes: item.notes || ''
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-500 to-red-500 p-8 text-white">
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Autoritatea Emitentă' : 'Adaugă Autoritate Emitentă'}
              </h2>
              <p className="text-orange-100 text-sm font-medium">
                Completează informațiile despre autoritatea emitentă
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-2xl p-3 transition-all duration-200 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informații de bază */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                Informații de bază
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Numele *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    placeholder="Numele autorității" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Adresa</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    placeholder="Adresa autorității" 
                  />
                </div>
              </div>
            </div>

            {/* Prețuri */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                Prețuri (opțional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Preț Inițială (LEI)</label>
                  <input 
                    type="number" 
                    name="price_initiala" 
                    value={formData.price_initiala} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    placeholder="0" 
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Preț Reparație (LEI)</label>
                  <input 
                    type="number" 
                    name="price_reparatie" 
                    value={formData.price_reparatie} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    placeholder="0" 
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Preț Periodică (LEI)</label>
                  <input 
                    type="number" 
                    name="price_periodica" 
                    value={formData.price_periodica} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    placeholder="0" 
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Note</label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                rows={4} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                placeholder="Note adiționale" 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
              <button 
                type="button" 
                onClick={onClose}
                className="btn-secondary"
              >
                <X className="w-4 h-4" />
                Anulează
              </button>
              <button 
                type="submit"
                className="btn-primary"
              >
                <Save className="w-4 h-4" />
                {item ? 'Actualizează' : 'Adaugă'} Autoritate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AuthorityModal













