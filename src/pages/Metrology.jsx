import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, Plus, Search, Upload, Download, FileCheck, Settings, Wrench, ArrowLeft, Eye, Calendar, Users, FileText, AlertCircle, Clock, Trash2, Wand2, FileSpreadsheet } from 'lucide-react'
import { toast } from 'react-hot-toast'
import DataTable from '../components/DataTable'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'
import MetrologyModal from '../components/modals/MetrologyModal'
import MetrologyDetailModal from '../components/modals/MetrologyDetailModal'
import ApprovalModal from '../components/modals/ApprovalModal'
import CommissionModal from '../components/modals/CommissionModal'
import SoftwareModal from '../components/modals/SoftwareModal'
import AuthorityModal from '../components/modals/AuthorityModal'
import SmartScanCvtModal from '../components/modals/SmartScanCvtModal'
import axios from 'axios'
import ONJNCalendarModal from '../components/modals/ONJNCalendarModal'
import { getGameMixName } from '../utils/gameMixFormatter'

const Metrology = () => {
  const { metrology, approvals, providers, cabinets, gameMixes, slots, warehouse, commissions: globalCommissions, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCommission, setFilterCommission] = useState('')
  const [filterAuthority, setFilterAuthority] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterCabinet, setFilterCabinet] = useState('')
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('') // Search term for symbol column
  const [softwareSearchTerm, setSoftwareSearchTerm] = useState('') // Search term for software
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewingItem, setViewingItem] = useState(null)
  const [showSmartScanModal, setShowSmartScanModal] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, type: null, item: null })

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

  // Helper: build absolute PDF URL or fallback to backend viewer
  const getCvtPdfUrl = (item) => {
    const rawUrl = item?.cvtFile || item?.file_path || item?.file?.url || item?.file?.path || item?.cvt_file || null
    const makeAbsolute = (url) => {
      // Prevent mapping boolean values like true/false or literal 'true' logic 
      if (!url || typeof url === 'boolean' || url === 'true' || url === 'false') return null
      if (typeof url !== 'string') return null
      if (/^data:application\/pdf/i.test(url)) return url
      if (/^https?:/i.test(url)) return url
      const backend = (typeof window !== 'undefined' && window.APP_BACKEND_URL) || 'https://cashpot-backend.onrender.com'
      return `${backend}${url.startsWith('/') ? url : `/${url}`}`
    }
    let pdfUrl = makeAbsolute(rawUrl)
    if (!pdfUrl && item?.id) {
      const backend = (typeof window !== 'undefined' && window.APP_BACKEND_URL) || 'https://cashpot-backend.onrender.com'
      pdfUrl = `${backend}/api/cvt-pdf/${item.id}`
    }
    return pdfUrl
  }

  // Update showBulkActions based on selectedItems
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0)
  }, [selectedItems])

  // Update URL when activeTab changes
  useEffect(() => {
    if (activeTab) {
      setSearchParams({ tab: activeTab })
    } else {
      setSearchParams({})
    }
  }, [activeTab, setSearchParams])

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
    let isValid = true;

    // search text
    if (searchTerm) {
      const searchMatch = item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cvt_series?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cvt_number?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) isValid = false;
    }

    if (filterCommission) {
      const targetCommission = globalCommissions?.find(c => c.name === filterCommission);
      const isAssociated = targetCommission && targetCommission.serial_numbers && targetCommission.serial_numbers.includes(String(item.serial_number));
      if (!isAssociated && item.commission_name !== filterCommission) {
        isValid = false;
      }
    }
    if (filterAuthority && item.issuing_authority !== filterAuthority) isValid = false;
    if (filterProvider && item.provider !== filterProvider) isValid = false;
    if (filterCabinet && item.cabinet !== filterCabinet) isValid = false;

    return isValid;
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

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteDialog({ isOpen: true, type: 'bulk', item: { name: `${selectedItems.length} elemente selectate` } })
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

  const handleDelete = (item) => {
    setDeleteDialog({ isOpen: true, type: 'metrology', item })
  }

  const handleSave = async (data) => {
    if (editingItem && editingItem.id) {
      await updateItem('metrology', editingItem.id, data)
    } else {
      await createItem('metrology', data)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const handleScanComplete = (extractedData) => {
    setShowSmartScanModal(false)
    setEditingItem(extractedData)
    setShowModal(true)
  }

  // View CVT document in new tab (EXACT CA ÎN LOCATIONS!)
  const handleViewDocument = (item) => {
    const cvtFileUrl = getCvtPdfUrl(item)

    if (cvtFileUrl) {
      try {
        // If it's a data URL, construct a blob URL to avoid url length limits in some browsers
        if (cvtFileUrl.startsWith('data:application/pdf;base64,')) {
          const base64Data = cvtFileUrl.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'application/pdf' })
          const blobUrl = URL.createObjectURL(blob)

          window.open(blobUrl, '_blank')
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
        } else {
          // It's a regular URL, just open it
          window.open(cvtFileUrl, '_blank')
        }
      } catch (error) {
        console.error('Error opening CVT:', error)
        toast.error('❌ Eroare la deschiderea documentului CVT')
      }
    } else {
      toast.error('❌ Nu există document atașat')
    }
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

      const response = await axios({ method, url, data });

      if (response.data) {
        setShowCommissionModal(false)
        setEditingCommission(null)
        // Reload data
        const nextData = await axios.get('/api/commissions')
        setCommissions(nextData.data)
        toast.success(editingCommission ? 'Comisie actualizată!' : 'Comisie creată!');
      }
    } catch (error) {
      console.error('Error saving commission:', error)
      const serverErr = error.response?.data?.error;
      toast.error(serverErr ? `Eroare: ${serverErr}` : 'Eroare la salvare!', { duration: 5000 });
    }
  }

  const handleSoftwareSave = async (data) => {
    try {
      const url = editingSoftware ? `/api/software/${editingSoftware.id}` : '/api/software'
      const method = editingSoftware ? 'PUT' : 'POST'

      const response = await axios({ method, url, data });

      if (response.data) {
        setShowSoftwareModal(false)
        setEditingSoftware(null)
        // Reload data
        const nextData = await axios.get('/api/software')
        setSoftware(nextData.data)
        toast.success(editingSoftware ? 'Software actualizat!' : 'Software creat!');
      }
    } catch (error) {
      console.error('Error saving software:', error)
      const serverErr = error.response?.data?.error;
      toast.error(serverErr ? `Eroare: ${serverErr}` : 'Eroare la salvare!', { duration: 5000 });
    }
  }

  const confirmDeleteAction = async () => {
    const { type, item } = deleteDialog
    if (!type || !item) return

    try {
      if (type === 'bulk') {
        for (const id of selectedItems) {
          await deleteItem('metrology', id)
        }
        setSelectedItems([])
        setShowBulkActions(false)
        toast.success('Elementele selectate au fost șterse!')
      } else if (type === 'metrology') {
        await deleteItem('metrology', item.id)
        toast.success('CVT-ul a fost șters!')
      } else if (type === 'approval') {
        await deleteItem('approvals', item.id)
        toast.success('Aprobarea a fost ștearsă!')
      } else if (type === 'commission') {
        const response = await axios.delete(`/api/commissions/${item.id}`)
        if (response.data) {
          const nextData = await axios.get('/api/commissions')
          setCommissions(nextData.data)
          toast.success('Comisia a fost ștearsă!')
        }
      } else if (type === 'software') {
        const response = await axios.delete(`/api/software/${item.id}`)
        if (response.data) {
          const nextData = await axios.get('/api/software')
          setSoftware(nextData.data)
          toast.success('Software-ul a fost șters!')
        }
      } else if (type === 'authority') {
        const response = await axios.delete(`/api/authorities/${item.id}`)
        if (response.data) {
          const nextData = await axios.get('/api/authorities')
          setAuthorities(nextData.data)
          toast.success('Autoritatea a fost ștearsă!')
        }
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      toast.error('Eroare la ștergere!')
    }

    setDeleteDialog({ isOpen: false, type: null, item: null })
  }

  const handleCommissionView = (commission) => {
    setViewingItem(commission)
    setShowDetailModal(true)
  }

  const handleApprovalView = (approval) => {
    navigate(`/approval-detail/${approval.id}`)
  }

  const handleAuthoritySave = async (formData) => {
    try {
      const url = editingAuthority ? `/api/authorities/${editingAuthority.id}` : '/api/authorities'
      const method = editingAuthority ? 'PUT' : 'POST'

      const response = await axios({ method, url, data: formData });

      if (response.data) {
        const nextData = await axios.get('/api/authorities')
        setAuthorities(nextData.data)
        setShowAuthorityModal(false)
        setEditingAuthority(null)
        toast.success(editingAuthority ? 'Autoritate actualizată!' : 'Autoritate creată!');
      }
    } catch (error) {
      console.error('Error saving authority:', error)
      const serverErr = error.response?.data?.error;
      toast.error(serverErr ? `Eroare: ${serverErr}` : 'Eroare la salvare!', { duration: 5000 });
    }
  }

  const handleAuthorityDelete = (item) => {
    setDeleteDialog({ isOpen: true, type: 'authority', item })
  }

  // Define columns for the main metrology table - Updated
  const columns = [
    {
      key: 'cvt_series',
      label: 'CERTIFICAT (CVT) & SOFTWARE',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col">
          <button
            onClick={() => navigate(`/metrology/cvt/${item.id}`)}
            className="text-cyan-600 hover:text-cyan-800 font-semibold hover:underline transition-colors text-left whitespace-normal break-words"
          >
            {item.cvt_series || (item.cvt_number && item.cvt_number.startsWith('AUTO-') ? 'N/A' : item.cvt_number) || 'N/A'}
          </button>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-normal break-words" title={item.software}>
            {item.software || 'Fără software'}
          </div>
        </div>
      )
    },
    {
      key: 'provider',
      label: 'FURNIZOR & CABINET',
      sortable: true,
      render: (item) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {item.provider || '-'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {item.cabinet || '-'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'approval_type',
      label: 'APROBARE',
      sortable: true,
      render: (item) => item.approval_type || '-'
    },
    {
      key: 'software',
      label: 'DATA & DETALII',
      sortable: true,
      render: (item) => {
        const cvtCommission = globalCommissions?.find(c => c.serial_numbers?.includes(String(item.serial_number)) || c.name === item.commission_name);

        return (
          <div className="flex flex-col gap-1.5 items-start">
            {cvtCommission && (cvtCommission.auth_start_date || cvtCommission.commission_date) ? (
              <span className="inline-flex items-center gap-1.5 w-fit font-bold text-[11px] text-green-600 dark:text-green-500" title="Data Autorizației">
                <Calendar size={12} className="shrink-0" />
                {new Date(cvtCommission.auth_start_date || cvtCommission.commission_date).toLocaleDateString('ro-RO')}
              </span>
            ) : (
              <span className="text-[12px] text-slate-400 font-semibold mb-1">-</span>
            )}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
              <span className="flex items-center gap-1 font-medium">
                <div className={`w-1.5 h-1.5 rounded-full ${item.cvt_type === 'Inițială' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                {item.cvt_type || '-'}
                {item.issuing_authority && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600 mx-0.5">•</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.issuing_authority}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'cvt_dates_combined',
      label: 'VALABILITATE',
      sortable: true,
      render: (item) => {
        const cvtDate = item.cvt_date ? new Date(item.cvt_date).toLocaleDateString('ro-RO', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'
        const expiryDate = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('ro-RO', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'

        let daysRemaining = null
        let badgeClass = ''
        let icon = null

        if (item.expiry_date) {
          const today = new Date()
          const expiry = new Date(item.expiry_date)
          const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

          if (diffDays < 0) {
            badgeClass = 'text-red-700 bg-red-100/80 dark:text-red-400 dark:bg-red-900/30 ring-1 ring-red-600/20'
            daysRemaining = `Expirat (${Math.abs(diffDays)}z)`
            icon = <AlertCircle size={12} className="shrink-0" />
          } else if (diffDays <= 30) {
            badgeClass = 'text-orange-700 bg-orange-100/80 dark:text-orange-400 dark:bg-orange-900/30 ring-1 ring-orange-600/20'
            daysRemaining = `${diffDays} zile`
            icon = <Clock size={12} className="shrink-0" />
          } else {
            badgeClass = 'text-green-600 dark:text-green-500'
            daysRemaining = `${diffDays} zile`
            icon = <Clock size={12} className="shrink-0" />
          }
        }

        return (
          <div className="flex flex-col gap-1 w-max items-start">
            <span className="text-slate-800 dark:text-slate-200 font-bold" title="Data expirare CVT">
              {expiryDate}
            </span>
            {daysRemaining && (
              <div className={`inline-flex items-center gap-1.5 w-fit font-bold text-[11px] ${badgeClass}`}>
                {icon}
                {daysRemaining}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'cvtFile',
      label: 'CVT',
      sortable: false,
      render: (item) => {
        const hasCvt = item.cvt_file || item.cvtFile
        return (
          <div className="flex items-center justify-center">
            {hasCvt ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewDocument(item)
                }}
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

  // Approvals columns
  const approvalsColumns = [
    {
      key: 'name',
      label: 'APROBARE',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => navigate(`/approval-detail/${item.id}`)}
            className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors text-left"
          >
            {item.name || item.approval_number || 'N/A'}
          </button>
          <div className="text-xs text-slate-500 font-medium">
            {getGameMixName(item.game_mix_name || item.game_mix, gameMixes)}
          </div>
        </div>
      )
    },
    {
      key: 'provider',
      label: 'FURNIZOR & CABINET',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-800 dark:text-slate-200">{item.provider || '-'}</span>
          <span className="text-xs text-slate-500">{item.cabinet || '-'}</span>
        </div>
      )
    },
    {
      key: 'checksum_info',
      label: 'CHECKSUMS',
      sortable: false,
      render: (item) => (
        <div className="flex flex-col gap-0.5 w-max text-[11px] text-slate-500 font-mono">
          <div>MD5: {item.checksum_md5 || '-'}</div>
          <div>SHA: {item.checksum_sha256 || '-'}</div>
        </div>
      )
    },
    {
      key: 'created_info',
      label: 'CREAT DE / DATA',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5 w-max">
          <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : '-'}
          </div>
        </div>
      )
    }
  ]

  // Helper functions pentru a obține numele provider și cabinet
  const getProviderName = (providerId) => {
    if (!providerId) return ''
    const provider = providers.find(p => p.id === providerId || p.name === providerId)
    return provider ? provider.name : (typeof providerId === 'string' ? providerId : '')
  }

  const getCabinetName = (cabinetId) => {
    if (!cabinetId) return ''
    const cabinet = cabinets.find(c => c.id === cabinetId || c.name === cabinetId)
    return cabinet ? cabinet.name : (typeof cabinetId === 'string' ? cabinetId : '')
  }

  // Filter approvals by symbol search term - EXTINS: caută în toate câmpurile relevante
  const filteredApprovals = approvals.filter(approval => {
    if (!symbolSearchTerm) return true

    const searchTerm = symbolSearchTerm.toLowerCase().trim()
    if (!searchTerm) return true

    // Normalizează și caută în toate câmpurile relevante
    const normalize = (str) => (str || '').toString().toLowerCase().trim()

    // Câmpuri de căutare - folosim numele reale pentru provider și cabinet
    const name = normalize(approval.name)
    const approvalNumber = normalize(approval.approval_number)
    const provider = normalize(getProviderName(approval.provider))
    const cabinet = normalize(getCabinetName(approval.cabinet))
    const gameMix = normalize(getGameMixName(approval.game_mix_name || approval.game_mix, gameMixes))
    const approvalType = normalize(approval.approval_type)
    const notes = normalize(approval.notes)

    // Caută în toate câmpurile - potrivire parțială în orice parte a textului
    return (
      name.includes(searchTerm) ||
      approvalNumber.includes(searchTerm) ||
      provider.includes(searchTerm) ||
      cabinet.includes(searchTerm) ||
      gameMix.includes(searchTerm) ||
      approvalType.includes(searchTerm) ||
      notes.includes(searchTerm)
    )
  })

  // Filter software by search term - EXTINS: caută în toate câmpurile relevante
  const filteredSoftware = software.filter(sw => {
    if (!softwareSearchTerm) return true

    const searchTerm = softwareSearchTerm.toLowerCase().trim()
    if (!searchTerm) return true

    // Normalizează și caută în toate câmpurile relevante
    const normalize = (str) => (str || '').toString().toLowerCase().trim()

    // Câmpuri de căutare
    const softwareName = normalize(sw.software_name || sw.name)
    const version = normalize(sw.version)
    const provider = normalize(getProviderName(sw.provider))
    const status = normalize(sw.status)

    // Caută în toate câmpurile - potrivire parțială în orice parte a textului
    return (
      softwareName.includes(searchTerm) ||
      version.includes(searchTerm) ||
      provider.includes(searchTerm) ||
      status.includes(searchTerm)
    )
  })

  // Helper function to get serial numbers count
  const getSerialNumbersCount = (item) => {
    if (!item.serial_numbers) return 0
    try {
      const parsed = typeof item.serial_numbers === 'string'
        ? JSON.parse(item.serial_numbers)
        : item.serial_numbers
      return Array.isArray(parsed) ? parsed.length : 0
    } catch (e) {
      return 0
    }
  }

  // Helper function to get serial numbers list
  const getSerialNumbersList = (item) => {
    if (!item.serial_numbers) return []
    try {
      let parsed
      if (typeof item.serial_numbers === 'string') {
        // Încearcă să parseze ca JSON
        try {
          parsed = JSON.parse(item.serial_numbers)
        } catch (e) {
          // Dacă nu e JSON valid, încearcă să parseze ca text cu virgule sau newlines
          parsed = item.serial_numbers
            .split(/[,\n\r]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
        }
      } else {
        parsed = item.serial_numbers
      }
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.error('Error parsing serial_numbers:', e, item.serial_numbers)
      return []
    }
  }

  // Helper function to normalize serial number
  const normalizeSerial = (serial) => {
    if (!serial) return ''
    return String(serial).trim().replace(/\s+/g, '').toLowerCase()
  }

  // Helper function to find slot by serial number
  const findSlotBySerial = (serialNumber) => {
    if (!serialNumber || !slots) return null
    const normalized = normalizeSerial(serialNumber)
    let slot = slots.find(s => normalizeSerial(s.serial_number) === normalized || normalizeSerial(s.slot_id) === normalized)
    if (!slot && warehouse) {
      const wh = warehouse.find(w => normalizeSerial(w.serial_number) === normalized)
      if (wh) slot = wh
    }
    return slot
  }

  // Helper function to get total gaming places for a commission
  const getGamingPlacesCount = (item) => {
    const serials = getSerialNumbersList(item)
    if (serials.length === 0) {
      console.warn('⚠️ No serial numbers found for commission:', item.id, item.name)
      return 0
    }

    let total = 0
    let foundCount = 0
    serials.forEach(serial => {
      const slot = findSlotBySerial(serial)
      if (slot) {
        foundCount++
        const gamingPlaces = Number(slot.gaming_places) || 0
        if (gamingPlaces > 0) {
          total += gamingPlaces
        }
      }
    })

    if (total === 0 && serials.length > 0) {
      console.warn(`⚠️ Commission ${item.id} (${item.name}): ${serials.length} serials, ${foundCount} found in slots, but total gaming_places = 0`)
      console.warn('   First 3 serials:', serials.slice(0, 3))
      if (foundCount > 0) {
        const firstFound = serials.find(s => findSlotBySerial(s))
        if (firstFound) {
          const slot = findSlotBySerial(firstFound)
          console.warn('   First found slot:', { serial: firstFound, gaming_places: slot?.gaming_places, slot_id: slot?.slot_id })
        }
      }
    }

    return total
  }

  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Commissions columns
  const commissionsColumns = [
    {
      key: 'name',
      label: 'COMISIE',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-1 items-start">
          <button
            onClick={() => navigate(`/metrology/commission/${item.id}`)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-bold text-[14px] text-left"
          >
            {item.name || `Comisie ${item.id}`}
          </button>
          <div className="text-[12px] text-slate-500 dark:text-slate-400">
            {(() => {
              const sn = Array.isArray(item.serial_numbers) ? item.serial_numbers : [];
              return `${sn.length} seriale`;
            })()}
          </div>
        </div>
      )
    },
    {
      key: 'commission_dates_combined',
      label: 'VALABILITATE',
      sortable: true,
      render: (item) => {
        let comDate = '-'
        let expDate = '-'

        try {
          const authDate = item.auth_start_date || item.commission_date
          if (authDate) {
            const d = new Date(typeof authDate === 'string' && !authDate.includes('T') ? authDate + 'T00:00:00' : authDate)
            if (!isNaN(d.getTime())) comDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
          }
        } catch (e) { }

        try {
          if (item.expiry_date) {
            const d = new Date(typeof item.expiry_date === 'string' && !item.expiry_date.includes('T') ? item.expiry_date + 'T00:00:00' : item.expiry_date)
            if (!isNaN(d.getTime())) expDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
          }
        } catch (e) { }

        let daysRemaining = null
        let badgeClass = ''
        let icon = null
        const days = getDaysUntilExpiry(item.expiry_date)

        if (days !== null) {
          if (days < 0) {
            badgeClass = 'text-red-700 bg-red-100/80 dark:text-red-400 dark:bg-red-900/30 ring-1 ring-red-600/20'
            daysRemaining = `Expirat (${Math.abs(days)}z)`
            icon = <AlertCircle size={12} className="shrink-0" />
          } else if (days <= 30) {
            badgeClass = 'text-orange-700 bg-orange-100/80 dark:text-orange-400 dark:bg-orange-900/30 ring-1 ring-orange-600/20'
            daysRemaining = `${days} zile`
            icon = <Clock size={12} className="shrink-0" />
          } else {
            badgeClass = 'text-green-700 bg-green-100/80 dark:text-green-400 dark:bg-green-900/30 ring-1 ring-emerald-600/20'
            daysRemaining = `${days} zile`
            icon = <Clock size={12} className="shrink-0" />
          }
        }

        return (
          <div className="flex flex-col gap-2 w-max items-start">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium" title="Data Comisie">{comDate}</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold" title="Data Expirare">{expDate}</span>
            </div>
            {daysRemaining && (
              <div className={`px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 w-fit font-bold text-[11px] ${badgeClass}`}>
                {icon}
                {daysRemaining}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'slot_count',
      label: 'NUMĂR LOCURI DE JOC',
      sortable: true,
      render: (item) => {
        const count = getGamingPlacesCount(item)
        return (
          <div className="text-slate-800 dark:text-slate-200 font-medium">
            {count}
          </div>
        )
      },
      footer: (data) => {
        const total = data.reduce((sum, item) => sum + getGamingPlacesCount(item), 0)
        return (
          <div className="text-slate-800 dark:text-slate-200 font-bold">
            Total: {total}
          </div>
        )
      }
    }
  ]

  // Software columns
  const softwareColumns = [
    {
      key: 'software_name',
      label: 'SOFTWARE & VERSIUNE',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <div className="text-slate-800 dark:text-slate-200 font-bold">
            {item.software_name || item.name || 'N/A'}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Ver: {item.version || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'provider_status',
      label: 'FURNIZOR & STATUS',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5 items-start">
          <div className="font-medium text-slate-800 dark:text-slate-200">{item.provider || '-'}</div>
          <div className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md w-fit">
            {item.status || 'Activ'}
          </div>
        </div>
      )
    },
    {
      key: 'release_date',
      label: 'DATA LANSARE',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 font-medium">
          {item.release_date ? new Date(item.release_date).toLocaleDateString('ro-RO') : '-'}
        </div>
      )
    },
    {
      key: 'created_info',
      label: 'CREAT DE / DATA',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5 w-max">
          <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : '-'}
          </div>
        </div>
      )
    }
  ]

  // Authorities columns
  const authoritiesColumns = [
    {
      key: 'name',
      label: 'AUTORITATE & ADRESĂ',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
          <div className="text-xs text-slate-500 max-w-[200px] truncate" title={item.address}>{item.address || 'Fără adresă'}</div>
        </div>
      )
    },
    {
      key: 'prices',
      label: 'PREȚURI',
      sortable: false,
      render: (item) => (
        <div className="flex flex-col gap-1 w-max text-[12px] text-slate-600 dark:text-slate-300">
          <div className="flex gap-3">
            {item.price_initiala && <div><span className="font-semibold">Inițială:</span> <span className="text-blue-600 font-bold">{item.price_initiala} LEI</span></div>}
            {item.price_periodica && <div><span className="font-semibold">Periodică:</span> <span className="text-green-600 font-bold">{item.price_periodica} LEI</span></div>}
          </div>
          <div>
            {item.price_reparatie ? <div><span className="font-semibold">Reparație:</span> <span className="text-orange-600 font-bold">{item.price_reparatie} LEI</span></div> : (!item.price_initiala && !item.price_periodica ? <span className="text-slate-400">-</span> : null)}
          </div>
        </div>
      )
    },
    {
      key: 'created_info',
      label: 'CREAT DE / DATA',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5 w-max">
          <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {item.created_by || 'Necunoscut'}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : '-'}
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
          {/* Sub-navigation - Muta deasupra Header-ului principal */}
          <div className="card p-6">
            <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab(null)}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${!activeTab
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Activity size={20} />
                  <span>CVT-uri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileCheck size={20} />
                  <span>Aprobări</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'commissions'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users size={20} />
                  <span>Comisii</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'software'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText size={20} />
                  <span>Software</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'authorities'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Settings size={20} />
                  <span>Autorități</span>
                </div>
              </button>
            </div>
          </div>

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

              {/* Action Buttons Moved to Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowONJNCalendar(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Calendar ONJN</span>
                </button>

                <button
                  onClick={() => exportToExcel(filteredMetrology, 'metrology')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                  title="Exportă în Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={() => setShowSmartScanModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm font-medium"
                  title="Sistem automat AI pentru citire CVT din fișier"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>+CVT/PDF</span>
                </button>

                <button
                  onClick={handleCreate}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă CVT</span>
                </button>
              </div>
            </div>
          </div>



          {/* Search and Filters */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Caută după număr CVT, furnizor, cabinet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-12 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>

              {/* Select Filters */}
              <select
                value={filterCommission}
                onChange={(e) => setFilterCommission(e.target.value)}
                className="input-field max-w-[180px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="">Toate Comisiile</option>
                {globalCommissions
                  ?.filter(c => metrology.some(m =>
                    (c.serial_numbers && c.serial_numbers.includes(String(m.serial_number))) ||
                    (c.name === m.commission_name)
                  ))
                  .map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>

              <select
                value={filterAuthority}
                onChange={(e) => setFilterAuthority(e.target.value)}
                className="input-field max-w-[170px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="">Toate Autoritățile</option>
                {Array.from(new Set(metrology.map(m => m.issuing_authority).filter(Boolean))).map(auth => (
                  <option key={auth} value={auth}>{auth}</option>
                ))}
              </select>

              <select
                value={filterProvider}
                onChange={(e) => {
                  setFilterProvider(e.target.value);
                  setFilterCabinet(''); // Reset cabinet on provider change
                }}
                className="input-field max-w-[160px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="">Toți Furnizorii</option>
                {Array.from(new Set(metrology.map(m => m.provider).filter(Boolean))).sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={filterCabinet}
                onChange={(e) => setFilterCabinet(e.target.value)}
                className="input-field max-w-[160px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="">Toate Cabinetele</option>
                {Array.from(new Set(metrology
                  .filter(m => !filterProvider || m.provider === filterProvider)
                  .map(m => m.cabinet)
                  .filter(Boolean)
                )).sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {showBulkActions && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Șterge selectate</span>
                </button>
              )}
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
                compact={true}
              />
            )}
          </div>

          {/* Modals */}
          {showSmartScanModal && (
            <SmartScanCvtModal
              onClose={() => setShowSmartScanModal(false)}
              onScanComplete={handleScanComplete}
            />
          )}

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
        <DeleteConfirmModal
          isOpen={deleteDialog.isOpen}
          title="Confirmă ștergerea"
          itemName={deleteDialog.item?.name || deleteDialog.item?.cvt_series || deleteDialog.item?.cvt_number || 'Element selectat'}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteDialog({ isOpen: false, type: null, item: null })}
        />
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

          {/* Sub-navigation - same style as Locations */}
          <div className="card p-6">
            <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab(null)}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Activity size={20} />
                  <span>CVT-uri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileCheck size={20} />
                  <span>Aprobări</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'commissions'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users size={20} />
                  <span>Comisii</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'software'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText size={20} />
                  <span>Software</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'authorities'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Settings size={20} />
                  <span>Autorități</span>
                </div>
              </button>
            </div>
          </div>

          {/* Search bar for Symbol column */}
          <div className="card p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Caută după simbol (nume/number aprobare)..."
                  value={symbolSearchTerm}
                  onChange={(e) => setSymbolSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              {symbolSearchTerm && (
                <button
                  onClick={() => setSymbolSearchTerm('')}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  Șterge filtru
                </button>
              )}
            </div>
          </div>

          {/* Approvals Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {symbolSearchTerm ? 'Nu s-au găsit aprobări pentru simbolul căutat' : 'Nu există aprobări'}
                </h3>
                <p className="text-slate-500">
                  {symbolSearchTerm ? 'Încearcă un alt termen de căutare' : 'Adaugă prima aprobare pentru a începe'}
                </p>
              </div>
            ) : (
              <DataTable
                data={filteredApprovals}
                columns={approvalsColumns}
                onEdit={(item) => {
                  setEditingApproval(item)
                  setShowApprovalModal(true)
                }}
                onDelete={(item) => setDeleteDialog({ isOpen: true, type: 'approval', item })}
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
        <DeleteConfirmModal
          isOpen={deleteDialog.isOpen}
          title="Confirmă ștergerea"
          itemName={deleteDialog.item?.name || deleteDialog.item?.cvt_series || deleteDialog.item?.cvt_number || 'Element selectat'}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteDialog({ isOpen: false, type: null, item: null })}
        />
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

          {/* Sub-navigation - same style as Locations */}
          <div className="card p-6">
            <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab(null)}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Activity size={20} />
                  <span>CVT-uri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileCheck size={20} />
                  <span>Aprobări</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'commissions'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users size={20} />
                  <span>Comisii</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'software'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText size={20} />
                  <span>Software</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'authorities'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Settings size={20} />
                  <span>Autorități</span>
                </div>
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
                onDelete={(item) => setDeleteDialog({ isOpen: true, type: 'commission', item })}
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
        <DeleteConfirmModal
          isOpen={deleteDialog.isOpen}
          title="Confirmă ștergerea"
          itemName={deleteDialog.item?.name || deleteDialog.item?.cvt_series || deleteDialog.item?.cvt_number || 'Element selectat'}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteDialog({ isOpen: false, type: null, item: null })}
        />
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

          {/* Sub-navigation - same style as Locations */}
          <div className="card p-6">
            <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab(null)}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Activity size={20} />
                  <span>CVT-uri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileCheck size={20} />
                  <span>Aprobări</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'commissions'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users size={20} />
                  <span>Comisii</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'software'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText size={20} />
                  <span>Software</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'authorities'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Settings size={20} />
                  <span>Autorități</span>
                </div>
              </button>
            </div>
          </div>

          {/* Search Bar - identical to approvals */}
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Caută după nume software, versiune, furnizor, status..."
                  value={softwareSearchTerm}
                  onChange={(e) => setSoftwareSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              {softwareSearchTerm && (
                <button
                  onClick={() => setSoftwareSearchTerm('')}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  Șterge filtru
                </button>
              )}
            </div>
          </div>

          {/* Software Table */}
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : filteredSoftware.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {softwareSearchTerm ? 'Nu s-au găsit software pentru termenul căutat' : 'Nu există software'}
                </h3>
                <p className="text-slate-500">
                  {softwareSearchTerm ? 'Încearcă un alt termen de căutare' : 'Adaugă primul software pentru a începe'}
                </p>
              </div>
            ) : (
              <DataTable
                data={filteredSoftware}
                columns={softwareColumns}
                onEdit={(item) => {
                  setEditingSoftware(item)
                  setShowSoftwareModal(true)
                }}
                onDelete={(item) => setDeleteDialog({ isOpen: true, type: 'software', item })}
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
        <DeleteConfirmModal
          isOpen={deleteDialog.isOpen}
          title="Confirmă ștergerea"
          itemName={deleteDialog.item?.name || deleteDialog.item?.cvt_series || deleteDialog.item?.cvt_number || 'Element selectat'}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteDialog({ isOpen: false, type: null, item: null })}
        />
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

          {/* Sub-navigation - same style as Locations */}
          <div className="card p-6">
            <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab(null)}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Activity size={20} />
                  <span>CVT-uri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileCheck size={20} />
                  <span>Aprobări</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'commissions'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users size={20} />
                  <span>Comisii</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('software')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'software'
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText size={20} />
                  <span>Software</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('authorities')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${activeTab === 'authorities'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Settings size={20} />
                  <span>Autorități</span>
                </div>
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
                onDelete={(item) => setDeleteDialog({ isOpen: true, type: 'authority', item })}
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
        {/* 4. Use <DeleteConfirmModal> inside <Layout> */}
        <DeleteConfirmModal
          isOpen={deleteDialog.isOpen}
          title="Confirmă ștergerea"
          itemName={deleteDialog.item?.name || deleteDialog.item?.cvt_series || deleteDialog.item?.cvt_number || 'Element selectat'}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteDialog({ isOpen: false, type: null, item: null })}
        />
      </Layout>
    )
  }
}

export default Metrology
