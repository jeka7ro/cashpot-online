import React, { useState, useEffect } from 'react'
import { X, TrendingUp, Calendar, MapPin, Award, DollarSign } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const MarketingModal = ({ item, onClose, onSave }) => {
  const { locations } = useData()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    prize_amount: '',
    prize_currency: 'RON',
    prize_date: '',
    status: 'Active',
    winner: '',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        start_date: item.start_date ? item.start_date.split('T')[0] : '',
        end_date: item.end_date ? item.end_date.split('T')[0] : '',
        location: item.location || '',
        prize_amount: item.prize_amount || '',
        prize_currency: item.prize_currency || 'RON',
        prize_date: item.prize_date ? item.prize_date.split('T')[0] : '',
        status: item.status || 'Active',
        winner: item.winner || '',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {item ? 'Editează Promoție' : 'Adaugă Promoție Nouă'}
                </h2>
                <p className="text-pink-100">
                  {item ? 'Modifică datele promoției' : 'Creează o campanie promoțională nouă'}
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
            {/* Denumire */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Denumire Promoție *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                placeholder="Ex: Tombola Paște 2025"
                required
              />
            </div>

            {/* Descriere */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Descriere
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                placeholder="Detalii despre promoție, condiții de participare, etc."
              />
            </div>

            {/* Data început */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                <span>Data Început *</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                required
              />
            </div>

            {/* Data sfârșit */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                <span>Data Sfârșit *</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                required
              />
            </div>

            {/* Locație */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-pink-500" />
                <span>Locație *</span>
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                required
              >
                <option value="">Selectează locația</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sumă premiu */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <Award className="w-4 h-4 text-pink-500" />
                <span>Sumă Premiu</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="prize_amount"
                  value={formData.prize_amount}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="5000"
                  step="0.01"
                />
                <select
                  name="prize_currency"
                  value={formData.prize_currency}
                  onChange={handleChange}
                  className="w-24 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                >
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Data acordare premiu */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                <span>Data Acordare Premiu</span>
              </label>
              <input
                type="date"
                name="prize_date"
                value={formData.prize_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              >
                <option value="Active">Activ</option>
                <option value="Completed">Încheiat</option>
                <option value="Cancelled">Anulat</option>
              </select>
            </div>

            {/* Câștigător */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Câștigător (după extragere)
              </label>
              <input
                type="text"
                name="winner"
                value={formData.winner}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                placeholder="Numele câștigătorului"
              />
            </div>

            {/* Notițe */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Notițe
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                placeholder="Condiții suplimentare, observații..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-pink-500/50"
            >
              {item ? 'Actualizează' : 'Adaugă'} Promoție
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MarketingModal

