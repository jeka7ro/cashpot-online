import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Building2, MapPin, BarChart3, Gamepad2, Calendar, DollarSign, Eye } from 'lucide-react'
import Layout from '../components/Layout'
import PDFViewer from '../components/PDFViewer'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { slots, companies, locations, providers, cabinets, gameMixes } = useData()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`)
      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSlotDetails = (serialNumber) => {
    return slots.find(slot => slot.serial_number === serialNumber) || null
  }

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId)
    return location ? location.name : 'Necunoscută'
  }

  const getProviderName = (providerName) => {
    const provider = providers.find(prov => prov.name === providerName)
    return provider ? provider.name : providerName
  }

  const getCabinetName = (cabinetName) => {
    const cabinet = cabinets.find(cab => cab.name === cabinetName)
    return cabinet ? cabinet.name : cabinetName
  }

  const getGameMixName = (gameMixName) => {
    const gameMix = gameMixes.find(gm => gm.name === gameMixName)
    return gameMix ? gameMix.name : gameMixName
  }

  const handleDownloadPDF = () => {
    if (invoice?.file_path) {
      const link = document.createElement('a')
      link.href = invoice.file_path
      link.download = `factura_${invoice.invoice_number}.pdf`
      link.target = '_blank'
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Factura nu a fost găsită</h1>
          <button
            onClick={() => navigate('/invoices')}
            className="btn-primary"
          >
            Înapoi la Facturi
          </button>
        </div>
      </div>
    )
  }

  const serialNumbers = invoice.serial_number ? 
    (typeof invoice.serial_number === 'string' ? JSON.parse(invoice.serial_number) : invoice.serial_number) 
    : []
  const invoiceLocations = invoice.location ? 
    (typeof invoice.location === 'string' ? 
      (() => {
        try {
          // Handle double-encoded JSON strings
          const parsed = JSON.parse(invoice.location)
          return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
        } catch {
          return []
        }
      })() 
      : invoice.location) 
    : []

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/invoices')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                    Factura {invoice.invoice_number}
                  </h1>
                  <p className="text-blue-100">
                    Detalii complete despre factură
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Descarcă PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informații Factură */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Informații Factură
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Număr Factură</label>
                  <p className="text-slate-800 font-medium">{invoice.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Cumpărător</label>
                  <p className="text-slate-800">{invoice.company}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Vânzător</label>
                  <p className="text-slate-800 dark:text-slate-200">{invoice.invoice_type}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Tip</label>
                  <p className="text-slate-800 dark:text-slate-200">{invoice.invoice_type}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Suma</label>
                  <p className="text-slate-800 font-bold text-lg">{invoice.amount} {invoice.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Status</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    invoice.status === 'Paid' 
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                {invoice.description && (
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Descriere</label>
                    <p className="text-slate-800">{invoice.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Locații */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Locații
              </h2>
              <div className="space-y-2">
                {Array.isArray(invoiceLocations) && invoiceLocations.length > 0 ? (
                  invoiceLocations.map((location, index) => {
                    // Ensure location is a string, not an object or array
                    const locationName = typeof location === 'string' 
                      ? location 
                      : location?.name || location?.city || JSON.stringify(location)
                    
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-slate-700 dark:text-slate-300">{locationName}</span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">Toate locațiile</p>
                )}
              </div>
            </div>
          </div>

          {/* PDF Viewer și Tabel Serii */}
          <div className="lg:col-span-2">
            {/* Multi PDF Viewer - Afișează TOATE documentele */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-red-600" />
                Documente Factură
              </h2>
              <MultiPDFViewer 
                files={[
                  ...(invoice.file_path ? [{
                    name: `Factură ${invoice.invoice_number}`,
                    type: 'Factură Principală',
                    file_path: invoice.file_path,
                    url: invoice.file_path,
                    id: 'main'
                  }] : []),
                  ...(invoice.attachments || []).map(att => ({
                    ...att,
                    file_path: att.file_path || att.url,
                    url: att.url || att.file_path
                  }))
                ]}
                title="Documente Factură"
                placeholder="PDF-ul facturii nu este disponibil"
                placeholderSubtext="Atașează PDF-ul facturii pentru vizualizare"
              />
            </div>

            {/* Tabel Serii */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Serii Asociate ({serialNumbers.length})
              </h2>
              {serialNumbers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Serial Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Locație</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Furnizor</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Cabinet</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Game Mix</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {serialNumbers.map((serialNumber, index) => {
                        const slot = getSlotDetails(serialNumber)
                        return (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {serialNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {slot ? slot.location : 'Necunoscută'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {slot ? slot.provider : 'Necunoscut'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {slot ? slot.cabinet : 'Necunoscut'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {slot ? slot.game_mix : 'Necunoscut'}
                            </td>
                            <td className="px-4 py-3">
                              {slot ? (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  slot.status === 'Active' 
                                    ? 'bg-green-100 text-green-800'
                                    : slot.status === 'Inactive'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {slot.status}
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Nu există serii asociate cu această factură</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  )
}

export default InvoiceDetail
