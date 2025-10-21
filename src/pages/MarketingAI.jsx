import React from 'react'
import Layout from '../components/Layout'
import PromotionsAIWidget from '../components/PromotionsAIWidget'
import { Brain, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MarketingAI = () => {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/marketing')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Înapoi la Marketing"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/25">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analiză AI Marketing</h2>
                <p className="text-slate-600 dark:text-slate-400">Insights și recomandări inteligente pentru campaniile tale</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Widget - Full Width */}
        <div className="w-full">
          <PromotionsAIWidget />
        </div>
      </div>
    </Layout>
  )
}

export default MarketingAI

