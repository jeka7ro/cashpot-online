import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { useNavigate } from 'react-router-dom'
import { Activity, Plus, Search, Upload, Download, FileCheck, Settings, Wrench, ArrowLeft, Eye, Calendar, Users } from 'lucide-react'
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
        <div className="flex items-center justify-center">
          {item.cvtFile ? (
            <button
              onClick={() => window.open(item.cvtFile, '_blank')}
              className="p-2 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg transition-colors"
              title="Vizualizează documentul CVT"
            >
              <Eye className="w-5 h-5" />
            </button>
          ) : (
            <span className="text-slate-400 text-sm">-</span>
          )}
        </div>
      )
    },
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA', 
      sortable: true, 
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  // Approvals columns
  const approvalsColumns = [
    { 
      key: 'approval_number', 
      label: 'NUMĂR APROBARE', 
      sortable: true,
      render: (item) => (
        <button
          onClick={() => navigate(`/approval-detail/${item.id}`)}
          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
        >
          {item.approval_number}
        </button>
      )
    },
    { key: 'approval_type', label: 'TIP APROBARE', sortable: true },
    { key: 'provider', label: 'FURNIZOR', sortable: true },
    { key: 'cabinet', label: 'CABINET', sortable: true },
    { 
      key: 'approval_date', 
      label: 'DATA APROBARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600">
          {item.approval_date ? new Date(item.approval_date).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
    { 
      key: 'expiry_date', 
      label: 'DATA EXPIRARE', 
      sortable: true,
      render: (item) => {
        if (!item.expiry_date) return <span className="text-slate-400">N/A</span>
        
        const expiryDate = new Date(item.expiry_date)
        const today = new Date()
        const diffTime = expiryDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        let colorClass = 'text-green-600'
        if (diffDays < 0) {
          colorClass = 'text-red-600'
        } else if (diffDays <= 30) {
          colorClass = 'text-orange-600'
        }
        
        return (
          <div className={colorClass}>
            {expiryDate.toLocaleDateString('ro-RO')}
          </div>
        )
      }
    },
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA', 
      sortable: true, 
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  // Commissions columns
  const commissionsColumns = [
    { key: 'commission_number', label: 'NUMĂR COMISIE', sortable: true },
    { key: 'members', label: 'MEMBRI', sortable: false, render: (item) => {
      const membersList = item.members ? (typeof item.members === 'string' ? item.members.split(',') : item.members) : []
      return (
        <div className="text-sm">
          {membersList.length > 0 ? membersList.join(', ') : 'N/A'}
        </div>
      )
    }},
    { 
      key: 'date_formed', 
      label: 'DATA FORMARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600">
          {item.date_formed ? new Date(item.date_formed).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
    { key: 'status', label: 'STATUS', sortable: true },
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA', 
      sortable: true, 
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  // Software columns
  const softwareColumns = [
    { key: 'software_name', label: 'NUME SOFTWARE', sortable: true },
    { key: 'version', label: 'VERSIUNE', sortable: true },
    { key: 'provider', label: 'FURNIZOR', sortable: true },
    { 
      key: 'release_date', 
      label: 'DATA LANSARE', 
      sortable: true,
      render: (item) => (
        <div className="text-slate-600">
          {item.release_date ? new Date(item.release_date).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
    { key: 'status', label: 'STATUS', sortable: true },
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA', 
      sortable: true, 
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  // Authorities columns
  const authoritiesColumns = [
    { key: 'authority_name', label: 'NUME AUTORITATE', sortable: true },
    { key: 'contact_person', label: 'PERSOANĂ CONTACT', sortable: true },
    { key: 'contact_email', label: 'EMAIL', sortable: true },
    { key: 'contact_phone', label: 'TELEFON', sortable: true },
    { key: 'address', label: 'ADRESĂ', sortable: true },
    { 
      key: 'created_info', 
      label: 'CREAT DE / DATA', 
      sortable: true, 
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  // Render main table
  if (!activeTab) {
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
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Metrologie</h2>
                  <p className="text-slate-600 dark:text-slate-400">Gestionare certificate și verificări tehnice</p>
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
                  onClick={handleCreate}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă CVT</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-navigation */}
          <div className="card p-4">
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab(null)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium whitespace-nowrap shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>CVT-uri</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{metrology.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium whitespace-nowrap hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center space-x-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>Aprobări</span>
                <span className="bg-slate-400 dark:bg-slate-500 px-2 py-0.5 rounded-full text-xs text-white">{approvals.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium whitespace-nowrap hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Comisii</span>
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium whitespace-nowrap hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Software</span>
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium whitespace-nowrap hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center space-x-2"
              >
                <Wrench className="w-4 h-4" />
                <span>Autorități</span>
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
                  placeholder="Caută după număr CVT, furnizor, cabinet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <ExportButtons
                data={filteredMetrology}
                filename="metrology"
                onExportExcel={() => exportToExcel(filteredMetrology, 'metrology')}
                onExportPDF={() => exportToPDF(filteredMetrology, 'metrology')}
              />
            </div>
          </div>

          {/* Metrology Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : filteredMetrology.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există certificate</h3>
                <p className="text-slate-500">Adaugă primul certificat pentru a începe</p>
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
                moduleColor="cyan"
              />
            )}
          </div>

          {/* Modals */}
          {showModal && (
            <MetrologyModal
              item={editingItem}
              onClose={() => {
                setShowModal(false)
                setEditingItem(null)
              }}
              onSave={handleSave}
              providers={providers}
              cabinets={cabinets}
              gameMixes={gameMixes}
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

          {showONJNCalendar && (
            <ONJNCalendarModal
              onClose={() => setShowONJNCalendar(false)}
            />
          )}
        </div>
      </Layout>
    )
  }

  // Render Approvals tab
  if (activeTab === 'approvals') {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                  <FileCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Aprobări de Tip</h2>
                  <p className="text-slate-600 dark:text-slate-400">Gestionare aprobări echipamente</p>
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
          </div>

          {/* Sub-navigation */}
          <div className="card p-4">
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                CVT-uri
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium whitespace-nowrap"
              >
                Aprobări
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Comisii
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Software
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Autorități
              </button>
            </div>
          </div>

          {/* Approvals Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : approvals.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există aprobări</h3>
                <p className="text-slate-500">Adaugă prima aprobare pentru a începe</p>
              </div>
            ) : (
              <DataTable
                data={approvals}
                columns={approvalsColumns}
                onEdit={(item) => {
                  setEditingApproval(item)
                  setShowApprovalModal(true)
                }}
                onDelete={async (item) => {
                  if (window.confirm('Sigur vrei să ștergi această aprobare?')) {
                    await deleteItem('approvals', item.id)
                  }
                }}
                moduleColor="blue"
              />
            )}
          </div>

          {/* Modals */}
          {showApprovalModal && (
            <ApprovalModal
              item={editingApproval}
              onClose={() => {
                setShowApprovalModal(false)
                setEditingApproval(null)
              }}
              onSave={handleApprovalSave}
              providers={providers}
              cabinets={cabinets}
            />
          )}
        </div>
      </Layout>
    )
  }

  // Render Commissions tab
  if (activeTab === 'commissions') {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/25">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Comisii Metrologie</h2>
                  <p className="text-slate-600 dark:text-slate-400">Gestionare comisii de verificare</p>
                </div>
              </div>
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

          {/* Sub-navigation */}
          <div className="card p-4">
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                CVT-uri
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Aprobări
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium whitespace-nowrap"
              >
                Comisii
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Software
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Autorități
              </button>
            </div>
          </div>

          {/* Commissions Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există comisii</h3>
                <p className="text-slate-500">Adaugă prima comisie pentru a începe</p>
              </div>
            ) : (
              <DataTable
                data={commissions}
                columns={commissionsColumns}
                onEdit={(item) => {
                  setEditingCommission(item)
                  setShowCommissionModal(true)
                }}
                onDelete={async (item) => {
                  if (window.confirm('Sigur vrei să ștergi această comisie?')) {
                    const response = await fetch(`/api/commissions/${item.id}`, {
                      method: 'DELETE'
                    })
                    if (response.ok) {
                      const newData = await fetch('/api/commissions')
                      const data = await newData.json()
                      setCommissions(data)
                    }
                  }
                }}
                moduleColor="purple"
              />
            )}
          </div>

          {/* Modals */}
          {showCommissionModal && (
            <CommissionModal
              item={editingCommission}
              onClose={() => {
                setShowCommissionModal(false)
                setEditingCommission(null)
              }}
              onSave={handleCommissionSave}
            />
          )}
        </div>
      </Layout>
    )
  }

  // Render Software tab
  if (activeTab === 'software') {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/25">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Software Jocuri</h2>
                  <p className="text-slate-600 dark:text-slate-400">Gestionare versiuni software</p>
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
          </div>

          {/* Sub-navigation */}
          <div className="card p-4">
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                CVT-uri
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Aprobări
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Comisii
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium whitespace-nowrap"
              >
                Software
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Autorități
              </button>
            </div>
          </div>

          {/* Software Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : software.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
                onDelete={async (item) => {
                  if (window.confirm('Sigur vrei să ștergi acest software?')) {
                    const response = await fetch(`/api/software/${item.id}`, {
                      method: 'DELETE'
                    })
                    if (response.ok) {
                      const newData = await fetch('/api/software')
                      const data = await newData.json()
                      setSoftware(data)
                    }
                  }
                }}
                moduleColor="green"
              />
            )}
          </div>

          {/* Modals */}
          {showSoftwareModal && (
            <SoftwareModal
              item={editingSoftware}
              onClose={() => {
                setShowSoftwareModal(false)
                setEditingSoftware(null)
              }}
              onSave={handleSoftwareSave}
              providers={providers}
            />
          )}
        </div>
      </Layout>
    )
  }

  // Render Authorities tab
  if (activeTab === 'authorities') {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg shadow-orange-500/25">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Autorități Metrologie</h2>
                  <p className="text-slate-600 dark:text-slate-400">Gestionare autorități de verificare</p>
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
          </div>

          {/* Sub-navigation */}
          <div className="card p-4">
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                CVT-uri
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Aprobări
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Comisii
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                Software
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium whitespace-nowrap"
              >
                Autorități
              </button>
            </div>
          </div>

          {/* Authorities Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : authorities.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există autorități</h3>
                <p className="text-slate-500">Adaugă prima autoritate pentru a începe</p>
              </div>
            ) : (
              <DataTable
                data={authorities}
                columns={authoritiesColumns}
                onEdit={(item) => {
                  setEditingAuthority(item)
                  setShowAuthorityModal(true)
                }}
                onDelete={async (item) => {
                  if (window.confirm('Sigur vrei să ștergi această autoritate?')) {
                    const response = await fetch(`/api/authorities/${item.id}`, {
                      method: 'DELETE'
                    })
                    if (response.ok) {
                      const newData = await fetch('/api/authorities')
                      const data = await newData.json()
                      setAuthorities(data)
                    }
                  }
                }}
                moduleColor="orange"
              />
            )}
          </div>

          {/* Modals */}
          {showAuthorityModal && (
            <AuthorityModal
              item={editingAuthority}
              onClose={() => {
                setShowAuthorityModal(false)
                setEditingAuthority(null)
              }}
              onSave={handleAuthoritySave}
            />
          )}
        </div>
      </Layout>
    )
  }
}

export default Metrology
