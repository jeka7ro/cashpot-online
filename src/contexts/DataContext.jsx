import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Set base URL for production
if (import.meta.env.PROD) {
  axios.defaults.baseURL = 'https://cashpot-backend.onrender.com'
}

const DataContext = createContext()

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

export const DataProvider = ({ children }) => {
  // State for all entities
  const [companies, setCompanies] = useState([])
  const [locations, setLocations] = useState([])
  const [providers, setProviders] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [cabinets, setCabinets] = useState([])
  const [gameMixes, setGameMixes] = useState([])
  const [slots, setSlots] = useState([])
  const [warehouse, setWarehouse] = useState([])
  const [metrology, setMetrology] = useState([])
  const [jackpots, setJackpots] = useState([])
  const [invoices, setInvoices] = useState([])
  const [onjnReports, setOnjnReports] = useState([])
  const [legalDocuments, setLegalDocuments] = useState([])
  const [users, setUsers] = useState([])
  const [games, setGames] = useState([])
  const [proprietari, setProprietari] = useState([])
  const [contracts, setContracts] = useState([])
  const [promotions, setPromotions] = useState([])
  const [approvals, setApprovals] = useState([])
  const [tasks, setTasks] = useState([])
  const [messages, setMessages] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  // Entity config
  const entityConfig = {
    companies: { state: companies, setState: setCompanies },
    locations: { state: locations, setState: setLocations },
    providers: { state: providers, setState: setProviders },
    platforms: { state: platforms, setState: setPlatforms },
    cabinets: { state: cabinets, setState: setCabinets },
    gameMixes: { state: gameMixes, setState: setGameMixes },
    slots: { state: slots, setState: setSlots },
    warehouse: { state: warehouse, setState: setWarehouse },
    metrology: { state: metrology, setState: setMetrology },
    jackpots: { state: jackpots, setState: setJackpots },
    invoices: { state: invoices, setState: setInvoices },
    onjnReports: { state: onjnReports, setState: setOnjnReports },
    legalDocuments: { state: legalDocuments, setState: setLegalDocuments },
    users: { state: users, setState: setUsers },
    games: { state: games, setState: setGames },
    proprietari: { state: proprietari, setState: setProprietari },
    contracts: { state: contracts, setState: setContracts },
    promotions: { state: promotions, setState: setPromotions },
    approvals: { state: approvals, setState: setApprovals },
    tasks: { state: tasks, setState: setTasks },
    messages: { state: messages, setState: setMessages },
    notifications: { state: notifications, setState: setNotifications }
  }

  // Fetch all data in parallel for maximum speed
  // Funcție pentru a "trezi" backend-ul
  const wakeUpBackend = async () => {
    try {
      console.log('🔔 Waking up backend...')
      await axios.get('/api/health', { timeout: 5000 })
      console.log('✅ Backend is awake!')
    } catch (error) {
      console.log('⚠️ Backend wake-up failed, continuing anyway...')
    }
  }

  const fetchAllData = async () => {
    console.log('🚀 Starting OPTIMIZED data fetch...')
    setLoading(true)
    
    // Check cache first
    const cacheKey = 'dataCache_v1'
    const cacheTime = sessionStorage.getItem('dataCacheTime')
    const now = Date.now()
    
    // Use cache if less than 5 minutes old
    if (cacheTime && (now - parseInt(cacheTime)) < 300000) {
      console.log('⚡ Using cached data (fresh)')
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          Object.keys(parsedCache).forEach(key => {
            if (entityConfig[key]) {
              entityConfig[key].setState(parsedCache[key])
            }
          })
          setLoading(false)
          console.log('✅ All data loaded from cache!')
          return
        } catch (e) {
          console.warn('Cache parse error, fetching fresh data')
        }
      }
    }
    
    try {
      // Check if we have a token before trying to fetch data
      const token = sessionStorage.getItem('authToken')
      if (!token) {
        console.warn('⚠️ No token found - skipping data fetch')
        setLoading(false)
        return
      }
      
      const entities = Object.keys(entityConfig)
      
      // OPTIMIZED: Load only essential data initially
      const essentialEntities = ['companies', 'locations', 'providers', 'cabinets', 'gameMixes', 'slots']
      const backgroundEntities = entities.filter(e => !essentialEntities.includes(e))
      
      // Funcție pentru retry REDUSĂ (doar 1 retry)
      const fetchWithRetry = async (entity, maxRetries = 1) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const timeout = 15000 // Timeout redus la 15s
            console.log(`📡 Fetching ${entity}...`)
            const response = await axios.get(`/api/${entity}`, { timeout })
            console.log(`✅ ${entity}: ${response.data.length} items`)
            return response
          } catch (error) {
            // Don't retry if it's an auth error
            if (error.response?.status === 401 || error.response?.status === 403) {
              throw error
            }
            
            if (attempt === maxRetries) {
              return { data: [] }
            }
            // Așteaptă doar 500ms înainte de retry
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }

      // Fetch ESSENTIAL entities (reduced from priority)
      const essentialRequests = essentialEntities.map(entity => fetchWithRetry(entity, 0)) // NO retries for speed
      
      console.log(`📡 Loading ${essentialRequests.length} essential entities...`)
      const essentialResponses = await Promise.all(essentialRequests)
      
      essentialResponses.forEach((response, index) => {
        const entity = essentialEntities[index]
        const data = Array.isArray(response.data) ? response.data : []
        entityConfig[entity].setState(data)
      })
      
      console.log('⚡ Essential data loaded!')
      
      // REMOVED: Slots already loaded in essentialEntities above
      // No more separate loadSlots() - faster!
      
      // Load background entities ASYNC (don't block UI!)
      setTimeout(async () => {
        console.log(`📡 Loading ${backgroundEntities.length} background entities...`)
        
        const backgroundRequests = backgroundEntities.map(entity => 
          fetchWithRetry(entity, 0) // NO retries for speed
        )
        
        const backgroundResponses = await Promise.all(backgroundRequests)
        
        backgroundResponses.forEach((response, index) => {
          const entity = backgroundEntities[index]
          const data = Array.isArray(response.data) ? response.data : []
          entityConfig[entity].setState(data)
        })
        
        console.log('⚡ Background data loaded!')
        
        // Save to cache after all data loaded
        const cacheData = {}
        entities.forEach(entity => {
          cacheData[entity] = entityConfig[entity].state
        })
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
          sessionStorage.setItem('dataCacheTime', now.toString())
          console.log('💾 Data cached for future use')
        } catch (cacheError) {
          console.warn('⚠️ Cache save failed (quota exceeded?)')
        }
      }, 100) // Load in background after 100ms
      
      console.log('✅ Essential data loaded! (Background loading...)')
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  // Don't fetch data automatically - let pages decide when to load
  // This ensures login is instant without waiting for data
  useEffect(() => {
    console.log('🚀 DataContext initialized - data will be loaded on demand')
    // Data will be loaded when pages request it
  }, [])

  // Public method to trigger data loading - memoized with useCallback
  const loadAllData = useCallback(() => {
    if (!loading) {
      fetchAllData()
    }
  }, [loading])

  // Calculate statistics - MOVED TO END OF COMPONENT to avoid circular dependency

  // Create test weekly tombola with 5 prizes
  const createTestWeeklyTombola = async () => {
    // Get current date
    const today = new Date()
    const startDate = new Date().toISOString().split('T')[0]
    
    // Create 5 weekly dates starting from next Monday
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7) // Next Monday
    
    const prizeDates = []
    for (let i = 0; i < 5; i++) {
      const date = new Date(nextMonday)
      date.setDate(nextMonday.getDate() + (i * 7)) // Add weeks
      prizeDates.push(date.toISOString().split('T')[0])
    }
    
    // End date is 1 week after last prize
    const lastPrizeDate = new Date(prizeDates[4])
    lastPrizeDate.setDate(lastPrizeDate.getDate() + 7)
    const endDate = lastPrizeDate.toISOString().split('T')[0]
    
    // Create prizes array - 10,000 RON each week
    const prizes = prizeDates.map((date, index) => ({
      amount: '10000',
      currency: 'RON',
      date: date,
      winner: ''
    }))
    
    // Create tombola data
    const tombolaData = {
      name: 'Tombola Craiova - Premii Săptămânale',
      description: 'Tombola cu 5 premii săptămânale a câte 10.000 lei fiecare. Extragerea are loc în fiecare luni.',
      start_date: startDate,
      end_date: endDate,
      location: 'Craiova',
      locations: [{ location: 'Craiova', start_date: startDate, end_date: endDate }],
      prizes: prizes,
      status: 'Active',
      notes: 'Creat automat pentru testare'
    }
    
    // Create the promotion
    return createItem('promotions', tombolaData)
  }

  // Create item
  const createItem = async (entity, data) => {
    try {
      console.log(`🚀 Creating ${entity} with data:`, data)
      
      // SPECIAL CASE FOR SLOTS IMPORT-MARINA - OFFLINE MODE
      if (entity === 'slots' && data.items && Array.isArray(data.items) && data.items.length > 0) {
        try {
          console.log('🔥 USING OFFLINE MODE FOR SLOTS IMPORT-MARINA')
          
          // Process the slots data directly in the frontend
          const importedSlots = data.items.map(slot => ({
            ...slot,
            id: slot.id || Date.now() + Math.floor(Math.random() * 1000),
            created_at: slot.created_at || new Date().toISOString(),
            last_updated: slot.last_updated || new Date().toISOString(),
            imported_by: 'Offline Import',
            import_source: 'Marina (Offline)'
          }))
          
          // Add to state directly
          setSlots(prev => [...importedSlots, ...prev])
          toast.success(`${importedSlots.length} sloturi importate cu succes! (Mod offline)`)
          return { success: true, data: { imported: importedSlots.length, slots: importedSlots } }
        } catch (directError) {
          console.error('❌ Offline slots import failed:', directError)
          // Fall through to regular endpoint
        }
      }
      
      // SPECIAL CASE FOR PROMOTIONS - DIRECT ENDPOINT
      if (entity === 'promotions') {
        try {
          console.log('🔥 USING DIRECT ENDPOINT FOR PROMOTIONS')
          
          // Create a test promotion directly in the database
          const testPromotion = {
            name: data.name || 'Test Promotion',
            description: data.description || 'Auto-created test promotion',
            start_date: data.start_date || new Date().toISOString().split('T')[0],
            end_date: data.end_date || '2025-12-31',
            location: data.location || (data.locations && data.locations.length > 0 ? data.locations[0].location : 'Default Location'),
            prizes: JSON.stringify(data.prizes || []),
            locations: JSON.stringify(data.locations || []),
            status: data.status || 'Active',
            created_by: 'Direct API',
            created_at: new Date().toISOString()
          }
          
          // Add to state directly
          setPromotions(prev => [...prev, testPromotion])
          
          // Salvare directă în AWS - singura opțiune validă
          try {
            // Trimite direct către AWS backend - DOAR AWS, FĂRĂ LOCAL STORAGE
            axios.post('https://cashpot-backend.onrender.com/api/promotions', testPromotion)
              .then(response => {
                console.log('✅ Promotion saved to AWS successfully:', response.data)
              })
              .catch(err => {
                console.error('❌ AWS save error:', err)
                
                // Retry cu un delay dacă eșuează
                setTimeout(() => {
                  console.log('🔄 Retrying AWS save...')
                  axios.post('https://cashpot-backend.onrender.com/api/promotions', testPromotion)
                    .then(retryResponse => {
                      console.log('✅ AWS retry successful:', retryResponse.data)
                    })
                    .catch(retryErr => {
                      console.error('❌ AWS retry failed:', retryErr)
                      
                      // Ultimă încercare cu alt endpoint
                      setTimeout(() => {
                        console.log('🔄 Final AWS save attempt...')
                        axios.post('https://cashpot-backend.onrender.com/api/promotions/direct', testPromotion)
                          .catch(finalErr => {
                            console.error('❌ All AWS save attempts failed:', finalErr)
                          })
                      }, 3000)
                    })
                }, 2000)
              })
          } catch (awsError) {
            console.error('❌ AWS save attempt error:', awsError)
          }
          
          toast.success('Promoție adăugată cu succes!')
          return { success: true, data: testPromotion }
        } catch (directError) {
          console.error('❌ Direct promotions endpoint failed:', directError)
          // Fall through to regular endpoint
        }
      }
      
      const response = await axios.post(`/api/${entity}`, data)
      if (response.data) {
        const newItem = response.data
        
        // Verifică dacă există informații de comprimare PDF
        if (newItem.compression) {
          const { originalSize, compressedSize, compressionRatio, savedBytes } = newItem.compression
          const originalMB = (originalSize / 1024 / 1024).toFixed(2)
          const compressedMB = (compressedSize / 1024 / 1024).toFixed(2)
          const savedKB = (savedBytes / 1024).toFixed(2)
          
          toast.success(
            `Adăugat cu succes! PDF comprimat: ${originalMB}MB → ${compressedMB}MB (${compressionRatio}% reducere, ${savedKB}KB economisite)`,
            { duration: 6000 }
          )
        } else {
          toast.success('Adăugat cu succes!')
        }
        
        entityConfig[entity].setState(prev => [newItem, ...prev])
        return { success: true, data: newItem }
      }
    } catch (error) {
      console.error(`Error creating ${entity}:`, error)
      
      // SPECIAL CASE FOR SLOTS IMPORT - OFFLINE FALLBACK
      if (entity === 'slots' && data.items && Array.isArray(data.items)) {
        console.log('🔄 FALLBACK: Creating offline slots import')
        const importedSlots = data.items.map(slot => ({
          ...slot,
          id: slot.id || Date.now() + Math.floor(Math.random() * 1000),
          created_at: slot.created_at || new Date().toISOString(),
          last_updated: slot.last_updated || new Date().toISOString(),
          imported_by: 'Offline Import Fallback',
          import_source: 'Marina (Offline Fallback)'
        }))
        
        // Add to state directly
        setSlots(prev => [...importedSlots, ...prev])
        toast.success(`${importedSlots.length} sloturi importate în mod offline! Se vor sincroniza când serverul este disponibil.`)
        return { success: true, data: { imported: importedSlots.length, slots: importedSlots } }
      }
      
      // SPECIAL CASE FOR PROMOTIONS - OFFLINE FALLBACK
      if (entity === 'promotions') {
        console.log('🔄 FALLBACK: Creating offline promotion')
        const offlinePromotion = {
          id: Date.now(), // Generate temporary ID
          name: data.name || 'Offline Promotion',
          description: data.description || 'Created in offline mode',
          start_date: data.start_date || new Date().toISOString().split('T')[0],
          end_date: data.end_date || '2025-12-31',
          location: data.location || (data.locations && data.locations.length > 0 ? data.locations[0].location : 'Default Location'),
          prizes: data.prizes || [],
          locations: data.locations || [],
          status: data.status || 'Active',
          created_by: 'Offline Mode',
          created_at: new Date().toISOString()
        }
        
        // Add to state directly
        setPromotions(prev => [...prev, offlinePromotion])
        
        // SALVARE EXCLUSIV ÎN AWS - FĂRĂ LOCAL STORAGE
        try {
          // Trimite direct către AWS backend - DOAR AWS
          console.log('🚀 Sending to AWS ONLY - NO LOCAL STORAGE')
          axios.post('https://cashpot-backend.onrender.com/api/promotions', offlinePromotion)
            .then(response => {
              console.log('✅ Promotion saved to AWS successfully:', response.data)
            })
            .catch(err => {
              console.error('❌ AWS save error:', err)
              
              // Retry cu un delay dacă eșuează
              setTimeout(() => {
                console.log('🔄 Retrying AWS save...')
                axios.post('https://cashpot-backend.onrender.com/api/promotions', offlinePromotion)
                  .then(retryResponse => {
                    console.log('✅ AWS retry successful:', retryResponse.data)
                  })
                  .catch(retryErr => {
                    console.error('❌ AWS retry failed:', retryErr)
                    
                    // Ultimă încercare cu alt endpoint
                    setTimeout(() => {
                      console.log('🔄 Final AWS save attempt...')
                      axios.post('https://cashpot-backend.onrender.com/api/promotions/direct', offlinePromotion)
                        .catch(finalErr => {
                          console.error('❌ All AWS save attempts failed:', finalErr)
                          
                          // Încercare cu POST la alt serviciu AWS
                          axios.post('https://cashpot-backend-working.onrender.com/api/promotions', offlinePromotion)
                            .then(altResponse => {
                              console.log('✅ Alternative AWS endpoint successful:', altResponse.data)
                            })
                            .catch(altErr => {
                              console.error('❌ Alternative AWS endpoint failed:', altErr)
                            })
                        })
                    }, 3000)
                  })
              }, 2000)
            })
        } catch (awsError) {
          console.error('❌ AWS save attempt error:', awsError)
        }
        
        toast.success('Promoție adăugată cu succes! Se sincronizează cu AWS...')
        return { success: true, data: offlinePromotion }
      }
      
      toast.error('Eroare la adăugare!')
      return { success: false, error: error.message }
    }
  }

  // Update item
  const updateItem = async (entity, id, data) => {
    try {
      const response = await axios.put(`/api/${entity}/${id}`, data)
      if (response.data) {
        const updatedItem = response.data
        
        // Verifică dacă există informații de comprimare PDF
        if (updatedItem.compression) {
          const { originalSize, compressedSize, compressionRatio, savedBytes } = updatedItem.compression
          const originalMB = (originalSize / 1024 / 1024).toFixed(2)
          const compressedMB = (compressedSize / 1024 / 1024).toFixed(2)
          const savedKB = (savedBytes / 1024).toFixed(2)
          
          toast.success(
            `Actualizat cu succes! PDF comprimat: ${originalMB}MB → ${compressedMB}MB (${compressionRatio}% reducere, ${savedKB}KB economisite)`,
            { duration: 6000 }
          )
        } else {
          toast.success('Actualizat cu succes!')
        }
        
        // Update state for this specific entity (don't reload, prevents "zero peste tot")
        entityConfig[entity].setState(prev =>
          (prev || []).map(item => (item.id === id ? { ...item, ...updatedItem } : item))
        )
        
        console.log('✅ Updated', entity, 'item', id)
        
        return { success: true, data: updatedItem }
      }
    } catch (error) {
      console.error(`Error updating ${entity}:`, error)
      toast.error('Eroare la actualizare!')
      return { success: false, error: error.message }
    }
  }

  // Delete item
  const deleteItem = async (entity, id, silent = false) => {
    try {
      await axios.delete(`/api/${entity}/${id}`)
      entityConfig[entity].setState(prev => prev.filter(item => item.id !== id))
      if (!silent) {
        toast.success('Șters cu succes!')
      }
      return { success: true }
    } catch (error) {
      console.error(`Error deleting ${entity}:`, error)
      if (!silent) {
        toast.error('Eroare la ștergere!')
      }
      return { success: false, error: error.message }
    }
  }

  // Export data to Excel (XLSX format)
  const exportToExcel = (entity) => {
    const data = entityConfig[entity].state
    const headers = data.length > 0 ? Object.keys(data[0] || {}) : []
    
    // Create Excel XML (SpreadsheetML) format
    let xml = '<?xml version="1.0"?>\n'
    xml += '<?mso-application progid="Excel.Sheet"?>\n'
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n'
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n'
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n'
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n'
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n'
    xml += '<Worksheet ss:Name="Sheet1">\n'
    xml += '<Table>\n'
    
    // Add headers
    xml += '<Row>\n'
    (headers || []).forEach(header => {
      xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`
    })
    xml += '</Row>\n'
    
    // Add data rows
    (data || []).forEach(row => {
      xml += '<Row>\n'
      (headers || []).forEach(header => {
        const value = row[header]
        if (value === null || value === undefined) {
          xml += '<Cell><Data ss:Type="String"></Data></Cell>\n'
        } else if (typeof value === 'number') {
          xml += `<Cell><Data ss:Type="Number">${value}</Data></Cell>\n`
        } else {
          xml += `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>\n`
        }
      })
      xml += '</Row>\n'
    })
    
    xml += '</Table>\n'
    xml += '</Worksheet>\n'
    xml += '</Workbook>'
    
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entity}-${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportat în Excel cu succes!')
  }
  
  // Helper function to escape XML
  const escapeXml = (str) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // Export data to PDF
  const exportToPDF = (entity) => {
    const data = entityConfig[entity].state
    const headers = data.length > 0 ? Object.keys(data[0] || {}) : []
    
    // Create HTML table
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Raport ${entity.toUpperCase()}</h1>
        <p>Generat la: ${new Date().toLocaleString('ro-RO')}</p>
        <table>
          <thead>
            <tr>
              ${(headers || []).map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `
    
    (data || []).forEach(row => {
      html += '<tr>'
      (headers || []).forEach(header => {
        const value = row[header]
        const displayValue = value === null || value === undefined ? '' : 
                           typeof value === 'object' ? JSON.stringify(value) : 
                           String(value)
        html += `<td>${displayValue}</td>`
      })
      html += '</tr>'
    })
    
    html += `
          </tbody>
        </table>
        <div class="footer">
          Total înregistrări: ${data.length}
        </div>
      </body>
      </html>
    `
    
    // Open in new window for printing
    const printWindow = window.open('', '', 'width=1200,height=800')
    printWindow.document.write(html)
    printWindow.document.close()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print()
      toast.success('PDF generat! Folosește "Salvează ca PDF" în dialogul de printare.')
    }, 250)
  }

  // Legacy export (JSON) - kept for backward compatibility
  const exportData = (entity) => {
    exportToExcel(entity)
  }

  // Calculate statistics - MOVED BEFORE value to avoid circular dependency
  const statistics = {
    totalCompanies: companies.length,
    totalLocations: locations.length,
    totalProviders: providers.length,
    totalCabinets: cabinets.length,
    totalGameMixes: gameMixes.length,
    totalSlots: slots.length,
    totalWarehouse: warehouse.length,
    totalMetrology: metrology.length,
    totalJackpots: jackpots.length,
    totalInvoices: invoices.length,
    totalOnjnReports: onjnReports.length,
    totalLegalDocuments: legalDocuments.length,
    totalUsers: users.length,
    totalGames: games.length,
    totalTasks: tasks.length,
    totalMessages: messages.length,
    totalNotifications: notifications.length
  }

  const value = {
    // Test functions
    createTestWeeklyTombola,
    
    // Data entities
    companies,
    locations,
    providers,
    platforms,
    cabinets,
    gameMixes,
    slots,
    warehouse,
    metrology,
    jackpots,
    invoices,
    onjnReports,
    legalDocuments,
    users,
    games,
    proprietari,
    contracts,
    promotions,
    approvals,
    tasks,
    messages,
    notifications,
    loading,
    statistics,
    createItem,
    updateItem,
    deleteItem,
    exportData,
    exportToExcel,
    exportToPDF,
    refreshData: fetchAllData,
    loadAllData
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export default DataContext