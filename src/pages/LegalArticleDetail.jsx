import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowLeft, FileText, Loader, AlertCircle, ExternalLink } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const LegalArticleDetail = () => {
  const { law, articleNumber } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState(null)
  const [error, setError] = useState(null)
  const [lawArticles, setLawArticles] = useState([])
  const contentRef = useRef(null)
  const searchText = searchParams.get('search')

  useEffect(() => {
    if (law && articleNumber) {
      loadArticle()
      loadLawArticles()
    }
  }, [law, articleNumber])

  useEffect(() => {
    // Dacă există text de căutare, evidențiază și scroll la el după ce conținutul s-a încărcat
    if (searchText && article && !loading && contentRef.current) {
      // Așteaptă puțin pentru ca DOM-ul să fie complet renderat
      setTimeout(() => {
        highlightAndScrollToText(searchText)
      }, 500)
    }
  }, [searchText, article, loading])

  const loadArticle = async () => {
    try {
      setLoading(true)
      setError(null)
      
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

  const loadLawArticles = async () => {
    try {
      // Încarcă toate articolele din aceeași lege pentru navigare
      const articlesPath = '/api/legal/articles/' + encodeURIComponent(law)
      // Pentru moment, nu avem endpoint pentru toate articolele, dar putem încerca
    } catch (err) {
      console.error('Error loading law articles:', err)
    }
  }

  const highlightAndScrollToText = (searchTerm) => {
    if (!contentRef.current || !searchTerm) {
      console.log('No contentRef or searchTerm:', { contentRef: !!contentRef.current, searchTerm })
      return
    }
    
    const decodedSearch = decodeURIComponent(searchTerm).toLowerCase().trim()
    console.log('Searching for:', decodedSearch)
    const content = contentRef.current
    
    // Caută în toate elementele care conțin text (inclusiv div-urile cu paragrafe)
    // Prioritizează elementele care conțin paragrafe
    const allTextElements = content.querySelectorAll('[data-paragraph-content], div, p, span, li, td')
    let found = false
    
    allTextElements.forEach((element) => {
      if (found) return
      
      const text = element.textContent || element.innerText || ''
      const lowerText = text.toLowerCase()
      
      // Caută textul exact sau variante (cu/sără diacritice, cu/sără spații)
      const searchVariants = [
        decodedSearch,
        decodedSearch.replace(/[ăâîșț]/g, (m) => {
          const map = { 'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't' }
          return map[m] || m
        })
      ]
      
      for (const variant of searchVariants) {
        if (lowerText.includes(variant) && text.length > variant.length) {
          // Găsește poziția exactă în text
          const index = lowerText.indexOf(variant)
          if (index === -1) continue
          
          // Creează un wrapper pentru evidențiere
          const beforeText = text.substring(0, index)
          const matchText = text.substring(index, index + variant.length)
          const afterText = text.substring(index + variant.length)
          
          // Creează elementul evidențiat
          const highlight = document.createElement('mark')
          highlight.className = 'bg-yellow-300 dark:bg-yellow-600 px-1 rounded font-semibold'
          highlight.textContent = matchText
          highlight.id = 'highlighted-text'
          highlight.style.transition = 'background-color 0.3s'
          
          // Înlocuiește conținutul elementului
          const wrapper = document.createElement('span')
          if (beforeText) {
            wrapper.appendChild(document.createTextNode(beforeText))
          }
          wrapper.appendChild(highlight)
          if (afterText) {
            wrapper.appendChild(document.createTextNode(afterText))
          }
          
          // Înlocuiește elementul original
          element.innerHTML = ''
          element.appendChild(wrapper)
          
          // Scroll la textul evidențiat
          setTimeout(() => {
            const highlighted = document.getElementById('highlighted-text')
            if (highlighted) {
              highlighted.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
              console.log('Scrolled to highlighted text')
            }
          }, 200)
          
          // Elimină evidențierea după 10 secunde
          setTimeout(() => {
            const highlighted = document.getElementById('highlighted-text')
            if (highlighted && highlighted.parentNode) {
              const parent = highlighted.parentNode
              const fullText = parent.textContent
              parent.textContent = fullText
            }
          }, 10000)
          
          found = true
          console.log('Found and highlighted:', variant)
          break
        }
      }
    })
    
    if (!found) {
      console.log('Text not found in elements, trying walker')
      // Dacă nu s-a găsit în elemente, caută în textul brut
      const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        null
      )
      
      let node
      while (node = walker.nextNode()) {
        const text = node.textContent
        const lowerText = text.toLowerCase()
        if (lowerText.includes(decodedSearch)) {
          const index = lowerText.indexOf(decodedSearch)
          const range = document.createRange()
          range.setStart(node, index)
          range.setEnd(node, index + decodedSearch.length)
          
          const highlight = document.createElement('mark')
          highlight.className = 'bg-yellow-300 dark:bg-yellow-600 px-1 rounded font-semibold'
          highlight.id = 'highlighted-text'
          
          try {
            range.surroundContents(highlight)
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
            console.log('Found and highlighted via walker')
            
            setTimeout(() => {
              if (highlight.parentNode) {
                highlight.parentNode.replaceChild(
                  document.createTextNode(highlight.textContent),
                  highlight
                )
              }
            }, 10000)
          } catch (e) {
            console.error('Error highlighting:', e)
          }
          
          break
        }
      }
    }
    
    if (!found) {
      console.warn('Could not find search term:', decodedSearch)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Se încarcă articolul...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Eroare</h1>
          </div>
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Înapoi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{law}</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
              Articolul {article?.articleNumber || articleNumber}
            </p>
          </div>
        </div>

        {/* Article Content */}
        {article && (
          <div ref={contentRef} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
            {/* Article Header */}
            <div className={`p-6 rounded-lg border mb-6 ${
              isDark 
                ? 'bg-slate-900/50 border-slate-700' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-purple-900/40' : 'bg-purple-100'
                }`}>
                  <FileText className={`w-6 h-6 ${
                    isDark ? 'text-purple-300' : 'text-purple-600'
                  }`} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    Art. {article.articleNumber}
                  </h2>
                  <p className={`text-sm ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {article.law}
                  </p>
                </div>
              </div>
            </div>

            {/* Article Content */}
            {(() => {
              // Verifică dacă conținutul este complet sau doar un fragment
              const contentText = article.fullContent || article.content || ''
              
              // Verifică dacă are alineate numerotate (indică conținut structurat)
              const hasNumberedParagraphs = article.paragraphs && article.paragraphs.length > 0 && 
                article.paragraphs.some(p => p.number && p.content && p.content.trim().length > 20)
              
              // Verifică dacă conținutul este prea scurt sau doar un fragment izolat
              // Un articol complet trebuie să aibă cel puțin 100 de caractere SAU să aibă alineate numerotate
              const isIncomplete = contentText.trim().length < 100 && !hasNumberedParagraphs &&
                (contentText.trim().length < 50 || 
                 (contentText.includes('se aplică începând cu data de') && contentText.trim().length < 100 && !hasNumberedParagraphs) ||
                 (contentText.includes('intră în vigoare în termen de') && contentText.trim().length < 100 && !hasNumberedParagraphs) ||
                 contentText.match(/^[^.]{0,30}$/)) // Dacă nu are puncte și e foarte scurt
              
              const hasContent = !isIncomplete && (contentText.trim().length > 100 || hasNumberedParagraphs)
              const hasParagraphs = article.paragraphs && article.paragraphs.length > 0 && 
                article.paragraphs.some(p => p.content && p.content.trim().length > 10)
              
              if (isIncomplete || (!hasContent && !hasParagraphs)) {
                return (
                  <div className={`p-6 rounded-lg border ${
                    isDark 
                      ? 'bg-yellow-900/20 border-yellow-700' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className={`w-5 h-5 ${
                        isDark ? 'text-yellow-400' : 'text-yellow-600'
                      }`} />
                      <h3 className={`text-lg font-semibold ${
                        isDark ? 'text-yellow-300' : 'text-yellow-900'
                      }`}>
                        Conținut incomplet
                      </h3>
                    </div>
                    <p className={`leading-relaxed text-base ${
                      isDark ? 'text-yellow-200' : 'text-yellow-800'
                    }`}>
                      Articolul a fost găsit, dar conținutul nu a putut fi extras complet din documentul PDF. 
                      Extragerea automată din PDF nu a capturat întregul conținut al acestui articol.
                    </p>
                    <p className={`leading-relaxed text-base mt-3 ${
                      isDark ? 'text-yellow-200' : 'text-yellow-800'
                    }`}>
                      <strong>Vă rugăm să consultați documentul original PDF pentru conținutul complet al articolului.</strong>
                    </p>
                    {article.fullContent && article.fullContent.trim().length > 0 && (
                      <div className={`mt-4 p-4 rounded border ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700' 
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className={`text-sm italic ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Fragment disponibil: "{article.fullContent}"
                        </p>
                      </div>
                    )}
                  </div>
                )
              }
              
              if (hasParagraphs) {
                return (
                  <div className="space-y-6">
                    {article.paragraphs.map((para, idx) => {
                      if (!para.content || para.content.trim().length < 5) return null
                      return (
                        <div
                          key={idx}
                          className={`p-6 rounded-lg border ${
                            isDark 
                              ? 'bg-slate-800/50 border-slate-700' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {para.number && (
                            <div className="mb-3">
                              <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                                isDark 
                                  ? 'bg-purple-900/40 text-purple-300' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                Alineatul ({para.number})
                              </span>
                            </div>
                          )}
                          <div 
                            className={`leading-relaxed whitespace-pre-wrap text-base ${
                              isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}
                            data-paragraph-content={para.content}
                          >
                            {para.content}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
              
              return (
                <div className={`p-6 rounded-lg border ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={`leading-relaxed whitespace-pre-wrap text-base ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {article.content || article.fullContent}
                  </p>
                </div>
              )
            })()}

            {/* Full Content (if paragraphs don't show everything) */}
            {article.fullContent && article.fullContent.length > 200 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Conținut complet
                </h3>
                <div className={`p-6 rounded-lg border ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={`leading-relaxed whitespace-pre-wrap text-base ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {article.fullContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default LegalArticleDetail
