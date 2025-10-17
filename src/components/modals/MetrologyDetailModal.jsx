import React from 'react'
import { X, Download, Eye, FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import PDFViewer from '../PDFViewer'

const MetrologyDetailModal = ({ item, onClose }) => {
  if (!item) return null

  // Detect item type
  const isCommission = item.name && item.serial_numbers
  const isApproval = item.name && (item.provider || item.cabinet) && !item.serial_numbers && !item.cvt_number
  const isCVT = item.cvt_number
  const isSoftware = item.software_name
  const isAuthority = item.authority_name

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

  // Parse serial numbers for commission
  const getSerialNumbers = () => {
    if (!isCommission || !item.serial_numbers) return []
    if (typeof item.serial_numbers === 'string') {
      return item.serial_numbers.split(',').map(s => s.trim()).filter(s => s)
    } else if (Array.isArray(item.serial_numbers)) {
      return item.serial_numbers
    }
    return []
  }

  const serialNumbers = getSerialNumbers()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center ${isApproval ? 'bg-gradient-to-r from-green-500 to-emerald-500' : isCommission ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-cyan-500 to-teal-500'}`}>
          <h3 className="text-xl font-bold text-white flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            {isApproval ? `Detalii Aprobare de Tip - ${item.name}` : isCommission ? `Detalii Comisie - ${item.name}` : `Detalii Certificat CVT - ${item.cvt_number}`}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isApproval ? (
            /* Approval Details */
            <div className="space-y-6">
              {/* Approval Info */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Informații Aprobare de Tip</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Numele Aprobării</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Furnizor</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cabinet</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.cabinet || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Game Mix</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.game_mix || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Autoritate Emitentă</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.issuing_authority || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat de</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.created_by || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Checksums */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Checksums</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">MD5</label>
                    <p className="text-slate-800 dark:text-slate-200 font-mono text-sm break-all">
                      {(item.checksum_md5 || item.checksumMD5) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">SHA256</label>
                    <p className="text-slate-800 dark:text-slate-200 font-mono text-sm break-all">
                      {(item.checksum_sha256 || item.checksumSHA256) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h4>
                  <p className="text-slate-800 dark:text-slate-200">{item.notes}</p>
                </div>
              )}
            </div>
          ) : isCommission ? (
            /* Commission Details */
            <div className="space-y-6">
              {/* Commission Info */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Informații Comisie</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Numele Comisiei</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{item.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Numărul de Sloturi</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{serialNumbers.length} sloturi</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data Comisiei</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">
                      {item.commission_date ? new Date(item.commission_date).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data Valabilității</label>
                    <p className={`font-semibold ${getStatusColor()}`}>
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('ro-RO') : 'N/A'}
                      {daysRemaining !== null && (
                        <span className="ml-2 text-sm">({getStatusText()})</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Serial Numbers Table */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Detalii Sloturi ({serialNumbers.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-600">
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Serial Number</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Furnizor</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Cabinet</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Game Mix</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Locație</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Factură</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Data CVT</th>
                        <th className="text-left py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Data Comisie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serialNumbers.map((serial, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-600">
                          <td className="py-2 text-sm text-slate-800 dark:text-slate-200 font-mono">{serial}</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                          <td className="py-2 text-sm text-slate-600 dark:text-slate-400">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  * Detaliile complete vor fi afișate când vor fi conectate cu baza de date de sloturi
                </p>
              </div>
            </div>
          ) : (
            /* Original CVT Details */
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
        )}
        </div>
      </div>
    </div>
  )
}

export default MetrologyDetailModal


