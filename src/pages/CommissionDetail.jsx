import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, FileText, Download, Upload, Users, Calendar, CheckCircle, AlertCircle, Settings, ChevronDown, ChevronUp, FileSpreadsheet, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { useData } from '../contexts/DataContext'

const CommissionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { slots, locations, warehouse, loadAllData, cabinets, gameMixes, providers } = useData()
  const [commission, setCommission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)
  const [attachments, setAttachments] = useState([])
  const [members, setMembers] = useState([])
  const [expandedSerialNumbers, setExpandedSerialNumbers] = useState(false)
  const [providerFilter, setProviderFilter] = useState('all')
  const [cabinetFilter, setCabinetFilter] = useState('all')
  const [gameMixFilter, setGameMixFilter] = useState('all')
  const [editingGamingPlaces, setEditingGamingPlaces] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [selectedSerials, setSelectedSerials] = useState([])
  const [renewalProviderFilter, setRenewalProviderFilter] = useState('all')
  const [renewalCabinetFilter, setRenewalCabinetFilter] = useState('all')
  const [renewalGameMixFilter, setRenewalGameMixFilter] = useState('all')
  const [renewalCommissionDate, setRenewalCommissionDate] = useState('')
  const [renewalExpiryDate, setRenewalExpiryDate] = useState('')

  useEffect(() => {
    loadCommission()
  }, [id])

  // Calculează datele de reînnoire când se deschide modalul sau când se schimbă comisia
  useEffect(() => {
    if (showRenewalModal && commission && commission.expiry_date) {
      try {
        // Parsează data expirării corect
        let expiryDate
        if (commission.expiry_date instanceof Date) {
          expiryDate = commission.expiry_date
        } else if (typeof commission.expiry_date === 'string') {
          // Dacă e deja în format ISO complet, folosește direct
          if (commission.expiry_date.includes('T')) {
            expiryDate = new Date(commission.expiry_date)
          } else {
            // Dacă e doar YYYY-MM-DD, parsează corect
            expiryDate = new Date(commission.expiry_date + 'T00:00:00')
          }
        } else {
          console.error('Invalid expiry_date format:', commission.expiry_date)
          return
        }
        
        if (isNaN(expiryDate.getTime())) {
          console.error('Invalid expiry_date:', commission.expiry_date)
          return
        }
        
        // Extrage anul, luna și ziua din data expirării (folosind UTC pentru a evita problemele cu timezone)
        const expiryYear = expiryDate.getUTCFullYear()
        const expiryMonth = expiryDate.getUTCMonth() // 0-indexed (0 = ianuarie, 11 = decembrie)
        const expiryDay = expiryDate.getUTCDate()
        
        console.log('📅 Calculating renewal dates from expiry:', `${expiryDay}.${expiryMonth + 1}.${expiryYear}`)
        
        // Data comisiei = prima zi din luna următoare după data expirării (folosind UTC)
        const nextMonthYear = expiryMonth === 11 ? expiryYear + 1 : expiryYear
        const nextMonthMonth = expiryMonth === 11 ? 0 : expiryMonth + 1
        const commissionDateStr = `${nextMonthYear}-${String(nextMonthMonth + 1).padStart(2, '0')}-01`
        console.log('📅 New commission date (first day of next month):', commissionDateStr)
        setRenewalCommissionDate(commissionDateStr)
        
        // Data expirării = data comisiei + 1 an - 1 zi
        // Data comisiei este prima zi din luna următoare, deci data expirării este ultima zi din aceeași lună, anul următor
        const newExpiryYear = nextMonthYear + 1
        const newExpiryMonth = nextMonthMonth
        // Ultima zi din luna = prima zi din luna următoare - 1 zi
        const tempDate = new Date(Date.UTC(newExpiryYear, newExpiryMonth + 1, 0)) // Ziua 0 = ultima zi din luna anterioară
        const lastDayOfMonth = tempDate.getUTCDate()
        const expiryDateStr = `${newExpiryYear}-${String(newExpiryMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
        console.log('📅 New expiry date (commission date + 1 year - 1 day):', expiryDateStr)
        setRenewalExpiryDate(expiryDateStr)
      } catch (e) {
        console.error('Error calculating renewal dates:', e, commission.expiry_date)
      }
    } else {
      // Reset datele când modalul se închide
      setRenewalCommissionDate('')
      setRenewalExpiryDate('')
    }
  }, [showRenewalModal, commission])

  const loadCommission = async () => {
    try {
      const response = await fetch(`/api/commissions/${id}`)
      if (!response.ok) {
        toast.error('Comisia nu a fost găsită')
        navigate('/metrology?tab=commissions')
        return
      }
      const data = await response.json()
      
      setCommission(data)
      
      // Load attachments
      if (data.attachments) {
        try {
          const parsedAttachments = typeof data.attachments === 'string' 
            ? JSON.parse(data.attachments)
            : data.attachments
          setAttachments(Array.isArray(parsedAttachments) ? parsedAttachments : [])
        } catch (e) {
          setAttachments([])
        }
      }
      
      // Load members (serial_numbers)
      if (data.serial_numbers) {
        try {
          const parsedMembers = typeof data.serial_numbers === 'string' 
            ? JSON.parse(data.serial_numbers)
            : data.serial_numbers
          setMembers(Array.isArray(parsedMembers) ? parsedMembers : [])
        } catch (e) {
          setMembers([])
        }
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading commission:', error)
      toast.error('Eroare la încărcarea comisiei')
      navigate('/metrology?tab=commissions')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/commissions/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        toast.success('Comisia a fost ștearsă cu succes')
        navigate('/metrology?tab=commissions')
      } else {
        toast.error('Eroare la ștergerea comisiei')
      }
    } catch (error) {
      console.error('Error deleting commission:', error)
      toast.error('Eroare la ștergerea comisiei')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!commission) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Comisia nu a fost găsită</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Comisia pe care o căutați nu există sau a fost ștearsă.</p>
                  <button
                    onClick={() => navigate('/metrology?tab=commissions')}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors"
                  >
                    Înapoi la Comisii
                  </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6">
            <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-teal-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/metrology?tab=commissions')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {commission.name || `Comisie #${commission.id}`}
                    </h1>
                    <p className="text-emerald-100">
                      {commission.commission_date && new Date(commission.commission_date).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowRenewalModal(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Reînnoire Comisie"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Reînnoire</span>
                  </button>
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Toggle atașamente"
                  >
                    <FileText className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Șterge"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Data Formării</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {commission.commission_date ? new Date(commission.commission_date).toLocaleDateString('ro-RO') : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Data Expirării</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {commission.expiry_date ? new Date(commission.expiry_date).toLocaleDateString('ro-RO') : 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Număr Numere de Serii</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{members.length}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Status</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {commission.expiry_date && new Date(commission.expiry_date) > new Date() ? 'Activă' : 'Expirată'}
                </p>
              </div>
            </div>
          </div>

          {/* Atașamente și Metadata - Mutate deasupra */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* PDF VIEWER AUTOMAT - Afișează TOATE fișierele */}
            {attachments.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  Preview Documente
                </h3>
                <MultiPDFViewer 
                  files={attachments}
                  title="Atașamente Comisie"
                  placeholder="Nu există documente de afișat"
                  placeholderSubtext="Adaugă documente pentru preview automat"
                />
              </div>
            )}

            {/* Attachments Upload Area */}
            {showAttachments && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-blue-500" />
                  Atașamente ({attachments.length})
                </h3>
                
                <div className="space-y-4">
                  {/* Upload Button - Multiple files with Base64 encoding */}
                  <label className="block">
                    <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <Upload className="w-5 h-5 mr-2 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Adaugă documente PDF (multiple)
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files)
                          if (files.length === 0) return
                          
                          let processedCount = 0
                          const newAttachments = []
                          
                          files.forEach((file) => {
                            // Verifică dimensiune (max 10MB per fișier)
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error(`${file.name} este prea mare! Maxim 10MB per fișier.`)
                              processedCount++
                              if (processedCount === files.length) {
                                finishUpload(newAttachments)
                              }
                              return
                            }
                            
                            // Verifică tipul fișierului
                            if (file.type !== 'application/pdf') {
                              toast.error(`${file.name} nu este un fișier PDF.`)
                              processedCount++
                              if (processedCount === files.length) {
                                finishUpload(newAttachments)
                              }
                              return
                            }
                            
                            const reader = new FileReader()
                            
                            reader.onload = (e) => {
                              newAttachments.push({
                                id: Date.now() + Math.random(),
                                name: file.name,
                                url: e.target.result, // base64 string
                                size: file.size,
                                type: file.type,
                                uploaded: false // Will be set to true after saving
                              })
                              
                              processedCount++
                              if (processedCount === files.length) {
                                finishUpload(newAttachments)
                              }
                            }
                            
                            reader.onerror = () => {
                              toast.error(`Eroare la citirea ${file.name}`)
                              processedCount++
                              if (processedCount === files.length) {
                                finishUpload(newAttachments)
                              }
                            }
                            
                            reader.readAsDataURL(file)
                          })
                          
                          function finishUpload(validResults) {
                            if (validResults.length > 0) {
                              const updatedAttachments = [...attachments, ...validResults]
                              setAttachments(updatedAttachments)
                              
                              // Save to backend
                              const token = sessionStorage.getItem('authToken')
                              fetch(`/api/commissions/${commission.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                },
                                body: JSON.stringify({
                                  name: commission.name,
                                  serial_numbers: commission.serial_numbers,
                                  commission_date: commission.commission_date,
                                  expiry_date: commission.expiry_date,
                                  notes: commission.notes,
                                  attachments: JSON.stringify(updatedAttachments.map(att => ({
                                    id: att.id,
                                    name: att.name,
                                    url: att.url,
                                    size: att.size,
                                    type: att.type
                                  })))
                                })
                              })
                                .then(res => {
                                  if (!res.ok) {
                                    throw new Error('Eroare la salvare')
                                  }
                                  return res.json()
                                })
                                .then(() => {
                                  toast.success(`${validResults.length} document${validResults.length !== 1 ? 'e' : ''} încărcat${validResults.length !== 1 ? 'e' : ''} cu succes`)
                                  // Mark as uploaded
                                  setAttachments(prev => prev.map(att => 
                                    validResults.some(v => v.id === att.id) ? { ...att, uploaded: true } : att
                                  ))
                                })
                                .catch(error => {
                                  console.error('Error saving attachments:', error)
                                  toast.error('Eroare la salvare în backend')
                                })
                            }
                          }
                        }}
                      />
                    </div>
                  </label>

                  {/* Compact Attachments List */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {attachments.length} fișier{attachments.length !== 1 ? 'e' : ''} atașat{attachments.length !== 1 ? 'e' : ''}
                      </p>
                      {attachments.map((attachment, index) => (
                        <div key={attachment.id || index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                              {attachment.name || `Atașament ${index + 1}`}
                            </span>
                            {attachment.size && (
                              <span className="text-slate-500 dark:text-slate-500">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const updatedAttachments = attachments.filter((_, i) => i !== index)
                              setAttachments(updatedAttachments)
                              
                              // Update backend
                              const token = sessionStorage.getItem('authToken')
                              fetch(`/api/commissions/${commission.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                },
                                body: JSON.stringify({
                                  name: commission.name,
                                  serial_numbers: commission.serial_numbers,
                                  commission_date: commission.commission_date,
                                  expiry_date: commission.expiry_date,
                                  notes: commission.notes,
                                  attachments: JSON.stringify(updatedAttachments.map(att => ({
                                    id: att.id,
                                    name: att.name,
                                    url: att.url,
                                    size: att.size,
                                    type: att.type
                                  })))
                                })
                              })
                                .then(res => {
                                  if (!res.ok) throw new Error('Eroare la ștergere')
                                  toast.success('Atașament șters')
                                })
                                .catch(() => toast.error('Eroare la ștergere'))
                            }}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Șterge"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Metadata</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat de</label>
                  <p className="text-slate-800 dark:text-slate-200">{commission.created_by || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Creat la</label>
                  <p className="text-slate-800 dark:text-slate-200">
                    {commission.created_at ? new Date(commission.created_at).toLocaleString('ro-RO') : 'N/A'}
                  </p>
                </div>
                {commission.updated_at && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Actualizat la</label>
                    <p className="text-slate-800 dark:text-slate-200">
                      {new Date(commission.updated_at).toLocaleString('ro-RO')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Tabele */}
          <div className="space-y-6">
            {/* Centralizator pe Săli - Mutat deasupra */}
            {members.length > 0 && (() => {
              // Helper function pentru normalizare serial_number
              const normalizeSerial = (serial) => {
                if (!serial) return ''
                return String(serial).trim().replace(/\s+/g, '').toLowerCase()
              }
              
              // Helper function pentru a obține producătorul din cabinet sau game_mix
              const getProviderFromRelated = (slot) => {
                if (!slot) return null
                
                // 1. Dacă slot-ul are deja producător, returnează-l
                if (slot.provider) return slot.provider
                
                // 2. Caută producătorul din cabinet
                if (slot.cabinet && cabinets) {
                  const cabinet = cabinets.find(c => {
                    const cabName = String(c.name || '').trim()
                    const slotCab = String(slot.cabinet || '').trim()
                    return cabName === slotCab || cabName.toLowerCase() === slotCab.toLowerCase()
                  })
                  if (cabinet?.provider) return cabinet.provider
                }
                
                // 3. Caută producătorul din game_mix
                if (slot.game_mix && gameMixes) {
                  const gameMix = gameMixes.find(gm => {
                    const gmName = String(gm.name || '').trim()
                    const slotGM = String(slot.game_mix || '').trim()
                    return gmName === slotGM || gmName.toLowerCase() === slotGM.toLowerCase()
                  })
                  if (gameMix?.provider) return gameMix.provider
                }
                
                return null
              }
              
              // Helper function pentru matching flexibil
              const findSlotBySerial = (serialNumber) => {
                if (!serialNumber || !slots) return null
                
                const normalized = normalizeSerial(serialNumber)
                
                // 1. Caută exact match după serial_number
                let slot = slots.find(s => {
                  if (!s.serial_number) return false
                  return normalizeSerial(s.serial_number) === normalized
                })
                
                // 2. Dacă nu găsește, caută după slot_id
                if (!slot) {
                  slot = slots.find(s => {
                    if (!s.slot_id) return false
                    return normalizeSerial(s.slot_id) === normalized
                  })
                }
                
                // 3. Dacă nu găsește, caută parțial (conține)
                if (!slot) {
                  slot = slots.find(s => {
                    if (!s.serial_number) return false
                    const slotSerial = normalizeSerial(s.serial_number)
                    return slotSerial.includes(normalized) || normalized.includes(slotSerial)
                  })
                }
                
                // 4. Dacă nu găsește în slots, caută în warehouse
                if (!slot && warehouse) {
                  const warehouseItem = warehouse.find(w => {
                    if (!w.serial_number) return false
                    return normalizeSerial(w.serial_number) === normalized
                  })
                  
                  if (warehouseItem) {
                    slot = {
                      id: warehouseItem.id,
                      provider: warehouseItem.provider,
                      cabinet: warehouseItem.cabinet,
                      game_mix: warehouseItem.game_mix,
                      location: warehouseItem.location,
                      gaming_places: warehouseItem.gaming_places,
                      address: warehouseItem.address,
                      serial_number: warehouseItem.serial_number
                    }
                  }
                }
                
                // 5. Dacă slot-ul nu are producător, încearcă să-l găsească din cabinet sau game_mix
                if (slot && !slot.provider) {
                  const foundProvider = getProviderFromRelated(slot)
                  if (foundProvider) {
                    slot = { ...slot, provider: foundProvider }
                  }
                }
                
                return slot
              }
              
              // Calculează centralizator pe săli
              const allTableData = members.map((member, index) => {
                const serialNumber = typeof member === 'string' ? member : member.serial_number || member
                const slot = findSlotBySerial(serialNumber)
                
                let location = null
                if (slot?.location) {
                  location = locations?.find(l => {
                    if (!l.name) return false
                    const locName = l.name.trim().toLowerCase()
                    const slotLoc = String(slot.location).trim().toLowerCase()
                    return locName === slotLoc || locName.includes(slotLoc) || slotLoc.includes(locName)
                  })
                }
                
                // Obține producătorul (din slot direct sau din cabinet/game_mix)
                const finalProvider = slot?.provider || getProviderFromRelated(slot) || '-'
                
                return {
                  nr: index + 1,
                  serialNumber,
                  provider: finalProvider,
                  cabinet: slot?.cabinet || '-',
                  gameMix: slot?.game_mix || '-',
                  location: slot?.location || '-',
                  gamingPlaces: slot?.gaming_places ? Number(slot.gaming_places) : 0,
                  address: location?.address || slot?.address || '-'
                }
              })
              
              const locationProviderMap = {}
              allTableData.forEach(item => {
                if (item.location && item.location !== '-' && item.provider && item.provider !== '-') {
                  if (!locationProviderMap[item.location]) {
                    locationProviderMap[item.location] = {}
                  }
                  if (!locationProviderMap[item.location][item.provider]) {
                    locationProviderMap[item.location][item.provider] = 0
                  }
                  locationProviderMap[item.location][item.provider] += item.gamingPlaces
                }
              })
              
              const allLocations = Object.keys(locationProviderMap).sort()
              const allProviders = [...new Set(allTableData.map(item => item.provider).filter(p => p !== '-'))].sort()
              
              // Calculează totaluri
              const providerTotals = {}
              allProviders.forEach(provider => {
                providerTotals[provider] = allTableData
                  .filter(item => item.provider === provider)
                  .reduce((sum, item) => sum + item.gamingPlaces, 0)
              })
              
              const locationTotals = {}
              allLocations.forEach(location => {
                locationTotals[location] = Object.values(locationProviderMap[location] || {}).reduce((sum, val) => sum + val, 0)
              })
              
              const grandTotal = allTableData.reduce((sum, item) => sum + item.gamingPlaces, 0)
              
              if (allLocations.length === 0) return null
              
              return (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-500" />
                    Centralizator pe Săli - Locuri de Joc
                  </h3>
                  <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg overflow-y-auto" style={{ maxHeight: '500px' }}>
                    <table className="min-w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                            Producător
                          </th>
                          {allLocations.map(location => (
                            <th key={location} className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              {location}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l-2 border-slate-400 dark:border-slate-600">
                            TOTAL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {allProviders.map(provider => (
                          <tr key={provider} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                              {provider}
                            </td>
                            {allLocations.map(location => (
                              <td key={location} className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {locationProviderMap[location]?.[provider] || '-'}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-sm text-center font-semibold text-slate-900 dark:text-slate-100 border-l-2 border-slate-400 dark:border-slate-600">
                              {providerTotals[provider] || 0}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-t-2 border-slate-300 dark:border-slate-700">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                            TOTAL
                          </td>
                          {allLocations.map(location => (
                            <td key={location} className="px-4 py-3 text-sm text-center font-semibold text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-700">
                              {locationTotals[location] || 0}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-sm text-center font-bold text-slate-900 dark:text-slate-100 border-l-2 border-slate-400 dark:border-slate-600">
                            {grandTotal}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* Centralizator Numere de Serii */}
            <div className="flex flex-col">
              {members.length > 0 && (() => {
                // Helper function pentru normalizare serial_number
                const normalizeSerial = (serial) => {
                  if (!serial) return ''
                  return String(serial).trim().replace(/\s+/g, '').toLowerCase()
                }
                
                // Helper function pentru a obține producătorul din cabinet sau game_mix
                const getProviderFromRelated = (slot) => {
                  if (!slot) return null
                  
                  // 1. Dacă slot-ul are deja producător, returnează-l
                  if (slot.provider) return slot.provider
                  
                  // 2. Caută producătorul din cabinet
                  if (slot.cabinet && cabinets) {
                    const cabinet = cabinets.find(c => {
                      const cabName = String(c.name || '').trim()
                      const slotCab = String(slot.cabinet || '').trim()
                      return cabName === slotCab || cabName.toLowerCase() === slotCab.toLowerCase()
                    })
                    if (cabinet?.provider) return cabinet.provider
                  }
                  
                  // 3. Caută producătorul din game_mix
                  if (slot.game_mix && gameMixes) {
                    const gameMix = gameMixes.find(gm => {
                      const gmName = String(gm.name || '').trim()
                      const slotGM = String(slot.game_mix || '').trim()
                      return gmName === slotGM || gmName.toLowerCase() === slotGM.toLowerCase()
                    })
                    if (gameMix?.provider) return gameMix.provider
                  }
                  
                  return null
                }
                
                // Helper function pentru matching flexibil
                const findSlotBySerial = (serialNumber) => {
                  if (!serialNumber || !slots) return null
                  
                  const normalized = normalizeSerial(serialNumber)
                  
                  // 1. Caută exact match după serial_number
                  let slot = slots.find(s => {
                    if (!s.serial_number) return false
                    return normalizeSerial(s.serial_number) === normalized
                  })
                  
                  // 2. Dacă nu găsește, caută după slot_id
                  if (!slot) {
                    slot = slots.find(s => {
                      if (!s.slot_id) return false
                      return normalizeSerial(s.slot_id) === normalized
                    })
                  }
                  
                  // 3. Dacă nu găsește, caută parțial (conține)
                  if (!slot) {
                    slot = slots.find(s => {
                      if (!s.serial_number) return false
                      const slotSerial = normalizeSerial(s.serial_number)
                      return slotSerial.includes(normalized) || normalized.includes(slotSerial)
                    })
                  }
                  
                  // 4. Dacă nu găsește în slots, caută în warehouse
                  if (!slot && warehouse) {
                    const warehouseItem = warehouse.find(w => {
                      if (!w.serial_number) return false
                      return normalizeSerial(w.serial_number) === normalized
                    })
                    
                    if (warehouseItem) {
                      slot = {
                        id: warehouseItem.id,
                        provider: warehouseItem.provider,
                        cabinet: warehouseItem.cabinet,
                        game_mix: warehouseItem.game_mix,
                        location: warehouseItem.location,
                        gaming_places: warehouseItem.gaming_places,
                        address: warehouseItem.address,
                        serial_number: warehouseItem.serial_number
                      }
                    }
                  }
                  
                  // 5. Dacă slot-ul nu are producător, încearcă să-l găsească din cabinet sau game_mix
                  if (slot && !slot.provider) {
                    const foundProvider = getProviderFromRelated(slot)
                    if (foundProvider) {
                      slot = { ...slot, provider: foundProvider }
                    }
                  }
                  
                  return slot
                }
                
                // Pregătește datele pentru tabel
                const allTableData = members.map((member, index) => {
                  const serialNumber = typeof member === 'string' ? member : member.serial_number || member
                  const slot = findSlotBySerial(serialNumber)
                  
                  let location = null
                  if (slot?.location) {
                    location = locations?.find(l => {
                      if (!l.name) return false
                      const locName = l.name.trim().toLowerCase()
                      const slotLoc = String(slot.location).trim().toLowerCase()
                      return locName === slotLoc || locName.includes(slotLoc) || slotLoc.includes(locName)
                    })
                  }
                  
                  // Obține producătorul (din slot direct sau din cabinet/game_mix)
                  const finalProvider = slot?.provider || getProviderFromRelated(slot) || '-'
                  
                  return {
                    nr: index + 1,
                    serialNumber,
                    provider: finalProvider,
                    cabinet: slot?.cabinet || '-',
                    gameMix: slot?.game_mix || '-',
                    location: slot?.location || '-',
                    gamingPlaces: slot?.gaming_places ? Number(slot.gaming_places) : 0,
                    address: location?.address || slot?.address || '-'
                  }
                })
                
                // Filtrează datele
                const filteredTableData = allTableData.filter(item => {
                  const matchesProvider = providerFilter === 'all' || item.provider === providerFilter
                  const matchesCabinet = cabinetFilter === 'all' || item.cabinet === cabinetFilter
                  const matchesGameMix = gameMixFilter === 'all' || item.gameMix === gameMixFilter
                  return matchesProvider && matchesCabinet && matchesGameMix
                })
                
                // Obține valori unice pentru filtre
                const uniqueProviders = [...new Set(allTableData.map(item => item.provider).filter(p => p !== '-'))].sort()
                const uniqueCabinets = [...new Set(allTableData.map(item => item.cabinet).filter(c => c !== '-'))].sort()
                const uniqueGameMixes = [...new Set(allTableData.map(item => item.gameMix).filter(g => g !== '-'))].sort()
                
                // Calculează centralizator pe săli
                const locationProviderMap = {}
                allTableData.forEach(item => {
                  if (item.location && item.location !== '-' && item.provider && item.provider !== '-') {
                    if (!locationProviderMap[item.location]) {
                      locationProviderMap[item.location] = {}
                    }
                    if (!locationProviderMap[item.location][item.provider]) {
                      locationProviderMap[item.location][item.provider] = 0
                    }
                    locationProviderMap[item.location][item.provider] += item.gamingPlaces
                  }
                })
                
                const allLocations = Object.keys(locationProviderMap).sort()
                const allProviders = [...new Set(allTableData.map(item => item.provider).filter(p => p !== '-'))].sort()
                
                // Calculează totaluri
                const providerTotals = {}
                allProviders.forEach(provider => {
                  providerTotals[provider] = allTableData
                    .filter(item => item.provider === provider)
                    .reduce((sum, item) => sum + item.gamingPlaces, 0)
                })
                
                const locationTotals = {}
                allLocations.forEach(location => {
                  locationTotals[location] = Object.values(locationProviderMap[location] || {}).reduce((sum, val) => sum + val, 0)
                })
                
                const grandTotal = allTableData.reduce((sum, item) => sum + item.gamingPlaces, 0)
                
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-500" />
                        Centralizator Numere de Serii ({filteredTableData.length})
                      </h3>
                      <button
                        onClick={() => {
                          const exportData = filteredTableData.map(item => ({
                            'Nr.': item.nr,
                            'Număr de Serii': item.serialNumber,
                            'Producător': item.provider,
                            'Cabinet': item.cabinet,
                            'Game Mix': item.gameMix,
                            'Locație': item.location,
                            'Locuri de Joc': item.gamingPlaces,
                            'Adresă Locație': item.address
                          }))
                          
                          const wb = XLSX.utils.book_new()
                          const ws = XLSX.utils.json_to_sheet(exportData)
                          
                          const colWidths = [
                            { wch: 5 },   // Nr.
                            { wch: 20 },  // Număr de Serii
                            { wch: 20 },  // Producător
                            { wch: 15 },  // Cabinet
                            { wch: 20 },  // Game Mix
                            { wch: 20 },  // Locație
                            { wch: 15 },  // Locuri de Joc
                            { wch: 40 }   // Adresă Locație
                          ]
                          ws['!cols'] = colWidths
                          
                          XLSX.utils.book_append_sheet(wb, ws, 'Numere de Serii')
                          
                          const fileName = `Comisie_${commission.name || commission.id}_Numere_Serii_${new Date().toISOString().split('T')[0]}.xlsx`
                          XLSX.writeFile(wb, fileName)
                          toast.success('✅ Excel exportat cu succes!')
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="Export to Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="text-sm font-medium">Export Excel</span>
                      </button>
                    </div>
                    
                    {/* Filtre */}
                    <div className="mb-4 flex flex-wrap gap-4 flex-shrink-0">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Producător
                        </label>
                        <select
                          value={providerFilter}
                          onChange={(e) => setProviderFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">Toți</option>
                          {uniqueProviders.map(provider => (
                            <option key={provider} value={provider}>{provider}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Cabinet
                        </label>
                        <select
                          value={cabinetFilter}
                          onChange={(e) => setCabinetFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">Toate</option>
                          {uniqueCabinets.map(cabinet => (
                            <option key={cabinet} value={cabinet}>{cabinet}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Game Mix
                        </label>
                        <select
                          value={gameMixFilter}
                          onChange={(e) => setGameMixFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">Toate</option>
                          {uniqueGameMixes.map(gameMix => (
                            <option key={gameMix} value={gameMix}>{gameMix}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg overflow-y-auto flex-1" style={{ maxHeight: expandedSerialNumbers ? 'none' : '100%' }}>
                      <table className="min-w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
                              Nr.
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Număr de Serii
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Producător
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Cabinet
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Game Mix
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Locație
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Locuri de Joc
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                              Adresă Locație
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                          {(expandedSerialNumbers ? filteredTableData : filteredTableData.slice(0, 50)).map((item, index) => (
                            <tr 
                              key={index}
                              className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                                {item.nr}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {item.serialNumber}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {item.provider}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {item.cabinet}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {item.gameMix}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {item.location}
                              </td>
                              <td 
                                className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                onClick={() => {
                                  setEditingGamingPlaces(item.serialNumber)
                                  setEditingValue(item.gamingPlaces.toString())
                                }}
                                title="Click pentru a edita"
                              >
                                {editingGamingPlaces === item.serialNumber ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={async () => {
                                      const newValue = parseInt(editingValue) || 0
                                      if (newValue !== item.gamingPlaces) {
                                        try {
                                          // Găsește slot-ul după serial_number
                                          const slot = slots?.find(s => {
                                            const normalizeSerial = (serial) => {
                                              if (!serial) return ''
                                              return String(serial).trim().replace(/\s+/g, '').toLowerCase()
                                            }
                                            const normalized = normalizeSerial(s.serial_number)
                                            const itemSerial = normalizeSerial(item.serialNumber)
                                            return normalized === itemSerial || 
                                                   s.slot_id === item.serialNumber ||
                                                   normalizeSerial(s.slot_id) === itemSerial
                                          })
                                          
                                          if (!slot) {
                                            // Caută în warehouse
                                            const warehouseItem = warehouse?.find(w => {
                                              const normalizeSerial = (serial) => {
                                                if (!serial) return ''
                                                return String(serial).trim().replace(/\s+/g, '').toLowerCase()
                                              }
                                              const normalized = normalizeSerial(w.serial_number)
                                              const itemSerial = normalizeSerial(item.serialNumber)
                                              return normalized === itemSerial
                                            })
                                            
                                            if (warehouseItem) {
                                              // Actualizează în warehouse (dacă există endpoint)
                                              toast.error('Nu se poate edita pentru sloturile din depozit')
                                              setEditingGamingPlaces(null)
                                              return
                                            } else {
                                              toast.error('Slot-ul nu a fost găsit')
                                              setEditingGamingPlaces(null)
                                              return
                                            }
                                          }
                                          
                                          // Actualizează în backend
                                          const token = sessionStorage.getItem('authToken')
                                          const response = await fetch(`/api/slots/${slot.id}`, {
                                            method: 'PUT',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                            },
                                            body: JSON.stringify({
                                              ...slot,
                                              gaming_places: newValue
                                            })
                                          })
                                          
                                          if (!response.ok) {
                                            throw new Error('Eroare la actualizare')
                                          }
                                          
                                          toast.success(`Locuri de joc actualizate: ${item.gamingPlaces} → ${newValue}`)
                                          
                                          // Reîncarcă datele din context (slots, warehouse)
                                          if (loadAllData) {
                                            await loadAllData()
                                          }
                                          
                                          // Reîncarcă comisia pentru a recalcula totalurile
                                          await loadCommission()
                                        } catch (error) {
                                          console.error('Error updating gaming places:', error)
                                          toast.error('Eroare la actualizarea locurilor de joc')
                                        }
                                      }
                                      setEditingGamingPlaces(null)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.target.blur()
                                      } else if (e.key === 'Escape') {
                                        setEditingGamingPlaces(null)
                                      }
                                    }}
                                    className="w-16 px-2 py-1 text-center border border-blue-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    autoFocus
                                  />
                                ) : (
                                  item.gamingPlaces
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                                {item.address}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {!expandedSerialNumbers && filteredTableData.length > 50 && (
                      <div className="mt-4 flex items-center justify-center">
                        <button
                          onClick={() => setExpandedSerialNumbers(true)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                          <span className="text-sm font-medium">Afișează toate ({filteredTableData.length} înregistrări)</span>
                        </button>
                      </div>
                    )}
                    
                    {expandedSerialNumbers && filteredTableData.length > 50 && (
                      <div className="mt-4 flex items-center justify-center">
                        <button
                          onClick={() => setExpandedSerialNumbers(false)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                          <span className="text-sm font-medium">Ascunde (afișează primele 50)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Notes */}
            {commission.notes && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-500" />
                  Note
                </h3>
                <p className="text-slate-800 dark:text-slate-200">{commission.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Renewal Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-semibold text-white">Reînnoire Comisie</h3>
                </div>
                <button
                  onClick={() => {
                    setShowRenewalModal(false)
                    setSelectedSerials([])
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <span className="text-white text-xl">×</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Selectează aparatele care continuă cu reînnoirea comisiei. Aparatele selectate vor forma o nouă comisie cu date noi.
              </p>
              
              {/* Date inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Comisie *
                  </label>
                  <input
                    type="date"
                    id="renewal-commission-date"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={renewalCommissionDate}
                    onChange={(e) => {
                      setRenewalCommissionDate(e.target.value)
                      // Când se schimbă data comisiei, recalculează automat data expirării
                      if (e.target.value) {
                        const commissionDate = new Date(e.target.value)
                        if (!isNaN(commissionDate.getTime())) {
                          // Data expirării = data comisiei + 1 an - 1 zi
                          const expiryDate = new Date(commissionDate)
                          expiryDate.setFullYear(expiryDate.getFullYear() + 1)
                          expiryDate.setDate(expiryDate.getDate() - 1)
                          setRenewalExpiryDate(expiryDate.toISOString().split('T')[0])
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Expirării *
                  </label>
                  <input
                    type="date"
                    id="renewal-expiry-date"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={renewalExpiryDate}
                    onChange={(e) => setRenewalExpiryDate(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Filtre */}
              {(() => {
                // Calculează valorile unice pentru filtre
                const normalizeSerial = (serial) => {
                  if (!serial) return ''
                  return String(serial).trim().replace(/\s+/g, '').toLowerCase()
                }
                
                const findSlotBySerial = (sn) => {
                  if (!sn || !slots) return null
                  const normalized = normalizeSerial(sn)
                  let slot = slots.find(s => normalizeSerial(s.serial_number) === normalized || normalizeSerial(s.slot_id) === normalized)
                  if (!slot && warehouse) {
                    const wh = warehouse.find(w => normalizeSerial(w.serial_number) === normalized)
                    if (wh) slot = wh
                  }
                  return slot
                }
                
                const getProviderFromRelated = (slot) => {
                  if (!slot) return null
                  if (slot.provider) return slot.provider
                  if (slot.cabinet && cabinets) {
                    const cab = cabinets.find(c => String(c.name || '').trim() === String(slot.cabinet || '').trim())
                    if (cab?.provider) return cab.provider
                  }
                  if (slot.game_mix && gameMixes) {
                    const gm = gameMixes.find(g => String(g.name || '').trim() === String(slot.game_mix || '').trim())
                    if (gm?.provider) return gm.provider
                  }
                  return null
                }
                
                const allRenewalData = members.map(member => {
                  const serialNumber = typeof member === 'string' ? member : member.serial_number || member
                  const slot = findSlotBySerial(serialNumber)
                  const provider = slot?.provider || getProviderFromRelated(slot) || '-'
                  const cabinet = slot?.cabinet || '-'
                  const gameMix = slot?.game_mix || '-'
                  let location = null
                  if (slot?.location) {
                    location = locations?.find(l => {
                      if (!l.name) return false
                      const locName = l.name.trim().toLowerCase()
                      const slotLoc = String(slot.location).trim().toLowerCase()
                      return locName === slotLoc || locName.includes(slotLoc) || slotLoc.includes(locName)
                    })
                  }
                  
                  return {
                    serialNumber,
                    provider,
                    cabinet,
                    gameMix,
                    location: slot?.location || '-',
                    locationName: location?.name || slot?.location || '-'
                  }
                })
                
                const uniqueProviders = [...new Set(allRenewalData.map(item => item.provider).filter(p => p !== '-'))].sort()
                const uniqueCabinets = [...new Set(allRenewalData.map(item => item.cabinet).filter(c => c !== '-'))].sort()
                const uniqueGameMixes = [...new Set(allRenewalData.map(item => item.gameMix).filter(g => g !== '-'))].sort()
                
                const filteredRenewalData = allRenewalData.filter(item => {
                  const matchesProvider = renewalProviderFilter === 'all' || item.provider === renewalProviderFilter
                  const matchesCabinet = renewalCabinetFilter === 'all' || item.cabinet === renewalCabinetFilter
                  const matchesGameMix = renewalGameMixFilter === 'all' || item.gameMix === renewalGameMixFilter
                  return matchesProvider && matchesCabinet && matchesGameMix
                })
                
                return (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Producător
                        </label>
                        <select
                          value={renewalProviderFilter}
                          onChange={(e) => setRenewalProviderFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">Toți</option>
                          {uniqueProviders.map(provider => (
                            <option key={provider} value={provider}>{provider}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Cabinet
                        </label>
                        <select
                          value={renewalCabinetFilter}
                          onChange={(e) => setRenewalCabinetFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">Toate</option>
                          {uniqueCabinets.map(cabinet => (
                            <option key={cabinet} value={cabinet}>{cabinet}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Game Mix
                        </label>
                        <select
                          value={renewalGameMixFilter}
                          onChange={(e) => setRenewalGameMixFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="all">Toate</option>
                          {uniqueGameMixes.map(gameMix => (
                            <option key={gameMix} value={gameMix}>{gameMix}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Serial numbers list with checkboxes */}
                    <div className="border border-slate-300 dark:border-slate-700 rounded-lg max-h-96 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={filteredRenewalData.length > 0 && filteredRenewalData.every(item => selectedSerials.includes(item.serialNumber))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSerials = filteredRenewalData.map(item => item.serialNumber)
                                    setSelectedSerials([...new Set([...selectedSerials, ...newSerials])])
                                  } else {
                                    const filteredSerials = filteredRenewalData.map(item => item.serialNumber)
                                    setSelectedSerials(selectedSerials.filter(s => !filteredSerials.includes(s)))
                                  }
                                }}
                                className="rounded border-slate-300"
                              />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Număr de Serii</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Producător</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Cabinet</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Game Mix</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Locație</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                          {filteredRenewalData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedSerials.includes(item.serialNumber)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSerials([...selectedSerials, item.serialNumber])
                                    } else {
                                      setSelectedSerials(selectedSerials.filter(s => s !== item.serialNumber))
                                    }
                                  }}
                                  className="rounded border-slate-300"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.serialNumber}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.provider}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.cabinet}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.gameMix}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.locationName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                {selectedSerials.length > 0 ? `${selectedSerials.length} aparat(e) selectat(e)` : 'Selectează cel puțin un aparat'}
              </p>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRenewalModal(false)
                  setSelectedSerials([])
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={async () => {
                  if (selectedSerials.length === 0) {
                    toast.error('Selectează cel puțin un aparat')
                    return
                  }
                  
                  if (!renewalCommissionDate || !renewalExpiryDate) {
                    toast.error('Completează ambele date')
                    return
                  }
                  
                  try {
                    const token = sessionStorage.getItem('authToken')
                    const response = await fetch('/api/commissions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({
                        name: `${commission.name} - Reînnoire ${new Date().toLocaleDateString('ro-RO')}`,
                        serial_numbers: selectedSerials.join('\n'),
                        commission_date: renewalCommissionDate,
                        expiry_date: renewalExpiryDate,
                        notes: `Reînnoire comisie #${commission.id}`
                      })
                    })
                    
                    if (!response.ok) {
                      throw new Error('Eroare la crearea comisiei')
                    }
                    
                    toast.success(`Comisie reînnoită cu ${selectedSerials.length} aparate`)
                    setShowRenewalModal(false)
                    setSelectedSerials([])
                    setRenewalCommissionDate('')
                    setRenewalExpiryDate('')
                    navigate('/metrology?tab=commissions')
                  } catch (error) {
                    console.error('Error renewing commission:', error)
                    toast.error('Eroare la reînnoirea comisiei')
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={selectedSerials.length === 0}
              >
                Creează Comisie Reînnoită
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Confirmă ștergerea
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ești sigur că vrei să ștergi comisia "{commission.name}"? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default CommissionDetail
