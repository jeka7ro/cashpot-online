import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import { ArrowLeft, MapPin, Building2, FileText, Package, Calendar, DollarSign, Ruler, Users, Edit, Trash2, Download, Eye } from 'lucide-react'
import LocationContracts from '../components/LocationContracts'
import LocationSlots from '../components/LocationSlots'
import LocationCabinets from '../components/LocationCabinets'
import MultiPDFViewer from '../components/MultiPDFViewer'

const LocationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { locations, contracts, slots, cabinets, companies, users, loading } = useData()
  
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
  const locationCabinets = cabinets.filter(c => c.location_id === location.id)

  // Calculate stats
  const activeContracts = locationContracts.filter(c => c.status === 'Active')
  const totalSlots = locationSlots.length
  const totalCabinets = locationCabinets.length
  
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Sloturi</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{totalSlots}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-2xl">
                <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Cabinete</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{totalCabinets}</p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-2xl">
                <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
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
          </div>
        </div>

        {/* PLAN LOCAȚIE */}
        {location.planFile && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-purple-500" />
              Plan Locație
            </h2>
            <MultiPDFViewer
              files={[{
                name: `Plan ${location.name}`,
                type: 'Plan Locație',
                file_path: location.planFile,
                url: location.planFile,
                id: 'plan'
              }]}
              title="Plan Locație"
              placeholder="Nu există plan încărcat"
              placeholderSubtext="Adaugă plan pentru vizualizare"
            />
          </div>
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
            Sloturi ({totalSlots})
          </h2>
          <LocationSlots locationId={location.id} locationName={location.name} />
        </div>

        {/* CABINETE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
            <Building2 className="w-6 h-6 mr-3 text-orange-500" />
            Cabinete ({totalCabinets})
          </h2>
          <LocationCabinets locationId={location.id} locationName={location.name} />
        </div>
      </div>
    </Layout>
  )
}

export default LocationDetail

