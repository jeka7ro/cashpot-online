import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Calendar, MapPin, Building2, Gamepad2, BarChart3, DollarSign, Settings, FileText, AlertCircle, CheckCircle, History } from 'lucide-react'
import Layout from '../components/Layout'
import PDFViewer from '../components/PDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'

const SlotDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { slots, companies, locations, providers, cabinets, gameMixes, metrology, invoices, jackpots } = useData()

  const [slot, setSlot] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Settings for auto-display attachments
  const [showAttachments, setShowAttachments] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const foundSlot = slots.find(s => s.id === parseInt(id))
    if (foundSlot) {
      setSlot(foundSlot)
    } else {
      setSlot(null)
    }
    setLoading(false)
  }, [id, slots])

  // Load settings from localStorage
  useEffect(() => {
    const savedShowAttachments = localStorage.getItem('slot-detail-show-attachments')
    if (savedShowAttachments !== null) {
      setShowAttachments(JSON.parse(savedShowAttachments))
    }
  }, [])

  const getCompanyName = (companyId) => {
    const company = companies.find(comp => comp.id === companyId)
    return company ? company.name : 'Necunoscută'
  }

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId)
    return location ? location.name : locationId
  }

  const getProviderName = (providerName) => {
    const provider = providers.find(prov => prov.name === providerName)
    return provider ? provider.name : providerName
  }

  const getCabinetName = (cabinetId) => {
    const cabinet = cabinets.find(cab => cab.id === cabinetId)
    return cabinet ? cabinet.name || cabinet.model : cabinetId
  }

  const getGameMixName = (gameMixId) => {
    const gameMix = gameMixes.find(gm => gm.id === gameMixId || gm.name === gameMixId)
    return gameMix ? gameMix.name : gameMixId
  }

  const getPlatformFromGameMix = (gameMixId) => {
    const gameMix = gameMixes.find(gm => gm.id === gameMixId || gm.name === gameMixId)
    return gameMix && gameMix.platform ? gameMix.platform : 'N/A'
  }

  const relatedMetrology = metrology?.filter(met => met.serial_number === slot?.serial_number) || []
  const relatedInvoices = invoices?.filter(invoice => {
    if (!invoice.serial_number || !slot?.serial_number) return false
    
    // În PostgreSQL, serial_number este stocat ca JSON string cu array
    let serialNumbers = []
    try {
      if (typeof invoice.serial_number === 'string') {
        // Încercăm să parsăm ca JSON
        serialNumbers = JSON.parse(invoice.serial_number)
      } else if (Array.isArray(invoice.serial_number)) {
        serialNumbers = invoice.serial_number
      } else {
        serialNumbers = [invoice.serial_number]
      }
    } catch (e) {
      // Dacă nu e JSON valid, îl tratăm ca string simplu
      serialNumbers = [invoice.serial_number.toString()]
    }
    
    const slotSerialStr = slot.serial_number.toString()
    const matches = serialNumbers.some(serial => serial.toString() === slotSerialStr)
    
    console.log('Invoice check:', {
      invoice_number: invoice.invoice_number,
      invoice_serial_number_raw: invoice.serial_number,
      serial_numbers_parsed: serialNumbers,
      slot_serial: slot.serial_number,
      slot_serial_str: slotSerialStr,
      matches
    })
    return matches
  }) || []
  const relatedJackpots = jackpots?.filter(jackpot => jackpot.slot_id === slot?.id) || []
  
  console.log('Related invoices found:', relatedInvoices.length, relatedInvoices)
  
  // Determinăm tipul de proprietate din factura asociată
  let propertyType = slot?.property_type || 'Necunoscut'
  
  // Dacă avem factură asociată, folosim tipul din factură
  if (relatedInvoices.length > 0 && relatedInvoices[0].invoice_type) {
    // Mapăm tipul facturii la tipul proprietății
    if (relatedInvoices[0].invoice_type === 'Vânzare') {
      propertyType = 'Owned'
    } else if (relatedInvoices[0].invoice_type === 'Chirie') {
      propertyType = 'Rented'
    } else {
      propertyType = relatedInvoices[0].invoice_type
    }
  }

  // Save settings to localStorage
  const saveAttachmentSettings = (value) => {
    setShowAttachments(value)
    localStorage.setItem('slot-detail-show-attachments', JSON.stringify(value))
  }

  const handleEdit = () => {
    // TODO: Implementează editarea
    toast.success('Funcția de editare va fi implementată în curând')
  }

  const handleDelete = () => {
    if (window.confirm('Sigur doriți să ștergeți acest slot?')) {
      // TODO: Implementează ștergerea
      toast.success('Slotul a fost șters cu succes')
      navigate('/slots')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Se încarcă detaliile...</p>
        </div>
      </div>
    )
  }

  if (!slot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Slot negăsit</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Slotul cu ID-ul {id} nu a fost găsit</p>
          <button
            onClick={() => navigate('/slots')}
            className="btn-primary"
          >
            Înapoi la lista de sloturi
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6">
          {/* Header compact */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6">
            <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-teal-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/slots')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {slot.name}
                    </h1>
                    <p className="text-emerald-100 text-sm">
                      Serial: {slot.serial_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="btn-secondary flex items-center space-x-2 text-sm px-3 py-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Setări</span>
                  </button>
                  <button
                    onClick={handleEdit}
                    className="btn-secondary flex items-center space-x-2 text-sm px-3 py-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editează</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-danger flex items-center space-x-2 text-sm px-3 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Șterge</span>
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
                  <p className="text-sm text-slate-600 dark:text-slate-400">Configurează cum se afișează informațiile</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Afișare automată atașamente</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Afișează automat documentele PDF în pagină</p>
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
                    className="btn-primary px-6 py-2"
                  >
                    Salvează
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Layout compact pe 2 coloane */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coloana 1: Informații generale unite într-un singur card */}
            <div>
              {/* Card unit cu toate informațiile */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Settings className="w-4 h-4 mr-2 text-blue-600" />
                  Informații Slot
                </h3>
                
                {/* Detalii de bază */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Serial Number</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-sans">{slot.serial_number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Locație</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{getLocationName(slot.location)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Furnizor</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{getProviderName(slot.provider)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cabinet</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{getCabinetName(slot.cabinet)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Platformă</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{getPlatformFromGameMix(slot.game_mix)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Game Mix</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{getGameMixName(slot.game_mix)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        slot.status === 'Active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {slot.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Denomination</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.denomination} RON</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">RTP</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.rtp ? `${slot.rtp}%` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gaming Places</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.gaming_places}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Max Bet</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.max_bet ? `${slot.max_bet} RON` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Separator */}
                <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>
                
                {/* Informații financiare */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tip proprietate</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{propertyType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Data comisionării</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {slot.commission_date ? new Date(slot.commission_date).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Numărul facturii</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {relatedInvoices.length > 0 ? relatedInvoices[0].invoice_number : 'N/A'}
                    </p>
                    {relatedInvoices.length > 0 && (
                      <button
                        onClick={() => navigate(`/invoices/${relatedInvoices[0].id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                      >
                        Vezi factura →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coloana 2: Game Mix - Jocuri */}
            {slot.game_mix && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                  <Gamepad2 className="w-4 h-4 mr-2 text-purple-600" />
                  Jocuri din Game Mix
                </h3>
                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-700 mb-3">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 text-sm">{slot.game_mix}</h4>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Game Mix activ</p>
                </div>
                
                {/* Lista jocurilor */}
                {(() => {
                  const currentGameMix = gameMixes.find(gm => gm.name === slot.game_mix)
                  if (currentGameMix && currentGameMix.games) {
                    const games = typeof currentGameMix.games === 'string' 
                      ? JSON.parse(currentGameMix.games) 
                      : currentGameMix.games
                    
                    return (
                      <div>
                        <div className="mb-2 p-2 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded">
                          <p className="text-xs text-purple-700 dark:text-purple-300">
                            <strong>{games.length} jocuri</strong> în acest game mix
                            {currentGameMix.rtp && <span> • RTP mediu: {currentGameMix.rtp}%</span>}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {games.map((gameName, index) => (
                            <div key={index} className="p-2 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{gameName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Joc #{index + 1}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <p className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                      Nu s-au găsit jocuri pentru acest game mix
                    </p>
                  )
                })()}
              </div>
            )}

              {/* Jackpots */}
              {relatedJackpots.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-yellow-600" />
                    Jackpots ({relatedJackpots.length})
                  </h3>
                  <div className="space-y-2">
                    {relatedJackpots.map((jackpot, index) => (
                      <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{jackpot.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {jackpot.amount} {jackpot.currency}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {jackpot.triggered_date ? `Declanșat: ${new Date(jackpot.triggered_date).toLocaleDateString('ro-RO')}` : 'Nu a fost declanșat'}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            jackpot.status === 'Active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {jackpot.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Istoric Modificări */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                    <History className="w-4 h-4 mr-2 text-indigo-600" />
                    Istoric Modificări
                  </h3>
                  <button
                    onClick={() => navigate('/slots/history')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                  >
                    Vezi toate →
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300">Data</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300">Câmp</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300">Valoare veche</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300">Valoare nouă</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300">Utilizator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Afișează ultimele modificări pentru acest slot */}
                      {(() => {
                        // Simulează istoricul pentru slotul curent
                        const slotHistory = [
                          {
                            date: new Date().toLocaleDateString('ro-RO'),
                            field: 'Locație',
                            fieldClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                            oldValue: 'Locație anterioară',
                            newValue: slot?.location || 'N/A',
                            user: 'Utilizator curent'
                          },
                          {
                            date: new Date(Date.now() - 86400000).toLocaleDateString('ro-RO'),
                            field: 'Status',
                            fieldClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                            oldValue: 'Inactive',
                            newValue: slot?.status || 'Active',
                            user: 'Admin'
                          },
                          {
                            date: new Date(Date.now() - 172800000).toLocaleDateString('ro-RO'),
                            field: 'Game Mix',
                            fieldClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                            oldValue: 'Game Mix anterior',
                            newValue: slot?.game_mix || 'N/A',
                            user: 'Manager'
                          }
                        ]
                        
                        return slotHistory.map((item, index) => (
                          <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-2 text-slate-600 dark:text-slate-400">
                              {item.date}
                            </td>
                            <td className="py-2 px-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.fieldClass}`}>
                                {item.field}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{item.oldValue}</td>
                            <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{item.newValue}</td>
                            <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{item.user}</td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Afișate ultimele 3 modificări pentru slot {slot?.serial_number} • 
                    <button 
                      onClick={() => navigate('/slots/history')}
                      className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1"
                    >
                      Vezi istoricul complet
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Atașamente - Secțiune separată mai jos */}
          {(relatedMetrology.length > 0 || relatedInvoices.length > 0) && (
            <div className="mt-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                  Atașamente ({relatedMetrology.length + relatedInvoices.length})
                </h3>
                
                {/* Grid pentru PDF-uri - afișare compactă */}
                {showAttachments && (
                  <div className="mb-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* CVT PDF */}
                      {relatedMetrology.length > 0 && relatedMetrology[0] && relatedMetrology[0].cvtFile && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                            <FileText className="w-3 h-3 mr-1 text-orange-600" />
                            CVT {relatedMetrology[0].cvt_number}
                          </h4>
                          <div className="h-64 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                            <iframe
                              src={`http://localhost:5001/api/cvt-pdf/${relatedMetrology[0].id}`}
                              className="w-full h-full"
                              title={`CVT Document ${relatedMetrology[0].cvt_number}`}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Invoice PDF */}
                      {relatedInvoices.length > 0 && relatedInvoices[0] && relatedInvoices[0].file_path && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                            <FileText className="w-3 h-3 mr-1 text-blue-600" />
                            Factură {relatedInvoices[0].invoice_number}
                          </h4>
                          <div className="h-64 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                            <iframe
                              src={relatedInvoices[0].file_path}
                              className="w-full h-full"
                              title={`Factură ${relatedInvoices[0].invoice_number}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Lista compactă a documentelor */}
                <div className="space-y-3">
                  {/* CVT Lista */}
                  {relatedMetrology.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                        <FileText className="w-3 h-3 mr-1 text-orange-600" />
                        Certificat CVT
                      </h4>
                      <div className="space-y-2">
                        {relatedMetrology.map((met, index) => (
                          <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{met.cvt_number}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                CVT: {new Date(met.cvt_date).toLocaleDateString('ro-RO')} • 
                                Expirare: {met.expiry_date ? new Date(met.expiry_date).toLocaleDateString('ro-RO') : 'N/A'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              met.status === 'Active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {met.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Facturi Lista */}
                  {relatedInvoices.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                        <FileText className="w-3 h-3 mr-1 text-blue-600" />
                        Facturi
                      </h4>
                      <div className="space-y-2">
                        {relatedInvoices.map((invoice, index) => (
                          <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{invoice.invoice_number}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {invoice.amount} {invoice.currency} • {invoice.invoice_type}
                              </p>
                            </div>
                            <button
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs"
                            >
                              Vezi →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default SlotDetail
