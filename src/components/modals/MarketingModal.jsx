import React, { useState, useEffect } from 'react'
import { X, TrendingUp, Calendar, MapPin, Award, DollarSign, Plus, Trash2, FileCheck, Image } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PDFViewer from '../PDFViewer'

const MarketingModal = ({ item, onClose, onSave }) => {
  const { locations } = useData()
  
  // Helper functions for default dates
  const getToday = () => {
    return new Date().toISOString().split('T')[0]
  }
  
  const getDefaultEndDate = () => {
    return '2025-12-31'
  }
  
  const getDefaultPrizeDate = () => {
    return '2025-12-31'
  }
  
  const [formData, setFormData] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    const defaultEndDate = '2025-12-31'
    const defaultPrizeDate = '2025-12-31'
    
    return {
      name: '',
      promotionType: '',
      description: '',
      start_date: today,
      end_date: defaultEndDate,
      location: '',
      locations: [{ location: '', start_date: today, end_date: defaultEndDate }], // Multiple locations with different dates
      prizes: [{ amount: '', currency: 'RON', date: defaultPrizeDate, winner: '' }],
      status: 'Active',
      notes: '',
      // New fields for file attachments
      attachments: [],
      bannerFile: null,
      bannerPreview: null,
      documentsFile: null,
      documentsPreview: null
    }
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
      
      // Parse locations from JSONB or old format
      let parsedLocations = [{ location: '', start_date: '', end_date: '' }]
      
      if (item.locations) {
        parsedLocations = typeof item.locations === 'string' 
          ? JSON.parse(item.locations) 
          : item.locations
      } else if (item.location) {
        // Old format: single location
        parsedLocations = [{
          location: item.location || '',
          start_date: item.start_date ? item.start_date.split('T')[0] : '',
          end_date: item.end_date ? item.end_date.split('T')[0] : ''
        }]
      }
      
      // Parse attachments
      let parsedAttachments = []
      if (item.attachments) {
        parsedAttachments = typeof item.attachments === 'string'
          ? JSON.parse(item.attachments)
          : item.attachments
      }
      
      setFormData({
        name: item.name || item.title || '',
        promotionType: item.promotion_type || '',
        description: item.description || '',
        start_date: item.start_date ? item.start_date.split('T')[0] : '',
        end_date: item.end_date ? item.end_date.split('T')[0] : '',
        location: item.location || '',
        locations: parsedLocations.length > 0 ? parsedLocations : [{ location: '', start_date: '', end_date: '' }],
        prizes: parsedPrizes.length > 0 ? parsedPrizes : [{ amount: '', currency: 'RON', date: '', winner: '' }],
        status: item.status || 'Active',
        notes: item.notes || '',
        // File attachments
        attachments: parsedAttachments || [],
        bannerFile: item.banner_url || null,
        bannerPreview: item.banner_url || null,
        documentsFile: item.documents_url || null,
        documentsPreview: item.documents_url || null
      })
    } else {
      // Reset form for new item with default dates
      const today = getToday()
      const defaultEndDate = getDefaultEndDate()
      const defaultPrizeDate = getDefaultPrizeDate()
      
      setFormData({
        name: '',
        promotionType: '',
        description: '',
        start_date: today,
        end_date: defaultEndDate,
        location: '',
        locations: [{ location: '', start_date: today, end_date: defaultEndDate }],
        prizes: [{ amount: '', currency: 'RON', date: defaultPrizeDate, winner: '' }],
        status: 'Active',
        notes: '',
        // Reset file attachments
        attachments: [],
        bannerFile: null,
        bannerPreview: null,
        documentsFile: null,
        documentsPreview: null
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

  const handleLocationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, i) => 
        i === index ? { ...loc, [field]: value } : loc
      )
    }))
  }

  const addLocation = () => {
    const today = getToday()
    const defaultEndDate = getDefaultEndDate()
    setFormData(prev => ({
      ...prev,
      locations: [...prev.locations, { location: '', start_date: today, end_date: defaultEndDate }]
    }))
  }

  const removeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
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
    const defaultPrizeDate = getDefaultPrizeDate()
    setFormData(prev => ({
      ...prev,
      prizes: [...prev.prizes, { amount: '', currency: 'RON', date: defaultPrizeDate, winner: '' }]
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

  // Handle file uploads
  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          bannerFile: file,
          bannerPreview: e.target.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleDocumentsChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          documentsFile: file,
          documentsPreview: e.target.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleDeleteBanner = () => {
    if (window.confirm('Sigur doriți să ștergeți banner-ul?')) {
      setFormData(prev => ({
        ...prev,
        bannerFile: null,
        bannerPreview: null
      }))
    }
  }
  
  const handleDeleteDocuments = () => {
    if (window.confirm('Sigur doriți să ștergeți documentele?')) {
      setFormData(prev => ({
        ...prev,
        documentsFile: null,
        documentsPreview: null
      }))
    }
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
    
    // Create FormData for file uploads
    const formDataToSubmit = new FormData()
    
    // Add banner file if exists
    if (formData.bannerFile && formData.bannerFile instanceof File) {
      formDataToSubmit.append('banner', formData.bannerFile)
    }
    
    // Add documents file if exists
    if (formData.documentsFile && formData.documentsFile instanceof File) {
      formDataToSubmit.append('documents', formData.documentsFile)
    }
    
    // Prepare data to save
    const dataToSave = {
      ...formData,
      promotion_type: formData.promotionType,
      prizes: sortedPrizes,
      banner_url: formData.bannerPreview,
      documents_url: formData.documentsPreview
    }
    
    onSave(dataToSave)
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
                Tip Promoție *
              </label>
              <select
                name="promotionType"
                value={formData.promotionType || ''}
                onChange={(e) => setFormData({ ...formData, promotionType: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">Selectează tipul</option>
                <option value="Tombola">Tombola</option>
                <option value="Turneu">Turneu</option>
                <option value="Happy Hour">Happy Hour</option>
              </select>
            </div>

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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Locații (Multiple săli cu date diferite) *
              </label>
              <div className="space-y-4">
                {formData.locations.map((loc, index) => (
                  <div key={index} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Sala {index + 1}
                      </h4>
                      {formData.locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLocation(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Locație
                        </label>
                        <select
                          value={loc.location}
                          onChange={(e) => handleLocationChange(index, 'location', e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 
                                   bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                   focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all text-sm"
                        >
                          <option value="">Selectează sala</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.name}>{location.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Data început
                        </label>
                        <input
                          type="date"
                          value={loc.start_date}
                          onChange={(e) => handleLocationChange(index, 'start_date', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 
                                   bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                   focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Data sfârșit
                        </label>
                        <input
                          type="date"
                          value={loc.end_date}
                          onChange={(e) => handleLocationChange(index, 'end_date', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 
                                   bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                   focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLocation}
                  className="w-full py-2 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 
                           rounded-lg text-slate-600 dark:text-slate-400 hover:border-blue-500 
                           hover:text-blue-500 transition-all flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă altă sală</span>
                </button>
              </div>
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
                        value={prize.amount || ''}
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
                        value={prize.currency || 'RON'}
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
                        value={prize.date || ''}
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

          {/* Banner Upload Section */}
          <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                <Image className="w-5 h-5 mr-2 text-blue-500" />
                Banner Promoție
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Imagine Banner (JPG, PNG)
                </label>
                <input
                  type="file"
                  name="bannerFile"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleBannerChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                            bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold 
                            file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              {formData.bannerPreview && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Image className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Banner încărcat
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Imagine Banner</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteBanner}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Șterge banner"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <img 
                      src={formData.bannerPreview} 
                      alt="Banner Preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents Upload Section */}
          <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                <FileCheck className="w-5 h-5 mr-2 text-blue-500" />
                Documente Promoție
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Document (PDF)
                </label>
                <input
                  type="file"
                  name="documentsFile"
                  accept=".pdf"
                  onChange={handleDocumentsChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                            bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold 
                            file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              {formData.documentsPreview && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Document încărcat
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">PDF Document</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteDocuments}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Șterge documentul"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* PDF Viewer */}
                  <PDFViewer 
                    pdfUrl={formData.documentsPreview}
                    title={`Document Promoție ${formData.name}`}
                    placeholder="Documentul nu este disponibil"
                    placeholderSubtext="Atașează documentul pentru vizualizare"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-slate-200 dark:border-slate-600 pt-6">
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