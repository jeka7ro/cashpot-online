import React from 'react'
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const AIInsightsPanel = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              🤖 AI Insights
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Analiză inteligentă a cheltuielilor
            </p>
          </div>
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nu există suficiente date pentru analiză AI</p>
          <p className="text-xs mt-2">Sincronizează datele pentru a genera insights</p>
        </div>
      </div>
    )
  }
  
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
      case 'warning':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100'
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
    }
  }
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    }
  }
  
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'error':
        return <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">URGENT</span>
      case 'warning':
        return <span className="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded-full">ATENȚIE</span>
      case 'success':
        return <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-full">EXCELENT</span>
      default:
        return <span className="px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded-full">INFO</span>
    }
  }
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl animate-pulse">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              🤖 AI Insights
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {insights.length} insight{insights.length > 1 ? 's' : ''} generat{insights.length > 1 ? 'e' : ''} automat
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
            ⚡ Live Analysis
          </span>
        </div>
      </div>
      
      {/* Insights Grid */}
      <div className="space-y-4">
        {insights.map((insight, idx) => (
          <div 
            key={idx}
            className={`
              border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-lg
              ${getSeverityStyles(insight.severity)}
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getSeverityIcon(insight.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{insight.icon}</span>
                    <h4 className="text-sm font-bold">
                      {insight.title}
                    </h4>
                  </div>
                  {getSeverityBadge(insight.severity)}
                </div>
                <p className="text-sm mb-3 leading-relaxed">
                  {insight.message}
                </p>
                {insight.recommendation && (
                  <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      💡 <strong>Recomandare:</strong> {insight.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          🧠 Insights generate automat prin analiză matematică avansată • Actualizare la fiecare sincronizare
        </p>
      </div>
    </div>
  )
}

export default AIInsightsPanel

