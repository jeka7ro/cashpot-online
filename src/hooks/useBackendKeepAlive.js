import { useEffect, useRef } from 'react'
import axios from 'axios'

/**
 * Keep-Alive Hook - Previne cold starts pe Render.com
 * Face ping-uri regulate la backend pentru a-l menține activ
 */
export const useBackendKeepAlive = (enabled = true, intervalMinutes = 5) => {
  const intervalRef = useRef(null)
  const lastPingRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const pingBackend = async () => {
      const now = Date.now()
      const timeSinceLastPing = now - lastPingRef.current
      const minInterval = intervalMinutes * 60 * 1000

      // Nu face ping dacă a fost făcut recent
      if (timeSinceLastPing < minInterval) {
        return
      }

      try {
        console.log('🏓 Keep-Alive: Pinging backend...')
        // Lightweight health check endpoint
        await axios.get('/health', { 
          timeout: 5000,
          // Nu trimite Authorization header pentru health check
          headers: { 'X-Keep-Alive': 'true' }
        })
        lastPingRef.current = now
        console.log('✅ Keep-Alive: Backend is awake!')
      } catch (error) {
        console.warn('⚠️ Keep-Alive: Ping failed (backend might be sleeping)')
        // Nu aruncăm eroare - e normal să eșueze ocazional
      }
    }

    // Ping imediat la mount (dacă nu a fost ping recent)
    pingBackend()

    // Apoi ping la interval
    intervalRef.current = setInterval(pingBackend, intervalMinutes * 60 * 1000)

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

