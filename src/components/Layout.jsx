import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useTheme } from '../contexts/ThemeContext'
import { getVersion, getBuild, getBuildDate } from '../utils/version'
import { hasPermission, MODULES, getDefaultPermissionsForRole } from '../utils/permissions'
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Bell, 
  Settings,
  Building2,
  MapPin,
  Users,
  Gamepad2,
  Cherry as MixIcon,
  BarChart3,
  Package,
  Activity,
  Trophy,
  FileText,
  Shield,
  FileText as DocIcon,
  Users as UserIcon,
  Moon,
  Sun,
  History,
  TrendingUp
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user, logout } = useAuth()
  
  // Show sidebar for all users, but filter menu items based on permissions
  const shouldShowSidebar = true
  const { companies, locations, providers, platforms, cabinets, gameMixes, slots, warehouse, metrology, approvals, jackpots, invoices, onjnReports, legalDocuments, users, promotions } = useData()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  
  // Load settings from localStorage
  const [settings, setSettings] = React.useState({
    logo: { type: 'upload', url: '', file: null },
    headerColor: { primary: '#2563eb', secondary: '#4f46e5', useGradient: true },
    appTitle: 'CASHPOT V7',
    appSubtitle: 'Gaming Management System'
  })

  React.useEffect(() => {
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
          
          // Update favicon if it exists
          if (preferences.appSettings.favicon && preferences.appSettings.favicon.file) {
            const link = document.querySelector("link[rel~='icon']")
            if (link) {
              link.href = preferences.appSettings.favicon.file
            } else {
              const faviconLink = document.createElement('link')
              faviconLink.rel = 'icon'
              faviconLink.type = 'image/x-icon'
              faviconLink.href = preferences.appSettings.favicon.file
              document.head.appendChild(faviconLink)
            }
          }
          
          console.log('✅ Loaded app settings in Layout from server')
          return
        }
      }
    } catch (error) {
      console.log('⚠️ Could not load settings from server in Layout')
    }
  }

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const allMenuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      path: '/dashboard',
      count: null,
      module: MODULES.DASHBOARD
    },
    { 
      id: 'companies', 
      label: 'Companii', 
      icon: Building2, 
      path: '/companies',
      count: companies.length,
      module: MODULES.COMPANIES
    },
    { 
      id: 'locations', 
      label: 'Locații', 
      icon: MapPin, 
      path: '/locations',
      count: locations.length,
      module: MODULES.LOCATIONS
    },
    { 
      id: 'providers', 
      label: 'Furnizori', 
      icon: Users, 
      path: '/providers',
      count: providers.length,
      module: MODULES.PROVIDERS
    },
    { 
      id: 'cabinets', 
      label: 'Cabinete', 
      icon: Gamepad2, 
      path: '/cabinets',
      count: cabinets.length,
      module: MODULES.CABINETS
    },
    { 
      id: 'game-mixes', 
      label: 'Game Mixes', 
      icon: MixIcon, 
      path: '/game-mixes',
      count: gameMixes.length,
      module: MODULES.GAME_MIXES
    },
    { 
      id: 'slots', 
      label: 'Sloturi', 
      icon: BarChart3, 
      path: '/slots',
      count: slots.length,
      module: MODULES.SLOTS
    },
    { 
      id: 'warehouse', 
      label: 'Depozit', 
      icon: Package, 
      path: '/warehouse',
      count: warehouse.length,
      module: MODULES.WAREHOUSE
    },
    { 
      id: 'metrology', 
      label: 'Metrologie CVT', 
      icon: Activity, 
      path: '/metrology',
      count: metrology.length,
      module: MODULES.METROLOGY
    },
    { 
      id: 'jackpots', 
      label: 'Jackpots', 
      icon: Trophy, 
      path: '/jackpots',
      count: jackpots.length,
      module: MODULES.JACKPOTS
    },
    { 
      id: 'invoices', 
      label: 'Facturi', 
      icon: FileText, 
      path: '/invoices',
      count: invoices.length,
      module: MODULES.INVOICES
    },
    { 
      id: 'onjn-reports', 
      label: 'Rapoarte ONJN', 
      icon: Shield, 
      path: '/onjn-reports',
      count: onjnReports.length,
      module: MODULES.ONJN
    },
    { 
      id: 'legal-documents', 
      label: 'Documente Legale', 
      icon: DocIcon, 
      path: '/legal-documents',
      count: legalDocuments.length,
      module: MODULES.LEGAL
    },
    { 
      id: 'marketing', 
      label: 'Marketing & Promoții', 
      icon: TrendingUp, 
      path: '/marketing',
      count: promotions?.length || 0,
      module: MODULES.MARKETING
    },
    { 
      id: 'users', 
      label: 'Utilizatori', 
      icon: UserIcon, 
      path: '/users',
      count: users.length,
      module: MODULES.USERS,
      requiresAdmin: true
    },
    { 
      id: 'settings', 
      label: 'Setări', 
      icon: Settings, 
      path: '/settings',
      count: null,
      module: MODULES.SETTINGS
    }
  ]

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    // Admin sees everything
    if (user?.role === 'admin') return true
    
    // Check if item requires admin role
    if (item.requiresAdmin && user?.role !== 'admin') return false
    
    // Get user permissions (from database or default for role)
    const userPermissions = user?.permissions && Object.keys(user.permissions).length > 0 
      ? user.permissions 
      : getDefaultPermissionsForRole(user?.role)
    
    // Debug logging (temporarily disabled)
    // console.log(`Checking ${item.label} (${item.module}) for user ${user?.username} (${user?.role}):`, 
    //   hasPermission(userPermissions, item.module, 'view'))
    
    // Check if user has view permission for this module
    return hasPermission(userPermissions, item.module, 'view')
  })

  const currentPage = menuItems.find(item => item.path === location.pathname)

  // Header style adaptat pentru dark mode
  const headerStyle = theme === 'dark'
    ? { background: 'linear-gradient(to right, #1e293b, #0f172a)' } // Dark mode gradient
    : settings.headerColor.useGradient
      ? { background: `linear-gradient(to right, ${settings.headerColor.primary}, ${settings.headerColor.secondary})` }
      : { backgroundColor: settings.headerColor.primary }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Glassmorphism Header */}
      <div className={`fixed top-0 left-0 right-0 backdrop-blur-xl border-b text-white px-4 md:px-6 py-2 md:py-3 z-30 shadow-2xl ${theme === 'dark' ? 'border-slate-700/50 shadow-slate-900/20' : 'border-white/20 shadow-blue-500/10'}`} style={headerStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            {shouldShowSidebar && (
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className={`p-2 rounded-xl transition-all duration-200 hover:shadow-lg ${theme === 'dark' ? 'hover:bg-slate-700/80' : 'hover:bg-slate-100/80'}`}
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center">
              {settings.logo.file || settings.logo.url ? (
                <img 
                  src={settings.logo.file || settings.logo.url} 
                  alt="Logo" 
                  className="h-8 md:h-12 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/30 ring-2 ring-orange-200/50" style={{display: settings.logo.file || settings.logo.url ? 'none' : 'flex'}}>
                <span className="text-white font-bold text-base md:text-xl">C</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Data și ora actuală */}
            <div className="hidden md:block text-right">
              <div className="text-white font-semibold text-sm">
                {currentTime.toLocaleString('ro-RO', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              <div className="text-white/70 text-xs">
                {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                  ? '🖥️ Local' 
                  : '☁️ Online'
                }
              </div>
            </div>
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-white/20 transition-all duration-200 hover:shadow-lg group"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="group-hover:scale-110 transition-transform text-white" />
              ) : (
                <Moon size={18} className="group-hover:scale-110 transition-transform text-white" />
              )}
            </button>
            
            <button className="p-2 rounded-xl hover:bg-white/20 transition-all duration-200 hover:shadow-lg relative hidden sm:block group">
              <Bell size={18} className="group-hover:scale-110 transition-transform text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg animate-pulse"></span>
            </button>
            <div className="flex items-center space-x-3 md:space-x-4">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.fullName || user?.username || 'Admin'} 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white/50 dark:border-slate-500/50 shadow-xl object-cover" 
                />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-base md:text-lg border-2 border-white/50 dark:border-slate-500/50 shadow-xl">
                  {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-sm md:text-base hidden sm:block">
                <div className="font-semibold text-white">
                  {user ? (user.fullName || user.username) : 'Loading...'}
                </div>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-red-500/25 group"
            >
              <LogOut size={16} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Glassmorphism Sidebar - Only show for admin/manager users */}
      {shouldShowSidebar && (
        <div className={`${sidebarOpen ? 'w-64 md:w-72' : 'w-0 md:w-20'} bg-white/70 dark:bg-slate-800/90 backdrop-blur-xl border-r border-white/30 dark:border-slate-700/50 transition-all duration-300 flex flex-col mt-14 md:mt-20 shadow-2xl shadow-slate-500/10 dark:shadow-slate-900/20 fixed md:relative z-20 h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex-1 sidebar-scroll p-2 md:p-3" style={{maxHeight: 'calc(100vh - 5rem)'}}>
          <nav className="space-y-1">
            {menuItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onDoubleClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`w-full flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} p-2 md:p-3 rounded-2xl text-left transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-xl shadow-blue-500/25 ring-2 ring-blue-200/50' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
                    <item.icon className={`text-lg md:text-xl transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-lg' : ''}`} />
                    {sidebarOpen && (
                      <span className={`font-semibold text-sm md:text-base transition-colors ${
                        isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && item.count !== null && (
                    <span className={`text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-full font-bold transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30' 
                        : 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-600 dark:to-slate-700 text-blue-700 dark:text-slate-300 group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-slate-500 dark:group-hover:to-slate-600'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      )}

      {/* Mobile Overlay */}
      {shouldShowSidebar && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-10 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden mt-14 md:mt-20 bg-white dark:bg-slate-900 ${!shouldShowSidebar ? 'ml-0' : ''}`}>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-900">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Layout
