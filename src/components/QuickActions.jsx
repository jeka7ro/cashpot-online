import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Upload, 
  Download, 
  FileText, 
  Settings, 
  BarChart3,
  Building2,
  Users,
  Gamepad2
} from 'lucide-react'

const QuickActions = () => {
  const actions = [
    {
      title: 'Adaugă Companie',
      description: 'Creează o companie nouă',
      icon: Building2,
      path: '/companies',
      color: 'blue',
      action: 'add'
    },
    {
      title: 'Adaugă Furnizor',
      description: 'Creează un furnizor nou',
      icon: Users,
      path: '/providers',
      color: 'green',
      action: 'add'
    },
    {
      title: 'Adaugă Cabinet',
      description: 'Creează un cabinet nou',
      icon: Gamepad2,
      path: '/cabinets',
      color: 'purple',
      action: 'add'
    },
    {
      title: 'Generează Raport',
      description: 'Creează un raport ONJN',
      icon: FileText,
      path: '/onjn-reports',
      color: 'orange',
      action: 'report'
    },
    {
      title: 'Importă Date',
      description: 'Importă date din Excel/CSV',
      icon: Upload,
      path: '/dashboard',
      color: 'indigo',
      action: 'import'
    },
    {
      title: 'Exportă Date',
      description: 'Exportă date în Excel/CSV',
      icon: Download,
      path: '/dashboard',
      color: 'emerald',
      action: 'export'
    }
  ]

  const colorClasses = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-violet-500',
    orange: 'from-orange-500 to-amber-500',
    indigo: 'from-indigo-500 to-blue-500',
    emerald: 'from-emerald-500 to-green-500'
  }

  const shadowClasses = {
    blue: 'shadow-blue-500/25',
    green: 'shadow-green-500/25',
    purple: 'shadow-purple-500/25',
    orange: 'shadow-orange-500/25',
    indigo: 'shadow-indigo-500/25',
    emerald: 'shadow-emerald-500/25'
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Acțiuni Rapide</h3>
        <Settings className="w-6 h-6 text-slate-500 dark:text-slate-400" />
      </div>
      
      <div className="space-y-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.path}
            className="block p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-2xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 hover:shadow-lg group"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-r ${colorClasses[action.color]} shadow-lg ${shadowClasses[action.color]} group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  {action.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {action.description}
                </p>
              </div>
              <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default QuickActions
