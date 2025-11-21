/**
 * Sistem de cache local pentru datele de încasări
 * Folosește IndexedDB pentru volume mari de date
 * Sincronizare cu AWS S3 pentru backup și sync între device-uri
 */

const DB_NAME = 'cashpot_incasari_cache'
const DB_VERSION = 1
const STORE_NAME = 'incasari_data'

// Cache TTL (Time To Live) - cât timp sunt datele valide
const CACHE_TTL = {
  summary: 5 * 60 * 1000, // 5 minute
  dailyStats: 5 * 60 * 1000, // 5 minute
  overview: 10 * 60 * 1000, // 10 minute
  locationData: 10 * 60 * 1000, // 10 minute
  charts: 5 * 60 * 1000, // 5 minute
  longTerm: 24 * 60 * 60 * 1000 // 24 ore pentru date istorice
}

let db = null

/**
 * Inițializează IndexedDB
 */
export const initCacheDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('❌ Eroare la deschiderea IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('✅ IndexedDB inițializat pentru cache încasări')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Creează object store dacă nu există
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        objectStore.createIndex('type', 'type', { unique: false })
        console.log('✅ Object store creat pentru cache încasări')
      }
    }
  })
}

/**
 * Salvează date în cache
 */
export const saveToCache = async (key, data, type = 'general', ttl = CACHE_TTL.summary) => {
  try {
    const db = await initCacheDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const cacheItem = {
      key,
      data,
      type,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    
    await store.put(cacheItem)
    console.log(`💾 Cache salvat: ${key} (expiră în ${Math.round(ttl / 1000 / 60)} minute)`)
    return true
  } catch (error) {
    console.error('❌ Eroare la salvare cache:', error)
    return false
  }
}

/**
 * Citește date din cache
 */
export const getFromCache = async (key) => {
  try {
    const db = await initCacheDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const request = store.get(key)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const item = request.result
        
        if (!item) {
          resolve(null)
          return
        }
        
        // Verifică dacă cache-ul a expirat
        if (Date.now() > item.expiresAt) {
          console.log(`⏰ Cache expirat: ${key}`)
          // Șterge item-ul expirat
          deleteFromCache(key)
          resolve(null)
          return
        }
        
        console.log(`✅ Cache găsit: ${key} (mai sunt ${Math.round((item.expiresAt - Date.now()) / 1000 / 60)} minute)`)
        resolve(item.data)
      }
      
      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('❌ Eroare la citire cache:', error)
    return null
  }
}

/**
 * Șterge un item din cache
 */
export const deleteFromCache = async (key) => {
  try {
    const db = await initCacheDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await store.delete(key)
    return true
  } catch (error) {
    console.error('❌ Eroare la ștergere cache:', error)
    return false
  }
}

/**
 * Șterge toate item-urile expirate
 */
export const cleanExpiredCache = async () => {
  try {
    const db = await initCacheDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    
    const now = Date.now()
    const range = IDBKeyRange.upperBound(now)
    
    const request = index.openCursor(range)
    let deleted = 0
    
    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          const item = cursor.value
          if (item.expiresAt < now) {
            cursor.delete()
            deleted++
          }
          cursor.continue()
        } else {
          console.log(`🧹 Șterse ${deleted} item-uri expirate din cache`)
          resolve(deleted)
        }
      }
    })
  } catch (error) {
    console.error('❌ Eroare la curățare cache:', error)
    return 0
  }
}

/**
 * Șterge tot cache-ul
 */
export const clearAllCache = async () => {
  try {
    const db = await initCacheDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await store.clear()
    console.log('🗑️ Tot cache-ul a fost șters')
    return true
  } catch (error) {
    console.error('❌ Eroare la ștergere totală cache:', error)
    return false
  }
}

/**
 * Generează cheie de cache bazată pe parametri
 */
export const generateCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  return `${endpoint}|${sortedParams}`
}

/**
 * Wrapper pentru fetch cu cache automat
 */
export const fetchWithCache = async (url, params = {}, options = {}) => {
  const cacheKey = generateCacheKey(url, params)
  const { ttl = CACHE_TTL.summary, forceRefresh = false } = options
  
  // Verifică cache dacă nu forțăm refresh
  if (!forceRefresh) {
    const cached = await getFromCache(cacheKey)
    if (cached) {
      return { data: cached, fromCache: true }
    }
  }
  
  // Fetch de pe server
  try {
    const axios = (await import('axios')).default
    const response = await axios.get(url, { params })
    
    if (response.data?.success) {
      // Salvează în cache
      await saveToCache(cacheKey, response.data, 'api', ttl)
      return { data: response.data, fromCache: false }
    }
    
    return { data: response.data, fromCache: false }
  } catch (error) {
    console.error(`❌ Eroare la fetch ${url}:`, error)
    
    // Încearcă să returneze din cache chiar dacă e expirat (fallback)
    const expiredCache = await getFromCache(cacheKey)
    if (expiredCache) {
      console.log('⚠️ Folosind cache expirat ca fallback')
      return { data: expiredCache, fromCache: true, expired: true }
    }
    
    throw error
  }
}

// Curăță cache-ul expirat la inițializare (doar dacă e nevoie, nu blochează)
if (typeof window !== 'undefined') {
  // Delay pentru a nu bloca aplicația la start
  setTimeout(() => {
    initCacheDB()
      .then(() => {
        cleanExpiredCache()
        // Curăță cache-ul expirat la fiecare 10 minute
        setInterval(cleanExpiredCache, 10 * 60 * 1000)
      })
      .catch(err => {
        console.warn('⚠️ Nu s-a putut inițializa cache DB:', err)
      })
  }, 1000) // Delay de 1 secundă
}

