import React, { useState, useEffect } from 'react'
import { Download, Upload, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import Layout from '../components/Layout'

const CyberImport = () => {
  const [cyberSlots, setCyberSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState({})
  const [importedCount, setImportedCount] = useState(0)

  const fetchCyberSlots = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/cyber-direct/slots')
      setCyberSlots(response.data)
      console.log('✅ Cyber slots loaded:', response.data.length)
    } catch (error) {
      console.error('❌ Error fetching Cyber slots:', error)
      toast.error('Eroare la încărcarea datelor Cyber: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const importSlot = async (slot) => {
    setImporting(prev => ({ ...prev, [slot.id]: true }))
    
    try {
      // Transform Cyber slot to CASHPOT format
      const cashpotSlot = {
        serial_number: slot.serial_number,
        provider: slot.provider || 'Unknown',
        cabinet: slot.cabinet || 'Unknown',
        game_mix: slot.game_mix || 'Unknown',
        status: slot.status === 'Active' ? 'Active' : 'Inactive',
        location: slot.location || 'Unknown',
        notes: `Imported from Cyber on ${new Date().toLocaleString()}`
      }

      const response = await axios.post('/api/slots', cashpotSlot)
      console.log('✅ Slot imported:', response.data)
      
      setImportedCount(prev => prev + 1)
      
      // Remove from Cyber list after successful import
      setCyberSlots(prev => prev.filter(s => s.id !== slot.id))
      
    } catch (error) {
      console.error('❌ Error importing slot:', error)
      toast.error(`Eroare la importul slotului ${slot.serial_number}: ${error.response?.data?.error || error.message}`)
    } finally {
      setImporting(prev => ({ ...prev, [slot.id]: false }))
    }
  }

  const importAllSlots = async () => {
    if (!confirm(`Ești sigur că vrei să imporți toate cele ${cyberSlots.length} sloturi?`)) {
      return
    }

    setLoading(true)
    let successCount = 0
    
    for (const slot of cyberSlots) {
      try {
        await importSlot(slot)
        successCount++
    } catch (error) {
        console.error('Failed to import slot:', slot.serial_number, error)
      }
    }
    
    setLoading(false)
    toast.success(`Import complet! ${successCount} sloturi importate cu succes.`)
    fetchCyberSlots() // Refresh the list
  }

  useEffect(() => {
    fetchCyberSlots()
  }, [])

  const columns = [
    {
      key: 'serial_number',
      label: 'Număr Seriale',
      sortable: true
    },
    {
      key: 'provider',
      label: 'Provider',
      sortable: true
    },
    {
      key: 'cabinet',
      label: 'Cabinet',
      sortable: true
    },
    {
      key: 'game_mix',
      label: 'Game Mix',
      sortable: true
    },
    {
      key: 'location',
      label: 'Locație',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          item.status === 'Active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Acțiuni',
      render: (item) => (
        <div className="flex space-x-2">
          <button
            onClick={() => importSlot(item)}
            disabled={importing[item.id]}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            {importing[item.id] ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Import...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </>
            )}
          </button>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Import Cyber → CASHPOT
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
              Importă sloturile din sistemul Cyber în CASHPOT
              </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={fetchCyberSlots}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {cyberSlots.length > 0 && (
              <button
                onClick={importAllSlots}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Import All ({cyberSlots.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Disponibile</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {cyberSlots.length}
                </p>
            </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-800/40 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Importate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-800/40 rounded-lg">
                <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Progres</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {cyberSlots.length > 0 ? Math.round((importedCount / (cyberSlots.length + importedCount)) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

      {/* Table */}
      <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
            <thead className="table-header bg-gradient-to-r from-blue-50/80 to-blue-100/80 dark:from-blue-900/20 dark:to-blue-800/20">
                <tr>
                <th className="text-left p-6 font-bold text-blue-800 dark:text-blue-200 text-base uppercase tracking-wider w-16">#</th>
                {columns.map((column) => (
                    <th
                      key={column.key}
                    className="text-left p-6 font-bold text-blue-800 dark:text-blue-200 text-base uppercase tracking-wider cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-700/30 transition-colors"
                    >
                    {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-slate-600 dark:text-slate-400">Se încarcă sloturile Cyber...</span>
                      </div>
                    </td>
                  </tr>
              ) : cyberSlots.length === 0 ? (
                  <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center">
                      <div className="text-slate-500 dark:text-slate-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Nu există sloturi Cyber disponibile</p>
                      <p className="text-sm">Apasă Refresh pentru a încărca datele</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                cyberSlots.map((item, idx) => (
                  <tr key={item.id} className="table-row hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="p-6 text-slate-600 dark:text-slate-400 font-semibold text-base">
                      {idx + 1}
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className="p-6 text-base font-medium text-slate-700 dark:text-slate-300">
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