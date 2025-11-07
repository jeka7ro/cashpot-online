import React, { useState, useEffect } from 'react'
import { X, MapPin, Save, RefreshCw } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const ExpendituresMappingModal = ({ onClose, onSave }) => {
  const { locations } = useData()
  const [externalLocations, setExternalLocations] = useState([])
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load external locations
      const extLocsResponse = await axios.get('/api/expenditures/external-locations')
      setExternalLocations(extLocsResponse.data)
      
      // Load existing mappings
      const mappingsResponse = await axios.get('/api/expenditures/mapping')
      const existingMappings = {}
      mappingsResponse.data.forEach(m => {
        existingMappings[m.external_location_name] = m.local_location_id
      })
      
      // Initialize mappings
      const initialMappings = extLocsResponse.data.map(extLoc => ({
        external_location_name: extLoc.name,
        external_location_id: extLoc.id,
        external_address: extLoc.address,
        local_location_id: existingMappings[extLoc.name] || null
      }))
      
      setMappings(initialMappings)
    } catch (error) {
      console.error('Error loading mapping data:', error)
      toast.error('Eroare la încărcarea datelor de mapping')
    } finally {
      setLoading(false)
    }
  }
  
  const handleMappingChange = (externalName, localId) => {
    setMappings(prev => prev.map(m => 
      m.external_location_name === externalName
        ? { ...m, local_location_id: localId ? parseInt(localId) : null }
        : m
    ))
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      
      await axios.put('/api/expenditures/mapping', {
        mappings: mappings.map(m => ({
          external_location_name: m.external_location_name,
          local_location_id: m.local_location_id
        }))
      })
      
      toast.success('Mapping salvat cu succes!')
      onSave()
    } catch (error) {
      console.error('Error saving mapping:', error)
      toast.error('Eroare la salvarea mapping-ului')
    } finally {
      setSaving(false)
    }
  }
  
  // Auto-match by name similarity
  const handleAutoMatch = () => {
    const autoMappings = mappings.map(extMapping => {
      // Find local location with similar name
      const matchedLocal = locations.find(loc => 
        loc.name.toLowerCase().includes(extMapping.external_location_name.toLowerCase()) ||
        extMapping.external_location_name.toLowerCase().includes(loc.name.toLowerCase())
      )
      
      return {
        ...extMapping,
        local_location_id: matchedLocal ? matchedLocal.id : extMapping.local_location_id
      }
    })
    
    setMappings(autoMappings)
    toast.success('Auto-matching complet!')
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-4xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă datele...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Mapping Locații Cheltuieli</h2>
              <p className="text-blue-100 text-sm mt-1">Asociază locațiile externe cu cele CASHPOT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Auto-Match Button */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {mappings.filter(m => m.local_location_id).length} / {mappings.length} locații mapate
            </p>
            <button
              onClick={handleAutoMatch}
              className="btn-secondary flex items-center space-x-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Auto-Match (după nume)</span>
            </button>
          </div>
          
          {/* Mapping Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-1/3">
                    Locație Server Extern
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-1/3">
                    Adresă Externă
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-1/3">
                    Locație CASHPOT
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {mappings.map((mapping, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {mapping.external_location_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {mapping.external_address || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping.local_location_id || ''}
                        onChange={(e) => handleMappingChange(mapping.external_location_name, e.target.value)}
                        className="input-field text-sm w-full"
                      >
                        <option value="">-- Selectează Locație --</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/40 p-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Notă:</strong> Locațiile nemapate vor fi afișate separat în rapoarte
          </div>
          <div className="flex space-x-3">
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
              <span>{saving ? 'Salvare...' : 'Salvează Mapping'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpendituresMappingModal

