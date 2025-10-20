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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header - Similar to Metrology CVT */}
        <div className="bg-gradient-to-r from-slate-800 via-cyan-800 to-teal-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-teal-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item.name || item.title}
              </h2>
              <p className="text-cyan-100 text-sm font-medium">
                Detalii Promoție & Premii
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 text-white hover:bg-white/20 rounded-2xl p-3 transition-all duration-200 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content - Similar to Metrology CVT */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Promoție Info Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
              Informații Promoție
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nume Promoție */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nume Promoție</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-lg font-medium text-slate-900 dark:text-white">
                    {item.name || item.title || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    item.status === 'Active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : item.status === 'Completed'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {item.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Perioada */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Perioada Desfășurare</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.start_date ? new Date(item.start_date).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">până la</p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.end_date ? new Date(item.end_date).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </p>
                  {daysRemaining !== null && (
                    <p className={`text-sm mt-2 font-semibold ${
                      daysRemaining > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {daysRemaining > 0 ? `${daysRemaining} zile rămase` : 'Expirată'}
                    </p>
                  )}
                </div>
              </div>

              {/* Locație */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Locație</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.location || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Descriere</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Prizes Section - Professional like CVT */}
          {prizes.length > 0 && (
            <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2 mb-6">
                Premii ({prizes.length})
              </h3>

              <div className="space-y-4">
                {prizes.map((prize, index) => {
                  const prizeDate = prize.date
                  const daysUntil = getDaysUntilPrize(prizeDate)
                  const isPast = daysUntil !== null && daysUntil < 0
                  const isToday = daysUntil === 0
                  const isSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 7

                  return (
                    <div key={index} className="p-6 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Prize Number */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Premiu #{index + 1}</label>
                          <div className="flex items-center space-x-2">
                            <Award className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isPast ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                              isToday ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                              isSoon ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {isToday ? 'ASTĂZI' : isSoon ? `${daysUntil} zile` : isPast ? 'Expirat' : 'Activ'}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Sumă</label>
                          <div className="p-3 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                              {parseFloat(prize.amount || 0).toLocaleString('ro-RO')} {prize.currency || 'RON'}
                            </p>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Data Acordare</label>
                          <div className="p-3 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                            <p className="text-base font-medium text-slate-900 dark:text-white">
                              {prizeDate ? new Date(prizeDate).toLocaleDateString('ro-RO', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Winner */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Câștigător</label>
                          <div className="p-3 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                            {prize.winner ? (
                              <div className="flex items-center space-x-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {prize.winner}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                {isPast ? 'Neacordat' : 'În așteptare'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Prize Pool */}
              {prizes.length > 1 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">TOTAL FOND PREMII</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Suma totală a tuturor premiilor</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {totalPrizePool.toLocaleString('ro-RO')} {prizes[0]?.currency || 'RON'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments Section - Professional like CVT */}
          {(item.banner_url || item.documents_url || item.attachments) && (
            <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2 mb-6">
                Atașamente
              </h3>

              {/* Banner */}
              {item.banner_url && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Banner Promoție</label>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                    <div className="relative w-full h-48 bg-white dark:bg-slate-600 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-500">
                      <img
                        src={item.banner_url}
                        alt={`Banner pentru ${item.name || item.title}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              {item.documents_url && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Document Promoție</label>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                    <PDFViewer
                      pdfUrl={item.documents_url}
                      title={`Document Promoție ${item.name || item.title}`}
                      placeholder="Documentul nu este disponibil"
                      placeholderSubtext="Nu există document atașat pentru această promoție"
                    />
                  </div>
                </div>
              )}

              {/* Additional Attachments */}
              {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Fișiere Atașate</label>
                  <div className="space-y-3">
                    {item.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                        <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {attachment.name || `Fișier ${index + 1}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : 'Fișier'}
                          </p>
                        </div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Vezi
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Info Section */}
          <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2 mb-6">
              Informații Suplimentare
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Creat De */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Creat de</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.created_by || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Data Creării */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Data creării</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Notițe</label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                      {item.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Similar to Metrology CVT */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 p-6 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  )
}

export default MarketingDetailModal
