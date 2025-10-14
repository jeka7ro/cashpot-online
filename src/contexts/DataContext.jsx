import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// axios.defaults.baseURL = 'http://localhost:5001' // Commented out to use Vite proxy

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
  const [loading, setLoading] = useState(false)

  // Calculate statistics
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
    totalGames: games.length
  }

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
    contracts: { state: contracts, setState: setContracts }
  }

  // Fetch all data in parallel for maximum speed
  const fetchAllData = async () => {
    console.log('🚀 Starting to fetch all data in parallel...')
    setLoading(true)
    try {
      const entities = Object.keys(entityConfig)
      
      // Priority entities - load first
      const priorityEntities = ['companies', 'locations', 'providers', 'slots']
      const regularEntities = entities.filter(e => !priorityEntities.includes(e))
      
      // Fetch priority entities first (for dashboard)
      const priorityRequests = priorityEntities.map(entity => 
        axios.get(`/api/${entity}`, { timeout: 30000 }).catch((error) => {
          console.error(`❌ Error fetching ${entity}:`, error)
          return { data: [] }
        })
      )
      
      console.log(`📡 Making ${priorityRequests.length} priority requests...`)
      const priorityResponses = await Promise.all(priorityRequests)
      
      priorityResponses.forEach((response, index) => {
        const entity = priorityEntities[index]
        const data = Array.isArray(response.data) ? response.data : []
        console.log(`✅ ${entity}: ${data.length} items`)
        entityConfig[entity].setState(data)
      })
      
      console.log('⚡ Priority data loaded!')
      
      // Fetch remaining entities in background
      const regularRequests = regularEntities.map(entity => 
        axios.get(`/api/${entity}`, { timeout: 30000 }).catch((error) => {
          console.error(`❌ Error fetching ${entity}:`, error)
          return { data: [] }
        })
      )
      
      console.log(`📡 Loading ${regularRequests.length} remaining entities in background...`)
      const regularResponses = await Promise.all(regularRequests)
      
      regularResponses.forEach((response, index) => {
        const entity = regularEntities[index]
        const data = Array.isArray(response.data) ? response.data : []
        console.log(`✅ ${entity}: ${data.length} items`)
        entityConfig[entity].setState(data)
      })
      
      console.log('⚡ All data loaded!')
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 DataContext useEffect triggered')
    // Delay data fetching to allow login to complete first
    const timer = setTimeout(() => {
      fetchAllData()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  // Create item
  const createItem = async (entity, data) => {
    try {
      const response = await axios.post(`/api/${entity}`, data)
      if (response.data) {
        const newItem = response.data
        entityConfig[entity].setState(prev => [newItem, ...prev])
        toast.success('Adăugat cu succes!')
        return { success: true, data: newItem }
      }
    } catch (error) {
      console.error(`Error creating ${entity}:`, error)
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
        entityConfig[entity].setState(prev =>
          prev.map(item => (item.id === id ? { ...item, ...updatedItem } : item))
        )
        toast.success('Actualizat cu succes!')
        return { success: true, data: updatedItem }
      }
    } catch (error) {
      console.error(`Error updating ${entity}:`, error)
      toast.error('Eroare la actualizare!')
      return { success: false, error: error.message }
    }
  }

  // Delete item
  const deleteItem = async (entity, id) => {
    try {
      await axios.delete(`/api/${entity}/${id}`)
      entityConfig[entity].setState(prev => prev.filter(item => item.id !== id))
      toast.success('Șters cu succes!')
      return { success: true }
    } catch (error) {
      console.error(`Error deleting ${entity}:`, error)
      toast.error('Eroare la ștergere!')
      return { success: false, error: error.message }
    }
  }

  // Export data to Excel
  const exportToExcel = (entity) => {
    const data = entityConfig[entity].state
    const headers = Object.keys(data[0] || {})
    
    // Create CSV content
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle null, undefined, and objects
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )
    
    const csvContent = [csvHeaders, ...csvRows].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entity}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportat în Excel cu succes!')
  }

  // Export data to PDF
  const exportToPDF = (entity) => {
    const data = entityConfig[entity].state
    const headers = Object.keys(data[0] || {})
    
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
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `
    
    data.forEach(row => {
      html += '<tr>'
      headers.forEach(header => {
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

  const value = {
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
    loading,
    statistics,
    createItem,
    updateItem,
    deleteItem,
    exportData,
    exportToExcel,
    exportToPDF,
    refreshData: fetchAllData
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export default DataContext
