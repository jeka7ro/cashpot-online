import React, { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const LocationModal = ({ item, onClose, onSave }) => {
  const { companies, users, contracts } = useData()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    company: '',
    capacity: '',
    surface: '',
    planFile: null,
    status: 'Activ',
    coordinates: '',
    contact_person: '',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        address: item.address || '',
        company: item.company || '',
        capacity: item.capacity || '',
        surface: item.surface || '',
        planFile: item.planFile || null,
        status: item.status || 'Activ',
        coordinates: item.coordinates || '',
        contact_person: item.contact_person || '',
        notes: item.notes || ''
      })
    }
  }, [item])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Fișierul este prea mare! Maxim 10MB.')
      return
    }
    
    // Convert file to Base64 (same as ContractModal)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64String = e.target.result
      setFormData({
        ...formData,
        planFile: base64String,
        planFileName: file.name
      })
    }
    reader.onerror = () => {
      alert('Eroare la citirea fișierului')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  // Calculate total surface area from contracts for this location
  const calculateTotalSurfaceFromContracts = () => {
    if (!item || !item.id || !contracts) return 0
    
    const locationContracts = contracts.filter(c => c.location_id === item.id)
    const totalSurface = locationContracts.reduce((sum, contract) => {
      const surface = parseFloat(contract.surface_area) || 0
      return sum + surface
    }, 0)
    
    return totalSurface
  }

  const calculatedSurface = item ? calculateTotalSurfaceFromContracts() : 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-green-800 to-emerald-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Locație' : 'Adaugă Locație'}
              </h2>
              <p className="text-green-100 text-sm font-medium">
                Completează informațiile despre locație
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
              {/* Location Name */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Nume Locație *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: Locația Centru"
                  required
                />
              </div>

              {/* Company */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Companie *
                </label>
                <select 
                  name="company" 
                  value={formData.company} 
                  onChange={handleChange} 
                  className="input-field" 
                  required
                >
                  <option value="">Selectează o companie</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Persoană de Contact
                </label>
                <select 
                  name="contact_person" 
                  value={formData.contact_person} 
                  onChange={handleChange} 
                  className="input-field"
                >
                  <option value="">Selectează o persoană de contact</option>
                  {users.map(user => (
                    <option key={user.id} value={user.full_name || user.username}>
                      {user.full_name || user.username} (@{user.username})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Persoana responsabilă pentru această locație
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-bold text-slate-700">
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

              {/* Surface - Calculated from contracts */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Suprafață (calculată din contracte)
                </label>
                <div className="input-field bg-slate-50 text-slate-600 cursor-not-allowed">
                  {calculatedSurface.toFixed(2)} m²
                </div>
                <p className="text-xs text-slate-500">
                  Suprafața se calculează automat din suma suprafețelor contractelor acestei locații
                </p>
              </div>

              {/* Capacity - Calculated from slots */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Capacitate (calculată din sloturi)
                </label>
                <div className="input-field bg-slate-50 text-slate-600 cursor-not-allowed">
                  {formData.capacity || 0} sloturi
                </div>
                <p className="text-xs text-slate-500">
                  Capacitatea se calculează automat din numărul de sloturi alocate acestei locații
                </p>
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
                  <option value="Mentenanță">Mentenanță</option>
                </select>
              </div>

              {/* Coordinates */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Coordonate (lat, lng)
                </label>
                <input 
                  type="text" 
                  name="coordinates" 
                  value={formData.coordinates} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: 44.4268, 26.1025"
                />
              </div>

              {/* Plan Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Plan Locație
                </label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                    onChange={handleFileChange}
                    className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {formData.planFile && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      ✓ Fișier selectat: {formData.planFileName || 'Plan locație.pdf'}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Formate acceptate: PDF, JPG, PNG, DWG, DXF
                </p>
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
                placeholder="Informații suplimentare despre locație..."
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
                  {item ? 'Actualizează' : 'Adaugă'} Locație
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LocationModal
