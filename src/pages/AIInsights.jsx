import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { Brain, TrendingUp, ArrowLeft, Download, FileSpreadsheet } from 'lucide-react'
import { generateAIInsights } from '../utils/aiInsights'
import AIInsightsPanel from '../components/AIInsightsPanel'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const AIInsights = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [expendituresData, setExpendituresData] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  })
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/expenditures/data')
      setExpendituresData(response.data || [])
    } catch (error) {
      console.error('Error loading expenditures:', error)
      toast.error('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }
  
  const insights = React.useMemo(() => {
    return generateAIInsights(expendituresData, dateRange)
  }, [expendituresData, dateRange])
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-slate-600 dark:text-slate-400 flex items-center space-x-3">
            <Brain className="w-8 h-8 animate-pulse text-purple-500" />
            <span>Se încarcă AI Insights...</span>
          </div>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenditures')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Înapoi la Cheltuieli"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mr-4 animate-pulse">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                🤖 AI Insights
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Analiză inteligentă și recomandări automate pentru cheltuieli
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={loadData}
              className="btn-secondary flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Insights</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {insights.length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Alerte Urgente</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {insights.filter(i => i.severity === 'error' || i.severity === 'warning').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Economii Detectate</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {insights.filter(i => i.severity === 'success').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl shadow-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Date Analizate</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {expendituresData.length}
            </p>
          </div>
        </div>
        
        {/* AI Insights Panel */}
        <AIInsightsPanel insights={insights} />
        
        {/* Info */}
        <div className="card p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-start space-x-4">
            <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Despre AI Insights
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Insights-urile sunt generate automat prin algoritmi avansați de analiză matematică și statistică:
              </p>
              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                <li><strong>Trend Analysis</strong> - Compară luna curentă vs anterioară</li>
                <li><strong>Anomaly Detection</strong> - Detectează valori neobișnuite (&gt;2σ)</li>
                <li><strong>Department Analysis</strong> - Identifică cei mai mari spenderi</li>
                <li><strong>Location Growth</strong> - Monitorizează creșteri/scăderi</li>
                <li><strong>Prediction</strong> - Estimează cheltuielile lunii următoare</li>
                <li><strong>Category Variations</strong> - Monitorizează schimbări majore</li>
              </ul>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                💡 Insights-urile se actualizează automat la fiecare sincronizare de date.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AIInsights

