import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useTheme } from '../contexts/ThemeContext'
import { FileText, Search, MessageSquare, Send, BookOpen, Calendar, DollarSign, Bell, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const SlotRegulations = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(true)
  const [regulationsData, setRegulationsData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState(null)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])

  useEffect(() => {
    loadRegulationsData()
  }, [])

  const loadRegulationsData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/legal/slot-regulations')
      if (response.data?.success) {
        setRegulationsData(response.data.data)
      }
    } catch (error) {
      console.error('Eroare la încărcare:', error)
      // Dacă nu există endpoint, folosește date mock
      setRegulationsData(getMockData())
    } finally {
      setLoading(false)
    }
  }

  const askAI = async () => {
    if (!aiQuestion.trim()) return

    setAiLoading(true)
    const question = aiQuestion.trim()
    setAiQuestion('')

    try {
      const response = await axios.post('/api/legal/ask-ai', {
        question,
        context: regulationsData
      })

      if (response.data?.success) {
        const answer = response.data.answer
        setAiAnswer(answer)
        setChatHistory(prev => [...prev, { question, answer, timestamp: new Date() }])
      } else {
        // Fallback la răspuns local
        const answer = generateLocalAnswer(question)
        setAiAnswer(answer)
        setChatHistory(prev => [...prev, { question, answer, timestamp: new Date() }])
      }
    } catch (error) {
      console.error('Eroare AI:', error)
      const answer = generateLocalAnswer(question)
      setAiAnswer(answer)
      setChatHistory(prev => [...prev, { question, answer, timestamp: new Date() }])
    } finally {
      setAiLoading(false)
    }
  }

  const generateLocalAnswer = (question) => {
    const q = question.toLowerCase()
    
    if (q.includes('tax') || q.includes('impozit') || q.includes('plăt')) {
      return `Conform legii, pentru sloturi există următoarele taxe și impozite:
- Impozit pe venituri din jocuri: 25% sau 30% din veniturile din joc (în funcție de valoare)
- Taxă de autorizare: se plătește la ONJN
- Taxă anuală de funcționare: se plătește anual pentru fiecare slot

Plățile se fac conform termenelor stabilite de ONJN, de obicei până la data de 25 a lunii următoare.`
    }
    
    if (q.includes('notific') || q.includes('anunț')) {
      return `Notificările pentru sloturi trebuie făcute în următoarele situații:
- Punere în funcțiune: minim 5 zile înainte
- Scoatere din funcțiune: minim 5 zile înainte  
- Mutare slot: minim 5 zile înainte
- Modificări tehnice: conform procedurii ONJN

Toate notificările se fac către ONJN prin mijloace electronice recunoscute.`
    }
    
    if (q.includes('termen') || q.includes('când') || q.includes('dată')) {
      return `Termene importante pentru sloturi:
- Plăți taxe: până la data de 25 a lunii următoare
- Declarații: până la data de 25 ianuarie, 25 mai, 31 iulie, 31 decembrie
- Notificări: minim 5 zile înainte de operațiune
- Reînnoire autorizații: conform calendarului ONJN`
    }
    
    if (q.includes('curs') || q.includes('valut') || q.includes('euro') || q.includes('ron')) {
      return `Plățile pentru sloturi se fac în RON (Lei românești). 
Cursul valutar se aplică doar dacă există referințe specifice în contracte sau dacă se plătesc servicii din străinătate.
Pentru taxe și impozite, toate plățile către stat se fac în RON.`
    }
    
    return `Îmi pare rău, nu am găsit o răspuns specific pentru întrebarea ta. Te rog să reformulezi sau să întrebi despre:
- Taxe și impozite pentru sloturi
- Notificări (punere, scoatere, mutare)
- Termene de plată
- Proceduri ONJN
- Categorii de sloturi`
  }

  const getMockData = () => {
    return {
      laws: [
        {
          name: "Legea nr. 141/2025 - Măsuri fiscal-bugetare",
          summary: "Reglementează impozitarea veniturilor din jocuri de noroc, inclusiv sloturi",
          keyPoints: [
            "Impozit pe venituri: 25-30% din veniturile din joc",
            "Plăți trimestriale până la 25 ale lunii următoare",
            "Declarații anuale până la 25 ianuarie"
          ]
        },
        {
          name: "OUG nr. 77/2009 - Organizarea jocurilor de noroc",
          summary: "Reglementează autorizarea, funcționarea și controlul sloturilor",
          keyPoints: [
            "Autorizare obligatorie de la ONJN",
            "Notificări minime 5 zile înainte de operațiuni",
            "Taxă anuală de funcționare per slot"
          ]
        }
      ],
      taxes: [
        {
          type: "Impozit pe venituri",
          amount: "25-30%",
          description: "Din veniturile brute din jocuri",
          payment: "Trimestrial, până la 25 ale lunii următoare",
          currency: "RON"
        },
        {
          type: "Taxă autorizare",
          amount: "Variabil",
          description: "Pentru obținerea/autorizarea sloturilor",
          payment: "La emiterea/autorizarea",
          currency: "RON"
        },
        {
          type: "Taxă funcționare",
          amount: "Anuală per slot",
          description: "Taxă anuală pentru fiecare slot în funcțiune",
          payment: "Anual, conform calendarului ONJN",
          currency: "RON"
        }
      ],
      notifications: [
        {
          type: "Punere în funcțiune",
          deadline: "Minim 5 zile înainte",
          description: "Notificare către ONJN înainte de punerea slotului în funcțiune",
          method: "Comunicare electronică recunoscută",
          required: ["Număr slot", "Locație", "Tip slot", "Data punerii în funcțiune"]
        },
        {
          type: "Scoatere din funcțiune",
          deadline: "Minim 5 zile înainte",
          description: "Notificare către ONJN înainte de scoaterea slotului",
          method: "Comunicare electronică recunoscută",
          required: ["Număr slot", "Locație", "Motiv scoatere", "Data scoaterii"]
        },
        {
          type: "Mutare slot",
          deadline: "Minim 5 zile înainte",
          description: "Notificare către ONJN înainte de mutarea slotului",
          method: "Comunicare electronică recunoscută",
          required: ["Număr slot", "Locație veche", "Locație nouă", "Data mutării"]
        },
        {
          type: "Modificări tehnice",
          deadline: "Conform procedurii ONJN",
          description: "Notificare pentru modificări tehnice importante",
          method: "Comunicare electronică recunoscută",
          required: ["Număr slot", "Tip modificare", "Descriere modificare"]
        }
      ],
      paymentTerms: [
        {
          type: "Impozit trimestrial",
          deadline: "Până la 25 ale lunii următoare trimestrului",
          months: ["Ianuarie (Q4 anul trecut)", "Aprilie (Q1)", "Iulie (Q2)", "Octombrie (Q3)"],
          currency: "RON"
        },
        {
          type: "Declarație anuală",
          deadline: "Până la 25 ianuarie",
          description: "Declarație pentru anul fiscal anterior",
          currency: "RON"
        },
        {
          type: "Taxă funcționare",
          deadline: "Conform calendarului ONJN",
          description: "Taxă anuală pentru fiecare slot",
          currency: "RON"
        }
      ],
      categories: [
        {
          name: "Slot-machine clasa I",
          description: "Sloturi autorizate pentru exploatare în locații autorizate",
          requirements: ["Autorizație ONJN", "Notificare prealabilă", "Taxă anuală"]
        },
        {
          name: "VLT (Video Lottery Terminal)",
          description: "Terminale de loterie video",
          requirements: ["Autorizație ONJN", "Dispozitiv GPS", "Notificare prealabilă"]
        }
      ]
    }
  }

  const filteredData = regulationsData ? {
    ...regulationsData,
    taxes: regulationsData.taxes?.filter(t => 
      !searchTerm || JSON.stringify(t).toLowerCase().includes(searchTerm.toLowerCase())
    ) || [],
    notifications: regulationsData.notifications?.filter(n => 
      !searchTerm || JSON.stringify(n).toLowerCase().includes(searchTerm.toLowerCase())
    ) || []
  } : null

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Se încarcă reglementările...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Reglementări Sloturi</h1>
              <p className="text-blue-100 mt-1">Legi, taxe, plăți și notificări pentru sloturi</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Caută în reglementări (taxe, notificări, termene)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Legi */}
            {filteredData?.laws && (
              <SectionCard
                title="📜 Legi și Reglementări"
                icon={FileText}
                isOpen={activeSection === 'laws'}
                onToggle={() => setActiveSection(activeSection === 'laws' ? null : 'laws')}
              >
                {filteredData.laws.map((law, idx) => (
                  <div key={idx} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{law.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-3">{law.summary}</p>
                    <ul className="space-y-2">
                      {law.keyPoints.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Taxe */}
            {filteredData?.taxes && (
              <SectionCard
                title="💰 Taxe și Impozite"
                icon={DollarSign}
                isOpen={activeSection === 'taxes'}
                onToggle={() => setActiveSection(activeSection === 'taxes' ? null : 'taxes')}
              >
                <div className="space-y-4">
                  {filteredData.taxes.map((tax, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-200">{tax.type}</h4>
                        <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-sm font-semibold">
                          {tax.amount}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-2">{tax.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {tax.payment}
                        </span>
                        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                          {tax.currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Notificări */}
            {filteredData?.notifications && (
              <SectionCard
                title="🔔 Notificări"
                icon={Bell}
                isOpen={activeSection === 'notifications'}
                onToggle={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
              >
                <div className="space-y-4">
                  {filteredData.notifications.map((notif, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-amber-900 dark:text-amber-200">{notif.type}</h4>
                        <span className="px-3 py-1 bg-amber-600 text-white rounded-full text-sm font-semibold">
                          {notif.deadline}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-3">{notif.description}</p>
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Metodă: </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{notif.method}</span>
                      </div>
                      {notif.required && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Documente necesare:</p>
                          <ul className="space-y-1">
                            {notif.required.map((req, rIdx) => (
                              <li key={rIdx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                <span className="text-amber-600 dark:text-amber-400 mt-1">✓</span>
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Termene de plată */}
            {filteredData?.paymentTerms && (
              <SectionCard
                title="📅 Termene de Plată"
                icon={Calendar}
                isOpen={activeSection === 'paymentTerms'}
                onToggle={() => setActiveSection(activeSection === 'paymentTerms' ? null : 'paymentTerms')}
              >
                <div className="space-y-4">
                  {filteredData.paymentTerms.map((term, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">{term.type}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-blue-700 dark:text-blue-300">{term.deadline}</span>
                      </div>
                      {term.months && (
                        <ul className="space-y-1 mt-2">
                          {term.months.map((month, mIdx) => (
                            <li key={mIdx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                              <span>{month}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {term.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{term.description}</p>
                      )}
                      <span className="inline-block mt-2 px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">
                        {term.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Categorii */}
            {filteredData?.categories && (
              <SectionCard
                title="🏷️ Categorii Sloturi"
                icon={Info}
                isOpen={activeSection === 'categories'}
                onToggle={() => setActiveSection(activeSection === 'categories' ? null : 'categories')}
              >
                <div className="space-y-4">
                  {filteredData.categories.map((cat, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-2">{cat.name}</h4>
                      <p className="text-slate-600 dark:text-slate-400 mb-3">{cat.description}</p>
                      {cat.requirements && (
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cerințe:</p>
                          <ul className="space-y-1">
                            {cat.requirements.map((req, rIdx) => (
                              <li key={rIdx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                <span className="text-purple-600 dark:text-purple-400 mt-1">✓</span>
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* AI Assistant Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-6">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="font-bold">Asistent AI</h3>
                </div>
                <p className="text-sm text-indigo-100 mt-1">Întreabă despre legi și reglementări</p>
              </div>

              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {/* Chat History */}
                {chatHistory.length > 0 && (
                  <div className="space-y-3">
                    {chatHistory.map((chat, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Întrebare:</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{chat.question}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Răspuns:</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{chat.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Answer */}
                {aiAnswer && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-2">Răspuns:</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiAnswer}</p>
                  </div>
                )}

                {/* Input */}
                <div className="space-y-2">
                  <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        askAI()
                      }
                    }}
                    placeholder="Ex: Ce taxe trebuie plătite pentru sloturi?"
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={askAI}
                    disabled={aiLoading || !aiQuestion.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {aiLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Se procesează...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Trimite</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Questions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Întrebări rapide:</p>
                  <div className="space-y-1">
                    {[
                      "Ce taxe plătesc pentru sloturi?",
                      "Când trebuie făcute notificările?",
                      "Care sunt termenele de plată?",
                      "Ce înseamnă notificare punere în funcțiune?"
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAiQuestion(q)
                          setTimeout(() => askAI(), 100)
                        }}
                        className="w-full text-left text-xs p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Component pentru secțiuni collapsible
const SectionCard = ({ title, icon: Icon, isOpen, onToggle, children }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}

export default SlotRegulations




