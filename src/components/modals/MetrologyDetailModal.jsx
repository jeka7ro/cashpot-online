import React, { useEffect, useState } from 'react'
import { X, Download, Eye, FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import PDFViewer from '../PDFViewer'
import MultiPDFViewer from '../MultiPDFViewer'
import { formatGameMixName } from '../../utils/gameMixFormatter'
import { useData } from '../../contexts/DataContext'

const MetrologyDetailModal = ({ item, onClose }) => {
  const { approvals } = useData()
  const [currentItem, setCurrentItem] = useState(item)

  // Re-load item from approvals array to get latest attachments
  useEffect(() => {
    if (item && item.id) {
      if (item.name && (item.provider || item.cabinet) && !item.serial_numbers && !(item.cvt_series || item.cvt_number)) {
        // This is an approval - reload from approvals array
        const updatedApproval = approvals.find(a => a.id === item.id)
        if (updatedApproval) {
          setCurrentItem(updatedApproval)
        } else {
          setCurrentItem(item)
        }
      } else {
        setCurrentItem(item)
      }
    }
  }, [item, approvals])

  if (!currentItem) return null

  // Use currentItem instead of item
  const itemToUse = currentItem

  // Detect item type
  const isCommission = itemToUse.name && itemToUse.serial_numbers
  const isApproval = itemToUse.name && (itemToUse.provider || itemToUse.cabinet) && !itemToUse.serial_numbers && !(itemToUse.cvt_series || itemToUse.cvt_number)
  const isCVT = !!(itemToUse.cvt_series || itemToUse.cvt_number)
  const isSoftware = itemToUse.software_name
  const isAuthority = itemToUse.authority_name

  const calculateDaysRemaining = () => {
    if (!itemToUse.expiry_date) return null
    const today = new Date()
    const expiryDate = new Date(itemToUse.expiry_date)
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
    if (!isCommission || !itemToUse.serial_numbers) return []
    if (typeof itemToUse.serial_numbers === 'string') {
      return itemToUse.serial_numbers.split(',').map(s => s.trim()).filter(s => s)
    } else if (Array.isArray(itemToUse.serial_numbers)) {
      return itemToUse.serial_numbers
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
            {isApproval ? `Detalii Aprobare de Tip - ${itemToUse.name}` : isCommission ? `Detalii Comisie - ${itemToUse.name}` : `Detalii Certificat CVT - ${itemToUse.cvt_series || itemToUse.cvt_number || ''}`}
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
            /* Approval Details - EXACT CA LA CONTRACTE */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Info Cards */}
              <div className="space-y-6">
              {/* Approval Info */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Informații Aprobare de Tip</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Numele Aprobării</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Furnizor</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cabinet</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.cabinet || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Game Mix</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{formatGameMixName(itemToUse.game_mix_name || itemToUse.game_mix)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Autoritate Emitentă</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.issuing_authority || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat de</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.created_by || 'N/A'}</p>
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
                      {(itemToUse.checksum_md5 || itemToUse.checksumMD5) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">SHA256</label>
                    <p className="text-slate-800 dark:text-slate-200 font-mono text-sm break-all">
                      {(itemToUse.checksum_sha256 || itemToUse.checksumSHA256) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {itemToUse.notes && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h4>
                  <p className="text-slate-800 dark:text-slate-200">{itemToUse.notes}</p>
                </div>
              )}
              </div>

              {/* Right Column - Documente Contracte - EXACT CA LA CONTRACTE */}
              <div className="lg:col-span-2">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-600" />
                    Documente Aprobare
                  </h3>
                  
                  {/* Multi PDF Viewer - EXACT CA LA CONTRACTE */}
                  {(() => {
                    // Parse attachments from approval - DEBUG COMPLET
                    console.log('🔍 DEBUG ATTACHMENTS în MetrologyDetailModal:')
                    console.log('   itemToUse:', itemToUse)
                    console.log('   itemToUse.attachments:', itemToUse.attachments)
                    console.log('   typeof:', typeof itemToUse.attachments)
                    
                    let parsedAttachments = []
                    if (itemToUse.attachments) {
                      try {
                        parsedAttachments = typeof itemToUse.attachments === 'string' 
                          ? JSON.parse(itemToUse.attachments)
                          : itemToUse.attachments
                        if (!Array.isArray(parsedAttachments)) {
                          console.warn('⚠️ attachments nu este array:', parsedAttachments)
                          parsedAttachments = []
                        } else {
                          console.log('✅ Parsed attachments:', parsedAttachments.length, 'items')
                        }
                      } catch (e) {
                        console.error('❌ Error parsing attachments in modal:', e, itemToUse.attachments)
                        parsedAttachments = []
                      }
                    } else {
                      console.warn('⚠️ itemToUse.attachments este null/undefined')
                    }

                    const files = parsedAttachments.map((att, idx) => {
                      // Backend folosește 'filename' și 'url' (vezi server-postgres.js linia 4398-4401)
                      const fileObj = {
                        name: att.filename || att.name || att.file_name || `Document ${idx + 1}`,
                        type: 'Atașament Aprobare',
                        file_path: att.url || att.file_path || att.path || att,
                        url: att.url || att.file_path || att.path || att,
                        id: att.id || `attachment-${idx}`
                      }
                      console.log(`   File ${idx}:`, fileObj)
                      return fileObj
                    })

                    console.log('📄 Total files pentru MultiPDFViewer:', files.length)

                    return (
                      <MultiPDFViewer
                        files={files}
                        title="Documente Aprobare"
                        placeholder="Nu există documente atașate"
                        placeholderSubtext="Adaugă documente pentru vizualizare"
                      />
                    )
                  })()}
                </div>
              </div>
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
          ) : isCVT ? (
            /* CVT Details - EXACT CA LA CONTRACTE */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Info Cards */}
              <div className="space-y-6">
              {/* CVT Information */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Informații CVT</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Serie CVT</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.cvt_series || itemToUse.cvt_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Tip CVT</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.cvt_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Autoritatea Emitentă</label>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{itemToUse.issuing_authority || 'N/A'}</p>
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
                    <p className="text-base font-medium text-slate-900">{itemToUse.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Cabinet</label>
                    <p className="text-base font-medium text-slate-900">{itemToUse.cabinet || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Game Mix</label>
                    <p className="text-base font-medium text-slate-900">{formatGameMixName(itemToUse.game_mix_name || itemToUse.game_mix)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Aprobare de Tip</label>
                    <p className="text-base font-medium text-slate-900">{itemToUse.approval_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Software</label>
                    <p className="text-base font-medium text-slate-900">{itemToUse.software || 'N/A'}</p>
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
                      {itemToUse.cvt_date ? new Date(itemToUse.cvt_date).toLocaleDateString('ro-RO', {
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
                      {itemToUse.expiry_date ? new Date(itemToUse.expiry_date).toLocaleDateString('ro-RO', {
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
              {itemToUse.notes && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Note</h4>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{itemToUse.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - PDF Viewer - EXACT CA LA CONTRACTE */}
            <div className="lg:col-span-2">
              {/* AFIȘEAZĂ ATAȘAMENTELE PENTRU APROBĂRI ÎN COLOANA DREAPTĂ (CA LA CVT) */}
              {/* ATAȘAMENTE APROBĂRI - EXACT CA LA CONTRACTE */}
              {isApproval && (() => {
                console.log('🔍 DEBUG ATTACHMENTS pentru aprobări în CVT section:')
                console.log('   itemToUse.attachments:', itemToUse.attachments)
                
                let parsedAttachments = []
                if (itemToUse.attachments) {
                  try {
                    parsedAttachments = typeof itemToUse.attachments === 'string' 
                      ? JSON.parse(itemToUse.attachments)
                      : itemToUse.attachments
                    if (!Array.isArray(parsedAttachments)) {
                      parsedAttachments = []
                    }
                  } catch (e) {
                    console.error('❌ Error parsing attachments:', e)
                    parsedAttachments = []
                  }
                }

                // AFIȘEAZĂ ÎNTOTDEAUNA MultiPDFViewer (chiar dacă e gol) - EXACT CA LA CONTRACTE
                return (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-green-600" />
                      Documente Aprobare
                    </h3>
                    <MultiPDFViewer
                      files={parsedAttachments.map((att, idx) => ({
                        name: att.filename || att.name || `Document ${idx + 1}`,
                        type: 'Atașament Aprobare',
                        file_path: att.url || att.file_path || att.path || att,
                        url: att.url || att.file_path || att.path || att,
                        id: att.id || `attachment-${idx}`
                      }))}
                      title="Documente Aprobare"
                      placeholder="Nu există documente atașate"
                      placeholderSubtext="Adaugă documente pentru vizualizare"
                    />
                  </div>
                )
              })()}

              {/* CVT Document Viewer */}
              {isCVT && (
              <div className="bg-slate-50 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2 mb-4">
                  Document CVT
                </h4>
                {(() => {
                  const rawUrl = itemToUse.cvt_file || itemToUse.cvtFile || itemToUse.file_path || itemToUse.file?.url || itemToUse.file?.path || null
                  const makeAbsolute = (url) => {
                    if (!url) return null
                    // Accept data URLs as-is (e.g., base64 PDFs stored directly)
                    if (/^data:application\/pdf/i.test(url)) return url
                    if (/^https?:/i.test(url)) return url
                    const backend = (window && window.APP_BACKEND_URL) || 'https://cashpot-backend.onrender.com'
                    return `${backend}${url.startsWith('/') ? url : `/${url}`}`
                  }
                  // Prefer direct URL; if missing or not usable, fallback to backend render endpoint
                  let pdfUrl = makeAbsolute(rawUrl)
                  if (!pdfUrl && item?.id) {
                    const backend = (window && window.APP_BACKEND_URL) || 'https://cashpot-backend.onrender.com'
                    pdfUrl = `${backend}/api/cvt-pdf/${item.id}`
                  }
                  // Folosim MultiPDFViewer EXACT CA LocationDetail!
                  return rawUrl ? (
                    <MultiPDFViewer
                      files={[{
                        name: `CVT ${itemToUse.cvt_series || itemToUse.cvt_number || 'Document'}`,
                        type: 'Document CVT',
                        file_path: rawUrl,
                        url: rawUrl,
                        id: 'cvt'
                      }]}
                      title="Document CVT"
                      placeholder="Nu există document CVT încărcat"
                      placeholderSubtext="Adaugă document pentru vizualizare"
                    />
                  ) : (
                    <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                      <div className="text-center text-slate-500 dark:text-slate-400">
                      <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Nu există document CVT</p>
                      <p className="text-xs text-slate-400 mt-1">Atașează documentul CVT pentru vizualizare</p>
                    </div>
                  </div>
                  )
                })()}
              </div>
              )}

              {/* Created By */}
              <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
                <h4 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                  Informații Adiționale
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Creat de</label>
                    <p className="text-base font-medium text-slate-900">{itemToUse.created_by || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Data creării</label>
                    <p className="text-base font-medium text-slate-900">
                      {itemToUse.created_at ? new Date(itemToUse.created_at).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default MetrologyDetailModal


