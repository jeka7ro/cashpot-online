import React, { useState, useEffect } from 'react'
import { X, FileText, Loader, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../contexts/ThemeContext'

const ArticleModal = ({ isOpen, onClose, law, articleNumber }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && law && articleNumber) {
      loadArticle()
    } else {
      setArticle(null)
      setError(null)
    }
  }, [isOpen, law, articleNumber])

  const loadArticle = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // URL encode pentru a gestiona caractere speciale
      const encodedLaw = encodeURIComponent(law)
      const encodedArticle = encodeURIComponent(articleNumber)
      
      const response = await axios.get(`/api/legal/article/${encodedLaw}/${encodedArticle}`)
      
      if (response.data?.success) {
        setArticle(response.data.data)
      } else {
        setError('Articolul nu a fost găsit')
      }
    } catch (err) {
      console.error('Error loading article:', err)
      setError(err.response?.data?.error || 'Eroare la încărcarea articolului')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-purple-900/40' : 'bg-purple-100'
            }`}>
              <FileText className={`w-5 h-5 ${
                isDark ? 'text-purple-300' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {law}
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Articolul {articleNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className={`ml-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Se încarcă articolul...
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {article && !loading && (
            <div className="space-y-4">
              {/* Article Header */}
              <div className={`p-4 rounded-lg border ${
                isDark 
                  ? 'bg-slate-900/50 border-slate-700' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <h3 className={`text-lg font-bold mb-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Art. {article.articleNumber}
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {article.law}
                </p>
              </div>

              {/* Article Content */}
              {article.paragraphs && article.paragraphs.length > 0 ? (
                <div className="space-y-4">
                  {article.paragraphs.map((para, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        isDark 
                          ? 'bg-slate-800/50 border border-slate-700' 
                          : 'bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {para.number && (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-2 ${
                          isDark 
                            ? 'bg-purple-900/40 text-purple-300' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          Alineatul ({para.number})
                        </span>
                      )}
                      <p className={`leading-relaxed whitespace-pre-wrap ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {para.content || article.fullContent}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-lg ${
                  isDark 
                    ? 'bg-slate-800/50 border border-slate-700' 
                    : 'bg-slate-50 border border-slate-200'
                }`}>
                  <p className={`leading-relaxed whitespace-pre-wrap ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {article.content || article.fullContent}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArticleModal






