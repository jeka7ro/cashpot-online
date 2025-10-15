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
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Verify token and get real user data
          const response = await axios.get('/api/auth/verify', { timeout: 10000 })
          const realUser = response.data
          
          if (realUser) {
            setUser({
              id: realUser._id || realUser.id,
              username: realUser.username,
              email: realUser.email,
              fullName: realUser.fullName || realUser.full_name || realUser.username,
              role: realUser.role,
              avatar: realUser.avatar,
              status: realUser.status || 'active',
              lastLogin: new Date().toISOString()
            })
          } else {
            console.error('No user data received from verify endpoint')
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
          }
        } catch (error) {
          console.error('Auth verification failed:', error)
          // Don't clear token on timeout, just show error
          if (error.code === 'ECONNABORTED') {
            toast.error('Timeout la verificare autentificare')
          }
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
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
      const response = await axios.post('/api/auth/login', {
        username,
        password
      })

      const { token: newToken } = response.data
      
      localStorage.setItem('token', newToken)
      setToken(newToken)
      
      // Set axios header immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      
      // Verify token to get real user data
      const verifyResponse = await axios.get('/api/auth/verify', { timeout: 10000 })
      const realUser = verifyResponse.data
      
      if (realUser) {
        const userData = {
          id: realUser._id || realUser.id,
          username: realUser.username,
          email: realUser.email,
          fullName: realUser.fullName || realUser.full_name || realUser.username,
          role: realUser.role,
          avatar: realUser.avatar,
          status: realUser.status || 'active',
          lastLogin: new Date().toISOString()
        }
        setUser(userData)
        toast.success(`Bun venit, ${userData.fullName}!`)
        return { success: true }
      } else {
        throw new Error('No user data received after login')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Eroare la autentificare'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    // Note: We don't remove savedCredentials here to allow users to stay logged in
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    toast.success('V-ați deconectat cu succes!')
  }

  const clearAuth = () => {
    localStorage.clear()
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
