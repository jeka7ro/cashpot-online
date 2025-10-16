import React, { useState, useEffect } from 'react'
import { X, TrendingUp, Calendar, MapPin, Award, DollarSign, Plus, Trash2 } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const MarketingModal = ({ item, onClose, onSave }) => {
  const { locations } = useData()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    prizes: [{ amount: '', currency: 'RON', date: '', winner: '' }],
    status: 'Active',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      // Parse prizes from JSONB or old format
      let parsedPrizes = [{ amount: '', currency: 'RON', date: '', winner: '' }]
      
      if (item.prizes) {
        // New format: JSONB array
        parsedPrizes = typeof item.prizes === 'string' 
          ? JSON.parse(item.prizes) 
          : item.prizes
      } else if (item.prize_amount) {
        // Old format: single prize
        parsedPrizes = [{
          amount: item.prize_amount || '',
          currency: item.prize_currency || 'RON',
          date: item.prize_date ? item.prize_date.split('T')[0] : '',
          winner: item.winner || ''
        }]
      }
      
      setFormData({
        name: item.name || '',
        description: item.description || '',
        start_date: item.start_date ? item.start_date.split('T')[0] : '',
        end_date: item.end_date ? item.end_date.split('T')[0] : '',
        location: item.location || '',
        prizes: parsedPrizes.length > 0 ? parsedPrizes : [{ amount: '', currency: 'RON', date: '', winner: '' }],
        status: item.status || 'Active',
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

  const handlePrizeChange = (index, field, value) => {
    const newPrizes = [...formData.prizes]
    newPrizes[index][field] = value
    setFormData(prev => ({
      ...prev,
      prizes: newPrizes
    }))
  }

  const addPrize = () => {
    setFormData(prev => ({
      ...prev,
      prizes: [...prev.prizes, { amount: '', currency: 'RON', date: '', winner: '' }]
    }))
  }

  const removePrize = (index) => {
    if (formData.prizes.length === 1) {
      alert('Trebuie să existe cel puțin un premiu!')
      return
    }
    setFormData(prev => ({
      ...prev,
      prizes: prev.prizes.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate at least one prize with amount
    const validPrizes = formData.prizes.filter(p => p.amount && parseFloat(p.amount) > 0)
    if (validPrizes.length === 0) {
      alert('Adaugă cel puțin un premiu cu sumă validă!')
      return
    }
    
    // Sort prizes by date (earliest first)
    const sortedPrizes = validPrizes.sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date) - new Date(b.date)
    })
    
    onSave({
      ...formData,
      prizes: sortedPrizes
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {item ? 'Editare Promoție' : 'Promoție Nouă'}
                </h2>
                <p className="text-blue-100 text-sm">Marketing & Tombole</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Nume Promoție *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ex: Tombola Paște 2025"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Locație *
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">Selectează locația</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.name}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descriere
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descriere promoție..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Data Start *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Data Final *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>

          {/* Prizes Section */}
          <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                <Award className="w-5 h-5 mr-2 text-pink-500" />
                Premii (Data Acordare)
              </h3>
              <button
                type="button"
                onClick={addPrize}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 
                         text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă Premiu</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.prizes.map((prize, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Premiu #{index + 1}
                    </span>
                    {formData.prizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrize(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Sumă *
                      </label>
                      <input
                        type="number"
                        value={prize.amount}
                        onChange={(e) => handlePrizeChange(index, 'amount', e.target.value)}
                        required
                        placeholder="5000"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-500 
                                 bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-base font-medium
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Monedă
                      </label>
                      <select
                        value={prize.currency}
                        onChange={(e) => handlePrizeChange(index, 'currency', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-500 
                                 bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-base font-medium
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="RON">RON</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Data Acordare *
                      </label>
                      <input
                        type="date"
                        value={prize.date}
                        onChange={(e) => handlePrizeChange(index, 'date', e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-500 
                                 bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-base font-medium
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Câștigător
                      </label>
                      <input
                        type="text"
                        value={prize.winner || ''}
                        onChange={(e) => handlePrizeChange(index, 'winner', e.target.value)}
                        placeholder="Nume câștigător"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-500 
                                 bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-base font-medium
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="Active">Activ</option>
                <option value="Completed">Finalizat</option>
                <option value="Cancelled">Anulat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Note
              </label>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Note adiționale..."
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t-2 border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 
                       text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 
                       transition-all font-medium"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl 
                       hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg font-medium"
            >
              {item ? 'Salvează Modificările' : 'Creează Promoție'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MarketingModal
