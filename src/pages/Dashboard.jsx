import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import QuickActions from '../components/QuickActions'
import RecentActivity from '../components/RecentActivity'
import SystemHealth from '../components/SystemHealth'
import ONJNCalendar from '../components/ONJNCalendar'
import DatabaseBackup from '../components/DatabaseBackup'
import ONJNCurrencyRate from '../components/ONJNCurrencyRate'
import GamesLibraryWidget from '../components/GamesLibraryWidget'
import { 
  Building2, 
  MapPin, 
  Users, 
  Gamepad2, 
  Package, 
  Settings, 
  Trophy, 
  FileText, 
  Shield, 
  BarChart3,
  TrendingUp,
  Activity,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  RotateCcw
} from 'lucide-react'

const Dashboard = () => {
  const { statistics, loading } = useData()
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [dashboardConfig, setDashboardConfig] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [selectedWidgets, setSelectedWidgets] = useState([])
  const [cardSizes, setCardSizes] = useState(() => {
    const saved = localStorage.getItem('cardSizes')
    return saved ? JSON.parse(saved) : {
      companies: 'medium',
      locations: 'medium',
      providers: 'medium',
      cabinets: 'medium',
      gameMixes: 'medium',
      slots: 'medium',
      games: 'medium',
      warehouse: 'medium',
      metrology: 'medium',
      jackpots: 'medium',
      invoices: 'medium',
      onjnReports: 'medium',
      legalDocuments: 'medium',
      users: 'medium'
    }
  })

  const [widgetSizes, setWidgetSizes] = useState(() => {
    const saved = localStorage.getItem('widgetSizes')
    return saved ? JSON.parse(saved) : {
      quickActions: 'medium',
      recentActivity: 'medium',
      databaseBackup: 'medium',
      currencyRate: 'small',
      onjnCalendar: 'large',
      systemHealth: 'large',
      gamesLibrary: 'large',
      performanceCharts: 'extra-large'
    }
  })

  // Configurația implicită pentru dashboard - cardurile sunt OFF by default
  const defaultDashboardConfig = {
    statCards: [
      { id: 'companies', title: 'Companii', visible: false, order: 1 },
      { id: 'locations', title: 'Locații', visible: false, order: 2 },
      { id: 'providers', title: 'Furnizori', visible: false, order: 3 },
      { id: 'cabinets', title: 'Cabinete', visible: false, order: 4 },
      { id: 'gameMixes', title: 'Game Mixes', visible: false, order: 5 },
      { id: 'slots', title: 'Sloturi', visible: false, order: 6 },
      { id: 'games', title: 'Librărie Jocuri', visible: false, order: 7 },
      { id: 'warehouse', title: 'Depozit', visible: false, order: 8 },
      { id: 'metrology', title: 'Metrologie', visible: false, order: 9 },
      { id: 'jackpots', title: 'Jackpots', visible: false, order: 10 },
      { id: 'invoices', title: 'Facturi', visible: false, order: 11 },
      { id: 'onjnReports', title: 'Rapoarte ONJN', visible: false, order: 12 },
      { id: 'legalDocuments', title: 'Documente Legale', visible: false, order: 13 },
      { id: 'users', title: 'Utilizatori', visible: false, order: 14 }
    ],
    widgets: [
      { id: 'quickActions', title: 'Acțiuni Rapide', visible: true, order: 1 },
      { id: 'recentActivity', title: 'Activitate Recentă', visible: true, order: 2 },
      { id: 'databaseBackup', title: 'Backup Bază de Date', visible: true, order: 3 },
      { id: 'currencyRate', title: 'Curs Valutar ONJN', visible: true, order: 4 },
      { id: 'onjnCalendar', title: 'Calendar ONJN', visible: true, order: 5 },
      { id: 'systemHealth', title: 'Sănătate Sistem', visible: true, order: 6 },
      { id: 'gamesLibrary', title: 'Jocuri din Librărie', visible: true, order: 7 },
      { id: 'performanceCharts', title: 'Grafice Performanță', visible: true, order: 8 }
    ]
  }

  // Cardurile sunt mereu default OFF - nu se salvează în localStorage
  useEffect(() => {
    setDashboardConfig(defaultDashboardConfig)
  }, [])

  // Cardurile nu se salvează - sunt mereu default OFF
  const saveDashboardConfig = () => {
    // Nu salvăm cardurile - doar widget-urile
    const configToSave = {
      ...dashboardConfig,
      statCards: defaultDashboardConfig.statCards // Forțează cardurile să fie OFF
    }
    localStorage.setItem('dashboardConfig', JSON.stringify(configToSave))
    setIsEditing(false)
    setSelectedCards([])
    setSelectedWidgets([])
  }

  // Resetează configurația la implicită
  const resetDashboardConfig = () => {
    setDashboardConfig(defaultDashboardConfig)
    localStorage.removeItem('dashboardConfig')
    setSelectedCards([])
    setSelectedWidgets([])
    setCardSizes({
      companies: 'medium',
      locations: 'medium',
      providers: 'medium',
      cabinets: 'medium',
      gameMixes: 'medium',
      slots: 'medium',
      warehouse: 'medium',
      metrology: 'medium',
      jackpots: 'medium',
      invoices: 'medium',
      onjnReports: 'medium',
      legalDocuments: 'medium',
      users: 'medium'
    })
    localStorage.removeItem('cardSizes')
    setIsEditing(false)
  }

  // Toggle vizibilitatea unui card
  const toggleCardVisibility = (cardId) => {
    setDashboardConfig(prev => ({
      ...prev,
      statCards: prev.statCards.map(card => 
        card.id === cardId ? { ...card, visible: !card.visible } : card
      )
    }))
  }

  // Toggle vizibilitatea unui widget
  const toggleWidgetVisibility = (widgetId) => {
    setDashboardConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget => 
        widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
      )
    }))
  }

  // Mută un card în sus
  const moveCardUp = (cardId) => {
    setDashboardConfig(prev => {
      const cards = [...prev.statCards]
      const index = cards.findIndex(card => card.id === cardId)
      if (index > 0) {
        [cards[index], cards[index - 1]] = [cards[index - 1], cards[index]]
        cards.forEach((card, i) => card.order = i + 1)
      }
      return { ...prev, statCards: cards }
    })
  }

  // Mută un card în jos
  const moveCardDown = (cardId) => {
    setDashboardConfig(prev => {
      const cards = [...prev.statCards]
      const index = cards.findIndex(card => card.id === cardId)
      if (index < cards.length - 1) {
        [cards[index], cards[index + 1]] = [cards[index + 1], cards[index]]
        cards.forEach((card, i) => card.order = i + 1)
      }
      return { ...prev, statCards: cards }
    })
  }

  // Mută un widget în sus
  const moveWidgetUp = (widgetId) => {
    setDashboardConfig(prev => {
      const widgets = [...prev.widgets]
      const index = widgets.findIndex(widget => widget.id === widgetId)
      if (index > 0) {
        [widgets[index], widgets[index - 1]] = [widgets[index - 1], widgets[index]]
        widgets.forEach((widget, i) => widget.order = i + 1)
      }
      return { ...prev, widgets }
    })
  }

  // Mută un widget în jos
  const moveWidgetDown = (widgetId) => {
    setDashboardConfig(prev => {
      const widgets = [...prev.widgets]
      const index = widgets.findIndex(widget => widget.id === widgetId)
      if (index < widgets.length - 1) {
        [widgets[index], widgets[index + 1]] = [widgets[index + 1], widgets[index]]
        widgets.forEach((widget, i) => widget.order = i + 1)
      }
      return { ...prev, widgets }
    })
  }

  // Schimbă mărimea unui card
  const changeCardSize = (cardId, size) => {
    setCardSizes(prev => {
      const newSizes = { ...prev, [cardId]: size }
      localStorage.setItem('cardSizes', JSON.stringify(newSizes))
      return newSizes
    })
  }

  // Schimbă mărimea unui widget
  const changeWidgetSize = (widgetId, size) => {
    setWidgetSizes(prev => {
      const newSizes = { ...prev, [widgetId]: size }
      localStorage.setItem('widgetSizes', JSON.stringify(newSizes))
      return newSizes
    })
  }

  // Toggle card selection
  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  // Toggle widget selection
  const toggleWidgetSelection = (widgetId) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    )
  }

  // Select all cards
  const selectAllCards = () => {
    setSelectedCards(dashboardConfig.statCards.map(c => c.id))
  }

  // Deselect all cards
  const deselectAllCards = () => {
    setSelectedCards([])
  }

  // Bulk change size for selected cards
  const bulkChangeCardSize = (size) => {
    setCardSizes(prev => {
      const newSizes = { ...prev }
      selectedCards.forEach(cardId => {
        newSizes[cardId] = size
      })
      localStorage.setItem('cardSizes', JSON.stringify(newSizes))
      return newSizes
    })
  }

  // Bulk toggle visibility for selected cards
  const bulkToggleCardVisibility = () => {
    setDashboardConfig(prev => {
      const statCards = prev.statCards.map(card => 
        selectedCards.includes(card.id) 
          ? { ...card, visible: !card.visible }
          : card
      )
      return { ...prev, statCards }
    })
  }

  // Select all widgets
  const selectAllWidgets = () => {
    setSelectedWidgets(dashboardConfig.widgets.map(w => w.id))
  }

  // Deselect all widgets
  const deselectAllWidgets = () => {
    setSelectedWidgets([])
  }

  // Bulk change size for selected widgets
  const bulkChangeWidgetSize = (size) => {
    setWidgetSizes(prev => {
      const newSizes = { ...prev }
      selectedWidgets.forEach(widgetId => {
        newSizes[widgetId] = size
      })
      localStorage.setItem('widgetSizes', JSON.stringify(newSizes))
      return newSizes
    })
  }

  // Bulk toggle visibility for selected widgets
  const bulkToggleWidgetVisibility = () => {
    setDashboardConfig(prev => {
      const widgets = prev.widgets.map(widget => 
        selectedWidgets.includes(widget.id) 
          ? { ...widget, visible: !widget.visible }
          : widget
      )
      return { ...prev, widgets }
    })
  }

  // Obține clasa CSS pentru mărimea cardului (optimizat pentru grid uniform)
  const getCardSizeClass = (size) => {
    switch (size) {
      case 'xs':
        return 'dashboard-card-xs'
      case 'small':
        return 'dashboard-card-small'
      case 'medium':
        return 'dashboard-card-medium'
      case 'large':
        return 'dashboard-card-large'
      case 'extra-large':
        return 'dashboard-card-xl'
      default:
        return 'dashboard-card-medium'
    }
  }

  // Obține clasa CSS pentru mărimea widget-ului (optimizat pentru grid uniform)
  const getWidgetSizeClass = (size) => {
    switch (size) {
      case 'xs':
        return 'dashboard-widget-xs'
      case 'small':
        return 'dashboard-widget-small'
      case 'medium':
        return 'dashboard-widget-medium'
      case 'large':
        return 'dashboard-widget-large'
      case 'extra-large':
        return 'dashboard-widget-xl'
      default:
        return 'dashboard-widget-medium'
    }
  }

  // Obține iconița pentru mărimea cardului
  const getSizeIcon = (size) => {
    switch (size) {
      case 'small':
        return 'S'
      case 'medium':
        return 'M'
      case 'large':
        return 'L'
      case 'extra-large':
        return 'XL'
      default:
        return 'M'
    }
  }

  const statCardsData = {
    companies: {
      title: 'Companii',
      value: statistics?.totalCompanies || 0,
      icon: Building2,
      color: 'blue',
      change: '+12%',
      changeType: 'positive'
    },
    locations: {
      title: 'Locații',
      value: statistics?.totalLocations || 0,
      icon: MapPin,
      color: 'green',
      change: '+8%',
      changeType: 'positive'
    },
    providers: {
      title: 'Furnizori',
      value: statistics?.totalProviders || 0,
      icon: Users,
      color: 'purple',
      change: '+5%',
      changeType: 'positive'
    },
    cabinets: {
      title: 'Cabinete',
      value: statistics?.totalCabinets || 0,
      icon: Gamepad2,
      color: 'orange',
      change: '+15%',
      changeType: 'positive'
    },
    gameMixes: {
      title: 'Game Mixes',
      value: statistics?.totalGameMixes || 0,
      icon: Settings,
      color: 'indigo',
      change: '+3%',
      changeType: 'positive'
    },
    slots: {
      title: 'Sloturi',
      value: statistics?.totalSlots || 0,
      icon: BarChart3,
      color: 'emerald',
      change: '+22%',
      changeType: 'positive'
    },
    warehouse: {
      title: 'Depozit',
      value: statistics?.totalWarehouse || 0,
      icon: Package,
      color: 'slate',
      change: '+7%',
      changeType: 'positive'
    },
    metrology: {
      title: 'Metrologie',
      value: statistics?.totalMetrology || 0,
      icon: Activity,
      color: 'cyan',
      change: '+2%',
      changeType: 'positive'
    },
    jackpots: {
      title: 'Jackpots',
      value: statistics?.totalJackpots || 0,
      icon: Trophy,
      color: 'yellow',
      change: '+18%',
      changeType: 'positive'
    },
    invoices: {
      title: 'Facturi',
      value: statistics?.totalInvoices || 0,
      icon: FileText,
      color: 'red',
      change: '+9%',
      changeType: 'positive'
    },
    onjnReports: {
      title: 'Rapoarte ONJN',
      value: statistics?.totalOnjnReports || 0,
      icon: Shield,
      color: 'blue',
      change: '+4%',
      changeType: 'positive'
    },
    legalDocuments: {
      title: 'Documente Legale',
      value: statistics?.totalLegalDocuments || 0,
      icon: FileText,
      color: 'gray',
      change: '+6%',
      changeType: 'positive'
    },
    users: {
      title: 'Utilizatori',
      value: statistics?.totalUsers || 0,
      icon: Users,
      color: 'purple',
      change: '+1%',
      changeType: 'positive'
    },
    games: {
      title: 'Librărie Jocuri',
      value: statistics?.totalGames || 0,
      icon: Gamepad2,
      color: 'pink',
      change: '+18%',
      changeType: 'positive'
    }
  }

  if (!dashboardConfig) {
    return <div>Loading...</div>
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="card p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                Bun venit, {user?.fullName || 'Administrator'}!
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Panoul principal al sistemului CASHPOT V7
              </p>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Ultima actualizare: {new Date().toLocaleString('ro-RO')}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Dashboard Configuration Buttons */}
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurează Dashboard</span>
                  </button>
                ) : (
                  dashboardConfig && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={saveDashboardConfig}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvează</span>
                      </button>
                      <button
                        onClick={resetDashboardConfig}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Resetează</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setSelectedCards([])
                          setSelectedWidgets([])
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <span>Anulează</span>
                      </button>
                    </div>
                  )
                )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                v7.0.1
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Build: 29.09.2025, 11:15
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        {dashboardConfig && (
        <div className="space-y-6">
          {isEditing && dashboardConfig && (
            <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Configurează Cardurile de Statistici</h3>
                <div className="flex items-center space-x-2">
                  {selectedCards.length > 0 && (
                    <>
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {selectedCards.length} selectate
                      </span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            bulkChangeCardSize(e.target.value)
                            e.target.value = ''
                          }
                        }}
                        className="px-3 py-1 text-xs border border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Mărime pentru toate</option>
                        <option value="xs">XS</option>
                        <option value="small">S</option>
                        <option value="medium">M</option>
                        <option value="large">L</option>
                        <option value="extra-large">XL</option>
                      </select>
                      <button
                        onClick={bulkToggleCardVisibility}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Toggle Vizibilitate
                      </button>
                      <button
                        onClick={deselectAllCards}
                        className="px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Deselectează Tot
                      </button>
                    </>
                  )}
                  <button
                    onClick={selectedCards.length === dashboardConfig.statCards.length ? deselectAllCards : selectAllCards}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {selectedCards.length === dashboardConfig.statCards.length ? 'Deselectează Tot' : 'Selectează Tot'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {dashboardConfig.statCards
                  .sort((a, b) => a.order - b.order)
                  .map((card, index) => (
                    <div key={card.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedCards.includes(card.id)
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedCards.includes(card.id)}
                          onChange={() => toggleCardSelection(card.id)}
                          className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{card.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => moveCardUp(card.id)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-30"
                          title="Mută în sus"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveCardDown(card.id)}
                          disabled={index === dashboardConfig.statCards.length - 1}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-30"
                          title="Mută în jos"
                        >
                          ↓
                        </button>
                        
                        {/* Selector pentru mărimea cardului */}
                        <select
                          value={cardSizes[card.id]}
                          onChange={(e) => changeCardSize(card.id, e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          title="Mărimea cardului"
                        >
                          <option value="xs">XS</option>
                          <option value="small">S</option>
                          <option value="medium">M</option>
                          <option value="large">L</option>
                          <option value="extra-large">XL</option>
                        </select>
                        
                        <button
                          onClick={() => toggleCardVisibility(card.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            card.visible 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                          title={card.visible ? "Ascunde cardul" : "Afișează cardul"}
                        >
                          {card.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
        <div className="dashboard-grid-stats">
            {dashboardConfig.statCards
              .filter(card => card.visible)
              .sort((a, b) => a.order - b.order)
              .map((cardConfig) => {
                const cardData = statCardsData[cardConfig.id]
                const cardSize = cardSizes[cardConfig.id] || 'medium'
                const sizeClass = getCardSizeClass(cardSize)
                
                return (
                  <div key={cardConfig.id} className={sizeClass}>
                    <StatCard
                      title={cardData.title}
                      value={cardData.value}
                      icon={cardData.icon}
                      color={cardData.color}
                      change={cardData.change}
                      changeType={cardData.changeType}
                      loading={loading.companies}
                      size={cardSize}
                    />
                  </div>
                )
              })}
          </div>

        {/* Widget Configuration */}
        {isEditing && dashboardConfig && (
          <div className="card p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Configurează Widget-urile</h3>
              <div className="flex items-center space-x-2">
                {selectedWidgets.length > 0 && (
                  <>
                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {selectedWidgets.length} selectate
                    </span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          bulkChangeWidgetSize(e.target.value)
                          e.target.value = ''
                        }
                      }}
                      className="px-3 py-1 text-xs border border-purple-300 dark:border-purple-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Mărime pentru toate</option>
                      <option value="xs">XS</option>
                      <option value="small">S</option>
                      <option value="medium">M</option>
                      <option value="large">L</option>
                      <option value="extra-large">XL</option>
                    </select>
                    <button
                      onClick={bulkToggleWidgetVisibility}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Toggle Vizibilitate
                    </button>
                    <button
                      onClick={deselectAllWidgets}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Deselectează Tot
                    </button>
                  </>
                )}
                <button
                  onClick={selectedWidgets.length === dashboardConfig.widgets.length ? deselectAllWidgets : selectAllWidgets}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {selectedWidgets.length === dashboardConfig.widgets.length ? 'Deselectează Tot' : 'Selectează Tot'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {dashboardConfig.widgets
                .sort((a, b) => a.order - b.order)
                .map((widget, index) => (
                  <div key={widget.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedWidgets.includes(widget.id)
                      ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedWidgets.includes(widget.id)}
                        onChange={() => toggleWidgetSelection(widget.id)}
                        className="w-4 h-4 text-purple-600 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{widget.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => moveWidgetUp(widget.id)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-30"
                        title="Mută în sus"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveWidgetDown(widget.id)}
                        disabled={index === dashboardConfig.widgets.length - 1}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-30"
                        title="Mută în jos"
                      >
                        ↓
                      </button>
                      {/* Selector pentru mărimea widget-ului */}
                      <select
                        value={widgetSizes[widget.id] || 'medium'}
                        onChange={(e) => changeWidgetSize(widget.id, e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        title="Mărimea widget-ului"
                      >
                        <option value="xs">XS</option>
                        <option value="small">S</option>
                        <option value="medium">M</option>
                        <option value="large">L</option>
                        <option value="extra-large">XL</option>
                      </select>
                      
                      <button
                        onClick={() => toggleWidgetVisibility(widget.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          widget.visible 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={widget.visible ? "Ascunde widgetul" : "Afișează widgetul"}
                      >
                        {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Widgets - Render dinamic bazat pe ordinea din configurație */}
        <div className="dashboard-grid-widgets">
          {dashboardConfig && dashboardConfig.widgets
            .filter(w => w.visible)
            .sort((a, b) => a.order - b.order)
            .map(widget => {
              const widgetSize = widgetSizes[widget.id] || 'medium'
              const sizeClass = getWidgetSizeClass(widgetSize)
              
              return (
                <div key={widget.id} className={sizeClass}>
                  {(() => {
                    switch (widget.id) {
                      case 'quickActions':
                        return <QuickActions />
                      case 'recentActivity':
                        return <RecentActivity />
                      case 'databaseBackup':
                        return <DatabaseBackup compact={true} />
                      case 'currencyRate':
                        return <ONJNCurrencyRate />
                      case 'onjnCalendar':
                        return <ONJNCalendar />
                      case 'systemHealth':
                        return <SystemHealth />
                      case 'gamesLibrary':
                        return <GamesLibraryWidget />
                      default:
                        return null
                    }
                  })()}
                </div>
              )
            })
          }
        </div>

        {/* Performance Charts - Conditional Rendering */}
        {dashboardConfig && dashboardConfig.widgets.find(w => w.id === 'performanceCharts' && w.visible) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Performanță Sistem</h3>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl">
                <span className="font-semibold text-slate-700 dark:text-slate-300">CPU Usage</span>
                <span className="text-green-600 dark:text-green-400 font-bold">23%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Memory Usage</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">67%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Disk Usage</span>
                <span className="text-yellow-600 dark:text-yellow-400 font-bold">45%</span>
              </div>
            </div>
          </div>

          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Activitate Recentă</h3>
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Sistem pornit</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Acum 2 minute</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Backup completat</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Acum 1 oră</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Actualizare disponibilă</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Acum 3 ore</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        </div>
        )}
      </div>
    </Layout>
  )
}

export default Dashboard

