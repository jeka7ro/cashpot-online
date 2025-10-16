import React from 'react'
import { X, Building2, Phone, Mail, Calendar, User, FileText } from 'lucide-react'

const ProviderDetailModal = ({ item, onClose }) => {
  if (!item) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{item.name}</h2>
                <p className="text-purple-100">Detalii Furnizor</p>
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
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Companie */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Companie</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.company || 'N/A'}
              </p>
            </div>

            {/* Contact */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Persoană Contact</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.contact || 'N/A'}
              </p>
            </div>

            {/* Telefon */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Phone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Telefon</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.phone || 'N/A'}
              </p>
            </div>

            {/* Email */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Email</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white break-all">
                {item.email || 'N/A'}
              </p>
            </div>

            {/* Nr. Jocuri */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Număr Jocuri</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.games_count || 0} jocuri
              </p>
            </div>

            {/* Status */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Status</h3>
              </div>
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                (item.status?.toLowerCase() === 'activ' || item.status?.toLowerCase() === 'active')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {item.status || 'N/A'}
              </span>
            </div>
          </div>

          {/* Creat De / Data */}
          {(item.created_by || item.created_at) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
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
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Notițe</h3>
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

export default ProviderDetailModal

