import React, { useState, useEffect } from 'react'
import { X, Save, BarChart3 } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const SlotModal = ({ item, onClose, onSave }) => {
  const { locations, cabinets, gameMixes, providers } = useData()
  

  const [formData, setFormData] = useState({
    serial_number: '',
    provider: '',
    location: '',
    game: '',
    cabinet: '',
    game_mix: '',
    denomination: 0.01,
    max_bet: '',
    rtp: '',
    gaming_places: 1,
    manufacture_year: '',
    commission_date: '',
    invoice_number: '',
    status: 'Active',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        serial_number: item.serial_number || '',
        provider: item.provider || '',
        location: item.location || '',
        game: item.game || '',
        cabinet: item.cabinet || '',
        game_mix: item.game_mix || '',
        denomination: item.denomination || 0.01,
        max_bet: item.max_bet || '',
        rtp: item.rtp || '',
        gaming_places: item.gaming_places || 1,
        manufacture_year: item.manufacture_year || '',
        commission_date: item.commission_date || '',
        invoice_number: item.invoice_number || '',
        status: item.status || 'Active',
        notes: item.notes || ''
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // Cascade logic
      if (name === 'provider') {
        // Reset cabinet and game_mix when provider changes
        newData.cabinet = ''
        newData.game_mix = ''
      } else if (name === 'cabinet') {
        // Reset game_mix when cabinet changes
        newData.game_mix = ''
        // If cabinet has an associated provider, sync provider automatically
        const selectedCabinet = cabinets.find(c => c.name === value)
        if (selectedCabinet && selectedCabinet.provider && selectedCabinet.provider !== newData.provider) {
          newData.provider = selectedCabinet.provider
        }
      }
      
      return newData
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-emerald-800 to-green-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Slot' : 'Adaugă Slot Nou'}
              </h2>
              <p className="text-emerald-100 text-sm font-medium">
                Completează informațiile despre slot
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
              {/* Numărul de serie */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Numărul de serie *
                </label>
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Serial number unic"
                  required
                />
              </div>

              {/* Locație */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Locație *
                </label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Selectează locația</option>
                  {locations?.map(location => (
                    <option key={location.id} value={location.name}>{location.name}</option>
                  ))}
                </select>
              </div>

              {/* Furnizor */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Furnizor *
                </label>
                <select
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Selectează furnizorul</option>
                  {providers?.map(provider => (
                    <option key={provider.id} value={provider.name}>{provider.name}</option>
                  ))}
                </select>
              </div>

              {/* Cabinet */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Cabinet
                </label>
                <select
                  name="cabinet"
                  value={formData.cabinet}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Selectează cabinetul</option>
                  {cabinets
                    .filter(cabinet => !formData.provider || cabinet.provider === formData.provider)
                    .map(cabinet => (
                      <option key={cabinet.id} value={cabinet.name}>{cabinet.name}</option>
                    ))}
                </select>
              </div>

              {/* Game Mix */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Game Mix
                </label>
                <select
                  name="game_mix"
                  value={formData.game_mix}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Selectează game mix-ul</option>
                  {gameMixes
                    .filter(gameMix => {
                      // Must match selected provider
                      if (formData.provider && gameMix.provider !== formData.provider) return false
                      // If a cabinet is selected and has platform/provider constraints, keep provider sync above
                      return true
                    })
                    .map(gameMix => (
                      <option key={gameMix.id} value={gameMix.name}>{gameMix.name}</option>
                    ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="Active">Activ</option>
                  <option value="Inactive">Inactiv</option>
                  <option value="Maintenance">Mentenanță</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Denomination */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Denomination
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="denomination"
                  value={formData.denomination}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="0.01"
                />
              </div>

              {/* Max Bet */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Max Bet
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="max_bet"
                  value={formData.max_bet}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Max bet"
                />
              </div>

              {/* RTP */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  RTP (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="rtp"
                  value={formData.rtp}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="RTP"
                />
              </div>

              {/* Gaming Places */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Gaming Places
                </label>
                <input
                  type="number"
                  name="gaming_places"
                  value={formData.gaming_places}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>

              {/* Manufacture Year (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  An Fabricat <span className="text-slate-400 text-xs">(opțional)</span>
                </label>
                <input
                  type="number"
                  name="manufacture_year"
                  value={formData.manufacture_year}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="ex: 2020"
                  min="1990"
                  max="2030"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Property Type */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">
                  Tip proprietate
                </label>
                <input
                  type="text"
                  value="Se actualizează automat din Facturi"
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Commission Date - Read Only */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Data comisionării
                </label>
                <input
                  type="text"
                  value={formData.commission_date || 'Auto din Comisii'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>

              {/* Invoice Number - Read Only */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Numărul facturii
                </label>
                <input
                  type="text"
                  value={formData.invoice_number || 'Se actualizează automat din Facturi'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>

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
                rows={2}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Note adiționale despre slot"
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
              <BarChart3 className="w-4 h-4" />
              <span>{item ? 'Actualizează' : 'Creează'} Slot</span>
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SlotModal