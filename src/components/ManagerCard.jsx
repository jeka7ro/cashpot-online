import React, { useState, useEffect } from 'react'
import { User, Phone, Mail, MapPin, Briefcase } from 'lucide-react'
import { useData } from '../contexts/DataContext'

const ManagerCard = ({ locationId, contactPersonUsername, locationName }) => {
  const { users } = useData()
  const [manager, setManager] = useState(null)

  useEffect(() => {
    if (users && users.length > 0) {
      console.log(`🔍 Manager search pentru locația ${locationId}:`)
      console.log('   Total users:', users.length)
      console.log('   Managers cu location_id:', users.filter(u => u.role === 'manager' && u.location_id).map(u => ({
        name: u.full_name,
        location_id: u.location_id
      })))
      
      // PRIORITATE 1: Caută manager cu location_id == locationId
      let user = users.find(u => u.role === 'manager' && u.location_id === parseInt(locationId))
      
      // PRIORITATE 2: Fallback la contact_person (backward compatibility)
      if (!user && contactPersonUsername) {
        console.log('   Fallback: Searching by username:', contactPersonUsername)
        user = users.find(u => u.username === contactPersonUsername)
      }
      
      console.log('   ✅ Manager găsit:', user ? user.full_name : '❌ NU GĂSIT')
      if (user) {
        console.log('   Avatar:', user.avatar ? 'DA' : 'NU')
        console.log('   Email:', user.email)
      }
      
      setManager(user)
    }
  }, [locationId, contactPersonUsername, users])

  if (!manager) {
    return (
      <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-600">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Manager Nesetat</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Asociază un manager cu rol "Manager" în pagina Utilizatori
          </p>
        </div>
      </div>
    )
  }

  if (!manager) {
    return (
      <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
          <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2"></div>
          <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-lg">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {manager.avatar ? (
            <img
              src={manager.avatar}
              alt={manager.full_name || manager.username}
              className="w-32 h-32 rounded-full border-4 border-indigo-300 dark:border-indigo-700 shadow-xl"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center border-4 border-indigo-300 dark:border-indigo-700 shadow-xl">
              <span className="text-white font-bold text-4xl">
                {(manager.full_name || manager.username).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Manager Locație
            </h3>
          </div>

          <div className="space-y-2">
            {/* Name */}
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {manager.full_name || manager.username}
                </p>
                {manager.full_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    @{manager.username}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            {manager.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <a
                  href={`mailto:${manager.email}`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {manager.email}
                </a>
              </div>
            )}

            {/* Phone */}
            {manager.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <a
                  href={`tel:${manager.phone}`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {manager.phone}
                </a>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Responsabil {locationName}
              </p>
            </div>

            {/* Role Badge */}
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                {manager.role === 'admin' ? '👑 Administrator' : '👤 Utilizator'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerCard

