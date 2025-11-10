import React, { useState, useEffect } from 'react'
import { X, Save, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const ChartsSettingsModal = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    // Grafice existente
    evolutionChart: true,
    departmentsChart: true,
    locationsChart: true,
    
    // Grafice noi
    monthComparison: true,
    heatmap: true,
    pieTop10: true,
    stackedArea: true,
    trendPrediction: true
  })
  
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])
  
  const loadSettings = async () => {
    try {
      const response = await axios.get('/api/user-preferences/charts')
      if (response.data && response.data.settings) {
        setSettings({ ...settings, ...response.data.settings })
      }
    } catch (error) {
      console.log('No saved chart preferences, using defaults')
    }
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      await axios.put('/api/user-preferences/charts', { settings })
      toast.success('Preferințe grafice salvate!')
      onSave(settings)
      onClose()
    } catch (error) {
      console.error('Error saving chart preferences:', error)
      toast.error('Eroare la salvarea preferințelor')
    } finally {
      setSaving(false)
    }
  }
  
  const toggleChart = (chartKey) => {
    setSettings(prev => ({
      ...prev,
      [chartKey]: !prev[chartKey]
    }))
  }
  
  const charts = [
    { key: 'evolutionChart', label: 'Evoluție Cheltuieli (Line)', description: 'Trend temporal cheltuieli' },
    { key: 'departmentsChart', label: 'Top Departamente (Bar)', description: 'Comparație departamente' },
    { key: 'locationsChart', label: 'Distribuție Locații (Pie)', description: 'Distribuție geografică' },
    { key: 'monthComparison', label: 'Comparație Luni (Bar)', description: 'Luna curentă vs precedentă', isNew: true },
    { key: 'heatmap', label: 'Heatmap Categorii x Locații', description: 'Matrix cu culori', isNew: true },
    { key: 'pieTop10', label: 'Top 10 Categorii (Pie)', description: 'Detaliere categorii', isNew: true },
    { key: 'stackedArea', label: 'Evoluție Departamente (Stacked)', description: 'Contribuție în timp', isNew: true },
    { key: 'trendPrediction', label: 'Predicție Trend (AI)', description: 'Forecast 3 luni', isNew: true }
  ]
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Setări Grafice</h2>
              <p className="text-sm text-blue-100 mt-1">Selectează ce grafice să fie afișate pe pagina Cheltuieli</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-3">
          {charts.map(chart => (
            <div 
              key={chart.key}
              className={`p-4 rounded-xl border-2 transition-all ${
                settings[chart.key]
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
              }`}
            >
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {chart.label}
                    </span>
                    {chart.isNew && (
                      <span className="px-2 py-0.5 bg-pink-500 text-white text-xs font-bold rounded-full">
                        NOU!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{chart.description}</p>
                </div>
                <div className="flex items-center space-x-3">
                  {settings[chart.key] ? (
                    <Eye className="w-5 h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  )}
                  <input
                    type="checkbox"
                    checked={settings[chart.key]}
                    onChange={() => toggleChart(chart.key)}
                    className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                  />
                </div>
              </label>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-900 p-6 rounded-b-2xl border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvare...' : 'Salvează Preferințe'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChartsSettingsModal

