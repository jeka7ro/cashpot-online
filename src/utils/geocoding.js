/**
 * Geocoding utilities using Nominatim (OpenStreetMap) - FREE!
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

/**
 * Convert address to coordinates (lat, lng)
 * @param {string} address - Full address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address) return null
  
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?` + new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        countrycodes: 'ro', // Restrict to Romania
        addressdetails: '1'
      }),
      {
        headers: {
          'User-Agent': 'CashpotApp/1.0' // Required by Nominatim
        }
      }
    )
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
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

