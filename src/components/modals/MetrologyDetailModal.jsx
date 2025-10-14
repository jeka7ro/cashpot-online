import React from 'react'
import { X, Download, Eye, FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import PDFViewer from '../PDFViewer'

const MetrologyDetailModal = ({ item, onClose }) => {
  if (!item) return null

  const calculateDaysRemaining = () => {
    if (!item.expiry_date) return null
    const today = new Date()
    const expiryDate = new Date(item.expiry_date)
    const diffTime = expiryDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = calculateDaysRemaining()

  const getStatusColor = () => {
    if (daysRemaining === null) return 'text-slate-400'
    if (daysRemaining < 0) return 'text-red-600'
    if (daysRemaining <= 30) return 'text-orange-600'
    return 'text-green-600'
  }

  const getStatusText = () => {
    if (daysRemaining === null) return 'N/A'
    if (daysRemaining < 0) return `Expirat (${Math.abs(daysRemaining)} zile)`
    return `${daysRemaining} zile rămase`
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            Detalii Certificat CVT - {item.cvt_number}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Information */}
            <div className="space-y-6">
              {/* CVT Information */}
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                  Informații CVT
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Număr CVT</label>
                    <p className="text-base font-medium text-slate-900">{item.cvt_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Tip CVT</label>
                    <p className="text-base font-medium text-slate-900">{item.cvt_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Autoritatea Emitentă</label>
                    <p className="text-base font-medium text-slate-900">{item.issuing_authority || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Device Information */}
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                  Informații Dispozitiv
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Furnizor</label>
                    <p className="text-base font-medium text-slate-900">{item.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Cabinet</label>
                    <p className="text-base font-medium text-slate-900">{item.cabinet || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Game Mix</label>
                    <p className="text-base font-medium text-slate-900">{item.game_mix || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Aprobare de Tip</label>
                    <p className="text-base font-medium text-slate-900">{item.approval_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Software</label>
                    <p className="text-base font-medium text-slate-900">{item.software || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Dates & Status */}
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                  Date & Status
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Data CVT</label>
                    <p className="text-base font-medium text-slate-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-cyan-500" />
                      {item.cvt_date ? new Date(item.cvt_date).toLocaleDateString('ro-RO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Data Expirării</label>
                    <p className="text-base font-medium text-slate-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('ro-RO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Status</label>
                    <p className={`text-base font-bold flex items-center ${getStatusColor()}`}>
                      {daysRemaining !== null && daysRemaining >= 0 ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-2" />
                      )}
                      {getStatusText()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                    Note
                  </h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - PDF Viewer */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                  Document CVT
                </h4>
                <PDFViewer 
                  pdfUrl={item.cvtFile || null}
                  title="CVT Document"
                  placeholder="Nu există document CVT"
                  placeholderSubtext="Atașează documentul CVT pentru vizualizare"
                />
              </div>

              {/* Created By */}
              <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
                <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                  Informații Adiționale
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Creat de</label>
                    <p className="text-base font-medium text-slate-900">{item.created_by || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Data creării</label>
                    <p className="text-base font-medium text-slate-900">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetrologyDetailModal


