import React, { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

const Login = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, loading } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(false)

  // CIRCUIT BREAKER pentru global-settings - oprește loop-ul infinit!
  const settingsLoadAttempted = useRef(false)
  const settingsFailures = useRef(0)
  const lastSettingsFailure = useRef(0)
  const autoLoginAttempted = useRef(false) // Previne auto-login repetat
  const SETTINGS_CIRCUIT_BREAKER_THRESHOLD = 1 // OPRESTE după PRIMUL eșec 500!
  const SETTINGS_CIRCUIT_BREAKER_RESET_TIME = 120000 // 2 minute înainte de retry

  const [settings, setSettings] = useState({
    logo: { type: 'upload', url: '', file: null },
    loginImage: { type: 'upload', url: '', file: null },
    loginButtonColor: { primary: '#FF7A00', secondary: '#FF9500', useGradient: false },
    loginPageColor: { primary: '#FFFFFF', secondary: '#F5F5F5', useGradient: false },
    loginCardColor: { primary: '#8B5CF6', secondary: '#A855F7', useGradient: true },
    loginTextColor: {
      title: '#1e293b',
      labels: '#334155',
      text: '#64748b'
    },
    loginTexts: {
      title: 'Welcome Back',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      buttonText: 'Sign In to CASHPOT',
      forgotPassword: 'Forgot your password?',
      termsText: 'By signing in, you agree to our Terms of Service and Privacy Policy',
      joinText: 'New to CASHPOT? Create Account',
      supportText: 'Need assistance? Contact our support team'
    }
  })

  useEffect(() => {
    // Verifică circuit breaker-ul din localStorage la mount
    const storedFailure = localStorage.getItem('settings_circuit_breaker_failure')
    const storedTime = localStorage.getItem('settings_circuit_breaker_time')
    const now = Date.now()

    // Load global login settings from server - DOAR O DATĂ!
    const loadGlobalSettings = async () => {
      // Dacă circuit breaker-ul e activ, TESTEAZĂ backend-ul înainte de a bloca!
      if (storedFailure && storedTime) {
        const timeSinceFailure = now - parseInt(storedTime)
        if (timeSinceFailure < SETTINGS_CIRCUIT_BREAKER_RESET_TIME) {
          // Testează backend-ul înainte de a bloca complet
          try {
            const healthCheck = await axios.get('/health', { timeout: 3000 })
            if (healthCheck.data.status === 'OK') {
              // Backend-ul funcționează! Șterge circuit breaker-ul
              localStorage.removeItem('settings_circuit_breaker_failure')
              localStorage.removeItem('settings_circuit_breaker_time')
              localStorage.removeItem('backend_circuit_breaker_failure')
              localStorage.removeItem('backend_circuit_breaker_time')
              settingsFailures.current = 0
              settingsLoadAttempted.current = false // Permite încercarea din nou
              // Continuă cu loadGlobalSettings
            } else {
              // Backend-ul e încă down - oprește
              settingsFailures.current = SETTINGS_CIRCUIT_BREAKER_THRESHOLD
              lastSettingsFailure.current = parseInt(storedTime)
              settingsLoadAttempted.current = true
              return
            }
          } catch (healthError) {
            // Backend-ul e încă down - oprește
            settingsFailures.current = SETTINGS_CIRCUIT_BREAKER_THRESHOLD
            lastSettingsFailure.current = parseInt(storedTime)
            settingsLoadAttempted.current = true
            return
          }
        } else {
          // Reset după 2 minute
          localStorage.removeItem('settings_circuit_breaker_failure')
          localStorage.removeItem('settings_circuit_breaker_time')
          settingsFailures.current = 0
        }
      }
      // CIRCUIT BREAKER: Oprește loop-ul infinit!
      if (settingsLoadAttempted.current) {
        return // Deja încercat, nu mai încerca!
      }

      const now2 = Date.now()
      if (settingsFailures.current >= SETTINGS_CIRCUIT_BREAKER_THRESHOLD) {
        if (now2 - lastSettingsFailure.current < SETTINGS_CIRCUIT_BREAKER_RESET_TIME) {
          // Circuit breaker activ - nu mai încerca!
          return
        } else {
          // Reset după 2 minute
          settingsFailures.current = 0
          localStorage.removeItem('settings_circuit_breaker_failure')
          localStorage.removeItem('settings_circuit_breaker_time')
        }
      }

      settingsLoadAttempted.current = true

      try {
        const response = await axios.get('/api/global-settings', { timeout: 5000 })
        if (response.data.login_settings) {
          const globalSettings = response.data.login_settings
          setSettings(prev => ({
            logo: globalSettings.logo || prev.logo,
            loginImage: globalSettings.loginImage || prev.loginImage,
            loginButtonColor: globalSettings.loginButtonColor || prev.loginButtonColor,
            loginPageColor: globalSettings.loginPageColor || prev.loginPageColor,
            loginCardColor: globalSettings.loginCardColor || prev.loginCardColor,
            loginTextColor: globalSettings.loginTextColor || prev.loginTextColor,
            loginTexts: globalSettings.loginTexts || prev.loginTexts
          }))
          settingsFailures.current = 0 // Reset failures on success
          localStorage.removeItem('settings_circuit_breaker_failure')
          localStorage.removeItem('settings_circuit_breaker_time')
          // console.log('✅ Loaded global login settings from server')
        }
      } catch (error) {
        // Dacă e 500, backend-ul e DOWN - oprește complet!
        if (error.response?.status === 500) {
          settingsFailures.current = SETTINGS_CIRCUIT_BREAKER_THRESHOLD // Oprește complet!
          lastSettingsFailure.current = Date.now()
          // Salvează în localStorage pentru persistență
          localStorage.setItem('settings_circuit_breaker_failure', SETTINGS_CIRCUIT_BREAKER_THRESHOLD.toString())
          localStorage.setItem('settings_circuit_breaker_time', Date.now().toString())
        } else {
          settingsFailures.current++
          lastSettingsFailure.current = Date.now()
        }
        // Silent fail - don't spam console
        // console.log('⚠️ Could not load global login settings from server')
      }
    }

    // Apelează loadGlobalSettings() DOAR dacă circuit breaker-ul NU e activ!
    if (!settingsLoadAttempted.current) {
      loadGlobalSettings()
    }

    // Load saved credentials from localStorage
    const savedCredentials = localStorage.getItem('cashpot_remember_credentials')
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials)
        setFormData({
          username: credentials.username || '',
          password: credentials.password || ''
        })
        setRememberPassword(true)
      } catch (error) {
        // Silent fail
        // console.error('Error loading saved credentials:', error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // DOAR la mount - nu mai depinde de login/isAuthenticated/loading!

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await login(formData.username, formData.password)

    if (result.success) {
      // Save credentials if "Remember Password" is checked
      if (rememberPassword) {
        const credentials = {
          username: formData.username,
          password: formData.password
        }
        localStorage.setItem('cashpot_remember_credentials', JSON.stringify(credentials))
        console.log('✅ Credentials saved to localStorage')
      } else {
        // Remove saved credentials if user unchecks "Remember Password"
        localStorage.removeItem('cashpot_remember_credentials')
        console.log('🗑️ Credentials removed from localStorage')
      }

      navigate('/dashboard', { replace: true })
    }

    setIsSubmitting(false)
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const logoUrl = settings.logo.file || settings.logo.url
  const loginImageUrl = settings.loginImage.file || settings.loginImage.url || 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80'

  const buttonStyle = settings.loginButtonColor.useGradient
    ? { background: `linear-gradient(to right, ${settings.loginButtonColor.primary}, ${settings.loginButtonColor.secondary})` }
    : { backgroundColor: settings.loginButtonColor.primary }

  const pageStyle = settings.loginPageColor.useGradient
    ? { background: `linear-gradient(to right, ${settings.loginPageColor.primary}, ${settings.loginPageColor.secondary})` }
    : { backgroundColor: settings.loginPageColor.primary }

  const cardStyle = settings.loginCardColor?.useGradient
    ? { background: `linear-gradient(to right, ${settings.loginCardColor.primary}, ${settings.loginCardColor.secondary})` }
    : { backgroundColor: settings.loginCardColor?.primary || '#8B5CF6' }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center pt-16" style={pageStyle}>
        {/* Login Form Container */}
        <div className="w-full max-w-lg px-8 lg:px-16">
          {/* Card Colorat cu Logo și Form */}
          <div className="rounded-2xl shadow-2xl p-16" style={cardStyle}>
            {/* Logo și Titlu în Card */}
            <div className="flex flex-col items-center mb-12">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-20 md:h-24 object-contain mb-4"
                />
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
                {settings.loginTexts?.title || 'Welcome Back'}
              </h1>
              <p className="text-white/80 text-center mt-2">
                Access your CASHPOT dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  {settings.loginTexts?.emailLabel || 'Email'}<span className="text-red-300">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  {settings.loginTexts?.passwordLabel || 'Password'}<span className="text-red-300">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember Password Checkbox */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(e) => setRememberPassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-white font-medium">
                    Remember Password
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={buttonStyle}
              >
                {isSubmitting || loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{settings.loginTexts?.buttonText || 'Log In'}</span>
                  </div>
                ) : (
                  settings.loginTexts?.buttonText || 'Log In'
                )}
              </button>
            </form>
          </div>

          {/* Forgot Password */}
          <div className="mt-8 text-center">
            <a href="#" className="text-sm text-orange-500 hover:text-orange-600 font-medium hover:underline">
              {settings.loginTexts?.forgotPassword || 'Forgot Password?'}
            </a>
          </div>

          {/* Terms */}
          <div className="mt-6 text-xs text-center" style={{ color: settings.loginTextColor?.text || '#64748b' }}>
            {settings.loginTexts?.termsText || 'By clicking login you agree to the terms of the Club Membership Agreement and the Independent Partner Agreement'}
          </div>

          {/* Create Account */}
          <div className="mt-4 text-center text-sm" style={{ color: settings.loginTextColor?.text || '#64748b' }}>
            <span dangerouslySetInnerHTML={{ __html: (settings.loginTexts?.joinText || 'New to CASHPOT? Create Account').replace(/Create Account/g, '<a href="#" class="text-orange-500 hover:text-orange-600 font-semibold hover:underline">Create Account</a>') }} />
          </div>

          {/* Support */}
          <div className="mt-4 text-xs text-center" style={{ color: settings.loginTextColor?.text || '#64748b' }}>
            {settings.loginTexts?.supportText || 'Need help? Contact us at login-support@in.group'}
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8" style={pageStyle}>
        <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl">
          <img
            src={loginImageUrl}
            alt="Login Background"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80'
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Login