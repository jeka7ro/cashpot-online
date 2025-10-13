import React from 'react'
import { 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Building2,
  Users,
  Gamepad2,
  Trophy,
  Clock,
  MapPin,
  Settings,
  Package,
  BarChart3
} from 'lucide-react'
import { useData } from '../contexts/DataContext'

const RecentActivity = () => {
  const { companies, locations, providers, cabinets, slots, warehouse, metrology, jackpots, invoices, onjnReports, legalDocuments } = useData()

  // Generate recent activity from real data
  const generateActivities = () => {
    const activities = []
    
    // Recent companies
    companies.slice(0, 2).forEach(company => {
      activities.push({
        id: `company-${company.id}`,
        type: 'create',
        entity: 'Companie',
        name: company.name,
        user: company.created_by || 'Admin',
        time: formatTimeAgo(company.created_at),
        icon: Building2,
        color: 'blue'
      })
    })
    
    // Recent locations
    locations.slice(0, 2).forEach(location => {
      activities.push({
        id: `location-${location.id}`,
        type: 'create',
        entity: 'Locație',
        name: location.name,
        user: location.created_by || 'Admin',
        time: formatTimeAgo(location.created_at),
        icon: MapPin,
        color: 'green'
      })
    })
    
    // Recent providers
    providers.slice(0, 1).forEach(provider => {
      activities.push({
        id: `provider-${provider.id}`,
        type: 'update',
        entity: 'Furnizor',
        name: provider.name,
        user: provider.updated_by || 'Admin',
        time: formatTimeAgo(provider.updated_at || provider.created_at),
        icon: Users,
        color: 'purple'
      })
    })
    
    // Recent legal documents (instead of contracts)
    legalDocuments.slice(0, 2).forEach(doc => {
      activities.push({
        id: `legal-${doc.id}`,
        type: 'create',
        entity: 'Document Legal',
        name: doc.name,
        user: doc.created_by || 'Admin',
        time: formatTimeAgo(doc.created_at),
        icon: FileText,
        color: 'orange'
      })
    })
    
    // Recent slots
    slots.slice(0, 1).forEach(slot => {
      activities.push({
        id: `slot-${slot.id}`,
        type: 'create',
        entity: 'Slot',
        name: slot.name || slot.serial_number,
        user: slot.created_by || 'Admin',
        time: formatTimeAgo(slot.created_at),
        icon: BarChart3,
        color: 'emerald'
      })
    })
    
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6)
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Acum câteva minute'
    
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Acum câteva secunde'
    if (diffInMinutes < 60) return `Acum ${diffInMinutes} minute`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Acum ${diffInHours} ore`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Acum ${diffInDays} zile`
    
    return date.toLocaleDateString('ro-RO')
  }

  const activities = generateActivities()

  const getActionIcon = (type) => {
    switch (type) {
      case 'create':
        return Plus
      case 'update':
        return Edit
      case 'delete':
        return Trash2
      case 'report':
        return FileText
      case 'jackpot':
        return Trophy
      default:
        return Activity
    }
  }

  const getActionText = (type) => {
    switch (type) {
      case 'create':
        return 'Creat'
      case 'update':
        return 'Actualizat'
      case 'delete':
        return 'Șters'
      case 'report':
        return 'Generat'
      case 'jackpot':
        return 'Câștigat'
      default:
        return 'Modificat'
    }
  }

  const getActionColor = (type) => {
    switch (type) {
      case 'create':
        return 'text-green-600 bg-green-100'
      case 'update':
        return 'text-blue-600 bg-blue-100'
      case 'delete':
        return 'text-red-600 bg-red-100'
      case 'report':
        return 'text-orange-600 bg-orange-100'
      case 'jackpot':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-slate-600 bg-slate-100'
    }
  }

  const colorClasses = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-violet-500',
    orange: 'from-orange-500 to-amber-500',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-pink-500'
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Activitate Recentă</h3>
        <Activity className="w-6 h-6 text-blue-500 dark:text-blue-400" />
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const ActionIcon = getActionIcon(activity.type)
          const EntityIcon = activity.icon
          
          return (
            <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-2xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 group">
              <div className="relative">
                <div className={`p-3 rounded-2xl bg-gradient-to-r ${colorClasses[activity.color]} shadow-lg`}>
                  <EntityIcon className="w-5 h-5 text-white" />
                </div>
                <div className={`absolute -top-1 -right-1 p-1 rounded-full ${getActionColor(activity.type)}`}>
                  <ActionIcon className="w-3 h-3" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {activity.name}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getActionColor(activity.type)}`}>
                    {getActionText(activity.type)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>{activity.entity}</span>
                  <span>•</span>
                  <span>de {activity.user}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button className="w-full py-3 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
          Vezi toată activitatea →
        </button>
      </div>
    </div>
  )
}

export default RecentActivity
