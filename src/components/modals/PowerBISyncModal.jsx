import React, { useState, useEffect } from 'react'
import { X, Download, RefreshCw, Database, Calendar, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const PowerBISyncModal = ({ isOpen, onClose, onSyncComplete }) => {
  const [loading, setLoading] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [tables, setTables] = useState([])
  const [syncResult, setSyncResult] = useState(null)
  const [formData, setFormData] = useState({
    datasetId: '',
    tableName: '',
    startDate: '',
    endDate: '',
    merge: true
  })

  useEffect(() => {
    if (isOpen) {
      loadConfig()
      loadDatasets()
    }
  }, [isOpen])

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/powerbi/config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.configured) {
        setFormData(prev => ({
          ...prev,
          datasetId: response.data.datasetId || '',
          tableName: response.data.tableName || 'Expenditures'
        }))
        
        // Load tables for this dataset
        if (response.data.datasetId) {
          loadTables(response.data.datasetId)
        }
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const loadDatasets = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/powerbi/datasets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setDatasets(response.data.datasets || [])
      }
    } catch (error) {
      console.error('Error loading datasets:', error)
      toast.error('Nu s-au putut încărca dataset-urile')
    }
  }

  const loadTables = async (datasetId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/powerbi/tables?datasetId=${datasetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setTables(response.data.tables || [])
      }
    } catch (error) {
      console.error('Error loading tables:', error)
    }
  }

  const handleDatasetChange = (datasetId) => {
    setFormData(prev => ({ ...prev, datasetId, tableName: '' }))
    setTables([])
    if (datasetId) {
      loadTables(datasetId)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    setSyncResult(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/powerbi/sync', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setSyncResult({
          success: true,
          message: response.data.message,
          count: response.data.count,
          preview: response.data.preview
        })
        toast.success(`Sincronizare reușită! ${response.data.count} înregistrări`)
        onSyncComplete && onSyncComplete(response.data)
      }
    } catch (error) {
      console.error('Error syncing:', error)
      setSyncResult({
        success: false,
        message: 'Sincronizare eșuată',
        details: error.response?.data?.details || error.message
      })
      toast.error('Eroare la sincronizare')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams(formData)
      const response = await axios.get(`/api/powerbi/expenditures?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setSyncResult({
          success: true,
          message: `Găsite ${response.data.count} înregistrări`,
          preview: response.data.data.slice(0, 5)
        })
      }
    } catch (error) {
      console.error('Error previewing:', error)
      toast.error('Eroare la previzualizare')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Sincronizare Power BI</h2>
                <p className="text-green-100">Importă datele din Power BI în aplicație</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Dataset & Table Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Sursa datelor
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Database className="w-4 h-4 inline mr-2" />
                    Dataset
                  </label>
                  <select
                    value={formData.datasetId}
                    onChange={(e) => handleDatasetChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Selectează dataset-ul</option>
                    {datasets.map(dataset => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                    Tabel
                  </label>
                  <select
                    value={formData.tableName}
                    onChange={(e) => setFormData(prev => ({ ...prev, tableName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!formData.datasetId || tables.length === 0}
                  >
                    <option value="">Selectează tabelul</option>
                    {tables.map(table => (
                      <option key={table.name} value={table.name}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                <Calendar className="w-5 h-5 inline mr-2" />
                Perioada
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data început
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data sfârșit
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Lasă gol pentru a importa toate datele disponibile
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Opțiuni
              </h3>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="merge"
                  checked={formData.merge}
                  onChange={(e) => setFormData(prev => ({ ...prev, merge: e.target.checked }))}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="merge" className="text-sm text-gray-700">
                  Combină cu datele existente (nu șterge datele locale)
                </label>
              </div>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div className={`p-4 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start space-x-3">
                  {syncResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {syncResult.message}
                    </p>
                    
                    {syncResult.count !== undefined && (
                      <p className="text-sm text-green-700 mt-1">
                        {syncResult.count} înregistrări găsite
                      </p>
                    )}
                    
                    {syncResult.preview && syncResult.preview.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-green-800 mb-2">Previzualizare date:</p>
                        <div className="bg-white rounded-lg p-3 max-h-48 overflow-auto">
                          <pre className="text-xs">
                            {JSON.stringify(syncResult.preview, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {syncResult.details && (
                      <pre className="text-xs mt-2 overflow-auto max-h-32">
                        {typeof syncResult.details === 'string' ? syncResult.details : JSON.stringify(syncResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Închide
            </button>
            
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading || !formData.datasetId || !formData.tableName}
              className="btn-secondary flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Previzualizare</span>
            </button>
            
            <button
              type="button"
              onClick={handleSync}
              disabled={loading || !formData.datasetId || !formData.tableName}
              className="btn-primary flex items-center space-x-2"
            >
              <Download className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'Se sincronizează...' : 'Sincronizează'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PowerBISyncModal

