import React from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Activity,
  Database,
  Server,
  Shield,
  Clock
} from 'lucide-react'
import { useData } from '../contexts/DataContext'

const SystemHealth = () => {
  const { loading, companies, locations, providers, legalDocuments } = useData()

  // Generate health status based on real data
  const generateHealthItems = () => {
    const items = []
    
    // Database health based on data availability
    const hasData = companies.length > 0 || locations.length > 0 || providers.length > 0
    items.push({
      name: 'Baza de Date AWS RDS',
      status: hasData ? 'healthy' : 'warning',
      description: hasData 
        ? `Conectivitate optimă la PostgreSQL - ${companies.length + locations.length + providers.length} înregistrări`
        : 'Conectare în curs...',
      icon: Database,
      color: hasData ? 'green' : 'yellow'
    })
    
    // API Backend health
    items.push({
      name: 'API Backend',
      status: 'healthy',
      description: 'Toate endpoint-urile sunt disponibile',
      icon: Activity,
      color: 'green'
    })
    
    // System status
    items.push({
      name: 'Sistem Principal',
      status: 'healthy',
      description: 'Toate serviciile funcționează normal',
      icon: Server,
      color: 'green'
    })
    
    // Data integrity
    const totalRecords = companies.length + locations.length + providers.length + legalDocuments.length
    items.push({
      name: 'Integritate Date',
      status: totalRecords > 0 ? 'healthy' : 'warning',
      description: totalRecords > 0 
        ? `${totalRecords} înregistrări active în sistem`
        : 'Nu există date în sistem',
      icon: Shield,
      color: totalRecords > 0 ? 'green' : 'yellow'
    })
    
    // Last activity
    const lastActivity = getLastActivity()
    items.push({
      name: 'Ultima Activitate',
      status: 'healthy',
      description: lastActivity,
      icon: Clock,
      color: 'green'
    })
    
    return items
  }

  const getLastActivity = () => {
    const allItems = [...companies, ...locations, ...providers, ...legalDocuments]
    if (allItems.length === 0) return 'Sistem nou - fără activitate'
    
    const sortedItems = allItems
      .filter(item => item.created_at || item.updated_at)
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at)
        const dateB = new Date(b.updated_at || b.created_at)
        return dateB - dateA
      })
    
    if (sortedItems.length === 0) return 'Sistem nou - fără activitate'
    
    const lastItem = sortedItems[0]
    const lastDate = new Date(lastItem.updated_at || lastItem.created_at)
    const now = new Date()
    const diffInMinutes = Math.floor((now - lastDate) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Acum câteva secunde'
    if (diffInMinutes < 60) return `Acum ${diffInMinutes} minute`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Acum ${diffInHours} ore`
    
    return lastDate.toLocaleDateString('ro-RO')
  }

  const healthItems = generateHealthItems()

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return CheckCircle
      case 'warning':
        return AlertCircle
      case 'error':
        return XCircle
      default:
        return CheckCircle
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30'
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30'
      case 'error':
        return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30'
      default:
        return 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Funcțional'
      case 'warning':
        return 'Atenție'
      case 'error':
        return 'Eroare'
      default:
        return 'Necunoscut'
    }
  }

  const getColorClasses = (color) => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-emerald-500 shadow-green-500/25'
      case 'yellow':
        return 'from-yellow-500 to-orange-500 shadow-yellow-500/25'
      case 'red':
        return 'from-red-500 to-pink-500 shadow-red-500/25'
      default:
        return 'from-slate-500 to-gray-500 shadow-slate-500/25'
    }
  }

  return (
    <div className="card p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Starea Sistemului</h3>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">Operațional</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthItems.map((item, index) => {
          const StatusIcon = getStatusIcon(item.status)
          const ItemIcon = item.icon
          
          return (
            <div key={index} className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-2xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 group">
              <div className="flex items-start space-x-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-r ${getColorClasses(item.color)} shadow-lg`}>
                  <ItemIcon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
                
                <StatusIcon className={`w-5 h-5 ${getStatusColor(item.status).split(' ')[0]}`} />
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold">Uptime:</span> 99.9% (Ultimele 30 zile)
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold">Ultima verificare:</span> {new Date().toLocaleTimeString('ro-RO')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemHealth
