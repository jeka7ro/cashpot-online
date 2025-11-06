import React, { useState, useEffect } from 'react'
import { FileText, Plus, Download, Eye, Edit, Trash2, ArrowLeft, Calendar, MapPin, DollarSign, Ruler } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import ContractModal from './modals/ContractModal'
import MultiPDFViewer from './MultiPDFViewer'

const LocationContracts = ({ locationId, locationName }) => {
  const { contracts, locations, proprietari, createItem, updateItem, deleteItem, loading } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [filteredContracts, setFilteredContracts] = useState([])
  const [viewingContract, setViewingContract] = useState(null)

  // Filter contracts by location
  useEffect(() => {
    if (contracts) {
      if (locationId) {
        // Show contracts for specific location
        const filtered = contracts.filter(contract => contract.location_id == locationId)
        setFilteredContracts(filtered)
      } else {
        // Show all contracts
        setFilteredContracts(contracts)
      }
    } else {
      setFilteredContracts([])
    }
  }, [contracts, locationId])

  const handleAddContract = () => {
    setEditingContract(null)
    setShowAddModal(true)
  }

  const handleViewContract = (contract) => {
    setViewingContract(contract)
  }

  const handleDownloadContract = (contract) => {
    // TODO: Implement contract download
    console.log('Download contract:', contract)
  }

  const handleEditContract = (contract) => {
    setEditingContract(contract)
    setShowAddModal(true)
  }

  const handleDeleteContract = async (contract) => {
    if (window.confirm(`Sigur doriți să ștergeți contractul "${contract.contract_number}"?`)) {
      await deleteItem('contracts', contract.id)
    }
  }

  const handleSaveContract = async (data) => {
    if (editingContract) {
      await updateItem('contracts', editingContract.id, data)
    } else {
      await createItem('contracts', data)
    }
    setShowAddModal(false)
    setEditingContract(null)
  }

  // Parse annexes if JSONB string
  const getContractAnnexes = (contract) => {
    if (!contract) return []
    return Array.isArray(contract.annexes) 
      ? contract.annexes 
      : (typeof contract.annexes === 'string' ? JSON.parse(contract.annexes) : [])
  }

  // If viewing a contract, show detail view
  if (viewingContract) {
    const location = locations?.find(l => l.id === viewingContract.location_id)
    const proprietar = proprietari?.find(p => p.id === viewingContract.proprietar_id)
    const contractAnnexes = getContractAnnexes(viewingContract)

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setViewingContract(null)}
          className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Înapoi la Lista Contracte</span>
        </button>

        {/* Contract Detail Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">
                  {viewingContract.contract_number}
                </h2>
                <p className="text-green-100">{viewingContract.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEditContract(viewingContract)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Editează</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Sigur vrei să ștergi acest contract?')) {
                    handleDeleteContract(viewingContract)
                    setViewingContract(null)
                  }
                }}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Șterge</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contract Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info Cards */}
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-600" />
                Informații Contract
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Tip</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingContract.type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    viewingContract.status === 'Active' ? 'bg-green-100 text-green-800' :
                    viewingContract.status === 'Expired' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {viewingContract.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Location & Proprietar */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Locație & Proprietar
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Locație</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{location?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Proprietar</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{proprietar?.name || 'N/A'}</p>
                </div>
                {viewingContract.surface_area && (
                  <div>
                    <p className="text-sm text-slate-500">Suprafață</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                      <Ruler className="w-4 h-4 mr-1 text-purple-600" />
                      {viewingContract.surface_area} m²
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Info */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-yellow-600" />
                Informații Financiare
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Chiria Lunară</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {parseFloat(viewingContract.monthly_rent || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {viewingContract.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Depozit</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {parseFloat(viewingContract.deposit || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {viewingContract.currency}
                  </p>
                </div>
                {viewingContract.payment_terms && (
                  <div>
                    <p className="text-sm text-slate-500">Termeni Plată</p>
                    <p className="text-slate-800 dark:text-slate-200">{viewingContract.payment_terms}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                Perioadă
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Dată Început</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingContract.start_date ? new Date(viewingContract.start_date).toLocaleDateString('ro-RO') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Dată Sfârșit</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingContract.end_date ? new Date(viewingContract.end_date).toLocaleDateString('ro-RO') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {viewingContract.description && (
              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Descriere</h3>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewingContract.description}</p>
              </div>
            )}
          </div>

          {/* Right Column - Contract Documents */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-600" />
                Documente Contract
              </h3>
              
              {/* Multi PDF Viewer - Contract + Anexe */}
              <MultiPDFViewer
                files={[
                  ...(viewingContract.contract_file ? [{
                    name: `Contract ${viewingContract.contract_number}`,
                    type: 'Contract Principal',
                    file_path: viewingContract.contract_file,
                    url: viewingContract.contract_file,
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
    )
  }

  // Default view - Contracts Table
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Contracte - {locationName}</h3>
          <p className="text-slate-600 dark:text-slate-400">Gestionează contractele asociate acestei locații</p>
        </div>
        <button 
          onClick={handleAddContract}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Adaugă Contract</span>
        </button>
      </div>

      {/* Contracts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nr. Contract
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tip Contract
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Perioadă
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chiria Lunară
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Proprietar
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="table-row hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">
                      {contract.contract_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-700 font-medium">
                      {contract.title}
                    </div>
                    <div className="text-slate-500 text-sm">
                      {contract.type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-600 text-sm">
                      {new Date(contract.start_date).toLocaleDateString('ro-RO')} - {new Date(contract.end_date).toLocaleDateString('ro-RO')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-700 font-sans">
                      {parseFloat(contract.monthly_rent || 0).toLocaleString('ro-RO')} {contract.currency}
                    </div>
                    {contract.deposit && (
                      <div className="text-slate-500 text-xs">
                        Depozit: {parseFloat(contract.deposit).toLocaleString('ro-RO')} {contract.currency}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-700 font-medium">
                      {contract.proprietar_name || 'N/A'}
                    </div>
                    {contract.proprietar_contact && (
                      <div className="text-slate-500 text-xs">
                        {contract.proprietar_contact}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      contract.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : contract.status === 'Inactive'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {contract.status === 'Active' ? 'Activ' : 
                       contract.status === 'Inactive' ? 'Inactiv' :
                       contract.status === 'Expired' ? 'Expirat' :
                       contract.status === 'Pending' ? 'În așteptare' : contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleViewContract(contract)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Vezi contract"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleDownloadContract(contract)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-lg hover:bg-green-50 transition-colors"
                        title="Descarcă contract"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditContract(contract)}
                        className="text-yellow-600 hover:text-yellow-900 p-1 rounded-lg hover:bg-yellow-50 transition-colors"
                        title="Editează contract"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteContract(contract)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Șterge contract"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredContracts.length === 0 && (
        <div className="card p-12 text-center">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl inline-block mb-6">
            <FileText className="w-16 h-16 text-blue-500 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-4">Nu există contracte</h3>
          <p className="text-slate-600 mb-6">
            Adaugă primul contract pentru această locație
          </p>
          <button 
            onClick={handleAddContract}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <Plus size={18} />
            <span>Adaugă Contract</span>
          </button>
        </div>
      )}

      {/* Contract Modal */}
      {showAddModal && (
        <ContractModal
          item={editingContract}
          onClose={() => {
            setShowAddModal(false)
            setEditingContract(null)
          }}
          onSave={handleSaveContract}
          locationId={locationId}
        />
      )}
    </div>
  )
}

export default LocationContracts
