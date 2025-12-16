import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useTheme } from '../contexts/ThemeContext'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { RefreshCw, Clock, Calendar, CalendarDays, CalendarRange, ArrowLeft, Settings, CheckCircle, XCircle, Search, X, Trash2, FileCheck } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ExpendituresElectric = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  // State
  const [rawData, setRawData] = useState([])
  const [expendituresData, setExpendituresData] = useState([]) // Cheltuieli din SQL
  const [slotsMonthlyData, setSlotsMonthlyData] = useState([]) // Date exacte despre sloturi pe lună și locație
  const [loading, setLoading] = useState(true)
  const [selectedDateFilter, setSelectedDateFilter] = useState('toate')
  const [locationFilter, setLocationFilter] = useState('all')
  const [nlcFilter, setNlcFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [selectedInvoices, setSelectedInvoices] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyText, setVerifyText] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResults, setVerifyResults] = useState(null)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicateResults, setDuplicateResults] = useState(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  
  // Date range - default TOATE
  const [dateRange, setDateRange] = useState({
    startDate: '2020-01-01',
    endDate: '2030-12-31'
  })

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

  // Format date local
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Quick date filter
  const applyQuickDateFilter = (filterId) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate, endDate
    
    switch (filterId) {
      case 'azi':
        startDate = formatDateLocal(today)
        endDate = formatDateLocal(today)
        break
      case 'saptamana-curenta':
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        startDate = formatDateLocal(monday)
        endDate = formatDateLocal(today)
        break
      case 'luna-curenta':
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        startDate = formatDateLocal(currentMonthStart)
        endDate = formatDateLocal(currentMonthEnd)
        break
      case 'luna-anterioara':
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        startDate = formatDateLocal(prevMonthStart)
        endDate = formatDateLocal(prevMonthEnd)
        break
      case 'anul-curent':
        startDate = formatDateLocal(new Date(now.getFullYear(), 0, 1))
        endDate = formatDateLocal(new Date(now.getFullYear(), 11, 31))
        break
      case 'anul-trecut':
        startDate = formatDateLocal(new Date(now.getFullYear() - 1, 0, 1))
        endDate = formatDateLocal(new Date(now.getFullYear() - 1, 11, 31))
        break
      case 'toate':
        startDate = '2020-01-01'
        endDate = '2030-12-31'
        break
      default:
        return
    }
    
    setDateRange({ startDate, endDate })
    setSelectedDateFilter(filterId)
  }

  // Load data - folosim rawData pentru a vedea toate lunile
  const loadData = async () => {
    setLoading(true)
    try {
      // Încarcă datele din centralizator, cheltuieli și sloturi în paralel
      const [centralizerResponse, expendituresResponse, slotsResponse] = await Promise.all([
        axios.get('/api/expenditures/electric-nlc-centralizer'),
        axios.get('/api/expenditures/sql-table', {
          params: { 
            departments: 'Electricitate',
            limit: 1000 // Suficient pentru toate facturile
          }
        }),
        axios.get('/api/expenditures/slots-monthly').catch(() => ({ data: { data: [] } })) // Fallback dacă nu există endpoint
      ])
      
      if (centralizerResponse.data?.success) {
        setRawData(centralizerResponse.data.rawData || centralizerResponse.data.data || [])
      }
      
      if (expendituresResponse.data?.data) {
        // Datele din tabelul expenditures_sync pentru Electricitate
        setExpendituresData(expendituresResponse.data.data || [])
      }
      
      if (slotsResponse.data?.data) {
        // Datele exacte despre sloturi pe lună și locație
        setSlotsMonthlyData(slotsResponse.data.data || [])
      }
    } catch (error) {
      console.error('Eroare:', error)
      toast.error('Eroare la încărcare')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Parse period to get month/year
  const parsePeriod = (period) => {
    if (!period) return null
    const match = period.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (match) {
      return {
        month: parseInt(match[2]) - 1,
        year: parseInt(match[3]),
        monthKey: `${match[3]}-${match[2]}`
      }
    }
    return null
  }

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locs = new Set()
    rawData.forEach(item => {
      if (item.location_name) locs.add(item.location_name)
    })
    return Array.from(locs).sort()
  }, [rawData])

  // Filter data by period AND location
  const filteredData = useMemo(() => {
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    end.setHours(23, 59, 59)
    
    return rawData.filter(item => {
      // Location filter
      if (locationFilter !== 'all' && item.location_name !== locationFilter) {
        return false
      }
      // NLC filter
      if (nlcFilter !== 'all' && item.nlc_code !== nlcFilter) {
        return false
      }
      // Period filter
      const parsed = parsePeriod(item.perioada_facturare)
      if (!parsed) return false
      const itemDate = new Date(parsed.year, parsed.month, 1)
      if (itemDate < start || itemDate > end) {
        return false
      }
      // Search filter
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase()
        const searchableText = [
          item.location_name || '',
          item.numar_factura || '',
          item.nlc_code || '',
          item.perioada_facturare || '',
          item.total_factura ? String(item.total_factura) : ''
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) {
          return false
        }
      }
      
      return true
    })
  }, [rawData, dateRange, locationFilter, nlcFilter, searchText])

  // Build matrix: month -> location -> data (LUNI pe rânduri, SĂLI pe coloane)
  // IMPORTANT: Folosește suma totală extrasă din factură, nu suma calculată din NLC-uri
  // IMPORTANT: Folosește datele EXACTE despre sloturi din slots_monthly, nu din facturile electrice
  const matrixData = useMemo(() => {
    const matrix = {}
    const locations = new Set()
    const monthsFound = new Set()
    
    // Creează un Map cu datele exacte despre sloturi: key = "year-month-location", value = slots_count
    const exactSlotsMap = new Map()
    slotsMonthlyData.forEach(slotData => {
      if (slotData.year && slotData.month && slotData.location_name && slotData.slots_count) {
        const key = `${slotData.year}-${String(slotData.month).padStart(2, '0')}-${slotData.location_name}`
        exactSlotsMap.set(key, parseInt(slotData.slots_count) || 0)
      }
    })
    
    // Grupează datele pe factură pentru a folosi suma totală extrasă din factură
    const invoiceMap = new Map() // key: numar_factura, value: { invoiceTotalAmount, items: [] }
    
    filteredData.forEach(item => {
      const invoiceNumber = item.numar_factura
      if (!invoiceMap.has(invoiceNumber)) {
        invoiceMap.set(invoiceNumber, {
          invoiceTotalAmount: item.invoice_total_amount ? parseFloat(item.invoice_total_amount) : null,
          items: []
        })
      }
      invoiceMap.get(invoiceNumber).items.push(item)
    })

    // Procesează fiecare factură
    invoiceMap.forEach((invoiceData, invoiceNumber) => {
      const invoiceTotalAmount = invoiceData.invoiceTotalAmount
      const items = invoiceData.items
      
      // Dacă există suma totală extrasă din factură, o folosim
      // Altfel, calculăm din sumele NLC-urilor (doar pentru facturile vechi)
      let totalSumaFactura = 0
      let totalConsumFactura = 0
      
      if (invoiceTotalAmount && invoiceTotalAmount > 0) {
        // Folosește suma extrasă din factură
        totalSumaFactura = invoiceTotalAmount
        // Calculează consumul total din NLC-uri (consumul este corect)
        totalConsumFactura = items.reduce((sum, item) => {
          return sum + (parseFloat(item.consum_kwh) || 0)
        }, 0)
      } else {
        // Fallback: calculează din sumele NLC-urilor (pentru facturile vechi)
        totalSumaFactura = items.reduce((sum, item) => {
          return sum + (parseFloat(item.suma_totala) || 0)
        }, 0)
        totalConsumFactura = items.reduce((sum, item) => {
          return sum + (parseFloat(item.consum_kwh) || 0)
        }, 0)
      }
      
      // Calculează distribuția pe lună-locație pentru această factură
      // Folosim un Map pentru a evita dublarea: key = monthKey-loc, value = { kwh, slots, days }
      const monthLocationMap = new Map()
      
      // Calculează perioada comună a facturii (cea mai largă perioadă dintre toate NLC-urile)
      let invoiceStartDate = null
      let invoiceEndDate = null
      items.forEach(item => {
        const period = item.perioada_facturare
        if (!period) return
        
        const periodMatch = period.match(/(\d{2})\.(\d{2})\.(\d{4})\s*[-–]\s*(\d{2})\.(\d{2})\.(\d{4})/)
        if (periodMatch) {
          const startDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
          const endDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))
          
          if (!invoiceStartDate || startDate < invoiceStartDate) {
            invoiceStartDate = startDate
          }
          if (!invoiceEndDate || endDate > invoiceEndDate) {
            invoiceEndDate = endDate
          }
        }
      })
      
      // Dacă nu am putut calcula perioada comună, folosește perioada primului item
      if (!invoiceStartDate || !invoiceEndDate) {
        const firstItem = items.find(item => item.perioada_facturare)
        if (firstItem) {
          const periodMatch = firstItem.perioada_facturare.match(/(\d{2})\.(\d{2})\.(\d{4})\s*[-–]\s*(\d{2})\.(\d{2})\.(\d{4})/)
          if (periodMatch) {
            invoiceStartDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
            invoiceEndDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))
          }
        }
      }
      
      // Calculează zilele pentru fiecare lună din perioada facturii (o singură dată)
      const invoiceTotalDays = invoiceStartDate && invoiceEndDate 
        ? Math.ceil((invoiceEndDate - invoiceStartDate) / (1000 * 60 * 60 * 24)) + 1 
        : 0
      
      const invoiceMonths = []
      if (invoiceStartDate && invoiceEndDate) {
        let current = new Date(invoiceStartDate.getFullYear(), invoiceStartDate.getMonth(), 1)
        while (current <= invoiceEndDate) {
          const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
          const monthStart = current <= invoiceStartDate ? invoiceStartDate : new Date(current.getFullYear(), current.getMonth(), 1)
          const monthEnd = current.getMonth() === invoiceEndDate.getMonth() && current.getFullYear() === invoiceEndDate.getFullYear() 
            ? invoiceEndDate 
            : new Date(current.getFullYear(), current.getMonth() + 1, 0)
          
          const monthStartDay = monthStart > invoiceStartDate ? monthStart : invoiceStartDate
          const monthEndDay = monthEnd < invoiceEndDate ? monthEnd : invoiceEndDate
          const daysInMonth = Math.ceil((monthEndDay - monthStartDay) / (1000 * 60 * 60 * 24)) + 1
          
          invoiceMonths.push({
            monthKey,
            month: current.getMonth() + 1,
            year: current.getFullYear(),
            days: daysInMonth
          })
          current.setMonth(current.getMonth() + 1)
        }
      }
      
      // Calculează sloturile EXACTE per lună-locație din slots_monthly
      // Nu folosim slots_count din facturile electrice, ci datele exacte pe care le-ai introdus manual
      const getExactSlots = (year, month, location) => {
        const key = `${year}-${String(month).padStart(2, '0')}-${location}`
        return exactSlotsMap.get(key) || 0
      }
      
      // Adaugă consumul pentru fiecare NLC, grupând pe lună-locație
      items.forEach(item => {
        const loc = item.location_name || 'N/A'
        const period = item.perioada_facturare
        const consumKwh = parseFloat(item.consum_kwh) || 0
        
        if (!period) return
        
        // Parsează perioada pentru a găsi lunile acoperite
        const periodMatch = period.match(/(\d{2})\.(\d{2})\.(\d{4})\s*[-–]\s*(\d{2})\.(\d{2})\.(\d{4})/)
        if (!periodMatch) {
          // Dacă nu poate parsa perioada, folosește prima lună găsită
          const parsed = parsePeriod(period)
          if (parsed) {
            const monthKey = parsed.monthKey
            const key = `${monthKey}-${loc}`
            if (!monthLocationMap.has(key)) {
              // Folosește datele EXACTE despre sloturi din slots_monthly
              const exactSlots = getExactSlots(parsed.year, parsed.month + 1, loc)
              monthLocationMap.set(key, {
                monthKey,
                loc,
                month: parsed.month,
                year: parsed.year,
                kwh: 0,
                slots: exactSlots, // Folosește datele EXACTE despre sloturi
                days: 0
              })
            }
            const entry = monthLocationMap.get(key)
            entry.kwh += consumKwh
          }
          return
        }
        
        const startDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
        const endDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))
        const itemTotalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        
        // Generează lista de luni acoperite pentru acest NLC
        const monthsInPeriod = []
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        while (current <= endDate) {
          const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
          const monthStart = current <= startDate ? startDate : new Date(current.getFullYear(), current.getMonth(), 1)
          const monthEnd = current.getMonth() === endDate.getMonth() && current.getFullYear() === endDate.getFullYear() 
            ? endDate 
            : new Date(current.getFullYear(), current.getMonth() + 1, 0)
          
          const monthStartDay = monthStart > startDate ? monthStart : startDate
          const monthEndDay = monthEnd < endDate ? monthEnd : endDate
          const daysInMonth = Math.ceil((monthEndDay - monthStartDay) / (1000 * 60 * 60 * 24)) + 1
          
          monthsInPeriod.push({
            monthKey,
            days: daysInMonth,
            totalDays: itemTotalDays
          })
          current.setMonth(current.getMonth() + 1)
        }
        
        // Adaugă consumul pentru fiecare lună-locație
        monthsInPeriod.forEach(monthInfo => {
          const key = `${monthInfo.monthKey}-${loc}`
          if (!monthLocationMap.has(key)) {
            // Găsește informațiile despre lună din invoiceMonths
            const monthInfoFromInvoice = invoiceMonths.find(m => m.monthKey === monthInfo.monthKey)
            if (monthInfoFromInvoice) {
              // Folosește datele EXACTE despre sloturi din slots_monthly
              const exactSlots = getExactSlots(monthInfoFromInvoice.year, monthInfoFromInvoice.month, loc)
              monthLocationMap.set(key, {
                monthKey: monthInfoFromInvoice.monthKey,
                loc,
                month: monthInfoFromInvoice.month,
                year: monthInfoFromInvoice.year,
                kwh: 0,
                slots: exactSlots, // Folosește datele EXACTE despre sloturi
                days: monthInfoFromInvoice.days // Folosește zilele calculate o singură dată
              })
            } else {
              // Fallback: folosește parsePeriod
              const parsed = parsePeriod(period)
              if (parsed) {
                // Folosește datele EXACTE despre sloturi din slots_monthly
                const exactSlots = getExactSlots(parsed.year, parsed.month + 1, loc)
                monthLocationMap.set(key, {
                  monthKey: parsed.monthKey,
                  loc,
                  month: parsed.month,
                  year: parsed.year,
                  kwh: 0,
                  slots: exactSlots, // Folosește datele EXACTE despre sloturi
                  days: monthInfo.days
                })
              }
            }
          }
          const entry = monthLocationMap.get(key)
          // Distribuie consumul proporțional pe zile
          const proportion = monthInfo.days / monthInfo.totalDays
          entry.kwh += consumKwh * proportion
        })
      })
      
      // Calculează totalul de zile și consum pentru distribuția proporțională
      let totalDaysForDistribution = 0
      let totalKwhForDistribution = 0
      monthLocationMap.forEach(entry => {
        totalDaysForDistribution += entry.days
        totalKwhForDistribution += entry.kwh
      })
      
      // Distribuie suma facturii proporțional pe baza consumului sau zilelor
      monthLocationMap.forEach(entry => {
        const { monthKey, loc, month, year, kwh, slots } = entry
        
        locations.add(loc)
        monthsFound.add(monthKey)
        
        if (!matrix[monthKey]) {
          matrix[monthKey] = { month, year }
        }
        if (!matrix[monthKey][loc]) {
          matrix[monthKey][loc] = { ron: 0, kwh: 0, slots: 0 }
        }
        
        // Distribuie suma facturii proporțional pe baza consumului (sau zilelor dacă consumul este 0)
        let proportion = 0
        if (totalKwhForDistribution > 0) {
          proportion = kwh / totalKwhForDistribution
        } else if (totalDaysForDistribution > 0) {
          proportion = entry.days / totalDaysForDistribution
        } else {
          proportion = 1 / monthLocationMap.size // Distribuie egal dacă nu avem date
        }
        
        // IMPORTANT: Folosește suma totală extrasă din factură, nu suma calculată din NLC-uri
        matrix[monthKey][loc].ron += totalSumaFactura * proportion
        matrix[monthKey][loc].kwh += kwh
        if (slots > matrix[monthKey][loc].slots) {
          matrix[monthKey][loc].slots = slots
        }
      })
    })

    const sortedMonths = Array.from(monthsFound).sort()
    const sortedLocations = Array.from(locations).sort()

    return { matrix, sortedMonths, sortedLocations }
  }, [filteredData, slotsMonthlyData])

  // Format month key to display
  const formatMonthKey = (key) => {
    const [year, month] = key.split('-')
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  // Calculate totals per month (row totals)
  const monthTotals = useMemo(() => {
    const totals = {}
    matrixData.sortedMonths.forEach(monthKey => {
      totals[monthKey] = { ron: 0, kwh: 0, slots: 0 }
      matrixData.sortedLocations.forEach(loc => {
        if (matrixData.matrix[monthKey]?.[loc]) {
          totals[monthKey].ron += matrixData.matrix[monthKey][loc].ron
          totals[monthKey].kwh += matrixData.matrix[monthKey][loc].kwh
          totals[monthKey].slots += matrixData.matrix[monthKey][loc].slots || 0
        }
      })
    })
    return totals
  }, [matrixData])

  // Calculate averages per location (column averages) - MEDIA pe slot, nu sumă
  const locationTotals = useMemo(() => {
    const totals = {}
    matrixData.sortedLocations.forEach(loc => {
      let totalRon = 0, totalKwh = 0, totalSlots = 0, monthCount = 0
      matrixData.sortedMonths.forEach(monthKey => {
        if (matrixData.matrix[monthKey]?.[loc]) {
          totalRon += matrixData.matrix[monthKey][loc].ron
          totalKwh += matrixData.matrix[monthKey][loc].kwh
          totalSlots += matrixData.matrix[monthKey][loc].slots || 0
          monthCount++
        }
      })
      // Calculează media pe slot: suma totală / suma sloturilor
      const avgRonPerSlot = totalSlots > 0 ? totalRon / totalSlots : 0
      const avgKwhPerSlot = totalSlots > 0 ? totalKwh / totalSlots : 0
      const avgSlots = monthCount > 0 ? totalSlots / monthCount : 0
      totals[loc] = { 
        ron: avgRonPerSlot, // Media pe slot
        kwh: avgKwhPerSlot, // Media pe slot
        slots: avgSlots // Media sloturilor pe lună
      }
    })
    return totals
  }, [matrixData])

  // Grand totals SUMĂ - pentru stats cards și grafic
  const grandTotalSum = useMemo(() => {
    let totalRon = 0, totalKwh = 0
    
    // Calculează sloturile CORECT: suma sloturilor pentru fiecare lună (toate locațiile), apoi media pe luni
    const slotsPerMonth = [] // Array cu suma sloturilor pentru fiecare lună (toate locațiile combinate)
    
    matrixData.sortedMonths.forEach(monthKey => {
      let slotsForThisMonth = 0
      let hasDataForThisMonth = false
      
      matrixData.sortedLocations.forEach(loc => {
        if (matrixData.matrix[monthKey]?.[loc]) {
          totalRon += matrixData.matrix[monthKey][loc].ron
          totalKwh += matrixData.matrix[monthKey][loc].kwh
          const slots = matrixData.matrix[monthKey][loc].slots || 0
          slotsForThisMonth += slots // Adună sloturile pentru toate locațiile din această lună
          hasDataForThisMonth = true
        }
      })
      
      if (hasDataForThisMonth && slotsForThisMonth > 0) {
        slotsPerMonth.push(slotsForThisMonth) // Adaugă suma totală de sloturi pentru această lună
      }
    })
    
    // Media sloturilor = suma totală de sloturi pentru toate lunile / numărul de luni
    const avgSlotsPerMonth = slotsPerMonth.length > 0 
      ? slotsPerMonth.reduce((sum, slots) => sum + slots, 0) / slotsPerMonth.length 
      : 0
    
    return { 
      ron: totalRon, // Suma totală
      kwh: totalKwh, // Suma totală
      slots: slotsPerMonth.reduce((sum, slots) => sum + slots, 0), // Suma sloturilor pentru calcul
      avgSlotsPerMonth // Media sloturilor pe lună (suma pentru toate locațiile)
    }
  }, [matrixData])

  // Grand totals - MEDIA pe slot pentru toate locațiile (pentru rândul TOTAL SALĂ)
  const grandTotal = useMemo(() => {
    let totalRon = 0, totalKwh = 0, totalSlots = 0
    matrixData.sortedLocations.forEach(loc => {
      let locRon = 0, locKwh = 0, locSlots = 0
      matrixData.sortedMonths.forEach(monthKey => {
        if (matrixData.matrix[monthKey]?.[loc]) {
          locRon += matrixData.matrix[monthKey][loc].ron
          locKwh += matrixData.matrix[monthKey][loc].kwh
          locSlots += matrixData.matrix[monthKey][loc].slots || 0
        }
      })
      totalRon += locRon
      totalKwh += locKwh
      totalSlots += locSlots
    })
    // Calculează media generală pe slot
    const avgRonPerSlot = totalSlots > 0 ? totalRon / totalSlots : 0
    const avgKwhPerSlot = totalSlots > 0 ? totalKwh / totalSlots : 0
    const avgSlots = matrixData.sortedLocations.length > 0 && matrixData.sortedMonths.length > 0 
      ? totalSlots / (matrixData.sortedLocations.length * matrixData.sortedMonths.length) 
      : 0
    return { 
      ron: avgRonPerSlot, // Media pe slot
      kwh: avgKwhPerSlot, // Media pe slot
      slots: avgSlots // Media sloturilor
    }
  }, [matrixData])

  // Handle invoice selection
  const handleInvoiceSelect = (invoiceNumber) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(invoiceNumber)) {
      newSelected.delete(invoiceNumber)
    } else {
      newSelected.add(invoiceNumber)
    }
    setSelectedInvoices(newSelected)
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedInvoices.size === uniqueInvoices.invoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(uniqueInvoices.invoices.map(inv => inv.number)))
    }
  }

  // Handle delete selected invoices
  const handleDeleteSelected = async () => {
    if (selectedInvoices.size === 0) return

    const invoiceNumbers = Array.from(selectedInvoices)
    const confirmMessage = `Ești sigur că vrei să ștergi ${invoiceNumbers.length} factură${invoiceNumbers.length === 1 ? '' : 'i'}?\n\nAceastă acțiune va șterge toate NLC-urile asociate acestor facturi din centralizator.\n\nFacturi: ${invoiceNumbers.join(', ')}`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    setDeleting(true)
    try {
      const response = await axios.post('/api/expenditures/delete-electric-invoices', {
        invoice_numbers: invoiceNumbers
      })

      if (response.data?.success) {
        toast.success(response.data.message || `${invoiceNumbers.length} factură${invoiceNumbers.length === 1 ? '' : 'i'} șterse cu succes`)
        setSelectedInvoices(new Set())
        // Reîncarcă datele
        await loadData()
      } else {
        toast.error(response.data?.error || 'Eroare la ștergerea facturilor')
      }
    } catch (error) {
      console.error('Error deleting invoices:', error)
      toast.error(error.response?.data?.error || 'Eroare la ștergerea facturilor')
    } finally {
      setDeleting(false)
    }
  }

  // Average price
  const avgPrice = grandTotalSum.kwh > 0 ? grandTotalSum.ron / grandTotalSum.kwh : 0

  // Analiză teoretică consum sloturi vs restul sălii
  // Presupunere: 1 slot consumă ~0.35 kWh (350W medie) x 24h x 30 zile = ~252 kWh/lună
  const SLOT_CONSUMPTION_KWH_PER_MONTH = 252 // kWh/slot/lună estimativ
  const theoreticalAnalysis = useMemo(() => {
    const months = matrixData.sortedMonths.length
    if (months === 0 || grandTotalSum.slots === 0) return null
    
    const theoreticalSlotConsumption = grandTotalSum.slots * SLOT_CONSUMPTION_KWH_PER_MONTH * months
    const actualConsumption = grandTotalSum.kwh
    const otherConsumption = Math.max(0, actualConsumption - theoreticalSlotConsumption)
    const slotPercentage = actualConsumption > 0 ? (theoreticalSlotConsumption / actualConsumption) * 100 : 0
    const otherPercentage = 100 - slotPercentage
    
    return {
      theoreticalSlotConsumption,
      actualConsumption,
      otherConsumption,
      slotPercentage: Math.min(100, slotPercentage), // Cap at 100%
      otherPercentage: Math.max(0, otherPercentage)
    }
  }, [grandTotalSum, matrixData.sortedMonths.length])

  // Date pentru graficul de evoluție lunară
  const chartData = useMemo(() => {
    return matrixData.sortedMonths.map(monthKey => {
      const [year, month] = monthKey.split('-')
      const monthName = monthNames[parseInt(month) - 1]?.substring(0, 3) || month
      
      return {
        name: `${monthName}. ${year}`,
        monthKey,
        total: monthTotals[monthKey]?.ron || 0,
        kwh: monthTotals[monthKey]?.kwh || 0
      }
    })
  }, [matrixData.sortedMonths, monthTotals, monthNames])

  // Facturi unice - grupate pe număr factură + verificare în Cheltuieli
  const uniqueInvoices = useMemo(() => {
    const invoiceMap = {}
    const allUniqueNlcs = new Set() // Pentru totalul de NLC-uri unice
    
    // Creează un set cu numerele de facturi din cheltuieli (din description)
    const invoicesInExpenditures = new Set()
    const expendituresAmountByInvoice = {}
    
    expendituresData.forEach(exp => {
      // Caută numărul facturii în description (format: "Factură EFI/XXX | ...")
      const desc = exp.description || ''
      const match = desc.match(/EFI\/\d+/)
      if (match) {
        const invoiceNum = match[0]
        invoicesInExpenditures.add(invoiceNum)
        // Acumulează suma pentru fiecare factură
        if (!expendituresAmountByInvoice[invoiceNum]) {
          expendituresAmountByInvoice[invoiceNum] = 0
        }
        expendituresAmountByInvoice[invoiceNum] += parseFloat(exp.amount) || 0
      }
    })
    
    // Grupează datele pe factură + NLC pentru a detecta duplicate
    const invoiceNlcMap = new Map() // key: "factura_nlc_perioada"
    
    filteredData.forEach(item => {
      const invoiceNumber = item.numar_factura
      if (!invoiceNumber) return
      
      // Adaugă NLC-ul la setul global de NLC-uri unice
      if (item.nlc_code) {
        allUniqueNlcs.add(item.nlc_code)
      }
      
      // Creează o cheie unică pentru a detecta duplicate
      const uniqueKey = `${invoiceNumber}_${item.nlc_code || 'N/A'}_${item.perioada_facturare || 'N/A'}`
      
      if (!invoiceNlcMap.has(uniqueKey)) {
        invoiceNlcMap.set(uniqueKey, {
          item,
          count: 1
        })
      } else {
        // Duplicat detectat - păstrează doar prima înregistrare
        const existing = invoiceNlcMap.get(uniqueKey)
        existing.count++
        console.warn(`⚠️ Duplicat detectat pentru ${uniqueKey}: ${existing.count} înregistrări`)
      }
    })
    
    // Procesează datele fără duplicate
    invoiceNlcMap.forEach(({ item, count }) => {
      const invoiceNumber = item.numar_factura
      
      if (!invoiceMap[invoiceNumber]) {
        // Verifică dacă factura e în cheltuieli
        const inExpenditures = invoicesInExpenditures.has(invoiceNumber)
        const expendituresAmount = expendituresAmountByInvoice[invoiceNumber] || 0
        
        invoiceMap[invoiceNumber] = {
          number: invoiceNumber,
          period: item.perioada_facturare || 'N/A',
          totalRon: 0,
          totalKwh: 0,
          nlcCount: 0,
          nlcCodes: new Set(),
          contorCodes: new Set(), // Coduri contor
          locations: new Set(),
          inExpenditures,
          expendituresAmount,
          duplicateCount: 0, // Număr de duplicate detectate
          invoiceTotalAmount: null // Suma totală extrasă direct din factură
        }
      }
      
      // PRIORITATE ABSOLUTĂ: Folosește suma totală extrasă din factură dacă există
      // Aceasta este SINGURA SURSĂ DE ADEVĂR pentru suma totală
      if (item.invoice_total_amount && parseFloat(item.invoice_total_amount) > 0) {
        const extractedAmount = parseFloat(item.invoice_total_amount)
        if (!invoiceMap[invoiceNumber].invoiceTotalAmount || invoiceMap[invoiceNumber].invoiceTotalAmount !== extractedAmount) {
          invoiceMap[invoiceNumber].invoiceTotalAmount = extractedAmount
          console.log(`   ✅ Factura ${invoiceNumber}: Suma extrasă din factură: ${extractedAmount.toFixed(2)} RON`)
        }
      }
      
      // Adaugă suma NLC-ului doar pentru calcul (dacă nu există suma extrasă, o folosim ca fallback)
      // IMPORTANT: Nu adăuga duplicatele
      if (count === 1) {
        invoiceMap[invoiceNumber].totalRon += parseFloat(item.suma_totala) || 0
        invoiceMap[invoiceNumber].totalKwh += parseFloat(item.consum_kwh) || 0
        invoiceMap[invoiceNumber].nlcCount += 1
      } else {
        // Duplicat detectat - nu adăuga suma de mai multe ori
        invoiceMap[invoiceNumber].duplicateCount += (count - 1)
        console.warn(`⚠️ Duplicat ignorat pentru factura ${invoiceNumber}, NLC ${item.nlc_code}: ${count} înregistrări`)
      }
      
      if (item.nlc_code) {
        invoiceMap[invoiceNumber].nlcCodes.add(item.nlc_code)
      }
      if (item.numar_contor) {
        invoiceMap[invoiceNumber].contorCodes.add(item.numar_contor)
      }
      if (item.location_name) {
        invoiceMap[invoiceNumber].locations.add(item.location_name)
      }
    })
    
    // Convertește la array și sortează pe perioadă
    const invoices = Object.values(invoiceMap)
      .map(inv => {
        // PRIORITATE ABSOLUTĂ: Folosește ÎNTOTDEAUNA suma totală extrasă din factură dacă există
        // Aceasta este SINGURA SURSĂ DE ADEVĂR pentru suma totală
        const finalTotalRon = inv.invoiceTotalAmount && inv.invoiceTotalAmount > 0
          ? inv.invoiceTotalAmount
          : inv.totalRon
        
        // Verifică dacă există o discrepanță mare între suma extrasă și suma calculată
        if (inv.invoiceTotalAmount && inv.invoiceTotalAmount > 0 && inv.totalRon > 0) {
          const diferenta = Math.abs(inv.totalRon - inv.invoiceTotalAmount)
          const procentDiferenta = (diferenta / inv.invoiceTotalAmount) * 100
          if (procentDiferenta > 5) {
            console.warn(`⚠️ Factura ${inv.number}: Discrepanță ${procentDiferenta.toFixed(1)}%`)
            console.warn(`   → Suma extrasă din factură: ${inv.invoiceTotalAmount.toFixed(2)} RON`)
            console.warn(`   → Suma calculată din NLC-uri: ${inv.totalRon.toFixed(2)} RON`)
            console.warn(`   → Se folosește suma extrasă (corectă)`)
          }
        }
        
        // Verifică dacă există duplicate și afișează avertisment
        if (inv.duplicateCount > 0) {
          console.warn(`⚠️ Factura ${inv.number}: ${inv.duplicateCount} duplicate detectate`)
        }
        
        return {
          ...inv,
          totalRon: finalTotalRon, // Folosește suma extrasă din factură (prioritate absolută)
          calculatedRon: inv.totalRon, // Păstrează suma calculată pentru comparație
          nlcCodes: Array.from(inv.nlcCodes),
          contorCodes: Array.from(inv.contorCodes),
          locations: Array.from(inv.locations),
          hasDuplicates: inv.duplicateCount > 0,
          usingExtractedAmount: inv.invoiceTotalAmount && inv.invoiceTotalAmount > 0
        }
      })
      .sort((a, b) => {
        // Sortare pe perioadă
        const dateA = a.period.split(' - ')[0] || ''
        const dateB = b.period.split(' - ')[0] || ''
        return dateA.localeCompare(dateB)
      })
    
    // Calculează câte sunt în cheltuieli
    const inExpendituresCount = invoices.filter(i => i.inExpenditures).length
    
    // Returnează și totalul de NLC-uri unice
    return {
      invoices,
      totalUniqueNlcs: allUniqueNlcs.size,
      inExpendituresCount
    }
  }, [filteredData, expendituresData])

  return (
    <Layout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Back button - STÂNGA */}
            <button
              onClick={() => navigate('/expenditures')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Înapoi la Cheltuieli"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Electrica</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Centralizator consum și costuri energie electrică
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Buton Setări Electrică */}
            <button
              onClick={() => navigate('/expenditures/settings?tab=electric')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105"
              style={{
                height: '40px',
                background: isDark 
                  ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                boxShadow: isDark
                  ? '0 6px 18px rgba(124, 58, 237, 0.4)'
                  : '0 6px 18px rgba(139, 92, 246, 0.35)'
              }}
              title="Setări și import facturi electrice"
            >
              <Settings className="w-4 h-4" />
              <span>Setări</span>
            </button>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold border transition-all hover:scale-105"
              style={{
                height: '40px',
                background: isDark 
                  ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                  : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                boxShadow: isDark
                  ? '0 6px 18px rgba(15, 23, 42, 0.5)'
                  : '0 6px 18px rgba(30, 58, 138, 0.35)'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Reîncarcă</span>
            </button>
          </div>
        </div>
        
        {/* Filters - Nou Design */}
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl shadow-xl border border-transparent backdrop-blur-2xl mb-6">
          {/* Rând 1: Bară de Căutare + Filtre - Pe același rând */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            {/* Bară de Căutare - Ocupă spațiul rămas */}
            <div className="relative flex-1 min-w-[250px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Căutare
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Caută în Locație, Număr Factură, NLC, Perioadă, Sumă..."
                  className="w-full pl-10 pr-10 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                    title="Șterge căutarea"
                  >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre Locație și NLC */}
            <div className="flex items-end gap-3">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Locație
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                  style={{ minWidth: '180px' }}
                >
                  <option value="all">Toate</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              {nlcFilter !== 'all' && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Filtru NLC Activ
                  </label>
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-blue-500 dark:border-blue-400 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                      {nlcFilter}
                    </span>
                    <button
                      onClick={() => setNlcFilter('all')}
                      className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
                      title="Elimină filtrul NLC"
                    >
                      <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Rând 2: Date Picker Clasic și Comod */}
          <div className="mb-4">
            {/* Input-uri de date */}
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2">
              {/* Date Inputs - Clasic și Simplu */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    De la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, startDate: e.target.value })
                      setSelectedDateFilter('custom')
                    }}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Până la:
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, endDate: e.target.value })
                      setSelectedDateFilter('custom')
                    }}
                    className="px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-sm transition-all hover:border-blue-400 dark:hover:border-blue-500"
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>

              {/* Săgeți Navigare Perioadă */}
              <div className="flex items-center gap-1 border-l border-r border-slate-200 dark:border-slate-700 px-3">
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() - diffDays - 1)
                    end.setDate(end.getDate() - diffDays - 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                    setSelectedDateFilter('custom')
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă anterioară"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    const start = new Date(dateRange.startDate)
                    const end = new Date(dateRange.endDate)
                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
                    
                    start.setDate(start.getDate() + diffDays + 1)
                    end.setDate(end.getDate() + diffDays + 1)
                    
                    setDateRange({
                      startDate: formatDateLocal(start),
                      endDate: formatDateLocal(end)
                    })
                    setSelectedDateFilter('custom')
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perioadă următoare"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Text Perioadă Afișată */}
              <div className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.startDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {' – '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(dateRange.endDate).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Butoane Rapide cu Iconițe și Text - Sub Input-uri */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
              {[
                { id: 'azi', label: 'Azi', icon: Clock },
                { id: 'saptamana-curenta', label: 'Săpt', icon: CalendarDays },
                { id: 'luna-curenta', label: 'Luna curentă', icon: Calendar },
                { id: 'luna-anterioara', label: 'Luna trecută', icon: CalendarRange },
                { id: 'anul-curent', label: 'Anul curent', icon: Calendar },
                { id: 'anul-trecut', label: 'Anul trecut', icon: Calendar },
                { id: 'toate', label: 'Toate', icon: Calendar }
              ].map((btn) => {
                const IconComponent = btn.icon
                const isActive = selectedDateFilter === btn.id
                return (
                  <button
                    key={btn.id}
                    onClick={() => applyQuickDateFilter(btn.id)}
                    className={`relative inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                    title={btn.label}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{btn.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Cost</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {grandTotalSum.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-500">lei</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Total Consum</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {grandTotalSum.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-slate-500">kWh</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Preț Mediu</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {avgPrice.toFixed(4)}
            </p>
            <p className="text-sm text-slate-500">lei/kWh</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Locații / Luni</p>
            <p className="text-3xl font-bold text-slate-700 dark:text-slate-300 mt-2">
              {matrixData.sortedLocations.length} / {matrixData.sortedMonths.length}
            </p>
            <p className="text-sm text-slate-500">active / facturate</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Cost / Slot / Lună</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              {grandTotalSum.avgSlotsPerMonth > 0 && matrixData.sortedMonths.length > 0 
                ? (grandTotalSum.ron / matrixData.sortedMonths.length / grandTotalSum.avgSlotsPerMonth).toFixed(2) 
                : '—'}
            </p>
            <p className="text-sm text-slate-500">
              lei/slot/lună ({Math.round(grandTotalSum.avgSlotsPerMonth)} sloturi medii, {matrixData.sortedMonths.length} {matrixData.sortedMonths.length === 1 ? 'lună' : 'luni'})
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">kWh / Slot / Lună</p>
            <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
              {grandTotalSum.avgSlotsPerMonth > 0 && matrixData.sortedMonths.length > 0 
                ? (grandTotalSum.kwh / matrixData.sortedMonths.length / grandTotalSum.avgSlotsPerMonth).toFixed(1) 
                : '—'}
            </p>
            <p className="text-sm text-slate-500">kWh/slot/lună</p>
          </div>
        </div>

        {/* Analiză Teoretică Consum - doar dacă avem date */}
        {theoreticalAnalysis && (
          <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span>📊</span> Analiză Teoretică Consum
              <span className="text-xs font-normal text-slate-500">(estimare: 1 slot ≈ 252 kWh/lună @ 350W medie)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Consum Real Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {theoreticalAnalysis.actualConsumption.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Consum Teoretic Sloturi</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {theoreticalAnalysis.theoreticalSlotConsumption.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                </p>
                <p className="text-xs text-slate-400">({theoreticalAnalysis.slotPercentage.toFixed(1)}% din total)</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Consum Alte Echipamente</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {theoreticalAnalysis.otherConsumption.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh
                </p>
                <p className="text-xs text-slate-400">({theoreticalAnalysis.otherPercentage.toFixed(1)}% din total)</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">Raport Sloturi / Alte</p>
                <div className="mt-2 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${theoreticalAnalysis.slotPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400">Sloturi {theoreticalAnalysis.slotPercentage.toFixed(0)}%</span>
                  <span className="text-orange-600 dark:text-orange-400">Alte {theoreticalAnalysis.otherPercentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              💡 Notă: Consumul teoretic per slot este estimativ (~350W x 24h x 30 zile). 
              Diferența reprezintă LED-uri, climatizare, frigidere, TV-uri, și alte echipamente din sală.
            </p>
          </div>
        )}

        {/* Grafic Evoluție Cheltuieli Electricitate */}
        {chartData.length > 0 && (
          <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📈</span> Evoluție Cheltuieli Electricitate
                <span className="text-xs font-normal text-slate-500">
                  {dateRange.startDate} - {dateRange.endDate}
                </span>
              </h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {grandTotalSum.ron.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </div>
                <div className="text-xs text-slate-500">Total perioadă</div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                    formatter={(value, name, props) => {
                      // name poate fi "Cost (RON)" sau "Consum (kWh)" din prop-ul name al Line
                      // Verificăm dacă conține "Cost" sau "Consum"
                      const isCost = name?.includes('Cost') || name === 'total' || props?.dataKey === 'total'
                      const isKwh = name?.includes('Consum') || name === 'kwh' || props?.dataKey === 'kwh'
                      
                      if (isCost) {
                        return [
                          `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`,
                          'Cost'
                        ]
                      } else if (isKwh) {
                        return [
                          `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kWh`,
                          'Consum'
                        ]
                      }
                      // Fallback
                      return [
                        `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        name || 'Valoare'
                      ]
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Cost (RON)"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, fill: '#2563eb' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="kwh" 
                    name="Consum (kWh)"
                    stroke="#22c55e" 
                    strokeWidth={3}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, fill: '#16a34a' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabel Centralizator Costuri pe Locație */}
        {!loading && matrixData.sortedMonths.length > 0 && (
          <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span>💰</span> Centralizator Costuri pe Locație
              <span className="text-xs font-normal text-slate-500">
                ({dateRange.startDate} - {dateRange.endDate})
              </span>
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-800 dark:bg-slate-900">
                      <th className="px-4 py-3 text-left font-bold text-white border-b border-r border-slate-600 min-w-[140px]">
                        LUNĂ
                      </th>
                      {matrixData.sortedLocations.map(loc => (
                        <th 
                          key={loc} 
                          className="px-4 py-3 text-center font-bold text-white border-b border-r border-slate-600"
                        >
                          {loc}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-bold text-white border-b border-slate-600">
                        TOTAL LUNĂ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800">
                    {matrixData.sortedMonths.map((monthKey) => {
                      let monthTotal = 0
                      return (
                        <tr 
                          key={monthKey} 
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td 
                            className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => navigate(`/expenditures/electric/${monthKey}`)}
                            title="Click pentru detalii lună"
                          >
                            {formatMonthKey(monthKey)}
                          </td>
                          {matrixData.sortedLocations.map(loc => {
                            const cellData = matrixData.matrix[monthKey]?.[loc]
                            const ron = cellData?.ron || 0
                            monthTotal += ron
                            return (
                              <td 
                                key={loc}
                                className="px-3 py-2 text-right text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700"
                              >
                                {ron > 0 ? (
                                  <span className="font-medium">
                                    {ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">—</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                            {monthTotal.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 dark:bg-slate-900 font-bold">
                      <td className="px-4 py-3 text-white border-t border-r border-slate-600">
                        TOTAL LOCAȚIE
                      </td>
                      {matrixData.sortedLocations.map(loc => {
                        let locTotal = 0
                        matrixData.sortedMonths.forEach(monthKey => {
                          if (matrixData.matrix[monthKey]?.[loc]) {
                            locTotal += matrixData.matrix[monthKey][loc].ron
                          }
                        })
                        return (
                          <td 
                            key={loc}
                            className="px-3 py-2 text-right text-white border-t border-r border-slate-600"
                          >
                            {locTotal.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-right text-lg text-white border-t border-slate-600">
                        {grandTotalSum.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Main Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-emerald-600 rounded-full"></div>
            <span className="ml-3 text-slate-500">Se încarcă datele...</span>
          </div>
        ) : matrixData.sortedMonths.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 text-lg">Nu există date pentru perioada selectată.</p>
            <p className="text-slate-400 text-sm mt-2">Modifică perioada sau importă facturi noi.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {/* Header Row 1: Location names */}
                  <tr className="bg-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3 text-left font-bold text-white border-b border-r border-slate-600 min-w-[140px]">
                      LUNĂ
                    </th>
                    {matrixData.sortedLocations.map(loc => (
                      <th 
                        key={loc} 
                        colSpan={2}
                        className="px-4 py-3 text-center font-bold text-white border-b border-r border-slate-600"
                      >
                        {loc}
                      </th>
                    ))}
                    <th 
                      colSpan={2}
                      className="px-4 py-3 text-center font-bold text-white border-b border-slate-600"
                    >
                      TOTAL LUNĂ
                    </th>
                  </tr>
                  {/* Header Row 2: lei / kWh labels */}
                  <tr className="bg-slate-700 dark:bg-slate-800">
                    <th className="px-4 py-2 text-left text-xs text-slate-300 border-b border-r border-slate-600"></th>
                    {matrixData.sortedLocations.map(loc => (
                      <React.Fragment key={loc}>
                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-slate-600">
                          lei
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-r border-slate-600">
                          kWh
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-slate-600">
                      lei
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-300 border-b border-slate-600">
                      kWh
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {matrixData.sortedMonths.map((monthKey, idx) => (
                    <tr 
                      key={monthKey} 
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td 
                        className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => navigate(`/expenditures/electric/${monthKey}`)}
                        title="Click pentru detalii lună"
                      >
                        {formatMonthKey(monthKey)}
                      </td>
                      {matrixData.sortedLocations.map(loc => {
                        const cellData = matrixData.matrix[monthKey]?.[loc]
                        const ronPerSlot = cellData?.slots > 0 ? cellData.ron / cellData.slots : null
                        const kwhPerSlot = cellData?.slots > 0 ? cellData.kwh / cellData.slots : null
                        return (
                          <React.Fragment key={loc}>
                            <td className="px-3 py-2 text-right text-slate-800 dark:text-slate-200">
                              {cellData ? (
                                <div>
                                  <span className="font-medium">
                                    {cellData.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                  {ronPerSlot && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {ronPerSlot.toFixed(2)}/slot
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {cellData ? (
                                <div>
                                  <span>{cellData.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}</span>
                                  {kwhPerSlot && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {kwhPerSlot.toFixed(1)}/slot
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                        <div>
                          {monthTotals[monthKey]?.ron.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          {monthTotals[monthKey]?.slots > 0 && (
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              {(monthTotals[monthKey].ron / monthTotals[monthKey].slots).toFixed(2)}/slot
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300">
                        <div>
                          {monthTotals[monthKey]?.kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                          {monthTotals[monthKey]?.slots > 0 && (
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              {(monthTotals[monthKey].kwh / monthTotals[monthKey].slots).toFixed(1)}/slot
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 dark:bg-slate-900 font-bold">
                    <td className="px-4 py-3 text-white border-t border-r border-slate-600">
                      TOTAL SALĂ
                    </td>
                    {matrixData.sortedLocations.map(loc => {
                      // Afișează doar media pe slot, nu suma
                      return (
                        <React.Fragment key={loc}>
                          <td className="px-3 py-2 text-right text-white border-t border-slate-600">
                            <div>
                              {locationTotals[loc]?.ron > 0 ? (
                                <div className="text-xs font-medium text-slate-300">
                                  {locationTotals[loc].ron.toFixed(2)}/slot
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300 border-t border-r border-slate-600">
                            <div>
                              {locationTotals[loc]?.kwh > 0 ? (
                                <div className="text-xs font-medium text-slate-300">
                                  {locationTotals[loc].kwh.toFixed(1)}/slot
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                        </React.Fragment>
                      )
                    })}
                    <td className="px-3 py-2 text-right text-lg text-white border-t border-slate-600">
                      <div>
                        {grandTotal.ron > 0 ? (
                          <div className="text-sm font-medium text-slate-300">
                            {grandTotal.ron.toFixed(2)}/slot
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-lg text-slate-300 border-t border-slate-600">
                      <div>
                        {grandTotal.kwh > 0 ? (
                          <div className="text-sm font-medium text-slate-300">
                            {grandTotal.kwh.toFixed(1)}/slot
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tabel Facturi Salvate - sub tabelul principal */}
        {uniqueInvoices.invoices.length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📄</span> Facturi Salvate în Centralizator
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                  {uniqueInvoices.invoices.length} {uniqueInvoices.invoices.length === 1 ? 'factură' : 'facturi'}
                </span>
                {selectedInvoices.size > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-xs rounded-full">
                    {selectedInvoices.size} selectat{selectedInvoices.size === 1 ? 'ă' : 'e'}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setCheckingDuplicates(true)
                    try {
                      const response = await axios.get('/api/expenditures/find-duplicate-invoices')
                      if (response.data?.success) {
                        setDuplicateResults(response.data)
                        setShowDuplicateModal(true)
                        toast.success(`Găsite ${response.data.summary.total_duplicates} duplicate și ${response.data.summary.total_suspicious} suspecte`)
                      } else {
                        toast.error(response.data?.error || 'Eroare la verificare')
                      }
                    } catch (error) {
                      console.error('Error checking duplicates:', error)
                      toast.error(error.response?.data?.error || 'Eroare la verificare duplicate')
                    } finally {
                      setCheckingDuplicates(false)
                    }
                  }}
                  disabled={checkingDuplicates}
                  className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg transition-colors flex items-center gap-1"
                  title="Verifică duplicate în centralizator"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingDuplicates ? 'animate-spin' : ''}`} />
                  <span>Verifică Duplicate</span>
                </button>
                <button
                  onClick={() => setShowVerifyModal(true)}
                  className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1"
                  title="Verifică facturi cu lista ta"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Verifică Facturi</span>
                </button>
                {selectedInvoices.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 className={`w-4 h-4 ${deleting ? 'animate-spin' : ''}`} />
                    <span>Șterge {selectedInvoices.size} factură{selectedInvoices.size === 1 ? '' : 'i'}</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/expenditures/settings?tab=electric')}
                  className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  <span>Adaugă Factură</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-indigo-600 dark:bg-indigo-800">
                    <th className="px-3 py-3 text-center font-semibold text-white text-sm w-16">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size > 0 && selectedInvoices.size === uniqueInvoices.invoices.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                        title="Selectează/Deselectează toate"
                      />
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-white text-sm w-16">
                      <span title="În Cheltuieli">💰</span>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Nr. Factură</th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Perioadă Consum</th>
                    <th className="px-4 py-3 text-right font-semibold text-white text-sm">Cost Centralizator</th>
                    <th className="px-4 py-3 text-right font-semibold text-white text-sm">Cost Cheltuieli</th>
                    <th className="px-4 py-3 text-right font-semibold text-white text-sm">Consum kWh</th>
                    <th className="px-4 py-3 text-center font-semibold text-white text-sm">NLC-uri</th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Coduri NLC</th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Coduri Contor</th>
                    <th className="px-4 py-3 text-left font-semibold text-white text-sm">Locații</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueInvoices.invoices.map((inv, idx) => {
                    const amountMatch = inv.inExpenditures && Math.abs(inv.totalRon - inv.expendituresAmount) < 1
                    const isSelected = selectedInvoices.has(inv.number)
                    return (
                      <tr 
                        key={inv.number}
                        className={`border-b border-slate-200 dark:border-slate-700 ${
                          idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'
                        } ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''} hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleInvoiceSelect(inv.number)}
                            className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                            title="Selectează factura"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {inv.inExpenditures ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 text-sm">
                          <div className="flex items-center gap-2">
                            {inv.hasDuplicates && (
                              <span 
                                className="text-orange-500 dark:text-orange-400 text-xs" 
                                title={`⚠️ ${inv.duplicateCount} duplicate detectate`}
                              >
                                ⚠️
                              </span>
                            )}
                            <span>{inv.number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                          {inv.period}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {inv.hasDuplicates && (
                              <span 
                                className="text-orange-500 dark:text-orange-400" 
                                title={`⚠️ ${inv.duplicateCount} duplicate detectate - suma poate fi incorectă`}
                              >
                                ⚠️
                              </span>
                            )}
                            <span className={inv.hasDuplicates ? 'text-orange-600 dark:text-orange-400' : ''}>
                              {inv.totalRon.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold text-sm ${
                          inv.inExpenditures 
                            ? amountMatch 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400'
                        }`}>
                          {inv.inExpenditures 
                            ? `${inv.expendituresAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
                            : '—'
                          }
                          {inv.inExpenditures && !amountMatch && (
                            <div className="text-xs text-amber-500">
                              Δ {Math.abs(inv.totalRon - inv.expendituresAmount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 text-sm">
                          {inv.totalKwh.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} kWh
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 text-sm">
                          {inv.nlcCount}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {inv.nlcCodes && inv.nlcCodes.length > 0 ? (
                              inv.nlcCodes.map(nlc => (
                                <span 
                                  key={nlc}
                                  onClick={() => {
                                    if (nlcFilter === nlc) {
                                      setNlcFilter('all')
                                    } else {
                                      setNlcFilter(nlc)
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                                    nlcFilter === nlc
                                      ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white'
                                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                                  }`}
                                  title={nlcFilter === nlc ? `Click pentru a elimina filtrul NLC ${nlc}` : `Click pentru a filtra după NLC ${nlc}`}
                                >
                                  {nlc}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {inv.contorCodes && inv.contorCodes.length > 0 ? (
                              inv.contorCodes.map(contor => (
                                <span 
                                  key={contor}
                                  className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-mono"
                                  title={`Cod contor: ${contor}`}
                                >
                                  {contor}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {inv.locations.map(loc => (
                              <span 
                                key={loc}
                                className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs"
                              >
                                {loc}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-100 dark:bg-indigo-900/40 font-semibold">
                    <td className="px-3 py-3 text-center text-sm"></td>
                    <td className="px-3 py-3 text-center text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {uniqueInvoices.inExpendituresCount}/{uniqueInvoices.invoices.length}
                      </span>
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-slate-800 dark:text-slate-200 text-sm">
                      TOTAL ({uniqueInvoices.invoices.length} facturi)
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300 text-sm">
                      {uniqueInvoices.invoices.reduce((s, i) => s + i.totalRon, 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300 text-sm">
                      {uniqueInvoices.invoices.reduce((s, i) => s + (i.expendituresAmount || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-300 text-sm">
                      {uniqueInvoices.invoices.reduce((s, i) => s + i.totalKwh, 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} kWh
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 text-sm">
                      {uniqueInvoices.totalUniqueNlcs} unice
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                      —
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                      —
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                      {matrixData.sortedLocations.length} locații
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          {filteredData.length} înregistrări în perioada selectată
        </div>

        {/* Modal Verificare Facturi */}
        {showVerifyModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-6 h-6 text-emerald-600" />
                  Verificare Facturi
                </h2>
                <button
                  onClick={() => {
                    setShowVerifyModal(false)
                    setVerifyText('')
                    setVerifyResults(null)
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!verifyResults ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Lipește lista de facturi (format: Cod, Data, Factura, Suma, Status)
                      </label>
                      <textarea
                        value={verifyText}
                        onChange={(e) => setVerifyText(e.target.value)}
                        placeholder={`Exemplu:\n005005246202	22 IUN	EFI2524828318	6897.01	Plătită\n005005246202	5 IUN	EFI2522625538	59091.94	Plătită`}
                        className="w-full h-64 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!verifyText.trim()) {
                          toast.error('Introdu lista de facturi')
                          return
                        }

                        setVerifying(true)
                        try {
                          // Parsează textul - suportă atât tab-separated cât și space-separated
                          const lines = verifyText.trim().split('\n').filter(l => l.trim())
                          const invoices = []
                          
                          for (const line of lines) {
                            // Încearcă mai întâi să parseze ca tab-separated
                            let parts = line.split('\t').filter(p => p.trim())
                            
                            // Dacă nu are tab-uri, încearcă space-separated (multiple spații)
                            if (parts.length < 3) {
                              parts = line.split(/\s{2,}/).filter(p => p.trim())
                            }
                            
                            // Dacă încă nu are suficiente părți, încearcă split pe orice whitespace
                            if (parts.length < 3) {
                              parts = line.split(/\s+/).filter(p => p.trim())
                            }
                            
                            // Format: Cod Data Factura Suma Status
                            // Sau: Cod	Data	Factura	Suma	Status (tab-separated)
                            if (parts.length >= 4) {
                              const cod = parts[0]?.trim() || ''
                              const data = parts[1]?.trim() || ''
                              const factura = parts[2]?.trim() || ''
                              // Suma poate fi în parts[3] sau parts[4] dacă există spații suplimentare
                              const sumaStr = parts[3]?.trim() || parts[4]?.trim() || '0'
                              const suma = parseFloat(sumaStr.replace(/[,\.]/g, m => m === ',' ? '.' : '.')) || 0
                              const status = parts.slice(4).join(' ').trim() || parts[3]?.trim() || ''
                              
                              // Verifică dacă factura are format valid (conține EFI sau este un număr)
                              if (factura && (factura.includes('EFI') || factura.match(/^\d+$/))) {
                                invoices.push({
                                  cod,
                                  data,
                                  factura,
                                  suma,
                                  status
                                })
                              }
                            }
                          }

                          if (invoices.length === 0) {
                            toast.error('Nu s-au găsit facturi valide în text. Verifică formatul (Cod, Data, Factura, Suma, Status)')
                            setVerifying(false)
                            return
                          }

                          console.log('📋 Facturi parseate:', invoices)

                          const response = await axios.post('/api/expenditures/verify-electric-invoices', {
                            invoices
                          })

                          if (response.data?.success) {
                            setVerifyResults(response.data.results)
                            toast.success(response.data.message)
                          } else {
                            toast.error(response.data?.error || 'Eroare la verificare')
                          }
                        } catch (error) {
                          console.error('Error verifying invoices:', error)
                          const errorMsg = error.response?.data?.error || error.message || 'Eroare la verificare'
                          toast.error(errorMsg)
                        } finally {
                          setVerifying(false)
                        }
                      }}
                      disabled={verifying || !verifyText.trim()}
                      className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      {verifying ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Se verifică...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-5 h-5" />
                          <span>Verifică Facturi</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {verifyResults.summary.found}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Găsite</div>
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {verifyResults.summary.foundWithDifferentAmount}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Cu Diferențe</div>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {verifyResults.summary.notFound}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Lipsă</div>
                      </div>
                    </div>

                    {/* Results */}
                    {verifyResults.found.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                          ✅ Facturi Găsite ({verifyResults.found.length})
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-emerald-200 dark:border-emerald-800 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-emerald-50 dark:bg-emerald-900/20">
                              <tr>
                                <th className="px-3 py-2 text-left">Factură</th>
                                <th className="px-3 py-2 text-right">Suma Așteptată</th>
                                <th className="px-3 py-2 text-right">Suma Sistem</th>
                                <th className="px-3 py-2 text-center">NLC-uri</th>
                              </tr>
                            </thead>
                            <tbody>
                              {verifyResults.found.map((inv, idx) => (
                                <tr key={idx} className="border-b border-emerald-100 dark:border-emerald-900/10">
                                  <td className="px-3 py-2 font-medium">{inv.invoiceNumber}</td>
                                  <td className="px-3 py-2 text-right">{inv.expectedAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                                  <td className="px-3 py-2 text-right">{inv.dbAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                                  <td className="px-3 py-2 text-center">{inv.nlcCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {verifyResults.foundWithDifferentAmount.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-2">
                          ⚠️ Facturi cu Diferențe ({verifyResults.foundWithDifferentAmount.length})
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-amber-200 dark:border-amber-800 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-amber-50 dark:bg-amber-900/20">
                              <tr>
                                <th className="px-3 py-2 text-left">Factură</th>
                                <th className="px-3 py-2 text-right">Suma Așteptată</th>
                                <th className="px-3 py-2 text-right">Suma Sistem</th>
                                <th className="px-3 py-2 text-right">Diferență</th>
                                <th className="px-3 py-2 text-center">NLC-uri</th>
                              </tr>
                            </thead>
                            <tbody>
                              {verifyResults.foundWithDifferentAmount.map((inv, idx) => (
                                <tr key={idx} className="border-b border-amber-100 dark:border-amber-900/10">
                                  <td className="px-3 py-2 font-medium">{inv.invoiceNumber}</td>
                                  <td className="px-3 py-2 text-right">{inv.expectedAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                                  <td className="px-3 py-2 text-right">{inv.dbAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                                  <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400 font-semibold">
                                    {inv.difference > 0 ? '+' : ''}{inv.difference.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON ({inv.differencePercent}%)
                                  </td>
                                  <td className="px-3 py-2 text-center">{inv.nlcCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {verifyResults.notFound.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                          ❌ Facturi Lipsă ({verifyResults.notFound.length})
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-red-50 dark:bg-red-900/20">
                              <tr>
                                <th className="px-3 py-2 text-left">Factură</th>
                                <th className="px-3 py-2 text-right">Suma Așteptată</th>
                                <th className="px-3 py-2 text-left">Motiv</th>
                              </tr>
                            </thead>
                            <tbody>
                              {verifyResults.notFound.map((inv, idx) => (
                                <tr key={idx} className="border-b border-red-100 dark:border-red-900/10">
                                  <td className="px-3 py-2 font-medium">{inv.invoiceNumber || inv.factura || 'N/A'}</td>
                                  <td className="px-3 py-2 text-right">{inv.expectedAmount?.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) || 'N/A'} RON</td>
                                  <td className="px-3 py-2 text-red-600 dark:text-red-400">{inv.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setVerifyText('')
                        setVerifyResults(null)
                      }}
                      className="w-full px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
                    >
                      Verifică Altă Listă
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal pentru Duplicate */}
        {showDuplicateModal && duplicateResults && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  🔍 Facturi Duplicate și Suspecte
                </h2>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setDuplicateResults(null)
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {duplicateResults.summary.total_duplicates}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Duplicate</div>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {duplicateResults.summary.total_suspicious}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Suspecte</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {duplicateResults.summary.total_checked}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Verificate</div>
                  </div>
                </div>

                {/* Duplicate List */}
                {duplicateResults.duplicates.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
                      🔴 Facturi Duplicate ({duplicateResults.duplicates.length})
                    </h3>
                    <div className="space-y-4">
                      {duplicateResults.duplicates.map((dup, idx) => (
                        <div key={idx} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            {dup.numar_factura}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Înregistrări:</span>
                              <span className="ml-2 font-semibold">{dup.record_count}</span>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Total:</span>
                              <span className="ml-2 font-semibold">{dup.total_suma.toFixed(2)} RON</span>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Min:</span>
                              <span className="ml-2">{dup.min_suma.toFixed(2)} RON</span>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Max:</span>
                              <span className="ml-2">{dup.max_suma.toFixed(2)} RON</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            NLC-uri: {dup.nlc_codes} | Locații: {dup.locations}
                          </div>
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                            IDs: {dup.ids.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suspicious List */}
                {duplicateResults.suspicious.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-3">
                      ⚠️ Facturi Suspecte ({duplicateResults.suspicious.length})
                    </h3>
                    <div className="space-y-4">
                      {duplicateResults.suspicious.map((susp, idx) => (
                        <div key={idx} className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            {susp.numar_factura}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Înregistrări:</span>
                              <span className="ml-2 font-semibold">{susp.record_count}</span>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Total:</span>
                              <span className="ml-2 font-semibold">{susp.total_suma.toFixed(2)} RON</span>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Diferență:</span>
                              <span className="ml-2">{susp.suma_difference.toFixed(2)} RON</span>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">Consum:</span>
                              <span className="ml-2">{susp.total_consum.toFixed(0)} kWh</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            NLC-uri: {susp.nlc_codes} | Locații: {susp.locations}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {duplicateResults.duplicates.length === 0 && duplicateResults.suspicious.length === 0 && (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    ✅ Nu s-au găsit duplicate sau facturi suspecte!
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false)
                    setDuplicateResults(null)
                  }}
                  className="w-full px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ExpendituresElectric
