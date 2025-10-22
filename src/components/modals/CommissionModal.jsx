import React, { useState, useEffect } from 'react'
import { X, Save, Settings } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const CommissionModal = ({ item, onClose, onSave }) => {
  const { providers, cabinets } = useData()
  
  const [formData, setFormData] = useState({
    name: '',
    serial_numbers: '',
    commission_date: '',
    expiry_date: '',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      // Convert ISO dates to yyyy-MM-dd format for date inputs
      const formatDate = (dateString) => {
        if (!dateString) return ''
        try {
          const date = new Date(dateString)
          return date.toISOString().split('T')[0]
        } catch (e) {
          return ''
        }
      }

      setFormData({
        name: item.name || '',
        serial_numbers: item.serial_numbers || '',
        commission_date: formatDate(item.commission_date),
        expiry_date: formatDate(item.expiry_date),
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

    // Auto-calculate expiry_date when commission_date changes
    if (name === 'commission_date' && value) {
      const commissionDate = new Date(value)
      const expiryDate = new Date(commissionDate)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      expiryDate.setDate(expiryDate.getDate() - 1)
      
      setFormData(prev => ({
        ...prev,
        expiry_date: expiryDate.toISOString().split('T')[0]
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {item ? 'Editează Comisie' : 'Adaugă Comisie'}
                </h2>
                <p className="text-blue-100">
                  {item ? 'Modifică datele comisiei' : 'Adaugă o comisie nouă'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Numele */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Numele *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Introdu numele comisiei"
                required
              />
            </div>

            {/* Data Comisiei */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Data Comisiei *
              </label>
              <input
                type="date"
                name="commission_date"
                value={formData.commission_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Data Valabilității */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Data Valabilității *
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Numerele de Serie */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Numerele de Serie *
            </label>
            <textarea
              name="serial_numbers"
              value={formData.serial_numbers}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Introdu numerele de serie separate prin rânduri nouă"
              required
            />
            <p className="text-sm text-slate-500">
              Separă numerele de serie prin rânduri nouă
            </p>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Note
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Adaugă note suplimentare"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-blue-500/25"
            >
              <div className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Salvează'}</span>
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CommissionModal


