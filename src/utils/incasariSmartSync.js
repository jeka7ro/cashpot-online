/**
 * Sistem inteligent de sincronizare pentru datele de încasări
 * Logică: Cache Local → AWS S3 → Cyber (doar când e necesar)
 */

import { getFromCache, saveToCache, generateCacheKey } from './incasariCache'
import { getFromAWS, saveToAWS, syncToAWS, syncFromAWS, isAWSAvailable } from './incasariAWSSync'
import axios from 'axios'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minute
const MAX_CACHE_AGE = 10 * 60 * 1000 // 10 minute

/**
 * Fetch inteligent cu cache multi-nivel
 * 1. Verifică cache local (IndexedDB)
 * 2. Dacă e expirat, verifică AWS S3
 * 3. Dacă AWS e mai nou, folosește AWS și actualizează local
 * 4. Dacă niciunul nu e disponibil, fetch de pe server
 */
export const smartFetch = async (endpoint, params = {}, options = {}) => {
  const { forceRefresh = false, ttl = 5 * 60 * 1000 } = options
  const cacheKey = generateCacheKey(endpoint, params)
  
  // 1. Verifică cache local
  if (!forceRefresh) {
    const localCache = await getFromCache(cacheKey)
    if (localCache) {
      console.log('✅ Date din cache local')
      return { data: localCache, source: 'local' }
    }
  }
  
  // 2. Verifică AWS S3 (dacă e disponibil)
  const awsAvailable = await isAWSAvailable()
  if (awsAvailable && !forceRefresh) {
    const awsData = await getFromAWS(cacheKey)
    if (awsData) {
      console.log('☁️ Date din AWS S3')
      // Actualizează cache local cu datele din AWS
      await saveToCache(cacheKey, awsData, 'api', ttl)
      return { data: awsData, source: 'aws' }
    }
  }
  
  // 3. Fetch de pe server
  try {
    console.log('📡 Fetch de pe server...')
    const response = await axios.get(endpoint, { params })
    
    if (response.data?.success) {
      const data = response.data
      
      // Salvează în cache local
      await saveToCache(cacheKey, data, 'api', ttl)
      
      // Salvează în AWS S3 (background, nu blochează)
      if (await isAWSAvailable()) {
        saveToAWS(cacheKey, data).catch(err => 
          console.error('⚠️ Eroare la salvare AWS (non-blocking):', err)
        )
      }
      
      return { data, source: 'server' }
    }
    
    return { data: response.data, source: 'server' }
  } catch (error) {
    console.error('❌ Eroare la fetch server:', error)
    
    // Fallback: încearcă AWS chiar dacă e mai vechi
    if (await isAWSAvailable()) {
      const awsData = await getFromAWS(cacheKey)
      if (awsData) {
        console.log('⚠️ Folosind date AWS ca fallback')
        await saveToCache(cacheKey, awsData, 'api', ttl)
        return { data: awsData, source: 'aws-fallback' }
      }
    }
    
    // Fallback: încearcă cache local expirat
    const expiredCache = await getFromCache(cacheKey)
    if (expiredCache) {
      console.log('⚠️ Folosind cache expirat ca fallback')
      return { data: expiredCache, source: 'local-expired' }
    }
    
    throw error
  }
}

/**
 * Background sync: sincronizează datele între local și AWS
 */
export const startBackgroundSync = async () => {
  const awsAvailable = await isAWSAvailable()
  if (!awsAvailable) {
    console.log('⚠️ AWS nu este configurat, skip background sync')
    return
  }
  
  console.log('🔄 Background sync pornit')
  
  setInterval(async () => {
    try {
      // TODO: Implementează sincronizare bidirecțională
      // - Verifică ce date locale sunt mai noi și le sincronizează în AWS
      // - Verifică ce date AWS sunt mai noi și le descarcă local
      console.log('🔄 Background sync în curs...')
    } catch (error) {
      console.error('❌ Eroare la background sync:', error)
    }
  }, SYNC_INTERVAL)
}

/**
 * Forțează refresh pentru un endpoint specific
 */
export const forceRefresh = async (endpoint, params = {}) => {
  return smartFetch(endpoint, params, { forceRefresh: true })
}

/**
 * Preload date importante în cache
 */
export const preloadCache = async (dateRange) => {
  const { startDate, endDate } = dateRange
  
  console.log('📦 Preload cache pentru perioada:', startDate, '-', endDate)
  
  const endpoints = [
    { url: '/api/incasari/summary', params: { startDate, endDate } },
    { url: '/api/incasari/daily-stats', params: { startDate, endDate } },
    { url: '/api/incasari/avg-in-by-location', params: { startDate, endDate } }
  ]
  
  // Preload în paralel
  await Promise.all(
    endpoints.map(({ url, params }) =>
      smartFetch(url, params).catch(err =>
        console.error(`⚠️ Eroare preload ${url}:`, err)
      )
    )
  )
  
  console.log('✅ Preload cache completat')
}

// Pornește background sync la inițializare (doar dacă e nevoie, nu blochează)
if (typeof window !== 'undefined') {
  // Delay pentru a nu bloca aplicația la start
  setTimeout(() => {
    startBackgroundSync().catch(err => {
      console.warn('⚠️ Nu s-a putut porni background sync:', err)
    })
  }, 2000) // Delay de 2 secunde
}

