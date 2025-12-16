import React, { useState, useEffect } from 'react'
import { X, Download, AlertCircle, CheckCircle } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const ImportProductsModal = ({ isOpen, onClose, onImportComplete }) => {
  const [selectedCity, setSelectedCity] = useState('')
  const [availableProducts, setAvailableProducts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  
  // Cities list - can be made dynamic
  const cities = [
    'Pitești',
    'Craiova',
    'Ploiești (centru)',
    'Ploiești (nord)',
    'Vâlcea',
    'București'
  ]
  
  // Fetch available products count from API
  useEffect(() => {
    if (isOpen) {
      fetchAvailableProducts()
    }
  }, [isOpen])
  
  const fetchAvailableProducts = async () => {
    try {
      setLoading(true)
      // TODO: Replace with your actual API endpoint
      // const response = await axios.get('/api/gourmand/products/count')
      // setAvailableProducts(response.data.count || 0)
      
      // For now, using a placeholder
      setAvailableProducts(1040)
    } catch (error) {
      console.error('Error fetching products count:', error)
      toast.error('Eroare la preluarea numărului de produse')
    } finally {
      setLoading(false)
    }
  }
  
  const handleImport = async () => {
    if (importing) return
    
    try {
      setImporting(true)
      
      // TODO: Replace with your actual API endpoint to fetch products
      // const productsResponse = await axios.get('/api/gourmand/products', {
      //   params: { city: selectedCity || null }
      // })
      // const products = productsResponse.data
      
      // For now, using placeholder - replace with actual API call
      const products = [] // This should come from your API
      
      if (products.length === 0) {
        toast.error('Nu există produse disponibile pentru import')
        return
      }
      
      // Import products
      const importResponse = await axios.post('/api/warehouse/import-products', {
        products: products,
        city: selectedCity || null, // City is optional
        supplier: 'General'
      })
      
      if (importResponse.data.success) {
        toast.success(`✅ ${importResponse.data.imported} produse importate cu succes!`)
        if (onImportComplete) {
          onImportComplete(importResponse.data)
        }
        onClose()
      } else {
        toast.error(`Eroare: ${importResponse.data.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error(`Eroare la import: ${error.response?.data?.error || error.message}`)
    } finally {
      setImporting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Importă Produse din API
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          {/* City Selection - OPTIONAL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Selectează Oraș <span className="text-slate-400 text-xs">(opțional)</span>
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selectează oraș...</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          
          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              <strong>Produsele vor fi importate în furnizorul "General"</strong>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {loading ? (
                'Se încarcă...'
              ) : (
                <>
                  <strong>Produse disponibile: {availableProducts}</strong>
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Un furnizor "General" va fi creat automat (dacă nu există deja) și toate produsele vor fi importate acolo.
              {selectedCity && ` Produsele vor fi asociate cu orașul "${selectedCity}".`}
              {!selectedCity && ' Produsele pot fi editate ulterior pentru a le atribui orașul corect.'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              <strong>După import, poți edita fiecare produs în pagina "Depozit" pentru a-i atribui furnizorul și orașul corect, precum și prețurile.</strong>
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleImport}
            disabled={importing || loading || availableProducts === 0}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Se importă...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Importă {availableProducts} Produse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportProductsModal




