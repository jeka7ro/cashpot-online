import React, { useState, useEffect } from 'react'
import { X, Save, Filter, RefreshCw, Eye, EyeOff, CheckSquare, Square } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const ExpendituresSettingsModal = ({ onClose, onSave }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Data from external DB
  const [expenditureTypes, setExpenditureTypes] = useState([])
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  
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
    defaultStartDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    defaultEndDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  })
  
  const [activeTab, setActiveTab] = useState('departments') // 'departments' PRIMUL! (user vrea departamente prima)
  
  useEffect(() => {
    loadData()
  }, [])
  
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
  
  // NORMALIZE DIACRITICS (ţ→ț, ş→ș) pentru a elimina duplicate Unicode!
  const normalizeDiacritics = (str) => {
    return str
      .replace(/ţ/g, 'ț')  // sedilă → virgulă
      .replace(/ş/g, 'ș')  // sedilă → virgulă
      .replace(/Ţ/g, 'Ț')
      .replace(/Ş/g, 'Ș')
  }
  
  const removeDuplicatesWithNormalization = (arr) => {
    const seen = new Set()
    const unique = []
    
    arr.forEach(item => {
      const normalized = normalizeDiacritics(item)
      if (!seen.has(normalized)) {
        seen.add(normalized)
        unique.push(normalized)
      }
    })
    
    return unique
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      
      // REMOVE DUPLICATES! (72 → 71)
      const cleanedSettings = {
        ...settings,
        includedExpenditureTypes: removeDuplicatesWithNormalization(settings.includedExpenditureTypes || []),
        includedDepartments: removeDuplicatesWithNormalization(settings.includedDepartments || []),
        includedLocations: removeDuplicatesWithNormalization(settings.includedLocations || [])
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
      
      // SALVARE PE SERVER (nu localStorage!)
      const response = await axios.put('/api/expenditures/settings', { settings: cleanedSettings })
      
      console.log('✅ RĂSPUNS de la backend:', response.data)
      
      toast.success('Setări salvate cu succes!')
      
      // RELOAD settings pentru a verifica persistența
      await loadData()
      
      onSave()
    } catch (error) {
      console.error('Error saving settings:', error)
      
      // FALLBACK: Salvare în localStorage dacă serverul nu răspunde (500 ERROR)
      if (error.response?.status === 500) {
        console.log('🔄 FALLBACK: Salvez în localStorage până se repară serverul')
        
        // Recreate cleanedSettings pentru fallback
        const fallbackSettings = {
          ...settings,
          includedExpenditureTypes: removeDuplicatesWithNormalization(settings.includedExpenditureTypes || []),
          includedDepartments: removeDuplicatesWithNormalization(settings.includedDepartments || []),
          includedLocations: removeDuplicatesWithNormalization(settings.includedLocations || [])
        }
        
        localStorage.setItem('expenditures_settings_fallback', JSON.stringify(fallbackSettings))
        toast.success('⚠️ Setări salvate local (server indisponibil - fă manual deploy pe Render!)')
        
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
  
  const toggleItem = (list, item, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item))
    } else {
      setList([...list, item])
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
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Setări Filtrare Cheltuieli</h2>
              <p className="text-purple-100 text-sm mt-1">Configurează ce date să fie importate și calculate</p>
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
              { id: 'general', label: 'Setări Generale' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
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
                    onClick={() => setSettings(prev => ({ ...prev, includedExpenditureTypes: expenditureTypes.map(t => t.name) }))}
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
                  {expenditureTypes.map(type => (
                    <label
                      key={type.id}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        settings.includedExpenditureTypes.includes(type.name)
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={settings.includedExpenditureTypes.includes(type.name)}
                        onChange={() => toggleItem(
                          settings.includedExpenditureTypes,
                          type.name,
                          (list) => setSettings(prev => ({ ...prev, includedExpenditureTypes: list }))
                        )}
                        className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {type.name}
                      </span>
                    </label>
                  ))}
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
                    onClick={() => setSettings(prev => ({ ...prev, includedDepartments: departments.map(d => d.name) }))}
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
                  {departments.map(dept => (
                    <label
                      key={dept.id}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        settings.includedDepartments.includes(dept.name)
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={settings.includedDepartments.includes(dept.name)}
                        onChange={() => toggleItem(
                          settings.includedDepartments,
                          dept.name,
                          (list) => setSettings(prev => ({ ...prev, includedDepartments: list }))
                        )}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {dept.name}
                      </span>
                    </label>
                  ))}
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
                    onClick={() => setSettings(prev => ({ ...prev, includedLocations: locations.map(l => l.name) }))}
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
                  {locations.map(loc => (
                    <label
                      key={loc.id}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        settings.includedLocations.includes(loc.name)
                          ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={settings.includedLocations.includes(loc.name)}
                        onChange={() => toggleItem(
                          settings.includedLocations,
                          loc.name,
                          (list) => setSettings(prev => ({ ...prev, includedLocations: list }))
                        )}
                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {loc.name}
                        </div>
                        {loc.address && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {loc.address}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
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
                          }}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                          <option value="M">M (50%)</option>
                          <option value="L">L (100%)</option>
                          <option value="XL">XL (Full)</option>
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
                            const saved = localStorage.getItem('expenditures_charts_visibility')
                            const visibility = saved ? JSON.parse(saved) : {}
                            visibility[chart.id] = e.target.checked
                            localStorage.setItem('expenditures_charts_visibility', JSON.stringify(visibility))
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
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Setări Sincronizare</h3>
                
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
              className="btn-primary flex items-center space-x-2"
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

