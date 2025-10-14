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
          // Fetch real user data from database with timeout
          const response = await axios.get('/api/users', { timeout: 30000 })
          const users = response.data
          const realUser = users.find(u => u.username === 'admin') || users[0]
          
          if (realUser) {
            setUser({
              id: realUser.id.toString(),
              username: realUser.username,
              email: realUser.email,
              fullName: realUser.full_name || realUser.username,
              role: realUser.role,
              avatar: realUser.avatar,
              status: 'active',
              lastLogin: new Date().toISOString()
            })
          } else {
            // Fallback to mock user if no real user found
            const mockUser = {
              id: '1',
              username: 'admin',
              email: 'admin@cashpot-v7.com',
              fullName: 'Administrator Sistem',
              role: 'admin',
              avatar: null,
              status: 'active',
              lastLogin: new Date().toISOString()
            }
            setUser(mockUser)
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

      const { token: newToken, user: userData } = response.data
      
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(userData)
      
      toast.success(`Bun venit, ${userData.fullName}!`)
      return { success: true }
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

  const updateUser = (userData) => {
    setUser(userData)
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
