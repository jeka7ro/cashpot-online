/**
 * Sistem de sincronizare AWS S3 pentru datele de încasări
 * Backup și sincronizare între device-uri
 */

import axios from 'axios'

const S3_PREFIX = 'incasari-cache/'

/**
 * Verifică dacă AWS S3 este configurat (prin backend)
 */
export const isAWSAvailable = async () => {
  try {
    const response = await axios.get('/api/incasari/aws-status')
    return response.data?.available || false
  } catch {
    return false
  }
}

/**
 * Salvează date în AWS S3 (prin backend)
 */
export const saveToAWS = async (key, data) => {
  if (!(await isAWSAvailable())) {
    console.log('⚠️ AWS S3 nu este configurat, skip salvare')
    return false
  }

  try {
    await axios.post('/api/incasari/aws-save', {
      key: `${S3_PREFIX}${key}.json`,
      data,
      timestamp: Date.now()
    })
    console.log(`☁️ Date salvate în AWS S3: ${key}`)
    return true
  } catch (error) {
    console.error('❌ Eroare la salvare AWS S3:', error)
    return false
  }
}

/**
 * Citește date din AWS S3 (prin backend)
 */
export const getFromAWS = async (key) => {
  if (!(await isAWSAvailable())) {
    return null
  }

  try {
    const response = await axios.get('/api/incasari/aws-get', {
      params: { key: `${S3_PREFIX}${key}.json` }
    })
    
    if (response.data?.success && response.data.data) {
      console.log(`☁️ Date citite din AWS S3: ${key}`)
      return response.data.data
    }
    
    return null
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`⚠️ Cheie nu există în AWS S3: ${key}`)
      return null
    }
    console.error('❌ Eroare la citire AWS S3:', error)
    return null
  }
}

/**
 * Verifică timestamp-ul ultimei sincronizări din AWS
 */
export const getLastSyncTimestamp = async (key) => {
  if (!(await isAWSAvailable())) {
    return null
  }

  try {
    const response = await axios.get('/api/incasari/aws-timestamp', {
      params: { key: `${S3_PREFIX}${key}.json` }
    })
    
    return response.data?.timestamp || null
  } catch (error) {
    return null
  }
}

/**
 * Listă toate cheile din cache AWS
 */
export const listAWSCache = async () => {
  if (!(await isAWSAvailable())) {
    return []
  }

  try {
    const response = await axios.get('/api/incasari/aws-list')
    return response.data?.keys || []
  } catch (error) {
    console.error('❌ Eroare la listare AWS cache:', error)
    return []
  }
}

/**
 * Sincronizează datele: local → AWS (dacă local e mai nou)
 */
export const syncToAWS = async (key, localData, localTimestamp) => {
  if (!isAWSAvailable()) {
    return false
  }

  try {
    const awsTimestamp = await getLastSyncTimestamp(key)
    
    // Dacă datele locale sunt mai noi sau AWS nu are date, salvează
    if (!awsTimestamp || localTimestamp > awsTimestamp) {
      await saveToAWS(key, localData)
      return true
    }
    
    return false
  } catch (error) {
    console.error('❌ Eroare la sincronizare AWS:', error)
    return false
  }
}

/**
 * Sincronizează datele: AWS → local (dacă AWS e mai nou)
 */
export const syncFromAWS = async (key, localTimestamp) => {
  if (!isAWSAvailable()) {
    return null
  }

  try {
    const awsTimestamp = await getLastSyncTimestamp(key)
    
    // Dacă AWS are date mai noi, citește de acolo
    if (awsTimestamp && awsTimestamp > localTimestamp) {
      const data = await getFromAWS(key)
      return data
    }
    
    return null
  } catch (error) {
    console.error('❌ Eroare la sincronizare din AWS:', error)
    return null
  }
}

