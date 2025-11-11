import React, { useState, useEffect } from 'react'
import { X, Save, Database, CheckCircle, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const PowerBIConfigModal = ({ isOpen, onClose, onConfigured }) => {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  
  const [formData, setFormData] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    workspaceId: '',
    datasetId: '',
    tableName: 'Expenditures'
  })

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/powerbi/config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.configured) {
        setFormData({
          tenantId: response.data.tenantId || '',
          clientId: response.data.clientId || '',
          clientSecret: '', // Never load secret
          workspaceId: response.data.workspaceId || '',
          datasetId: response.data.datasetId || '',
          tableName: response.data.tableName || 'Expenditures'
        })
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      // First save the config
      const token = localStorage.getItem('token')
      await axios.post('/api/powerbi/config', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Then test the connection
      const response = await axios.get('/api/powerbi/test', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setTestResult({
        success: true,
        message: 'Conexiune reușită!',
        details: response.data.workspace
      })
      toast.success('Conexiune reușită!')
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Conexiune eșuată',
        details: error.response?.data?.details || error.message
      })
      toast.error('Conexiune eșuată')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/powerbi/config', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Configurație salvată!')
      onConfigured && onConfigured()
      onClose()
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Eroare la salvarea configurației')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Configurare Power BI</h2>
                <p className="text-blue-100">Conectează-te la Power BI pentru a importa cheltuielile</p>
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

        {/* Help Section */}
        {showHelp && (
          <div className="bg-blue-50 border-b border-blue-200 p-6">
            <div className="space-y-4">
              <h3 className="font-bold text-blue-900 flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span>Cum obțin aceste informații?</span>
              </h3>
              
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <strong>1. Azure AD App Registration:</strong>
                  <p className="ml-4 mt-1">• Accesează <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline">Azure Portal</a></p>
                  <p className="ml-4">• Mergi la "Azure Active Directory" → "App registrations" → "New registration"</p>
                  <p className="ml-4">• Copiază <strong>Application (client) ID</strong> și <strong>Directory (tenant) ID</strong></p>
                  <p className="ml-4">• În "Certificates & secrets", creează un "New client secret" și copiază valoarea</p>
                </div>
                
                <div>
                  <strong>2. Power BI API Permissions:</strong>
                  <p className="ml-4 mt-1">• În App registration, mergi la "API permissions"</p>
                  <p className="ml-4">• Adaugă "Power BI Service" → "Dataset.Read.All"</p>
                  <p className="ml-4">• Grant admin consent</p>
                </div>
                
                <div>
                  <strong>3. Workspace & Dataset ID:</strong>
                  <p className="ml-4 mt-1">• Deschide <a href="https://app.powerbi.com" target="_blank" rel="noopener noreferrer" className="underline">Power BI Service</a></p>
                  <p className="ml-4">• Mergi la workspace-ul tău</p>
                  <p className="ml-4">• ID-urile se găsesc în URL: powerbi.com/groups/<strong>WORKSPACE_ID</strong>/datasets/<strong>DATASET_ID</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Completează datele de autentificare pentru Power BI API
            </p>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm">{showHelp ? 'Ascunde ajutor' : 'Ajutor'}</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Azure AD Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Azure AD Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant ID *
                  </label>
                  <input
                    type="text"
                    name="tenantId"
                    value={formData.tenantId}
                    onChange={handleChange}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID (Application ID) *
                  </label>
                  <input
                    type="text"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleChange}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret *
                </label>
                <input
                  type="password"
                  name="clientSecret"
                  value={formData.clientSecret}
                  onChange={handleChange}
                  placeholder="Secretul aplicației Azure AD"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!formData.clientSecret}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lăsați gol pentru a păstra secretul existent
                </p>
              </div>
            </div>

            {/* Power BI Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Power BI Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace ID *
                  </label>
                  <input
                    type="text"
                    name="workspaceId"
                    value={formData.workspaceId}
                    onChange={handleChange}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dataset ID *
                  </label>
                  <input
                    type="text"
                    name="datasetId"
                    value={formData.datasetId}
                    onChange={handleChange}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Name
                </label>
                <input
                  type="text"
                  name="tableName"
                  value={formData.tableName}
                  onChange={handleChange}
                  placeholder="Expenditures"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Numele tabelului din Power BI care conține cheltuielile
                </p>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start space-x-3">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.message}
                    </p>
                    {testResult.details && (
                      <pre className="text-xs mt-2 overflow-auto max-h-32">
                        {typeof testResult.details === 'string' ? testResult.details : JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !formData.tenantId || !formData.clientId || !formData.workspaceId}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                <span>Testează Conexiunea</span>
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Se salvează...' : 'Salvează'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PowerBIConfigModal

