import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const CabinetModal = ({ item, onClose, onSave }) => {
  const { providers, platforms } = useData()
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    model: '',
    platform: '',
    status: 'Activ',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        provider: item.provider || '',
        name: item.name || '',
        model: item.model || '',
        platform: item.platform || '',
        status: item.status || 'Activ',
        notes: item.notes || ''
      })
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-purple-700 to-violet-600 text-white px-8 py-6 flex items-center justify-between rounded-t-3xl shadow-lg">
          <h2 className="text-2xl font-bold flex items-center">
            {item ? 'Editează Cabinet' : 'Adaugă Cabinet Nou'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Furnizor */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Furnizor *
              </label>
              <select 
                name="provider" 
                value={formData.provider} 
                onChange={handleChange} 
                className="input-field"
                required
              >
                <option value="">Selectează furnizor</option>
                {providers?.map(prov => (
                  <option key={prov.id} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Furnizorul cabinetului</p>
            </div>

            {/* Nume Cabinet */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Nume Cabinet *
              </label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="input-field" 
                placeholder="Ex: Cabinet Premium 01"
                required 
              />
              <p className="text-xs text-slate-500">Numele cabinetului</p>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Model
              </label>
              <input 
                type="text" 
                name="model" 
                value={formData.model} 
                onChange={handleChange} 
                className="input-field" 
                placeholder="Ex: Deluxe 2024"
              />
              <p className="text-xs text-slate-500">Modelul cabinetului</p>
            </div>

            {/* Platformă */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Platformă *
              </label>
              <select 
                name="platform" 
                value={formData.platform} 
                onChange={handleChange} 
                className="input-field"
                required
              >
                <option value="">Selectează platformă</option>
                {platforms?.map(plat => (
                  <option key={plat.id} value={plat.name}>
                    {plat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Platforma tehnică a cabinetului</p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Status *
              </label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="input-field"
                required
              >
                <option value="Activ">Activ</option>
                <option value="Inactiv">Inactiv</option>
                <option value="Mentenanță">Mentenanță</option>
              </select>
              <p className="text-xs text-slate-500">Statusul actual</p>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">
              Note Adiționale
            </label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              className="input-field min-h-[100px] resize-none"
              placeholder="Informații suplimentare despre cabinet..."
            />
            <p className="text-xs text-slate-500">Observații și detalii adiționale</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-8"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="btn-primary px-8"
            >
              {item ? 'Actualizează Cabinet' : 'Adaugă Cabinet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CabinetModal
