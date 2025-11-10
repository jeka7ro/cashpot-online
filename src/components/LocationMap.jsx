import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Building2, AlertCircle } from 'lucide-react'
import { geocodeAddress, parseCoordinates, extractCityFromAddress } from '../utils/geocoding'
import axios from 'axios'

// Fix Leaflet default icon issue with React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// CUSTOM ICONS cu LOGO-uri!
const createCustomIcon = (brandName, isOwn = false) => {
  const color = isOwn ? '#10b981' : '#ef4444' // verde/roșu
  const bgColor = isOwn ? '#d1fae5' : '#fee2e2'
  const emoji = isOwn ? '🏆' : '🏢'
  
  // Emoji pentru brand-uri cunoscute
  const brandEmojis = {
    'ADMIRAL': '⚓',
    'ADMIRAL CASINO': '⚓',
    'WINBET': '🎰',
    'WINBET CASINO': '🎰',
    'FORTUNA': '🍀',
    'PRINCESS': '👑',
    'VLAD CAZINO': '🦇',
    'VEGAS': '💎',
    'MONTE CARLO': '🎲',
    'ROYAL': '👑',
    'ELDORADO': '💰',
    'JOKER': '🃏',
    'CASHPOT': '🏆',
    'SMARTFLIX': '🏆'
  }
  
  const brandUpper = (brandName || '').toUpperCase()
  let brandEmoji = emoji
  for (const [key, emoji] of Object.entries(brandEmojis)) {
    if (brandUpper.includes(key)) {
      brandEmoji = emoji
      break
    }
  }
  
  return L.divIcon({
    html: `
      <div style="
        background: ${bgColor};
        border: 3px solid ${color};
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        position: relative;
      ">
        ${brandEmoji}
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid ${color};
        "></div>
      </div>
    `,
    className: 'custom-map-marker',
    iconSize: [50, 58],
    iconAnchor: [25, 58],
    popupAnchor: [0, -58]
  })
}

// Component to recenter map when coordinates change
function ChangeMapView({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 13)
    }
  }, [center, map])
  return null
}

const getFullAddress = (location) => {
  if (!location) return ''
  return (
    location.full_address ||
    location.fullAddress ||
    location.address_full ||
    location.addressComplete ||
    location.complete_address ||
    location.address ||
    ''
  )
}

const LocationMap = ({ location }) => {
  const [mainLocationCoords, setMainLocationCoords] = useState(null)
  const [competitors, setCompetitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadMapData = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1. Get main location coordinates
        let coords = null
        
        // Try to parse existing coordinates first
        if (location.coordinates) {
          coords = parseCoordinates(location.coordinates)
        }
        
        // If no coordinates, geocode the address
        const fullAddress = getFullAddress(location)
        console.log('🗺️ Geocoding pentru:', location.name)
        console.log('📍 Adresă completă:', fullAddress)

        if (!coords && fullAddress) {
          // Clean address: remove spaces before commas
          let cleanAddress = fullAddress.replace(/\s+,/g, ',').replace(/,\s+/g, ', ')
          
          // Append country to improve geocoding accuracy
          const addressWithCountry = cleanAddress.toLowerCase().includes('romania') || cleanAddress.toLowerCase().includes('românia')
            ? cleanAddress
            : `${cleanAddress}, România`
          
          console.log('🌍 Geocoding cu (curățat):', addressWithCountry)
          coords = await geocodeAddress(addressWithCountry)
          console.log('✅ Coordonate găsite:', coords)
          
          // Save coordinates back to database for future use
          if (coords && location.id) {
            try {
              const coordsString = `${coords.lat}, ${coords.lng}`
              await axios.put(`/api/locations/${location.id}`, {
                ...location,
                coordinates: coordsString
              })
              console.log('💾 Coordonate salvate în DB:', coordsString)
            } catch (saveError) {
              console.warn('⚠️ Could not save coordinates to DB:', saveError)
            }
          }
        }
        
        if (!coords) {
          console.error('❌ NU s-au găsit coordonate pentru:', fullAddress)
          setError('Nu s-au putut determina coordonatele locației')
          setLoading(false)
          return
        }
        
        setMainLocationCoords(coords)

        // 2. Extract city from address
        const addressForCity = fullAddress || location.address || ''
        const citySource = [addressForCity, location.city, location.county, location.judet]
          .filter(Boolean)
          .join(', ')
        const city = extractCityFromAddress(citySource)
        
        if (!city) {
          console.warn('Could not extract city from address')
          setLoading(false)
          return
        }

        // 3. Fetch ONJN Class 1 competitors in the same city
        try {
          const response = await axios.get(`/api/onjn/class1/by-city/${encodeURIComponent(city)}`, {
            timeout: 30000
          })
          
          if (response.data && response.data.success) {
            // Filter out CASHPOT locations
            const competitorLocations = response.data.locations.filter(loc => 
              !loc.operator?.toLowerCase().includes('cashpot') &&
              !loc.operator?.toLowerCase().includes('smartflix')
            )
            
            // Geocode competitor addresses (limit to first 10 to avoid rate limiting)
            const geocodedCompetitors = []
            console.log(`🏢 Found ${competitorLocations.length} competitors in ${city}`)
            
            for (let i = 0; i < Math.min(competitorLocations.length, 10); i++) {
              const comp = competitorLocations[i]
              const compAddress = comp.address?.toLowerCase().includes('romania') || comp.address?.toLowerCase().includes('românia')
                ? comp.address
                : `${comp.address}, România`
              
              console.log(`🔍 Geocoding competitor ${i+1}/${Math.min(competitorLocations.length, 10)}: ${comp.operator}`)
              console.log(`   Address: ${compAddress}`)
              
              const compCoords = await geocodeAddress(compAddress)
              
              if (compCoords) {
                console.log(`   ✅ Coords found: [${compCoords.lat}, ${compCoords.lng}]`)
                geocodedCompetitors.push({
                  ...comp,
                  coords: compCoords
                })
              } else {
                console.log(`   ❌ Geocoding failed for ${comp.operator}`)
              }
              
              // Rate limiting: wait 1 second between requests (Nominatim requirement)
              if (i < Math.min(competitorLocations.length, 10) - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }
            
            console.log(`✅ Geocoded ${geocodedCompetitors.length} competitors successfully`)
            setCompetitors(geocodedCompetitors)
          }
        } catch (err) {
          console.error('Error fetching ONJN competitors:', err)
          // Don't show error - just show map without competitors
        }
        
      } catch (err) {
        console.error('Error loading map data:', err)
        setError('Eroare la încărcarea hărții')
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [location])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Se încarcă harta...</p>
        </div>
      </div>
    )
  }

  if (error || !mainLocationCoords) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <p>{error || 'Nu s-au putut încărca datele hărții'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Hartă Locație și Concurență
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          <span className="inline-flex items-center mr-4">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-1.5"></span>
            CASHPOT (tine)
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-1.5"></span>
            Concurență ({competitors.length})
          </span>
        </p>
      </div>
      
      <div className="h-96">
        <MapContainer
          center={mainLocationCoords}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <ChangeMapView center={mainLocationCoords} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Main Location (CASHPOT - GREEN cu LOGO!) */}
          <Marker position={mainLocationCoords} icon={createCustomIcon(location.company || 'CASHPOT', true)}>
            <Popup>
              <div className="p-2">
                <h4 className="font-bold text-green-700 mb-1">🏆 {location.name}</h4>
                <p className="text-sm text-slate-600">{location.address}</p>
                <p className="text-sm text-slate-600 mt-1">
                  <strong>Companie:</strong> {location.company}
                </p>
                <div className="mt-2 px-2 py-1 bg-green-100 rounded text-xs font-semibold text-green-800">
                  CASHPOT (Locația ta)
                </div>
              </div>
            </Popup>
          </Marker>
          
          {/* Competitors (RED cu LOGO BRAND!) */}
          {competitors.map((comp, index) => (
            <Marker key={index} position={comp.coords} icon={createCustomIcon(comp.operator, false)}>
              <Popup>
                <div className="p-2">
                  <h4 className="font-bold text-red-700 mb-1 flex items-center">
                    {comp.operator}
                  </h4>
                  <p className="text-sm text-slate-600">{comp.address}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    <strong>Sloturi:</strong> {comp.slot_count || 'N/A'} aparate
                  </p>
                  {comp.brands && (
                    <p className="text-sm text-slate-600">
                      <strong>Branduri:</strong> {comp.brands.join(', ')}
                    </p>
                  )}
                  <div className="mt-2 px-2 py-1 bg-red-100 rounded text-xs font-semibold text-red-800">
                    CONCURENȚĂ
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

export default LocationMap

