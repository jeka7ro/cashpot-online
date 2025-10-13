import React, { useState, useEffect } from 'react'
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Cloud, 
  HardDrive,
  Clock,
  Server
} from 'lucide-react'

const DatabaseBackup = ({ compact = false }) => {
  const [backupStatus, setBackupStatus] = useState(null)
  const [backupStats, setBackupStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadBackupInfo()
  }, [])

  const loadBackupInfo = async () => {
    setLoading(true)
    try {
      // Load backup status
      const statusResponse = await fetch('/api/backup/status')
      const statusData = await statusResponse.json()
      if (statusData.success) {
        setBackupStatus(statusData.data)
      }

      // Load backup statistics
      const statsResponse = await fetch('/api/backup/stats')
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setBackupStats(statsData.data)
      }
    } catch (error) {
      console.error('Error loading backup info:', error)
      setMessage({ type: 'error', text: 'Eroare la încărcarea informațiilor despre backup' })
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    setCreating(true)
    setMessage({ type: '', text: '' })
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Backup creat cu succes!' })
        loadBackupInfo()
      } else {
        setMessage({ type: 'error', text: data.message || 'Eroare la crearea backup-ului' })
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      setMessage({ type: 'error', text: 'Eroare la crearea backup-ului' })
    } finally {
      setCreating(false)
    }
  }

  const downloadBackup = async () => {
    try {
      const response = await fetch('/api/backup/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cashpot_backup_${new Date().toISOString().split('T')[0]}.sql`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setMessage({ type: 'success', text: 'Backup descărcat cu succes!' })
    } catch (error) {
      console.error('Error downloading backup:', error)
      setMessage({ type: 'error', text: 'Eroare la descărcarea backup-ului' })
    }
  }

  if (loading && !backupStatus) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-spin" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">Se încarcă informațiile...</span>
        </div>
      </div>
    )
  }

  if (compact) {
    // Compact view for dashboard
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Backup Bază de Date</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {backupStats?.totalRecords || 0} înregistrări • {backupStats?.databaseSize || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={loadBackupInfo}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center space-x-2">
              {backupStatus?.s3Enabled ? (
                <Cloud className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Stocare</span>
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">{backupStatus?.storageLocation || 'Local'}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto Backup</span>
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {backupStatus?.autoBackupEnabled ? `La ${backupStatus?.backupIntervalHours}h` : 'Dezactivat'}
            </span>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={createBackup}
            disabled={creating}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Creare...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-sm">Creează Backup</span>
              </>
            )}
          </button>
          <button
            onClick={downloadBackup}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Descarcă</span>
          </button>
        </div>
      </div>
    )
  }

  // Full view for settings
  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Backup Bază de Date</h2>
            <p className="text-slate-600">Gestionează backup-urile bazei de date și exportă datele</p>
          </div>
          <button
            onClick={loadBackupInfo}
            className="p-3 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center space-x-3 mb-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Înregistrări</p>
                <p className="text-2xl font-bold text-blue-800">{backupStats?.totalRecords || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center space-x-3 mb-3">
              <Server className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Dimensiune BD</p>
                <p className="text-2xl font-bold text-green-800">{backupStats?.databaseSize || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center space-x-3 mb-3">
              {backupStatus?.s3Enabled ? (
                <Cloud className="w-8 h-8 text-purple-600" />
              ) : (
                <HardDrive className="w-8 h-8 text-purple-600" />
              )}
              <div>
                <p className="text-sm text-purple-600 font-medium">Stocare</p>
                <p className="text-lg font-bold text-purple-800">{backupStatus?.storageLocation || 'Local'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Info */}
        <div className="p-6 bg-slate-50 rounded-xl mb-8">
          <h3 className="font-bold text-slate-800 mb-4">Configurare Backup</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Auto Backup:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                backupStatus?.autoBackupEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {backupStatus?.autoBackupEnabled ? 'Activ' : 'Inactiv'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Interval Backup:</span>
              <span className="font-medium text-slate-800">{backupStatus?.backupIntervalHours || 6} ore</span>
            </div>
            {backupStatus?.s3Enabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">S3 Bucket:</span>
                  <span className="font-medium text-slate-800">{backupStatus?.bucketName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Regiune:</span>
                  <span className="font-medium text-slate-800">{backupStatus?.region}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={createBackup}
            disabled={creating}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Se creează backup...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Creează Backup Manual</span>
              </>
            )}
          </button>
          <button
            onClick={downloadBackup}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Descarcă Backup SQL</span>
          </button>
        </div>
      </div>

      {/* Table Statistics */}
      {backupStats?.tableStats && (
        <div className="card p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Statistici pe Tabele</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(backupStats.tableStats).map(([table, count]) => (
              <div key={table} className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 capitalize">{table.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-slate-800">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatabaseBackup

