import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { useNavigate } from 'react-router-dom'
import { Activity, Plus, Search, Upload, Download, FileCheck, Settings, Wrench, ArrowLeft, Eye, Calendar } from 'lucide-react'
import DataTable from '../components/DataTable'
import MetrologyModal from '../components/modals/MetrologyModal'
import MetrologyDetailModal from '../components/modals/MetrologyDetailModal'
import ApprovalModal from '../components/modals/ApprovalModal'
import CommissionModal from '../components/modals/CommissionModal'
import SoftwareModal from '../components/modals/SoftwareModal'
import AuthorityModal from '../components/modals/AuthorityModal'
import ONJNCalendarModal from '../components/modals/ONJNCalendarModal'

const Metrology = () => {
  const { metrology, approvals, providers, cabinets, gameMixes, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [activeTab, setActiveTab] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewingItem, setViewingItem] = useState(null)
  
  // Sub-page states
  const [commissions, setCommissions] = useState([])
  const [software, setSoftware] = useState([])
  const [authorities, setAuthorities] = useState([])
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showCommissionModal, setShowCommissionModal] = useState(false)
  const [showSoftwareModal, setShowSoftwareModal] = useState(false)
  const [showAuthorityModal, setShowAuthorityModal] = useState(false)
  const [editingApproval, setEditingApproval] = useState(null)
  const [editingCommission, setEditingCommission] = useState(null)
  const [editingSoftware, setEditingSoftware] = useState(null)
  const [editingAuthority, setEditingAuthority] = useState(null)
  const [showONJNCalendar, setShowONJNCalendar] = useState(false)

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Load sub-page data
  useEffect(() => {
    const loadSubPageData = async () => {
      try {
        if (activeTab === 'commissions') {
          const response = await fetch('/api/commissions')
          const data = await response.json()
          setCommissions(data)
        } else if (activeTab === 'software') {
          const response = await fetch('/api/software')
          const data = await response.json()
          setSoftware(data)
        } else if (activeTab === 'authorities') {
          const response = await fetch('/api/authorities')
          const data = await response.json()
          setAuthorities(data)
        }
      } catch (error) {
        console.error('Error loading sub-page data:', error)
      }
    }

    if (activeTab) {
      loadSubPageData()
    }
  }, [activeTab])

  // Filter data based on active tab
  const filteredMetrology = metrology.filter(item => {
    const matchesSearch = item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.cabinet?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredMetrology.map(item => item.id))
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
          await deleteItem('metrology', id)
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

  // Modal functions
  const handleCreate = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Sigur vrei să ștergi acest element?`)) {
      await deleteItem('metrology', item.id)
    }
  }

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('metrology', editingItem.id, data)
    } else {
      await createItem('metrology', data)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  // Sub-page handlers
  const handleApprovalSave = async (data) => {
    try {
      if (editingApproval) {
        await updateItem('approvals', editingApproval.id, data)
      } else {
        await createItem('approvals', data)
      }
      setShowApprovalModal(false)
      setEditingApproval(null)
      // DataContext will handle state update automatically
    } catch (error) {
      console.error('Error saving approval:', error)
    }
  }

  const handleCommissionSave = async (data) => {
    try {
      const url = editingCommission ? `/api/commissions/${editingCommission.id}` : '/api/commissions'
      const method = editingCommission ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        setShowCommissionModal(false)
        setEditingCommission(null)
        // Reload data
        const response = await fetch('/api/commissions')
        const newData = await response.json()
        setCommissions(newData)
      }
    } catch (error) {
      console.error('Error saving commission:', error)
    }
  }

  const handleSoftwareSave = async (data) => {
    try {
      const url = editingSoftware ? `/api/software/${editingSoftware.id}` : '/api/software'
      const method = editingSoftware ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        setShowSoftwareModal(false)
        setEditingSoftware(null)
        // Reload data
        const response = await fetch('/api/software')
        const newData = await response.json()
        setSoftware(newData)
      }
    } catch (error) {
      console.error('Error saving software:', error)
    }
  }

  const [showDeleteApprovalModal, setShowDeleteApprovalModal] = useState(false)
  const [deletingApproval, setDeletingApproval] = useState(null)

  const handleApprovalDelete = (item) => {
    setDeletingApproval(item)
    setShowDeleteApprovalModal(true)
  }

  const confirmApprovalDelete = async () => {
    if (deletingApproval) {
      try {
        await deleteItem('approvals', deletingApproval.id)
      } catch (error) {
        console.error('Error deleting approval:', error)
      }
    }
    setShowDeleteApprovalModal(false)
    setDeletingApproval(null)
  }

  const handleCommissionDelete = async (item) => {
    if (window.confirm('Sigur vrei să ștergi această comisie?')) {
      try {
        const response = await fetch(`/api/commissions/${item.id}`, { method: 'DELETE' })
        if (response.ok) {
          const newData = await fetch('/api/commissions')
          const data = await newData.json()
          setCommissions(data)
        }
      } catch (error) {
        console.error('Error deleting commission:', error)
      }
    }
  }

  const handleCommissionView = (commission) => {
    setViewingItem(commission)
    setShowDetailModal(true)
  }

  const handleApprovalView = (approval) => {
    navigate(`/approval-detail/${approval.id}`)
  }

  const handleSoftwareDelete = async (item) => {
    if (window.confirm('Sigur vrei să ștergi acest software?')) {
      try {
        const response = await fetch(`/api/software/${item.id}`, { method: 'DELETE' })
        if (response.ok) {
          const newData = await fetch('/api/software')
          const data = await newData.json()
          setSoftware(data)
        }
      } catch (error) {
        console.error('Error deleting software:', error)
      }
    }
  }

  const handleAuthoritySave = async (formData) => {
    try {
      const response = await fetch('/api/authorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        const newData = await fetch('/api/authorities')
        const data = await newData.json()
        setAuthorities(data)
        setShowAuthorityModal(false)
      }
    } catch (error) {
      console.error('Error saving authority:', error)
    }
  }

  const handleAuthorityDelete = async (item) => {
    if (window.confirm('Sigur vrei să ștergi această autoritate?')) {
      try {
        const response = await fetch(`/api/authorities/${item.id}`, { method: 'DELETE' })
        if (response.ok) {
          const newData = await fetch('/api/authorities')
          const data = await newData.json()
          setAuthorities(data)
        }
      } catch (error) {
        console.error('Error deleting authority:', error)
      }
    }
  }

  // Define columns for the main metrology table - Updated
  const columns = [
    { 
      key: 'cvt_number', 
      label: 'NUMĂR CVT', 
      sortable: true,
      render: (item) => (
        <button
          onClick={() => {
            setViewingItem(item)
            setShowDetailModal(true)
          }}
          className="text-cyan-600 hover:text-cyan-800 font-semibold hover:underline transition-colors"
        >
          {item.cvt_number}
        </button>
      )
    },
    { key: 'cvt_type', label: 'TIP CVT', sortable: true },
    { key: 'approval_type', label: 'APROBARE DE TIP', sortable: true },
    { key: 'software', label: 'SOFTWARE', sortable: true },
    { 
      key: 'cvt_dates_combined', 
      label: 'DATE CVT & EXPIRARE', 
      sortable: true,
      render: (item) => {
        const cvtDate = item.cvt_date ? new Date(item.cvt_date).toLocaleDateString('ro-RO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) : 'N/A'
        
        const expiryDate = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('ro-RO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) : 'N/A'
        
        // Calculate remaining days
        let daysRemaining = 'N/A'
        let colorClass = 'text-green-600 bg-green-50'
        
        if (item.expiry_date) {
          const today = new Date()
          const expiry = new Date(item.expiry_date)
          const diffTime = expiry - today
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays < 0) {
            colorClass = 'text-red-600 bg-red-50'
            daysRemaining = `Expirat (${Math.abs(diffDays)} zile)`
          } else if (diffDays <= 30) {
            colorClass = 'text-orange-600 bg-orange-50'
            daysRemaining = `${diffDays} zile`
          } else {
            colorClass = 'text-green-600 bg-green-50'
            daysRemaining = `${diffDays} zile`
          }
        }
        
        return (
          <div className="space-y-2">
            <div className="text-slate-600 text-sm space-y-1">
              <div>CVT: {cvtDate}</div>
              <div>Expirare: {expiryDate}</div>
            </div>
            {daysRemaining !== 'N/A' && (
              <div className={`text-sm ${colorClass.split(' ')[0]}`}>
                {daysRemaining}
              </div>
            )}
          </div>
        )
      }
    },
    { key: 'issuing_authority', label: 'AUTORITATEA EMITENTĂ', sortable: true },
    { 
      key: 'cvtFile', 
      label: 'DOCUMENT CVT', 
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          {item.cvtFile ? (
            <>
              <button
                onClick={() => {
                  if (item.cvtFile) {
                    const link = document.createElement('a')
                    link.href = item.cvtFile
                    link.download = `CVT-${item.cvt_number}.pdf`
                    link.click()
                  }
                }}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                title="Vizualizează documentul CVT"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (item.cvtFile) {
                    const link = document.createElement('a')
                    link.href = item.cvtFile
                    link.download = `CVT-${item.cvt_number}.pdf`
                    link.click()
                  }
                }}
                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                title="Descarcă documentul CVT"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-slate-400 text-sm italic">Nu există document</span>
          )}
        </div>
      )
    },
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { 
      key: 'created_at', 
      label: 'DATA CREARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 text-sm">
          {new Date(item.created_at).toLocaleDateString('ro-RO')}
        </div>
      )
    }
  ]

  // Define columns for sub-pages
  const approvalColumns = [
    { key: 'name', label: 'NUMELE', sortable: true, render: (item) => (
      <button
        onClick={() => handleApprovalView(item)}
        className="text-blue-600 hover:text-blue-800 font-semibold text-base hover:underline transition-colors text-left"
      >
        {item.name || 'N/A'}
      </button>
    )},
    { key: 'provider', label: 'FURNIZOR', sortable: true },
    { key: 'cabinet', label: 'CABINET', sortable: true },
    { key: 'game_mix', label: 'GAME MIX', sortable: true, render: (item) => (
      <div className="text-slate-700 text-sm">
        {item.game_mix || '-'}
      </div>
    )},
    { key: 'checksum_md5', label: 'CHECKSUM MD5', sortable: true, render: (item) => (
      <div className="text-slate-600 text-xs font-mono">
        {(item.checksum_md5 || item.checksumMD5) ? `${(item.checksum_md5 || item.checksumMD5).substring(0, 8)}...` : '-'}
      </div>
    )},
    { key: 'checksum_sha256', label: 'CHECKSUM SHA256', sortable: true, render: (item) => (
      <div className="text-slate-600 text-xs font-mono">
        {(item.checksum_sha256 || item.checksumSHA256) ? `${(item.checksum_sha256 || item.checksumSHA256).substring(0, 8)}...` : '-'}
      </div>
    )},
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA CREARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          <div>{item.created_by || 'N/A'}</div>
          <div className="text-slate-600 text-sm">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  const commissionColumns = [
    { 
      key: 'name', 
      label: 'NUMELE', 
      sortable: true,
      render: (item) => (
        <button
          onClick={() => handleCommissionView(item)}
          className="text-blue-600 hover:text-blue-800 font-semibold text-base hover:underline transition-colors text-left"
        >
          {item.name || 'N/A'}
        </button>
      )
    },
    { 
      key: 'slot_count', 
      label: 'NUMĂR SLOTURI', 
      sortable: false,
      render: (item) => {
        let slotCount = 0
        if (item.serial_numbers) {
          if (typeof item.serial_numbers === 'string') {
            slotCount = typeof item.serial_numbers === 'string' ? item.serial_numbers.split(',').length : 0
          } else if (Array.isArray(item.serial_numbers)) {
            slotCount = item.serial_numbers.length
          } else {
            slotCount = 1
          }
        }
        return (
          <div className="text-slate-800 font-medium text-base">
            {slotCount} sloturi
          </div>
        )
      }
    },
    { key: 'commission_date', label: 'DATA COMISIEI', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.commission_date ? new Date(item.commission_date).toLocaleDateString('ro-RO') : 'N/A'}
      </div>
    )},
    { key: 'expiry_date', label: 'DATA VALABILITĂȚII', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('ro-RO') : 'N/A'}
      </div>
    )},
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { 
      key: 'created_at', 
      label: 'DATA CREARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 text-sm">
          {new Date(item.created_at).toLocaleDateString('ro-RO')}
        </div>
      )
    }
  ]

  const softwareColumns = [
    { key: 'name', label: 'NUMELE', sortable: true },
    { key: 'provider', label: 'FURNIZOR', sortable: true },
    { key: 'cabinet', label: 'CABINET', sortable: true },
    { key: 'game_mix', label: 'GAME MIX', sortable: true },
    { key: 'version', label: 'VERSIUNEA', sortable: true },
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { 
      key: 'created_at', 
      label: 'DATA CREARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 text-sm">
          {new Date(item.created_at).toLocaleDateString('ro-RO')}
        </div>
      )
    }
  ]

  const authorityColumns = [
    { key: 'name', label: 'NUMELE', sortable: true },
    { key: 'address', label: 'ADRESA', sortable: true },
    { key: 'price_initiala', label: 'PREȚ INIȚIALĂ (LEI)', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.price_initiala ? `${item.price_initiala} LEI` : '-'}
      </div>
    )},
    { key: 'price_reparatie', label: 'PREȚ REPARAȚIE (LEI)', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.price_reparatie ? `${item.price_reparatie} LEI` : '-'}
      </div>
    )},
    { key: 'price_periodica', label: 'PREȚ PERIODICĂ (LEI)', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.price_periodica ? `${item.price_periodica} LEI` : '-'}
      </div>
    )},
    { key: 'created_by', label: 'CREAT DE', sortable: true, render: (item) => (
      <div className="text-slate-800 font-medium text-base">
        {item.created_by || 'N/A'}
      </div>
    )},
    { 
      key: 'created_at', 
      label: 'DATA CREARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 text-sm">
          {new Date(item.created_at).toLocaleDateString('ro-RO')}
        </div>
      )
    }
  ]

  const handleExportExcel = () => {
    try {
      exportToExcel('metrology')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportToPDF('metrology')
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
              <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl shadow-lg shadow-cyan-500/25">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Metrologie CVT</h2>
                <p className="text-slate-600">Gestionează aprobările, comisiile și software-ul pentru sloturi</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ExportButtons 
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                entity="metrology"
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
                <span>Adaugă</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-pages Navigation */}
        <div className="card p-6">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Aprobări de Tip</span>
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'commissions'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Comisii</span>
            </button>
            <button
              onClick={() => setActiveTab('software')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'software'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Software</span>
            </button>
            <button
              onClick={() => setActiveTab('authorities')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'authorities'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Autoritatea Emitentă</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută în metrologie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <button className="btn-secondary flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Importă</span>
            </button>
          </div>
        </div>

        {/* Main Metrology CVT Table */}
        {!activeTab || activeTab === 'metrology' ? (
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : filteredMetrology.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există înregistrări de metrologie</h3>
                <p className="text-slate-500">Adaugă prima înregistrare pentru a începe</p>
              </div>
            ) : (
              <DataTable
                data={filteredMetrology}
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
        ) : null}

        {activeTab === 'approvals' && (
          <div className="card p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Înapoi la Metrologie CVT"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/25">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Aprobări de Tip</h2>
                    <p className="text-slate-600">Gestionează aprobările de tip pentru sloturi</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingApproval(null)
                    setShowApprovalModal(true)
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă Aprobare</span>
                </button>
              </div>
              
              {/* Table */}
              {approvals.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există aprobări de tip</h3>
                  <p className="text-slate-500">Adaugă prima aprobare pentru a începe</p>
                </div>
              ) : (
                <DataTable
                  data={approvals}
                  columns={approvalColumns}
                  onEdit={(item) => {
                    setEditingApproval(item)
                    setShowApprovalModal(true)
                  }}
                  onDelete={handleApprovalDelete}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="card p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Înapoi la Metrologie CVT"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Comisii</h2>
                    <p className="text-slate-600">Gestionează comisiile pentru sloturi</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowONJNCalendar(true)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Calendar ONJN</span>
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCommission(null)
                      setShowCommissionModal(true)
                    }}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adaugă Comisie</span>
                  </button>
                </div>
              </div>
              
              {/* Table */}
              {commissions.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există comisii</h3>
                  <p className="text-slate-500">Adaugă prima comisie pentru a începe</p>
                </div>
              ) : (
                <DataTable
                  data={commissions}
                  columns={commissionColumns}
                  onEdit={(item) => {
                    setEditingCommission(item)
                    setShowCommissionModal(true)
                  }}
                  onDelete={handleCommissionDelete}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'software' && (
          <div className="card p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Înapoi la Metrologie CVT"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl shadow-lg shadow-purple-500/25">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Software</h2>
                    <p className="text-slate-600">Gestionează software-ul pentru sloturi</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingSoftware(null)
                    setShowSoftwareModal(true)
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă Software</span>
                </button>
              </div>
              
              {/* Table */}
              {software.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există software</h3>
                  <p className="text-slate-500">Adaugă primul software pentru a începe</p>
                </div>
              ) : (
                <DataTable
                  data={software}
                  columns={softwareColumns}
                  onEdit={(item) => {
                    setEditingSoftware(item)
                    setShowSoftwareModal(true)
                  }}
                  onDelete={handleSoftwareDelete}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'authorities' && (
          <div className="card p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Înapoi la Metrologie CVT"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg shadow-orange-500/25">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Autoritatea Emitentă</h2>
                    <p className="text-slate-600">Gestionează autoritățile emitente pentru CVT</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingAuthority(null)
                    setShowAuthorityModal(true)
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă Autoritate</span>
                </button>
              </div>
              
              {/* Table */}
              {authorities.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există autorități</h3>
                  <p className="text-slate-500">Adaugă prima autoritate pentru a începe</p>
                </div>
              ) : (
                <DataTable
                  data={authorities}
                  columns={authorityColumns}
                  onEdit={(item) => {
                    setEditingAuthority(item)
                    setShowAuthorityModal(true)
                  }}
                  onDelete={handleAuthorityDelete}
                />
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {showModal && (
          <MetrologyModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}

        {showDetailModal && (
          <MetrologyDetailModal
            item={viewingItem}
            onClose={() => {
              setShowDetailModal(false)
              setViewingItem(null)
            }}
          />
        )}

        {showApprovalModal && (
          <ApprovalModal
            item={editingApproval}
            onClose={() => setShowApprovalModal(false)}
            onSave={handleApprovalSave}
          />
        )}

        {showCommissionModal && (
          <CommissionModal
            item={editingCommission}
            onClose={() => setShowCommissionModal(false)}
            onSave={handleCommissionSave}
          />
        )}

        {showSoftwareModal && (
          <SoftwareModal
            item={editingSoftware}
            onClose={() => setShowSoftwareModal(false)}
            onSave={handleSoftwareSave}
          />
        )}

        {showAuthorityModal && (
          <AuthorityModal
            item={editingAuthority}
            onClose={() => setShowAuthorityModal(false)}
            onSave={handleAuthoritySave}
          />
        )}

        {showONJNCalendar && (
          <ONJNCalendarModal
            isOpen={showONJNCalendar}
            onClose={() => setShowONJNCalendar(false)}
          />
        )}

        {/* Delete Approval Confirmation Modal */}
        {showDeleteApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-red-100 rounded-2xl">
                    <FileCheck className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Șterge Aprobarea</h3>
                    <p className="text-slate-600">Această acțiune nu poate fi anulată</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <p className="text-slate-700">
                    <span className="font-semibold">Numele:</span> {deletingApproval?.name}
                  </p>
                  <p className="text-slate-600 text-sm mt-1">
                    <span className="font-semibold">Furnizor:</span> {deletingApproval?.provider} | 
                    <span className="font-semibold"> Cabinet:</span> {deletingApproval?.cabinet}
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteApprovalModal(false)}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={confirmApprovalDelete}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Șterge
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Metrology
