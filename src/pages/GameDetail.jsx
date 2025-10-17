import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import { formatGameMixName } from '../utils/gameMixFormatter'
import { 
  Gamepad2, 
  MapPin, 
  Building2, 
  Users, 
  BarChart3, 
  ArrowLeft,
  TrendingUp,
  Calendar,
  Clock,
  Zap,
  Star,
  Target,
  PieChart,
  Activity
} from 'lucide-react'

const GameDetail = () => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { slots, gameMixes, providers, companies, locations, cabinets } = useData()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gameStats, setGameStats] = useState(null)
  const [slotsUsingGame, setSlotsUsingGame] = useState([])

  useEffect(() => {
    loadGameDetails()
    findSlotsUsingGame()
  }, [gameId, slots, gameMixes])

  const findSlotsUsingGame = () => {
    if (!game || !slots || !gameMixes) return
    
    const slotsWithGame = []
    
    slots.forEach(slot => {
      if (slot.game_mix) {
        const gameMix = gameMixes.find(gm => gm.name === slot.game_mix || gm.id === slot.game_mix)
        if (gameMix && gameMix.games) {
          let games = []
          try {
            games = typeof gameMix.games === 'string' ? JSON.parse(gameMix.games) : gameMix.games
          } catch (e) {
            games = [gameMix.games]
          }
          
          if (games.includes(game.name)) {
            slotsWithGame.push({
              ...slot,
              gameMixName: gameMix.name,
              providerName: getProviderName(slot.provider),
              locationName: getLocationName(slot.location),
              cabinetName: getCabinetName(slot.cabinet)
            })
          }
        }
      }
    })
    
    setSlotsUsingGame(slotsWithGame)
  }

  const getProviderName = (providerId) => {
    const provider = providers?.find(p => p.id === providerId || p.name === providerId)
    return provider ? provider.name : providerId
  }

  const getLocationName = (locationId) => {
    const location = locations?.find(l => l.id === locationId || l.name === locationId)
    return location ? location.name : locationId
  }

  const getCabinetName = (cabinetId) => {
    const cabinet = cabinets?.find(c => c.id === cabinetId || c.name === cabinetId)
    return cabinet ? cabinet.name || cabinet.model : cabinetId
  }

  const loadGameDetails = async () => {
    setLoading(true)
    try {
      // Load game from API
      const response = await fetch(`/api/games/${gameId}`)
      if (!response.ok) {
        throw new Error('Game not found')
      }
      const gameData = await response.json()
      setGame(gameData)
      
      // Calculate game statistics
      calculateGameStats(gameData)
    } catch (error) {
      console.error('Error loading game details:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateGameStats = (gameData) => {
    // Find all slots that use this game through game mixes
    const gameSlots = slots.filter(slot => {
      if (!slot.game_mix) return false
      
      const gameMix = gameMixes.find(gm => gm.name === slot.game_mix || gm.id === slot.game_mix)
      if (!gameMix || !gameMix.games) return false
      
      let games = []
      try {
        games = typeof gameMix.games === 'string' ? JSON.parse(gameMix.games) : gameMix.games
      } catch (e) {
        games = [gameMix.games]
      }
      
      return games.includes(gameData.name)
    })

    // Group by location
    const locationStats = {}
    gameSlots.forEach(slot => {
      const location = slot.location || 'Unknown'
      if (!locationStats[location]) {
        locationStats[location] = {
          count: 0,
          cabinets: new Set(),
          gameMixes: new Set(),
          slots: []
        }
      }
      locationStats[location].count++
      locationStats[location].cabinets.add(slot.cabinet || 'Unknown')
      locationStats[location].gameMixes.add(slot.game_mix || 'None')
      locationStats[location].slots.push(slot)
    })

    // Group by cabinet
    const cabinetStats = {}
    gameSlots.forEach(slot => {
      const cabinet = slot.cabinet || 'Unknown'
      if (!cabinetStats[cabinet]) {
        cabinetStats[cabinet] = {
          count: 0,
          locations: new Set(),
          gameMixes: new Set(),
          slots: []
        }
      }
      cabinetStats[cabinet].count++
      cabinetStats[cabinet].locations.add(slot.location || 'Unknown')
      cabinetStats[cabinet].gameMixes.add(slot.game_mix || 'None')
      cabinetStats[cabinet].slots.push(slot)
    })

    // Group by game mix
    const gameMixStats = {}
    gameSlots.forEach(slot => {
      const gameMix = slot.game_mix || 'None'
      if (!gameMixStats[gameMix]) {
        gameMixStats[gameMix] = {
          count: 0,
          locations: new Set(),
          cabinets: new Set(),
          slots: []
        }
      }
      gameMixStats[gameMix].count++
      gameMixStats[gameMix].locations.add(slot.location || 'Unknown')
      gameMixStats[gameMix].cabinets.add(slot.cabinet || 'Unknown')
      gameMixStats[gameMix].slots.push(slot)
    })

    setGameStats({
      totalSlots: gameSlots.length,
      uniqueLocations: Object.keys(locationStats).length,
      uniqueCabinets: Object.keys(cabinetStats).length,
      uniqueGameMixes: Object.keys(gameMixStats).length,
      locationStats,
      cabinetStats,
      gameMixStats,
      allSlots: gameSlots
    })
  }

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
        return <Clock className="w-4 h-4" />
      case 'low - medium':
        return <Zap className="w-4 h-4" />
      case 'medium':
        return <Star className="w-4 h-4" />
      case 'high':
        return <Zap className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    )
  }

  if (!game) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Jocul nu a fost găsit</h3>
          <button
            onClick={() => navigate('/game-mixes/games-library')}
            className="btn-primary"
          >
            Înapoi la Biblioteca Jocuri
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/game-mixes/games-library')}
              className="flex items-center space-x-2 text-slate-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Biblioteca Jocuri</span>
            </button>
          </div>

          <div className="flex items-start space-x-6">
            {/* Game Image */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center">
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
                  <Gamepad2 className="w-16 h-16 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Game Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{game.name}</h1>
              <p className="text-slate-600 mb-4">{game.theme}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm text-slate-500 mb-1">Furnizor</div>
                  <div className="font-semibold text-slate-800">{game.provider}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm text-slate-500 mb-1">Linii</div>
                  <div className="font-semibold text-slate-800">{game.lines || 'N/A'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm text-slate-500 mb-1">Layout</div>
                  <div className="font-semibold text-slate-800">{game.layout || 'N/A'}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm text-slate-500 mb-1">Tip</div>
                  <div className="font-semibold text-slate-800">{game.classification}</div>
                </div>
              </div>

              {game.volatility && game.volatility !== 'n/a' && (
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${getVolatilityColor(game.volatility)}`}>
                  {getVolatilityIcon(game.volatility)}
                  <span className="font-medium">{game.volatility}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Statistics */}
        {gameStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl inline-block mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{gameStats.totalSlots}</h3>
              <p className="text-slate-600">Sloturi totale</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl inline-block mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{gameStats.uniqueLocations}</h3>
              <p className="text-slate-600">Locații</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl inline-block mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{gameStats.uniqueCabinets}</h3>
              <p className="text-slate-600">Cabinete</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl inline-block mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{gameStats.uniqueGameMixes}</h3>
              <p className="text-slate-600">Game Mixes</p>
            </div>
          </div>
        )}

        {/* Distribution Summary - 4 Columns */}
        {gameStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Locations */}
            {Object.keys(gameStats.locationStats).length > 0 && (
              <div className="card p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <span>Locații</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(gameStats.locationStats).map(([location, stats]) => (
                    <div key={location} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-semibold text-green-800 mb-2">{location}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-green-600">Sloturi:</span>
                          <span className="font-semibold text-green-800">{stats.count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600">Cabinete:</span>
                          <span className="font-semibold text-green-800">{stats.cabinets.size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600">Game Mixes:</span>
                          <span className="font-semibold text-green-800">{stats.gameMixes.size}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cabinets */}
            {Object.keys(gameStats.cabinetStats).length > 0 && (
              <div className="card p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-purple-500" />
                  <span>Cabinete</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(gameStats.cabinetStats).map(([cabinet, stats]) => (
                    <div key={cabinet} className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-3">
                      <h4 className="font-semibold text-purple-800 mb-2">{cabinet}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-600">Sloturi:</span>
                          <span className="font-semibold text-purple-800">{stats.count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-purple-600">Locații:</span>
                          <span className="font-semibold text-purple-800">{stats.locations.size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-purple-600">Game Mixes:</span>
                          <span className="font-semibold text-purple-800">{stats.gameMixes.size}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Mixes */}
            {Object.keys(gameStats.gameMixStats).length > 0 && (
              <div className="card p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <span>Game Mixes</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(gameStats.gameMixStats).map(([gameMix, stats]) => (
                    <div key={gameMix} className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3">
                      <h4 className="font-semibold text-orange-800 mb-2">{gameMix}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600">Sloturi:</span>
                          <span className="font-semibold text-orange-800">{stats.count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600">Locații:</span>
                          <span className="font-semibold text-orange-800">{stats.locations.size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600">Cabinete:</span>
                          <span className="font-semibold text-orange-800">{stats.cabinets.size}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Providers Summary */}
            {gameStats && gameStats.allSlots.length > 0 && (
              <div className="card p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <span>Furnizori</span>
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const providerStats = {}
                    gameStats.allSlots.forEach(slot => {
                      if (slot.provider) {
                        if (!providerStats[slot.provider]) {
                          providerStats[slot.provider] = { count: 0, locations: new Set(), cabinets: new Set() }
                        }
                        providerStats[slot.provider].count++
                        if (slot.location) providerStats[slot.provider].locations.add(slot.location)
                        if (slot.cabinet) providerStats[slot.provider].cabinets.add(slot.cabinet)
                      }
                    })
                    
                    return Object.entries(providerStats).map(([provider, stats]) => (
                      <div key={provider} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-2">{provider}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600">Sloturi:</span>
                            <span className="font-semibold text-blue-800">{stats.count}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600">Locații:</span>
                            <span className="font-semibold text-blue-800">{stats.locations.size}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600">Cabinete:</span>
                            <span className="font-semibold text-blue-800">{stats.cabinets.size}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Slots Table */}
        {gameStats && gameStats.allSlots.length > 0 && (
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span>Toate sloturile cu acest joc ({gameStats.allSlots.length})</span>
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Serial Number</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Locație</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Furnizor</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Cabinet</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Game Mix</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Denomination</th>
                  </tr>
                </thead>
                <tbody>
                  {gameStats.allSlots.map((slot) => (
                    <tr key={slot.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/slots/${slot.id}`)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline transition-colors"
                        >
                          {slot.serial_number || 'N/A'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{slot.location || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{slot.provider || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{slot.cabinet || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{formatGameMixName(slot.game_mix)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          slot.status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {slot.status || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{slot.denomination || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default GameDetail

