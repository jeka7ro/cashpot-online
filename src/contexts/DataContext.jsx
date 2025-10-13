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

  // Fetch all data with batching
  const fetchAllData = async () => {
    console.log('🔄 Starting to fetch all data...')
    setLoading(true)
    try {
      const entities = Object.keys(entityConfig)
      
      // Batch requests in groups of 3 to avoid overwhelming the server
      const batchSize = 3
      const batches = []
      
      for (let i = 0; i < entities.length; i += batchSize) {
        batches.push(entities.slice(i, i + batchSize))
      }
      
      for (const batch of batches) {
        console.log(`🔄 Fetching batch: ${batch.join(', ')}`)
        const requests = batch.map(entity => 
          axios.get(`/api/${entity}`, { timeout: 10000 }).catch((error) => {
            console.error(`❌ Error fetching ${entity}:`, error)
            return { data: [] }
          })
        )
        
        const responses = await Promise.all(requests)
        
        responses.forEach((response, index) => {
          const entity = batch[index]
          const data = Array.isArray(response.data) ? response.data : []
          console.log(`✅ ${entity}: ${data.length} items`)
          entityConfig[entity].setState(data)
        })
        
        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      console.log('✅ Data fetching completed')
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 DataContext useEffect triggered')
    fetchAllData()
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

  // Export data
  const exportData = (entity) => {
    const data = entityConfig[entity].state
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entity}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    toast.success('Exportat cu succes!')
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
    refreshData: fetchAllData
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export default DataContext
