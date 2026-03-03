import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExportButtons from '../components/ExportButtons'
import { useData } from '../contexts/DataContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, Plus, Search, Upload, Download, FileCheck, Settings, Wrench, ArrowLeft, Eye, Calendar, Users, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import DataTable from '../components/DataTable'
import MetrologyModal from '../components/modals/MetrologyModal'
import MetrologyDetailModal from '../components/modals/MetrologyDetailModal'
import ApprovalModal from '../components/modals/ApprovalModal'
import CommissionModal from '../components/modals/CommissionModal'
import SoftwareModal from '../components/modals/SoftwareModal'
import AuthorityModal from '../components/modals/AuthorityModal'
import axios from 'axios'
import ONJNCalendarModal from '../components/modals/ONJNCalendarModal'
import { getGameMixName } from '../utils/gameMixFormatter'

const Metrology = () => {
  const { metrology, approvals, providers, cabinets, gameMixes, slots, warehouse, loading, createItem, updateItem, deleteItem, exportToExcel, exportToPDF } = useData()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('') // Search term for symbol column
  const [softwareSearchTerm, setSoftwareSearchTerm] = useState('') // Search term for software
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || null)
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

  // Helper: build absolute PDF URL or fallback to backend viewer
  const getCvtPdfUrl = (item) => {
    const rawUrl = item?.cvtFile || item?.file_path || item?.file?.url || item?.file?.path || item?.cvt_file || null
    const makeAbsolute = (url) => {
      if (!url) return null
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
        const response = await axios.delete(`/api/commissions/${item.id}`)
        if (response.data) {
          const nextData = await axios.get('/api/commissions')
          setCommissions(nextData.data)
          toast.success('Comisie ștearsă!')
        }
      } catch (error) {
        console.error('Error deleting commission:', error)
        toast.error('Eroare la ștergere!')
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
        const response = await axios.delete(`/api/software/${item.id}`)
        if (response.data) {
          const nextData = await axios.get('/api/software')
          setSoftware(nextData.data)
          toast.success('Software șters!')
        }
      } catch (error) {
        console.error('Error deleting software:', error)
        toast.error('Eroare la ștergere!')
      }
    }
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

  const handleAuthorityDelete = async (item) => {
    if (window.confirm('Sigur vrei să ștergi această autoritate?')) {
      try {
        const response = await axios.delete(`/api/authorities/${item.id}`)
        if (response.data) {
          const nextData = await axios.get('/api/authorities')
          setAuthorities(nextData.data)
          toast.success('Autoritate ștearsă!')
        }
      } catch (error) {
        console.error('Error deleting authority:', error)
        toast.error('Eroare la ștergere!')
      }
    }
  }

  // Define columns for the main metrology table - Updated
  const columns = [
    {
      key: 'cvt_series',
      label: 'SERIE CVT',
      sortable: true,
      render: (item) => (
        <button
          onClick={() => navigate(`/metrology/cvt/${item.id}`)}
          className="text-cyan-600 hover:text-cyan-800 font-semibold hover:underline transition-colors"
        >
          {item.cvt_series || (item.cvt_number && item.cvt_number.startsWith('AUTO-') ? 'N/A' : item.cvt_number) || 'N/A'}
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
      label: 'NUMELE',
      sortable: true,
      render: (item) => (
        <button
          onClick={() => navigate(`/approval-detail/${item.id}`)}
          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
        >
          {item.name || item.approval_number || 'N/A'}
        </button>
      )
    },
    { key: 'provider', label: 'FURNIZOR', sortable: true },
    { key: 'cabinet', label: 'CABINET', sortable: true },
    {
      key: 'game_mix',
      label: 'GAME MIX',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium">
          {getGameMixName(item.game_mix_name || item.game_mix, gameMixes)}
        </div>
      )
    },
    {
      key: 'checksum_info',
      label: 'CHECKSUMS',
      sortable: false,
      render: (item) => (
        <div className="space-y-1">
          <div className="text-xs text-slate-600">
            MD5: {item.checksum_md5 || 'N/A'}
          </div>
          <div className="text-xs text-slate-600">
            SHA256: {item.checksum_sha256 || 'N/A'}
          </div>
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
      label: 'NUME',
      sortable: true,
      render: (item) => (
        <button
          onClick={() => navigate(`/metrology/commission/${item.id}`)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium text-base"
        >
          {item.name || item.commission_number || `Comisie ${item.id}`}
        </button>
      )
    },
    {
      key: 'commission_date',
      label: 'DATA COMISIE',
      sortable: true,
      render: (item) => {
        if (!item.commission_date) return <div className="text-slate-600 dark:text-slate-400">N/A</div>
        try {
          // Parsează data corect - poate fi string ISO sau deja un obiect Date
          let date
          if (item.commission_date instanceof Date) {
            date = item.commission_date
          } else if (typeof item.commission_date === 'string') {
            // Dacă e deja în format ISO complet, folosește direct
            if (item.commission_date.includes('T')) {
              date = new Date(item.commission_date)
            } else {
              // Dacă e doar YYYY-MM-DD, adaugă T00:00:00
              date = new Date(item.commission_date + 'T00:00:00')
            }
          } else {
            return <div className="text-slate-600 dark:text-slate-400">N/A</div>
          }

          if (isNaN(date.getTime())) {
            return <div className="text-slate-600 dark:text-slate-400">N/A</div>
          }

          const day = String(date.getDate()).padStart(2, '0')
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const year = date.getFullYear()
          return (
            <div className="text-slate-600 dark:text-slate-400">
              {`${day}.${month}.${year}`}
            </div>
          )
        } catch (e) {
          return <div className="text-slate-600 dark:text-slate-400">N/A</div>
        }
      }
    },
    {
      key: 'expiry_date',
      label: 'DATA VALABILITĂȚII',
      sortable: true,
      render: (item) => {
        if (!item.expiry_date) return <div className="text-slate-600 dark:text-slate-400">N/A</div>
        try {
          // Parsează data corect - poate fi string ISO sau deja un obiect Date
          let date
          if (item.expiry_date instanceof Date) {
            date = item.expiry_date
          } else if (typeof item.expiry_date === 'string') {
            // Dacă e deja în format ISO complet, folosește direct
            if (item.expiry_date.includes('T')) {
              date = new Date(item.expiry_date)
            } else {
              // Dacă e doar YYYY-MM-DD, adaugă T00:00:00
              date = new Date(item.expiry_date + 'T00:00:00')
            }
          } else {
            return <div className="text-slate-600 dark:text-slate-400">N/A</div>
          }

          if (isNaN(date.getTime())) {
            return <div className="text-slate-600 dark:text-slate-400">N/A</div>
          }

          const day = String(date.getDate()).padStart(2, '0')
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const year = date.getFullYear()
          return (
            <div className="text-slate-600 dark:text-slate-400">
              {`${day}.${month}.${year}`}
            </div>
          )
        } catch (e) {
          return <div className="text-slate-600 dark:text-slate-400">N/A</div>
        }
      }
    },
    {
      key: 'days_until_expiry',
      label: 'ZILE PÂNĂ LA EXPIRARE',
      sortable: true,
      render: (item) => {
        const days = getDaysUntilExpiry(item.expiry_date)
        if (days === null) return <div className="text-slate-400">N/A</div>
        const isExpired = days < 0
        const isExpiringSoon = days <= 30 && days >= 0
        return (
          <div className={`font-medium ${isExpired
            ? 'text-red-600 dark:text-red-400'
            : isExpiringSoon
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-400'
            }`}>
            {isExpired ? `Expirat (${Math.abs(days)} zile)` : `${days} zile`}
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
    },
    {
      key: 'software',
      label: 'SOFTWARE',
      sortable: true,
      render: (item) => {
        const software = item.software || item.software_name || '-'
        return (
          <div className="text-slate-700 dark:text-slate-300">
            {software}
          </div>
        )
      }
    }
  ]

  // Software columns
  const softwareColumns = [
    {
      key: 'software_name',
      label: 'NUME SOFTWARE',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium">
          {item.software_name || item.name || 'N/A'}
        </div>
      )
    },
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
    { key: 'name', label: 'NUME AUTORITATE', sortable: true },
    { key: 'address', label: 'ADRESĂ', sortable: true },
    {
      key: 'prices',
      label: 'PREȚURI',
      sortable: false,
      render: (item) => (
        <div className="space-y-1">
          {item.price_initiala && (
            <div className="text-xs">
              <span className="text-slate-600">Inițială:</span> {item.price_initiala} LEI
            </div>
          )}
          {item.price_reparatie && (
            <div className="text-xs">
              <span className="text-slate-600">Reparație:</span> {item.price_reparatie} LEI
            </div>
          )}
          {item.price_periodica && (
            <div className="text-xs">
              <span className="text-slate-600">Periodică:</span> {item.price_periodica} LEI
            </div>
          )}
          {!item.price_initiala && !item.price_reparatie && !item.price_periodica && (
            <span className="text-slate-400">-</span>
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

          {/* Sub-navigation - same style as Locations */}
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
                compact={true}
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
