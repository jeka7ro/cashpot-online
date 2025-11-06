import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import { ArrowLeft, MapPin, Building2, FileText, Package, Calendar, DollarSign, Ruler, Users, Edit, Trash2, Download, Eye } from 'lucide-react'

const LocationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { locations, contracts, slots, cabinets, companies, users, loading } = useData()
  
  const [location, setLocation] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loc = locations.find(l => l.id === parseInt(id))
    setLocation(loc)
  }, [id, locations])

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
  const locationCompany = companies.find(c => c.name === location.company)

  // Calculate stats
  const activeContracts = locationContracts.filter(c => c.status === 'Active')
  const totalSlots = locationSlots.length
  const totalCabinets = locationCabinets.length

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
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Suprafață</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{location.surface || 0} m²</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-2xl">
                <Ruler className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex space-x-1 p-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Prezentare Generală
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'contracts'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Contracte ({locationContracts.length})
              </button>
              <button
                onClick={() => setActiveTab('slots')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'slots'
                    ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Sloturi ({totalSlots})
              </button>
              <button
                onClick={() => setActiveTab('cabinets')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'cabinets'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Cabinete ({totalCabinets})
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Informații Generale</h3>
                    <div className="space-y-3">
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
                          <p className="text-sm text-slate-600 dark:text-slate-400">Suprafață</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{location.surface || 0} m²</p>
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
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Plan Locație</h3>
                    {location.plan_file ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Fișier Plan</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">Plan disponibil</p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2">
                            <Eye className="w-4 h-4" />
                            <span>Vizualizează</span>
                          </button>
                          <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2">
                            <Download className="w-4 h-4" />
                            <span>Descarcă</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Nu există plan încărcat</p>
                    )}
                  </div>
                </div>

                {location.notes && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Note</h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                      <p className="text-slate-700 dark:text-slate-300">{location.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contracts Tab */}
            {activeTab === 'contracts' && (
              <div className="space-y-4">
                {locationContracts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-800/20">
                        <tr>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Număr Contract</th>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Tip</th>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Proprietar</th>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Perioadă</th>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Chirie Lunară</th>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Status</th>
                          <th className="text-left p-4 font-bold text-green-800 dark:text-green-200 text-sm uppercase">Contract PDF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {locationContracts.map((contract) => (                        
                          <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4">
                              <button
                                onClick={() => navigate(`/contracts/${contract.id}`)}
                                className="text-green-600 dark:text-green-400 hover:underline font-semibold"
                              >
                                {contract.contract_number}
                              </button>
                            </td>
                            <td className="p-4">{contract.type}</td>
                            <td className="p-4">{contract.proprietar_name}</td>
                            <td className="p-4">
                              {new Date(contract.start_date).toLocaleDateString('ro-RO')} - {new Date(contract.end_date).toLocaleDateString('ro-RO')}
                            </td>
                            <td className="p-4">{contract.monthly_rent} {contract.currency}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                contract.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {contract.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => navigate(`/contracts/${contract.id}`)}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                title="Vezi Detalii Contract"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-8">Nu există contracte pentru această locație</p>
                )}
              </div>
            )}

            {/* Slots Tab */}
            {activeTab === 'slots' && (
              <div className="space-y-4">
                {locationSlots.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-purple-50/80 to-violet-50/80 dark:from-purple-900/20 dark:to-violet-800/20">
                        <tr>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">ID</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Număr Serie</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Denumire</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Furnizor</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Cabinet</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Game Mix</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Data Licență</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Data CVT</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Status</th>
                          <th className="text-left p-4 font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Tip Proprietate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {locationSlots.map((slot) => (
                          <tr key={slot.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4 font-semibold">{slot.id}</td>
                            <td className="p-4 font-semibold">{slot.serial_number}</td>
                            <td className="p-4">{slot.name}</td>
                            <td className="p-4">{slot.provider}</td>
                            <td className="p-4">{slot.cabinet}</td>
                            <td className="p-4">{slot.game_mix}</td>
                            <td className="p-4">{slot.license_date ? new Date(slot.license_date).toLocaleDateString('ro-RO') : 'N/A'}</td>
                            <td className="p-4">{slot.cvt_date ? new Date(slot.cvt_date).toLocaleDateString('ro-RO') : 'N/A'}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                slot.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {slot.status}
                              </span>
                            </td>
                            <td className="p-4">{slot.property_type === 'Owned' ? 'Proprietate' : 'Închiriat'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-8">Nu există sloturi în această locație</p>
                )}
              </div>
            )}

            {/* Cabinets Tab */}
            {activeTab === 'cabinets' && (
              <div className="space-y-4">
                {locationCabinets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 dark:from-orange-900/20 dark:to-amber-800/20">
                        <tr>
                          <th className="text-left p-4 font-bold text-orange-800 dark:text-orange-200 text-sm uppercase">Număr Serie</th>
                          <th className="text-left p-4 font-bold text-orange-800 dark:text-orange-200 text-sm uppercase">Model</th>
                          <th className="text-left p-4 font-bold text-orange-800 dark:text-orange-200 text-sm uppercase">Producător</th>
                          <th className="text-left p-4 font-bold text-orange-800 dark:text-orange-200 text-sm uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {locationCabinets.map((cabinet) => (
                          <tr key={cabinet.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4 font-semibold">{cabinet.serial_number}</td>
                            <td className="p-4">{cabinet.model}</td>
                            <td className="p-4">{cabinet.manufacturer}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                cabinet.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {cabinet.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-8">Nu există cabinete în această locație</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default LocationDetail

