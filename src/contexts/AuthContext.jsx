import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Configure axios base URL - use relative path for Vite proxy
// axios.defaults.baseURL = 'http://localhost:5001' // Commented out to use Vite proxy

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

  const verifyTokenWithRetry = async (maxRetries = 0) => { // SCHIMBAT: 0 retry-uri!
    // CIRCUIT BREAKER: Dacă backend-ul e down, NU mai încerca!
    const now = Date.now()
    if (backendFailures.current >= CIRCUIT_BREAKER_THRESHOLD) {
      if (now - lastFailureTime.current < CIRCUIT_BREAKER_RESET_TIME) {
        console.warn('🚫 CIRCUIT BREAKER ACTIV - Backend-ul este DOWN! Opresc request-urile...')
        throw new Error('Backend unavailable - circuit breaker active')
      } else {
        // Reset circuit breaker după 1 minut
        console.log('🔄 Circuit breaker RESET - încerc din nou...')
        backendFailures.current = 0
      }
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // NU mai trezesc backend-ul - pierdere de timp!
        const response = await axios.get('/api/auth/verify', { timeout: 10000 }) // Redus la 10s
        backendFailures.current = 0 // Reset failures on success
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
              toast.error('Backend-ul este temporar indisponibil. Încearcă din nou în câteva minute.', {
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
      
      // NU mai trezesc backend-ul - pierdere de timp și request-uri extra!

      const response = await axios.post(
        '/api/auth/login',
        { username, password },
        { timeout: 15000 } // Redus la 15s (era 30s!)
      )

      const { token: newToken } = response.data
      
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
        return { success: true }
      } else {
        throw new Error('No user data received after login')
      }
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED'
      const is503 = error.response?.status === 503
      
      let message
      if (is503) {
        message = '🔴 Backend-ul este CĂZUT (503). Contactează echipa tehnică!'
        backendFailures.current = CIRCUIT_BREAKER_THRESHOLD // Activează circuit breaker
      } else if (isTimeout) {
        message = '⏱️ Timeout la autentificare. Backend-ul răspunde greu - încearcă din nou în 1 minut.'
      } else {
        message = error.response?.data?.message || 'Eroare la autentificare'
      }
      
      toast.error(message, { duration: 8000, id: 'login-error' })
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
