import React, { useState, useEffect } from 'react'
import { X, Save, Package, Warehouse } from 'lucide-react'

const WarehouseModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    location: '',
    status: 'Available',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || '',
        quantity: item.quantity || '',
        location: item.location || '',
        status: item.status || 'Available',
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
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-orange-800 to-amber-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-amber-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-lg">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Produs' : 'Adaugă Produs în Depozit'}
              </h2>
              <p className="text-orange-100 text-sm font-medium">
                Completează informațiile despre produs
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Nume Produs *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent" placeholder="Nume produs" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Categorie *</label>
              <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent" placeholder="Categoria produsului" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Cantitate *</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent" placeholder="Cantitatea" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Locație *</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent" placeholder="Locația în depozit" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Status *</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent" required>
                <option value="Available">Disponibil</option>
                <option value="Out of Stock">Stoc epuizat</option>
                <option value="Reserved">Rezervat</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Note</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent" placeholder="Note adiționale" />
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
                <Warehouse className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Produs</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default WarehouseModal
