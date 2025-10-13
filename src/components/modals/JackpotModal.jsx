import React, { useState, useEffect } from 'react'
import { X, Save, Trophy, Target, DollarSign, Calendar } from 'lucide-react'

const JackpotModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    serial_number: '',
    jackpot_name: '',
    jackpot_type: 'Progressive',
    current_amount: 0,
    max_amount: '',
    progress_percentage: 0,
    status: 'Active',
    winner: '',
    triggered_date: '',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        serial_number: item.serial_number || '',
        jackpot_name: item.jackpot_name || '',
        jackpot_type: item.jackpot_type || 'Progressive',
        current_amount: item.current_amount || 0,
        max_amount: item.max_amount || '',
        progress_percentage: item.progress_percentage || 0,
        status: item.status || 'Active',
        winner: item.winner || '',
        triggered_date: item.triggered_date || '',
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
        <div className="bg-gradient-to-r from-slate-800 via-yellow-800 to-amber-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-amber-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Jackpot' : 'Adaugă Jackpot Nou'}
              </h2>
              <p className="text-yellow-100 text-sm font-medium">
                Completează informațiile despre jackpot
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
            {/* Informații de bază */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                Informații de bază
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Numărul de serie *</label>
                  <input 
                    type="text" 
                    name="serial_number" 
                    value={formData.serial_number} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    placeholder="Serial number slot" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Nume Jackpot *</label>
                  <input 
                    type="text" 
                    name="jackpot_name" 
                    value={formData.jackpot_name} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    placeholder="ex: Mega Jackpot" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Tip Jackpot</label>
                  <select 
                    name="jackpot_type" 
                    value={formData.jackpot_type} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="Progressive">Progresiv</option>
                    <option value="Fixed">Fix</option>
                    <option value="Mystery">Mystery</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Status</label>
                  <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="Active">Activ</option>
                    <option value="Triggered">Declanșat</option>
                    <option value="Reset">Resetat</option>
                    <option value="Maintenance">Mentenanță</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Informații financiare */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                Informații financiare
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Suma curentă</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="current_amount" 
                    value={formData.current_amount} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Suma maximă</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="max_amount" 
                    value={formData.max_amount} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    placeholder="1000000.00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Progres (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="progress_percentage" 
                    value={formData.progress_percentage} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
            </div>

            {/* Informații câștigător */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                Informații câștigător
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Câștigător</label>
                  <input 
                    type="text" 
                    name="winner" 
                    value={formData.winner} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    placeholder="Numele câștigătorului" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Data declanșării</label>
                  <input 
                    type="datetime-local" 
                    name="triggered_date" 
                    value={formData.triggered_date} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Note</label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                placeholder="Note adiționale despre jackpot..." 
              />
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
                <Trophy className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Jackpot</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default JackpotModal
