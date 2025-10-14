import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, TrendingUp, Eye, Zap } from 'lucide-react'

const GamesLibraryWidget = () => {
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    providers: 0,
    topGames: []
  })

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/games')
      if (response.ok) {
        const gamesData = await response.json()
        setGames(gamesData)
        
        // Calculate stats
        const uniqueProviders = [...new Set(gamesData.map(g => g.provider))]
        const topGames = gamesData.slice(0, 5) // Top 5 games
        
        setStats({
          total: gamesData.length,
          providers: uniqueProviders.length,
          topGames
        })
      }
    } catch (error) {
      console.error('Error loading games:', error)
    } finally {
      setLoading(false)
    }
  }

  const getVolatilityColor = (volatility) => {
    switch (volatility) {
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'low - medium':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Jocuri din Librărie</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Se încarcă...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg shadow-pink-500/25">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Jocuri din Librărie</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Top jocuri disponibile</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/game-mixes/games-library')}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Vezi Tot</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Jocuri</span>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Furnizori</span>
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.providers}</div>
        </div>
      </div>

      {/* Top Games List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Top 5 Jocuri</h4>
        {stats.topGames.map((game, index) => (
          <div
            key={game.game_id}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate(`/game-mixes/games-library/${game.game_id}`)}
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                #{index + 1}
              </div>
              {game.image_url ? (
                <img
                  src={game.image_url}
                  alt={game.name}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-white dark:border-slate-600 shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : null}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{game.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{game.provider}</div>
              </div>
            </div>
            {game.volatility && game.volatility !== 'n/a' && (
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getVolatilityColor(game.volatility)}`}>
                {game.volatility}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>Ultima actualizare: acum</span>
          <span className="font-medium text-pink-600 dark:text-pink-400">
            {stats.total} jocuri disponibile
          </span>
        </div>
      </div>
    </div>
  )
}

export default GamesLibraryWidget



