import React, { useState, useEffect } from 'react'
import { X, Cherry, Plus, Minus, Gamepad2 } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const GameMixModal = ({ item, onClose, onSave }) => {
  const { providers } = useData()
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    games: '',
    rtp: '',
    denomination: 0.01,
    max_bet: '',
    gaming_places: 1,
    status: 'Active',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      let gamesString = ''
      try {
        if (typeof item.games === 'string') {
          const gamesArray = JSON.parse(item.games)
          gamesString = Array.isArray(gamesArray) ? gamesArray.join('\n') : ''
        } else if (Array.isArray(item.games)) {
          gamesString = item.games.join('\n')
        }
      } catch (error) {
        console.error('Error parsing games:', error)
        gamesString = ''
      }
      
      setFormData({
        name: item.name || '',
        provider: item.provider || '',
        games: gamesString,
        rtp: item.rtp || '',
        denomination: item.denomination || 0.01,
        max_bet: item.max_bet || '',
        gaming_places: item.gaming_places || 1,
        status: item.status || 'Active',
        notes: item.notes || ''
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Count games by lines
  const getGamesCount = () => {
    if (!formData.games.trim()) return 0
    return formData.games.split('\n').filter(line => line.trim()).length
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Convert games string to array for backend
    const gamesArray = formData.games
      .split('\n')
      .map(game => game.trim())
      .filter(game => game.length > 0)
    
    const submitData = {
      ...formData,
      games: gamesArray,
      rtp: formData.rtp ? parseFloat(formData.rtp) : null,
      denomination: formData.denomination ? parseFloat(formData.denomination) : 0.01,
      max_bet: formData.max_bet ? parseFloat(formData.max_bet) : null,
      gaming_places: formData.gaming_places ? parseInt(formData.gaming_places) : 1
    }
    
    console.log('🎮 GameMix submitData:', submitData)
    onSave(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-indigo-800 to-blue-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl shadow-lg">
              <Cherry className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Game Mix' : 'Adaugă Game Mix'}
              </h2>
              <p className="text-indigo-100 text-sm font-medium">
                Completează informațiile despre game mix
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
              {/* Game Mix Name */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Nume Game Mix *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: Mix Clasice Novomatic"
                  required
                />
              </div>

              {/* Provider */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Furnizor
                </label>
                <select 
                  name="provider" 
                  value={formData.provider} 
                  onChange={handleChange} 
                  className="input-field"
                >
                  <option value="">Selectează furnizor</option>
                  {providers?.map(provider => (
                    <option key={provider.id} value={provider.name}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* RTP */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  RTP (%)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  name="rtp" 
                  value={formData.rtp} 
                  onChange={handleChange} 
                  className="input-field" 
                  placeholder="ex: 96.5"
                />
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Games Count Display */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Jocuri în Mix
                </label>
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-lg">
                    {getGamesCount()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{getGamesCount()} jocuri</div>
                    <div className="text-sm text-slate-500">în acest mix</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Games Management */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Jocuri în Mix
                </label>
                <textarea 
                  name="games" 
                  value={formData.games} 
                  onChange={handleChange} 
                  className="input-field" 
                  rows={6}
                  placeholder="Introdu numele jocurilor, separate pe rânduri diferite:&#10;Book of Ra&#10;Sizzling Hot&#10;Lucky Lady Charm&#10;Dolphins Pearl"
                />
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700">
                    💡 Exemplu: Un joc pe fiecare rând
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>{getGamesCount()} jocuri adăugate</span>
                </div>
              </div>
            </div>

            {/* Technical Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                Configurație Tehnică
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Denomination */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Denomination
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="denomination" 
                    value={formData.denomination} 
                    onChange={handleChange} 
                    className="input-field" 
                    placeholder="0.01"
                  />
                </div>

                {/* Max Bet */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Max Bet
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="max_bet" 
                    value={formData.max_bet} 
                    onChange={handleChange} 
                    className="input-field" 
                    placeholder="100.00"
                  />
                </div>

                {/* Gaming Places */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Gaming Places
                  </label>
                  <input 
                    type="number" 
                    name="gaming_places" 
                    value={formData.gaming_places} 
                    onChange={handleChange} 
                    className="input-field" 
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Note
              </label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                className="input-field" 
                rows={3}
                placeholder="Note adiționale despre acest game mix..."
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
                <Cherry className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Game Mix</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default GameMixModal