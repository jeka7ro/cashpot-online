import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { MapPin, Grid, Droplets, Activity, ArrowLeft, Settings, FileImage, Upload, Trash2, X } from 'lucide-react'
import DateRangeSelector, { QuickDateButtons } from '../components/DateRangeSelector'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const METRICS = [
  { id: 'ggr', label: 'GGR', description: 'Profit brut (IN - OUT)' },
  { id: 'drop', label: 'Drop mediu', description: 'IN / #zile / #slot' },
  { id: 'in', label: 'IN', description: 'Suma intrată (IN)' }
]

// PLANUL EXACT CRAIOVA - 73 POSTURI
// Coordonate EXACTE pentru fiecare număr de ordine, bazate pe planul PDF
const CRAIOVA_PLAN = {
  // Forma sălii (poligon cu pereții) - coordonate aproximative bazate pe plan
  roomShape: "M 50,50 L 1550,50 L 1550,850 L 50,850 Z", // Forma de bază - va fi ajustată
  
  // Poziții EXACTE pentru fiecare număr de ordine (73 posturi)
  // Extrase din planul PDF cu 73 POSTURI
  positions: {
    // EGT VIP (stânga sus)
    4001: { x: 180, y: 200 },
    4002: { x: 220, y: 200 },
    4062: { x: 260, y: 200 },
    4100: { x: 300, y: 200 },
    4101: { x: 340, y: 200 },
    4102: { x: 380, y: 200 },
    
    // EGT P27 (sus, centru-stânga) - 4018-4023
    4018: { x: 500, y: 150 },
    4019: { x: 540, y: 150 },
    4020: { x: 580, y: 150 },
    4021: { x: 620, y: 150 },
    4022: { x: 660, y: 150 },
    4023: { x: 700, y: 150 },
    
    // EGT S LINE (sus, centru-dreapta) - 4013-4017, 4024-4026
    4013: { x: 740, y: 150 },
    4014: { x: 780, y: 150 },
    4015: { x: 820, y: 150 },
    4016: { x: 860, y: 150 },
    4017: { x: 900, y: 150 },
    4024: { x: 940, y: 150 },
    4025: { x: 980, y: 150 },
    4026: { x: 1020, y: 150 },
    
    // EGT G 55 C VIP (dreapta sus) - 4080-4082
    4080: { x: 1100, y: 180 },
    4081: { x: 1140, y: 180 },
    4082: { x: 1180, y: 180 },
    
    // AMUSNET (centru-stânga) - 4097-4099
    4097: { x: 500, y: 280 },
    4098: { x: 540, y: 280 },
    4099: { x: 580, y: 280 },
    
    // EGT G32 VIP (centru) - 4050-4053
    4050: { x: 700, y: 280 },
    4051: { x: 740, y: 280 },
    4052: { x: 780, y: 280 },
    4053: { x: 820, y: 280 },
    
    // EGT P32 (centru-dreapta, vertical) - 4031-4040
    4031: { x: 900, y: 300 },
    4032: { x: 940, y: 300 },
    4033: { x: 900, y: 340 },
    4034: { x: 940, y: 340 },
    4035: { x: 900, y: 380 },
    4036: { x: 940, y: 380 },
    4037: { x: 900, y: 420 },
    4038: { x: 940, y: 420 },
    4039: { x: 900, y: 460 },
    4040: { x: 940, y: 460 },
    
    // EGT P27 (centru, vertical) - 4003-4008
    4003: { x: 1100, y: 450 },
    4004: { x: 1140, y: 450 },
    4005: { x: 1100, y: 490 },
    4006: { x: 1140, y: 490 },
    4007: { x: 1100, y: 530 },
    4008: { x: 1140, y: 530 },
    
    // V-LINE / ALFA / LIVE (dreapta) - 4092-4096
    4092: { x: 1200, y: 500 },
    4093: { x: 1240, y: 500 },
    4094: { x: 1200, y: 540 },
    4095: { x: 1240, y: 540 },
    4096: { x: 1200, y: 580 },
    
    // EGT G 55 BELL LINK (jos dreapta) - 4083-4086
    4083: { x: 1100, y: 650 },
    4084: { x: 1140, y: 650 },
    4085: { x: 1180, y: 650 },
    4086: { x: 1220, y: 650 },
    
    // VIP LOUNGE CF 2 623A VIP EAGLE (jos centru) - 4046-4047, 4076-4079
    4046: { x: 800, y: 650 },
    4047: { x: 840, y: 650 },
    4076: { x: 880, y: 650 },
    4077: { x: 920, y: 650 },
    4078: { x: 960, y: 650 },
    4079: { x: 1000, y: 650 },
    
    // CT TECH. NEXT (jos stânga) - 4009-4012
    4009: { x: 200, y: 650 },
    4010: { x: 240, y: 650 },
    4011: { x: 280, y: 650 },
    4012: { x: 320, y: 650 },
    
    // EGT P32/30 (stânga, vertical) - 4027-4030
    4027: { x: 400, y: 500 },
    4028: { x: 440, y: 500 },
    4029: { x: 400, y: 540 },
    4030: { x: 440, y: 540 },
    
    // EGT G27/32 (stânga jos) - 4063-4067
    4063: { x: 300, y: 600 },
    4064: { x: 340, y: 600 },
    4065: { x: 380, y: 600 },
    4066: { x: 420, y: 600 },
    4067: { x: 460, y: 600 },
    
    // CT TECH. NEXT (stânga jos) - 4058-4061
    4058: { x: 200, y: 600 },
    4059: { x: 240, y: 600 },
    4060: { x: 280, y: 600 },
    4061: { x: 320, y: 600 },
    
    // EGT P40 (stânga mijloc) - 4068-4069, 4070-4075
    4068: { x: 300, y: 500 },
    4069: { x: 340, y: 500 },
    4070: { x: 380, y: 500 },
    4071: { x: 420, y: 500 },
    4072: { x: 460, y: 500 },
    4073: { x: 500, y: 500 },
    4074: { x: 540, y: 500 },
    4075: { x: 580, y: 500 }
  }
}

const IncasariFloorplan = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [locations, setLocations] = useState([])
  const [location, setLocation] = useState('')
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    // Implicit: LUNA CURENTĂ (planul trebuie să fie mereu pe luna în curs)
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const formatDateLocal = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return { startDate: formatDateLocal(start), endDate: formatDateLocal(end) }
  })
  const [metric, setMetric] = useState('ggr')
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [thresholds, setThresholds] = useState(() => {
    const defaults = { t1: 500, t2: 1000, t3: 2000, t4: 3000 }
    try {
      const saved = localStorage.getItem('incasari_floorplan_thresholds')
      if (!saved) return defaults
      const parsed = JSON.parse(saved)
      return { ...defaults, ...parsed }
    } catch {
      return defaults
    }
  })

  // Planuri floorplan încărcate (PDF/PNG) pentru fiecare locație
  const [floorplanFiles, setFloorplanFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_floorplan_files')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  
  // Praguri culori (array de obiecte: {value, color})
  const [colorThresholds, setColorThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('incasari_floorplan_color_thresholds')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // Migrare: dacă sunt doar numere, le convertim în obiecte
          if (typeof parsed[0] === 'number') {
            const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#fbbf24']
            return parsed.map((val, idx) => ({ value: val, color: colors[idx % colors.length] }))
          }
          return parsed
        }
      }
      return [
        { value: 500, color: '#ef4444' },
        { value: 1000, color: '#f97316' },
        { value: 2000, color: '#22c55e' },
        { value: 3000, color: '#8b5cf6' }
      ]
    } catch {
      return [
        { value: 500, color: '#ef4444' },
        { value: 1000, color: '#f97316' },
        { value: 2000, color: '#22c55e' },
        { value: 3000, color: '#8b5cf6' }
      ]
    }
  })
  
  const [positions, setPositions] = useState({})
  const [dragState, setDragState] = useState(null)
  const [summary, setSummary] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.permissions?.incasari) {
      toast.error('Nu aveți permisiuni pentru pagina Floorplan Încasări')
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Ascultă schimbările în planurile încărcate
  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('incasari_floorplan_files')
        setFloorplanFiles(saved ? JSON.parse(saved) : {})
      } catch {
        setFloorplanFiles({})
      }
    }
    window.addEventListener('incasari-floorplan-changed', handler)
    return () => window.removeEventListener('incasari-floorplan-changed', handler)
  }, [])

  // Helper pentru normalizarea numelor de locație (elimină sufixul E.S)
  const normalizeLocationName = (name) => {
    if (!name) return ''
    let n = name.toString().trim()
    n = n.replace(/\s+E\.?S\.?$/i, '')
    return n.trim()
  }

  // Load locations from incasari filters metadata
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const resp = await axios.get('/api/incasari/filters-metadata')
        if (resp.data?.success) {
          const rawLocs = resp.data.locations || []

          // Aplică filtrele de locații vizibile din setări (incasari_visible_locations)
          let visibleLocations = null
          try {
            const saved = localStorage.getItem('incasari_visible_locations')
            if (saved) {
              const parsed = JSON.parse(saved)
              if (Array.isArray(parsed) && parsed.length > 0) {
                visibleLocations = new Set(parsed.map((l) => normalizeLocationName(l)))
              }
            }
          } catch (e) {
            // ignore parse errors, fall back to all locations
          }

          const normalized = rawLocs
            .map((l) => normalizeLocationName(l))
            .filter(Boolean)

          const filteredByVisibility = normalized.filter((loc) =>
            visibleLocations ? visibleLocations.has(loc) : true
          )

          const uniqueNormalized = Array.from(new Set(filteredByVisibility)).sort()

          setLocations(uniqueNormalized)
          if (!location && uniqueNormalized.length > 0) {
            setLocation(uniqueNormalized[0])
          }
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea locațiilor pentru floorplan:', error)
      }
    }
    loadMeta()
  }, [location])

  // Sumar KPI pentru locația curentă și perioada selectată (IN, GGR, WIN/BET%, sloturi)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        if (!location || !dateRange.startDate || !dateRange.endDate) return
        const resp = await axios.get('/api/incasari/summary', {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            location,
            // pentru numărul de sloturi, vrem DOAR locația curentă, nu toate 310
            includeLocations: location
          }
        })
        if (resp.data?.success) {
          setSummary({
            totalIn: resp.data.totalIn || 0,
            totalGgr: resp.data.totalProfit || 0,
            winBetPercent: resp.data.winBetPercent || 0,
            slotsCount: resp.data.slotsCount || 0
          })
        } else {
          setSummary(null)
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea sumarului pentru floorplan:', error)
        setSummary(null)
      }
    }
    fetchSummary()
  }, [location, dateRange])

  // Încarcă pozițiile salvate pentru locația curentă
  useEffect(() => {
    const loc = normalizeLocationName(location)
    if (!loc) {
      setPositions({})
      return
    }
    try {
      const saved = localStorage.getItem(`incasari_floorplan_positions_${loc}`)
      if (!saved) {
        setPositions({})
        return
      }
      const parsed = JSON.parse(saved)
      setPositions(parsed || {})
    } catch {
      setPositions({})
    }
  }, [location])

  // Ascultă modificările pragurilor din Setări Încasări
  useEffect(() => {
    const handler = () => {
      const defaults = { t1: 500, t2: 1000, t3: 2000, t4: 3000 }
      try {
        const saved = localStorage.getItem('incasari_floorplan_thresholds')
        if (!saved) {
          setThresholds(defaults)
          return
        }
        const parsed = JSON.parse(saved)
        setThresholds({ ...defaults, ...parsed })
      } catch {
        setThresholds(defaults)
      }
    }
    window.addEventListener('incasari-floorplan-thresholds-changed', handler)
    return () => window.removeEventListener('incasari-floorplan-thresholds-changed', handler)
  }, [])

  // Load floorplan data for selected location + period
  useEffect(() => {
    const fetchFloorplan = async () => {
      try {
        if (!location || !dateRange.startDate || !dateRange.endDate) return
        setLoading(true)
        const resp = await axios.get('/api/incasari/floorplan-data', {
          params: {
            location,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        })
        if (resp.data?.success) {
          setSlots(resp.data.tiles || [])
        } else {
          setSlots([])
        }
      } catch (error) {
        console.error('❌ Eroare la încărcarea datelor pentru floorplan:', error)
        toast.error('Nu am putut încărca datele pentru floorplan')
        setSlots([])
      } finally {
        setLoading(false)
      }
    }
    fetchFloorplan()
  }, [location, dateRange])

  const handleDateChange = (range) => {
    setDateRange({ startDate: range.startDate, endDate: range.endDate })
  }

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0'
    const num = Number(value)
    if (Number.isNaN(num)) return '0'
    return num.toLocaleString('ro-RO', { maximumFractionDigits: 0 })
  }

  const formatPercent = (value) => {
    const num = Number(value) || 0
    return num.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const metricInfo = useMemo(
    () => METRICS.find((m) => m.id === metric) || METRICS[0],
    [metric]
  )

  const enrichedSlots = useMemo(() => {
    if (!slots || slots.length === 0) return []
    
    // FILTRU: Excludem sloturile cu totalIn = 0 sau drop = 0 (nu au avut încasări reale)
    const slotsWithData = slots.filter((s) => {
      const totalIn = Number(s.totalIn || 0)
      const days = Number(s.daysCount || 0)
      const slotsCount = Number(s.slotsCount || 1)
      const drop = days > 0 && slotsCount > 0 ? totalIn / days / slotsCount : 0
      // Doar sloturile cu încasări reale
      return totalIn > 0 && drop > 0 && days > 0
    })
    
    if (slotsWithData.length === 0) return []
    
    let min = Infinity
    let max = -Infinity

    const values = slotsWithData.map((s) => {
      const ggr = Number(s.totalGgr || 0)
      const totalIn = Number(s.totalIn || 0)
      const days = Number(s.daysCount || 0)
      const slotsCount = Number(s.slotsCount || 1)
      const drop =
        days > 0 && slotsCount > 0 ? totalIn / days / slotsCount : 0
      let v = 0
      if (metric === 'ggr') v = ggr
      else if (metric === 'drop') v = drop
      else v = totalIn
      if (v < min) min = v
      if (v > max) max = v
      return { ...s, ggr, totalIn, drop: drop, metricValue: v }
    })

    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      min = 0
      max = Math.max(...values.map((v) => v.metricValue), 1)
    }

    return values.map((s, index) => {
      const ratio =
        max > min ? Math.max(0, (s.metricValue - min) / (max - min)) : 0
      const cols = 8
      const col = index % cols
      const row = Math.floor(index / cols)

      const locNorm = normalizeLocationName(s.location || location)
      const key = `${locNorm}_${s.order || s.machineId}`

      let customCoords = {}

      // Poziție salvată manual (drag & drop) – singura sursă de coordonate custom.
      const saved = positions[key]
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        customCoords = { x: saved.x, y: saved.y }
      }

      return { ...s, ratio, row, col, key, ...customCoords }
    })
  }, [slots, metric, positions, location])

  // Dimensiuni SVG - se adaptează la planul încărcat
  // Dacă planul este încărcat, folosim dimensiunile lui, altfel default
  const svgWidth = 1600
  const svgHeight = 900
  const tileWidth = 100  // Mai mic pentru a nu acoperi planul
  const tileHeight = 70  // Mai mic pentru a nu acoperi planul

  const getColorForMetric = (value) => {
    const v = Number(value) || 0
    
    // Sortăm pragurile crescător
    const sortedThresholds = [...colorThresholds].sort((a, b) => a.value - b.value)
    
    // Dacă nu avem praguri, returnăm o culoare default
    if (sortedThresholds.length === 0) return '#6b7280' // gri
    
    // Dacă valoarea e sub primul prag, returnăm o culoare default (gri închis)
    if (v < sortedThresholds[0].value) return '#374151'
    
    // Găsim pragul corespunzător: valoarea trebuie să fie >= prag curent și < prag următor
    for (let i = 0; i < sortedThresholds.length; i++) {
      const currentThreshold = sortedThresholds[i]
      const nextThreshold = sortedThresholds[i + 1]
      
      // Dacă suntem la ultimul prag și valoarea e >= el, returnăm culoarea lui
      if (!nextThreshold && v >= currentThreshold.value) {
        return currentThreshold.color
      }
      
      // Dacă valoarea e între pragul curent și următorul, returnăm culoarea pragului curent
      if (v >= currentThreshold.value && nextThreshold && v < nextThreshold.value) {
        return currentThreshold.color
      }
    }
    
    // Fallback (nu ar trebui să ajungem aici)
    return sortedThresholds[sortedThresholds.length - 1].color
  }

  const getSvgPoint = (svgEl, evt) => {
    const rect = svgEl.getBoundingClientRect()
    const x = ((evt.clientX - rect.left) / rect.width) * svgWidth
    const y = ((evt.clientY - rect.top) / rect.height) * svgHeight
    return { x, y }
  }

  const handleDragStart = (evt, slot) => {
    if (!evt || !evt.currentTarget) return
    const svgEl = evt.currentTarget.ownerSVGElement
    if (!svgEl) return
    evt.preventDefault()
    const point = getSvgPoint(svgEl, evt)
    const currentX = slot.x ?? 40 + slot.col * (tileWidth + 10)
    const currentY = slot.y ?? 30 + slot.row * (tileHeight + 20)
    setDragState({
      key: slot.key,
      svgEl,
      offsetX: point.x - currentX,
      offsetY: point.y - currentY
    })
  }

  const handleDragMove = (evt) => {
    if (!dragState || !dragState.svgEl) return
    const point = getSvgPoint(dragState.svgEl, evt)
    const newX = point.x - dragState.offsetX
    const newY = point.y - dragState.offsetY
    setPositions((prev) => ({
      ...prev,
      [dragState.key]: { x: newX, y: newY }
    }))
  }

  const handleDragEnd = () => {
    if (!dragState) return
    const locNorm = normalizeLocationName(location)
    if (locNorm) {
      try {
        localStorage.setItem(
          `incasari_floorplan_positions_${locNorm}`,
          JSON.stringify(positions)
        )
      } catch {
        // ignore
      }
    }
    setDragState(null)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/incasari')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold">Înapoi la Încasări</span>
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <Grid className="w-5 h-5 text-emerald-500" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Floorplan Încasări
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Culoare pe slot în funcție de {metricInfo.label.toLowerCase()} pentru perioada selectată.
              </p>
            </div>
          </div>
        </div>

        {/* Filtre timp + filtre locație/metrică (layout ca în pagina Încasări) */}
        <div className="card p-6 space-y-3 relative z-10">
          {/* Rând 1: butoane perioadă rapidă (stânga) + filtre (dreapta) */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Perioadă
              </label>
              <QuickDateButtons onChange={handleDateChange} />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Locație
                </label>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-900/60 text-slate-100 text-xs border border-slate-700 hover:bg-slate-800/80 h-[38px] w-56"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Culori după
                </label>
                <div className="flex items-center space-x-2">
                  <Droplets className="w-4 h-4 text-sky-400" />
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-900/60 text-slate-100 text-xs border border-slate-700 hover:bg-slate-800/80 h-[38px] w-40"
                  >
                    {METRICS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Floorplan - Setări
                </label>
                <button
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-slate-900/60 text-slate-100 text-xs border border-slate-700 hover:bg-slate-800/80 h-[38px]"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Setări
                </button>
              </div>
            </div>
          </div>
          {/* Rând 2: selector de interval (luni/trimestre/zile) */}
          <div className="w-full max-w-xl">
            <DateRangeSelector
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-3">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>
              Verde închis = {metricInfo.label.toLowerCase()} mare, verde deschis = {metricInfo.label.toLowerCase()} mic.
            </span>
          </p>
        </div>

        {/* Carduri KPI IN / GGR / WIN/BET% / Sloturi active – centrate */}
        {summary && (
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="px-6 py-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-100 text-center min-w-[140px]">
              <div className="font-semibold text-xs text-slate-400 mb-1">IN</div>
              <div className="text-base font-bold text-emerald-400">
                {formatNumber(summary.totalIn)} RON
              </div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-100 text-center min-w-[140px]">
              <div className="font-semibold text-xs text-slate-400 mb-1">GGR</div>
              <div className="text-base font-bold text-emerald-400">
                {formatNumber(summary.totalGgr)} RON
              </div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-100 text-center min-w-[140px]">
              <div className="font-semibold text-xs text-slate-400 mb-1">WIN/BET%</div>
              <div className="text-base font-bold text-sky-300">
                {formatPercent(summary.winBetPercent)}%
              </div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-100 text-center min-w-[140px]">
              <div className="font-semibold text-xs text-slate-400 mb-1">Sloturi active</div>
              <div className="text-base font-bold text-amber-300">
                {formatNumber(summary.slotsCount)}
              </div>
            </div>
          </div>
        )}

        {/* Floorplan SVG */}
        <div className="card p-6">
          {loading ? (
            <div className="text-center text-slate-400">Se încarcă datele pentru floorplan...</div>
          ) : !floorplanFiles[location] ? (
            <div className="text-center py-12">
              <FileImage className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                Nu ai încărcat un plan pentru <strong>{location}</strong>.
              </p>
              <p className="text-slate-500 text-sm mb-4">
                Folosește butonul <strong>"Încarcă plan"</strong> de sus pentru a adăuga un fișier PDF sau PNG cu planul sălii.
              </p>
            </div>
          ) : enrichedSlots.length === 0 ? (
            <div className="text-center text-slate-400">
              Nu există date de încasări pentru locația selectată în perioada aceasta.
            </div>
          ) : !floorplanFiles[location] ? (
            <div className="text-center py-12">
              <FileImage className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                Nu ai încărcat un plan pentru <strong>{location}</strong>.
              </p>
              <p className="text-slate-500 text-sm mb-4">
                Folosește butonul <strong>"Setări"</strong> de sus pentru a încărca planul PDF/PNG al sălii.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-200">
                <strong>💡 Instrucțiuni:</strong> Planul este afișat EXACT ca în PDF. <strong>Trage sloturile din panoul lateral EXACT pe pozițiile corespunzătoare din plan</strong>, bazat pe numărul de ordine (Ord XXXX). Pozițiile se salvează automat.
              </div>
              <div className="flex gap-4">
                {/* Panel lateral cu sloturile nepoziționate */}
                {enrichedSlots.filter((slot) => {
                  const locNorm = normalizeLocationName(slot.location || location)
                  const key = `${locNorm}_${slot.order || slot.machineId}`
                  const saved = positions[key]
                  return !saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)
                }).length > 0 && (
                  <div className="w-64 bg-slate-900/60 rounded-xl border border-slate-700 p-4 max-h-[600px] overflow-y-auto">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">Sloturi de poziționat ({enrichedSlots.filter((slot) => {
                      const locNorm = normalizeLocationName(slot.location || location)
                      const key = `${locNorm}_${slot.order || slot.machineId}`
                      const saved = positions[key]
                      return !saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)
                    }).length})</h3>
                    <div className="space-y-2">
                      {enrichedSlots
                        .filter((slot) => {
                          const locNorm = normalizeLocationName(slot.location || location)
                          const key = `${locNorm}_${slot.order || slot.machineId}`
                          const saved = positions[key]
                          return !saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)
                        })
                        .map((slot) => {
                          const baseColor = getColorForMetric(
                            metric === 'ggr' ? slot.ggr : metric === 'drop' ? slot.drop : slot.totalIn
                          )
                          return (
                            <div
                              key={slot.machineId || slot.serialNumber}
                              className="p-2 rounded-lg border border-slate-600 cursor-grab active:cursor-grabbing"
                              style={{ backgroundColor: baseColor + '40', borderColor: baseColor }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('slot', JSON.stringify({ order: slot.order, machineId: slot.machineId, key: `${normalizeLocationName(slot.location || location)}_${slot.order || slot.machineId}` }))
                              }}
                            >
                              <div className="text-xs font-bold text-white">
                                {slot.order ? `Ord ${slot.order}` : `ID ${slot.machineId}`}
                              </div>
                              <div className="text-[10px] text-slate-300">
                                SN: {slot.serialNumber ? slot.serialNumber.substring(slot.serialNumber.length - 4) : 'N/A'}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
                <div className="flex-1 w-full overflow-auto">
              <svg
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="bg-white rounded-2xl border-2 border-slate-400"
                style={{ minHeight: '600px', backgroundColor: '#ffffff' }}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onDrop={(e) => {
                  e.preventDefault()
                  const slotData = e.dataTransfer.getData('slot')
                  if (slotData) {
                    try {
                      const slot = JSON.parse(slotData)
                      const svgEl = e.currentTarget
                      const rect = svgEl.getBoundingClientRect()
                      const x = ((e.clientX - rect.left) / rect.width) * svgWidth
                      const y = ((e.clientY - rect.top) / rect.height) * svgHeight
                      setPositions((prev) => {
                        const next = { ...prev, [slot.key]: { x, y } }
                        const locNorm = normalizeLocationName(location)
                        try {
                          localStorage.setItem(`incasari_floorplan_positions_${locNorm}`, JSON.stringify(next))
                        } catch {}
                        return next
                      })
                      toast.success(`Slot ${slot.order || slot.machineId} poziționat`)
                    } catch (err) {
                      console.error('Error dropping slot:', err)
                    }
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                }}
              >
                {/* Planul EXACT Craiova - desenat de la zero */}
                {location === 'Craiova' ? (
                  <>
                    {/* Fundal alb */}
                    <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#ffffff" />
                    
                    {/* Forma sălii - pereții (poligon neregulat bazat pe plan) */}
                    <path
                      d="M 50,50 L 1550,50 L 1550,750 L 50,750 Z"
                      fill="#f8fafc"
                      stroke="#cbd5e1"
                      strokeWidth="4"
                    />
                    
                    {/* Zona VIP LOUNGE (jos centru) */}
                    <rect x="750" y="700" width="300" height="100" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2" opacity="0.4" />
                    <text x="900" y="750" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="600">VIP LOUNGE</text>
                    
                    {/* Zona EGT P32 (centru-dreapta, vertical) */}
                    <rect x="850" y="250" width="150" height="250" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
                    <text x="925" y="280" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="600" transform="rotate(-90 925 280)">EGT P32</text>
                    
                    {/* Zona EGT P27 (sus, orizontal) */}
                    <rect x="450" y="100" width="600" height="80" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" opacity="0.4" />
                    <text x="750" y="140" textAnchor="middle" fill="#15803d" fontSize="12" fontWeight="600">EGT P27 / S LINE</text>
                    
                    {/* Zona EGT VIP (stânga sus) */}
                    <rect x="150" y="150" width="250" height="80" fill="#fef2f2" stroke="#ef4444" strokeWidth="2" opacity="0.4" />
                    <text x="275" y="190" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">EGT VIP</text>
                    
                    {/* Zona EGT G 55 C VIP (dreapta sus) */}
                    <rect x="1080" y="130" width="200" height="100" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" opacity="0.4" />
                    <text x="1180" y="180" textAnchor="middle" fill="#6b21a8" fontSize="11" fontWeight="600">EGT G 55 C VIP</text>
                    
                    {/* Zona AMUSNET (centru-stânga) */}
                    <rect x="480" y="240" width="150" height="80" fill="#fff7ed" stroke="#f97316" strokeWidth="2" opacity="0.4" />
                    <text x="555" y="280" textAnchor="middle" fill="#9a3412" fontSize="12" fontWeight="600">AMUSNET</text>
                    
                    {/* Zona EGT G32 VIP (centru) */}
                    <rect x="680" y="240" width="120" height="80" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" opacity="0.4" />
                    <text x="740" y="280" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600">EGT G32 VIP</text>
                    
                    {/* Zona CT TECH. NEXT (jos stânga) */}
                    <rect x="180" y="600" width="200" height="80" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" opacity="0.4" />
                    <text x="280" y="640" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">CT TECH. NEXT</text>
                    
                    {/* Zona EGT G 55 BELL LINK (jos dreapta) */}
                    <rect x="1080" y="600" width="200" height="80" fill="#fef3c7" stroke="#eab308" strokeWidth="2" opacity="0.4" />
                    <text x="1180" y="640" textAnchor="middle" fill="#854d0e" fontSize="11" fontWeight="600">EGT G 55 BELL LINK</text>
                  </>
                ) : floorplanFiles[location] && floorplanFiles[location].dataUrl ? (
                  <image
                    href={floorplanFiles[location].dataUrl}
                    x="0"
                    y="0"
                    width={svgWidth}
                    height={svgHeight}
                    preserveAspectRatio="xMidYMid meet"
                    opacity="1"
                  />
                ) : (
                  <>
                    <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#ffffff" />
                    <text
                      x={svgWidth / 2}
                      y={svgHeight / 2}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="20"
                      fontWeight="600"
                    >
                      Planul pentru {location} nu este disponibil
                    </text>
                  </>
                )}
                {/* Sloturile - prioritate la pozițiile salvate manual, apoi coordonatele exacte pentru Craiova */}
                {enrichedSlots
                  .map((slot) => {
                    const locNorm = normalizeLocationName(slot.location || location)
                    const key = `${locNorm}_${slot.order || slot.machineId}`
                    const saved = positions[key]
                    
                    let x, y
                    let hasPosition = false
                    
                    // PRIORITATE: Poziție salvată manual (drag & drop)
                    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
                      x = saved.x
                      y = saved.y
                      hasPosition = true
                    } 
                    // Pentru Craiova: coordonate EXACTE din plan (doar dacă nu există poziție salvată)
                    else if (location === 'Craiova' && slot.order && CRAIOVA_PLAN.positions[slot.order]) {
                      const exactPos = CRAIOVA_PLAN.positions[slot.order]
                      x = exactPos.x
                      y = exactPos.y
                      hasPosition = true
                    }
                    
                    // Dacă nu are poziție, nu afișăm slotul
                    if (!hasPosition) {
                      return null
                    }
                    
                    const baseColor = getColorForMetric(
                      metric === 'ggr' ? slot.ggr : metric === 'drop' ? slot.drop : slot.totalIn
                    )
                    const fill = baseColor

                    return (
                    <g
                      key={slot.machineId || slot.serialNumber}
                      transform={`translate(${x},${y})`}
                      style={{ cursor: 'grab' }}
                      onMouseDown={(evt) => handleDragStart(evt, slot)}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={tileWidth}
                        height={tileHeight}
                        rx={8}
                        ry={8}
                        fill={fill}
                        fillOpacity="0.85"
                        stroke="#1e293b"
                        strokeWidth={2}
                      />
                      {/* Număr ordine - cel mai important */}
                      <text
                        x={tileWidth / 2}
                        y={18}
                        fill="#ffffff"
                        fontSize={12}
                        fontWeight="700"
                        textAnchor="middle"
                        stroke="#000000"
                        strokeWidth="0.5"
                      >
                        {slot.order ? `Ord ${slot.order}` : `ID ${slot.machineId}`}
                      </text>
                      {/* SN - scurtat */}
                      <text
                        x={tileWidth / 2}
                        y={32}
                        fill="#f1f5f9"
                        fontSize={9}
                        fontWeight="600"
                        textAnchor="middle"
                        stroke="#000000"
                        strokeWidth="0.3"
                      >
                        SN: {slot.serialNumber ? slot.serialNumber.substring(slot.serialNumber.length - 4) : 'N/A'}
                      </text>
                      {/* Drop - cea mai importantă metrică pentru floorplan */}
                      <text
                        x={tileWidth / 2}
                        y={48}
                        fill="#fbbf24"
                        fontSize={10}
                        fontWeight="700"
                        textAnchor="middle"
                        stroke="#000000"
                        strokeWidth="0.3"
                      >
                        {formatNumber(Math.round(slot.drop || 0))} RON/zi
                      </text>
                      {/* GGR - mic */}
                      <text
                        x={tileWidth / 2}
                        y={62}
                        fill="#a5b4fc"
                        fontSize={9}
                        fontWeight="600"
                        textAnchor="middle"
                        stroke="#000000"
                        strokeWidth="0.3"
                      >
                        GGR: {formatNumber(slot.ggr)} RON
                      </text>
                    </g>
                  )
                })
                .filter(Boolean)}
              </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Setări Floorplan */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
              {/* Header modal */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-emerald-400" />
                  Setări Floorplan
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Upload planuri pentru TOATE locațiile */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <FileImage className="w-4 h-4 mr-2 text-emerald-400" />
                    Planuri sală pentru toate locațiile
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Încarcă câte un fișier PDF sau PNG cu planul sălii pentru fiecare locație.
                  </p>
                  
                  <div className="space-y-3">
                    {locations.map((loc) => {
                      const hasFile = floorplanFiles[loc]
                      return (
                        <div
                          key={loc}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700"
                        >
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-slate-200 min-w-[100px]">
                            {loc}
                          </span>
                          {hasFile && (
                            <span className="text-xs text-slate-400 flex-1 truncate">
                              {floorplanFiles[loc].name}
                            </span>
                          )}
                          {!hasFile && (
                            <span className="text-xs text-slate-500 flex-1">
                              Niciun plan încărcat
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const input = document.createElement('input')
                              input.type = 'file'
                              input.accept = '.pdf,.png,.jpg,.jpeg'
                              input.onchange = (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const reader = new FileReader()
                                  reader.onload = (ev) => {
                                    setFloorplanFiles((prev) => {
                                      const next = { ...prev, [loc]: { name: file.name, dataUrl: ev.target.result } }
                                      try {
                                        localStorage.setItem('incasari_floorplan_files', JSON.stringify(next))
                                        window.dispatchEvent(new Event('incasari-floorplan-changed'))
                                      } catch {
                                        toast.error('Fișierul este prea mare')
                                        return prev
                                      }
                                      toast.success(`Plan încărcat pentru ${loc}`)
                                      return next
                                    })
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }
                              input.click()
                            }}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500 text-emerald-300 hover:bg-emerald-500/20"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            {hasFile ? 'Schimbă' : 'Încarcă'}
                          </button>
                          {hasFile && (
                            <button
                              onClick={() => {
                                setFloorplanFiles((prev) => {
                                  const next = { ...prev }
                                  delete next[loc]
                                  try {
                                    localStorage.setItem('incasari_floorplan_files', JSON.stringify(next))
                                    window.dispatchEvent(new Event('incasari-floorplan-changed'))
                                  } catch {}
                                  toast.success(`Plan șters pentru ${loc}`)
                                  return next
                                })
                              }}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500 text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Praguri culori */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Droplets className="w-4 h-4 mr-2 text-emerald-400" />
                      Praguri culori
                    </h3>
                    <button
                      onClick={() => {
                        setColorThresholds((prev) => {
                          const maxValue = prev.length > 0 ? Math.max(...prev.map(t => t.value)) : 0
                          const newThreshold = { value: maxValue + 500, color: '#3b82f6' }
                          const next = [...prev, newThreshold].sort((a, b) => a.value - b.value)
                          try {
                            localStorage.setItem('incasari_floorplan_color_thresholds', JSON.stringify(next))
                          } catch {}
                          toast.success('Prag adăugat')
                          return next
                        })
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500 text-emerald-300 hover:bg-emerald-500/20"
                    >
                      + Adaugă prag
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Setează pragurile (în RON) și culoarea pentru fiecare prag. Sloturile vor fi colorate în funcție de valoarea lor.
                  </p>
                  
                  {colorThresholds.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      Nu ai niciun prag setat. Apasă „+ Adaugă prag".
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {colorThresholds.map((threshold, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-700">
                          <span className="text-xs font-semibold text-slate-300 min-w-[60px]">
                            Prag {idx + 1}:
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="10"
                            value={threshold.value}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0
                              setColorThresholds((prev) => {
                                const next = [...prev]
                                next[idx] = { ...next[idx], value }
                                next.sort((a, b) => a.value - b.value)
                                try {
                                  localStorage.setItem('incasari_floorplan_color_thresholds', JSON.stringify(next))
                                } catch {}
                                return next
                              })
                            }}
                            className="w-32 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-sm"
                          />
                          <span className="text-xs text-slate-400">RON</span>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-slate-400">Culoare:</span>
                            <input
                              type="color"
                              value={threshold.color}
                              onChange={(e) => {
                                setColorThresholds((prev) => {
                                  const next = [...prev]
                                  next[idx] = { ...next[idx], color: e.target.value }
                                  try {
                                    localStorage.setItem('incasari_floorplan_color_thresholds', JSON.stringify(next))
                                  } catch {}
                                  return next
                                })
                              }}
                              className="w-12 h-8 rounded-lg border-2 border-slate-600 cursor-pointer bg-slate-900"
                            />
                            <span className="text-xs text-slate-400 font-mono">{threshold.color}</span>
                          </div>
                          <button
                            onClick={() => {
                              setColorThresholds((prev) => {
                                const next = prev.filter((_, i) => i !== idx)
                                try {
                                  localStorage.setItem('incasari_floorplan_color_thresholds', JSON.stringify(next))
                                } catch {}
                                toast.success('Prag șters')
                                return next
                              })
                            }}
                            className="inline-flex items-center px-2 py-2 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500 text-red-300 hover:bg-red-500/20 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default IncasariFloorplan


