/**
 * Geocoding utilities using Nominatim (OpenStreetMap) - FREE!
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

// HARDCODED COORDONATE pentru orașe comune (FALLBACK!)
const CITY_COORDS = {
  'BUCUREȘTI': [44.4268, 26.1025],
  'BUCHAREST': [44.4268, 26.1025],
  'PITEȘTI': [44.8606, 24.8678],
  'PITESTI': [44.8606, 24.8678],
  'CRAIOVA': [44.3302, 23.7949],
  'PLOIEȘTI': [44.9536, 26.0225],
  'PLOIESTI': [44.9536, 26.0225],
  'RÂMNICU VÂLCEA': [45.1000, 24.3667],
  'RAMNICU VALCEA': [45.1000, 24.3667],
  'VÂLCEA': [45.1000, 24.3667],
  'VALCEA': [45.1000, 24.3667],
  'IAȘI': [47.1585, 27.6014],
  'IASI': [47.1585, 27.6014],
  'CLUJ-NAPOCA': [46.7712, 23.6236],
  'CLUJ': [46.7712, 23.6236],
  'TIMIȘOARA': [45.7489, 21.2087],
  'TIMISOARA': [45.7489, 21.2087],
  'CONSTANȚA': [44.1598, 28.6348],
  'CONSTANTA': [44.1598, 28.6348],
  'BRAȘOV': [45.6427, 25.5887],
  'BRASOV': [45.6427, 25.5887]
}

/**
 * Convert address to coordinates (lat, lng)
 * @param {string} address - Full address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address) return null
  
  // FALLBACK 1: Caută oraș în HARDCODED coords
  const addressUpper = address.toUpperCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (addressUpper.includes(city)) {
      console.log(`✅ HARDCODED coords pentru ${city}:`, coords)
      return { lat: coords[0], lng: coords[1] }
    }
  }
  
  // FALLBACK 2: Încearcă geocoding cu adresa COMPLETĂ
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?` + new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        countrycodes: 'ro',
        addressdetails: '1'
      }),
      {
        headers: {
          'User-Agent': 'CashpotApp/1.0'
        }
      }
    )
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      console.log('✅ Nominatim găsit pentru adresa completă:', data[0])
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
    
    // FALLBACK 3: Încearcă doar cu ORAȘUL (fără stradă/bloc)
    const city = extractCityFromAddress(address)
    if (city && city !== address) {
      console.log(`🔄 Retry geocoding doar cu orașul: ${city}`)
      const cityResponse = await fetch(
        `${NOMINATIM_BASE_URL}/search?` + new URLSearchParams({
          q: `${city}, Romania`,
          format: 'json',
          limit: '1',
          countrycodes: 'ro'
        }),
        {
          headers: {
            'User-Agent': 'CashpotApp/1.0'
          }
        }
      )
      
      const cityData = await cityResponse.json()
      if (cityData && cityData.length > 0) {
        console.log('✅ Nominatim găsit pentru oraș:', cityData[0])
        return {
          lat: parseFloat(cityData[0].lat),
          lng: parseFloat(cityData[0].lon)
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Extract city name from address string
 * @param {string} address - Full address
 * @returns {string} - City name
 */
export const extractCityFromAddress = (address) => {
  if (!address) return ''
  
  // Common patterns for Romanian addresses:
  // "Str. X, București" or "București, Str. X" or "Craiova, Dolj"
  
  // Try to find city after comma
  const parts = address.split(',').map(p => p.trim())
  
  // Cities in Romania (common ones)
  const romanianCities = [
    'București', 'Bucharest', 'Bucarest',
    'Cluj-Napoca', 'Cluj',
    'Timișoara', 'Timisoara',
    'Iași', 'Iasi',
    'Constanța', 'Constanta',
    'Craiova',
    'Brașov', 'Brasov',
    'Galați', 'Galati',
    'Ploiești', 'Ploiesti',
    'Oradea',
    'Brăila', 'Braila',
    'Arad',
    'Pitești', 'Pitesti',
    'Sibiu',
    'Bacău', 'Bacau',
    'Târgu Mureș', 'Targu Mures',
    'Baia Mare',
    'Buzău', 'Buzau',
    'Botoșani', 'Botosani',
    'Satu Mare',
    'Râmnicu Vâlcea', 'Ramnicu Valcea', 'Vâlcea', 'Valcea'
  ]
  
  // Check each part of the address
  for (const part of parts) {
    for (const city of romanianCities) {
      if (part.toLowerCase().includes(city.toLowerCase())) {
        return city
      }
    }
  }
  
  // If no match, return first part after comma (best guess)
  return parts[parts.length > 1 ? 1 : 0]
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string | null>}
 */
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return null
  
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?` + new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1'
      }),
      {
        headers: {
          'User-Agent': 'CashpotApp/1.0'
        }
      }
    )
    
    const data = await response.json()
    
    if (data && data.display_name) {
      return data.display_name
    }
    
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Parse coordinates string (lat, lng) to object
 * @param {string} coordsString - "44.4268, 26.1025"
 * @returns {{lat: number, lng: number} | null}
 */
export const parseCoordinates = (coordsString) => {
  if (!coordsString || typeof coordsString !== 'string') return null
  
  const parts = coordsString.split(',').map(p => p.trim())
  
  if (parts.length !== 2) return null
  
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  
  if (isNaN(lat) || isNaN(lng)) return null
  
  return { lat, lng }
}

