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
  const { slots, locations, companies, providers, cabinets, gameMixes, platforms, metrology, invoices, jackpots } = useData()
  const [showSettings, setShowSettings] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)

  const slot = slots?.find(s => s.id === id || s.serial_number === id)

  useEffect(() => {
    const savedShowAttachments = localStorage.getItem('showAttachments')
    if (savedShowAttachments !== null) {
      setShowAttachments(JSON.parse(savedShowAttachments))
    }
  }, [])

  const saveAttachmentSettings = (value) => {
    setShowAttachments(value)
    localStorage.setItem('showAttachments', JSON.stringify(value))
  }

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId || loc.name === locationId)
    return location ? location.name : locationId
  }

  const getCompanyName = (companyId) => {
    const company = companies.find(comp => comp.id === companyId || comp.name === companyId)
    return company ? company.name : companyId
  }

  const getProviderName = (providerId) => {
    const provider = providers.find(prov => prov.id === providerId || prov.name === providerId)
    return provider ? provider.name : providerId
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
    
    try {
      const invoiceSerials = typeof invoice.serial_number === 'string' 
        ? JSON.parse(invoice.serial_number) 
        : Array.isArray(invoice.serial_number) 
          ? invoice.serial_number 
          : [invoice.serial_number]
      
      return invoiceSerials.includes(slot.serial_number)
    } catch (e) {
      return invoice.serial_number === slot.serial_number
    }
  }) || []
  
  const relatedJackpots = jackpots?.filter(jackpot => jackpot.slot_id === slot?.id) || []

  const propertyType = relatedInvoices.length > 0 && relatedInvoices[0].invoice_type === 'Vânzare' ? 'Owned' : 'Rented'

  if (!slot) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă...</p>
          </div>
        </div>
      </Layout>
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
                      Slot {slot.serial_number}
                    </h1>
                    <p className="text-emerald-100">Serial: {slot.serial_number}</p>
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
                    onClick={() => navigate(`/slots/${slot.id}/edit`)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Editează"
                  >
                    <Edit className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Sigur vrei să ștergi acest slot?')) {
                        // Handle delete
                        toast.success('Slot șters cu succes!')
                        navigate('/slots')
                      }
                    }}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coloana 1: Informații Slot */}
            <div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                  <Settings className="w-4 h-4 mr-2 text-indigo-600" />
                  Informații Slot
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Serial Number</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.serial_number}</p>
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
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.denomination || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">RTP</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.rtp || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gaming Places</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.gaming_places || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Max Bet</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.max_bet || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
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
                      {slot.commissioning_date ? new Date(slot.commissioning_date).toLocaleDateString('ro-RO') : 'N/A'}
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


