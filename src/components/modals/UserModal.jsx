import React, { useState, useEffect } from 'react'
import { X, Save, User, Mail, Shield, UserCheck, Upload, Image, ChevronDown, ChevronUp, MapPin, Phone } from 'lucide-react'
import { MODULE_CONFIG, ACTION_LABELS, getDefaultPermissionsForRole } from '../../utils/permissions'
import { useData } from '../../contexts/DataContext'

const UserModal = ({ item, onClose, onSave }) => {
  const { locations } = useData() // Import locations pentru dropdown
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
    status: 'active',
    location_id: null, // Pentru manageri - locația gestionată
    notes: '',
    avatar: null,
    avatarPreview: null,
    permissions: getDefaultPermissionsForRole('user')
  })
  
  const [showPermissions, setShowPermissions] = useState(false)

  useEffect(() => {
    if (item) {
      setFormData({
        username: item.username || '',
        full_name: item.full_name || '',
        email: item.email || '',
        phone: item.phone || '',
        role: item.role || 'user',
        status: item.status || 'active',
        location_id: item.location_id || null, // Locația gestionată (pentru manageri)
        notes: item.notes || '',
        avatar: item.avatar || null,
        avatarPreview: item.avatar || null,
        permissions: item.permissions || getDefaultPermissionsForRole(item.role || 'user')
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      
      // Auto-load default permissions when role changes
      if (name === 'role') {
        if (value === 'admin') {
          // Admin vede TOTUL automat - toate permissions TRUE!
          const allPermissions = {}
          Object.keys(MODULE_CONFIG).forEach(module => {
            const moduleConfig = MODULE_CONFIG[module]
            allPermissions[module] = moduleConfig.actions.reduce((acc, action) => {
              acc[action] = true
              return acc
            }, {})
          })
          updated.permissions = allPermissions
        } else {
          // Alte roluri folosesc default permissions
          updated.permissions = getDefaultPermissionsForRole(value)
        }
      }
      
      return updated
    })
  }
  
  const handlePermissionToggle = (module, action) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module]?.[action]
        }
      }
    }))
  }
  
  const toggleAllModulePermissions = (module, enable) => {
    const moduleConfig = MODULE_CONFIG[module]
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: moduleConfig.actions.reduce((acc, action) => {
          acc[action] = enable
          return acc
        }, {})
      }
    }))
  }
  
  // Toggle ALL permissions at once (pentru butonul "Selectează Tot")
  const toggleAllPermissions = (enable) => {
    const allPermissions = {}
    Object.keys(MODULE_CONFIG).forEach(module => {
      const moduleConfig = MODULE_CONFIG[module]
      allPermissions[module] = moduleConfig.actions.reduce((acc, action) => {
        acc[action] = enable
        return acc
      }, {})
    })
    
    setFormData(prev => ({
      ...prev,
      permissions: allPermissions
    }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          avatar: e.target.result,
          avatarPreview: e.target.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-slate-500/20 border border-white/30 dark:border-slate-700/50">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-800 via-indigo-800 to-blue-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20"></div>
          <div className="relative z-10 flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {item ? 'Editează Utilizator' : 'Adaugă Utilizator Nou'}
              </h2>
              <p className="text-indigo-100 text-sm font-medium">
                Completează informațiile despre utilizator
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="relative z-10 text-white hover:bg-white/20 rounded-2xl p-3 transition-all duration-200 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Username *</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" placeholder="Username" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Nume Complet *</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" placeholder="Numele complet" required />
            </div>
            
            {/* Avatar Upload */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">Avatar</label>
              <div className="flex items-center space-x-4">
                {formData.avatarPreview ? (
                  <div className="relative">
                    <img 
                      src={formData.avatarPreview} 
                      alt="Avatar preview" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatar: null, avatarPreview: null }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.avatarPreview ? 'Schimbă Avatar' : 'Upload Avatar'}
                  </label>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG sau GIF (max 2MB)</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" placeholder="Adresa de email" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-emerald-500" />
                Telefon
              </label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                placeholder="+40 712 345 678"
              />
              <p className="text-xs text-slate-500">
                💡 Număr de telefon pentru contact (opțional)
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Parolă {!item && '*'}</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                placeholder={item ? "Lasă gol pentru a păstra parola actuală" : "Minim 6 caractere"}
                required={!item}
                minLength={!item ? 6 : undefined}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Rol *</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" required>
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="user">Utilizator</option>
                <option value="marketing">Marketing</option>
                <option value="operational">Operational</option>
                <option value="financiar">Financiar</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Status *</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" required>
                <option value="active">Activ</option>
                <option value="inactive">Inactiv</option>
                <option value="suspended">Suspendat</option>
              </select>
            </div>
            
            {/* DROPDOWN LOCAȚIE (doar pentru MANAGER!) */}
            {formData.role === 'manager' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                  Locație Gestionată *
                </label>
                <select 
                  name="location_id" 
                  value={formData.location_id || ''} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50" 
                  required
                >
                  <option value="">Selectează locația...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  💡 Această locație va fi asociată managerului. Info managerului va apărea automat în pagina locației.
                </p>
              </div>
            )}
          </div>
          
          {/* Permissions Section */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span>Permisiuni Detaliate</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <span>{showPermissions ? 'Ascunde' : 'Arată'}</span>
                {showPermissions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            {showPermissions && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bifează permisiunile pentru fiecare modul. Permisiunile se actualizează automat când schimbi rolul.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(true)}
                      className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-semibold"
                    >
                      ✓ Selectează Tot
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(false)}
                      className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                    >
                      ✗ Deselectează Tot
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {Object.keys(MODULE_CONFIG).map(module => {
                    const config = MODULE_CONFIG[module]
                    const modulePerms = formData.permissions[module] || {}
                    const allChecked = config.actions.every(action => modulePerms[action])
                    const someChecked = config.actions.some(action => modulePerms[action])
                    
                    return (
                      <div key={module} className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {config.label}
                          </label>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => toggleAllModulePermissions(module, true)}
                              className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Selectează toate"
                            >
                              Toate
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAllModulePermissions(module, false)}
                              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Deselectează toate"
                            >
                              Niciuna
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {config.actions.map(action => (
                            <label
                              key={action}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-600 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={modulePerms[action] || false}
                                onChange={() => handlePermissionToggle(module, action)}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                {ACTION_LABELS[action]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Note</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent" placeholder="Note adiționale" />
          </div>
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
              <button 
                type="button" 
                onClick={onClose}
                className="btn-secondary"
              >
                Anulează
              </button>
              <button 
                type="submit"
                className="btn-primary flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>{item ? 'Actualizează' : 'Creează'} Utilizator</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserModal