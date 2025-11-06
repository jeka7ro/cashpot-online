import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Calendar, MapPin, User, DollarSign, FileText, Building2, Ruler, Eye, Download } from 'lucide-react'
import Layout from '../components/Layout'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import ContractModal from '../components/modals/ContractModal'

const ContractDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contracts, locations, proprietari, loading } = useData()
  const [contract, setContract] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    const foundContract = contracts?.find(c => c.id === parseInt(id))
    if (foundContract) {
      setContract(foundContract)
    }
  }, [id, contracts])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă detaliile contractului...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!contract) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Contract negăsit</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Contractul solicitat nu există în sistem.</p>
            <button
              onClick={() => navigate('/contracts')}
              className="btn-primary"
            >
              Înapoi la Contracte
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const location = locations?.find(l => l.id === contract.location_id)
  const proprietar = proprietari?.find(p => p.id === contract.proprietar_id)

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleSaveEdit = async (updatedContract) => {
    try {
      await axios.put(`/api/contracts/${contract.id}`, updatedContract)
      toast.success('Contract actualizat cu succes!')
      setShowEditModal(false)
      // Refresh contract data
      const response = await axios.get(`/api/contracts`)
      const refreshedContract = response.data.find(c => c.id === contract.id)
      if (refreshedContract) {
        setContract(refreshedContract)
      }
    } catch (error) {
      console.error('Error updating contract:', error)
      toast.error('Eroare la actualizarea contractului')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Sigur vrei să ștergi acest contract?')) {
      try {
        await axios.delete(`/api/contracts/${contract.id}`)
        toast.success('Contract șters cu succes!')
        navigate('/contracts')
      } catch (error) {
        console.error('Error deleting contract:', error)
        toast.error('Eroare la ștergerea contractului')
      }
    }
  }

  // Parse annexes if JSONB string
  const contractAnnexes = Array.isArray(contract.annexes) 
    ? contract.annexes 
    : (typeof contract.annexes === 'string' ? JSON.parse(contract.annexes) : [])
  
  console.log('📋 Contract loaded:', {
    id: contract.id,
    contract_number: contract.contract_number,
    has_contract_file: !!contract.contract_file,
    annexes_count: contractAnnexes.length,
    annexes: contractAnnexes
  })

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 via-green-800 to-emerald-800 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/contracts')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </button>
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                      Contract {contract.contract_number}
                    </h1>
                    <p className="text-green-100">
                      {contract.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleEdit}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editează</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-danger flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Șterge</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Contract Info */}
            <div className="space-y-6">
              {/* Contract Info Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Informații Contract
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Număr Contract</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{contract.contract_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Titlu</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{contract.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tip</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{contract.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      contract.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      contract.status === 'Expired' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {contract.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Proprietar */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Locație & Proprietar
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Locație</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      {location?.name || 'N/A'}
                    </p>
                    {location?.address && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{location.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Proprietar</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      {proprietar?.name || 'N/A'}
                    </p>
                    {proprietar?.contact && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{proprietar.contact}</p>
                    )}
                  </div>
                  {contract.surface_area && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Suprafață</p>
                      <p className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                        <Ruler className="w-4 h-4 mr-1 text-purple-600" />
                        {contract.surface_area} m²
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Info */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-yellow-600" />
                  Informații Financiare
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Chiria Lunară</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {parseFloat(contract.monthly_rent || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {contract.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Depozit Garanție</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {parseFloat(contract.deposit || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {contract.currency}
                    </p>
                  </div>
                  {contract.payment_terms && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Termeni Plată</p>
                      <p className="text-base text-slate-800 dark:text-slate-200">{contract.payment_terms}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                  Perioada Contractuală
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Dată Început</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      {contract.start_date ? new Date(contract.start_date).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Dată Sfârșit</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      {contract.end_date ? new Date(contract.end_date).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                  {contract.start_date && contract.end_date && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Durată</p>
                      <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                        {Math.ceil((new Date(contract.end_date) - new Date(contract.start_date)) / (1000 * 60 * 60 * 24 * 30))} luni
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {contract.description && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Descriere</h2>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{contract.description}</p>
                </div>
              )}
            </div>

            {/* Right Column - Contract Documents */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Documente Contract
                </h2>
                
                {/* Multi PDF Viewer - Contract + Anexe */}
                <MultiPDFViewer
                  files={[
                    ...(contract.contract_file ? [{
                      name: `Contract ${contract.contract_number}`,
                      type: 'Contract Principal',
                      file_path: contract.contract_file,
                      url: contract.contract_file,
                      id: 'main'
                    }] : []),
                    ...contractAnnexes.map((annex, idx) => ({
                      name: annex.name || `Anexă ${idx + 1}`,
                      type: annex.type || 'Anexă Contract',
                      file_path: annex.url || annex.file_path,
                      url: annex.url || annex.file_path,
                      size: annex.size,
                      id: annex.id || `annex-${idx}`
                    }))
                  ]}
                  title="Documente Contract"
                  placeholder="Nu există documente atașate"
                  placeholderSubtext="Adaugă contract și anexe prin editare"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ContractModal
          item={contract}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
          locationId={contract.location_id}
        />
      )}
    </Layout>
  )
}

export default ContractDetail

