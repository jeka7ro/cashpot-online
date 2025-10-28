import React, { createContext, useContext, useState, useEffect } from 'react'
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

  // Wake-up helper to avoid long cold starts on Render
  const wakeUpBackend = async () => {
    try {
      await axios.get('/api/health', { timeout: 4000 })
    } catch (_e) {
      // ignore
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
          // Verify token and get real user data
          const response = await axios.get('/api/auth/verify', { timeout: 10000 })
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
          
          // Only clear token if it's an actual auth error (not timeout)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('🔄 Token expired - clearing session')
            sessionStorage.removeItem('authToken')
            setToken(null)
            setUser(null)
            delete axios.defaults.headers.common['Authorization']
          } else if (error.code === 'ECONNABORTED') {
            // On timeout, just warn but don't clear token
            console.warn('⚠️ Timeout on auth verification - keeping session alive')
            toast.error('Timeout la verificare autentificare. Încercă refresh.')
          } else {
            console.error('❌ Auth check failed - clearing session')
            sessionStorage.removeItem('authToken')
            setToken(null)
            setUser(null)
          }
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
      // Attempt to wake the backend quickly to avoid UI hang
      await wakeUpBackend()

      const response = await axios.post(
        '/api/auth/login',
        { username, password },
        { timeout: 12000 }
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
        return { success: true }
      } else {
        throw new Error('No user data received after login')
      }
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED'
      const message = isTimeout
        ? 'Server-ul răspunde greu. Încearcă din nou (auto-wake aplicat)'
        : (error.response?.data?.message || 'Eroare la autentificare')
      toast.error(message)
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
