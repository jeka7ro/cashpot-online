import React from 'react'
import { X, Cherry as MixIcon, Building2, Gamepad2, Package, Calendar, User } from 'lucide-react'

const GameMixDetailModal = ({ item, onClose }) => {
  if (!item) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MixIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{item.name}</h2>
                <p className="text-orange-100">Detalii Game Mix</p>
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
            {/* Furnizor */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Furnizor</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.provider || 'N/A'}
              </p>
            </div>

            {/* Cabinet */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <Gamepad2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Cabinet</h3>
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {item.cabinet || 'N/A'}
              </p>
            </div>

            {/* Versiune */}
            {item.version && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                <div className="flex items-center space-x-3 mb-3">
                  <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">Versiune</h3>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white font-mono">
                  {item.version}
                </p>
              </div>
            )}

            {/* Număr Sloturi */}
            {item.gaming_places && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-6 rounded-xl">
                <div className="flex items-center space-x-3 mb-3">
                  <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">Gaming Places</h3>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                  {item.gaming_places}
                </p>
              </div>
            )}
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

export default GameMixDetailModal

