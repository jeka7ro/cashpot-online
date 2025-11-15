import React, { useState, useEffect } from 'react'
import { X, Save, Wrench } from 'lucide-react'
import { useData } from '../../contexts/DataContext'

const SoftwareModal = ({ item, onClose, onSave }) => {
  const { providers, cabinets, gameMixes, approvals } = useData()
  
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    cabinet: '',
    game_mix: '',
    approval: '',
    version: '',
    notes: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        provider: item.provider || '',
        cabinet: item.cabinet || '',
        game_mix: item.game_mix || '',
        approval: item.approval || '',
        version: item.version || '',
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
        newData.cabinet = ''
        newData.game_mix = ''
      } else if (name === 'cabinet') {
        newData.game_mix = ''
      }
      
      return newData
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-violet-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {item ? 'Editează Software' : 'Adaugă Software'}
                </h2>
                <p className="text-purple-100">
                  {item ? 'Modifică datele software-ului' : 'Adaugă un software nou'}
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
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Introdu numele software-ului"
                required
              />
            </div>

            {/* Versiunea */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Versiunea
              </label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="ex: v1.0.0"
              />
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
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Selectează furnizorul</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cabinet */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Cabinet *
              </label>
              <select
                name="cabinet"
                value={formData.cabinet}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Selectează cabinetul</option>
                {cabinets
                  .filter(cabinet => !formData.provider || cabinet.provider === formData.provider)
                  .map(cabinet => (
                    <option key={cabinet.id} value={cabinet.name}>
                      {cabinet.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Game Mix */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">
                Game Mix *
              </label>
              <select
                name="game_mix"
                value={formData.game_mix}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Selectează game mix-ul</option>
                {gameMixes
                  .filter(gameMix => {
                    if (formData.provider && gameMix.provider !== formData.provider) return false
                    return true
                  })
                  .map(gameMix => (
                    <option key={gameMix.id} value={gameMix.name}>
                      {gameMix.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Aprobare de Tip */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">
                Aprobare de Tip
              </label>
              <select
                name="approval"
                value={formData.approval}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Selectează aprobarea</option>
                {approvals
                  .filter(approval => {
                    if (formData.provider && approval.provider !== formData.provider) return false
                    if (formData.cabinet && approval.cabinet !== formData.cabinet) return false
                    return true
                  })
                  .map(approval => (
                    <option key={approval.id} value={approval.name}>
                      {approval.name}
                    </option>
                  ))}
              </select>
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
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all shadow-lg hover:shadow-purple-500/25"
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

export default SoftwareModal













