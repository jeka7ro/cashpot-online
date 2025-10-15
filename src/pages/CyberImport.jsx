import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Database, Download, Upload, CheckCircle, XCircle, Search, Filter, RefreshCw, FileUp } from 'lucide-react'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const CyberImport = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [cyberData, setCyberData] = useState([])
  const [cyberLocations, setCyberLocations] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [filteredLocations, setFilteredLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectedLocations, setSelectedLocations] = useState(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('slots') // 'slots' or 'locations'
  const [useFileImport, setUseFileImport] = useState(true) // Default to file import
  const [filters, setFilters] = useState({
    provider: '',
    cabinet: '',
    gameMix: '',
    status: ''
  })
  const [locationFilters, setLocationFilters] = useState({
    company: '',
    city: '',
    status: ''
  })

  // Handle file upload for slots
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
          game_mix: slot.game_mix || 'N/A',
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
      const response = await axios.get('/api/cyber/slots', { timeout: 30000 })
      setCyberData(response.data)
      setFilteredData(response.data)
      toast.success(`Încărcate ${response.data.length} sloturi din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber slots from API, loading from JSON file:', error)
      
      // Fallback to real data from JSON file
      try {
        const response = await axios.get('/cyber-slots.json')
        setCyberData(response.data)
        setFilteredData(response.data)
        toast.success(`Încărcate ${response.data.length} sloturi din fișierul Cyber`)
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
      const response = await axios.get('/api/cyber/locations', { timeout: 30000 })
      setCyberLocations(response.data)
      setFilteredLocations(response.data)
      toast.success(`Încărcate ${response.data.length} locații din Cyber`)
    } catch (error) {
      console.error('Error fetching Cyber locations from API, loading from JSON file:', error)
      
      // Fallback to real data from JSON file
      try {
        const response = await axios.get('/cyber-locations.json')
        setCyberLocations(response.data)
        setFilteredLocations(response.data)
        toast.success(`Încărcate ${response.data.length} locații din fișierul Cyber`)
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

  // Auto-load data on component mount
  useEffect(() => {
    fetchCyberData()
    fetchCyberLocations()
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
    return [...new Set(cyberData.map(item => item[field]).filter(Boolean))]
  }

  // Get unique values for locations filters
  const getUniqueLocationValues = (field) => {
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
    const visibleIds = filteredData.map(item => item.id)
    setSelectedItems(new Set(visibleIds))
  }

  // Select all visible locations
  const selectAllVisibleLocations = () => {
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
          {item.game_mix || 'N/A'}
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
              className="btn-success flex items-center space-x-2"
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
            
            <button
              onClick={activeTab === 'slots' ? fetchCyberData : fetchCyberLocations}
              disabled={loading}
              className="btn-secondary flex items-center space-x-2"
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
            </nav>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {activeTab === 'slots' ? cyberData.length : cyberLocations.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total înregistrări</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-blue-600">
              {activeTab === 'slots' ? filteredData.length : filteredLocations.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Filtrate</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-green-600">
              {activeTab === 'slots' ? selectedItems.size : selectedLocations.size}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Selectate</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-purple-600">
              {activeTab === 'slots' 
                ? getUniqueValues('provider').length 
                : getUniqueLocationValues('company').length
              }
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {activeTab === 'slots' ? 'Provideri' : 'Companii'}
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
                  placeholder={activeTab === 'slots' 
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
              onClick={activeTab === 'slots' ? selectAllVisible : selectAllVisibleLocations}
              className="btn-secondary flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Selectează toate</span>
            </button>
            <button
              onClick={activeTab === 'slots' ? deselectAll : deselectAllLocations}
              className="btn-secondary flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Deselectează toate</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={activeTab === 'slots' ? importSelected : importSelectedLocations}
              disabled={activeTab === 'slots' ? selectedItems.size === 0 : selectedLocations.size === 0}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>Importă selectate ({activeTab === 'slots' ? selectedItems.size : selectedLocations.size})</span>
            </button>
            <button
              onClick={activeTab === 'slots' ? importAllVisible : importAllVisibleLocations}
              disabled={activeTab === 'slots' ? filteredData.length === 0 : filteredLocations.length === 0}
              className="btn-success flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Importă toate ({activeTab === 'slots' ? filteredData.length : filteredLocations.length})</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  {(activeTab === 'slots' ? slotsColumns : locationsColumns).map((column) => (
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
                    <td colSpan={(activeTab === 'slots' ? slotsColumns : locationsColumns).length} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-slate-600 dark:text-slate-400">Se încarcă datele din Cyber...</span>
                      </div>
                    </td>
                  </tr>
                ) : (activeTab === 'slots' ? filteredData : filteredLocations).length === 0 ? (
                  <tr>
                    <td colSpan={(activeTab === 'slots' ? slotsColumns : locationsColumns).length} className="px-6 py-12 text-center">
                      <div className="text-slate-500 dark:text-slate-400">
                        {activeTab === 'slots' 
                          ? (cyberData.length === 0 ? 'Nu există sloturi în Cyber' : 'Nu există rezultate pentru filtrele aplicate')
                          : (cyberLocations.length === 0 ? 'Nu există locații în Cyber' : 'Nu există rezultate pentru filtrele aplicate')
                        }
                      </div>
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'slots' ? filteredData : filteredLocations).map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      {(activeTab === 'slots' ? slotsColumns : locationsColumns).map((column) => (
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
