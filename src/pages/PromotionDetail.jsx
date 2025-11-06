import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Calendar, MapPin, Award, DollarSign, Settings, FileText, Upload, Download, Image, FileImage, Trophy, Gift, Clock, User, Building2 } from 'lucide-react'
import Layout from '../components/Layout'
import PDFViewer from '../components/PDFViewer'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import axios from 'axios'

const PromotionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { promotions, locations, loading } = useData()
  const [showSettings, setShowSettings] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [promotion, setPromotion] = useState(null)

  useEffect(() => {
    const foundPromotion = promotions?.find(p => p.id === parseInt(id))
    if (foundPromotion) {
      setPromotion(foundPromotion)
    }
  }, [id, promotions])

  useEffect(() => {
    // localStorage REMOVED - using server only
    const savedShowAttachments = false
    if (savedShowAttachments !== null) {
      setShowAttachments(JSON.parse(savedShowAttachments))
    }
  }, [])

  const saveAttachmentSettings = (value) => {
    setShowAttachments(value)
    // localStorage REMOVED - using server only
  }

  // Loading state check
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă detaliile promoției...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!promotion) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Award className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Promoția nu a fost găsită</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Promoția pe care o căutați nu există în sistem.</p>
            <button
              onClick={() => navigate('/marketing')}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Marketing</span>
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // Parse prizes from JSONB
  let prizes = []
  if (promotion.prizes) {
    prizes = typeof promotion.prizes === 'string' ? JSON.parse(promotion.prizes) : promotion.prizes
  } else if (promotion.prize_amount) {
    // Old format fallback
    prizes = [{
      amount: promotion.prize_amount,
      currency: promotion.prize_currency || 'RON',
      date: promotion.prize_date,
      winner: promotion.winner
    }]
  }

  // Parse locations from JSONB
  let parsedLocations = []
  if (promotion.locations) {
    parsedLocations = typeof promotion.locations === 'string' ? JSON.parse(promotion.locations) : promotion.locations
  } else if (promotion.location) {
    // Old format fallback
    parsedLocations = [{
      location: promotion.location,
      start_date: promotion.start_date,
      end_date: promotion.end_date
    }]
  }

  // Calculate days remaining
  const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysUntilPrize = (prizeDate) => {
    if (!prizeDate) return null
    const today = new Date()
    const prize = new Date(prizeDate)
    const diffTime = prize - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysRemaining(promotion.end_date)
  const duration = promotion.start_date && promotion.end_date 
    ? Math.ceil((new Date(promotion.end_date) - new Date(promotion.start_date)) / (1000 * 60 * 60 * 24))
    : 0

  // Calculate total prize pool
  const totalPrizePool = prizes.reduce((sum, prize) => sum + (parseFloat(prize.amount) || 0), 0)

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId || loc.name === locationId)
    return location ? location.name : locationId
  }

  const handleFileUpload = async (file, type) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('promotion_id', promotion.id)

      const response = await axios.post('/api/upload/promotion', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        toast.success(`${type === 'banner' ? 'Banner' : 'Regulament'} încărcat cu succes!`)
        // Refresh promotion data
        const updatedPromotion = { ...promotion }
        if (type === 'banner') {
          updatedPromotion.banner_path = response.data.file_path
        } else {
          updatedPromotion.regulation_path = response.data.file_path
        }
        setPromotion(updatedPromotion)
      } else {
        toast.error('Eroare la încărcarea fișierului')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Eroare la încărcarea fișierului')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Sigur vrei să ștergi această promoție?')) {
      try {
        await axios.delete(`/api/promotions/${promotion.id}`)
        toast.success('Promoție ștearsă cu succes!')
        navigate('/marketing')
      } catch (error) {
        console.error('Delete error:', error)
        toast.error('Eroare la ștergerea promoției')
      }
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header compact */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6">
            <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/marketing')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {promotion.name}
                    </h1>
                    <p className="text-pink-100">Promoție & Premii</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Setări"
                  >
                    <Settings className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => navigate(`/marketing/${promotion.id}/edit`)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Editează"
                  >
                    <Edit className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Șterge"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Setări Afișare</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">Afișare automată atașamente</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Afișează automat PDF-urile în pagina de detalii</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAttachments}
                        onChange={(e) => saveAttachmentSettings(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="btn-primary"
                  >
                    Închide
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status & Days Remaining - Prominent Card */}
              {daysRemaining !== null && (
                <div className={`p-6 rounded-xl border-2 ${
                  daysRemaining > 7 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700'
                    : daysRemaining > 0
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700'
                    : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-300 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Clock className={`w-12 h-12 ${
                        daysRemaining > 7 ? 'text-green-500' : daysRemaining > 0 ? 'text-yellow-500' : 'text-gray-500'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">ZILE RĂMASE</p>
                        <p className={`text-4xl font-bold ${
                          daysRemaining > 7 ? 'text-green-600 dark:text-green-400' 
                          : daysRemaining > 0 ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {daysRemaining > 0 ? daysRemaining : 'EXPIRAT'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Durată totală</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{duration} zile</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Perioada */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <Calendar className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">Perioada Desfășurare</h3>
                  </div>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">
                    {new Date(promotion.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 my-2">până la</p>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">
                    {new Date(promotion.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Locații */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <MapPin className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">Locații ({parsedLocations.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {parsedLocations.map((loc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {getLocationName(loc.location)}
                        </span>
                        {loc.start_date && loc.end_date && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(loc.start_date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })} - {new Date(loc.end_date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prizes Section */}
              {prizes.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                      <Gift className="w-6 h-6 mr-3 text-pink-600 dark:text-pink-400" />
                      Premii ({prizes.length})
                    </h3>
                    {prizes.length > 1 && (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 rounded-xl text-white shadow-lg">
                        <p className="text-sm font-semibold">TOTAL FOND PREMII</p>
                        <p className="text-2xl font-bold">
                          {totalPrizePool.toLocaleString('ro-RO')} {prizes[0]?.currency || 'RON'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {prizes.map((prize, index) => {
                      const prizeDate = prize.date
                      const daysUntil = getDaysUntilPrize(prizeDate)
                      const isPast = daysUntil !== null && daysUntil < 0
                      const isToday = daysUntil === 0
                      const isSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 7

                      return (
                        <div 
                          key={index}
                          className={`p-4 rounded-xl border-2 ${
                            isPast 
                              ? 'bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-800/20 border-gray-300 dark:border-gray-700'
                              : isToday
                              ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-400 dark:border-red-700 shadow-xl'
                              : isSoon
                              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-400 dark:border-yellow-700'
                              : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className={`p-3 rounded-xl ${
                                isPast ? 'bg-gray-200 dark:bg-gray-700' 
                                : isToday ? 'bg-red-200 dark:bg-red-800' 
                                : isSoon ? 'bg-yellow-200 dark:bg-yellow-800' 
                                : 'bg-green-200 dark:bg-green-800'
                              }`}>
                                <Award className={`w-6 h-6 ${
                                  isPast ? 'text-gray-600 dark:text-gray-300' 
                                  : isToday ? 'text-red-600 dark:text-red-300' 
                                  : isSoon ? 'text-yellow-600 dark:text-yellow-300' 
                                  : 'text-green-600 dark:text-green-300'
                                }`} />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Premiu #{index + 1}
                                  </h4>
                                  {isToday && (
                                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                      ASTĂZI!
                                    </span>
                                  )}
                                  {isSoon && !isToday && (
                                    <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                                      {daysUntil} ZILE
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">SUMĂ PREMIU</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                      {parseFloat(prize.amount || 0).toLocaleString('ro-RO')} {prize.currency || 'RON'}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">DATA ACORDARE</p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                                      {prizeDate ? new Date(prizeDate).toLocaleDateString('ro-RO', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                      }) : 'N/A'}
                                    </p>
                                    {daysUntil !== null && daysUntil > 0 && !isToday && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        (peste {daysUntil} {daysUntil === 1 ? 'zi' : 'zile'})
                                      </p>
                                    )}
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">CÂȘTIGĂTOR</p>
                                    {prize.winner ? (
                                      <div className="flex items-center space-x-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                                          {prize.winner}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-base text-slate-500 dark:text-slate-400 italic">
                                        {isPast ? 'Neacordat' : 'În așteptare'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              {promotion.description && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Descriere Promoție</h3>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                    {promotion.description}
                  </p>
                </div>
              )}

              {/* Notes */}
              {promotion.notes && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Notițe Suplimentare</h3>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                    {promotion.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Banner Promoție */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                    <Image className="w-5 h-5 mr-2 text-pink-600 dark:text-pink-400" />
                    Banner Promoție
                  </h3>
                  <label className="btn-secondary cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {promotion.banner_path ? 'Schimbă' : 'Încarcă'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'banner')}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                {promotion.banner_path ? (
                  <div className="space-y-3">
                    <img
                      src={`/uploads/promotions/${promotion.banner_path}`}
                      alt="Banner promoție"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                    />
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Banner activ</span>
                      <button
                        onClick={() => window.open(`/uploads/promotions/${promotion.banner_path}`, '_blank')}
                        className="flex items-center space-x-1 hover:text-pink-600 dark:hover:text-pink-400"
                      >
                        <Download className="w-4 h-4" />
                        <span>Deschide</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <FileImage className="w-12 h-12 mx-auto mb-2" />
                    <p>Nu există banner</p>
                  </div>
                )}
              </div>

              {/* Regulament Promoție */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-pink-600 dark:text-pink-400" />
                    Regulament
                  </h3>
                  <label className="btn-secondary cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {promotion.regulation_path ? 'Schimbă' : 'Încarcă'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'regulation')}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                {promotion.regulation_path ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {promotion.regulation_path}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Regulament activ</span>
                      <button
                        onClick={() => window.open(`/uploads/promotions/${promotion.regulation_path}`, '_blank')}
                        className="flex items-center space-x-1 hover:text-pink-600 dark:hover:text-pink-400"
                      >
                        <Download className="w-4 h-4" />
                        <span>Deschide</span>
                      </button>
                    </div>
                    {showAttachments && promotion.regulation_path && (
                      <div className="mt-4">
                        <MultiPDFViewer 
                          files={[
                            {
                              name: `Regulament ${promotion.name}`,
                              type: 'Regulament Promoție',
                              file_path: `/uploads/promotions/${promotion.regulation_path}`,
                              url: `/uploads/promotions/${promotion.regulation_path}`,
                              id: 'regulation'
                            },
                            ...(promotion.attachments || []).map(att => ({
                              ...att,
                              file_path: att.file_path || att.url,
                              url: att.url || att.file_path
                            }))
                          ]}
                          title="Documente Promoție"
                          placeholder="Nu există regulament"
                          placeholderSubtext="Adaugă regulament pentru vizualizare"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>Nu există regulament</p>
                  </div>
                )}
              </div>

              {/* Creat De / Data */}
              {(promotion.created_by || promotion.created_at) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Informații Creare</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Creat de:</p>
                      <p className="text-base font-medium text-slate-900 dark:text-white flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {promotion.created_by || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Data creării:</p>
                      <p className="text-base font-medium text-slate-900 dark:text-white flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {promotion.created_at ? new Date(promotion.created_at).toLocaleDateString('ro-RO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PromotionDetail
