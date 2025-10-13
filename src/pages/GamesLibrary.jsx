import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { 
  Gamepad2, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye,
  Grid,
  List,
  Star,
  Clock,
  Zap
} from 'lucide-react'

const GamesLibrary = () => {
  const navigate = useNavigate()
  const { providers } = useData()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedVolatility, setSelectedVolatility] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name') // 'name', 'provider', 'volatility'

  // Mock data based on Google Sheets - will be replaced with real import
  const mockGamesData = [
    {
      game_id: '00000004-0000-5000-9000-000000000001',
      name: '10 Burning Heart',
      provider: 'Amusnet',
      provider_id: '00000005-dc86-47af-8013-c46b4c5105af',
      category: 'Slots',
      type: 'slots',
      product: 'Casino',
      classification: 'video slot',
      mechanic: 'rng',
      theme: 'fruits',
      volatility: 'low - medium',
      lines: 10,
      layout: '5x3',
      image_url: 'https://cdn.cashpot.ro/cashpot/t1/thumbnail_games/00000004-0000-5000-9000-000000000001.png'
    },
    {
      game_id: '00000004-0000-5000-9000-000000000002',
      name: '100 Burning Hot',
      provider: 'Amusnet',
      provider_id: '00000005-dc86-47af-8013-c46b4c5105af',
      category: 'Slots',
      type: 'slots',
      product: 'Casino',
      classification: 'video slot',
      mechanic: 'rng',
      theme: 'fruits',
      volatility: 'medium',
      lines: 100,
      layout: '5x4',
      image_url: 'https://cdn.cashpot.ro/cashpot/t1/thumbnail_games/00000004-0000-5000-9000-000000000002.png'
    },
    {
      game_id: '00000004-0000-5000-9000-000000000003',
      name: '100 Cats',
      provider: 'Amusnet',
      provider_id: '00000005-dc86-47af-8013-c46b4c5105af',
      category: 'Slots',
      type: 'slots',
      product: 'Casino',
      classification: 'video slot',
      mechanic: 'rng',
      theme: 'animals and nature and wildlife',
      volatility: 'low - medium',
      lines: 100,
      layout: '5x4',
      image_url: 'https://cdn.cashpot.ro/cashpot/t1/thumbnail_games/00000004-0000-5000-9000-000000000003.png'
    },
    {
      game_id: '00000004-0000-5000-9000-000000000005',
      name: '2 Dragons',
      provider: 'Amusnet',
      provider_id: '00000005-dc86-47af-8013-c46b4c5105af',
      category: 'Slots',
      type: 'slots',
      product: 'Casino',
      classification: 'video slot',
      mechanic: 'rng',
      theme: 'dragons and mythical creatures;asian cultures;oriental and asian prosperity',
      volatility: 'high',
      lines: 20,
      layout: '5x3',
      image_url: 'https://cdn.cashpot.ro/cashpot/t1/thumbnail_games/00000004-0000-5000-9000-000000000005.png'
    },
    {
      game_id: '00000004-0000-5000-9000-000000000099',
      name: 'Mini Burning Hot',
      provider: 'Egypt Quest',
      provider_id: '00000555-dc86-47af-8013-c46b4c5105af',
      category: 'Slots',
      type: 'slots',
      product: 'Casino',
      classification: 'n/a',
      mechanic: 'n/a',
      theme: 'n/a',
      volatility: 'n/a',
      lines: 5,
      layout: 'n/a',
      image_url: 'https://cdn.cashpot.ro/cashpot/t1/thumbnail_games/00000004-0000-5000-9000-000000000099.png'
    }
  ]

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/games')
      if (!response.ok) {
        throw new Error('Failed to load games')
      }
      const gamesData = await response.json()
      setGames(gamesData)
    } catch (error) {
      console.error('Error loading games:', error)
      // Fallback to mock data if API fails
      setGames(mockGamesData)
    } finally {
      setLoading(false)
    }
  }

  // Get unique values for filters
  const uniqueProviders = [...new Set(games.map(game => game.provider))]
  const uniqueVolatilities = [...new Set(games.map(game => game.volatility).filter(v => v && v !== 'n/a'))]
  const uniqueThemes = [...new Set(games.map(game => game.theme).filter(t => t && t !== 'n/a'))]

  // Filter games
  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesProvider = !selectedProvider || game.provider === selectedProvider
    const matchesVolatility = !selectedVolatility || game.volatility === selectedVolatility
    const matchesTheme = !selectedTheme || game.theme.includes(selectedTheme)
    
    return matchesSearch && matchesProvider && matchesVolatility && matchesTheme
  })

  // Sort games
  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case 'provider':
        return a.provider.localeCompare(b.provider)
      case 'volatility':
        const volatilityOrder = { 'low': 1, 'low - medium': 2, 'medium': 3, 'high': 4 }
        return (volatilityOrder[a.volatility] || 5) - (volatilityOrder[b.volatility] || 5)
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const getVolatilityColor = (volatility) => {
    switch (volatility) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'low - medium':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getVolatilityIcon = (volatility) => {
    switch (volatility) {
      case 'low':
        return <Clock className="w-3 h-3" />
      case 'low - medium':
        return <Zap className="w-3 h-3" />
      case 'medium':
        return <Star className="w-3 h-3" />
      case 'high':
        return <Zap className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const handleImportGames = () => {
    // TODO: Implement Google Sheets import
    console.log('Import games from Google Sheets')
  }

  const handleExportGames = () => {
    // TODO: Implement export functionality
    console.log('Export games library')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl shadow-lg shadow-purple-500/25">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Biblioteca Jocuri</h2>
              <p className="text-slate-600">Toate jocurile disponibile de la toți furnizorii</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportGames}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportă</span>
            </button>
            <button
              onClick={handleImportGames}
              className="btn-primary flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Importă din Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Caută jocuri..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Toți furnizorii</option>
            {uniqueProviders.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>

          {/* Volatility Filter */}
          <select
            value={selectedVolatility}
            onChange={(e) => setSelectedVolatility(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Toate volatilitățile</option>
            {uniqueVolatilities.map(volatility => (
              <option key={volatility} value={volatility}>{volatility}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="name">Sortare: Nume</option>
            <option value="provider">Sortare: Furnizor</option>
            <option value="volatility">Sortare: Volatilitate</option>
          </select>
        </div>

        {/* View Mode and Stats */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">
              {filteredGames.length} jocuri din {games.length} total
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Games Display */}
      <div className="card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Nu există jocuri</h3>
            <p className="text-slate-500">Importă jocurile din Google Sheets pentru a începe</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
            : 'space-y-4'
          }>
            {sortedGames.map((game) => (
              viewMode === 'grid' ? (
                <div key={game.game_id} className="group cursor-pointer" onClick={() => navigate(`/games/${game.game_id}`)}>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                      <img
                        src={game.image_url}
                        alt={game.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        style={{imageRendering: 'crisp-edges'}}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center" style={{display: 'none'}}>
                        <Gamepad2 className="w-8 h-8 text-purple-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {game.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          {game.provider}
                        </span>
                        {game.volatility && game.volatility !== 'n/a' && (
                          <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${getVolatilityColor(game.volatility)}`}>
                            {getVolatilityIcon(game.volatility)}
                            <span>{game.volatility}</span>
                          </span>
                        )}
                      </div>
                      {game.lines && game.lines !== 'n/a' && (
                        <div className="text-xs text-slate-500">
                          {game.lines} linii • {game.layout}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={game.game_id} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/games/${game.game_id}`)}>
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img
                      src={game.image_url}
                      alt={game.name}
                      className="max-w-full max-h-full object-contain"
                      style={{imageRendering: 'crisp-edges'}}
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center" style={{display: 'none'}}>
                      <Gamepad2 className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">{game.theme}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {game.provider}
                      </span>
                      {game.volatility && game.volatility !== 'n/a' && (
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${getVolatilityColor(game.volatility)}`}>
                          {getVolatilityIcon(game.volatility)}
                          <span>{game.volatility}</span>
                        </span>
                      )}
                      {game.lines && game.lines !== 'n/a' && (
                        <span className="text-xs text-slate-500">
                          {game.lines} linii
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/games/${game.game_id}`)
                    }}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GamesLibrary
