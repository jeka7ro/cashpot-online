import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { 
  Cherry, ArrowLeft, Gamepad2, MapPin, Target,
  Zap, Clock, Building2, BarChart3, Activity
} from 'lucide-react'

const getVolatilityColor = (volatility) => {
  if (!volatility) return 'bg-gray-100 text-gray-800';
  const v = volatility.toLowerCase();
  if (v.includes('low - medium')) return 'bg-blue-100 text-blue-800'
  if (v.includes('low')) return 'bg-green-100 text-green-800'
  if (v.includes('medium')) return 'bg-yellow-100 text-yellow-800'
  if (v.includes('high')) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

const getVolatilityIcon = (volatility) => {
  if (!volatility) return <Clock className="w-4 h-4" />;
  const v = volatility.toLowerCase();
  if (v.includes('high')) return <Zap className="w-4 h-4" />
  if (v.includes('medium')) return <Target className="w-4 h-4" />
  return <Clock className="w-4 h-4" />
}

const GameMixView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const handleEdit = () => {
    // Navigate to edit page or open modal
    // navigate(`/game-mixes/${id}/edit`)
  }

  const handleDelete = async () => {
    if (window.confirm('Ești sigur că vrei să ștergi acest game mix?')) {
      try {
        const response = await fetch(`/api/gameMixes/${id}`, { method: 'DELETE' })
        if (response.ok) {
          navigate('/game-mixes')
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete game mix');
        }
      } catch (error) {
        console.error('Error deleting game mix:', error)
        setError(error.message);
      }
    }
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/gameMixes/${id}/analytics`)
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch analytics')
        }
        
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [id])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Cherry className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Eroare la încărcare</h3>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/game-mixes')}
            className="btn-primary"
          >
            Înapoi la Game Mixes
          </button>
        </div>
      </Layout>
    )
  }

  const { mixDetails, statistics, gamesAnalysis } = data

  // Calculate Average RTP from games if specific mixture RTP is missing
  const calculateAverageRtp = (games) => {
    if (!games || games.length === 0) return null;
    let sum = 0;
    let validCount = 0;
    
    games.forEach(g => {
      // Look for rtp_id first (from CVT scan), fallback to rtp
      let valStr = g.rtp_id || g.rtp || '';
      if (typeof valStr === 'string' && valStr.includes('%')) {
        valStr = valStr.replace('%', '').replace(',', '.').trim();
      } else if (typeof valStr === 'string') {
        valStr = valStr.replace(',', '.').trim();
      }

      const val = parseFloat(valStr);
      if (!isNaN(val) && val > 0 && val <= 100) {
        sum += val;
        validCount++;
      }
    });

    if (validCount === 0) return null;
    return (sum / validCount).toFixed(2);
  };

  const averageRtp = calculateAverageRtp(gamesAnalysis);
  const displayRtp = mixDetails?.rtp ? `${mixDetails.rtp}%` : (averageRtp ? `${averageRtp}%` : 'N/A');
  const rtpLabel = mixDetails?.rtp ? 'RTP' : (averageRtp ? 'RTP (Medie Jocuri)' : 'RTP');

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/game-mixes')}
              className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Game Mixes</span>
            </button>
            <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${
              mixDetails.status === 'Activ' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {mixDetails.status}
            </span>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-1">
                <div className="p-2 bg-slate-100 rounded-md">
                   <Gamepad2 className="w-5 h-5 text-slate-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">{mixDetails.name}</h1>
              </div>
              <p className="text-sm text-slate-500 mb-5 ml-12">Furnizor: <span className="font-semibold text-slate-700">{mixDetails.provider}</span></p>
              
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 ml-12">
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">TOTAL JOCURI</div>
                  <div className="text-lg font-bold text-slate-800">{gamesAnalysis.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">DISPOZITIVE ACTIVE</div>
                  <div className="text-lg font-bold text-slate-800">{statistics.totalSlots}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">LOCAȚII FIZICE</div>
                  <div className="text-lg font-bold text-slate-800">{statistics.totalLocations}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">{rtpLabel}</div>
                  <div className="text-lg font-bold text-slate-800">{displayRtp}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">DENOMINARE</div>
                  <div className="text-lg font-bold text-slate-800">{mixDetails.denomination ? `${mixDetails.denomination} Lei` : 'N/A'}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">ALIAS (CVT)</div>
                  <div className="text-sm font-bold text-slate-800 truncate leading-snug" title={mixDetails.cvt_name || 'N/A'}>{mixDetails.cvt_name || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Games List Container */}
          <div className="bg-white border border-slate-200 rounded-lg flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center space-x-2 text-sm">
                <Gamepad2 className="w-4 h-4 text-slate-500" />
                <span>Analiza Jocurilor ({gamesAnalysis.length})</span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 shadow-sm z-10">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider w-8">#</th>
                    <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Nume Joc</th>
                    <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Specificații</th>
                    <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Cross-Referințe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gamesAnalysis.map((game, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 text-xs font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800 text-xs leading-none mb-1">{game.name || 'Joc Necunoscut'}</div>
                        <div className="text-[10px] text-slate-500">{game.theme || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {game.volatility && game.volatility !== 'n/a' && (
                            <span className={`inline-block w-max px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wide uppercase ${
                              game.volatility.toLowerCase().includes('high') ? 'border-red-200 text-red-700 bg-red-50' :
                              game.volatility.toLowerCase().includes('medium') ? 'border-amber-200 text-amber-700 bg-amber-50' :
                              'border-emerald-200 text-emerald-700 bg-emerald-50'
                            }`}>
                              Vol: {game.volatility}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-600 space-x-2">
                            <span title="Linii de plată">L: <strong className="text-slate-800">{game.lines || '-'}</strong></span>
                            <span title="RTP">RTP: <strong className="text-slate-800">
                              {game.rtp_id ? (game.rtp_id.includes('%') ? game.rtp_id : `${game.rtp_id}%`) : (game.rtp ? `${game.rtp}%` : '-')}
                            </strong></span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {game.appearsIn && game.appearsIn.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {game.appearsIn.map(otherMix => (
                              <span 
                                key={otherMix.id} 
                                onClick={() => navigate(`/game-mixes/${otherMix.id}`)}
                                className="bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors whitespace-nowrap"
                                title={`Click pentru a deschide ${otherMix.name}`}
                              >
                                {otherMix.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Exclusiv aici</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Locations Container */}
          <div className="bg-white border border-slate-200 rounded-lg flex flex-col h-[600px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center space-x-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Distribuție în Săli Fizice ({statistics.locations.length})</span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Locație Sala</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Oraș / Adresă</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider text-right">Dispozitive (Buc)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statistics.locations.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-slate-400 italic">
                        Nu există sloturi active în locații cu acest mix.
                      </td>
                    </tr>
                  )}
                  {statistics.locations.map((loc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{loc.location_name}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]" title={loc.city}>{loc.city || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-800 font-bold rounded-md min-w-[32px] h-6 px-2 text-xs">
                          {loc.slot_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}

export default GameMixView
