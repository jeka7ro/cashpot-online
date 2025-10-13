import React, { useState, useEffect } from 'react'
import { FileText, Plus, Download, Eye, Edit, Trash2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import ContractModal from './modals/ContractModal'

const LocationContracts = ({ locationId, locationName }) => {
  const { contracts, createItem, updateItem, deleteItem, loading } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [filteredContracts, setFilteredContracts] = useState([])

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
    // TODO: Implement contract viewing
    console.log('View contract:', contract)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Contracte - {locationName}</h3>
          <p className="text-slate-600">Gestionează contractele asociate acestei locații</p>
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
