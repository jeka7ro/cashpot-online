import React from 'react'
import { X, TrendingUp, Calendar, MapPin, Award, DollarSign, User, Clock, Trophy, Gift, FileCheck, Image } from 'lucide-react'
import PDFViewer from '../PDFViewer'

const MarketingDetailModal = ({ item, onClose }) => {
  if (!item) return null

  // Parse prizes from JSONB
  let prizes = []
  if (item.prizes) {
    prizes = typeof item.prizes === 'string' ? JSON.parse(item.prizes) : item.prizes
  } else if (item.prize_amount) {
    // Old format fallback
    prizes = [{
      amount: item.prize_amount,
      currency: item.prize_currency || 'RON',
      date: item.prize_date,
      winner: item.winner
    }]
  }
  
  // Parse attachments
  let attachments = []
  if (item.attachments) {
    attachments = typeof item.attachments === 'string' ? JSON.parse(item.attachments) : item.attachments
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

  const daysRemaining = getDaysRemaining(item.end_date)
  const duration = item.start_date && item.end_date 
    ? Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / (1000 * 60 * 60 * 24))
    : 0

  // Calculate total prize pool
  const totalPrizePool = prizes.reduce((sum, prize) => sum + (parseFloat(prize.amount) || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{item.name}</h2>
                <p className="text-pink-100">Detalii Promoție & Premii</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
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
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Calendar className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Perioada Desfășurare</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {new Date(item.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 my-2">până la</p>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {new Date(item.end_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Locație */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <MapPin className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Locație</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.location || 'N/A'}
              </p>
            </div>
          </div>

          {/* Prizes Section - EXPANDED */}
          {prizes.length > 0 && (
            <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
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
                      className={`p-6 rounded-xl border-2 ${
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
                        {/* Prize Info */}
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
                              {/* Amount */}
                              <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">SUMĂ PREMIU</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                  {parseFloat(prize.amount || 0).toLocaleString('ro-RO')} {prize.currency || 'RON'}
                                </p>
                              </div>

                              {/* Date */}
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

                              {/* Winner */}
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
          {item.description && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Descriere Promoție</h3>
              <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {/* Banner Section - if exists */}
          {item.banner_url && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center space-x-2 mb-4">
                <Image className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Banner Promoție</h3>
              </div>
              <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                <img 
                  src={item.banner_url} 
                  alt={`Banner pentru ${item.name || item.title}`} 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Documents Section - if exists */}
          {item.documents_url && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-4">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Document Promoție</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <PDFViewer 
                  pdfUrl={item.documents_url}
                  title={`Document Promoție ${item.name || item.title}`}
                  placeholder="Documentul nu este disponibil"
                  placeholderSubtext="Nu există document atașat pentru această promoție"
                />
              </div>
            </div>
          )}

          {/* Creat De / Data */}
          {(item.created_by || item.created_at) && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Informații Creare</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Creat de:</p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.created_by || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Data creării:</p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO', {
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

          {/* Notes */}
          {item.notes && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Notițe Suplimentare</h3>
              <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  )
}

export default MarketingDetailModal
