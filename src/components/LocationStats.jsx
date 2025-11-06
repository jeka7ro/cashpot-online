import React from 'react'
import { DollarSign, FileText, Calendar, Package, TrendingUp, Activity, Shield, Building2 } from 'lucide-react'

const LocationStats = ({ location, contracts, slots }) => {
  // Calculate financial stats
  const activeContracts = contracts.filter(c => c.status === 'Active')
  const totalMonthlyRent = activeContracts.reduce((sum, c) => sum + (parseFloat(c.monthly_rent) || 0), 0)
  const totalSurface = contracts.reduce((sum, c) => sum + (parseFloat(c.surface_area) || 0), 0)
  const costPerM2 = totalSurface > 0 ? (totalMonthlyRent / totalSurface) : 0

  // Contract stats
  const oldestContract = contracts.reduce((oldest, c) => {
    const startDate = new Date(c.start_date)
    return !oldest || startDate < new Date(oldest.start_date) ? c : oldest
  }, null)
  
  const nearestExpiry = activeContracts.reduce((nearest, c) => {
    const endDate = new Date(c.end_date)
    return !nearest || endDate < new Date(nearest.end_date) ? c : nearest
  }, null)

  const daysUntilExpiry = nearestExpiry ? Math.ceil((new Date(nearestExpiry.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null

  // Slot stats
  const uniqueSlots = [...new Set(slots.map(s => s.serial_number))].length
  const activeSlots = slots.filter(s => s.status === 'În exploatare' || s.status === 'Active' || s.status === 'Activ').length
  const inServiceSlots = slots.filter(s => s.status === 'În service').length
  const inactiveSlots = uniqueSlots - activeSlots - inServiceSlots
  
  const uniqueCabinets = [...new Set(slots.map(s => s.cabinet).filter(Boolean))].length
  const uniqueGameMixes = [...new Set(slots.map(s => s.game_mix).filter(Boolean))].length
  const uniqueProviders = [...new Set(slots.map(s => s.provider).filter(Boolean))].length

  return (
    <div className="space-y-6">
      {/* Financial Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Statistici Financiare
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Chirie Lunară Totală</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {totalMonthlyRent.toFixed(2)} EUR
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              Din {activeContracts.length} contract{activeContracts.length !== 1 ? 'e' : ''} activ{activeContracts.length !== 1 ? 'e' : ''}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Cost/m²</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {costPerM2.toFixed(2)} EUR/m²
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Pe {totalSurface.toFixed(2)} m² totali
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">Cost/Slot</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {uniqueSlots > 0 ? (totalMonthlyRent / uniqueSlots).toFixed(2) : '0.00'} EUR
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
              Per slot ({uniqueSlots} aparate)
            </p>
          </div>
        </div>
      </div>

      {/* Contract Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-indigo-600" />
          Statistici Contracte
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">Contracte Active</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {activeContracts.length} / {contracts.length}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-1">
              {((activeContracts.length / contracts.length) * 100).toFixed(0)}% active
            </p>
          </div>

          {nearestExpiry && (
            <div className={`rounded-lg p-4 border ${
              daysUntilExpiry < 30 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : daysUntilExpiry < 90
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <p className={`text-sm font-medium ${
                daysUntilExpiry < 30 
                  ? 'text-red-700 dark:text-red-400'
                  : daysUntilExpiry < 90
                  ? 'text-orange-700 dark:text-orange-400'
                  : 'text-green-700 dark:text-green-400'
              }`}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Contract Expiră În
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                daysUntilExpiry < 30 
                  ? 'text-red-600 dark:text-red-400'
                  : daysUntilExpiry < 90
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {daysUntilExpiry} zile
              </p>
              <p className={`text-xs mt-1 ${
                daysUntilExpiry < 30 
                  ? 'text-red-600 dark:text-red-500'
                  : daysUntilExpiry < 90
                  ? 'text-orange-600 dark:text-orange-500'
                  : 'text-green-600 dark:text-green-500'
              }`}>
                {new Date(nearestExpiry.end_date).toLocaleDateString('ro-RO')}
              </p>
            </div>
          )}

          {oldestContract && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p className="text-sm text-slate-700 dark:text-slate-400 font-medium">
                <Activity className="w-4 h-4 inline mr-1" />
                Cel Mai Vechi Contract
              </p>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">
                {Math.floor((new Date() - new Date(oldestContract.start_date)) / (1000 * 60 * 60 * 24 * 365))} ani
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                Începe: {new Date(oldestContract.start_date).toLocaleDateString('ro-RO')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Slot Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2 text-blue-600" />
          Statistici Sloturi
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">În Exploatare</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {activeSlots}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              {((activeSlots / uniqueSlots) * 100).toFixed(0)}% din total
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">În Service</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {inServiceSlots}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
              {((inServiceSlots / uniqueSlots) * 100).toFixed(0)}% din total
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">Inactive</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {inactiveSlots}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {((inactiveSlots / uniqueSlots) * 100).toFixed(0)}% din total
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Distinct</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {uniqueSlots}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Aparate unice
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">
              <Shield className="w-4 h-4 inline mr-1" />
              Tipuri Cabinete
            </p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {uniqueCabinets}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
              Modele diferite
            </p>
          </div>

          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
            <p className="text-sm text-pink-700 dark:text-pink-400 font-medium">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Game Mix
            </p>
            <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-1">
              {uniqueGameMixes}
            </p>
            <p className="text-xs text-pink-600 dark:text-pink-500 mt-1">
              Variante jocuri
            </p>
          </div>

          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
            <p className="text-sm text-cyan-700 dark:text-cyan-400 font-medium">
              <Building2 className="w-4 h-4 inline mr-1" />
              Furnizori
            </p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
              {uniqueProviders}
            </p>
            <p className="text-xs text-cyan-600 dark:text-cyan-500 mt-1">
              Producători diferiți
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationStats

