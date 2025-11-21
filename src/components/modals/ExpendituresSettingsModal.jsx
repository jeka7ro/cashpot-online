import React, { useState, useEffect } from 'react'
import { X, Save, Filter, RefreshCw, Eye, EyeOff, CheckSquare, Square, Cloud, Download, MapPin, Database } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

// SINGLE SOURCE OF TRUTH pentru normalizare diacritice!
// Folosit pentru: deduplicare, comparare, salvare
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')  // sedilă → virgulă
    .replace(/ş/g, 'ș')  // sedilă → virgulă
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

// Deduplicate array based on normalized diacritics
// RETURNEAZĂ valorile NORMALIZATE pentru consistență!
const uniqueDeduplicate = (arr) => {
  const seen = new Set()
  const unique = []
  
  arr.forEach(item => {
    const normalized = normalizeDiacritics(item)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      unique.push(normalized) // Returnăm valoarea normalizată
    }
  })
  
  return unique
}

const ExpendituresSettingsModal = ({ onClose, onSave }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Data from external DB
  const [expenditureTypes, setExpenditureTypes] = useState([])
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  
  // Track newly discovered items
  const [newItems, setNewItems] = useState({
    types: [],
    departments: [],
    locations: []
  })
  
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Settings
  const [settings, setSettings] = useState({
    // Auto-sync settings
    autoSync: false,
    syncInterval: 24, // hours
    syncTime: '02:00',
    
    // Filter settings
    excludeDeleted: true,
    showInExpenditures: null, // null = ignore filter, true/false = apply filter
    
    // Included items (arrays of names to INCLUDE)
    includedExpenditureTypes: [],
    includedDepartments: [],
    includedLocations: [],
    
    // Date range defaults
    defaultStartDate: formatDateLocal(new Date(new Date().getFullYear(), 0, 1)),
    defaultEndDate: formatDateLocal(new Date(new Date().getFullYear(), 11, 31))
  })
  
  const [activeTab, setActiveTab] = useState('departments') // 'departments' PRIMUL! (user vrea departamente prima)
  
  // Google Sheets Import
  const [googleSheetsSettings, setGoogleSheetsSettings] = useState({
    enabled: false,
    sheetUrl: '',
    syncInterval: 24,
    lastSync: null
  })
  const [importingGoogleSheets, setImportingGoogleSheets] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const [googleSheetsStatus, setGoogleSheetsStatus] = useState(null)
  const [forceImport, setForceImport] = useState(false) // Force import toggle
  const [previewData, setPreviewData] = useState(null) // Preview data before import
  const [loadingPreview, setLoadingPreview] = useState(false)
  
  // Import All Data progress
  const [importingAllManual, setImportingAllManual] = useState(false)
  const [importAllProgress, setImportAllProgress] = useState(null)
  const [importAllProgressIntervalRef, setImportAllProgressIntervalRef] = useState(null)
  
  useEffect(() => {
    loadData()
  }, [])
  
  // Load Google Sheets status when tab is opened
  useEffect(() => {
    if (activeTab === 'google-sheets') {
      loadGoogleSheetsStatus()
    }
  }, [activeTab])
  
  const loadGoogleSheetsStatus = async () => {
    try {
      const response = await axios.get('/api/expenditures/google-sheets-status')
      setGoogleSheetsStatus(response.data)
    } catch (error) {
      console.error('Error loading Google Sheets status:', error)
    }
  }
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load external data
      const [typesRes, deptsRes, locsRes, settingsRes] = await Promise.all([
        axios.get('/api/expenditures/expenditure-types'),
        axios.get('/api/expenditures/departments'),
        axios.get('/api/expenditures/external-locations'),
        axios.get('/api/expenditures/settings')
      ])
      
      // Detect NEW items DOAR dacă listele vechi nu sunt goale (nu e prima încărcare)
      const oldTypes = expenditureTypes.map(t => t.name)
      const oldDepts = departments.map(d => d.name)
      const oldLocs = locations.map(l => l.name)
      
      // Doar dacă listele VECHI au conținut (nu e prima încărcare)
      if (oldTypes.length > 0 || oldDepts.length > 0 || oldLocs.length > 0) {
        const newTypes = typesRes.data.filter(t => !oldTypes.includes(t.name))
        const newDepts = deptsRes.data.filter(d => !oldDepts.includes(d.name))
        const newLocs = locsRes.data.filter(l => !oldLocs.includes(l.name))
        
        if (newTypes.length > 0 || newDepts.length > 0 || newLocs.length > 0) {
          setNewItems({
            types: newTypes.map(t => t.name),
            departments: newDepts.map(d => d.name),
            locations: newLocs.map(l => l.name)
          })
          
          const summary = []
          if (newDepts.length > 0) summary.push(`${newDepts.length} departamente noi`)
          if (newTypes.length > 0) summary.push(`${newTypes.length} categorii noi`)
          if (newLocs.length > 0) summary.push(`${newLocs.length} locații noi`)
          
          toast.success(`✨ Detectat: ${summary.join(', ')}!`)
        } else {
          // Reset newItems dacă nu sunt noi
          setNewItems({ types: [], departments: [], locations: [] })
        }
      } else {
        // Prima încărcare - NU marca nimic ca "nou"
        setNewItems({ types: [], departments: [], locations: [] })
      }
      
      setExpenditureTypes(typesRes.data)
      setDepartments(deptsRes.data)
      setLocations(locsRes.data)
      
      // Load existing settings (cu fallback din localStorage)
      let loadedSettings = settingsRes.data
      
      // FALLBACK: Dacă serverul nu are setări, încearcă localStorage
      if (!loadedSettings || Object.keys(loadedSettings).length === 0) {
        const fallbackSettings = localStorage.getItem('expenditures_settings_fallback')
        if (fallbackSettings) {
          console.log('🔄 FOLOSESC setări din localStorage (server indisponibil)')
          loadedSettings = JSON.parse(fallbackSettings)
        }
      }
      
      // Load settings - respect empty arrays (user a debifat tot!)
      setSettings({
        ...loadedSettings,
        // DACĂ array EXISTĂ (chiar dacă e gol) → folosește-l
        // DOAR dacă e undefined/null → default la toate
        includedExpenditureTypes: loadedSettings.includedExpenditureTypes !== undefined
          ? loadedSettings.includedExpenditureTypes 
          : typesRes.data.map(t => t.name), // Default: toate bifate
        includedDepartments: loadedSettings.includedDepartments !== undefined
          ? loadedSettings.includedDepartments 
          : deptsRes.data.map(d => d.name), // Default: toate bifate
        includedLocations: loadedSettings.includedLocations !== undefined
          ? loadedSettings.includedLocations 
          : locsRes.data.map(l => l.name) // Default: toate bifate
      })
      
      console.log('✅ Loaded settings with arrays:', {
        departments: loadedSettings.includedDepartments,
        types: loadedSettings.includedExpenditureTypes,
        locations: loadedSettings.includedLocations
      })
      
      console.log('✅ Loaded expenditures settings:', loadedSettings)
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Eroare la încărcarea setărilor')
    } finally {
      setLoading(false)
    }
  }
  
  // REFRESH CATEGORII - Detectează și adaugă categorii noi
  const handleRefreshCategories = async () => {
    try {
      setRefreshing(true)
      toast.loading('🔄 Scanez datele pentru categorii noi...', { id: 'refresh' })
      
      // Re-fetch data
      const [typesRes, deptsRes, locsRes] = await Promise.all([
        axios.get('/api/expenditures/expenditure-types'),
        axios.get('/api/expenditures/departments'),
        axios.get('/api/expenditures/external-locations')
      ])
      
      // Detect NEW items
      const oldTypes = expenditureTypes.map(t => t.name)
      const oldDepts = departments.map(d => d.name)
      const oldLocs = locations.map(l => l.name)
      
      const newTypes = typesRes.data.filter(t => !oldTypes.includes(t.name))
      const newDepts = deptsRes.data.filter(d => !oldDepts.includes(d.name))
      const newLocs = locsRes.data.filter(l => !oldLocs.includes(l.name))
      
      // Update lists
      setExpenditureTypes(typesRes.data)
      setDepartments(deptsRes.data)
      setLocations(locsRes.data)
      
      // Track new items for highlighting
      if (newTypes.length > 0 || newDepts.length > 0 || newLocs.length > 0) {
        setNewItems({
          types: newTypes.map(t => t.name),
          departments: newDepts.map(d => d.name),
          locations: newLocs.map(l => l.name)
        })
        
        // Auto-select new items (opțional - pentru ușurință)
        setSettings(prev => ({
          ...prev,
          includedExpenditureTypes: [...new Set([...(prev.includedExpenditureTypes || []), ...newTypes.map(t => t.name)])],
          includedDepartments: [...new Set([...(prev.includedDepartments || []), ...newDepts.map(d => d.name)])],
          includedLocations: [...new Set([...(prev.includedLocations || []), ...newLocs.map(l => l.name)])]
        }))
        
        const summary = []
        if (newDepts.length > 0) summary.push(`${newDepts.length} departamente`)
        if (newTypes.length > 0) summary.push(`${newTypes.length} categorii`)
        if (newLocs.length > 0) summary.push(`${newLocs.length} locații`)
        
        toast.success(`✨ Detectat și adăugat: ${summary.join(', ')} NOI!`, { id: 'refresh', duration: 5000 })
      } else {
        toast.success('✅ Nu există categorii noi. Totul este actualizat!', { id: 'refresh' })
      }
      
      // Clear "new" highlights after 10 seconds
      setTimeout(() => {
        setNewItems({ types: [], departments: [], locations: [] })
      }, 10000)
      
    } catch (error) {
      console.error('Error refreshing categories:', error)
      toast.error('❌ Eroare la scanarea categoriilor', { id: 'refresh' })
    } finally {
      setRefreshing(false)
    }
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      
      // REMOVE DUPLICATES! (folosim uniqueDeduplicate - aceeași funcție ca la "Selectează Tot")
      const cleanedSettings = {
        ...settings,
        includedExpenditureTypes: uniqueDeduplicate(settings.includedExpenditureTypes || []),
        includedDepartments: uniqueDeduplicate(settings.includedDepartments || []),
        includedLocations: uniqueDeduplicate(settings.includedLocations || [])
      }
      
      console.log('💾 SALVARE SETĂRI - ÎNAINTE de cleanup:', {
        types: settings.includedExpenditureTypes?.length,
        departments: settings.includedDepartments?.length,
        locations: settings.includedLocations?.length
      })
      
      console.log('🧹 DUPĂ cleanup (duplicates removed):', {
        types: cleanedSettings.includedExpenditureTypes?.length,
        departments: cleanedSettings.includedDepartments?.length,
        locations: cleanedSettings.includedLocations?.length
      })
      
      console.log('💾 SALVARE SETĂRI - Ce trimit la backend:', {
        includedDepartments: cleanedSettings.includedDepartments,
        includedExpenditureTypes: cleanedSettings.includedExpenditureTypes,
        includedLocations: cleanedSettings.includedLocations,
        departmentsCount: cleanedSettings.includedDepartments?.length,
        typesCount: cleanedSettings.includedExpenditureTypes?.length,
        locationsCount: cleanedSettings.includedLocations?.length
      })
      
      // SALVARE PE SERVER (în users.preferences - per USER!)
      const response = await axios.put('/api/expenditures/settings', { settings: cleanedSettings })
      
      console.log('✅ RĂSPUNS de la backend:', response.data)
      
      toast.success('✅ Setări salvate pe server! Disponibile pe toate device-urile tale.', {
        duration: 4000,
        icon: '💾'
      })
      
      // RELOAD settings pentru a verifica persistența
      await loadData()
      
      onSave()
    } catch (error) {
      console.error('Error saving settings:', error)
      
      // FALLBACK: Salvare în localStorage dacă serverul nu răspunde (500 ERROR)
      if (error.response?.status === 500 || error.response?.status === 503) {
        console.log('🔄 FALLBACK: Salvez în localStorage (server cloud indisponibil)')
        
        // Recreate cleanedSettings pentru fallback
        const fallbackSettings = {
          ...settings,
          includedExpenditureTypes: removeDuplicatesWithNormalization(settings.includedExpenditureTypes || []),
          includedDepartments: removeDuplicatesWithNormalization(settings.includedDepartments || []),
          includedLocations: removeDuplicatesWithNormalization(settings.includedLocations || [])
        }
        
        localStorage.setItem('expenditures_settings_fallback', JSON.stringify(fallbackSettings))
        
        // Mesaj pentru fallback - funcționează dar DOAR pe acest browser
        toast.warning('⚠️ Setări salvate DOAR pe acest browser (server temporar indisponibil). Vor fi sincronizate automat când serverul revine.', { 
          duration: 6000,
          icon: '💾'
        })
        
        // RELOAD settings pentru a verifica persistența
        await loadData()
        onSave()
      } else {
        toast.error('Eroare la salvarea setărilor: ' + (error.response?.data?.error || error.message))
      }
    } finally {
      setSaving(false)
    }
  }
  
  // Helper: check if item exists in list (cu normalizare!)
  const includesNormalized = (list, item) => {
    const normalizedItem = normalizeDiacritics(item)
    return list.some(listItem => normalizeDiacritics(listItem) === normalizedItem)
  }
  
  const toggleItem = (list, item, setList) => {
    const normalizedItem = normalizeDiacritics(item)
    
    if (includesNormalized(list, item)) {
      // Remove item (compară normalized)
      setList(list.filter(i => normalizeDiacritics(i) !== normalizedItem))
    } else {
      // Add item (adaugă normalized)
      setList([...list, normalizedItem])
    }
  }
  
  const selectAll = (items, setList) => {
    setList(items.map(i => i.name))
  }
  
  const deselectAll = (setList) => {
    setList([])
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-4xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă setările...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Setări Filtrare Cheltuieli</h2>
              <p className="text-blue-100 text-sm mt-1">Configurează ce date să fie importate și calculate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-6">
          <div className="flex space-x-1">
            {[
              { id: 'departments', label: 'Departamente', count: departments.length }, // PRIMUL! (user vrea asta)
              { id: 'types', label: 'Tipuri Cheltuieli', count: expenditureTypes.length },
              { id: 'locations', label: 'Locații', count: locations.length },
              { id: 'charts', label: '📊 Grafice', count: 8 }, // Charts visibility + size
              { id: 'mapping', label: '🗺️ Mapping Locații' }, // Mapping locații POS-Bancă
              { id: 'manual-actions', label: '⚙️ Acțiuni Manuale' }, // Acțiuni manuale cheltuieli
              { id: 'powerbi-config', label: '🔌 Power BI Config' }, // Configurare Power BI
              { id: 'powerbi-sync', label: '☁️ Power BI Sync' }, // Sincronizare Power BI
              { id: 'google-sheets', label: '📊 Google Sheets' }, // Import din Google Sheets!
              { id: 'general', label: 'Setări Generale' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
                {tab.count && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Types Tab */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tipuri Cheltuieli</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Selectează tipurile de cheltuieli care trebuie INCLUSE în calcule
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleRefreshCategories}
                    disabled={refreshing}
                    className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Scanez...' : 'Refresh Categorii'}
                  </button>
                  <button
                    onClick={() => {
                      const allTypes = uniqueDeduplicate(expenditureTypes.map(t => t.name))
                      setSettings(prev => ({ ...prev, includedExpenditureTypes: allTypes }))
                      console.log('✅ Selectat TOT:', allTypes.length, 'tipuri (deduplicate)')
                    }}
                    className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-semibold"
                  >
                    <CheckSquare className="w-4 h-4 inline mr-1" />
                    Selectează Tot
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, includedExpenditureTypes: [] }))}
                    className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                  >
                    <Square className="w-4 h-4 inline mr-1" />
                    Deselectează Tot
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  <strong>{[...new Set(settings.includedExpenditureTypes)].length}</strong> / <strong>{expenditureTypes.length}</strong> tipuri selectate
                  {settings.includedExpenditureTypes.length !== [...new Set(settings.includedExpenditureTypes)].length && (
                    <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                      (⚠️ {settings.includedExpenditureTypes.length - [...new Set(settings.includedExpenditureTypes)].length} duplicate)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {expenditureTypes.map(type => {
                    const isNew = newItems.types.includes(type.name)
                    return (
                    <label
                      key={type.id}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          isNew
                            ? 'bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-400 dark:border-yellow-600 animate-pulse'
                            : includesNormalized(settings.includedExpenditureTypes, type.name)
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={includesNormalized(settings.includedExpenditureTypes, type.name)}
                        onChange={() => toggleItem(
                          settings.includedExpenditureTypes,
                          type.name,
                          (list) => setSettings(prev => ({ ...prev, includedExpenditureTypes: list }))
                        )}
                        className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                      />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1">
                        {type.name}
                      </span>
                        {isNew && (
                          <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full animate-bounce">
                            NOU!
                          </span>
                        )}
                    </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Departamente</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Selectează departamentele care trebuie INCLUSE în calcule
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleRefreshCategories}
                    disabled={refreshing}
                    className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Scanez...' : 'Refresh Departamente'}
                  </button>
                  <button
                    onClick={() => {
                      const allDepts = uniqueDeduplicate(departments.map(d => d.name))
                      setSettings(prev => ({ ...prev, includedDepartments: allDepts }))
                      console.log('✅ Selectat TOT:', allDepts.length, 'departamente (deduplicate)')
                    }}
                    className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-semibold"
                  >
                    <CheckSquare className="w-4 h-4 inline mr-1" />
                    Selectează Tot
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, includedDepartments: [] }))}
                    className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                  >
                    <Square className="w-4 h-4 inline mr-1" />
                    Deselectează Tot
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  <strong>{[...new Set(settings.includedDepartments)].length}</strong> / <strong>{departments.length}</strong> departamente selectate
                  {settings.includedDepartments.length !== [...new Set(settings.includedDepartments)].length && (
                    <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                      (⚠️ {settings.includedDepartments.length - [...new Set(settings.includedDepartments)].length} duplicate)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {departments.map(dept => {
                    const isNew = newItems.departments.includes(dept.name)
                    return (
                    <label
                      key={dept.id}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          isNew
                            ? 'bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-400 dark:border-yellow-600 animate-pulse'
                            : includesNormalized(settings.includedDepartments, dept.name)
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={includesNormalized(settings.includedDepartments, dept.name)}
                        onChange={() => toggleItem(
                          settings.includedDepartments,
                          dept.name,
                          (list) => setSettings(prev => ({ ...prev, includedDepartments: list }))
                        )}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1">
                        {dept.name}
                      </span>
                        {isNew && (
                          <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full animate-bounce">
                            NOU!
                          </span>
                        )}
                    </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Locații Externe</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Selectează locațiile care trebuie INCLUSE în calcule
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleRefreshCategories}
                    disabled={refreshing}
                    className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Scanez...' : 'Refresh Locații'}
                  </button>
                  <button
                    onClick={() => {
                      const allLocs = uniqueDeduplicate(locations.map(l => l.name))
                      setSettings(prev => ({ ...prev, includedLocations: allLocs }))
                      console.log('✅ Selectat TOT:', allLocs.length, 'locații (deduplicate)')
                    }}
                    className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-semibold"
                  >
                    <CheckSquare className="w-4 h-4 inline mr-1" />
                    Selectează Tot
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, includedLocations: [] }))}
                    className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                  >
                    <Square className="w-4 h-4 inline mr-1" />
                    Deselectează Tot
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  <strong>{settings.includedLocations.length}</strong> / <strong>{locations.length}</strong> locații selectate
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {locations.map(loc => {
                    const isNew = newItems.locations.includes(loc.name)
                    return (
                    <label
                      key={loc.id}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          isNew
                            ? 'bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-400 dark:border-yellow-600 animate-pulse'
                            : includesNormalized(settings.includedLocations, loc.name)
                          ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={includesNormalized(settings.includedLocations, loc.name)}
                        onChange={() => toggleItem(
                          settings.includedLocations,
                          loc.name,
                          (list) => setSettings(prev => ({ ...prev, includedLocations: list }))
                        )}
                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                          <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {loc.name}
                            </div>
                            {isNew && (
                              <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full animate-bounce">
                                NOU!
                              </span>
                            )}
                        </div>
                        {loc.address && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {loc.address}
                          </div>
                        )}
                      </div>
                    </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Charts Settings Tab */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Setări Grafice</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configurează vizibilitatea și dimensiunea graficelor
                </p>
              </div>

              {/* Charts Visibility + Individual Sizing */}
              <div className="bg-white dark:bg-slate-900/40 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    📊 Configurare Grafice
                  </h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Dimensiune | ON/OFF
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'evolution', label: '📈 Evoluție Lunară', description: 'Line chart cu trend cheltuieli' },
                    { id: 'departments', label: '📊 Top Departamente', description: 'Bar chart cu cele mai mari cheltuieli' },
                    { id: 'locations', label: '🥧 Distribuție Locații', description: 'Pie chart cu procente pe locații' },
                    { id: 'comparison', label: '📊 Comparație Luna vs Luna', description: 'Bar chart luna curentă vs anterioară' },
                    { id: 'heatmap', label: '🔥 Heatmap Categorii × Locații', description: 'Matrix cu intensitate culoare' },
                    { id: 'topCategories', label: '🥧 Top 10 Categorii', description: 'Pie chart cu cele mai mari categorii' },
                    { id: 'stackedArea', label: '📊 Evoluție Departamente', description: 'Stacked area chart' },
                    { id: 'aiTrend', label: '🤖 Predicție AI', description: 'Trend prediction cu AI (3 luni)' }
                  ].map(chart => (
                    <div key={chart.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{chart.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chart.description}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Dimensiune individuală pentru fiecare grafic */}
                        <select
                          value={(() => {
                            const saved = localStorage.getItem('expenditures_charts_sizes')
                            const sizes = saved ? JSON.parse(saved) : {}
                            return sizes[chart.id] || 'L' // Default: Large
                          })()}
                          onChange={(e) => {
                            const saved = localStorage.getItem('expenditures_charts_sizes')
                            const sizes = saved ? JSON.parse(saved) : {}
                            sizes[chart.id] = e.target.value
                            localStorage.setItem('expenditures_charts_sizes', JSON.stringify(sizes))
                            
                            // Emit event for live update! (timeout pentru propagare)
                            setTimeout(() => {
                              window.dispatchEvent(new Event('storage'))
                              window.dispatchEvent(new CustomEvent('expenditures-settings-changed'))
                            }, 100)
                            
                            const sizeLabels = { 'S': '40%', 'M': '60%', 'L': '100%', 'XL': '150%' }
                            toast.success(`📊 Dimensiune: ${sizeLabels[e.target.value]}`, { duration: 2000 })
                          }}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="S">S (40%)</option>
                          <option value="M">M (60%)</option>
                          <option value="L">L (100%)</option>
                          <option value="XL">XL (150%)</option>
                        </select>
                        
                        {/* ON/OFF checkbox */}
                        <input
                          type="checkbox"
                          checked={(() => {
                            const saved = localStorage.getItem('expenditures_charts_visibility')
                            const visibility = saved ? JSON.parse(saved) : {}
                            return visibility[chart.id] !== false // Default: true
                          })()}
                          onChange={(e) => {
                            try {
                            const saved = localStorage.getItem('expenditures_charts_visibility')
                            const visibility = saved ? JSON.parse(saved) : {}
                            visibility[chart.id] = e.target.checked
                            localStorage.setItem('expenditures_charts_visibility', JSON.stringify(visibility))
                              
                              // Emit event for live update! (timeout pentru propagare)
                              setTimeout(() => {
                                window.dispatchEvent(new Event('storage'))
                                window.dispatchEvent(new CustomEvent('expenditures-settings-changed'))
                              }, 100)
                              
                              toast.success(e.target.checked ? '✅ Grafic afișat' : '❌ Grafic ascuns', { duration: 2000 })
                            } catch (error) {
                              console.error('Error updating visibility:', error)
                              toast.error('Eroare la salvare')
                            }
                          }}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 <strong>Notă:</strong> Setările graficelor se aplică instant la schimbare (preview live).
                </p>
              </div>
            </div>
          )}
          
          {/* General Settings Tab */}
          {/* Google Sheets Tab */}
          {activeTab === 'google-sheets' && (
            <div className="space-y-6">
              {/* Status Dashboard */}
              {googleSheetsStatus && (
                <div className={`rounded-xl p-6 border-2 ${
                  googleSheetsStatus.hasData 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700'
                    : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 border-slate-300 dark:border-slate-700'
                }`}>
                  <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                    {googleSheetsStatus.hasData ? '✅' : '📭'} Status Date Google Sheets
                  </h4>
                  {googleSheetsStatus.hasData ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{googleSheetsStatus.stats.totalRecords.toLocaleString('ro-RO')}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Înregistrări</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{new Date(googleSheetsStatus.stats.earliestDate).toLocaleDateString('ro-RO')}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Prima dată</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{new Date(googleSheetsStatus.stats.latestDate).toLocaleDateString('ro-RO')}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ultima dată</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{googleSheetsStatus.stats.totalAmount.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total Suma</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center">
                      <p className="text-slate-600 dark:text-slate-400">📭 Nu există date din Google Sheets în baza de date</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Folosește formularul de mai jos pentru a importa date</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <Cloud className="w-6 h-6 mr-2 text-green-600" />
                  ☁️ Import din Google Sheets (Date Vechi 2023-2025)
                </h3>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                    <strong>✅ AVANTAJE:</strong> Importă date istorice din Google Sheets fără să afectezi sincronizarea BAT actuală!
                  </p>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                    <li>📊 Import date 2023-2024-2025</li>
                    <li>🔄 Verificare automată duplicate</li>
                    <li>⚡ 0 conflict cu BAT sync</li>
                    <li>🎯 Marcare sursă automată</li>
                  </ul>
                </div>
                
                {/* URL Input */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    URL Google Sheet:
                  </label>
                  <input
                    type="url"
                    value={googleSheetsSettings.sheetUrl}
                    onChange={(e) => setGoogleSheetsSettings(prev => ({ ...prev, sheetUrl: e.target.value }))}
                    placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    💡 Sheet-ul trebuie să fie <strong>public (View only)</strong> sau partajat cu linkul.
                  </p>
                </div>
                
                {/* Import Button */}
                {/* PREVIEW BUTTON - STEP 1 */}
                <button
                  onClick={async () => {
                    if (!googleSheetsSettings.sheetUrl) {
                      toast.error('Introdu URL-ul Google Sheet!')
                      return
                    }
                    
                    setLoadingPreview(true)
                    setPreviewData(null)
                    
                    try {
                      toast.loading('👀 Analizez TOATE datele... (poate dura 30-60 sec)', { id: 'preview' })
                      
                      const response = await axios.post('/api/expenditures/preview-google-sheets', {
                        sheetUrl: googleSheetsSettings.sheetUrl
                      })
                      
                      setPreviewData(response.data)
                      
                      toast.success(
                        `✅ Analiză completă!\n🆕 ${response.data.newCount} date NOI\n⏭️ ${response.data.duplicateCount} duplicate`,
                        { id: 'preview', duration: 5000 }
                      )
                      
                    } catch (error) {
                      console.error('Preview error:', error)
                      toast.error(
                        `❌ Eroare: ${error.response?.data?.error || error.message}`,
                        { id: 'preview', duration: 5000 }
                      )
                    } finally {
                      setLoadingPreview(false)
                    }
                  }}
                  disabled={loadingPreview || !googleSheetsSettings.sheetUrl}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg mb-6"
                >
                  <Eye className="w-5 h-5" />
                  <span>{loadingPreview ? 'Analizez...' : '👀 PREVIEW Date (fără import)'}</span>
                </button>
                
                {/* PREVIEW RESULTS TABLE */}
                {previewData && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                    <h4 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
                      📊 Rezultate Analiză Completă ({previewData.totalRows} rânduri verificate)
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                        <p className="text-3xl font-bold text-green-700 dark:text-green-300">{previewData.newCount}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">🆕 Date NOI</p>
                      </div>
                      <div className="p-4 bg-gray-100 dark:bg-gray-900/30 rounded-lg text-center">
                        <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">{previewData.duplicateCount}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">⏭️ Duplicate</p>
                      </div>
                      <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-center">
                        <p className="text-3xl font-bold text-red-700 dark:text-red-300">{previewData.errorCount}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">❌ Erori</p>
                      </div>
                    </div>
                    
                    {previewData.newCount > 0 && (
                      <div>
                        <h5 className="font-bold text-green-800 dark:text-green-300 mb-2">
                          🆕 Sample Date NOI (total {previewData.newCount} vor fi importate):
                        </h5>
                        <div className="overflow-x-auto max-h-60">
                          <table className="w-full text-sm">
                            <thead className="bg-green-200 dark:bg-green-900 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">Data</th>
                                <th className="p-2 text-right">Sumă (RON)</th>
                                <th className="p-2 text-left">Locație</th>
                                <th className="p-2 text-left">Departament</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800">
                              {previewData.newRows.map((row, idx) => (
                                <tr key={idx} className="border-b dark:border-slate-700">
                                  <td className="p-2">{row.date}</td>
                                  <td className="p-2 text-right font-bold">{row.amount.toFixed(2)}</td>
                                  <td className="p-2">{row.location}</td>
                                  <td className="p-2">{row.department}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {previewData.newCount > previewData.newRows.length && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-bold">
                            ... și încă {previewData.newCount - previewData.newRows.length} rânduri noi (afișez sample de {previewData.newRows.length})
                          </p>
                        )}
                      </div>
                    )}
                    
                    {previewData.newCount === 0 && (
                      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-center">
                        <p className="font-bold text-yellow-800 dark:text-yellow-300">⚠️ TOATE datele există deja în baza de date!</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                          Dacă ești sigur că datele lipsesc, bifează "FORCE IMPORT" mai jos și apasă "Import cu FORȚĂ".
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* FORCE IMPORT CHECKBOX - STEP 2 (doar dacă previewData arată 0 noi) */}
                {previewData && previewData.newCount === 0 && (
                  <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceImport}
                        onChange={(e) => setForceImport(e.target.checked)}
                        className="mt-1 w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div>
                        <p className="font-bold text-orange-800 dark:text-orange-300">
                          🔥 FORCE IMPORT (Ignoră verificarea duplicate)
                        </p>
                        <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                          ⚠️ ATENȚIE: Va importa TOATE rândurile din Google Sheet, chiar dacă există deja în baza de date!
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                
                {/* IMPORT BUTTON - STEP 3 (doar dacă avem previewData ȘI (date noi SAU forceImport)) */}
                {previewData && (previewData.newCount > 0 || forceImport) && (
                  <button
                  onClick={async () => {
                    if (!googleSheetsSettings.sheetUrl) {
                      toast.error('Introdu URL-ul Google Sheet!')
                      return
                    }
                    
                    setImportingGoogleSheets(true)
                    setImportProgress(null)
                    
                    try {
                      toast.loading('🔄 Import în curs...', { id: 'google-sheets-import' })
                      
                      const response = await axios.post('/api/expenditures/import-google-sheets', {
                        sheetUrl: googleSheetsSettings.sheetUrl,
                        force: forceImport
                      })
                      
                      setImportProgress(response.data)
                      
                      const { imported, skipped, errors, orphanCount } = response.data
                      
                      let baseMessage = `✅ Import finalizat!\n📥 ${imported} importate\n⏭️ ${skipped} duplicate\n❌ ${errors} erori`
                      if (typeof orphanCount === 'number' && orphanCount > 0) {
                        baseMessage += `\n🧹 ${orphanCount} rânduri există DOAR în SQL (au dispărut din Google Sheet)`
                      }
                      
                      toast.success(
                        baseMessage,
                        { id: 'google-sheets-import', duration: 6000 }
                      )
                      
                      // Refresh data AND status
                      await loadData()
                      await loadGoogleSheetsStatus()
                      
                      // Reset preview
                      setPreviewData(null)
                      setForceImport(false)
                      
                    } catch (error) {
                      console.error('Google Sheets import error:', error)
                      toast.error(
                        `❌ Eroare import: ${error.response?.data?.error || error.message}`,
                        { id: 'google-sheets-import', duration: 5000 }
                      )
                    } finally {
                      setImportingGoogleSheets(false)
                    }
                  }}
                  disabled={importingGoogleSheets || !googleSheetsSettings.sheetUrl}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                >
                  <Download className="w-5 h-5" />
                  <span>{importingGoogleSheets ? 'Import în curs...' : (forceImport ? '🔥 CONFIRMĂ IMPORT CU FORȚĂ' : '✅ CONFIRMĂ IMPORT DATE NOI')}</span>
                </button>
                )}
                
                {/* Progress Bar - LIVE IMPORT STATUS */}
                {importingGoogleSheets && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-6 border-2 border-blue-300 dark:border-blue-700 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <p className="font-bold text-blue-800 dark:text-blue-300">⏳ Import în curs...</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Se procesează datele din Google Sheets</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">Poate dura 30-60 secunde</p>
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">pentru ~2000+ rânduri</p>
                      </div>
                    </div>
                    
                    {/* Animated Progress Bar */}
                    <div className="relative h-3 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]"></div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400">📥 Descărcare CSV</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400">🔍 Verificare duplicate</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400">💾 Salvare în DB</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Import Results */}
                {importProgress && !importingGoogleSheets && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-3">📊 Rezultate Import:</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{importProgress.imported}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">✅ Importate</p>
                      </div>
                      <div className="bg-orange-100 dark:bg-orange-900/40 rounded-lg p-3">
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{importProgress.skipped}</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">⏭️ Duplicate (skip)</p>
                      </div>
                      <div className="bg-red-100 dark:bg-red-900/40 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{importProgress.errors}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">❌ Erori</p>
                      </div>
                      {typeof importProgress.orphanCount === 'number' && importProgress.orphanCount > 0 && (
                        <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-3 col-span-3 mt-2">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            🧹 {importProgress.orphanCount} rânduri există în SQL dar NU mai există în Google Sheet.
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Poți folosi pagina „Tabel SQL Cheltuieli” pentru a le selecta și șterge în bloc.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Info */}
                <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <p className="font-bold text-purple-800 dark:text-purple-300 mb-2">ℹ️ Cum funcționează:</p>
                  <ol className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-decimal list-inside">
                    <li>Backend-ul convertește Google Sheet în CSV</li>
                    <li>Parsează fiecare rând (Date, Sumă, Locație, Departament, Categorie)</li>
                    <li>Verifică duplicate (dacă toate 5 câmpuri se potrivesc = SKIP)</li>
                    <li>Inserează în DB cu marcare <code className="bg-purple-100 dark:bg-purple-900/40 px-1 rounded">data_source: 'google_sheets'</code></li>
                    <li>Dashboard afișează date din AMBELE surse (BAT + Google Sheets)!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
          
          {/* MAPPING LOCAȚII TAB */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  🗺️ Mapping Locații POS & Bancă
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                  Configurează asocierea între locațiile din baza de date și cele din sistemul POS/Bancă.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    🚧 <strong>În dezvoltare</strong> - Funcționalitatea va fi adăugată în versiunea viitoare.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* MANUAL ACTIONS TAB */}
          {activeTab === 'manual-actions' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-purple-600" />
                  ⚙️ Acțiuni Manuale Cheltuieli
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                  Acțiuni manuale pentru gestionarea datelor de cheltuieli.
                </p>
                
                <div className="space-y-4">
                  {/* Sincronizare Date Button - TOATE DATELE 2024-2025 */}
                  <button
                    onClick={async () => {
                      try {
                        toast.loading('Sincronizare în curs pentru 2024-2025... Aceasta poate dura câteva minute.', { id: 'sync-manual', duration: 10000 })
                        
                        // Sincronizează pentru TOATE datele din 2024 și 2025
                        const startDate = '2024-01-01'
                        const endDate = '2025-12-31'
                        
                        const response = await axios.post('/api/expenditures/sync', {
                          startDate: startDate,
                          endDate: endDate,
                          filters: {}
                        }, {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                          },
                          timeout: 300000 // 5 minute timeout pentru sincronizare mare
                        })
                        
                        toast.success(`✅ ${response.data.records || 0} înregistrări sincronizate pentru 2024-2025!`, { id: 'sync-manual', duration: 5000 })
                        
                        // Reload page data if callback exists
                        if (onDataReload) {
                          onDataReload()
                        }
                      } catch (error) {
                        console.error('Error syncing expenditures:', error)
                        toast.error(`❌ Eroare la sincronizare: ${error.response?.data?.error || error.message}`, { id: 'sync-manual', duration: 5000 })
                      }
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center space-x-2 font-semibold text-lg"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>🔄 Sincronizare TOATE Datele (2024-2025: 01.01.2024 - 31.12.2025)</span>
                  </button>
                  
                  {/* Import Toate Datele Button */}
                  <button
                    onClick={async () => {
                      if (importingAllManual) {
                        toast.error('Import deja în curs!')
                        return
                      }
                      
                      setImportingAllManual(true)
                      setImportAllProgress({
                        status: 'running',
                        currentStep: 'Pornire import...',
                        startTime: new Date().toISOString()
                      })
                      
                      // Start polling for progress
                      const intervalId = setInterval(async () => {
                        try {
                          const response = await axios.get('/api/expenditures/import-all-status', {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem('token')}`
                            }
                          })
                          setImportAllProgress(response.data)
                          
                          if (response.data.status === 'completed' || response.data.status === 'error') {
                            clearInterval(intervalId)
                            setImportAllProgressIntervalRef(null)
                            setImportingAllManual(false)
                            
                            if (response.data.status === 'completed') {
                              toast.success('✅ Import completat cu succes!')
                            } else {
                              toast.error('❌ Eroare la import!')
                            }
                          }
                        } catch (error) {
                          console.error('Error fetching import progress:', error)
                        }
                      }, 2000)
                      
                      setImportAllProgressIntervalRef(intervalId)
                      
                      try {
                        await axios.post('/api/expenditures/import-all', {}, {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                          }
                        })
                        toast.success('🚀 Import început! Verifică progresul mai jos.')
                      } catch (error) {
                        console.error('Error starting import:', error)
                        clearInterval(intervalId)
                        setImportAllProgressIntervalRef(null)
                        setImportingAllManual(false)
                        toast.error(`❌ Eroare: ${error.response?.data?.error || error.message}`)
                      }
                    }}
                    disabled={importingAllManual}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                  >
                    <Database className="w-5 h-5" />
                    <span>{importingAllManual ? 'Import în curs...' : '📥 Import Toate Datele'}</span>
                  </button>
                  
                  {/* Progress Display */}
                  {importAllProgress && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Status: {importAllProgress.status === 'running' ? '🔄 În curs...' : importAllProgress.status === 'completed' ? '✅ Completat' : '❌ Eroare'}
                          </span>
                          {importAllProgress.startTime && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Start: {new Date(importAllProgress.startTime).toLocaleTimeString('ro-RO')}
                            </span>
                          )}
                        </div>
                        
                        {importAllProgress.currentStep && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {importAllProgress.currentStep}
                          </p>
                        )}
                        
                        {/* Progress Bar */}
                        {importAllProgress.status === 'running' && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: importAllProgress.totalProcessed && importAllProgress.totalFound 
                                  ? `${(importAllProgress.totalProcessed / importAllProgress.totalFound) * 100}%`
                                  : '0%'
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Stats */}
                        {importAllProgress.totalFound && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Total găsite:</span>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{importAllProgress.totalFound.toLocaleString('ro-RO')}</p>
                            </div>
                            {importAllProgress.imported !== undefined && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Importate:</span>
                                <p className="font-bold text-green-600 dark:text-green-400">{importAllProgress.imported.toLocaleString('ro-RO')}</p>
                              </div>
                            )}
                            {importAllProgress.skipped !== undefined && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Duplicate:</span>
                                <p className="font-bold text-orange-600 dark:text-orange-400">{importAllProgress.skipped.toLocaleString('ro-RO')}</p>
                              </div>
                            )}
                            {importAllProgress.errors !== undefined && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Erori:</span>
                                <p className="font-bold text-red-600 dark:text-red-400">{importAllProgress.errors.toLocaleString('ro-RO')}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Log Output */}
                      {importAllProgress.log && importAllProgress.log.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Log (ultimele 20 linii):</p>
                          <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-xs max-h-40 overflow-y-auto">
                            {importAllProgress.log.slice(-20).map((line, idx) => (
                              <div key={idx}>{line}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* POWER BI CONFIG TAB */}
          {activeTab === 'powerbi-config' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-blue-600" />
                  🔌 Configurare Power BI
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                  Configurează conexiunea la Power BI pentru import automat de date.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    🚧 <strong>În dezvoltare</strong> - Funcționalitatea va fi adăugată în versiunea viitoare.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* POWER BI SYNC TAB */}
          {activeTab === 'powerbi-sync' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <Cloud className="w-5 h-5 mr-2 text-green-600" />
                  ☁️ Sincronizare Power BI
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                  Sincronizează datele din Power BI în baza de date locală.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    🚧 <strong>În dezvoltare</strong> - Funcționalitatea va fi adăugată în versiunea viitoare.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Sincronizare din Birou */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
                  💻 Sincronizare din Birou (RECOMANDAT)
                </h3>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                    <strong>⚠️ IMPORTANT:</strong> Sincronizarea din site <strong>NU funcționează</strong> pentru că backend-ul pe Render.com nu poate accesa database-ul local de la birou (192.168.1.39).
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                    <strong>✅ Soluție:</strong> Folosește script-ul <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">SYNC_EXPENDITURES_WINDOWS.bat</code> de pe PC-ul din birou.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <p className="font-bold text-green-800 dark:text-green-300 mb-2">📂 Locație Script:</p>
                    <code className="text-sm bg-green-100 dark:bg-green-900/40 px-3 py-2 rounded block text-green-900 dark:text-green-200">
                      C:\cashpot-online\SYNC_EXPENDITURES_WINDOWS.bat
                    </code>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <p className="font-bold text-purple-800 dark:text-purple-300 mb-3">🚀 Cum să folosești:</p>
                    <ol className="text-sm text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside mb-4">
                      <li>Conectează-te <strong>REMOTE</strong> la PC-ul din birou (TeamViewer/AnyDesk)</li>
                      <li>Deschide <code className="bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded">C:\cashpot-online\</code></li>
                      <li><strong>Double-click</strong> pe <code className="bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded">SYNC_EXPENDITURES_WINDOWS.bat</code></li>
                      <li>Așteaptă mesajul: <strong className="text-green-600">"✅ SYNC COMPLET!"</strong></li>
                      <li>APOI aici: Click <strong>"🔄 Refresh Departamente"</strong> pentru a vedea categoriile noi!</li>
                    </ol>
                    
                    <a 
                      href="https://github.com/jeka7ro/cashpot-online/raw/main/SYNC_EXPENDITURES_WINDOWS.bat"
                      download="SYNC_EXPENDITURES_WINDOWS.bat"
                      className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                    >
                      📥 Download Script BAT
                    </a>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                    <p className="font-bold text-orange-800 dark:text-orange-300 mb-2">⚙️ Ce face script-ul:</p>
                    <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      <li>✅ Se conectează la database-ul local (192.168.1.39)</li>
                      <li>✅ Extrage datele de cheltuieli</li>
                      <li>✅ Upload automat la backend (Render.com)</li>
                      <li>✅ Datele apar instant pe site!</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <p className="font-bold text-red-800 dark:text-red-300 mb-2">🚫 De ce NU funcționează din site:</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Backend-ul pe <strong>Render.com</strong> (cloud) nu poate accesa IP-ul privat <strong>192.168.1.39</strong> (rețea locală birou). 
                      Script-ul BAT rulează <strong>local pe PC din birou</strong> și are acces direct la database.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Setări Sincronizare Automată</h3>
                
                {/* Auto-Sync */}
                <div className="bg-white dark:bg-slate-900/40 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Auto-Sincronizare</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sincronizează automat la interval fix</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoSync}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                    />
                  </label>
                </div>
                
                {settings.autoSync && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Interval (ore)
                      </label>
                      <select
                        value={settings.syncInterval}
                        onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                        className="input-field"
                      >
                        <option value="1">1 oră</option>
                        <option value="3">3 ore</option>
                        <option value="6">6 ore</option>
                        <option value="12">12 ore</option>
                        <option value="24">24 ore (zilnic)</option>
                        <option value="48">48 ore</option>
                        <option value="168">168 ore (săptămânal)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Ora Sincronizării
                      </label>
                      <input
                        type="time"
                        value={settings.syncTime}
                        onChange={(e) => setSettings(prev => ({ ...prev, syncTime: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Advanced Filters */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Filtre Avansate</h3>
                
                <div className="space-y-3">
                  {/* Exclude Deleted */}
                  <div className="bg-white dark:bg-slate-900/40 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Exclude Deleted</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ignoră înregistrările cu is_deleted = true</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.excludeDeleted}
                        onChange={(e) => setSettings(prev => ({ ...prev, excludeDeleted: e.target.checked }))}
                        className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                      />
                    </label>
                  </div>
                  
                  {/* Show in Expenditures Filter */}
                  <div className="bg-white dark:bg-slate-900/40 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filtru show_in_expenditures</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Filtru pe coloana show_in_expenditures din DB extern
                      </p>
                      <select
                        value={settings.showInExpenditures === null ? 'all' : settings.showInExpenditures.toString()}
                        onChange={(e) => {
                          const val = e.target.value
                          setSettings(prev => ({ 
                            ...prev, 
                            showInExpenditures: val === 'all' ? null : val === 'true' 
                          }))
                        }}
                        className="input-field"
                      >
                        <option value="all">Toate (ignoră filtru)</option>
                        <option value="true">Doar show_in_expenditures = TRUE</option>
                        <option value="false">Doar show_in_expenditures = FALSE</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Date Range Defaults */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Perioadă Implicită</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Data Început
                    </label>
                    <input
                      type="date"
                      value={settings.defaultStartDate}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultStartDate: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Data Sfârșit
                    </label>
                    <input
                      type="date"
                      value={settings.defaultEndDate}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultEndDate: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/40 p-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Notă:</strong> Setările se aplică la următoarea sincronizare
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvare...' : 'Salvează Setări'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpendituresSettingsModal

