import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, color, change, changeType, loading, size = 'medium' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-violet-500',
    orange: 'from-orange-500 to-amber-500',
    indigo: 'from-indigo-500 to-blue-500',
    emerald: 'from-emerald-500 to-green-500',
    slate: 'from-slate-500 to-gray-500',
    cyan: 'from-cyan-500 to-blue-500',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-pink-500',
    gray: 'from-gray-500 to-slate-500'
  }

  // Clasele pentru mărimile diferite
  const sizeClasses = {
    xs: {
      container: 'p-3',
      icon: 'w-6 h-6',
      title: 'text-xs',
      value: 'text-lg',
      change: 'text-xs'
    },
    small: {
      container: 'p-4',
      icon: 'w-8 h-8',
      title: 'text-sm',
      value: 'text-xl',
      change: 'text-xs'
    },
    medium: {
      container: 'p-6',
      icon: 'w-12 h-12',
      title: 'text-base',
      value: 'text-3xl',
      change: 'text-sm'
    },
    large: {
      container: 'p-8',
      icon: 'w-16 h-16',
      title: 'text-lg',
      value: 'text-4xl',
      change: 'text-base'
    },
    'extra-large': {
      container: 'p-10',
      icon: 'w-20 h-20',
      title: 'text-xl',
      value: 'text-5xl',
      change: 'text-lg'
    }
  }

  const currentSize = sizeClasses[size] || sizeClasses.medium

  const shadowClasses = {
    blue: 'shadow-blue-500/25',
    green: 'shadow-green-500/25',
    purple: 'shadow-purple-500/25',
    orange: 'shadow-orange-500/25',
    indigo: 'shadow-indigo-500/25',
    emerald: 'shadow-emerald-500/25',
    slate: 'shadow-slate-500/25',
    cyan: 'shadow-cyan-500/25',
    yellow: 'shadow-yellow-500/25',
    red: 'shadow-red-500/25',
    gray: 'shadow-gray-500/25'
  }

  if (loading) {
    return (
      <div className={`card ${currentSize.container} animate-pulse`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
          <div className={`${currentSize.icon} bg-slate-200 dark:bg-slate-700 rounded-2xl`}></div>
        </div>
        <div className="space-y-2">
          <div className={`h-8 bg-slate-200 dark:bg-slate-700 rounded w-16`}></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${currentSize.container} hover:shadow-2xl transition-all duration-300 hover:scale-105 group`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${currentSize.title} font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider`}>
          {title}
        </h3>
        <div className={`p-3 rounded-2xl bg-gradient-to-r ${colorClasses[color]} shadow-lg ${shadowClasses[color]}`}>
          <Icon className={`${currentSize.icon} text-white`} />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className={`${currentSize.value} font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
          {value?.toLocaleString() || 0}
        </div>
        
        {change && (
          <div className={`flex items-center space-x-1 ${currentSize.change} font-semibold ${
            changeType === 'positive' ? 'text-green-600' : 'text-red-600'
          }`}>
            {changeType === 'positive' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{change}</span>
            <span className="text-slate-500 dark:text-slate-400">vs. luna trecută</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
