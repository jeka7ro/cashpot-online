import React, { useState } from 'react'
import { X, Upload, Link as LinkIcon, Search, Image as ImageIcon } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const BrandLogoModal = ({ brand, onClose, onSave }) => {
  const [logoMethod, setLogoMethod] = useState('url') // 'url', 'upload', 'search'
  const [logoUrl, setLogoUrl] = useState(brand?.brand_logo || '')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(brand?.brand_logo || '')
  const [searchQuery, setSearchQuery] = useState(brand?.brand_name || '')
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUrlChange = (e) => {
    const url = e.target.value
    setLogoUrl(url)
    setLogoPreview(url)
  }

  const handleAutoSearch = async () => {
    setSearching(true)
    try {
      // Search for brand logo using Clearbit Logo API (free, no auth needed)
      // Example: https://logo.clearbit.com/maxbet.ro
      const domain = `${searchQuery.toLowerCase().replace(/\s+/g, '')}.ro`
      const clearbitUrl = `https://logo.clearbit.com/${domain}`
      
      // Try to load the image to check if it exists
      const img = new Image()
      img.onload = () => {
        setLogoUrl(clearbitUrl)
        setLogoPreview(clearbitUrl)
        toast.success('Logo găsit automat!')
      }
      img.onerror = () => {
        // If Clearbit fails, try Wikipedia/Google Images fallback
        const wikipediaUrl = `https://logo.clearbit.com/${domain.replace('.ro', '.com')}`
        const img2 = new Image()
        img2.onload = () => {
          setLogoUrl(wikipediaUrl)
          setLogoPreview(wikipediaUrl)
          toast.success('Logo găsit automat!')
        }
        img2.onerror = () => {
          toast.error('Nu s-a găsit logo automat. Încarcă manual sau adaugă URL.')
        }
        img2.src = wikipediaUrl
      }
      img.src = clearbitUrl
    } catch (error) {
      console.error('Auto search error:', error)
      toast.error('Eroare la căutarea automată!')
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async () => {
    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('brand_name', brand.brand_name)
      formData.append('company_name', brand.company_name || '')
      formData.append('description', brand.description || '')
      formData.append('website_url', brand.website_url || '')

      if (logoMethod === 'upload' && logoFile) {
        formData.append('logo', logoFile)
        formData.append('logo_source', 'upload')
      } else if (logoMethod === 'url' && logoUrl) {
        formData.append('logo_url', logoUrl)
        formData.append('logo_source', 'url')
      } else if (logoMethod === 'search' && logoUrl) {
        formData.append('logo_url', logoUrl)
        formData.append('logo_source', 'auto-search')
      }

      const response = await axios.post('/api/brands', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success) {
        toast.success('Logo actualizat cu succes!')
        onSave()
      }
    } catch (error) {
      console.error('Error saving logo:', error)
      toast.error('Eroare la salvarea logo-ului!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Logo Brand: {brand.brand_name}
                </h2>
                <p className="text-indigo-100 text-sm">{brand.company_name}</p>
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

        <div className="p-6 space-y-6">
          {/* Logo Method Tabs */}
          <div className="flex space-x-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setLogoMethod('url')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                logoMethod === 'url'
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>URL Link</span>
            </button>
            <button
              onClick={() => setLogoMethod('upload')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                logoMethod === 'upload'
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Încarcă Fișier</span>
            </button>
            <button
              onClick={() => setLogoMethod('search')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                logoMethod === 'search'
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Căutare Automată</span>
            </button>
          </div>

          {/* Logo Preview */}
          {logoPreview && (
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Previzualizare Logo:</p>
              <img
                src={logoPreview}
                alt="Logo preview"
                className="max-h-32 mx-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  toast.error('Eroare la încărcarea imaginii!')
                }}
              />
            </div>
          )}

          {/* URL Method */}
          {logoMethod === 'url' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                URL Logo (ex: https://exemple.com/logo.png)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={handleUrlChange}
                placeholder="https://exemple.com/logo.png"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Copiază URL-ul direct al imaginii logo-ului
              </p>
            </div>
          )}

          {/* Upload Method */}
          {logoMethod === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Încarcă Logo (PNG, JPG, SVG, max 5MB)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all
                         file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                         file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Logo-ul va fi încărcat pe AWS S3 și va fi accesibil public
              </p>
            </div>
          )}

          {/* Auto Search Method */}
          {logoMethod === 'search' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Caută Logo Automat
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Numele brandului (ex: MAX BET, ADMIRAL)"
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
                <button
                  onClick={handleAutoSearch}
                  disabled={searching || !searchQuery}
                  className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium
                           flex items-center space-x-2"
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Caută</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Utilizează Clearbit Logo API pentru căutare automată
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t-2 border-slate-200 dark:border-slate-600">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 
                       text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 
                       transition-all font-medium"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={uploading || (!logoUrl && !logoFile)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl 
                       hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Se încarcă...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Salvează Logo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandLogoModal

