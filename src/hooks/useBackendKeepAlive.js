import { useEffect, useRef } from 'react'
import axios from 'axios'

/**
 * Keep-Alive Hook - Previne cold starts pe Render.com
 * Face ping-uri regulate la backend pentru a-l menține activ
 * CIRCUIT BREAKER: Oprește complet când backend-ul e down!
 */
export const useBackendKeepAlive = (enabled = true, intervalMinutes = 5) => {
  const intervalRef = useRef(null)
  const lastPingRef = useRef(0)
  const failuresRef = useRef(0)
  const lastFailureRef = useRef(0)
  const CIRCUIT_BREAKER_THRESHOLD = 1 // OPRESTE după PRIMUL eșec 500!
  const CIRCUIT_BREAKER_RESET_TIME = 120000 // 2 minute înainte de retry

  useEffect(() => {
    if (!enabled) return

    // Verifică circuit breaker-ul din localStorage la mount
    const storedFailure = localStorage.getItem('backend_circuit_breaker_failure')
    const storedTime = localStorage.getItem('backend_circuit_breaker_time')
    const now = Date.now()
    
    if (storedFailure && storedTime) {
      const timeSinceFailure = now - parseInt(storedTime)
      if (timeSinceFailure < CIRCUIT_BREAKER_RESET_TIME) {
        // Circuit breaker activ - setează starea dar NU bloca complet
        failuresRef.current = CIRCUIT_BREAKER_THRESHOLD
        lastFailureRef.current = parseInt(storedTime)
      } else {
        // Reset după 2 minute
        localStorage.removeItem('backend_circuit_breaker_failure')
        localStorage.removeItem('backend_circuit_breaker_time')
        failuresRef.current = 0
      }
    }

    const pingBackend = async () => {
      const now = Date.now()
      const timeSinceLastPing = now - lastPingRef.current
      const minInterval = intervalMinutes * 60 * 1000

      // Nu face ping dacă a fost făcut recent
      if (timeSinceLastPing < minInterval) {
        return
      }

      // CIRCUIT BREAKER: Dacă backend-ul e down, TESTEAZĂ-L înainte de a bloca!
      if (failuresRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
        if (now - lastFailureRef.current < CIRCUIT_BREAKER_RESET_TIME) {
          // Testează backend-ul înainte de a bloca complet
          try {
            const healthCheck = await axios.get('/health', { timeout: 3000 })
            if (healthCheck.data.status === 'OK') {
              // Backend-ul funcționează! Șterge circuit breaker-ul
              localStorage.removeItem('backend_circuit_breaker_failure')
              localStorage.removeItem('backend_circuit_breaker_time')
              localStorage.removeItem('settings_circuit_breaker_failure')
              localStorage.removeItem('settings_circuit_breaker_time')
              failuresRef.current = 0
              // Continuă cu ping normal
            } else {
              // Backend-ul e încă down - oprește
              return
            }
          } catch (healthError) {
            // Backend-ul e încă down - oprește
            return
          }
        } else {
          // Reset după 2 minute
          failuresRef.current = 0
          localStorage.removeItem('backend_circuit_breaker_failure')
          localStorage.removeItem('backend_circuit_breaker_time')
        }
      }

      try {
        // console.log('🏓 Keep-Alive: Pinging backend...')
        // Lightweight health check endpoint
        await axios.get('/health', { 
          timeout: 3000, // Redus la 3 secunde
          // Nu trimite Authorization header pentru health check
          headers: { 'X-Keep-Alive': 'true' }
        })
        lastPingRef.current = now
        failuresRef.current = 0 // Reset failures on success
        localStorage.removeItem('backend_circuit_breaker_failure')
        localStorage.removeItem('backend_circuit_breaker_time')
        // console.log('✅ Keep-Alive: Backend is awake!')
      } catch (error) {
        // Dacă e 500, backend-ul e DOWN - oprește complet imediat!
        if (error.response?.status === 500) {
          failuresRef.current = CIRCUIT_BREAKER_THRESHOLD // Oprește complet!
          lastFailureRef.current = Date.now()
          // Salvează în localStorage pentru persistență
          localStorage.setItem('backend_circuit_breaker_failure', CIRCUIT_BREAKER_THRESHOLD.toString())
          localStorage.setItem('backend_circuit_breaker_time', Date.now().toString())
          // Oprește interval-ul IMEDIAT!
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else {
          failuresRef.current++
          lastFailureRef.current = Date.now()
        }
        // Silent fail - don't spam console
        // console.warn('⚠️ Keep-Alive: Ping failed (backend might be sleeping)')
        
        // Dacă backend-ul e down, OPRESTE interval-ul complet!
        if (failuresRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }
    }

    // Verifică circuit breaker-ul ÎNAINTE de a face ping
    const nowCheck = Date.now()
    if (failuresRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
      if (nowCheck - lastFailureRef.current < CIRCUIT_BREAKER_RESET_TIME) {
        // Circuit breaker activ - NU mai face deloc request-uri!
        // Oprește complet hook-ul!
        return
      }
    }

    // Dacă circuit breaker-ul e activ din localStorage, NU mai face deloc ping!
    if (storedFailure && storedTime) {
      const timeSinceFailure = nowCheck - parseInt(storedTime)
      if (timeSinceFailure < CIRCUIT_BREAKER_RESET_TIME) {
        // Circuit breaker activ - OPRESTE complet!
        return
      }
    }

    // Ping imediat la mount (dacă nu a fost ping recent și circuit breaker nu e activ)
    // DOAR dacă circuit breaker-ul NU e activ!
    if (failuresRef.current < CIRCUIT_BREAKER_THRESHOLD) {
      pingBackend()
      
      // Apoi ping la interval DOAR dacă nu e circuit breaker activ
      intervalRef.current = setInterval(() => {
        // Verifică din nou circuit breaker-ul înainte de fiecare ping
        const storedFailureCheck = localStorage.getItem('backend_circuit_breaker_failure')
        const storedTimeCheck = localStorage.getItem('backend_circuit_breaker_time')
        const nowCheckInterval = Date.now()
        
        if (storedFailureCheck && storedTimeCheck) {
          const timeSinceFailure = nowCheckInterval - parseInt(storedTimeCheck)
          if (timeSinceFailure < CIRCUIT_BREAKER_RESET_TIME) {
            // Circuit breaker activ - oprește interval-ul!
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            return
          }
        }
        
        if (failuresRef.current < CIRCUIT_BREAKER_THRESHOLD) {
          pingBackend()
        } else {
          // Oprește interval-ul dacă circuit breaker-ul e activ
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, intervalMinutes * 60 * 1000)
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, intervalMinutes])

  return null
}

export default useBackendKeepAlive

