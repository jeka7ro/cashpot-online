import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { Shield, Plus, Search, Upload, Download, Building2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'
import ONJNReportModal from '../components/modals/ONJNReportModal'
import * as XLSX from 'xlsx'

const ONJNReports = () => {
  const { onjnReports, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [stats, setStats] = useState(null)
  const [operators, setOperators] = useState([])
  const [operatorsLoading, setOperatorsLoading] = useState(true)

  // Load ONJN stats and operators
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators/stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error loading ONJN stats:', error)
      }
    }
    
    const loadOperators = async () => {
      try {
        setOperatorsLoading(true)
        const response = await fetch('https://cashpot-backend.onrender.com/api/onjn-operators?limit=1000')
        const data = await response.json()
        setOperators(data)
      } catch (error) {
        console.error('Error loading ONJN operators:', error)
      } finally {
        setOperatorsLoading(false)
      }
    }
    
    loadStats()
    loadOperators()
  }, [])

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredReports.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    
    if (window.confirm(`Ești sigur că vrei să ștergi ${selectedItems.length} elemente?`)) {
      try {
        for (const id of selectedItems) {
          await deleteItem('onjnReports', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Error bulk deleting:', error)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) return
    console.log('Bulk edit for:', selectedItems)
  }
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const filteredReports = onjnReports.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'id', label: '#', sortable: true },
    { key: 'name', label: 'NUME RAPORT', sortable: true },
    { key: 'type', label: 'TIP', sortable: true },
    { key: 'period', label: 'PERIOADA', sortable: true },
    { key: 'status', label: 'STATUS', sortable: true },
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { key: 'created_at', label: 'DATA CREARE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
      </div>
    )},
    { key: 'actions', label: 'ACȚIUNI', sortable: false }
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Sigur vrei să ștergi acest raport ONJN?')) {
      await deleteItem('onjnReports', id)
    }
  }

  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleSave = async (itemData) => {
    if (editingItem) {
      await updateItem('onjnReports', editingItem.id, itemData)
    } else {
      await createItem('onjnReports', itemData)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  // Export functions for ONJN operators
  const exportOperatorsToExcel = () => {
    try {
      const data = operators.map(op => ({
        'Serie': op.serial_number || '',
        'Companie': op.company_name || '',
        'Brand': op.brand_name || '',
        'Oraș': op.city || '',
        'Județ': op.county || '',
        'Status': op.status || '',
        'Licență': op.license_number || '',
        'Adresă': op.slot_address || '',
        'Data Autorizare': op.authorization_date ? new Date(op.authorization_date).toLocaleDateString('ro-RO') : '',
        'Data Expirare': op.expiry_date ? new Date(op.expiry_date).toLocaleDateString('ro-RO') : ''
      }))
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Operatori ONJN')
      XLSX.writeFile(wb, `operatori-onjn-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting operators to Excel:', error)
    }
  }

  const exportOperatorsToCSV = () => {
    try {
      const headers = ['Serie', 'Companie', 'Brand', 'Oraș', 'Județ', 'Status', 'Licență', 'Adresă', 'Data Autorizare', 'Data Expirare']
      const csvContent = [
        headers.join(','),
        ...operators.map(op => [
          `"${op.serial_number || ''}"`,
          `"${op.company_name || ''}"`,
          `"${op.brand_name || ''}"`,
          `"${op.city || ''}"`,
          `"${op.county || ''}"`,
          `"${op.status || ''}"`,
          `"${op.license_number || ''}"`,
          `"${op.slot_address || ''}"`,
          `"${op.authorization_date ? new Date(op.authorization_date).toLocaleDateString('ro-RO') : ''}"`,
          `"${op.expiry_date ? new Date(op.expiry_date).toLocaleDateString('ro-RO') : ''}"`
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `operatori-onjn-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting operators to CSV:', error)
    }
  }

  const handleExportExcel = () => {
    try {
      exportToExcel('onjnreports')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('onjnreports')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Rapoarte ONJN</h2>
                <p className="text-slate-600">Generează și gestionează rapoartele ONJN</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="onjnreports"
              />
              {showBulkActions && (
                <>
                  <button onClick={handleBulkEdit} className="btn-secondary flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Bulk Edit</span>
                  </button>
                  <button onClick={handleBulkDelete} className="btn-danger flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Bulk Delete</span>
                  </button>
                </>
              )}
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă Raport</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Access Card - ONJN Operators */}
        <div className="card p-6 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate('/onjn-operators')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Operatori ONJN</h3>
                <p className="text-slate-600 dark:text-slate-400">TOȚI operatorii din Registrul Public ONJN (până la 25,000 sloturi)</p>
              </div>
            </div>
            <ExternalLink className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Sloturi</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {stats?.total ? stats.total.toLocaleString('ro-RO') : 'Loading...'}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">În Exploatare</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {stats?.byStatus?.find(s => s.status === 'În exploatare')?.count || 'Loading...'}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">Filtre Avansate</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">✓</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">Auto Refresh</div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">✓</div>
            </div>
          </div>
        </div>

        {/* ONJN Operators Table */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tabel Operatori ONJN</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportOperatorsToExcel()}
                className="btn-secondary flex items-center space-x-2"
                title="Export Excel"
              >
                <Download className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => exportOperatorsToCSV()}
                className="btn-secondary flex items-center space-x-2"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
            </div>
          </div>
          {operatorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <span className="ml-2 text-slate-600">Se încarcă operatorii...</span>
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există operatori ONJN</h3>
              <p className="text-slate-500">Datele nu s-au încărcat</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Afișare {operators.length} operatori ONJN
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Serie</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Companie</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Brand</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Oraș</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Județ</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.slice(0, 50).map((operator, index) => (
                      <tr key={operator.id || index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {operator.serial_number || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.company_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.brand_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.city || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {operator.county || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            operator.status === 'În exploatare' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : operator.status === 'Scos din funcțiune'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {operator.status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {operators.length > 50 && (
                <div className="mt-4 text-center text-sm text-slate-500">
                  Afișare primele 50 din {operators.length} operatori
                </div>
              )}
            </>
          )}
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută rapoarte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="btn-secondary flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Importă</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există rapoarte ONJN</h3>
              <p className="text-slate-500">Adaugă primul raport pentru a începe</p>
            </div>
          ) : (
            <DataTable
              data={filteredReports}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
          moduleColor="blue"
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <ONJNReportModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  )
}

export default ONJNReports
