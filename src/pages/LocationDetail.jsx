import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import { ArrowLeft, MapPin, Building2, FileText, Package, Calendar, DollarSign, Ruler, Users, Edit, Trash2, Download, Eye } from 'lucide-react'
import LocationContracts from '../components/LocationContracts'
// import LocationCabinets from '../components/LocationCabinets' // REMOVED - user doesn't need it!
import MultiPDFViewer from '../components/MultiPDFViewer'
import LocationMap from '../components/LocationMap'
import ManagerCard from '../components/ManagerCard'
import LocationStats from '../components/LocationStats'
import LocationExpenses from '../components/LocationExpenses'
import { formatGameMixName } from '../utils/gameMixFormatter'
import 'leaflet/dist/leaflet.css'

const LocationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { locations, contracts, slots, cabinets, companies, users, expendituresData, loading } = useData()
  
  const [location, setLocation] = useState(null)

  useEffect(() => {
    const loc = locations.find(l => l.id === parseInt(id))
    setLocation(loc)
    
    // Scroll to section if tab parameter is provided
    const tab = searchParams.get('tab')
    if (tab === 'contracte') {
      setTimeout(() => {
        document.getElementById('contracte-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [id, locations, searchParams])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-slate-600">Se încarcă...</div>
        </div>
      </Layout>
    )
  }

  if (!location) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-red-600">Locația nu a fost găsită</div>
        </div>
      </Layout>
    )
  }

  // Get related data
  const locationContracts = contracts.filter(c => c.location_id === location.id)
  const locationSlots = slots.filter(s => s.location === location.name && s.status !== 'Depozit')
  // const locationCabinets = cabinets.filter(c => c.location_id === location.id) // REMOVED!

  // Calculate stats
  const activeContracts = locationContracts.filter(c => c.status === 'Active')
  
  // FIX: Total slots = DISTINCT serial numbers (as user requested!)
  const uniqueSerialNumbers = [...new Set(locationSlots.map(s => s.serial_number))]
  const totalSlots = uniqueSerialNumbers.length
  
  // const totalCabinets = locationCabinets.length // REMOVED - user doesn't need cabinets!
  
  // Calculate total surface area from contracts (as user requested!)
  const totalSurfaceFromContracts = locationContracts.reduce((sum, contract) => {
    const surface = parseFloat(contract.surface_area) || 0
    return sum + surface
  }, 0)

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/locations')}
              className="p-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-700 transition-all duration-200 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {location.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {location.address}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/locations/${id}/edit`)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center space-x-2"
            >
              <Edit className="w-5 h-5" />
              <span>Editează</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - DOAR 3 (fără Cabinete!) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Contracte Active</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{activeContracts.length}</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Sloturi (Distinct)</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{totalSlots}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-2xl">
                <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Suprafață (din contracte)</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{totalSurfaceFromContracts.toFixed(2)} m²</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-2xl">
                <Ruler className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* INFORMAȚII GENERALE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
            <MapPin className="w-6 h-6 mr-3 text-blue-500" />
            Informații Generale
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Adresă</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{location.address}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Companie</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{location.company}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Ruler className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Suprafață (din contracte)</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{totalSurfaceFromContracts.toFixed(2)} m²</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Persoană de Contact</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{location.contact_person || 'Nu este setată'}</p>
                </div>
              </div>
            </div>

            {location.notes && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Note</h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-700 dark:text-slate-300">{location.notes}</p>
                </div>
              </div>
            )}

            {/* Manager Card */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Manager Locație</h3>
              <ManagerCard contactPersonUsername={location.contact_person} locationName={location.name} />
            </div>
          </div>
        </div>

        {/* HARTĂ GEOGRAFICĂ */}
        <LocationMap location={location} />

        {/* STATISTICI DETALIATE */}
        <LocationStats 
          location={location} 
          contracts={locationContracts} 
          slots={locationSlots} 
        />

        {/* PLAN LOCAȚIE */}
        {(location.planFile || location.plan_file) && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-purple-500" />
              Plan Locație
            </h2>
            <MultiPDFViewer
              files={[{
                name: `Plan ${location.name}`,
                type: 'Plan Locație',
                file_path: location.plan_file || location.planFile,
                url: location.plan_file || location.planFile,
                id: 'plan'
              }]}
              title="Plan Locație"
              placeholder="Nu există plan încărcat"
              placeholderSubtext="Adaugă plan pentru vizualizare"
            />
          </div>
        )}

        {/* CHELTUIELI LOCAȚIE */}
        {expendituresData && expendituresData.length > 0 && (
          <LocationExpenses 
            locationId={location.id}
            locationName={location.name}
            expendituresData={expendituresData}
          />
        )}

        {/* CONTRACTE */}
        <div id="contracte-section" className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 scroll-mt-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
            <FileText className="w-6 h-6 mr-3 text-green-500" />
            Contracte ({locationContracts.length})
          </h2>
          <LocationContracts locationId={location.id} locationName={location.name} />
        </div>

        {/* SLOTURI */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
            <Package className="w-6 h-6 mr-3 text-blue-500" />
            Sloturi ({totalSlots} distinct)
          </h2>

          {locationSlots.length === 0 ? (
            <div className="p-6 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl text-center">
              <p className="text-slate-500 dark:text-slate-400">Nu există sloturi asociate acestei locații.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Serial</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cabinet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Game Mix</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Producător</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Adresă</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">An fabricație</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {locationSlots.map((slot, index) => (
                    <tr key={slot.id || `${slot.serial_number}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{slot.serial_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{slot.cabinet || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{formatGameMixName(slot.game_mix_name || slot.game_mix) || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{slot.provider || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate" title={slot.address || 'N/A'}>{slot.address || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{slot.manufacture_year || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${slot.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : slot.status === 'Service' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300'}`}>
                          {slot.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CABINETE - REMOVED! User doesn't need it! */}
      </div>
    </Layout>
  )
}

export default LocationDetail

