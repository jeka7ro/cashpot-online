import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Database, Download, Upload, CheckCircle, XCircle, Search, Filter, RefreshCw, FileUp } from 'lucide-react'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { formatGameMixName } from '../utils/gameMixFormatter'

const CyberImport = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [cyberData, setCyberData] = useState([])
  const [cyberLocations, setCyberLocations] = useState([])
  const [cyberCabinets, setCyberCabinets] = useState([])
  const [cyberGameMixes, setCyberGameMixes] = useState([])
  const [cyberProviders, setCyberProviders] = useState([])
  const [machineAuditSummaries, setMachineAuditSummaries] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [filteredLocations, setFilteredLocations] = useState([])
  const [filteredCabinets, setFilteredCabinets] = useState([])
  const [filteredGameMixes, setFilteredGameMixes] = useState([])
  const [filteredProviders, setFilteredProviders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectedLocations, setSelectedLocations] = useState(new Set())
  const [selectedCabinets, setSelectedCabinets] = useState(new Set())
  const [selectedGameMixes, setSelectedGameMixes] = useState(new Set())
  const [selectedProviders, setSelectedProviders] = useState(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('audit') // 'audit', 'slots', 'locations', 'cabinets', 'gameMixes', 'providers'
  const [useFileImport, setUseFileImport] = useState(true) // Default to file import
  const [filters, setFilters] = useState({
    provider: '',
    cabinet: '',
    gameMix: '',
    status: 'Active' // Default to Active filter
  })
  const [locationFilters, setLocationFilters] = useState({
    company: '',
    city: '',
    status: ''
  })

  // Fetch yesterday's data from Cyber DB (direct connection)
  const fetchYesterdayFromCyberDB = async () => {
    try {
      setLoading(true)
      toast.loading('Conectare la baza de date Cyber...', { id: 'cyber-db' })
      
      const response = await axios.get('/api/cyber-direct/fetch-yesterday')
      
      if (response.data.success) {
        const yesterdayData = response.data.data
        setMachineAuditSummaries(yesterdayData)
        setActiveTab('audit')
        toast.success(
          `✅ ${yesterdayData.length} înregistrări din ${response.data.date} încărcate din Cyber DB!`,
          { id: 'cyber-db', duration: 5000 }
        )
        console.log('✅ Yesterday data from Cyber DB:', yesterdayData)
      } else {
        throw new Error(response.data.error || 'Eroare la citirea datelor')
      }
    } catch (error) {
      console.error('❌ Error fetching from Cyber DB:', error)
      toast.error(
        `Eroare la conectarea la Cyber DB: ${error.response?.data?.error || error.message}`,
        { id: 'cyber-db', duration: 6000 }
      )
    } finally {
      setLoading(false)
    }
  }

  // Handle file upload for slots
  // Load machine audit summaries data
  const fetchMachineAuditSummaries = async () => {
    try {
      setLoading(true)
      // Try to get data from API
      try {
        const response = await axios.get('/api/cyber/machine-audit-summaries')
        setMachineAuditSummaries(response.data)
        console.log('✅ Machine audit summaries loaded from API:', response.data.length)
        return;
      } catch (apiError) {
        console.error('❌ API Error fetching machine audit summaries:', apiError)
        console.log('🔄 Falling back to local JSON file...')
      }
      
      // Fallback to local JSON file if API fails
      try {
        const response = await axios.get('/cyber-data/machine_audit_summaries.json')
        setMachineAuditSummaries(response.data)
        console.log('✅ Machine audit summaries loaded from local file:', response.data.length)
        toast.success('Date încărcate din fișierul local (mod offline)')
      } catch (localError) {
        console.error('❌ Local file error:', localError)
        
        // Last resort: use hardcoded sample data
        const sampleData = [
          {
            "serial_number": "100388",
            "location": "Craiova",
            "cabinet": "AMS-ST-50",
            "mix": "Amusebox",
            "producator": "Amusnet",
            "address": "Str. Infratirii, Nr.2",
            "status": "Active",
            "manufacture_year": 2025
          },
          {
            "serial_number": "149616",
            "location": "București",
            "cabinet": "P42V Curved ST",
            "mix": "Union",
            "producator": "EGT",
            "address": "Sos. Nordului Nr.1",
            "status": "Active",
            "manufacture_year": 2024
          }
        ];
        
        setMachineAuditSummaries(sampleData)
        console.log('⚠️ Using sample data as last resort')
        toast.success('Date de test încărcate (mod offline)')
      }
    } catch (error) {
      console.error('❌ Error in fetchMachineAuditSummaries:', error)
      toast.error('Eroare la încărcarea datelor din machine_audit_summaries')
    } finally {
      setLoading(false)
    }
  }

  // Cyber sync functions
  const handleSyncCyberSlots = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENȚIE: Sincronizarea Cyber va ȘTERGE toate sloturile existente și va importa din nou!\n\n' +
      'Dacă vrei să păstrezi sloturile existente, folosește "Import Safe" în loc de "Sincronizează".\n\n' +
      'Continui cu sincronizarea completă?'
    )
    
    if (!confirmed) return
    
    try {
      toast.loading('Sincronizez sloturile din Cyber...', { id: 'sync-slots' })
      
      try {
        // Step 1: Try API sync
        const response = await axios.post('/api/cyber/sync-slots')
        
        if (response.data.success) {
          toast.success(`Sincronizare completă! ${response.data.syncedCount} sloturi importate.`, { id: 'sync-slots' })
          // Refresh data
          fetchCyberData()
          return
        } else {
          toast.error('Eroare la sincronizare: ' + response.data.message, { id: 'sync-slots' })
        }
      } catch (apiError) {
        console.error('❌ API Error syncing Cyber slots:', apiError)
        
        // Fallback to offline mode
        try {
          console.log('🔄 Falling back to offline Cyber sync mode...')
          toast.loading('Se încearcă sincronizarea în mod offline...', { id: 'sync-slots' })
          
          // Load local cyber-slots.json
          const localResponse = await axios.get('/cyber-slots.json')
          const localData = Array.isArray(localResponse.data) ? localResponse.data : []
          
          if (localData.length > 0) {
            // Use the DataContext to update slots directly
            setSlots(localData)
            
            toast.success(`${localData.length} sloturi sincronizate în mod offline!`, { id: 'sync-slots' })
            // Refresh data
            fetchCyberData()
            return
          } else {
            toast.error('Fișierul local nu conține date valide!', { id: 'sync-slots' })
          }
        } catch (localError) {
          console.error('❌ Local file error during Cyber sync:', localError)
          toast.error('Nu s-a putut încărca fișierul local pentru sincronizare!', { id: 'sync-slots' })
        }
      }
    } catch (error) {
      console.error('Error in handleSyncCyberSlots:', error)
      toast.error('Eroare la sincronizarea sloturilor: ' + error.message, { id: 'sync-slots' })
    }
  }

  const handleSyncCyberSlotsSafe = async () => {
    // Ask user what to import
    const importType = window.prompt(
      'Ce vrei să importezi?\n\n' +
      '1 - Doar jocurile ACTIVE (recomandat)\n' +
      '2 - Toate jocurile (inclusiv inactive)\n\n' +
      'Introdu 1 sau 2:'
    )
    
    if (!importType || (importType !== '1' && importType !== '2')) {
      toast.error('Operațiune anulată')
      return
    }
    
    const onlyActive = importType === '1'
    
    try {
      toast.loading(`Importez sloturile ${onlyActive ? 'ACTIVE' : 'TOATE'} din Cyber...`, { id: 'sync-slots-safe' })
      
      const response = await axios.post('/api/cyber/sync-slots-safe', { onlyActive })
      
      if (response.data.success) {
        toast.success(
          `Import complet! ${response.data.syncedCount} sloturi noi adăugate ` +
          `(${response.data.existingCount} existau deja). ` +
          `+ ${response.data.entitiesPopulated.locations} locații + ` +
          `${response.data.entitiesPopulated.providers} furnizori + ` +
          `${response.data.entitiesPopulated.cabinets} cabinete + ` +
          `${response.data.entitiesPopulated.gameMixes} game mixes`, 
          { id: 'sync-slots-safe' }
        )
        // Refresh data
        fetchCyberData()
      } else {
        toast.error('Eroare la import: ' + response.data.message, { id: 'sync-slots-safe' })
      }
    } catch (error) {
      console.error('Error safe syncing Cyber slots:', error)
      toast.error('Eroare la importul sigur: ' + error.message, { id: 'sync-slots-safe' })
    }
  }

  // Selective sync functions for individual modules
  const handleSyncLocations = async () => {
    try {
      toast.loading('Sincronizez locațiile din Cyber...', { id: 'sync-locations' })
      
      const response = await axios.post('/api/cyber/sync-locations')
      
      if (response.data.success) {
        toast.success(
          `Locații sincronizate! ${response.data.syncedCount} locații noi adăugate`, 
          { id: 'sync-locations' }
        )
        fetchCyberLocations()
      } else {
        toast.error('Eroare la sincronizare locații: ' + response.data.message, { id: 'sync-locations' })
      }
    } catch (error) {
      console.error('Error syncing locations:', error)
      toast.error('Eroare la sincronizare locații: ' + (error.response?.data?.message || error.message), { id: 'sync-locations' })
    }
  }

  const handleSyncGameMixes = async () => {
    try {
      toast.loading('Sincronizez game mixurile din Cyber...', { id: 'sync-game-mixes' })
      
      const response = await axios.post('/api/cyber/sync-game-mixes')
      
      if (response.data.success) {
        toast.success(
          `Game mixuri sincronizate! ${response.data.syncedCount} game mixuri noi adăugate`, 
          { id: 'sync-game-mixes' }
        )
        fetchCyberGameMixes()
      } else {
        toast.error('Eroare la sincronizare game mixuri: ' + response.data.message, { id: 'sync-game-mixes' })
      }
    } catch (error) {
      console.error('Error syncing game mixes:', error)
      toast.error('Eroare la sincronizare game mixuri: ' + (error.response?.data?.message || error.message), { id: 'sync-game-mixes' })
    }
  }

  const handleSyncCabinets = async () => {
    try {
      toast.loading('Sincronizez cabinetele din Cyber...', { id: 'sync-cabinets' })
      
      const response = await axios.post('/api/cyber/sync-cabinets')
      
      if (response.data.success) {
        toast.success(
          `Cabinete sincronizate! ${response.data.syncedCount} cabinete noi adăugate`, 
          { id: 'sync-cabinets' }
        )
        fetchCyberCabinets()
      } else {
        toast.error('Eroare la sincronizare cabinete: ' + response.data.message, { id: 'sync-cabinets' })
      }
    } catch (error) {
      console.error('Error syncing cabinets:', error)
      toast.error('Eroare la sincronizare cabinete: ' + (error.response?.data?.message || error.message), { id: 'sync-cabinets' })
    }
  }

  const handleSyncProviders = async () => {
    try {
      toast.loading('Sincronizez furnizorii din Cyber...', { id: 'sync-providers' })
      
      const response = await axios.post('/api/cyber/sync-providers')
      
      if (response.data.success) {
        toast.success(
          `Furnizori sincronizați! ${response.data.syncedCount} furnizori noi adăugați`, 
          { id: 'sync-providers' }
        )
        fetchCyberProviders()
      } else {
        toast.error('Eroare la sincronizare furnizori: ' + response.data.message, { id: 'sync-providers' })
      }
    } catch (error) {
      console.error('Error syncing providers:', error)
      toast.error('Eroare la sincronizare furnizori: ' + (error.response?.data?.message || error.message), { id: 'sync-providers' })
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result)
        
        // Transform data to Cyber format
        const transformedData = json.map(slot => ({
          id: slot.id,
          serial_number: slot.serial_number || slot.slot_id,
          provider: slot.provider || 'N/A',
          cabinet: slot.cabinet || 'N/A',
          game_mix: formatGameMixName(slot.game_mix_name || slot.game_mix),
          status: slot.status || 'Active',
          location: slot.location || 'N/A',
          last_updated: slot.updated_at || slot.created_at,
          created_at: slot.created_at
        }))
        
        setCyberData(transformedData)
        setFilteredData(transformedData)
        toast.success(`Încărcate ${transformedData.length} sloturi din fișier`)
      } catch (error) {
        console.error('Error parsing JSON:', error)
        toast.error('Eroare la citirea fișierului. Verifică că este un JSON valid.')
      }
    }
    reader.readAsText(file)
  }

  // Fetch slots data from Cyber server
  const fetchCyberData = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/cyber/slots', { timeout: 5000 })
      const data = Array.isArray(response.data) ? response.data : []
      setCyberData(data)
      setFilteredData(data)
      toast.success(`Încărcate ${data.length} sloturi din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber slots from API, loading from JSON file:', error)
      
      // Fallback to real data from JSON file
      try {
        const response = await axios.get('/cyber-slots.json')
        const data = Array.isArray(response.data) ? response.data : []
        setCyberData(data)
        setFilteredData(data)
        toast.success(`Încărcate ${data.length} sloturi din fișierul Cyber`)
      } catch (fileError) {
        console.error('Error loading from JSON file, using demo data:', fileError)
        
        // Final fallback to demo data
        const fallbackData = [
          {
            id: 1,
            serial_number: "149616",
            provider: "EGT",
            cabinet: "P42V Curved ST",
            game_mix: "EGT - Union",
            status: "Active",
            location: "Craiova",
            last_updated: "2025-10-15T11:00:00.000Z",
            created_at: "2025-09-30T05:41:41.000Z"
          },
          {
            id: 2,
            serial_number: "149597",
            provider: "EGT",
            cabinet: "P 32/32 H ST",
            game_mix: null,
            status: "Active",
            location: "Ploiești",
            last_updated: "2025-10-15T11:00:00.000Z",
            created_at: "2025-09-25T08:14:46.000Z"
          },
          {
            id: 3,
            serial_number: "823642",
            provider: "Novomatic",
            cabinet: "FV637C F2",
            game_mix: null,
            status: "Inactive",
            location: "București",
            last_updated: "2025-10-15T11:00:00.000Z",
            created_at: "2025-10-01T10:00:00.000Z"
          }
        ]
        
        setCyberData(fallbackData)
        setFilteredData(fallbackData)
        toast.success(`Încărcate ${fallbackData.length} sloturi (date demo)`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch locations data from Cyber server
  const fetchCyberLocations = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/cyber/locations', { timeout: 5000 })
      // Ensure data is always an array
      const data = Array.isArray(response.data) ? response.data : []
      setCyberLocations(data)
      setFilteredLocations(data)
      toast.success(`Încărcate ${data.length} locații din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber locations from API, loading from JSON file:', error)
      
      // Fallback to real data from JSON file
      try {
        const response = await axios.get('/cyber-locations.json')
        // Ensure data is always an array
        const data = Array.isArray(response.data) ? response.data : []
        setCyberLocations(data)
        setFilteredLocations(data)
        toast.success(`Încărcate ${data.length} locații din fișierul Cyber`)
      } catch (fileError) {
        console.error('Error loading from JSON file, using demo data:', fileError)
        
        // Final fallback to demo data
        const fallbackData = [
          {
            id: 1,
            name: "Craiova",
            location: "Craiova",
            address: "Str. Principală 123",
            city: "Craiova",
            company: "ENTERTAINMENT SOLUTIONS SRL",
            surface_area: 100,
            status: "Active",
            last_updated: "2025-10-15T11:00:00.000Z",
            created_at: "2025-01-01T10:00:00.000Z"
          },
          {
            id: 2,
            name: "Ploiești",
            location: "Ploiești",
            address: "Bld. Republicii 21",
            city: "Ploiești",
            company: "SMARTFLIX SRL",
            surface_area: 80,
            status: "Active",
            last_updated: "2025-10-15T11:00:00.000Z",
            created_at: "2025-01-01T10:00:00.000Z"
          },
          {
            id: 3,
            name: "București",
            location: "București",
            address: "Calea Victoriei 100",
            city: "București",
            company: "ENTERTAINMENT SOLUTIONS SRL",
            surface_area: 150,
            status: "Active",
            last_updated: "2025-10-15T11:00:00.000Z",
            created_at: "2025-01-01T10:00:00.000Z"
          }
        ]
        
        setCyberLocations(fallbackData)
        setFilteredLocations(fallbackData)
        toast.success(`Încărcate ${fallbackData.length} locații (date demo)`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch cabinets data from Cyber server
  const fetchCyberCabinets = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/cyber/cabinets', { timeout: 5000 })
      const data = Array.isArray(response.data) ? response.data : []
      setCyberCabinets(data)
      setFilteredCabinets(data)
      toast.success(`Încărcate ${data.length} cabinete din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber cabinets:', error)
      toast.error('Eroare la încărcarea cabinetelor din Cyber')
      setCyberCabinets([])
      setFilteredCabinets([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch game mixes data from Cyber server
  const fetchCyberGameMixes = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/cyber/game-mixes', { timeout: 5000 })
      const data = Array.isArray(response.data) ? response.data : []
      setCyberGameMixes(data)
      setFilteredGameMixes(data)
      toast.success(`Încărcate ${data.length} game mix-uri din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber game mixes:', error)
      toast.error('Eroare la încărcarea game mix-urilor din Cyber')
      setCyberGameMixes([])
      setFilteredGameMixes([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch providers data from Cyber server
  const fetchCyberProviders = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/cyber/providers', { timeout: 5000 })
      const data = Array.isArray(response.data) ? response.data : []
      setCyberProviders(data)
      setFilteredProviders(data)
      toast.success(`Încărcați ${data.length} furnizori din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber providers:', error)
      toast.error('Eroare la încărcarea furnizorilor din Cyber')
      setCyberProviders([])
      setFilteredProviders([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-load data on component mount
  useEffect(() => {
    fetchMachineAuditSummaries()
    fetchCyberData()
    fetchCyberLocations()
    fetchCyberCabinets()
    fetchCyberGameMixes()
    fetchCyberProviders()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter slots data based on search and filters
  useEffect(() => {
    let filtered = cyberData

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cabinet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.game_mix?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Provider filter
    if (filters.provider) {
      filtered = filtered.filter(item => item.provider === filters.provider)
    }

    // Cabinet filter
    if (filters.cabinet) {
      filtered = filtered.filter(item => item.cabinet === filters.cabinet)
    }

    // Game Mix filter
    if (filters.gameMix) {
      filtered = filtered.filter(item => item.game_mix === filters.gameMix)
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    setFilteredData(filtered)
  }, [cyberData, searchTerm, filters])

  // Filter locations data based on search and filters
  useEffect(() => {
    let filtered = cyberLocations

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Company filter
    if (locationFilters.company) {
      filtered = filtered.filter(item => item.company === locationFilters.company)
    }

    // City filter
    if (locationFilters.city) {
      filtered = filtered.filter(item => item.city === locationFilters.city)
    }

    // Status filter
    if (locationFilters.status) {
      filtered = filtered.filter(item => item.status === locationFilters.status)
    }

    setFilteredLocations(filtered)
  }, [cyberLocations, searchTerm, locationFilters])

  // Get unique values for slots filters
  const getUniqueValues = (field) => {
    // Ensure cyberData is an array before calling map
    if (!Array.isArray(cyberData)) {
      console.warn('cyberData is not an array:', cyberData)
      return []
    }
    return [...new Set(cyberData.map(item => item[field]).filter(Boolean))]
  }

  // Get unique values for locations filters
  const getUniqueLocationValues = (field) => {
    // Ensure cyberLocations is an array before calling map
    if (!Array.isArray(cyberLocations)) {
      console.warn('cyberLocations is not an array:', cyberLocations)
      return []
    }
    return [...new Set(cyberLocations.map(item => item[field]).filter(Boolean))]
  }

  // Toggle slots item selection
  const toggleItemSelection = (id) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  // Toggle locations item selection
  const toggleLocationSelection = (id) => {
    const newSelected = new Set(selectedLocations)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLocations(newSelected)
  }

  // Select all visible slots
  const selectAllVisible = () => {
    // Ensure filteredData is an array before calling map
    if (!Array.isArray(filteredData)) {
      console.warn('filteredData is not an array:', filteredData)
      setSelectedItems(new Set())
      return
    }
    const visibleIds = filteredData.map(item => item.id)
    setSelectedItems(new Set(visibleIds))
  }

  // Select all visible locations
  const selectAllVisibleLocations = () => {
    // Ensure filteredLocations is an array before calling map
    if (!Array.isArray(filteredLocations)) {
      console.warn('filteredLocations is not an array:', filteredLocations)
      setSelectedLocations(new Set())
      return
    }
    const visibleIds = filteredLocations.map(item => item.id)
    setSelectedLocations(new Set(visibleIds))
  }

  // Deselect all slots
  const deselectAll = () => {
    setSelectedItems(new Set())
  }

  // Deselect all locations
  const deselectAllLocations = () => {
    setSelectedLocations(new Set())
  }

  // Import selected slots
  const importSelected = async () => {
    if (selectedItems.size === 0) {
      toast.error('Selectează cel puțin un element pentru import')
      return
    }

    try {
      // Ensure filteredData is an array before calling filter
      if (!Array.isArray(filteredData)) {
        console.warn('filteredData is not an array:', filteredData)
        toast.error('Date invalide pentru import')
        return
      }
      
      const itemsToImport = filteredData.filter(item => selectedItems.has(item.id))
      
      const response = await axios.post('/api/slots/import-marina', {
        items: itemsToImport
      })

      toast.success(`${response.data.imported} sloturi importate cu succes!`)
      setSelectedItems(new Set())
      
      // Refresh Cyber data
      fetchCyberData()
    } catch (error) {
      console.error('Error importing slots:', error)
      toast.error('Eroare la importarea sloturilor')
    }
  }

  // Import selected locations
  const importSelectedLocations = async () => {
    if (selectedLocations.size === 0) {
      toast.error('Selectează cel puțin o locație pentru import')
      return
    }

    try {
      // Ensure filteredLocations is an array before calling filter
      if (!Array.isArray(filteredLocations)) {
        console.warn('filteredLocations is not an array:', filteredLocations)
        toast.error('Date invalide pentru import')
        return
      }
      
      const itemsToImport = filteredLocations.filter(item => selectedLocations.has(item.id))
      
      const response = await axios.post('/api/locations/import-marina', {
        items: itemsToImport
      })

      toast.success(`${response.data.imported} locații importate cu succes!`)
      setSelectedLocations(new Set())
      
      // Refresh Cyber data
      fetchCyberLocations()
    } catch (error) {
      console.error('Error importing locations:', error)
      toast.error('Eroare la importarea locațiilor')
    }
  }

  // Import all visible slots
  const importAllVisible = async () => {
    if (filteredData.length === 0) {
      toast.error('Nu există date de importat')
      return
    }

    try {
      const response = await axios.post('/api/slots/import-marina', {
        items: filteredData
      })

      toast.success(`${response.data.imported} sloturi importate cu succes!`)
      setSelectedItems(new Set())
      
      // Refresh Cyber data
      fetchCyberData()
    } catch (error) {
      console.error('Error importing all slots:', error)
      toast.error('Eroare la importarea sloturilor')
    }
  }

  // Import all visible locations
  const importAllVisibleLocations = async () => {
    if (filteredLocations.length === 0) {
      toast.error('Nu există locații de importat')
      return
    }

    try {
      const response = await axios.post('/api/locations/import-marina', {
        items: filteredLocations
      })

      toast.success(`${response.data.imported} locații importate cu succes!`)
      setSelectedLocations(new Set())
      
      // Refresh Cyber data
      fetchCyberLocations()
    } catch (error) {
      console.error('Error importing all locations:', error)
      toast.error('Eroare la importarea locațiilor')
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchCyberData()
    fetchCyberLocations()
  }, [])

  // Slots columns
  const slotsColumns = [
    {
      key: 'select',
      title: '',
      sortable: false,
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedItems.has(item.id)}
          onChange={() => toggleItemSelection(item.id)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      )
    },
    {
      key: 'serial_number',
      title: 'Serial Number',
      sortable: true,
      render: (item) => (
        <div className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
          {item.serial_number || 'N/A'}
        </div>
      )
    },
    {
      key: 'provider',
      title: 'Provider',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium">
          {item.provider || 'N/A'}
        </div>
      )
    },
    {
      key: 'cabinet',
      title: 'Cabinet',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          {item.cabinet || 'N/A'}
        </div>
      )
    },
    {
      key: 'game_mix',
      title: 'Game Mix',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          {formatGameMixName(item.game_mix_name || item.game_mix)}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.status === 'Active' ? 'bg-green-100 text-green-800' :
          item.status === 'Inactive' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.status || 'N/A'}
        </span>
      )
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400">
          {item.location || 'N/A'}
        </div>
      )
    },
    {
      key: 'address',
      title: 'Adresă',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          <div className="text-sm">{item.address || 'N/A'}</div>
          {item.city && (
            <div className="text-xs text-slate-500">{item.city}</div>
          )}
        </div>
      )
    },
    {
      key: 'company',
      title: 'Companie',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          {item.company || 'N/A'}
        </div>
      )
    },
    {
      key: 'last_updated',
      title: 'Last Updated',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          {item.last_updated ? new Date(item.last_updated).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    }
  ]

  // Machine Audit Summaries columns
  const auditColumns = [
    {
      key: 'select',
      title: '',
      sortable: false,
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedItems.has(item.serial_number)}
          onChange={() => toggleItemSelection(item.serial_number)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      )
    },
    {
      key: 'serial_number',
      title: 'Serial Number',
      sortable: true,
      render: (item) => (
        <div className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
          {item.serial_number || 'N/A'}
        </div>
      )
    },
    {
      key: 'producator',
      title: 'Producător',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium">
          {item.producator || 'N/A'}
        </div>
      )
    },
    {
      key: 'cabinet',
      title: 'Cabinet',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          {item.cabinet || 'N/A'}
        </div>
      )
    },
    {
      key: 'mix',
      title: 'Game Mix',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          {formatGameMixName(item.mix)}
        </div>
      )
    },
    {
      key: 'location',
      title: 'Locație',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400">
          {item.location || 'N/A'}
        </div>
      )
    },
    {
      key: 'address',
      title: 'Adresă',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          <div className="text-sm">{item.address || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.status === 'Active' ? 'bg-green-100 text-green-800' :
          item.status === 'Inactive' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.status || 'N/A'}
        </span>
      )
    },
    {
      key: 'manufacture_year',
      title: 'An Fabricat',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          {item.manufacture_year || 'N/A'}
        </div>
      )
    }
  ]

  // Locations columns
  const locationsColumns = [
    {
      key: 'select',
      title: '',
      sortable: false,
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedLocations.has(item.id)}
          onChange={() => toggleLocationSelection(item.id)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      )
    },
    {
      key: 'name',
      title: 'Nume Locație',
      sortable: true,
      render: (item) => (
        <div className="font-medium text-slate-800 dark:text-slate-200">
          {item.name || 'N/A'}
        </div>
      )
    },
    {
      key: 'address',
      title: 'Adresă',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          {item.address || 'N/A'}
        </div>
      )
    },
    {
      key: 'city',
      title: 'Oraș',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200">
          {item.city || 'N/A'}
        </div>
      )
    },
    {
      key: 'company',
      title: 'Companie',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 dark:text-slate-200 font-medium">
          {item.company || 'N/A'}
        </div>
      )
    },
    {
      key: 'surface_area',
      title: 'Suprafață (m²)',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400">
          {item.surface_area ? `${item.surface_area} m²` : 'N/A'}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.status === 'Active' ? 'bg-green-100 text-green-800' :
          item.status === 'Inactive' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.status || 'N/A'}
        </span>
      )
    },
    {
      key: 'last_updated',
      title: 'Ultima Actualizare',
      sortable: true,
      render: (item) => (
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          {item.last_updated ? new Date(item.last_updated).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/slots')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <Database className="w-6 h-6" />
                <span>Import Cyber</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Importează datele din serverul Cyber
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
            >
              <FileUp className="w-4 h-4" />
              <span>Încarcă JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Cyber DB Direct Import Button for Audit Tab */}
            {activeTab === 'audit' && (
              <button
                onClick={fetchYesterdayFromCyberDB}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg flex items-center space-x-2 transition-all font-medium shadow-lg"
                disabled={loading}
              >
                <Database className="w-4 h-4" />
                <span>📅 Cyber DB (Ieri)</span>
              </button>
            )}
            
            {/* Cyber Sync Buttons */}
            {activeTab === 'slots' && (
              <>
                <button
                  onClick={handleSyncCyberSlotsSafe}
                  className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
                >
                  <Database className="w-4 h-4" />
                  <span>Import Safe</span>
                </button>
                <button
                  onClick={handleSyncCyberSlots}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
                >
                  <Database className="w-4 h-4" />
                  <span>Sincronizează Cyber</span>
                </button>
              </>
            )}

            {/* Selective sync buttons for each module */}
            {activeTab === 'locations' && (
              <button
                onClick={handleSyncLocations}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
              >
                <Database className="w-4 h-4" />
                <span>Sincronizează Locații</span>
              </button>
            )}

            {activeTab === 'gameMixes' && (
              <button
                onClick={handleSyncGameMixes}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
              >
                <Database className="w-4 h-4" />
                <span>Sincronizează Game Mixuri</span>
              </button>
            )}

            {activeTab === 'cabinets' && (
              <button
                onClick={handleSyncCabinets}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
              >
                <Database className="w-4 h-4" />
                <span>Sincronizează Cabinete</span>
              </button>
            )}

            {activeTab === 'providers' && (
              <button
                onClick={handleSyncProviders}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
              >
                <Database className="w-4 h-4" />
                <span>Sincronizează Furnizori</span>
              </button>
            )}
            
          <button
            onClick={() => {
              if (activeTab === 'audit') fetchMachineAuditSummaries()
              else if (activeTab === 'slots') fetchCyberData()
              else if (activeTab === 'locations') fetchCyberLocations()
              else if (activeTab === 'cabinets') fetchCyberCabinets()
              else if (activeTab === 'gameMixes') fetchCyberGameMixes()
              else if (activeTab === 'providers') fetchCyberProviders()
            }}
            disabled={loading}
            className="px-4 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg flex items-center space-x-2 transition-all font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Cyber DB</span>
          </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Machine Audit ({machineAuditSummaries.length})
              </button>
              <button
                onClick={() => setActiveTab('slots')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'slots'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Sloturi ({cyberData.length})
              </button>
              <button
                onClick={() => setActiveTab('locations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'locations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Locații ({cyberLocations.length})
              </button>
              <button
                onClick={() => setActiveTab('cabinets')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cabinets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Cabinete ({cyberCabinets.length})
              </button>
              <button
                onClick={() => setActiveTab('gameMixes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'gameMixes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Game Mixes ({cyberGameMixes.length})
              </button>
              <button
                onClick={() => setActiveTab('providers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'providers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Furnizori ({cyberProviders.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {activeTab === 'audit' ? machineAuditSummaries.length : 
               activeTab === 'slots' ? cyberData.length : cyberLocations.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total înregistrări</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-blue-600">
              {activeTab === 'audit' ? machineAuditSummaries.length :
               activeTab === 'slots' ? filteredData.length : filteredLocations.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Filtrate</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-green-600">
              {activeTab === 'audit' ? selectedItems.size :
               activeTab === 'slots' ? selectedItems.size : selectedLocations.size}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Selectate</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-purple-600">
              {activeTab === 'audit' ? 
                [...new Set(machineAuditSummaries.map(item => item.producator))].length :
                activeTab === 'slots' 
                  ? getUniqueValues('provider').length 
                  : getUniqueLocationValues('company').length
              }
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {activeTab === 'audit' ? 'Producători' :
               activeTab === 'slots' ? 'Provideri' : 'Companii'}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={activeTab === 'audit' 
                    ? "Caută după serial, producător, cabinet, locație..." 
                    : activeTab === 'slots' 
                      ? "Caută după serial, provider, cabinet..." 
                      : "Caută după nume, adresă, oraș, companie..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filtre</span>
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {activeTab === 'slots' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Provider
                      </label>
                      <select
                        value={filters.provider}
                        onChange={(e) => setFilters({...filters, provider: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueValues('provider').map(provider => (
                          <option key={provider} value={provider}>{provider}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cabinet
                      </label>
                      <select
                        value={filters.cabinet}
                        onChange={(e) => setFilters({...filters, cabinet: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueValues('cabinet').map(cabinet => (
                          <option key={cabinet} value={cabinet}>{cabinet}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Game Mix
                      </label>
                      <select
                        value={filters.gameMix}
                        onChange={(e) => setFilters({...filters, gameMix: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueValues('game_mix').map(gameMix => (
                          <option key={gameMix} value={gameMix}>{gameMix}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueValues('status').map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Companie
                      </label>
                      <select
                        value={locationFilters.company}
                        onChange={(e) => setLocationFilters({...locationFilters, company: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueLocationValues('company').map(company => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Oraș
                      </label>
                      <select
                        value={locationFilters.city}
                        onChange={(e) => setLocationFilters({...locationFilters, city: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueLocationValues('city').map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={locationFilters.status}
                        onChange={(e) => setLocationFilters({...locationFilters, status: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Toate</option>
                        {getUniqueLocationValues('status').map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div></div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={activeTab === 'audit' ? selectAllVisible : 
                       activeTab === 'slots' ? selectAllVisible : selectAllVisibleLocations}
              className="btn-secondary flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Selectează toate</span>
            </button>
            <button
              onClick={activeTab === 'audit' ? deselectAll : 
                       activeTab === 'slots' ? deselectAll : deselectAllLocations}
              className="btn-secondary flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Deselectează toate</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={activeTab === 'audit' ? importSelected : 
                       activeTab === 'slots' ? importSelected : importSelectedLocations}
              disabled={activeTab === 'audit' ? selectedItems.size === 0 :
                       activeTab === 'slots' ? selectedItems.size === 0 : selectedLocations.size === 0}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>Importă selectate ({activeTab === 'audit' ? selectedItems.size : 
                       activeTab === 'slots' ? selectedItems.size : selectedLocations.size})</span>
            </button>
            <button
              onClick={activeTab === 'audit' ? importAllVisible : 
                       activeTab === 'slots' ? importAllVisible : importAllVisibleLocations}
              disabled={activeTab === 'audit' ? machineAuditSummaries.length === 0 :
                       activeTab === 'slots' ? filteredData.length === 0 : filteredLocations.length === 0}
              className="btn-success flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Importă toate ({activeTab === 'audit' ? machineAuditSummaries.length : 
                       activeTab === 'slots' ? filteredData.length : filteredLocations.length})</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  {(activeTab === 'audit' ? auditColumns : 
                    activeTab === 'slots' ? slotsColumns : locationsColumns).map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={(activeTab === 'audit' ? auditColumns : 
                      activeTab === 'slots' ? slotsColumns : locationsColumns).length} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-slate-600 dark:text-slate-400">Se încarcă datele din Cyber...</span>
                      </div>
                    </td>
                  </tr>
                ) : (activeTab === 'audit' ? machineAuditSummaries : 
                      activeTab === 'slots' ? filteredData : filteredLocations).length === 0 ? (
                  <tr>
                    <td colSpan={(activeTab === 'audit' ? auditColumns : 
                      activeTab === 'slots' ? slotsColumns : locationsColumns).length} className="px-6 py-12 text-center">
                      <div className="text-slate-500 dark:text-slate-400">
                        {activeTab === 'audit' 
                          ? (machineAuditSummaries.length === 0 ? 'Nu există date în Machine Audit Summaries' : 'Nu există rezultate pentru filtrele aplicate')
                          : activeTab === 'slots' 
                            ? (cyberData.length === 0 ? 'Nu există sloturi în Cyber' : 'Nu există rezultate pentru filtrele aplicate')
                            : (cyberLocations.length === 0 ? 'Nu există locații în Cyber' : 'Nu există rezultate pentru filtrele aplicate')
                        }
                      </div>
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'audit' ? machineAuditSummaries : 
                    activeTab === 'slots' ? filteredData : filteredLocations).map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      {(activeTab === 'audit' ? auditColumns : 
                    activeTab === 'slots' ? slotsColumns : locationsColumns).map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                          {column.render ? column.render(item) : item[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CyberImport
