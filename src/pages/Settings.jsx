import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import DatabaseBackup from '../components/DatabaseBackup'
import { Settings as SettingsIcon, Upload, Link as LinkIcon, Save, RefreshCw, Palette, Image, Monitor, Layout as LayoutIcon, LogIn, Database } from 'lucide-react'

const Settings = () => {
  const [activeSection, setActiveSection] = useState('header')
  const [settings, setSettings] = useState({
    logo: {
      type: 'upload',
      url: '',
      file: null
    },
    favicon: {
      type: 'upload',
      url: '',
      file: null
    },
    headerColor: {
      primary: '#2563eb',
      secondary: '#4f46e5',
      useGradient: true
    },
    background: {
      type: 'color',
      color: '#f1f5f9',
      imageUrl: '',
      imageFile: null
    },
    loginImage: {
      type: 'upload',
      url: '',
      file: null
    },
    loginButtonColor: {
      primary: '#FF7A00',
      secondary: '#FF9500',
      useGradient: false
    },
    loginPageColor: {
      primary: '#FFFFFF',
      secondary: '#F5F5F5',
      useGradient: false
    },
    loginCardColor: {
      primary: '#8B5CF6',
      secondary: '#A855F7',
      useGradient: true
    },
    loginTextColor: {
      title: '#1e293b',
      labels: '#334155',
      text: '#64748b'
    },
    appTitle: 'CASHPOT V7',
    appSubtitle: 'Gaming Management System',
    loginTexts: {
      title: 'Login',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      buttonText: 'Log In',
      forgotPassword: 'Forgot Password?',
      termsText: 'By clicking login you agree to the terms of the Club Membership Agreement and the Independent Partner Agreement',
      joinText: 'Got an invitation? Join Now',
      supportText: 'Need help? Contact us at login-support@in.group'
    }
  })

  useEffect(() => {
    // Load settings from server first, then localStorage as fallback
    loadSettingsFromServer()
  }, [])

  const loadSettingsFromServer = async () => {
    try {
      const response = await axios.get('/api/auth/verify')
      if (response.data.success && response.data.user) {
        const preferences = response.data.user.preferences || {}
        if (preferences.appSettings) {
          setSettings(preferences.appSettings)
          console.log('✅ Loaded app settings from server')
          return
        }
      }
    } catch (error) {
      console.log('⚠️ Could not load settings from server, using localStorage')
    }
    
    // Fallback to localStorage
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }

  const handleLogoTypeChange = (type) => {
    setSettings({
      ...settings,
      logo: { ...settings.logo, type }
    })
  }

  const handleLogoUrlChange = (url) => {
    setSettings({
      ...settings,
      logo: { ...settings.logo, url }
    })
  }

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSettings({
          ...settings,
          logo: { ...settings.logo, file: reader.result }
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFaviconTypeChange = (type) => {
    setSettings({
      ...settings,
      favicon: { ...settings.favicon, type }
    })
  }

  const handleFaviconUrlChange = (url) => {
    setSettings({
      ...settings,
      favicon: { ...settings.favicon, url }
    })
  }

  const handleFaviconFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSettings({
          ...settings,
          favicon: { ...settings.favicon, file: reader.result }
        })
        const link = document.querySelector("link[rel~='icon']")
        if (link) {
          link.href = reader.result
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleHeaderColorChange = (key, value) => {
    setSettings({
      ...settings,
      headerColor: { ...settings.headerColor, [key]: value }
    })
  }

  const handleBackgroundTypeChange = (type) => {
    setSettings({
      ...settings,
      background: { ...settings.background, type }
    })
  }

  const handleBackgroundColorChange = (color) => {
    setSettings({
      ...settings,
      background: { ...settings.background, color }
    })
    document.body.style.backgroundColor = color
  }

  const handleBackgroundImageUrlChange = (url) => {
    setSettings({
      ...settings,
      background: { ...settings.background, imageUrl: url }
    })
  }

  const handleBackgroundImageFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSettings({
          ...settings,
          background: { ...settings.background, imageFile: reader.result }
        })
        document.body.style.backgroundImage = `url(${reader.result})`
        document.body.style.backgroundSize = 'cover'
        document.body.style.backgroundPosition = 'center'
        document.body.style.backgroundAttachment = 'fixed'
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLoginImageTypeChange = (type) => {
    setSettings({
      ...settings,
      loginImage: { ...settings.loginImage, type }
    })
  }

  const handleLoginImageUrlChange = (url) => {
    setSettings({
      ...settings,
      loginImage: { ...settings.loginImage, url }
    })
  }

  const handleLoginImageFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSettings({
          ...settings,
          loginImage: { ...settings.loginImage, file: reader.result }
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLoginButtonColorChange = (key, value) => {
    setSettings({
      ...settings,
      loginButtonColor: { ...settings.loginButtonColor, [key]: value }
    })
  }

  const handleLoginPageColorChange = (key, value) => {
    setSettings({
      ...settings,
      loginPageColor: { ...settings.loginPageColor, [key]: value }
    })
  }

  const handleSave = async () => {
    try {
      // Save to server first
      const response = await axios.get('/api/auth/verify')
      if (response.data.success && response.data.user) {
        await axios.put(`/api/users/${response.data.user.id}/preferences`, {
          preferences: {
            appSettings: settings
          }
        })
        console.log('✅ App settings saved to server')
      }
    } catch (error) {
      console.error('❌ Error saving to server:', error)
    }
    
    // Also save to localStorage as backup
    localStorage.setItem('appSettings', JSON.stringify(settings))
    
    // Update favicon in HTML if it exists
    if (settings.favicon.file) {
      const link = document.querySelector("link[rel~='icon']")
      if (link) {
        link.href = settings.favicon.file
      } else {
        // Create favicon link if it doesn't exist
        const faviconLink = document.createElement('link')
        faviconLink.rel = 'icon'
        faviconLink.type = 'image/x-icon'
        faviconLink.href = settings.favicon.file
        document.head.appendChild(faviconLink)
      }
    }
    
    applySettings()
    alert('Setările au fost salvate cu succes!')
  }

  const handleReset = () => {
    if (window.confirm('Sigur doriți să resetați toate setările la valorile implicite?')) {
      const defaultSettings = {
        logo: { type: 'upload', url: '', file: null },
        favicon: { type: 'upload', url: '', file: null },
        headerColor: { primary: '#2563eb', secondary: '#4f46e5', useGradient: true },
        background: { type: 'color', color: '#f1f5f9', imageUrl: '', imageFile: null },
        loginImage: { type: 'upload', url: '', file: null },
        loginButtonColor: { primary: '#FF7A00', secondary: '#FF9500', useGradient: false },
        loginPageColor: { primary: '#FFFFFF', secondary: '#F5F5F5', useGradient: false },
        loginCardColor: { primary: '#8B5CF6', secondary: '#A855F7', useGradient: true },
        loginTextColor: { title: '#1e293b', labels: '#334155', text: '#64748b' },
        appTitle: 'CASHPOT V7',
        appSubtitle: 'Gaming Management System',
        loginTexts: {
          title: 'Login',
          emailLabel: 'Email',
          passwordLabel: 'Password',
          buttonText: 'Log In',
          forgotPassword: 'Forgot Password?',
          termsText: 'By clicking login you agree to the terms of the Club Membership Agreement and the Independent Partner Agreement',
          joinText: 'Got an invitation? Join Now',
          supportText: 'Need help? Contact us at login-support@in.group'
        }
      }
      setSettings(defaultSettings)
      localStorage.removeItem('appSettings')
      document.body.style.backgroundColor = '#f1f5f9'
      document.body.style.backgroundImage = 'none'
      alert('Setările au fost resetate!')
    }
  }

  const applySettings = () => {
    if (settings.headerColor.useGradient) {
      const header = document.querySelector('header')
      if (header) {
        header.style.background = `linear-gradient(to right, ${settings.headerColor.primary}, ${settings.headerColor.secondary})`
      }
    } else {
      const header = document.querySelector('header')
      if (header) {
        header.style.background = settings.headerColor.primary
      }
    }

    if (settings.background.type === 'color') {
      document.body.style.backgroundColor = settings.background.color
      document.body.style.backgroundImage = 'none'
    } else if (settings.background.type === 'image') {
      const bgImage = settings.background.imageFile || settings.background.imageUrl
      if (bgImage) {
        document.body.style.backgroundImage = `url(${bgImage})`
        document.body.style.backgroundSize = 'cover'
        document.body.style.backgroundPosition = 'center'
        document.body.style.backgroundAttachment = 'fixed'
      }
    }

    const faviconUrl = settings.favicon.file || settings.favicon.url
    if (faviconUrl) {
      const link = document.querySelector("link[rel~='icon']")
      if (link) {
        link.href = faviconUrl
      }
    }
  }

  useEffect(() => {
    applySettings()
  }, [settings])

  return (
    <Layout>
      <div className="space-y-6">
        {/* Tabs for Sections */}
        <div className="card p-6">
          <div className="flex space-x-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveSection('header')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeSection === 'header'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <LayoutIcon size={20} />
                <span>Header</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('main')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeSection === 'main'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Monitor size={20} />
                <span>Pagina Principală</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('login')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeSection === 'login'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <LogIn size={20} />
                <span>Login Page</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('backup')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                activeSection === 'backup'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Database size={20} />
                <span>Backup BD</span>
              </div>
            </button>
          </div>
        </div>

        {/* HEADER SETTINGS */}
        {activeSection === 'header' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Logo Settings */}
              <div className="card p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                  <Image className="w-5 h-5 text-blue-600" />
                  <span>Logo Aplicație</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleLogoTypeChange('upload')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                        settings.logo.type === 'upload'
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Upload
                    </button>
                    <button
                      onClick={() => handleLogoTypeChange('link')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                        settings.logo.type === 'link'
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4 inline mr-2" />
                      Link
                    </button>
                  </div>

                  {settings.logo.type === 'upload' ? (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Încarcă Logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 dark:hover:file:bg-blue-800/40"
                      />
                      {settings.logo.file && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                          <img src={settings.logo.file} alt="Logo Preview" className="h-16 object-contain" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        URL Logo
                      </label>
                      <input
                        type="text"
                        value={settings.logo.url}
                        onChange={(e) => handleLogoUrlChange(e.target.value)}
                        className="input-field"
                        placeholder="https://example.com/logo.png"
                      />
                      {settings.logo.url && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                          <img src={settings.logo.url} alt="Logo Preview" className="h-16 object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Header Color Settings */}
              <div className="card p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                  <Palette className="w-5 h-5 text-purple-600" />
                  <span>Culoare Header</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="gradientToggle"
                      checked={settings.headerColor.useGradient}
                      onChange={(e) => handleHeaderColorChange('useGradient', e.target.checked)}
                      className="form-checkbox rounded text-purple-600"
                    />
                    <label htmlFor="gradientToggle" className="text-sm font-semibold text-slate-700">
                      Folosește Gradient
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Culoare Primară
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.headerColor.primary}
                        onChange={(e) => handleHeaderColorChange('primary', e.target.value)}
                        className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.headerColor.primary}
                        onChange={(e) => handleHeaderColorChange('primary', e.target.value)}
                        className="input-field flex-1"
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>

                  {settings.headerColor.useGradient && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Culoare Secundară
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={settings.headerColor.secondary}
                          onChange={(e) => handleHeaderColorChange('secondary', e.target.value)}
                          className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.headerColor.secondary}
                          onChange={(e) => handleHeaderColorChange('secondary', e.target.value)}
                          className="input-field flex-1"
                          placeholder="#4f46e5"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg" style={{
                    background: settings.headerColor.useGradient
                      ? `linear-gradient(to right, ${settings.headerColor.primary}, ${settings.headerColor.secondary})`
                      : settings.headerColor.primary
                  }}>
                    <p className="text-white font-bold text-center">Preview Header</p>
                  </div>
                </div>
              </div>

              {/* App Title */}
              <div className="card p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                  <Palette className="w-5 h-5 text-teal-600" />
                  <span>Texte Header</span>
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Titlu Aplicație
                    </label>
                    <input
                      type="text"
                      value={settings.appTitle}
                      onChange={(e) => setSettings({...settings, appTitle: e.target.value})}
                      className="input-field"
                      placeholder="CASHPOT V7"
                    />
                    <p className="text-xs text-slate-500">Textul afișat în header</p>
                  </div>
                </div>
              </div>

              {/* Favicon Settings */}
              <div className="card p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                  <Image className="w-5 h-5 text-green-600" />
                  <span>Favicon</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleFaviconTypeChange('upload')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                        settings.favicon.type === 'upload'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Upload
                    </button>
                    <button
                      onClick={() => handleFaviconTypeChange('link')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                        settings.favicon.type === 'link'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4 inline mr-2" />
                      Link
                    </button>
                  </div>

                  {settings.favicon.type === 'upload' ? (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Încarcă Favicon
                      </label>
                      <input
                        type="file"
                        accept="image/*,.ico"
                        onChange={handleFaviconFileChange}
                        className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/30 dark:file:text-green-300 dark:hover:file:bg-green-800/40"
                      />
                      {settings.favicon.file && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                          <img src={settings.favicon.file} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        URL Favicon
                      </label>
                      <input
                        type="text"
                        value={settings.favicon.url}
                        onChange={(e) => handleFaviconUrlChange(e.target.value)}
                        className="input-field"
                        placeholder="https://example.com/favicon.ico"
                      />
                      {settings.favicon.url && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                          <img src={settings.favicon.url} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN PAGE SETTINGS */}
        {activeSection === 'main' && (
          <div className="space-y-6">
            {/* Background Settings */}
            <div className="card p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Image className="w-5 h-5 text-orange-600" />
                <span>Fundal Pagină</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBackgroundTypeChange('color')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      settings.background.type === 'color'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Culoare
                  </button>
                  <button
                    onClick={() => handleBackgroundTypeChange('image')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      settings.background.type === 'image'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Imagine
                  </button>
                </div>

                {settings.background.type === 'color' ? (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Culoare Fundal
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.background.color}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.background.color}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        className="input-field flex-1"
                        placeholder="#f1f5f9"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSettings({...settings, background: {...settings.background, imageType: 'upload'}})}
                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold"
                      >
                        <Upload className="w-4 h-4 inline mr-1" />
                        Upload
                      </button>
                      <button
                        onClick={() => setSettings({...settings, background: {...settings.background, imageType: 'link'}})}
                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold"
                      >
                        <LinkIcon className="w-4 h-4 inline mr-1" />
                        Link
                      </button>
                    </div>

                    {settings.background.imageType === 'upload' ? (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Încarcă Imagine
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackgroundImageFileChange}
                          className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/30 dark:file:text-orange-300 dark:hover:file:bg-orange-800/40"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          URL Imagine
                        </label>
                        <input
                          type="text"
                          value={settings.background.imageUrl}
                          onChange={(e) => handleBackgroundImageUrlChange(e.target.value)}
                          className="input-field"
                          placeholder="https://example.com/background.jpg"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LOGIN PAGE SETTINGS */}
        {activeSection === 'login' && (
          <div className="space-y-6">
            {/* Login Texts */}
            <div className="card p-6 space-y-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Palette className="w-5 h-5 text-teal-600" />
                <span>Texte Login</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Titlu Login</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.title || 'Login'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), title: e.target.value}})}
                    className="input-field"
                    placeholder="Login"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Etichetă Email</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.emailLabel || 'Email'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), emailLabel: e.target.value}})}
                    className="input-field"
                    placeholder="Email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Etichetă Parolă</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.passwordLabel || 'Password'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), passwordLabel: e.target.value}})}
                    className="input-field"
                    placeholder="Password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Text Buton</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.buttonText || 'Log In'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), buttonText: e.target.value}})}
                    className="input-field"
                    placeholder="Log In"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="block text-sm font-bold text-slate-700">Text "Forgot Password"</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.forgotPassword || 'Forgot Password?'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), forgotPassword: e.target.value}})}
                    className="input-field"
                    placeholder="Forgot Password?"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="block text-sm font-bold text-slate-700">Text Termeni</label>
                  <textarea
                    value={settings.loginTexts?.termsText || ''}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), termsText: e.target.value}})}
                    className="input-field min-h-[60px] resize-none"
                    placeholder="By clicking login you agree to the terms..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Text "Join Now"</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.joinText || 'Got an invitation? Join Now'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), joinText: e.target.value}})}
                    className="input-field"
                    placeholder="Got an invitation? Join Now"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Text Support</label>
                  <input
                    type="text"
                    value={settings.loginTexts?.supportText || 'Need help? Contact us at...'}
                    onChange={(e) => setSettings({...settings, loginTexts: {...(settings.loginTexts || {}), supportText: e.target.value}})}
                    className="input-field"
                    placeholder="Need help? Contact us at..."
                  />
                </div>
              </div>
            </div>

            {/* Login Text Colors */}
            <div className="card p-6 space-y-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Palette className="w-5 h-5 text-pink-600" />
                <span>Culori Text Login</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Culoare Titlu</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.loginTextColor?.title || '#1e293b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), title: e.target.value}})}
                      className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.loginTextColor?.title || '#1e293b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), title: e.target.value}})}
                      className="input-field flex-1"
                      placeholder="#1e293b"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="font-bold text-2xl text-center" style={{ color: settings.loginTextColor?.title || '#1e293b' }}>Login</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Culoare Etichete</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.loginTextColor?.labels || '#334155'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), labels: e.target.value}})}
                      className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.loginTextColor?.labels || '#334155'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), labels: e.target.value}})}
                      className="input-field flex-1"
                      placeholder="#334155"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="font-semibold text-sm" style={{ color: settings.loginTextColor?.labels || '#334155' }}>Email *</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Text Secundar</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.loginTextColor?.text || '#64748b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), text: e.target.value}})}
                      className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.loginTextColor?.text || '#64748b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), text: e.target.value}})}
                      className="input-field flex-1"
                      placeholder="#64748b"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-center" style={{ color: settings.loginTextColor?.text || '#64748b' }}>Terms & Support</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Page Colors */}
            <div className="card p-6 space-y-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Palette className="w-5 h-5 text-indigo-600" />
                <span>Culori Fundal Login</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Login Page BG Color */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Fundal Formular</h4>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="loginPageGradient"
                      checked={settings.loginPageColor?.useGradient || false}
                      onChange={(e) => setSettings({...settings, loginPageColor: {...settings.loginPageColor, useGradient: e.target.checked}})}
                      className="form-checkbox rounded text-indigo-600"
                    />
                    <label htmlFor="loginPageGradient" className="text-sm font-semibold text-slate-700">
                      Gradient
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Culoare Primară</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.loginPageColor?.primary || '#FFFFFF'}
                        onChange={(e) => setSettings({...settings, loginPageColor: {...settings.loginPageColor, primary: e.target.value}})}
                        className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.loginPageColor?.primary || '#FFFFFF'}
                        onChange={(e) => setSettings({...settings, loginPageColor: {...settings.loginPageColor, primary: e.target.value}})}
                        className="input-field flex-1"
                      />
                    </div>
                  </div>

                  {settings.loginPageColor?.useGradient && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Culoare Secundară</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={settings.loginPageColor?.secondary || '#F5F5F5'}
                          onChange={(e) => setSettings({...settings, loginPageColor: {...settings.loginPageColor, secondary: e.target.value}})}
                          className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.loginPageColor?.secondary || '#F5F5F5'}
                          onChange={(e) => setSettings({...settings, loginPageColor: {...settings.loginPageColor, secondary: e.target.value}})}
                          className="input-field flex-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg" style={{
                    background: settings.loginPageColor?.useGradient
                      ? `linear-gradient(to right, ${settings.loginPageColor.primary}, ${settings.loginPageColor.secondary})`
                      : settings.loginPageColor?.primary || '#FFFFFF'
                  }}>
                    <p className="text-slate-800 font-bold text-center">Preview Fundal</p>
                  </div>
                </div>

                {/* Login Card Color */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Card Sub Logo</h4>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="loginCardGradient"
                      checked={settings.loginCardColor?.useGradient || false}
                      onChange={(e) => setSettings({...settings, loginCardColor: {...settings.loginCardColor, useGradient: e.target.checked}})}
                      className="form-checkbox rounded text-purple-600"
                    />
                    <label htmlFor="loginCardGradient" className="text-sm font-semibold text-slate-700">
                      Gradient
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Culoare Primară</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.loginCardColor?.primary || '#8B5CF6'}
                        onChange={(e) => setSettings({...settings, loginCardColor: {...settings.loginCardColor, primary: e.target.value}})}
                        className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.loginCardColor?.primary || '#8B5CF6'}
                        onChange={(e) => setSettings({...settings, loginCardColor: {...settings.loginCardColor, primary: e.target.value}})}
                        className="input-field flex-1"
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>

                  {settings.loginCardColor?.useGradient && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Culoare Secundară</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={settings.loginCardColor?.secondary || '#A855F7'}
                          onChange={(e) => setSettings({...settings, loginCardColor: {...settings.loginCardColor, secondary: e.target.value}})}
                          className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.loginCardColor?.secondary || '#A855F7'}
                          onChange={(e) => setSettings({...settings, loginCardColor: {...settings.loginCardColor, secondary: e.target.value}})}
                          className="input-field flex-1"
                          placeholder="#A855F7"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl shadow-2xl p-8" style={{
                    background: settings.loginCardColor?.useGradient
                      ? `linear-gradient(to right, ${settings.loginCardColor.primary}, ${settings.loginCardColor.secondary})`
                      : settings.loginCardColor?.primary || '#8B5CF6'
                  }}>
                    <p className="text-white font-bold text-2xl text-center">Login</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Button Color */}
            <div className="card p-6 space-y-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Palette className="w-5 h-5 text-orange-600" />
                <span>Culoare Buton Login</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Culoare Buton</h4>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="loginButtonGradient"
                      checked={settings.loginButtonColor?.useGradient || false}
                      onChange={(e) => handleLoginButtonColorChange('useGradient', e.target.checked)}
                      className="form-checkbox rounded text-indigo-600"
                    />
                    <label htmlFor="loginButtonGradient" className="text-sm font-semibold text-slate-700">
                      Gradient
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Culoare Primară</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.loginButtonColor?.primary || '#FF7A00'}
                        onChange={(e) => handleLoginButtonColorChange('primary', e.target.value)}
                        className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.loginButtonColor?.primary || '#FF7A00'}
                        onChange={(e) => handleLoginButtonColorChange('primary', e.target.value)}
                        className="input-field flex-1"
                      />
                    </div>
                  </div>

                  {settings.loginButtonColor?.useGradient && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Culoare Secundară</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={settings.loginButtonColor?.secondary || '#FF9500'}
                          onChange={(e) => handleLoginButtonColorChange('secondary', e.target.value)}
                          className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.loginButtonColor?.secondary || '#FF9500'}
                          onChange={(e) => handleLoginButtonColorChange('secondary', e.target.value)}
                          className="input-field flex-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg" style={{
                    background: settings.loginButtonColor?.useGradient
                      ? `linear-gradient(to right, ${settings.loginButtonColor.primary}, ${settings.loginButtonColor.secondary})`
                      : settings.loginButtonColor?.primary || '#FF7A00'
                  }}>
                    <p className="text-white font-bold text-center">Preview Button</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Text Colors */}
            <div className="card p-6 space-y-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Palette className="w-5 h-5 text-pink-600" />
                <span>Culori Text Login</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Culoare Titlu</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.loginTextColor?.title || '#1e293b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), title: e.target.value}})}
                      className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.loginTextColor?.title || '#1e293b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), title: e.target.value}})}
                      className="input-field flex-1"
                      placeholder="#1e293b"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="font-bold text-2xl text-center" style={{ color: settings.loginTextColor?.title || '#1e293b' }}>Login</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Culoare Etichete</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.loginTextColor?.labels || '#334155'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), labels: e.target.value}})}
                      className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.loginTextColor?.labels || '#334155'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), labels: e.target.value}})}
                      className="input-field flex-1"
                      placeholder="#334155"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="font-semibold text-sm text-center" style={{ color: settings.loginTextColor?.labels || '#334155' }}>Email *</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">Text Secundar</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.loginTextColor?.text || '#64748b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), text: e.target.value}})}
                      className="h-12 w-20 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.loginTextColor?.text || '#64748b'}
                      onChange={(e) => setSettings({...settings, loginTextColor: {...(settings.loginTextColor || {}), text: e.target.value}})}
                      className="input-field flex-1"
                      placeholder="#64748b"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-center" style={{ color: settings.loginTextColor?.text || '#64748b' }}>Terms</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Background Image */}
            <div className="card p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-4">
                <Image className="w-5 h-5 text-indigo-600" />
                <span>Imagine Fundal Login</span>
              </h3>
              
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => handleLoginImageTypeChange('upload')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                    settings.loginImage?.type === 'upload'
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload
                </button>
                <button
                  onClick={() => handleLoginImageTypeChange('link')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                    settings.loginImage?.type === 'link'
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  Link
                </button>
              </div>

              {settings.loginImage?.type === 'upload' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Încarcă Imagine</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLoginImageFileChange}
                    className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 dark:hover:file:bg-indigo-800/40"
                  />
                  {settings.loginImage?.file && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <img src={settings.loginImage.file} alt="Login Preview" className="h-32 w-full object-cover rounded" />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">URL Imagine</label>
                  <input
                    type="text"
                    value={settings.loginImage?.url || ''}
                    onChange={(e) => handleLoginImageUrlChange(e.target.value)}
                    className="input-field"
                    placeholder="https://example.com/login-bg.jpg"
                  />
                  {settings.loginImage?.url && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <img src={settings.loginImage.url} alt="Login Preview" className="h-32 w-full object-cover rounded" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BACKUP SETTINGS */}
        {activeSection === 'backup' && (
          <DatabaseBackup compact={false} />
        )}

        {/* Action Buttons */}
        {activeSection !== 'backup' && (
          <div className="card p-6">
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleReset}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw size={18} />
                <span>Resetează</span>
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={18} />
                <span>Salvează Setări</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Settings
