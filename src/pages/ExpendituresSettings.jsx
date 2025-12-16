import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { X, Save, Filter, RefreshCw, Eye, EyeOff, CheckSquare, Square, Cloud, Download, MapPin, Database, ArrowLeft, Settings, AlertCircle, CheckCircle, Trash2, BarChart3 } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

// Configure axios base URL for production (same as DataContext)
if (import.meta.env.PROD && !axios.defaults.baseURL) {
  axios.defaults.baseURL = 'https://cashpot-backend.onrender.com'
}

// Ensure Authorization header is set for all requests
// Use interceptor to always include token from sessionStorage
axios.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// SINGLE SOURCE OF TRUTH pentru normalizare diacritice!
// Folosit pentru: deduplicare, comparare, salvare
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 't')  // Elimină complet diacriticele pentru matching
    .replace(/ş/g, 's')
    .replace(/Ţ/g, 'T')
    .replace(/Ş/g, 'S')
    .replace(/ț/g, 't')  // Transformă și virgula în literă simplă
    .replace(/ș/g, 's')
    .replace(/Ț/g, 'T')
    .replace(/Ș/g, 'S')
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/Ă/g, 'A')
    .replace(/Â/g, 'A')
    .replace(/Î/g, 'I')
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

const ExpendituresSettings = () => {
  const navigate = useNavigate()
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
  
  // Settings
  const [settings, setSettings] = useState({
    // Auto-sync settings
    autoSync: false,
    syncInterval: 24, // hours
    syncTime: '02:00',
    syncTimeStart: '19:00', // Ora României - început interval
    syncTimeEnd: '22:00', // Ora României - sfârșit interval
    
    // Filter settings
    excludeDeleted: true,
    showInExpenditures: null, // null = ignore filter, true/false = apply filter
    
    // Included items (arrays of names to INCLUDE)
    includedExpenditureTypes: [],
    includedDepartments: [],
    includedLocations: [],
    
    // Date range defaults
    defaultStartDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    defaultEndDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    
    // Google Sheets URL salvat persistent
    googleSheetsUrl: ''
  })
  
  // URL Search Params - pentru a deschide tab-ul corect din link
  const [searchParams] = useSearchParams()
  
  // Salvează activeTab în localStorage pentru a păstra pagina după refresh
  const [activeTab, setActiveTab] = useState(() => {
    // PRIORITATE: 1. URL param, 2. localStorage, 3. default
    const urlTab = searchParams.get('tab')
    if (urlTab) return urlTab
    const saved = localStorage.getItem('expendituresSettings_activeTab')
    return saved || 'departments' // 'departments' PRIMUL! (user vrea departamente prima)
  })
  
  // Actualizează tab-ul când se schimbă URL-ul
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [searchParams])
  
  // Actualizează localStorage când se schimbă tab-ul
  useEffect(() => {
    localStorage.setItem('expendituresSettings_activeTab', activeTab)
  }, [activeTab])
  
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
  
  // Filtre pentru import Google Sheets
  const [googleSheetsImportFilters, setGoogleSheetsImportFilters] = useState({
    startDate: '',
    endDate: '',
    department: 'all',
    location: 'all'
  })
  
  // Preferences Import (taxe, cyber, etc.)
  const [preferencesImportSettings, setPreferencesImportSettings] = useState({
    sheetUrl: '',
    enabled: false
  })
  const [importingPreferences, setImportingPreferences] = useState(false)
  const [preferencesImportProgress, setPreferencesImportProgress] = useState(null)
  const [preferencesPreviewData, setPreferencesPreviewData] = useState(null) // Preview data before import
  const [loadingPreferencesPreview, setLoadingPreferencesPreview] = useState(false)


  // Modul Electrică - REFACUT COMPLET DE LA ZERO
  const [electricSubTab, setElectricSubTab] = useState('analiza') // 'analiza' sau 'centralizator'
  const [electricInvoiceFile, setElectricInvoiceFile] = useState(null)
  const [electricInvoiceFiles, setElectricInvoiceFiles] = useState([]) // Array pentru multiple fișiere
  const [electricInvoiceLink, setElectricInvoiceLink] = useState('')
  const [electricPdfBase64, setElectricPdfBase64] = useState(null) // PDF ca Base64 pentru salvare
  const [electricPdfFilename, setElectricPdfFilename] = useState(null) // Numele fișierului PDF
  const [processingMultiple, setProcessingMultiple] = useState(false) // Flag pentru procesare multiple
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, currentFile: '' }) // Progres pentru multiple
  const [processingSummary, setProcessingSummary] = useState(null) // Rezumat după procesare
  const [nlcCentralizer, setNlcCentralizer] = useState([])
  const [nlcCentralizerStats, setNlcCentralizerStats] = useState(null)
  const [nlcCentralizerRawData, setNlcCentralizerRawData] = useState([]) // Raw data pentru calcul corect al facturilor
  const [loadingNlcCentralizer, setLoadingNlcCentralizer] = useState(false)
  const [selectedNlcIds, setSelectedNlcIds] = useState([])
  const [deletingNlcs, setDeletingNlcs] = useState(false)
  const [expandedLocations, setExpandedLocations] = useState({})
  const [nlcFilterLocation, setNlcFilterLocation] = useState('all')
  const [nlcFilterPeriod, setNlcFilterPeriod] = useState('all')

  // Funcție pentru salvarea NLC-urilor în centralizator (și opțional în cheltuieli)
  const handleSaveElectricToCentralizer = async () => {
    if (!electricAnalysisResult?.extractedData) {
      toast.error('Nu există date de salvat')
      return
    }

    setSavingElectric(true)
    try {
      // 1. Salvează în centralizator
      toast.loading('Se salvează în centralizator...', { id: 'electric-save' })
      
      const requestData = {
        extractedData: electricAnalysisResult.extractedData
      }
      
      // Salvează automat PDF-ul dacă există (fără confirm)
      if (electricPdfBase64) {
        requestData.pdfData = electricPdfBase64
        requestData.pdfFilename = electricPdfFilename || 'factura.pdf'
        console.log('📎 PDF TRIMIS:', electricPdfFilename, '- Size:', Math.round(electricPdfBase64.length / 1024), 'KB')
      }
      
      const response = await axios.post('/api/expenditures/save-electric-nlc', requestData)

      if (response.data?.success) {
        let message = `✅ ${response.data.saved_count} NLC-uri salvate în centralizator`
        if (response.data.duplicates && response.data.duplicates > 0) {
          message += ` (${response.data.duplicates} duplicate ignorate)`
        }
        if (electricPdfBase64) {
          message += ' 📎'
        }
        
        // 2. Dacă checkbox-ul e bifat, salvează și în cheltuieli
        if (alsoSaveToExpenditures) {
          toast.loading('Se salvează și în cheltuieli...', { id: 'electric-save' })
          
          try {
            const expResponse = await axios.post('/api/expenditures/save-electric-invoice', {
              extractedData: electricAnalysisResult.extractedData
            })
            
            if (expResponse.data?.success) {
              message += ` + ${expResponse.data.saved_count || 'date'} salvate în cheltuieli!`
              toast.success(message, { id: 'electric-save', duration: 5000 })
            } else {
              toast.success(message, { id: 'electric-save', duration: 3000 })
              toast.error('⚠️ Eroare la salvarea în cheltuieli: ' + (expResponse.data?.error || 'Necunoscută'))
            }
          } catch (expError) {
            toast.success(message, { id: 'electric-save', duration: 3000 })
            toast.error('⚠️ Eroare la salvarea în cheltuieli: ' + (expError.response?.data?.error || expError.message))
          }
        } else {
          toast.success(message, { id: 'electric-save', duration: 5000 })
        }
        
        // Resetează după salvare
        setElectricPdfBase64(null)
        setElectricPdfFilename(null)
        setElectricAnalysisResult(null)
        setElectricInvoiceFile(null)
        setElectricInvoiceLink('')
        
        // Încarcă centralizatorul actualizat
        loadNlcCentralizer()
      } else {
        toast.error(response.data?.error || 'Eroare la salvare', { id: 'electric-save' })
      }
    } catch (error) {
      console.error('Error saving to centralizer:', error)
      toast.error(error.response?.data?.error || 'Eroare la salvarea în centralizator', { id: 'electric-save' })
    } finally {
      setSavingElectric(false)
    }
  }

  // Funcție pentru încărcarea centralizatorului NLC
  const loadNlcCentralizer = async () => {
    setLoadingNlcCentralizer(true)
    try {
      const response = await axios.get('/api/expenditures/electric-nlc-centralizer')
      if (response.data?.success) {
        setNlcCentralizer(response.data.data || [])
        setNlcCentralizerStats(response.data.stats || null)
        // Salvează și rawData pentru calculul corect al facturilor netransferate
        if (response.data.rawData) {
          setNlcCentralizerRawData(response.data.rawData || [])
        }
      }
    } catch (error) {
      console.error('Error loading NLC centralizer:', error)
      toast.error('Eroare la încărcarea centralizatorului NLC')
    } finally {
      setLoadingNlcCentralizer(false)
    }
  }

  // Încarcă centralizatorul când se schimbă tab-ul
  useEffect(() => {
    if (activeTab === 'electric' && electricSubTab === 'centralizator') {
      loadNlcCentralizer()
    }
  }, [activeTab, electricSubTab])

  // Funcție pentru transferul facturilor electrice din centralizator în cheltuieli
  const [transferringElectric, setTransferringElectric] = useState(false)
  const handleTransferElectricToExpenditures = async () => {
    // Folosește rawData pentru calcul corect (conține toate înregistrările individuale, nu agregate)
    const rawData = nlcCentralizerRawData.length > 0 ? nlcCentralizerRawData : []
    
    // Dacă nu avem rawData, folosește datele agregate (fallback)
    let unsavedNlcs = []
    if (rawData.length > 0) {
      unsavedNlcs = rawData.filter(nlc => !nlc.saved_to_expenditures)
    } else {
      // Fallback: folosește datele agregate (dar acestea pot fi incomplete)
      unsavedNlcs = nlcCentralizer.filter(nlc => !nlc.saved_to_expenditures)
    }
    
    // Numără facturile UNICE care nu au fost salvate
    const unsavedInvoiceNumbers = [...new Set(unsavedNlcs.map(nlc => nlc.numar_factura).filter(Boolean))]
    const unsavedCount = unsavedInvoiceNumbers.length
    const totalNlcs = unsavedNlcs.length
    
    if (unsavedCount === 0) {
      toast.info('Toate facturile electrice sunt deja salvate în cheltuieli!')
      return
    }

    const confirmed = window.confirm(
      `Transferi ${unsavedCount} facturi electrice (${totalNlcs} NLC-uri) din centralizator în Cheltuieli?\n\nFacturile vor fi salvate în expenditures_sync și vor apărea în modulul Cheltuieli.`
    )
    if (!confirmed) return

    setTransferringElectric(true)
    try {
      toast.loading('Se transferă facturile în cheltuieli...', { id: 'transfer-electric' })
      
      const response = await axios.post('/api/expenditures/transfer-electric-to-expenditures')
      
      if (response.data?.success) {
        toast.success(
          `✅ ${response.data.transferred} înregistrări transferate din ${response.data.invoices} facturi în cheltuieli!`,
          { id: 'transfer-electric', duration: 5000 }
        )
        loadNlcCentralizer() // Reîncarcă centralizatorul pentru a vedea statusul actualizat
      } else {
        toast.error(response.data?.error || 'Eroare la transfer', { id: 'transfer-electric' })
      }
    } catch (error) {
      console.error('Error transferring electric invoices:', error)
      toast.error('Eroare la transferul facturilor: ' + (error.response?.data?.error || error.message), { id: 'transfer-electric' })
    } finally {
      setTransferringElectric(false)
    }
  }

  // Funcție pentru ștergerea NLC-urilor selectate
  const handleDeleteSelectedNlcs = async () => {
    if (selectedNlcIds.length === 0) {
      toast.error('Selectează cel puțin un NLC pentru ștergere!')
      return
    }

    const confirmed = window.confirm(
      `Ești sigur că vrei să ștergi ${selectedNlcIds.length} NLC-uri din centralizator?\n\nAceastă acțiune nu poate fi anulată!`
    )
    if (!confirmed) return

    setDeletingNlcs(true)
    try {
      const response = await axios.post('/api/expenditures/delete-electric-nlcs', {
        nlc_ids: selectedNlcIds
      })
      
      if (response.data?.success) {
        toast.success(`${response.data.deleted_count} NLC-uri șterse cu succes!`)
        setSelectedNlcIds([])
        loadNlcCentralizer()
      } else {
        toast.error(response.data?.error || 'Eroare la ștergere')
      }
    } catch (error) {
      console.error('Error deleting NLCs:', error)
      toast.error('Eroare la ștergerea NLC-urilor')
    } finally {
      setDeletingNlcs(false)
    }
  }

  // Toggle selectare NLC
  const toggleNlcSelection = (nlcId) => {
    setSelectedNlcIds(prev => 
      prev.includes(nlcId) 
        ? prev.filter(id => id !== nlcId)
        : [...prev, nlcId]
    )
  }

  // Selectare/deselectare toate NLC-urile
  const toggleSelectAllNlcs = () => {
    if (selectedNlcIds.length === nlcCentralizer.length) {
      setSelectedNlcIds([])
    } else {
      // Folosim nlc_code pentru identificare unică
      setSelectedNlcIds(nlcCentralizer.map(n => n.nlc_code))
    }
  }

  const [analyzingElectric, setAnalyzingElectric] = useState(false)
  const [electricAnalysisResult, setElectricAnalysisResult] = useState(null)
  const [editingSumaIndex, setEditingSumaIndex] = useState(null)
  const [editingSumaValue, setEditingSumaValue] = useState('')
  const [editingReactivaIndex, setEditingReactivaIndex] = useState(null)
  const [editingReactivaValue, setEditingReactivaValue] = useState('')
  const [editingTotalIndex, setEditingTotalIndex] = useState(null)
  const [editingTotalValue, setEditingTotalValue] = useState('')
  
  // Handler pentru analiza facturii electrice - REFACUT COMPLET
  const handleAnalyzeElectricInvoice = async () => {
    // Dacă avem multiple fișiere, procesează-le pe toate
    if (electricInvoiceFiles && electricInvoiceFiles.length > 0) {
      await handleAnalyzeMultipleInvoices(electricInvoiceFiles)
      return
    }

    if (!electricInvoiceFile && !electricInvoiceLink) {
      toast.error('Atașează un PDF sau introdu un link!')
      return
    }

    setAnalyzingElectric(true)
    setElectricAnalysisResult(null)

    try {
      toast.loading('Se analizează factura...', { id: 'electric-analyze' })

      let requestData = null
      let headers = {}
      
      if (electricInvoiceFile) {
        const formData = new FormData()
        formData.append('file', electricInvoiceFile)
        requestData = formData
      } else if (electricInvoiceLink && electricInvoiceLink.trim()) {
        requestData = { link: electricInvoiceLink.trim() }
        headers['Content-Type'] = 'application/json'
      }

      const response = await axios.post('/api/expenditures/analyze-electric-invoice', requestData, {
        headers,
        timeout: 60000
      })

      if (response.data?.success) {
        setElectricAnalysisResult(response.data)
        toast.success('Factura analizată cu succes!', { id: 'electric-analyze' })
      } else {
        throw new Error(response.data?.error || 'Eroare la analiză')
      }
    } catch (error) {
      console.error('Error analyzing electric invoice:', error)
      toast.error(
        `Eroare la analiză: ${error.response?.data?.error || error.message}`,
        { id: 'electric-analyze', duration: 5000 }
      )
    } finally {
      setAnalyzingElectric(false)
    }
  }

  // Handler pentru procesarea mai multor facturi o dată
  const handleAnalyzeMultipleInvoices = async (files) => {
    if (!files || files.length === 0) {
      toast.error('Nu există fișiere de procesat!')
      return
    }

    setProcessingMultiple(true)
    setProcessingProgress({ current: 0, total: files.length, currentFile: '' })
    setProcessingSummary(null)
    
    let successCount = 0
    let errorCount = 0
    const errors = []
    const processedInvoices = [] // Pentru rezumat
    let totalSum = 0
    let totalNlcs = 0

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProcessingProgress({ 
          current: i + 1, 
          total: files.length, 
          currentFile: file.name 
        })

        try {
          // 1. Analizează factura
          const formData = new FormData()
          formData.append('file', file)
          
          const analyzeResponse = await axios.post('/api/expenditures/analyze-electric-invoice', formData, {
            timeout: 60000
          })

          if (!analyzeResponse.data?.success) {
            throw new Error(analyzeResponse.data?.error || 'Eroare la analiză')
          }

          const extractedData = analyzeResponse.data.extractedData
          const nlcData = extractedData.nlc_data || []
          
          // Folosește suma totală extrasă direct din factură (corectă)
          // Dacă nu există, calculează din NLC-uri ca fallback
          let invoiceSum = 0
          if (extractedData.suma_totala) {
            invoiceSum = parseFloat(extractedData.suma_totala) || 0
            console.log(`   💰 Suma factură ${extractedData.numar_factura || file.name}: ${invoiceSum} RON (din factură)`)
          } else {
            // Fallback: calculează din NLC-uri
            invoiceSum = nlcData.reduce((sum, nlc) => {
              const sumaActiva = parseFloat(nlc.suma) || 0
              const sumaReactiva = parseFloat(nlc.sumaReactiva) || 0
              return sum + sumaActiva + sumaReactiva
            }, 0)
            console.log(`   ⚠️ Suma factură ${extractedData.numar_factura || file.name}: ${invoiceSum} RON (calculată din NLC-uri - fallback)`)
          }
          
          totalSum += invoiceSum
          totalNlcs += nlcData.length
          
          // 2. Convertește PDF-ul la Base64
          const pdfBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          // 3. NU SALVĂ AUTOMAT - doar analizează și pregătește datele
          // Salvare se face doar când utilizatorul apasă "Salvează în centralizator"
          successCount++
          
          processedInvoices.push({
            filename: file.name,
            numarFactura: extractedData.numar_factura || 'N/A',
            suma: invoiceSum,
            nlcs: nlcData.length,
            extractedData: extractedData, // Păstrăm datele extrase pentru salvare ulterioară
            pdfBase64: pdfBase64 // Păstrăm PDF-ul pentru salvare ulterioară
          })
        } catch (error) {
          errorCount++
          errors.push({
            file: file.name,
            error: error.response?.data?.error || error.message
          })
          console.error(`Eroare la procesarea ${file.name}:`, error)
        }
      }

      // Reîncarcă centralizatorul
      await loadNlcCentralizer()

      // Creează rezumatul
      const summary = {
        totalInvoices: files.length,
        successCount,
        errorCount,
        totalSum,
        totalNlcs,
        processedInvoices,
        errors
      }
      setProcessingSummary(summary)

      // Afișează rezultatul final
      if (successCount > 0) {
        toast.success(
          `✅ ${successCount} facturi procesate | ${totalNlcs} NLC-uri | ${totalSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON${errorCount > 0 ? ` | ${errorCount} erori` : ''}`,
          { duration: 8000 }
        )
      }
      
      if (errorCount > 0 && errors.length > 0) {
        console.error('Erori la procesare:', errors)
        toast.error(
          `${errorCount} facturi au avut erori. Verifică rezumatul pentru detalii.`,
          { duration: 5000 }
        )
      }

      // Resetează după procesare
      setElectricInvoiceFiles([])
      setElectricAnalysisResult(null)
    } catch (error) {
      console.error('Error processing multiple invoices:', error)
      toast.error(`Eroare la procesarea facturilor: ${error.message}`, { duration: 5000 })
    } finally {
      setProcessingMultiple(false)
      setProcessingProgress({ current: 0, total: 0, currentFile: '' })
    }
  }

  // Handler pentru salvare în cheltuieli
  const [savingElectric, setSavingElectric] = useState(false)
  const [alsoSaveToExpenditures, setAlsoSaveToExpenditures] = useState(false) // Default: DEZACTIVAT - utilizatorul trebuie să bifeze explicit
  const handleSaveElectricToExpenditures = async () => {
    if (!electricAnalysisResult) {
      toast.error('Analizează mai întâi factura!')
      return
    }

    try {
      setSavingElectric(true)
      toast.loading('Se salvează factura în cheltuieli...', { id: 'electric-save' })

      const response = await axios.post('/api/expenditures/save-electric-invoice', {
        extractedData: electricAnalysisResult.extractedData
      })

      if (response.data?.success) {
        toast.success('Factura electrică a fost salvată cu succes!', { id: 'electric-save' })
        setElectricAnalysisResult(null)
        setElectricInvoiceFile(null)
        setElectricInvoiceLink('')
        setElectricPdfBase64(null)
        setElectricPdfFilename(null)
      } else {
        throw new Error(response.data?.error || 'Eroare la salvare')
      }
    } catch (error) {
      console.error('Error saving electric invoice:', error)
      toast.error(
        `Eroare la salvare: ${error.response?.data?.error || error.message}`,
        { id: 'electric-save', duration: 5000 }
      )
    } finally {
      setSavingElectric(false)
    }
  }

  // Handler pentru export Excel
  const handleExportElectricToGoogleSheet = async () => {
    if (!electricAnalysisResult) {
      toast.error('Analizează mai întâi factura!')
      return
    }

    try {
      toast.loading('Se generează fișierul Excel...', { id: 'electric-export' })

      const response = await axios.post('/api/expenditures/export-electric-to-sheet', {
        extractedData: electricAnalysisResult.extractedData
      }, {
        responseType: 'blob',
        validateStatus: (status) => status < 500 // Accept all status codes below 500
      })

      // Check if response is actually JSON error (when content-type is application/json)
      const contentType = response.headers['content-type']
      if (contentType && contentType.includes('application/json')) {
        // It's an error response
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const error = JSON.parse(reader.result)
            toast.error(`Eroare la export: ${error.error || 'Eroare necunoscută'}`, { id: 'electric-export' })
          } catch (e) {
            toast.error('Eroare la export: răspuns invalid', { id: 'electric-export' })
          }
        }
        reader.readAsText(response.data)
        return
      }

      if (response.data) {
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `Model_Factura_Electrică_${new Date().toISOString().split('T')[0]}.xlsx`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('Fișier Excel exportat cu succes!', { id: 'electric-export' })
      } else {
        throw new Error('Eroare la generarea fișierului')
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error(
        `Eroare la export: ${error.response?.data?.error || error.message}`,
        { id: 'electric-export', duration: 5000 }
      )
    }
  }

  // Manual actions state (sync / import-all / clean-duplicates)
  const [syncingManual, setSyncingManual] = useState(false)
  const [importingAllManual, setImportingAllManual] = useState(false)
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false)
  const [importAllProgress, setImportAllProgress] = useState(null)
  const importAllProgressIntervalRef = useRef(null)
  
  // Modal pentru selectarea surselor de import
  const [showImportSourcesModal, setShowImportSourcesModal] = useState(false)
  const [importSources, setImportSources] = useState({
    bat: true,        // BAT Sync (SQL/API extern)
    googleSheets: true, // Google Sheets
    preferences: true  // Preferences (taxe, cyber, etc.)
  })
  
  // Statistics about data in database
  const [dataStats, setDataStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  
  // Duplicate SMART modal state
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
  const [selectedDuplicatesToKeep, setSelectedDuplicatesToKeep] = useState(new Map())
  const [deletingDuplicates, setDeletingDuplicates] = useState(false)
  const [allRowsForDuplicates, setAllRowsForDuplicates] = useState([]) // Pentru copierea descrierilor

  const fetchImportAllProgress = async () => {
    try {
      const response = await axios.get('/api/expenditures/import-all-status')
      const progress = response.data
      setImportAllProgress(progress)

      if (progress && (progress.status === 'completed' || progress.status === 'failed')) {
        if (importAllProgressIntervalRef.current) {
          clearInterval(importAllProgressIntervalRef.current)
          importAllProgressIntervalRef.current = null
        }
      }
    } catch (error) {
      console.error('Error fetching import-all progress (settings):', error)
    }
  }
  
  // Reset loading state dacă rămâne blocat
  useEffect(() => {
    if (loadingPreview) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Preview timeout - resetez loading state')
        setLoadingPreview(false)
        toast.error('⏱️ Timeout! Sheet-ul e prea mare sau serverul nu răspunde. Încearcă din nou.', { id: 'preview', duration: 7000 })
      }, 305000) // 305 secunde (mai mult decât axios timeout de 300s)
      
      return () => clearTimeout(timeout)
    }
  }, [loadingPreview])
  
  useEffect(() => {
    loadData()
  }, [])
  
  // Sincronizează Google Sheets URL cu settings când se încarcă
  useEffect(() => {
    if (settings.googleSheetsUrl) {
      setGoogleSheetsSettings(prev => ({ ...prev, sheetUrl: settings.googleSheetsUrl }))
    }
  }, [settings.googleSheetsUrl])
  
  // Load Google Sheets status when tab is opened
  useEffect(() => {
    if (activeTab === 'google-sheets') {
      loadGoogleSheetsStatus()
    }
  }, [activeTab])

  // Cleanup import-all interval la unmount
  useEffect(() => {
    return () => {
      if (importAllProgressIntervalRef.current) {
        clearInterval(importAllProgressIntervalRef.current)
        importAllProgressIntervalRef.current = null
      }
    }
  }, [])
  
  // Fetch data statistics
  const fetchDataStats = async () => {
    setLoadingStats(true)
    try {
      const response = await axios.get('/api/expenditures/stats')
      if (response.data?.success) {
        setDataStats(response.data)
      }
    } catch (error) {
      console.error('Error fetching data stats:', error)
      toast.error('Eroare la încărcarea statisticilor')
    } finally {
      setLoadingStats(false)
    }
  }
  
  // Load stats on mount and when import completes
  useEffect(() => {
    fetchDataStats()
  }, [])
  
  // Refresh stats when import completes
  useEffect(() => {
    if (importAllProgress && importAllProgress.status === 'completed') {
      setTimeout(() => {
        fetchDataStats()
      }, 2000)
    }
  }, [importAllProgress])

  // Manual sync from settings (same endpoints ca în pagina principală de Cheltuieli)
  const handleManualSync = async () => {
    try {
      setSyncingManual(true)
      toast.loading('Pornire sincronizare cheltuieli...', { id: 'sync-manual', duration: 1500 })
      const response = await axios.post('/api/expenditures/sync', {
        filters: settings.filters || settings
      })
      if (response.data?.success) {
        toast.success('✅ Sincronizare pornită. Verifică progresul în pagina Cheltuieli.', {
          id: 'sync-manual',
          duration: 4000
        })
      } else {
        toast.error('❌ Nu am putut porni sincronizarea.', { id: 'sync-manual', duration: 4000 })
      }
    } catch (error) {
      console.error('Error syncing expenditures (settings):', error)
      const msg = error.response?.data?.error || error.message || 'Eroare la sincronizare'
      toast.error(`❌ ${msg}`, { id: 'sync-manual', duration: 5000 })
    } finally {
      setSyncingManual(false)
    }
  }

  const handleManualImportAll = async () => {
    // Deschide modal pentru selectarea surselor
    setShowImportSourcesModal(true)
  }
  
  const handleConfirmImportAll = async () => {
    // Verifică dacă cel puțin o sursă este selectată
    if (!importSources.bat && !importSources.googleSheets && !importSources.preferences) {
      toast.error('Selectează cel puțin o sursă pentru import!')
      return
    }
    
    setShowImportSourcesModal(false)
    
    try {
      setImportingAllManual(true)
      toast.loading('Pornire import cheltuieli...', { id: 'import-all-manual', duration: 1500 })

      const response = await axios.post('/api/expenditures/import-all', {
        sources: {
          bat: importSources.bat,
          googleSheets: importSources.googleSheets,
          preferences: importSources.preferences
        }
      }).catch((error) => {
        // Dacă importul este deja pornit, backend-ul poate întoarce 400 cu alreadyRunning
        if (error.response?.status === 400 && error.response?.data?.alreadyRunning) {
          return { data: { success: true, alreadyRunning: true } }
        }
        throw error
      })

      if (response.data?.success || response.data?.alreadyRunning) {
        const selectedSources = []
        if (importSources.bat) selectedSources.push('BAT')
        if (importSources.googleSheets) selectedSources.push('Google Sheets')
        if (importSources.preferences) selectedSources.push('Preferences')
        
        toast.success(`✅ Import pornit din: ${selectedSources.join(', ')}. Vezi progresul mai jos.`, {
          id: 'import-all-manual',
          duration: 4000
        })

        // Pornește polling pentru progres direct din SETĂRI
        if (importAllProgressIntervalRef.current) {
          clearInterval(importAllProgressIntervalRef.current)
        }
        importAllProgressIntervalRef.current = setInterval(fetchImportAllProgress, 1500)
        setTimeout(fetchImportAllProgress, 500)
      } else {
        toast.error('❌ Nu am putut porni importul complet.', { id: 'import-all-manual', duration: 5000 })
      }
    } catch (error) {
      console.error('Error starting import-all (settings):', error)
      const msg = error.response?.data?.error || error.message || 'Eroare la import'
      toast.error(`❌ ${msg}`, { id: 'import-all-manual', duration: 5000 })
    } finally {
      setImportingAllManual(false)
    }
  }

  // Căutare duplicate SMART - caută după: suma, locație, data (operational_date)
  const handleManualCleanDuplicates = async () => {
    setCleaningDuplicates(true)
    setDuplicateGroups([])
    setShowDuplicatesModal(false)
    setSelectedDuplicatesToKeep(new Map())
    
    try {
      toast.loading('Se caută duplicatele...', { id: 'search-duplicates' })
      
      // Încarcă toate datele pentru a găsi duplicatele - IGNORĂ TOATE FILTRELE!
      // NU trimitem parametri de filtrare - vrem TOATE datele
      const params = {
        page: 1,
        pageSize: 'all'
        // NU trimitem startDate, endDate, department, type, location, dataSource, search
        // pentru a obține TOATE datele din baza de date
      }
      
      console.log('🔍 Căutare duplicate - încărcare date fără filtre...', params)
      const response = await axios.get('/api/expenditures/sql-table', { params })
      
      if (!response.data.success) {
        throw new Error('Nu s-au putut încărca datele')
      }
      
      // Backend returnează response.data.data, NU response.data.rows!
      const allRows = response.data.data || []
      console.log('🔍 Date încărcate pentru căutare duplicate:', allRows.length, 'înregistrări')
      
      // Găsește duplicatele bazate pe: suma + locație + departament + tip (FĂRĂ LUNA - SMART!)
      // EXACT CA ÎN PAGINA DE DETALII, dar fără luna pentru a detecta duplicate în luni diferite
      const duplicatesMap = new Map()
      
      allRows.forEach((row, index) => {
        // EXACT CA ÎN ExpendituresSQLTable.jsx - Normalizează suma ROBUST (gestionează virgule, puncte, spații)
        let amountStr = String(row.amount || 0).trim()
        // Elimină toate spațiile
        amountStr = amountStr.replace(/\s/g, '')
        
        // Dacă are virgulă, înlocuiește cu punct (format românesc: 1.234,56)
        if (amountStr.includes(',')) {
          // Format românesc: elimină punctele (separatori mii) și înlocuiește virgula cu punct
          amountStr = amountStr.replace(/\./g, '').replace(',', '.')
        }
        // Dacă are doar puncte, verifică dacă e format american (1,234.56) sau românesc (1.234)
        else if (amountStr.includes('.')) {
          // Dacă are mai multe puncte, e format românesc cu puncte ca separatori mii
          const parts = amountStr.split('.')
          if (parts.length > 2) {
            // Format românesc: elimină toate punctele
            amountStr = parts.join('')
          }
          // Altfel e format american (1,234.56) - lasă-l așa
        }
        
        // Parsează și normalizează la 2 zecimale
        const parsedAmount = parseFloat(amountStr)
        const amount = isNaN(parsedAmount) ? '0.00' : parsedAmount.toFixed(2)
        
        // Normalizează câmpurile text (elimină spații, lowercase, trim)
        const location = (row.location_name || '').trim().toLowerCase()
        const department = (row.department_name || '').trim().toLowerCase()
        const expenditureType = (row.expenditure_type || '').trim().toLowerCase()
        
        // Cheie: suma + locație + departament + tip (FĂRĂ LUNA - SMART pentru duplicate în luni diferite!)
        const key = `${amount}_${location}_${department}_${expenditureType}`
        
        if (!duplicatesMap.has(key)) {
          duplicatesMap.set(key, [])
        }
        duplicatesMap.get(key).push(row)
        
        // Debug pentru primele 10 înregistrări
        if (index < 10) {
          console.log(`🔍 Row ${index}:`, {
            id: row.id,
            originalAmount: row.amount,
            normalizedAmount: amount,
            location: row.location_name,
            normalizedLocation: location,
            department: row.department_name,
            normalizedDepartment: department,
            type: row.expenditure_type,
            normalizedType: expenditureType,
            key
          })
        }
      })
      
      // Debug: afișează statistici despre duplicate
      const groupsWithMultiple = Array.from(duplicatesMap.entries()).filter(([key, items]) => items.length > 1)
      console.log('🔍 Duplicate detection stats (SMART - fără luna):', {
        totalRows: allRows.length,
        uniqueKeys: duplicatesMap.size,
        duplicateGroups: groupsWithMultiple.length,
        totalDuplicates: groupsWithMultiple.reduce((sum, [key, items]) => sum + items.length, 0)
      })
      
      if (groupsWithMultiple.length > 0) {
        console.log('✅ GĂSITE DUPLICATE! Sample duplicate groups (first 10):', groupsWithMultiple.slice(0, 10).map(([key, items]) => ({
          key,
          count: items.length,
          items: items.map(item => ({
            id: item.id,
            date: item.operational_date,
            amount: item.amount,
            location: item.location_name,
            department: item.department_name,
            type: item.expenditure_type,
            source: item.data_source
          }))
        })))
      } else {
        console.warn('⚠️ NU S-AU GĂSIT DUPLICATE! Verifică datele...')
        // Afișează câteva chei pentru debugging
        const sampleKeys = Array.from(duplicatesMap.keys()).slice(0, 20)
        console.log('🔍 Sample keys (first 20):', sampleKeys)
        // Afișează câteva înregistrări pentru debugging
        if (allRows.length > 0) {
          console.log('🔍 Sample rows (first 5):', allRows.slice(0, 5).map(row => ({
            id: row.id,
            amount: row.amount,
            location: row.location_name,
            department: row.department_name,
            type: row.expenditure_type,
            date: row.operational_date
          })))
        }
      }
      
      // Filtrează doar grupurile cu mai mult de 1 înregistrare
      const groups = Array.from(duplicatesMap.values())
        .filter(group => group.length > 1)
        .map((group, index) => ({
          id: `group-${index}`,
          items: group,
          // Prioritar: cel din BAT (data_source = 'bat_sync')
          priorityItem: group.find(item => item.data_source === 'bat_sync') || group[0]
        }))
      
      setDuplicateGroups(groups)
      
      // Selectează automat prioritar (cel din BAT sau primul)
      const initialSelection = new Map()
      groups.forEach(group => {
        const keepId = group.priorityItem.id
        initialSelection.set(group.id, new Set([keepId]))
      })
      setSelectedDuplicatesToKeep(initialSelection)
      
      if (groups.length > 0) {
        setShowDuplicatesModal(true)
        toast.success(`Găsite ${groups.length} grupuri de duplicate (${groups.reduce((sum, g) => sum + g.items.length, 0)} înregistrări)`, { id: 'search-duplicates' })
      } else {
        toast.success('Nu s-au găsit duplicate', { id: 'search-duplicates' })
      }
    } catch (error) {
      console.error('Error searching duplicates:', error)
      toast.error(`Eroare la căutarea duplicate-urilor: ${error.message}`, { id: 'search-duplicates' })
    } finally {
      setCleaningDuplicates(false)
    }
  }
  
  // Toggle selecție pentru o înregistrare dintr-un grup
  const toggleDuplicateSelection = (groupId, itemId) => {
    setSelectedDuplicatesToKeep(prev => {
      const newMap = new Map(prev)
      const groupSelection = newMap.get(groupId) || new Set()
      const newSelection = new Set(groupSelection)
      
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId)
      } else {
        newSelection.add(itemId)
      }
      
      // Asigură-te că cel puțin unul este selectat
      if (newSelection.size === 0) {
        const group = duplicateGroups.find(g => g.id === groupId)
        if (group) {
          newSelection.add(group.priorityItem.id)
        }
      }
      
      newMap.set(groupId, newSelection)
      return newMap
    })
  }
  
  // Șterge duplicatele (păstrează doar cele selectate)
  const handleDeleteDuplicates = async () => {
    if (duplicateGroups.length === 0) return
    
    const idsToDelete = []
    duplicateGroups.forEach(group => {
      const keepIds = selectedDuplicatesToKeep.get(group.id) || new Set()
      group.items.forEach(item => {
        if (!keepIds.has(item.id)) {
          idsToDelete.push(item.id)
        }
      })
    })
    
    if (idsToDelete.length === 0) {
      toast.info('Nu sunt duplicate de șters (toate sunt selectate să fie păstrate)')
      return
    }
    
    const confirm = window.confirm(
      `Ești sigur că vrei să ștergi ${idsToDelete.length} duplicate?\nSe vor păstra ${duplicateGroups.reduce((sum, g) => sum + (selectedDuplicatesToKeep.get(g.id)?.size || 0), 0)} înregistrări.`
    )
    if (!confirm) return
    
    setDeletingDuplicates(true)
    try {
      toast.loading(`Se șterg ${idsToDelete.length} duplicate...`, { id: 'delete-duplicates' })
      
      // Pregătește datele pentru copierea descrierilor
      const updatesToApply = []
      duplicateGroups.forEach(group => {
        const keepIds = selectedDuplicatesToKeep.get(group.id) || new Set()
        const itemsToKeep = group.items.filter(item => keepIds.has(item.id))
        const itemsToDelete = group.items.filter(item => !keepIds.has(item.id))
        
        // Pentru fiecare înregistrare păstrată, verifică dacă are descriere
        itemsToKeep.forEach(keepItem => {
          // Dacă înregistrarea păstrată nu are descriere, caută una în duplicatele șterse
          if (!keepItem.description || keepItem.description.trim() === '' || keepItem.description === 'N/A') {
            const itemWithDescription = itemsToDelete.find(item => 
              item.description && 
              item.description.trim() !== '' && 
              item.description !== 'N/A'
            )
            
            if (itemWithDescription) {
              updatesToApply.push({
                id: keepItem.id,
                description: itemWithDescription.description
              })
            }
          }
        })
      })
      
      // Șterge duplicatele
      await axios.post('/api/expenditures/sql-table/bulk-delete', { 
        ids: idsToDelete,
        confirmDelete: true
      })
      
      // Actualizează descrierile pentru înregistrările păstrate (dacă e nevoie)
      if (updatesToApply.length > 0) {
        console.log(`📝 Actualizăm ${updatesToApply.length} descrieri...`)
        for (const update of updatesToApply) {
          try {
            // Obține înregistrarea curentă pentru a păstra celelalte câmpuri
            const currentRecord = allRowsForDuplicates.find(r => r.id === update.id)
            if (currentRecord) {
              await axios.put(`/api/expenditures/sql-table/${update.id}`, {
                operational_date: currentRecord.operational_date,
                amount: currentRecord.amount,
                location_name: currentRecord.location_name,
                department_name: currentRecord.department_name,
                expenditure_type: currentRecord.expenditure_type,
                description: update.description
              })
            }
          } catch (updateError) {
            console.error(`Error updating description for ${update.id}:`, updateError)
          }
        }
      }
      
      toast.success(
        `${idsToDelete.length} duplicate șterse cu succes!${updatesToApply.length > 0 ? ` ${updatesToApply.length} descrieri copiate.` : ''}`,
        { id: 'delete-duplicates', duration: 5000 }
      )
      setShowDuplicatesModal(false)
      setDuplicateGroups([])
      setSelectedDuplicatesToKeep(new Map())
    } catch (error) {
      console.error('Error deleting duplicates:', error)
      toast.error(`Eroare la ștergerea duplicate-urilor: ${error.response?.data?.error || error.message}`, { id: 'delete-duplicates' })
    } finally {
      setDeletingDuplicates(false)
    }
  }
  
  const loadGoogleSheetsStatus = async () => {
    try {
      const response = await axios.get('/api/expenditures/google-sheets-status')
      setGoogleSheetsStatus(response.data)
    } catch (error) {
      console.error('Error loading Google Sheets status:', error)
      // Nu blocăm pagina - setăm un status default
      setGoogleSheetsStatus({ 
        success: true, 
        hasData: false,
        stats: { totalRecords: 0, earliestDate: null, latestDate: null, totalAmount: 0 }
      })
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
      
      // Normalizează răspunsurile - external-locations returnează { success: true, locations: [...] }
      const locationsData = Array.isArray(locsRes.data) 
        ? locsRes.data 
        : (locsRes.data?.locations || [])
      
      // Transformă array-ul de string-uri în array de obiecte cu name (pentru compatibilitate)
      const locationsArray = locationsData.map(loc => 
        typeof loc === 'string' ? { name: loc } : loc
      )
      
      // Detect NEW items DOAR dacă listele vechi nu sunt goale (nu e prima încărcare)
      const oldTypes = Array.isArray(expenditureTypes) ? expenditureTypes.map(t => t.name) : []
      const oldDepts = Array.isArray(departments) ? departments.map(d => d.name) : []
      const oldLocs = Array.isArray(locations) ? locations.map(l => l.name || l) : []
      
      // Doar dacă listele VECHI au conținut (nu e prima încărcare)
      if (oldTypes.length > 0 || oldDepts.length > 0 || oldLocs.length > 0) {
        const newTypes = typesRes.data.filter(t => !oldTypes.includes(t.name))
        const newDepts = deptsRes.data.filter(d => !oldDepts.includes(d.name))
        const newLocs = locationsArray.filter(l => {
          const locName = typeof l === 'string' ? l : (l.name || l)
          return !oldLocs.includes(locName)
        })
        
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
      
      setExpenditureTypes(typesRes.data || [])
      setDepartments(deptsRes.data || [])
      setLocations(locationsArray)
      
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
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📥 FRONTEND LOAD - Primit de la backend:')
      console.log('   Departments:', loadedSettings.includedDepartments?.length, 'items')
      console.log('   Types:', loadedSettings.includedExpenditureTypes?.length, 'items')
      console.log('   Locations:', loadedSettings.includedLocations?.length, 'items')
      console.log('   Google Sheets URL:', loadedSettings.googleSheetsUrl ? 'YES' : 'NO')
      console.log('   First 3 types:', loadedSettings.includedExpenditureTypes?.slice(0, 3))
      console.log('   First 3 departments:', loadedSettings.includedDepartments?.slice(0, 3))
      
      console.log('🎯 FRONTEND - Setare în state:')
      console.log('   Settings object:', loadedSettings)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💾 FRONTEND SALVARE - ÎNAINTE de cleanup:')
      console.log('   Types:', settings.includedExpenditureTypes?.length)
      console.log('   Departments:', settings.includedDepartments?.length)
      console.log('   Locations:', settings.includedLocations?.length)
      console.log('   First 3 types:', settings.includedExpenditureTypes?.slice(0, 3))
      
      console.log('🧹 FRONTEND - DUPĂ cleanup (duplicates removed):')
      console.log('   Types:', cleanedSettings.includedExpenditureTypes?.length)
      console.log('   Departments:', cleanedSettings.includedDepartments?.length)
      console.log('   Locations:', cleanedSettings.includedLocations?.length)
      console.log('   First 3 types cleaned:', cleanedSettings.includedExpenditureTypes?.slice(0, 3))
      
      console.log('📤 FRONTEND - Trimit la backend:', {
        departmentsCount: cleanedSettings.includedDepartments?.length,
        typesCount: cleanedSettings.includedExpenditureTypes?.length,
        locationsCount: cleanedSettings.includedLocations?.length,
        googleSheetsUrl: cleanedSettings.googleSheetsUrl
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // SALVARE PE SERVER (în users.preferences - per USER!)
      const response = await axios.put('/api/expenditures/settings', { settings: cleanedSettings })
      
      console.log('✅ RĂSPUNS de la backend:', response.data)
      
      toast.success('✅ Setări salvate pe server! Disponibile pe toate device-urile tale.', {
        duration: 4000,
        icon: '💾'
      })
      
      // RELOAD settings pentru a verifica persistența
      await loadData()
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
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă setările...</p>
          </div>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/expenditures')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Setări Cheltuieli</h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">Configurează filtrare, sincronizare și integrări</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Card - Full Width */}
        <div className="card overflow-hidden">
        
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-6 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'departments', label: 'Departamente', count: departments.length }, // PRIMUL! (user vrea asta)
              { id: 'types', label: 'Tipuri Cheltuieli', count: expenditureTypes.length },
              { id: 'locations', label: 'Locații', count: locations.length },
              { id: 'charts', label: '📊 Grafice', count: 8 }, // Charts visibility + size
              { id: 'mapping', label: '🗺️ Mapping Locații' }, // Mapping locații POS-Bancă
              { id: 'powerbi-config', label: '🔌 Power BI Config' }, // Configurare Power BI
              { id: 'powerbi-sync', label: '☁️ Power BI Sync' }, // Sincronizare Power BI
              { id: 'google-sheets', label: '📊 Google Sheets' }, // Import din Google Sheets!
              { id: 'preferences-import', label: '⚙️ Import Preferințe' }, // Import date din preferințe (taxe, cyber, etc.)
              { id: 'electric', label: '⚡ Electrică' }, // Modul Electrică
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
        <div className="p-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
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
                  <strong>{[...new Set(settings.includedDepartments || [])].length}</strong> / <strong>{departments.length}</strong> departamente selectate
                  {settings.includedDepartments && settings.includedDepartments.length !== [...new Set(settings.includedDepartments)].length && (
                    <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                      (⚠️ {settings.includedDepartments.length - [...new Set(settings.includedDepartments)].length} duplicate - se vor elimina la salvare)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Setări Grafice</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configurează vizibilitatea și dimensiunea graficelor din pagina{' '}
                  <span className="font-semibold">Cheltuieli</span> (dashboard principal).
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
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                      {/* Buton ștergere date Google Sheets */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Ești sigur că vrei să ștergi TOATE datele din Google Sheets?\n\nSe vor șterge ${googleSheetsStatus.stats.totalRecords.toLocaleString('ro-RO')} înregistrări.\n\nAceastă acțiune nu poate fi anulată!`
                            )
                            if (!confirmed) return
                            
                            try {
                              toast.loading('Se șterg datele...', { id: 'delete-google-sheets' })
                              await axios.delete('/api/expenditures/google-sheets-data', {
                                data: { confirmDelete: true }
                              })
                              toast.success('Datele Google Sheets au fost șterse cu succes!', { id: 'delete-google-sheets' })
                              await loadGoogleSheetsStatus()
                            } catch (error) {
                              console.error('Error deleting Google Sheets data:', error)
                              toast.error(`Eroare la ștergere: ${error.response?.data?.error || error.message}`, { id: 'delete-google-sheets' })
                            }
                          }}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Șterge date Google Sheets</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center">
                      <p className="text-slate-600 dark:text-slate-400">📭 Nu există date din Google Sheets în baza de date</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Folosește formularul de mai jos pentru a importa date</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                  <Cloud className="w-6 h-6 mr-2 text-blue-500" />
                  Import Google Sheets
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Importă date istorice (2023-2025) fără conflict cu sincronizarea BAT
                </p>
                
                {/* URL Input - macOS Clean */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    URL Google Sheet
                  </label>
                  <input
                    type="url"
                    value={googleSheetsSettings.sheetUrl}
                    onChange={(e) => {
                      setGoogleSheetsSettings(prev => ({ ...prev, sheetUrl: e.target.value }))
                      setSettings(prev => ({ ...prev, googleSheetsUrl: e.target.value }))
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Sheet-ul trebuie să fie public. URL-ul se salvează prin "Salvează Setări" din footer.
                  </p>
                </div>
                
                {/* Filtre pentru import */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtre Import (opțional)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Perioadă */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Data început
                      </label>
                      <input
                        type="date"
                        value={googleSheetsImportFilters.startDate}
                        onChange={(e) => setGoogleSheetsImportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Data sfârșit
                      </label>
                      <input
                        type="date"
                        value={googleSheetsImportFilters.endDate}
                        onChange={(e) => setGoogleSheetsImportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                    {/* Departament */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Departament
                      </label>
                      <select
                        value={googleSheetsImportFilters.department}
                        onChange={(e) => setGoogleSheetsImportFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      >
                        <option value="all">Toate departamentele</option>
                        {departments.map((dept) => (
                          <option key={dept.id || dept.name} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Locație */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Locație
                      </label>
                      <select
                        value={googleSheetsImportFilters.location}
                        onChange={(e) => setGoogleSheetsImportFilters(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      >
                        <option value="all">Toate locațiile</option>
                        {locations.map((loc) => (
                          <option key={loc.id || loc.name} value={loc.name}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                    💡 Dacă nu selectezi filtre, se importă toate datele din Google Sheet
                  </p>
                </div>
                
                {/* PREVIEW BUTTON - macOS Clean Style */}
                <button
                  onClick={async () => {
                    if (!googleSheetsSettings.sheetUrl) {
                      toast.error('Introdu URL-ul Google Sheet!')
                      return
                    }
                    
                    console.log('🔍 USER CLICKED: PREVIEW (Nu importă încă!)')
                    setLoadingPreview(true)
                    setPreviewData(null)
                    setImportingGoogleSheets(false) // Reset import state
                    setImportProgress(null) // Reset import progress
                    
                    try {
                      console.log('🚀 START PREVIEW - URL:', googleSheetsSettings.sheetUrl)
                      toast.loading('🔄 STEP 1/3: Se conectează la Google Sheets...', { id: 'preview' })
                      
                      const startTime = Date.now()
                      const response = await axios.post('/api/expenditures/preview-google-sheets', {
                        sheetUrl: googleSheetsSettings.sheetUrl,
                        startDate: googleSheetsImportFilters.startDate || null,
                        endDate: googleSheetsImportFilters.endDate || null,
                        department: googleSheetsImportFilters.department !== 'all' ? googleSheetsImportFilters.department : null,
                        location: googleSheetsImportFilters.location !== 'all' ? googleSheetsImportFilters.location : null
                      }, {
                        timeout: 300000, // 5 minute timeout pentru sheet-uri mari
                        onUploadProgress: () => {
                          toast.loading('📤 STEP 2/3: Se trimite request...', { id: 'preview' })
                        },
                        onDownloadProgress: () => {
                          toast.loading('📥 STEP 3/3: Se procesează datele...', { id: 'preview' })
                        }
                      })
                      
                      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
                      console.log(`✅ PREVIEW COMPLETE in ${duration}s:`, response.data)
                      setPreviewData(response.data)
                      
                      const message = response.data.wasLimited 
                        ? `✅ Analiză rapidă în ${duration}s!\n${response.data.message}\n🆕 ~${response.data.newCount} date NOI (estimare)\n⏭️ ~${response.data.duplicateCount} duplicate (estimare)`
                        : `✅ Analiză completă în ${duration}s!\n🆕 ${response.data.newCount} date NOI\n⏭️ ${response.data.duplicateCount} duplicate`
                      
                      toast.success(message, { id: 'preview', duration: 6000 })
                      
                    } catch (error) {
                      console.error('❌ PREVIEW ERROR FULL:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                        stack: error.stack
                      })
                      
                      if (error.code === 'ECONNABORTED') {
                        toast.error('⏱️ Timeout! Sheet-ul e prea mare sau serverul nu răspunde.', { id: 'preview', duration: 5000 })
                      } else if (error.response?.status === 500) {
                        toast.error(`❌ Eroare server: ${error.response?.data?.error || 'Verifică logurile backend!'}`, { id: 'preview', duration: 5000 })
                      } else {
                        toast.error(`❌ Eroare: ${error.response?.data?.error || error.message}`, { id: 'preview', duration: 5000 })
                      }
                    } finally {
                      setLoadingPreview(false)
                    }
                  }}
                  disabled={loadingPreview || !googleSheetsSettings.sheetUrl}
                  className="w-full px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
                >
                  <Eye className="w-5 h-5" />
                  <span>{loadingPreview ? 'Se analizează...' : 'Analizează datele'}</span>
                </button>
                
                {/* LOADING - macOS Clean Style */}
                {loadingPreview && (
                  <div className="mb-6 p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-center">
                      <div className="inline-block mb-4">
                        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">
                        Se analizează datele
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Poate dura până la 2 minute
                      </p>
                    </div>
                  </div>
                )}
                
                {/* PREVIEW RESULTS - macOS Clean Style */}
                {previewData && !importingGoogleSheets && (
                  <div className="mb-6 p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-center mb-8">
                      <div className="inline-block w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                        <Eye className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Analiză completă
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {previewData.message || `${previewData.checkedRows} rânduri verificate`}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-green-500 mb-1">{previewData.newCount.toLocaleString('ro-RO')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date noi</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-slate-400 dark:text-slate-500 mb-1">{previewData.duplicateCount.toLocaleString('ro-RO')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duplicate</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-red-500 mb-1">{previewData.errorCount}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Erori</p>
                      </div>
                    </div>
                    
                    {previewData.newCount > 0 && previewData.newRows && previewData.newRows.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <h5 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
                          Previzualizare date
                        </h5>
                        <div className="overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Data</th>
                                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Sumă</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Locație</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Departament</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.newRows.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.date}</td>
                                  <td className="px-4 py-2.5 text-right font-mono text-slate-900 dark:text-slate-100">{row.amount.toFixed(2)}</td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.location}</td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.department}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {previewData.newCount > previewData.newRows.length && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                            +{(previewData.newCount - previewData.newRows.length).toLocaleString('ro-RO')} înregistrări suplimentare
                          </p>
                        )}
                      </div>
                    )}
                    
                    {previewData.newCount === 0 && (
                      <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Toate datele există deja în baza de date
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Verifică perioada sau folosește import forțat
                        </p>
                      </div>
                    )}
                    
                  </div>
                )}
                
                {/* BUTON IMPORT - macOS Clean Style */}
                {previewData && previewData.newCount > 0 && !importingGoogleSheets && (
                  <button
                    onClick={async () => {
                      if (!googleSheetsSettings.sheetUrl) {
                        toast.error('Introdu URL-ul Google Sheet!')
                        return
                      }
                      
                      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                      console.log('💾 USER CLICKED: IMPORT (SALVARE EFECTIVĂ ÎN DB!)')
                      console.log('   Rows to import:', previewData.newCount)
                      console.log('   URL:', googleSheetsSettings.sheetUrl)
                      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                      
                      setImportingGoogleSheets(true)
                      setImportProgress(null)
                      
                      try {
                        toast.loading('Se importă datele...', { id: 'import' })
                        console.log('📤 TRIMITEM REQUEST LA BACKEND: POST /api/expenditures/import-google-sheets')
                        console.log('🔍 Filtre active:', googleSheetsImportFilters)
                        
                        const startTime = Date.now()
                        const response = await axios.post('/api/expenditures/import-google-sheets', {
                          sheetUrl: googleSheetsSettings.sheetUrl,
                          force: forceImport,
                          startDate: googleSheetsImportFilters.startDate || null,
                          endDate: googleSheetsImportFilters.endDate || null,
                          department: googleSheetsImportFilters.department !== 'all' ? googleSheetsImportFilters.department : null,
                          location: googleSheetsImportFilters.location !== 'all' ? googleSheetsImportFilters.location : null
                        }, {
                          timeout: 300000 // 5 minute
                        })
                        
                        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
                        console.log(`✅ RĂSPUNS PRIMIT de la backend în ${duration}s:`, response.data)
                        
                        setImportProgress(response.data)
                        
                        toast.success(
                          `Import complet în ${duration}s: ${response.data.imported} ${response.data.imported === 1 ? 'înregistrare salvată' : 'înregistrări salvate'}`,
                          { id: 'import', duration: 5000 }
                        )
                        
                        // Refresh status
                        await loadGoogleSheetsStatus()
                        
                        // Reset preview pentru a forța un nou preview dacă vrea să reimporte
                        setPreviewData(null)
                        
                      } catch (error) {
                        console.error('Import error:', error)
                        toast.error(
                          `Eroare: ${error.response?.data?.error || error.message}`,
                          { id: 'import', duration: 5000 }
                        )
                      } finally {
                        setImportingGoogleSheets(false)
                      }
                    }}
                    className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 font-medium text-base mb-6"
                  >
                    <Download className="w-5 h-5" />
                    <span>Importă {previewData.newCount.toLocaleString('ro-RO')} {previewData.newCount === 1 ? 'înregistrare' : 'înregistrări'}</span>
                  </button>
                )}
                
                {/* FORCE IMPORT CHECKBOX - STEP 2 (doar dacă previewData arată 0 noi) */}
                {previewData && previewData.newCount === 0 && !importingGoogleSheets && (
                  <div className="mb-4 space-y-3">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
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
                    {/* Buton Import de la zero (force import direct) */}
                    <button
                      onClick={async () => {
                        if (!googleSheetsSettings.sheetUrl) {
                          toast.error('Introdu URL-ul Google Sheet!')
                          return
                        }
                        
                        const confirmed = window.confirm(
                          '🔥 IMPORT DE LA ZERO\n\nVa importa TOATE rândurile din Google Sheet, ignorând duplicatele.\n\nEști sigur?'
                        )
                        if (!confirmed) return
                        
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                        console.log('🔥 USER CLICKED: IMPORT DE LA ZERO (FORCE!)')
                        console.log('   URL:', googleSheetsSettings.sheetUrl)
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                        
                        setImportingGoogleSheets(true)
                        setImportProgress(null)
                        
                        try {
                          toast.loading('Se importă datele de la zero...', { id: 'import-zero' })
                          
                          const startTime = Date.now()
                          const response = await axios.post('/api/expenditures/import-google-sheets', {
                            sheetUrl: googleSheetsSettings.sheetUrl,
                            force: true // FORCE IMPORT
                          }, {
                            timeout: 300000 // 5 minute
                          })
                          
                          const duration = ((Date.now() - startTime) / 1000).toFixed(1)
                          console.log(`✅ IMPORT DE LA ZERO COMPLET în ${duration}s:`, response.data)
                          
                          setImportProgress(response.data)
                          
                          toast.success(
                            `✅ Import de la zero complet în ${duration}s: ${response.data.imported} ${response.data.imported === 1 ? 'înregistrare salvată' : 'înregistrări salvate'}`,
                            { id: 'import-zero', duration: 5000 }
                          )
                          
                          // Refresh status
                          await loadGoogleSheetsStatus()
                          
                          // Reset preview
                          setPreviewData(null)
                          setForceImport(false)
                          
                        } catch (error) {
                          console.error('Import de la zero error:', error)
                          toast.error(
                            `Eroare: ${error.response?.data?.error || error.message}`,
                            { id: 'import-zero', duration: 5000 }
                          )
                        } finally {
                          setImportingGoogleSheets(false)
                        }
                      }}
                      className="w-full px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 font-medium text-base"
                    >
                      <Download className="w-5 h-5" />
                      <span>🔥 Import de la zero (FORCE)</span>
                    </button>
                  </div>
                )}
                
                
                {/* IMPORT PROGRESS - macOS Style Clean */}
                {importingGoogleSheets && (
                  <div className="mt-6 mb-6 p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1 text-center">
                        <div className="inline-block mb-6">
                          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Se importă datele
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          PostgreSQL Database
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setImportingGoogleSheets(false)
                          setImportProgress(null)
                          toast.error('Import anulat', { id: 'import' })
                          console.log('❌ USER CLICKED: Anulează import')
                        }}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                      >
                        Anulează
                      </button>
                    </div>
                    
                    {/* Clean Progress Bar - macOS style */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Import în desfășurare</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-slate-100">Se procesează...</span>
                      </div>
                      <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500 rounded-full transition-all duration-300 ease-out animate-pulse"></div>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                        Timp estimat: ~{Math.round((previewData?.newCount || 2000) / 30)} secunde pentru {previewData?.newCount || 0} rânduri
                      </p>
                    </div>
                  </div>
                )}
                
                {/* IMPORT RESULTS - macOS Clean Style */}
                {importProgress && !importingGoogleSheets && (
                  <div className="mt-6 mb-6 p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-center mb-8">
                      <div className="inline-block w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Import complet
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {importProgress.imported} {importProgress.imported === 1 ? 'înregistrare salvată' : 'înregistrări salvate'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-green-500 mb-1">{importProgress.imported}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Salvate</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-slate-400 dark:text-slate-500 mb-1">{importProgress.skipped}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duplicate</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-red-500 mb-1">{importProgress.errors}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Erori</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Datele sunt disponibile în <span className="font-semibold text-blue-500">Dashboard → Cheltuieli</span>
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Info - macOS Style */}
                <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Proces de import:</p>
                  <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
                    <li>Conversie Google Sheet → CSV</li>
                    <li>Parsare date (Dată, Sumă, Locație, Departament, Tip)</li>
                    <li>Verificare duplicate automată</li>
                    <li>Salvare în PostgreSQL</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
          
          {/* PREFERENCES IMPORT TAB */}
          {activeTab === 'preferences-import' && (
            <div className="space-y-6">
              {/* Import Date din Preferințe - EXISTENT */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-purple-500" />
                  Import Date din Preferințe
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Importă date din Google Sheet pentru taxe, cyber, și alte preferințe
                </p>
                
                {/* URL Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    URL Google Sheet (Preferințe)
                  </label>
                  <input
                    type="url"
                    value={preferencesImportSettings.sheetUrl}
                    onChange={(e) => {
                      setPreferencesImportSettings(prev => ({ ...prev, sheetUrl: e.target.value }))
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Sheet-ul trebuie să fie public și să conțină date pentru taxe, cyber, etc.
                  </p>
                </div>
                
                {/* Preview Button */}
                <button
                  onClick={async () => {
                    if (!preferencesImportSettings.sheetUrl) {
                      toast.error('Introdu URL-ul Google Sheet!')
                      return
                    }
                    
                    setLoadingPreferencesPreview(true)
                    setPreferencesPreviewData(null)
                    setImportingPreferences(false)
                    setPreferencesImportProgress(null)
                    
                    try {
                      toast.loading('Se analizează datele din preferințe...', { id: 'preferences-preview' })
                      
                      // Folosim același endpoint de preview ca pentru Google Sheets, dar pentru preferences
                      const response = await axios.post('/api/expenditures/preview-google-sheets', {
                        sheetUrl: preferencesImportSettings.sheetUrl
                      }, {
                        timeout: 300000
                      })
                      
                      setPreferencesPreviewData(response.data)
                      
                      const message = response.data.wasLimited 
                        ? `✅ Analiză rapidă!\n${response.data.message}\n🆕 ~${response.data.newCount} date NOI (estimare)\n⏭️ ~${response.data.duplicateCount} duplicate (estimare)`
                        : `✅ Analiză completă!\n🆕 ${response.data.newCount} date NOI\n⏭️ ${response.data.duplicateCount} duplicate`
                      
                      toast.success(message, { id: 'preferences-preview', duration: 6000 })
                      
                    } catch (error) {
                      console.error('Preferences preview error:', error)
                      toast.error(
                        `Eroare: ${error.response?.data?.error || error.message}`,
                        { id: 'preferences-preview', duration: 5000 }
                      )
                    } finally {
                      setLoadingPreferencesPreview(false)
                    }
                  }}
                  disabled={loadingPreferencesPreview || !preferencesImportSettings.sheetUrl}
                  className="w-full px-6 py-3.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base mb-4"
                >
                  <Eye className="w-5 h-5" />
                  <span>{loadingPreferencesPreview ? 'Se analizează...' : 'Analizează datele'}</span>
                </button>
                
                {/* Preview Results */}
                {preferencesPreviewData && !importingPreferences && (
                  <div className="mb-6 p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-center mb-8">
                      <div className="inline-block w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mb-4">
                        <Eye className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Analiză completă
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {preferencesPreviewData.message || `${preferencesPreviewData.checkedRows || 0} rânduri verificate`}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-green-500 mb-1">{preferencesPreviewData.newCount?.toLocaleString('ro-RO') || 0}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date noi</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-slate-400 dark:text-slate-500 mb-1">{preferencesPreviewData.duplicateCount?.toLocaleString('ro-RO') || 0}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duplicate</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-red-500 mb-1">{preferencesPreviewData.errors || 0}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Erori</p>
                      </div>
                    </div>
                    
                    {/* Import Button - apare după preview */}
                    <button
                      onClick={async () => {
                        if (!preferencesImportSettings.sheetUrl) {
                          toast.error('Introdu URL-ul Google Sheet!')
                          return
                        }
                        
                        setImportingPreferences(true)
                        setPreferencesImportProgress(null)
                        
                        try {
                          toast.loading('Se importă datele din preferințe...', { id: 'preferences-import' })
                          
                          const response = await axios.post('/api/expenditures/import-preferences', {
                            sheetUrl: preferencesImportSettings.sheetUrl
                          }, {
                            timeout: 300000 // 5 minute
                          })
                          
                          setPreferencesImportProgress(response.data)
                          
                          toast.success(
                            `Import complet: ${response.data.imported || 0} ${response.data.imported === 1 ? 'înregistrare salvată' : 'înregistrări salvate'}`,
                            { id: 'preferences-import', duration: 5000 }
                          )
                          
                        } catch (error) {
                          console.error('Preferences import error:', error)
                          toast.error(
                            `Eroare: ${error.response?.data?.error || error.message}`,
                            { id: 'preferences-import', duration: 5000 }
                          )
                        } finally {
                          setImportingPreferences(false)
                        }
                      }}
                      disabled={importingPreferences || !preferencesImportSettings.sheetUrl}
                      className="w-full px-6 py-3.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
                    >
                      <Download className="w-5 h-5" />
                      <span>Importă {preferencesPreviewData.newCount?.toLocaleString('ro-RO') || 0} {preferencesPreviewData.newCount === 1 ? 'înregistrare' : 'înregistrări'}</span>
                    </button>
                  </div>
                )}
                
                {/* Import Button - apare doar dacă nu există preview */}
                {!preferencesPreviewData && (
                  <button
                    onClick={async () => {
                      if (!preferencesImportSettings.sheetUrl) {
                        toast.error('Introdu URL-ul Google Sheet!')
                        return
                      }
                      
                      setImportingPreferences(true)
                      setPreferencesImportProgress(null)
                      
                      try {
                        toast.loading('Se importă datele din preferințe...', { id: 'preferences-import' })
                        
                        const response = await axios.post('/api/expenditures/import-preferences', {
                          sheetUrl: preferencesImportSettings.sheetUrl
                        }, {
                          timeout: 300000 // 5 minute
                        })
                        
                        setPreferencesImportProgress(response.data)
                        
                        toast.success(
                          `Import complet: ${response.data.imported || 0} ${response.data.imported === 1 ? 'înregistrare salvată' : 'înregistrări salvate'}`,
                          { id: 'preferences-import', duration: 5000 }
                        )
                        
                      } catch (error) {
                        console.error('Preferences import error:', error)
                        toast.error(
                          `Eroare: ${error.response?.data?.error || error.message}`,
                          { id: 'preferences-import', duration: 5000 }
                        )
                      } finally {
                        setImportingPreferences(false)
                      }
                    }}
                    disabled={importingPreferences || !preferencesImportSettings.sheetUrl}
                    className="w-full px-6 py-3.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
                  >
                    <Download className="w-5 h-5" />
                    <span>{importingPreferences ? 'Se importă...' : 'Importă Date din Preferințe'}</span>
                  </button>
                )}
                
                {/* Import Progress */}
                {importingPreferences && (
                  <div className="mt-6 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <div className="inline-block mb-4">
                        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-purple-500 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                        Se importă datele din preferințe...
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Import Results */}
                {preferencesImportProgress && !importingPreferences && (
                  <div className="mt-6 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-center mb-4">
                      <div className="inline-block w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Import complet
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-green-500 mb-1">{preferencesImportProgress.imported || 0}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Salvate</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-slate-400 dark:text-slate-500 mb-1">{preferencesImportProgress.skipped || 0}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duplicate</p>
                      </div>
                      <div className="text-center p-4">
                        <p className="text-4xl font-light text-red-500 mb-1">{preferencesImportProgress.errors || 0}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Erori</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Info */}
                <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Ce se importă:</p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                    <li>Date pentru taxe</li>
                    <li>Date pentru cyber</li>
                    <li>Alte preferințe și configurații</li>
                  </ul>
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
          
          {/* ELECTRIC TAB - REFACUT COMPLET DE LA ZERO */}
          {activeTab === 'electric' && (
            <div className="space-y-6">
              {/* Sub-tab-uri Electric + Shortcut la Modul */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setElectricSubTab('analiza')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      electricSubTab === 'analiza'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    ⚡ Analiză Factură
                  </button>
                  <button
                    onClick={() => setElectricSubTab('centralizator')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      electricSubTab === 'centralizator'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    📊 Centralizator NLC
                  </button>
                </div>
                
                {/* Buton shortcut la Modul Electrică */}
                <button
                  onClick={() => navigate('/expenditures/electric')}
                  className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl"
                  title="Vezi centralizatorul consum și costuri"
                >
                  📈 Modul Electrică →
                </button>
              </div>

              {/* Sub-tab: Analiză Factură */}
              {electricSubTab === 'analiza' && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border-2 border-yellow-300 dark:border-yellow-700 shadow-lg">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                  <span className="text-2xl mr-3">⚡</span>
                  Analiză Factură Electrică
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Atașează o factură PDF sau link. Sistemul extrage automat toate datele: locații, NLC-uri, sume, consumuri și prețuri.
                </p>
                
                {/* Upload PDF sau Link */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Factură PDF sau Link
                    </label>
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length > 0) {
                              if (files.length === 1) {
                                // Un singur fișier - comportament vechi
                                const file = files[0]
                                setElectricInvoiceFile(file)
                                setElectricInvoiceFiles([])
                                setElectricInvoiceLink('')
                                // Convertește fișierul la Base64 pentru salvare ulterioară
                                const reader = new FileReader()
                                reader.onload = () => {
                                  setElectricPdfBase64(reader.result)
                                  setElectricPdfFilename(file.name)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                // Multiple fișiere - nou comportament
                                setElectricInvoiceFiles(files)
                                setElectricInvoiceFile(null)
                                setElectricInvoiceLink('')
                                setElectricPdfBase64(null)
                                setElectricPdfFilename(null)
                                toast.info(`${files.length} fișiere selectate. Se vor procesa automat după analiză.`)
                              }
                            }
                          }}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        {electricInvoiceFiles.length > 0 && (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            {electricInvoiceFiles.length} fișiere selectate pentru procesare în batch
                          </p>
                        )}
                      </div>
                      <span className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center">SAU</span>
                      <input
                        type="url"
                        value={electricInvoiceLink}
                        onChange={(e) => {
                          setElectricInvoiceLink(e.target.value)
                          setElectricInvoiceFile(null)
                          setElectricPdfBase64(null)
                          setElectricPdfFilename(null)
                        }}
                        placeholder="https://..."
                        className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAnalyzeElectricInvoice}
                    disabled={(!electricInvoiceFile && !electricInvoiceLink && electricInvoiceFiles.length === 0) || processingMultiple}
                    className="w-full px-6 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
                  >
                    <Eye className="w-5 h-5" />
                    <span>
                      {processingMultiple 
                        ? `Se procesează ${processingProgress.current}/${processingProgress.total}... ${processingProgress.currentFile ? `(${processingProgress.currentFile})` : ''}`
                        : analyzingElectric 
                          ? 'Se analizează...' 
                          : electricInvoiceFiles.length > 0
                            ? `Analizează și Salvează ${electricInvoiceFiles.length} Facturi`
                            : 'Analizează Factură'
                      }
                    </span>
                  </button>
                  
                  {/* Indicator de progres pentru multiple facturi */}
                  {processingMultiple && processingProgress.total > 0 && (
                    <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Progres: {processingProgress.current} / {processingProgress.total}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                        />
                      </div>
                      {processingProgress.currentFile && (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 truncate">
                          Fișier curent: {processingProgress.currentFile}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Rezumat după procesare */}
                  {processingSummary && !processingMultiple && (
                    <div className="mt-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center">
                          <span className="text-2xl mr-2">✅</span>
                          Rezumat Procesare
                        </h4>
                        <button
                          onClick={() => setProcessingSummary(null)}
                          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Statistici generale */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Facturi Procesate</div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {processingSummary.successCount}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            din {processingSummary.totalInvoices}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">NLC-uri Salvate</div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {processingSummary.totalNlcs}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Suma Totală</div>
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {processingSummary.totalSum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Erori</div>
                          <div className={`text-2xl font-bold ${processingSummary.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {processingSummary.errorCount}
                          </div>
                        </div>
                      </div>

                      {/* Detalii facturi procesate */}
                      {processingSummary.processedInvoices.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Facturi Procesate:
                          </h5>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {processingSummary.processedInvoices.map((inv, idx) => (
                              <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {inv.filename}
                                  </span>
                                  <span className="text-green-600 dark:text-green-400 font-bold">
                                    {inv.suma.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                  <span>Nr. Factură: {inv.numarFactura}</span>
                                  <span>{inv.nlcs} NLC-uri ({inv.savedNlcs} salvate{inv.duplicates > 0 ? `, ${inv.duplicates} duplicate` : ''})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Erori dacă există */}
                      {processingSummary.errors && processingSummary.errors.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <h5 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                            Erori ({processingSummary.errors.length}):
                          </h5>
                          <div className="space-y-1">
                            {processingSummary.errors.map((err, idx) => (
                              <div key={idx} className="text-xs text-red-800 dark:text-red-200">
                                <span className="font-semibold">{err.file}:</span> {err.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Rezultate Analiză - TABEL COMPACT CU TOATE NLC-URILE */}
                {electricAnalysisResult && (() => {
                  const data = electricAnalysisResult.extractedData || {}
                  const nlcData = data.nlc_data || []
                  
                  const handleSumaEdit = (idx, currentSuma) => {
                    setEditingSumaIndex(idx)
                    setEditingSumaValue(currentSuma ? String(currentSuma) : '')
                  }
                  
                  const handleSumaSave = (idx) => {
                    const newSuma = parseFloat(editingSumaValue.replace(/[^\d.,]/g, '').replace(',', '.'))
                    if (!isNaN(newSuma) && newSuma > 0) {
                      // Actualizează suma în nlcData
                      const updatedNlcData = [...nlcData]
                      updatedNlcData[idx] = {
                        ...updatedNlcData[idx],
                        suma: newSuma,
                        sumaTotala: newSuma // Actualizează și sumaTotala
                      }
                      
                      // PRIORITATE: Recalculează prețul/kWh dacă există consum (cea mai precisă metodă)
                      if (updatedNlcData[idx].consum && updatedNlcData[idx].consum > 0) {
                        const pretCalculat = newSuma / updatedNlcData[idx].consum
                        updatedNlcData[idx].pretCalculat = pretCalculat
                        console.log(`   🔄 Recalculat preț/kWh pentru NLC ${updatedNlcData[idx].nlc}: ${pretCalculat.toFixed(4)} (${newSuma.toFixed(2)} / ${updatedNlcData[idx].consum})`)
                      }
                      // Sau recalculează consumul dacă există preț/kWh general (fallback)
                      else if (data.pret_per_kwh && parseFloat(data.pret_per_kwh) > 0) {
                        const pretGeneral = parseFloat(data.pret_per_kwh)
                        const consumCalculat = newSuma / pretGeneral
                        updatedNlcData[idx].consum = Math.round(consumCalculat)
                        // Recalculează și prețul/kWh pentru consistență
                        updatedNlcData[idx].pretCalculat = pretGeneral
                        console.log(`   🔄 Recalculat consum pentru NLC ${updatedNlcData[idx].nlc}: ${consumCalculat.toFixed(2)} kWh (${newSuma.toFixed(2)} / ${pretGeneral.toFixed(4)})`)
                      }
                      
                      // Actualizează suma totală (activă + reactivă)
                      const currentReactiva = parseFloat(updatedNlcData[idx].sumaReactiva) || 0
                      updatedNlcData[idx].sumaTotala = newSuma + currentReactiva
                      
                      // Actualizează state-ul
                      setElectricAnalysisResult({
                        ...electricAnalysisResult,
                        extractedData: {
                          ...data,
                          nlc_data: updatedNlcData
                        }
                      })
                      
                      setEditingSumaIndex(null)
                      toast.success(`Suma actualizată pentru NLC ${updatedNlcData[idx].nlc}`)
                    } else {
                      toast.error('Sumă invalidă')
                    }
                  }
                  
                  const handleSumaCancel = () => {
                    setEditingSumaIndex(null)
                    setEditingSumaValue('')
                  }
                  
                  // Funcții pentru editarea energiei reactive
                  const handleReactivaEdit = (idx, currentReactiva) => {
                    setEditingReactivaIndex(idx)
                    setEditingReactivaValue(currentReactiva ? String(currentReactiva) : '')
                  }
                  
                  const handleReactivaSave = (idx) => {
                    const newReactiva = parseFloat(editingReactivaValue.replace(/[^\d.,]/g, '').replace(',', '.'))
                    if (!isNaN(newReactiva) && newReactiva >= 0) {
                      const updatedNlcData = [...nlcData]
                      const currentSuma = parseFloat(updatedNlcData[idx].suma) || 0
                      updatedNlcData[idx] = {
                        ...updatedNlcData[idx],
                        sumaReactiva: newReactiva > 0 ? newReactiva : null
                      }
                      
                      // Actualizează suma totală (activă + reactivă)
                      updatedNlcData[idx].sumaTotala = currentSuma + (newReactiva > 0 ? newReactiva : 0)
                      
                      setElectricAnalysisResult({
                        ...electricAnalysisResult,
                        extractedData: {
                          ...data,
                          nlc_data: updatedNlcData
                        }
                      })
                      
                      setEditingReactivaIndex(null)
                      toast.success(`Energie reactivă actualizată pentru NLC ${updatedNlcData[idx].nlc}`)
                    } else {
                      toast.error('Valoare invalidă')
                    }
                  }
                  
                  const handleReactivaCancel = () => {
                    setEditingReactivaIndex(null)
                    setEditingReactivaValue('')
                  }
                  
                  // Funcții pentru editarea totalului
                  const handleTotalEdit = (idx, currentTotal) => {
                    setEditingTotalIndex(idx)
                    setEditingTotalValue(currentTotal ? String(currentTotal) : '')
                  }
                  
                  const handleTotalSave = (idx) => {
                    const newTotal = parseFloat(editingTotalValue.replace(/[^\d.,]/g, '').replace(',', '.'))
                    if (!isNaN(newTotal) && newTotal > 0) {
                      const updatedNlcData = [...nlcData]
                      const currentSuma = parseFloat(updatedNlcData[idx].suma) || 0
                      const currentReactiva = parseFloat(updatedNlcData[idx].sumaReactiva) || 0
                      
                      // Dacă totalul este diferit de suma activă + reactivă, ajustează suma activă
                      const sumaActivaCalculata = newTotal - currentReactiva
                      if (sumaActivaCalculata > 0) {
                        updatedNlcData[idx].suma = sumaActivaCalculata
                        updatedNlcData[idx].sumaTotala = newTotal
                        
                        // Recalculează prețul/kWh dacă există consum
                        if (updatedNlcData[idx].consum && updatedNlcData[idx].consum > 0) {
                          const pretCalculat = sumaActivaCalculata / updatedNlcData[idx].consum
                          updatedNlcData[idx].pretCalculat = pretCalculat
                          console.log(`   🔄 Recalculat preț/kWh pentru NLC ${updatedNlcData[idx].nlc}: ${pretCalculat.toFixed(4)} (${sumaActivaCalculata.toFixed(2)} / ${updatedNlcData[idx].consum})`)
                        }
                      } else {
                        updatedNlcData[idx].sumaTotala = newTotal
                      }
                      
                      setElectricAnalysisResult({
                        ...electricAnalysisResult,
                        extractedData: {
                          ...data,
                          nlc_data: updatedNlcData
                        }
                      })
                      
                      setEditingTotalIndex(null)
                      toast.success(`Total actualizat pentru NLC ${updatedNlcData[idx].nlc}`)
                    } else {
                      toast.error('Valoare invalidă')
                    }
                  }
                  
                  const handleTotalCancel = () => {
                    setEditingTotalIndex(null)
                    setEditingTotalValue('')
                  }
                  
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          📊 Date Extrase
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                          💡 Toate sumele sunt <strong>CU TVA inclusă</strong>
                        </div>
                      </div>
                      
                      {/* Tabel compact cu toate NLC-urile - CU ENERGIE REACTIVĂ */}
                      {nlcData.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-700">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">NLC</th>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Locație</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-green-700 dark:text-green-300">E.Activă (RON)</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-300">kWh</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-orange-700 dark:text-orange-300">E.Reactivă</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-300">kVArh</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-blue-700 dark:text-blue-300">TOTAL RON</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-yellow-600 dark:text-yellow-400">Preț/kWh</th>
                                <th className="px-2 py-1.5 text-center font-semibold text-slate-700 dark:text-slate-300">✓</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {nlcData.map((nlc, idx) => {
                                // PRIORITATE: Calculează din valorile actuale (suma / consum) dacă există ambele
                                // Folosește pretCalculat doar dacă nu există consum sau suma
                                const pretPerKwh = (nlc.consum && nlc.consum > 0 && nlc.suma && nlc.suma > 0)
                                  ? (nlc.suma / nlc.consum).toFixed(4)
                                  : (nlc.pretCalculat 
                                    ? parseFloat(nlc.pretCalculat).toFixed(4)
                                    : (data.pret_per_kwh ? parseFloat(data.pret_per_kwh).toFixed(4) : 'N/A'))
                                const luniCount = nlc.luniAcoperite?.length || 1
                                const pretVerificare = nlc.pretVerificare
                                const sumaTotala = (parseFloat(nlc.suma) || 0) + (parseFloat(nlc.sumaReactiva) || 0)
                                const isEditingSuma = editingSumaIndex === idx
                                const isEditingReactiva = editingReactivaIndex === idx
                                const isEditingTotal = editingTotalIndex === idx
                                
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-2 py-1.5 font-mono text-blue-600 dark:text-blue-400 text-xs">{nlc.nlc}</td>
                                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 text-xs">{nlc.location || 'N/A'}</td>
                                    <td className="px-2 py-1.5 text-right font-semibold text-green-600 dark:text-green-400 text-xs">
                                      {isEditingSuma ? (
                                        <div className="flex items-center gap-1 justify-end">
                                          <input
                                            type="text"
                                            value={editingSumaValue}
                                            onChange={(e) => setEditingSumaValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSumaSave(idx)
                                              if (e.key === 'Escape') handleSumaCancel()
                                            }}
                                            className="w-28 px-1 py-0.5 text-xs border-2 border-green-500 rounded dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleSumaSave(idx)}
                                            className="text-green-600 hover:text-green-700 dark:text-green-400 px-1"
                                            title="Salvează (Enter)"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={handleSumaCancel}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 px-1"
                                            title="Anulează (Esc)"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <span 
                                          className="cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 px-1 py-0.5 rounded transition-colors"
                                          onClick={() => handleSumaEdit(idx, nlc.suma)}
                                          title="Click pentru editare"
                                        >
                                          {nlc.suma ? parseFloat(nlc.suma).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300 text-xs">
                                      {nlc.consum ? parseFloat(nlc.consum).toLocaleString('ro-RO', { maximumFractionDigits: 0 }) : '-'}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-orange-600 dark:text-orange-400 text-xs">
                                      {isEditingReactiva ? (
                                        <div className="flex items-center gap-1 justify-end">
                                          <input
                                            type="text"
                                            value={editingReactivaValue}
                                            onChange={(e) => setEditingReactivaValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleReactivaSave(idx)
                                              if (e.key === 'Escape') handleReactivaCancel()
                                            }}
                                            className="w-28 px-1 py-0.5 text-xs border-2 border-orange-500 rounded dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleReactivaSave(idx)}
                                            className="text-orange-600 hover:text-orange-700 dark:text-orange-400 px-1"
                                            title="Salvează (Enter)"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={handleReactivaCancel}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 px-1"
                                            title="Anulează (Esc)"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <span 
                                          className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 px-1 py-0.5 rounded transition-colors"
                                          onClick={() => handleReactivaEdit(idx, nlc.sumaReactiva)}
                                          title="Click pentru editare"
                                        >
                                          {nlc.sumaReactiva && nlc.sumaReactiva > 0 ? parseFloat(nlc.sumaReactiva).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-slate-500 dark:text-slate-400 text-xs">
                                      {nlc.consumReactiv && nlc.consumReactiv > 0 ? parseFloat(nlc.consumReactiv).toLocaleString('ro-RO', { maximumFractionDigits: 0 }) : '-'}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-bold text-blue-600 dark:text-blue-400 text-xs">
                                      {isEditingTotal ? (
                                        <div className="flex items-center gap-1 justify-end">
                                          <input
                                            type="text"
                                            value={editingTotalValue}
                                            onChange={(e) => setEditingTotalValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleTotalSave(idx)
                                              if (e.key === 'Escape') handleTotalCancel()
                                            }}
                                            className="w-28 px-1 py-0.5 text-xs border-2 border-blue-500 rounded dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleTotalSave(idx)}
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 px-1"
                                            title="Salvează (Enter)"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={handleTotalCancel}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 px-1"
                                            title="Anulează (Esc)"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <span 
                                          className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 px-1 py-0.5 rounded transition-colors"
                                          onClick={() => handleTotalEdit(idx, sumaTotala)}
                                          title="Click pentru editare"
                                        >
                                          {sumaTotala > 0 ? sumaTotala.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-semibold text-yellow-600 dark:text-yellow-400 text-xs">
                                      {pretPerKwh !== 'N/A' ? pretPerKwh : '-'}
                                    </td>
                                    <td className="px-2 py-1.5 text-center text-xs">
                                      {pretVerificare && typeof pretVerificare === 'object' ? (
                                        pretVerificare.esteCorect ? (
                                          <span className="text-green-600 dark:text-green-400" title={`Diferență: ${String(pretVerificare.diferentaPercent || 0)}%`}>✓</span>
                                        ) : (
                                          <span className="text-red-600 dark:text-red-400" title={`Diferență: ${String(pretVerificare.diferentaPercent || '?')}%`}>⚠</span>
                                        )
                                      ) : '-'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="bg-slate-100 dark:bg-slate-700 font-semibold">
                              <tr>
                                <td colSpan="2" className="px-2 py-1.5 text-slate-700 dark:text-slate-300 text-xs font-bold">TOTAL</td>
                                <td className="px-2 py-1.5 text-right font-bold text-green-600 dark:text-green-400 text-xs">
                                  {(() => {
                                    // Calculează suma energiei active din NLC-uri (ignoră sumele suspecte)
                                    const sumaCalculataDinNlc = nlcData.reduce((sum, n) => {
                                      // Ignoră sumele suspecte (marcate ca greșite în backend)
                                      if (n.sumaSuspecta) return sum
                                      return sum + (parseFloat(n.suma) || 0)
                                    }, 0)
                                    // Dacă există suma extrasă din factură și este diferită de suma calculată, folosește suma extrasă
                                    const sumaExtrasaDinFactura = data.suma_totala ? parseFloat(data.suma_totala) : null
                                    
                                    // Dacă există o discrepanță mare (>20%), folosește suma extrasă din factură
                                    if (sumaExtrasaDinFactura && sumaExtrasaDinFactura > 0) {
                                      const diferenta = Math.abs(sumaCalculataDinNlc - sumaExtrasaDinFactura)
                                      const procentDiferenta = sumaCalculataDinNlc > 0 ? (diferenta / sumaCalculataDinNlc) * 100 : 100
                                      
                                      // Dacă diferența este mai mare de 20%, folosește suma extrasă (probabil sumele NLC-uri sunt greșite)
                                      if (procentDiferenta > 20 || sumaCalculataDinNlc === 0) {
                                        return sumaExtrasaDinFactura.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      }
                                    }
                                    
                                    return sumaCalculataDinNlc.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  })()}
                                </td>
                                <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300 text-xs">
                                  {nlcData.reduce((sum, n) => sum + (parseFloat(n.consum) || 0), 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-2 py-1.5 text-right font-bold text-orange-600 dark:text-orange-400 text-xs">
                                  {nlcData.reduce((sum, n) => sum + (parseFloat(n.sumaReactiva) || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-1.5 text-right text-slate-500 dark:text-slate-400 text-xs">
                                  {nlcData.reduce((sum, n) => sum + (parseFloat(n.consumReactiv) || 0), 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-2 py-1.5 text-right font-bold text-blue-600 dark:text-blue-400 text-xs">
                                  {/* Folosește suma extrasă din factură dacă există, altfel calculează din NLC-uri (ignoră sumele suspecte) */}
                                  {(() => {
                                    const sumaExtrasaDinFactura = data.suma_totala ? parseFloat(data.suma_totala) : null
                                    // Calculează suma din NLC-uri ignorând sumele suspecte
                                    const sumaCalculataDinNlc = nlcData.reduce((sum, n) => {
                                      // Ignoră sumele suspecte (marcate ca greșite în backend)
                                      if (n.sumaSuspecta) return sum
                                      return sum + (parseFloat(n.suma) || 0) + (parseFloat(n.sumaReactiva) || 0)
                                    }, 0)
                                    
                                    // Dacă există suma extrasă și există o discrepanță mare, folosește suma extrasă
                                    if (sumaExtrasaDinFactura && sumaExtrasaDinFactura > 0) {
                                      const diferenta = Math.abs(sumaCalculataDinNlc - sumaExtrasaDinFactura)
                                      const procentDiferenta = sumaCalculataDinNlc > 0 ? (diferenta / sumaCalculataDinNlc) * 100 : 100
                                      
                                      // Dacă diferența este mai mare de 20%, folosește suma extrasă
                                      if (procentDiferenta > 20 || sumaCalculataDinNlc === 0) {
                                        return sumaExtrasaDinFactura.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      }
                                    }
                                    
                                    const sumaDeAfisat = sumaExtrasaDinFactura && sumaExtrasaDinFactura > 0 ? sumaExtrasaDinFactura : sumaCalculataDinNlc
                                    return sumaDeAfisat > 0 ? sumaDeAfisat.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'
                                  })()}
                                </td>
                                <td colSpan="2" className="px-2 py-1.5 text-xs"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                          Nu s-au găsit NLC-uri în factură
                        </div>
                      )}
                      
                      {/* Date generale factură - COMPACT */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Număr Factură</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{data.numar_factura || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Perioadă</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{data.perioada_facturare || nlcData[0]?.period || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Furnizor</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">{data.furnizor || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Preț/kWh (general)</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{data.pret_per_kwh ? `${parseFloat(data.pret_per_kwh).toFixed(4)}` : 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Opțiuni Salvare */}
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={alsoSaveToExpenditures}
                      onChange={(e) => setAlsoSaveToExpenditures(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Salvează automat și în Cheltuieli
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        La salvarea în centralizator, factura va fi adăugată automat și în tabelul de cheltuieli
                      </p>
                    </div>
                    {alsoSaveToExpenditures && (
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                        ✓ Activ
                      </span>
                    )}
                  </label>
                </div>

                {/* Buton Principal Salvare */}
                <div className="space-y-3 mt-4">
                  <button
                    onClick={handleSaveElectricToCentralizer}
                    disabled={savingElectric || !electricAnalysisResult}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 font-semibold text-base"
                  >
                    <Database className="w-5 h-5" />
                    <span>
                      {savingElectric 
                        ? 'Se salvează...' 
                        : alsoSaveToExpenditures 
                          ? '💾 Salvează în Centralizator + Cheltuieli' 
                          : '💾 Salvează în Centralizator NLC'}
                    </span>
                  </button>
                  
                  {!alsoSaveToExpenditures && (
                    <button
                      onClick={handleSaveElectricToExpenditures}
                      disabled={savingElectric || !electricAnalysisResult}
                      className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 font-medium text-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingElectric ? 'Se salvează...' : 'Salvează doar în Cheltuieli'}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleExportElectricToGoogleSheet}
                    disabled={!electricAnalysisResult}
                    className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportă Model Excel</span>
                  </button>
                </div>
              </div>
              )}

              {/* Sub-tab: Centralizator NLC */}
              {electricSubTab === 'centralizator' && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-300 dark:border-blue-700 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                      <span className="text-2xl mr-3">📊</span>
                      Centralizator NLC-uri
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Toate locurile de consum (NLC) extrase din facturi, cu statistici și istoric.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleTransferElectricToExpenditures}
                      disabled={transferringElectric || loadingNlcCentralizer}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg transition-colors flex items-center space-x-2 font-medium"
                      title="Transferă facturile electrice din centralizator în Cheltuieli"
                    >
                      <Database className={`w-4 h-4 ${transferringElectric ? 'animate-pulse' : ''}`} />
                      <span>{transferringElectric ? 'Se transferă...' : 'Transferă în Cheltuieli'}</span>
                    </button>
                    <button
                      onClick={loadNlcCentralizer}
                      disabled={loadingNlcCentralizer}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingNlcCentralizer ? 'animate-spin' : ''}`} />
                      <span>Reîncarcă</span>
                    </button>
                  </div>
                </div>

                {loadingNlcCentralizer ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-slate-600 dark:text-slate-400">Se încarcă...</span>
                  </div>
                ) : nlcCentralizer.length > 0 ? (
                  <>
                    {/* FILTRE */}
                    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Locație</label>
                        <select
                          value={nlcFilterLocation}
                          onChange={(e) => setNlcFilterLocation(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        >
                          <option value="all">Toate locațiile</option>
                          {[...new Set(nlcCentralizer.map(n => n.location_name))].sort().map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Perioadă</label>
                        <select
                          value={nlcFilterPeriod}
                          onChange={(e) => setNlcFilterPeriod(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        >
                          <option value="all">Toate perioadele</option>
                          {[...new Set(nlcCentralizer.map(n => n.perioada_facturare).filter(Boolean))].sort().map(period => (
                            <option key={period} value={period}>{period}</option>
                          ))}
                        </select>
                      </div>
                      {(nlcFilterLocation !== 'all' || nlcFilterPeriod !== 'all') && (
                        <div className="flex items-end">
                          <button
                            onClick={() => { setNlcFilterLocation('all'); setNlcFilterPeriod('all'); }}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            ✕ Resetează
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Statistici rapide */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📄</span>
                          <div>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                              {nlcCentralizerStats?.unique_invoices ?? [...new Set(nlcCentralizer.map(n => n.numar_factura).filter(Boolean))].length}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">facturi unice</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔌</span>
                          <div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {nlcCentralizer.length}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">NLC-uri</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📍</span>
                          <div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {[...new Set(nlcCentralizer.map(n => n.location_name))].length}
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400">locații</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💰</span>
                          <div>
                            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                              {nlcCentralizer.reduce((sum, n) => sum + (parseFloat(n.total_suma) || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-orange-600 dark:text-orange-400">RON total</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Buton ștergere selectate */}
                    {selectedNlcIds.length > 0 && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center justify-between">
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {selectedNlcIds.length} NLC-uri selectate
                        </span>
                        <button
                          onClick={handleDeleteSelectedNlcs}
                          disabled={deletingNlcs}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{deletingNlcs ? 'Se șterge...' : 'Șterge Selectate'}</span>
                        </button>
                      </div>
                    )}

                    {/* TABEL ACORDEON PE LOCAȚIE */}
                    <div className="space-y-2">
                      {(() => {
                        // Filtrează datele
                        const filtered = nlcCentralizer.filter(nlc => {
                          if (nlcFilterLocation !== 'all' && nlc.location_name !== nlcFilterLocation) return false
                          if (nlcFilterPeriod !== 'all' && nlc.perioada_facturare !== nlcFilterPeriod) return false
                          return true
                        })
                        
                        // Grupează pe locație
                        const byLocation = {}
                        filtered.forEach(nlc => {
                          const loc = nlc.location_name || 'N/A'
                          if (!byLocation[loc]) {
                            byLocation[loc] = { nlcs: [], totalRon: 0, totalKwh: 0, slots: 0 }
                          }
                          byLocation[loc].nlcs.push(nlc)
                          byLocation[loc].totalRon += parseFloat(nlc.total_suma) || 0
                          byLocation[loc].totalKwh += parseFloat(nlc.total_consum) || 0
                          if (nlc.slots_count) byLocation[loc].slots = nlc.slots_count
                        })
                        
                        return Object.entries(byLocation)
                          .sort((a, b) => b[1].totalRon - a[1].totalRon)
                          .map(([loc, data]) => {
                            const isExpanded = expandedLocations[loc]
                            const kwhPerSlot = data.slots > 0 ? data.totalKwh / data.slots : 0
                            const ronPerSlot = data.slots > 0 ? data.totalRon / data.slots : 0
                            
                            return (
                              <div key={loc} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                {/* Header locație - click pentru expand */}
                                <div 
                                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 cursor-pointer hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-700/50 transition-colors"
                                  onClick={() => setExpandedLocations(prev => ({ ...prev, [loc]: !prev[loc] }))}
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                                    <div>
                                      <div className="font-bold text-slate-800 dark:text-slate-200 text-lg">{loc}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {data.nlcs.length} NLC-uri • {[...new Set(data.nlcs.map(n => n.numar_factura).filter(Boolean))].length} facturi
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-6 text-sm">
                                    <div className="text-right">
                                      <div className="font-bold text-green-600 dark:text-green-400">{data.totalRon.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</div>
                                      <div className="text-slate-500 dark:text-slate-400">{data.totalKwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh</div>
                                    </div>
                                    <div className="text-center px-3 py-1 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                      <div className="font-bold text-purple-700 dark:text-purple-300">{data.slots || '-'}</div>
                                      <div className="text-[10px] text-purple-600 dark:text-purple-400">sloturi</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-blue-600 dark:text-blue-400">{kwhPerSlot > 0 ? kwhPerSlot.toFixed(2) : '-'}</div>
                                      <div className="text-[10px] text-blue-500 dark:text-blue-400">kWh/slot</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-orange-600 dark:text-orange-400">{ronPerSlot > 0 ? ronPerSlot.toFixed(2) : '-'}</div>
                                      <div className="text-[10px] text-orange-500 dark:text-orange-400">RON/slot</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* NLC-uri - vizibile doar când e expandat */}
                                {isExpanded && (
                                  <div className="border-t border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-xs">
                                      <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                          <th className="px-3 py-2 text-left w-8">
                                            <input
                                              type="checkbox"
                                              checked={data.nlcs.every(n => selectedNlcIds.includes(n.nlc_code))}
                                              onChange={() => {
                                                const allSelected = data.nlcs.every(n => selectedNlcIds.includes(n.nlc_code))
                                                if (allSelected) {
                                                  setSelectedNlcIds(prev => prev.filter(id => !data.nlcs.some(n => n.nlc_code === id)))
                                                } else {
                                                  setSelectedNlcIds(prev => [...new Set([...prev, ...data.nlcs.map(n => n.nlc_code)])])
                                                }
                                              }}
                                              className="w-3 h-3"
                                            />
                                          </th>
                                          <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400">NLC</th>
                                          <th className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">Perioadă</th>
                                          <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">Sumă RON</th>
                                          <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">kWh</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {data.nlcs.map(nlc => (
                                          <tr key={nlc.nlc_code} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedNlcIds.includes(nlc.nlc_code) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                            <td className="px-3 py-2">
                                              <input
                                                type="checkbox"
                                                checked={selectedNlcIds.includes(nlc.nlc_code)}
                                                onChange={() => toggleNlcSelection(nlc.nlc_code)}
                                                className="w-3 h-3"
                                              />
                                            </td>
                                            <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{nlc.nlc_code}</td>
                                            <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">{nlc.perioada_facturare || '-'}</td>
                                            <td className="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">
                                              {parseFloat(nlc.total_suma || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                                              {parseFloat(nlc.total_consum || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )
                          })
                      })()}
                    </div>
                    
                    {/* TOTAL GENERAL */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300">TOTAL GENERAL</span>
                        <div className="flex space-x-6">
                          <span className="font-bold text-green-700 dark:text-green-400">
                            {nlcCentralizer
                              .filter(n => (nlcFilterLocation === 'all' || n.location_name === nlcFilterLocation) && (nlcFilterPeriod === 'all' || n.perioada_facturare === nlcFilterPeriod))
                              .reduce((sum, n) => sum + (parseFloat(n.total_suma) || 0), 0)
                              .toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {nlcCentralizer
                              .filter(n => (nlcFilterLocation === 'all' || n.location_name === nlcFilterLocation) && (nlcFilterPeriod === 'all' || n.perioada_facturare === nlcFilterPeriod))
                              .reduce((sum, n) => sum + (parseFloat(n.total_consum) || 0), 0)
                              .toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-lg font-medium">Nu există NLC-uri înregistrate</p>
                    <p className="text-sm mt-2">Analizează facturi electrice pentru a popula centralizatorul.</p>
                  </div>
                )}
              </div>
              )}
            </div>
          )}

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
              {/* Acțiuni manuale (mutate din pagina principală Cheltuieli) */}
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Acțiuni Manuale Cheltuieli
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Aici sunt butoanele pentru <strong>Sincronizare Date</strong>, <strong>Import Toate Datele</strong> și <strong>Curăță Duplicate</strong>, mutate din pagina principală de Cheltuieli.
                </p>
                
                {/* Tabel cu statistici despre datele din baza de date */}
                <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                      <Database className="w-5 h-5 mr-2 text-blue-500" />
                      Statistici Date în Baza de Date
                    </h3>
                    <button
                      onClick={fetchDataStats}
                      disabled={loadingStats}
                      className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                      <span>Actualizează</span>
                    </button>
                  </div>
                  
                  {loadingStats ? (
                    <div className="text-center py-8">
                      <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Se încarcă statisticile...</p>
                    </div>
                  ) : dataStats ? (
                    <div className="space-y-4">
                      {/* Total */}
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Total Înregistrări</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dataStats.total.toLocaleString('ro-RO')}</p>
                        {dataStats.dateRange && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Perioadă: {dataStats.dateRange.minDate ? new Date(dataStats.dateRange.minDate).toLocaleDateString('ro-RO') : 'N/A'} - {dataStats.dateRange.maxDate ? new Date(dataStats.dateRange.maxDate).toLocaleDateString('ro-RO') : 'N/A'}
                          </p>
                        )}
                      </div>
                      
                      {/* Tabel pe surse */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Sursă</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Număr Înregistrări</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Suma Totală (RON)</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Perioadă</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {dataStats.bySource.length > 0 ? (
                              dataStats.bySource.map((source, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      source.source === 'bat_sync'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : source.source === 'google_sheets'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : source.source === 'preferences'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                                    }`}>
                                      {source.source === 'bat_sync' ? '🟢 BAT Sync' : 
                                       source.source === 'google_sheets' ? '📊 Google Sheets' : 
                                       source.source === 'preferences' ? '⚙️ Preferences' : 
                                       source.source || 'Unknown'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                    {source.count.toLocaleString('ro-RO')}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                    {new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(source.totalAmount)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                    {source.minDate && source.maxDate ? (
                                      <span>
                                        {new Date(source.minDate).toLocaleDateString('ro-RO')} - {new Date(source.maxDate).toLocaleDateString('ro-RO')}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                  <p>Nu există date în baza de date!</p>
                                  <p className="text-xs mt-1">Apasă "Import Toate Datele" pentru a importa date.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Top 5 Departamente și Locații */}
                      {(dataStats.byDepartment.length > 0 || dataStats.byLocation.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {dataStats.byDepartment.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Top 5 Departamente</h4>
                              <div className="space-y-2">
                                {dataStats.byDepartment.slice(0, 5).map((dept, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400 truncate">{dept.department}</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 ml-2">{dept.count.toLocaleString('ro-RO')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {dataStats.byLocation.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Top 5 Locații</h4>
                              <div className="space-y-2">
                                {dataStats.byLocation.slice(0, 5).map((loc, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400 truncate">{loc.location}</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 ml-2">{loc.count.toLocaleString('ro-RO')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>Nu s-au putut încărca statisticile</p>
                    </div>
                  )}
                </div>
                
                {/* Explicații butoane */}
                <div className="mb-6 space-y-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 text-green-600" />
                      Sincronizare Date
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Sincronizează datele de cheltuieli din baza de date externă (SQL) în baza de date locală. 
                      <strong> Folosește filtrele setate</strong> (departamente, tipuri, locații) pentru a importa doar ce vrei.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center">
                      <Database className="w-4 h-4 mr-2 text-blue-600" />
                      Import Toate Datele
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Importă <strong>TOATE datele</strong> din <strong>TOATE sursele</strong> (SQL, Google Sheets, BAT Sync, API) 
                      într-un singur proces. <strong>Elimină automat duplicatele</strong> bazate pe criterii inteligente.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Diferența:</strong> "Sincronizare Date" folosește filtrele tale și sincronizează doar din SQL. 
                      "Import Toate Datele" ignoră filtrele și importă din toate sursele, eliminând duplicatele automat.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center">
                      <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                      Curăță Duplicate
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Caută duplicate SMART în baza de date (aceeași sumă, locație, departament, tip - <strong>chiar dacă în zile diferite</strong>). 
                      Afișează modal cu toate duplicatele găsite și te lasă să alegi ce să păstrezi. <strong>Prioritar: cel din BAT</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleManualSync}
                    disabled={syncingManual}
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 ${
                      syncingManual ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingManual ? 'animate-spin' : ''}`} />
                    <span>{syncingManual ? 'Sincronizare...' : 'Sincronizare Date'}</span>
                  </button>

                  <button
                    onClick={handleManualImportAll}
                    disabled={importingAllManual}
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 ${
                      importingAllManual ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                    }}
                    title="Importă TOATE datele din toate sursele (SQL, Google Sheets, BAT, API) - fără dubluri"
                  >
                    <Database className={`w-4 h-4 ${importingAllManual ? 'animate-spin' : ''}`} />
                    <span>{importingAllManual ? 'Import...' : 'Import Toate Datele'}</span>
                  </button>

                  <button
                    onClick={handleManualCleanDuplicates}
                    disabled={cleaningDuplicates}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-red-500 to-red-600 border-red-400 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{cleaningDuplicates ? 'Curățare...' : 'Curăță Duplicate'}</span>
                  </button>
                </div>
                
                {/* ȘTERGERE COMPLETĂ - SECȚIUNE SEPARATĂ */}
                <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-800">
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Zonă Periculoasă - Ștergere Completă
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                    <strong>ATENȚIE!</strong> Acest buton șterge <strong>ABSOLUT TOTUL</strong> din baza de date: 
                    date BAT, Google Sheets, Preferences, API Sync - <strong>TOTUL!</strong>
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mb-4">
                    Folosește acest buton DOAR dacă vrei să ștergi totul și să reîmporți datele de la zero.
                    <strong> Această acțiune nu poate fi anulată!</strong>
                  </p>
                  <button
                    onClick={async () => {
                      // Modal custom de confirmare
                      const confirmed = window.confirm(
                        `⚠️ ATENȚIE! Ești sigur că vrei să ștergi ABSOLUT TOTUL?\n\n` +
                        `Se vor șterge TOATE datele din expenditures_sync:\n` +
                        `- Date BAT Sync\n` +
                        `- Date Google Sheets\n` +
                        `- Date Preferences\n` +
                        `- Date API Sync\n` +
                        `- TOATE sursele!\n\n` +
                        `Această acțiune nu poate fi anulată!\n\n` +
                        `Scrie "ȘTERG TOTUL" pentru a confirma.`
                      )
                      if (!confirmed) return
                      
                      const confirmText = window.prompt('Scrie "ȘTERG TOTUL" pentru a confirma ștergerea completă:')
                      if (confirmText !== 'ȘTERG TOTUL') {
                        toast.error('Confirmare anulată. Nu s-a șters nimic.')
                        return
                      }
                      
                      try {
                        toast.loading('Se șterg TOATE datele...', { id: 'delete-all' })
                        
                        // Folosește URL-ul complet în ambele medii (development și producție)
                        // Proxy-ul Vite nu routează corect DELETE requests
                        const deleteUrl = import.meta.env.PROD 
                          ? 'https://cashpot-backend.onrender.com/api/expenditures/all-data'
                          : 'http://localhost:5001/api/expenditures/all-data'
                        
                        console.log('🗑️ DELETE request to:', deleteUrl)
                        console.log('🔍 Environment:', import.meta.env.MODE, 'PROD:', import.meta.env.PROD)
                        console.log('🔍 Axios baseURL:', axios.defaults.baseURL)
                        
                        const response = await axios.delete(deleteUrl, {
                          data: {
                            confirmDelete: true,
                            confirmationToken: 'DELETE_ALL_DATA_CONFIRMED_2025'
                          }
                        })
                        console.log('✅ DELETE response:', response.data)
                        toast.success(
                          `✅ Șterse ${response.data.deletedCount.toLocaleString('ro-RO')} înregistrări! Baza de date este acum goală.`,
                          { id: 'delete-all', duration: 8000 }
                        )
                      } catch (error) {
                        console.error('❌ Error deleting all data:', error)
                        console.error('Error details:', {
                          message: error.message,
                          status: error.response?.status,
                          statusText: error.response?.statusText,
                          data: error.response?.data,
                          url: error.config?.url,
                          baseURL: axios.defaults.baseURL,
                          fullURL: error.config?.baseURL ? error.config.baseURL + error.config.url : error.config?.url
                        })
                        toast.error(
                          `Eroare la ștergere: ${error.response?.data?.error || error.message} (Status: ${error.response?.status || 'N/A'})`,
                          { id: 'delete-all', duration: 5000 }
                        )
                      }
                    }}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center justify-center space-x-2 font-semibold shadow-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>ȘTERGE ABSOLUT TOTUL</span>
                  </button>
                </div>
                
                {/* Import All Progress */}
                {importAllProgress && (importAllProgress.status === 'running' || importAllProgress.status === 'completed' || importAllProgress.status === 'failed') && (
                  <div className="mt-6 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Progres Import Toate Datele
                      </h4>
                      {importAllProgress.status === 'running' && (
                        <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      )}
                      {importAllProgress.status === 'completed' && (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      )}
                      {importAllProgress.status === 'failed' && (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    
                    {importAllProgress.status === 'running' && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Progres</span>
                            <span className="text-slate-900 dark:text-slate-100 font-semibold">
                              {importAllProgress.totalProcessed || 0} / {importAllProgress.totalRecords || importAllProgress.totalFound || importAllProgress.total || 0}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${importAllProgress.totalRecords > 0 ? (importAllProgress.totalProcessed / importAllProgress.totalRecords) * 100 : 0}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {importAllProgress.currentStep || 'Se procesează...'}
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Noi</p>
                            <p className="text-lg font-bold text-green-500">{importAllProgress.imported || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Duplicate</p>
                            <p className="text-lg font-bold text-slate-400">{importAllProgress.skipped || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Erori</p>
                            <p className="text-lg font-bold text-red-500">{importAllProgress.errors || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {importAllProgress.status === 'completed' && (
                      <div className="space-y-3">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <p className="text-green-800 dark:text-green-200 font-semibold">
                            ✅ Import complet!
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Noi</p>
                            <p className="text-lg font-bold text-green-500">{importAllProgress.imported || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Duplicate</p>
                            <p className="text-lg font-bold text-slate-400">{importAllProgress.skipped || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Erori</p>
                            <p className="text-lg font-bold text-red-500">{importAllProgress.errors || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {importAllProgress.status === 'failed' && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                        <p className="text-red-800 dark:text-red-200 font-semibold">
                          ❌ Import eșuat: {importAllProgress.error || 'Eroare necunoscută'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                  <div className="space-y-4 mb-4">
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Ora Început (România)
                        </label>
                        <input
                          type="time"
                          value={settings.syncTimeStart || '19:00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, syncTimeStart: e.target.value }))}
                          className="input-field"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sincronizarea va rula doar între aceste ore</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Ora Sfârșit (România)
                        </label>
                        <input
                          type="time"
                          value={settings.syncTimeEnd || '22:00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, syncTimeEnd: e.target.value }))}
                          className="input-field"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        ℹ️ Sincronizarea automată va rula doar între <strong>{settings.syncTimeStart || '19:00'}</strong> și <strong>{settings.syncTimeEnd || '22:00'}</strong> (ora României).
                      </p>
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
              onClick={() => navigate('/expenditures')}
              className="btn-secondary"
            >
              Înapoi
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
      
      {/* Modal pentru Duplicate SMART */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <AlertCircle className="w-6 h-6 mr-3 text-orange-500" />
                  Duplicate Găsite ({duplicateGroups.length} grupuri)
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Selectează ce înregistrări să păstrezi. Prioritar: cel din BAT (bifă verde).
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDuplicatesModal(false)
                  setDuplicateGroups([])
                  setSelectedDuplicatesToKeep(new Map())
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {duplicateGroups.map((group, groupIndex) => {
                  const keepIds = selectedDuplicatesToKeep.get(group.id) || new Set()
                  const totalAmount = group.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                  
                  const formatCurrency = (value) => {
                    if (value === null || value === undefined) return '0,00'
                    return new Intl.NumberFormat('ro-RO', {
                      style: 'decimal',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(Number(value) || 0)
                  }
                  
                  const formatDate = (dateString) => {
                    if (!dateString) return '-'
                    try {
                      return new Date(dateString).toLocaleDateString('ro-RO')
                    } catch (error) {
                      return dateString
                    }
                  }
                  
                  return (
                    <div
                      key={group.id}
                      className="border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4 bg-orange-50/50 dark:bg-orange-900/10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Grup {groupIndex + 1} - {group.items.length} duplicate
                        </h3>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">Suma:</span> {formatCurrency(totalAmount)} RON • 
                          <span className="font-semibold ml-2">Locație:</span> {group.items[0]?.location_name || 'N/A'} • 
                          <span className="font-semibold ml-2">Data:</span> {formatDate(group.items[0]?.operational_date)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const isSelected = keepIds.has(item.id)
                          const isBAT = item.data_source === 'bat_sync'
                          const isPriority = item.id === group.priorityItem.id
                          
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? isBAT || isPriority
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center pt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleDuplicateSelection(group.id, item.id)}
                                  className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer"
                                />
                              </div>
                              
                              <div className="flex-1 grid grid-cols-6 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">ID</p>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">{item.id}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suma</p>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.amount)} RON</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Departament</p>
                                  <p className="text-slate-900 dark:text-slate-100">{item.department_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tip</p>
                                  <p className="text-slate-900 dark:text-slate-100">{item.expenditure_type || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sursă</p>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                    isBAT
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : item.data_source === 'google_sheets'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300'
                                  }`}>
                                    {isBAT ? '🟢 BAT (Prioritar)' : item.data_source === 'google_sheets' ? 'Google Sheets' : 'Altă sursă'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data</p>
                                  <p className="text-slate-900 dark:text-slate-100">{formatDate(item.operational_date)}</p>
                                </div>
                              </div>
                              
                              {isPriority && (
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                  <CheckSquare className="w-5 h-5" title="Prioritar - va fi păstrat" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {keepIds.size > 0 ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            ✓ {keepIds.size} înregistrare{keepIds.size > 1 ? 'i' : ''} selectată{keepIds.size > 1 ? 'e' : ''} pentru păstrare
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            ⚠️ Selectează cel puțin o înregistrare!
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Footer - Butoane */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Total de șters: <span className="font-semibold text-red-600 dark:text-red-400">
                    {duplicateGroups.reduce((sum, g) => {
                      const keepIds = selectedDuplicatesToKeep.get(g.id) || new Set()
                      return sum + (g.items.length - keepIds.size)
                    }, 0)}
                  </span> înregistrări
                </p>
                <p className="mt-1">
                  Total de păstrat: <span className="font-semibold text-green-600 dark:text-green-400">
                    {duplicateGroups.reduce((sum, g) => {
                      const keepIds = selectedDuplicatesToKeep.get(g.id) || new Set()
                      return sum + keepIds.size
                    }, 0)}
                  </span> înregistrări
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowDuplicatesModal(false)
                    setDuplicateGroups([])
                    setSelectedDuplicatesToKeep(new Map())
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteDuplicates}
                  disabled={deletingDuplicates || duplicateGroups.length === 0}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deletingDuplicates ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Se șterg...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Șterge Duplicatele</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal pentru selectarea surselor de import */}
      {showImportSourcesModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                <Database className="w-6 h-6 mr-3 text-blue-500" />
                Selectează Surse de Import
              </h2>
              <button
                onClick={() => setShowImportSourcesModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Selectează din ce surse vrei să importi datele:
              </p>
              
              {/* BAT Sync */}
              <label className="flex items-center space-x-3 p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={importSources.bat}
                  onChange={(e) => setImportSources(prev => ({ ...prev, bat: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">BAT Sync (SQL/API Extern)</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Importă date din baza de date externă (BAT Sync)
                  </div>
                </div>
              </label>
              
              {/* Google Sheets */}
              <label className="flex items-center space-x-3 p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={importSources.googleSheets}
                  onChange={(e) => setImportSources(prev => ({ ...prev, googleSheets: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Google Sheets</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Importă date din Google Sheets (cheltuieli manuale)
                  </div>
                </div>
              </label>
              
              {/* Preferences */}
              <label className="flex items-center space-x-3 p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={importSources.preferences}
                  onChange={(e) => setImportSources(prev => ({ ...prev, preferences: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Preferences (Taxe, Cyber, etc.)</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Importă date din Preferences (taxe, cyber, etc.)
                  </div>
                </div>
              </label>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowImportSourcesModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirmImportAll}
                disabled={!importSources.bat && !importSources.googleSheets && !importSources.preferences}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Database className="w-4 h-4" />
                <span>Importă</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ExpendituresSettings

