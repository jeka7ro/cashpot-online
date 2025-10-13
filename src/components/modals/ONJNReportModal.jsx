import React, { useState, useEffect } from 'react'
import { X, Save, FileText, BarChart3 } from 'lucide-react'

const ONJNReportModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    period: '',
    status: 'Draft',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        type: item.type || '',
        period: item.period || '',
        status: item.status || 'Draft',
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
        <div className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Raport ONJN' : 'Adaugă Raport ONJN Nou'}
              </h2>
              <p className="text-blue-100 text-sm font-medium">
                Completează informațiile despre raportul ONJN
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
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Nume Raport *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Numele raportului" required />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Tip *</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required>
                  <option value="">Selectează tipul</option>
                  <option value="Monthly">Lunar</option>
                  <option value="Quarterly">Trimestrial</option>
                  <option value="Annual">Anual</option>
                  <option value="Special">Special</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Perioada *</label>
              <input type="text" name="period" value={formData.period} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="ex: Ianuarie 2025" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Status *</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required>
                <option value="Draft">Draft</option>
                <option value="Submitted">Trimis</option>
                <option value="Approved">Aprobat</option>
                <option value="Rejected">Respins</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Note</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Note adiționale" />
            </div>
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 hover:text-slate-800 font-semibold transition-colors">Anulează</button>
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Adaugă'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ONJNReportModal
