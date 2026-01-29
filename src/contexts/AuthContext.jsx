import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Configure axios base URL - use relative path for Vite proxy
// axios.defaults.baseURL = 'http://localhost:5001' // Commented out to use Vite proxy

// Mesaj clar când backend-ul nu răspunde (în development = serverul nu rulează pe port 5001)
const BACKEND_NOT_RUNNING_MSG = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  ? 'Backend-ul nu răspunde. Pornește serverul: din folderul backend rulează node server-postgres.js (port 5001).'
  : 'Backend-ul este temporar indisponibil. Te rugăm să încerci din nou mai târziu.'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Use sessionStorage for session persistence
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('authToken')
  })

  // Avoid parallel auth checks
  const isAuthCheckRunning = useRef(false)

  // CIRCUIT BREAKER - oprește cascada de erori când backend-ul e down
  const backendFailures = useRef(0)
  const lastFailureTime = useRef(0)
  const CIRCUIT_BREAKER_THRESHOLD = 3 // După 3 eșecuri, STOP
  const CIRCUIT_BREAKER_RESET_TIME = 60000 // Reset după 1 minut

  // Cache pentru verificare token (evită request-uri multiple)
  const tokenVerificationCache = useRef({
    token: null,
    data: null,
    timestamp: 0,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minute cache
  })

  const verifyTokenWithRetry = async (maxRetries = 0) => { // SCHIMBAT: 0 retry-uri!
    // CHECK CACHE FIRST - evită request-uri inutile!
    const cache = tokenVerificationCache.current
    const now = Date.now()
    if (cache.token === token && cache.data && (now - cache.timestamp) < cache.CACHE_DURATION) {
      console.log('✅ Using CACHED token verification (no request needed!)')
      return { data: cache.data }
    }

    // CIRCUIT BREAKER: Dacă backend-ul e down, NU mai încerca!
    // BUT: Allow verification attempts to reset the circuit breaker if backend is back
    if (backendFailures.current >= CIRCUIT_BREAKER_THRESHOLD) {
      if (now - lastFailureTime.current < CIRCUIT_BREAKER_RESET_TIME) {
        console.warn('🚫 CIRCUIT BREAKER ACTIV - Backend-ul este DOWN! Opresc request-urile...')
        // Still allow ONE attempt to check if backend is back online
        // This prevents permanent blocking if backend recovers
        if (backendFailures.current > CIRCUIT_BREAKER_THRESHOLD + 1) {
          throw new Error('Backend unavailable - circuit breaker active')
        }
      } else {
        // Reset circuit breaker după 1 minut
        console.log('🔄 Circuit breaker RESET - încerc din nou...')
        backendFailures.current = 0
      }
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // NU mai trezesc backend-ul - pierdere de timp!
        console.log(`⏳ Verifying token... (attempt ${attempt + 1}/${maxRetries + 1})`)
        const response = await axios.get('/api/auth/verify', { timeout: 60000 }) // Crescut la 60s pentru Render cold start
        backendFailures.current = 0 // Reset failures on success
        
        // CACHE successful verification!
        tokenVerificationCache.current = {
          token: token,
          data: response.data,
          timestamp: now
        }
        console.log('✅ Token verified and CACHED for 5 minutes!')
        
        return response
      } catch (error) {
        backendFailures.current++
        lastFailureTime.current = Date.now()
        
        const isTimeout = error?.code === 'ECONNABORTED'
        const is503 = error?.response?.status === 503
        
        if (is503) {
          console.error('🔴 Backend CĂZUT (503) - OPRESC retry-urile!')
          throw new Error('Backend service unavailable (503)')
        }
        
        if (attempt === maxRetries || !isTimeout) throw error
        // NU mai aștept - throw imediat!
        throw error
      }
    }
  }

  // Configure axios defaults and interceptors
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }

    // Add response interceptor to handle token expiration
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // If token expired or unauthorized
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('❌ Unauthorized - token expired or invalid')
          
          // Clear auth state
          sessionStorage.removeItem('authToken')
          setToken(null)
          setUser(null)
          delete axios.defaults.headers.common['Authorization']
          
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            toast.error('Sesiunea a expirat. Te rugăm să te loghezi din nou.')
            setTimeout(() => {
              window.location.replace('/login')
            }, 1500)
          }
        }
        return Promise.reject(error)
      }
    )

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [token])

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          if (isAuthCheckRunning.current) return
          isAuthCheckRunning.current = true
          // Verify token and get real user data (FĂRĂ retry!)
          const response = await verifyTokenWithRetry(0) // 0 retry-uri!
          const realUser = response.data.user
          
          if (realUser) {
            setUser({
              id: realUser._id || realUser.id,
              username: realUser.username,
              email: realUser.email,
              fullName: realUser.fullName || realUser.full_name || realUser.username,
              role: realUser.role,
              avatar: realUser.avatar,
              status: realUser.status || 'active',
              permissions: realUser.permissions || {},
              lastLogin: new Date().toISOString()
            })
          } else {
            console.error('No user data received from verify endpoint')
            setToken(null)
            setUser(null)
          }
        } catch (error) {
          console.error('Auth verification failed:', error)
          
          // CIRCUIT BREAKER: Dacă backend-ul e down, OPRESC toast-urile!
          const isCircuitBreakerActive = error.message?.includes('circuit breaker')
          const is503 = error.message?.includes('503') || error.response?.status === 503
          
          if (isCircuitBreakerActive || is503) {
            // NU mai afișez toast-uri repetate - doar un warning în consolă
            console.warn('🚫 Backend UNAVAILABLE - circuit breaker activ!')
            // Redirecționez la login FĂRĂ să șterg token-ul (pentru când revine backend-ul)
            if (window.location.pathname !== '/login') {
              toast.error(error.response?.status === 500 ? BACKEND_NOT_RUNNING_MSG : 'Backend-ul este temporar indisponibil. Încearcă din nou în câteva minute.', {
                duration: 10000,
                id: 'backend-down' // Prevent duplicate toasts!
              })
            }
          } else if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('🔄 Token expired - clearing session')
            sessionStorage.removeItem('authToken')
            setToken(null)
            setUser(null)
            delete axios.defaults.headers.common['Authorization']
          } else if (error.code === 'ECONNABORTED') {
            // On timeout, just warn but don't clear token
            console.warn('⚠️ Timeout on auth verification - keeping session alive')
            // NU mai afișez toast!
          } else {
            console.error('❌ Auth check failed - clearing session')
            if (error.response?.status === 500 || error.code === 'ERR_NETWORK') {
              toast.error(BACKEND_NOT_RUNNING_MSG, { duration: 10000, id: 'backend-down' })
            }
            sessionStorage.removeItem('authToken')
            setToken(null)
            setUser(null)
          }
        } finally {
          isAuthCheckRunning.current = false
        }
      } else {
        // No token, only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.replace('/login')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [token])

  const login = async (username, password) => {
    try {
      setLoading(true)
      
      // Verifică circuit breaker-ul din localStorage ÎNAINTE de login
      // DAR verifică mai întâi dacă backend-ul funcționează!
      const storedFailure = localStorage.getItem('settings_circuit_breaker_failure')
      const storedTime = localStorage.getItem('settings_circuit_breaker_time')
      const now = Date.now()
      
      if (storedFailure && storedTime) {
        const timeSinceFailure = now - parseInt(storedTime)
        if (timeSinceFailure < 120000) { // 2 minute
          // Testează backend-ul înainte de a bloca login-ul!
          try {
            const healthCheck = await axios.get('/health', { timeout: 3000 })
            if (healthCheck.data.status === 'OK') {
              // Backend-ul funcționează! Șterge circuit breaker-ul
              localStorage.removeItem('settings_circuit_breaker_failure')
              localStorage.removeItem('settings_circuit_breaker_time')
              localStorage.removeItem('backend_circuit_breaker_failure')
              localStorage.removeItem('backend_circuit_breaker_time')
              backendFailures.current = 0
            } else {
              // Backend-ul e încă down
              setLoading(false)
              toast.error('🔴 ' + BACKEND_NOT_RUNNING_MSG, { duration: 8000, id: 'backend-down' })
              return { success: false, error: 'Backend unavailable' }
            }
          } catch (healthError) {
            // Backend-ul nu răspunde (nu rulează sau proxy eșuează)
            setLoading(false)
            toast.error('🔴 ' + BACKEND_NOT_RUNNING_MSG, { duration: 8000, id: 'backend-down' })
            return { success: false, error: 'Backend unavailable' }
          }
        } else {
          // Circuit breaker expirat - șterge-l
          localStorage.removeItem('settings_circuit_breaker_failure')
          localStorage.removeItem('settings_circuit_breaker_time')
          localStorage.removeItem('backend_circuit_breaker_failure')
          localStorage.removeItem('backend_circuit_breaker_time')
        }
      }
      
      // Clear token verification cache to force fresh verification
      tokenVerificationCache.current = {
        token: null,
        data: null,
        timestamp: 0,
        CACHE_DURATION: 5 * 60 * 1000
      }

      const response = await axios.post(
        '/api/auth/login',
        { username, password },
        { timeout: 15000 }
      )

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Login failed')
      }

      const { token: newToken } = response.data
      
      if (!newToken) {
        throw new Error('No token received from server')
      }
      
      // Store token in sessionStorage
      sessionStorage.setItem('authToken', newToken)
      setToken(newToken)
      
      // Set axios header immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      
      // Get user data from login response (no need to verify again)
      const { user: realUser } = response.data
      
      if (realUser) {
        const userData = {
          id: realUser._id || realUser.id,
          username: realUser.username,
          email: realUser.email,
          fullName: realUser.fullName || realUser.full_name || realUser.username,
          role: realUser.role,
          avatar: realUser.avatar,
          status: realUser.status || 'active',
          permissions: realUser.permissions || {},
          lastLogin: new Date().toISOString()
        }
        setUser(userData)
        toast.success(`Bun venit, ${userData.fullName}!`)
        // Reset circuit breaker on successful login
        backendFailures.current = 0
        lastFailureTime.current = 0
        return { success: true }
      } else {
        throw new Error('No user data received after login')
      }
    } catch (error) {
      // Silent fail - don't spam console
      // console.error('Login error:', error)
      
      const isTimeout = error.code === 'ECONNABORTED'
      const is503 = error.response?.status === 503
      const is500 = error.response?.status === 500
      const is401 = error.response?.status === 401
      const isNetworkError = !error.response && error.message?.includes('Network')
      
      let message
      if (is503 || is500) {
        message = '🔴 ' + BACKEND_NOT_RUNNING_MSG
        backendFailures.current++
        lastFailureTime.current = Date.now()
        // Salvează circuit breaker pentru settings și keep-alive
        localStorage.setItem('settings_circuit_breaker_failure', '1')
        localStorage.setItem('settings_circuit_breaker_time', Date.now().toString())
        localStorage.setItem('backend_circuit_breaker_failure', '1')
        localStorage.setItem('backend_circuit_breaker_time', Date.now().toString())
      } else if (isTimeout || isNetworkError) {
        message = '⏱️ Nu s-a putut conecta la server. Verifică conexiunea la internet.'
        backendFailures.current++
        lastFailureTime.current = Date.now()
      } else if (is401) {
        message = error.response?.data?.message || 'Nume de utilizator sau parolă incorectă'
        // Don't increment failures for auth errors - these are user errors, not server errors
      } else {
        message = error.response?.data?.message || error.message || 'Eroare la autentificare'
      }
      
      // Only show one toast per login attempt
      toast.error(message, { duration: 5000, id: 'login-error' })
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    // Clear session storage
    sessionStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    toast.success('V-ați deconectat cu succes!')
  }

  const clearAuth = () => {
    // Clear session storage
    sessionStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    window.location.reload()
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    clearAuth,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
