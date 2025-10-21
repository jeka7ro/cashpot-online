import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'
import { ArrowLeft, Building2, MapPin, FileCheck, Calendar, ExternalLink, Edit, Globe, Package } from 'lucide-react'
import DataTable from '../components/DataTable'
import { toast } from 'react-hot-toast'
import BrandLogoModal from '../components/modals/BrandLogoModal'

const ONJNBrandDetails = () => {
  const { brandName } = useParams()
  const navigate = useNavigate()
  const decodedBrandName = decodeURIComponent(brandName)
  
  const [brand, setBrand] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoModal, setShowLogoModal] = useState(false)

  useEffect(() => {
    loadBrandData()
  }, [brandName])

  const loadBrandData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/brands/${encodeURIComponent(decodedBrandName)}`)
      setBrand(response.data.brand)
      setSlots(response.data.slots)
    } catch (error) {
      console.error('Error loading brand data:', error)
      toast.error('Eroare la încărcarea datelor brandului!')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpdate = () => {
    setShowLogoModal(false)
    loadBrandData() // Reload to get updated logo
  }

  // Calculate stats from slots
  const totalSlots = slots.length
  const activeSlots = slots.filter(slot => slot.status === 'În exploatare').length
  const expiredSlots = slots.filter(slot => slot.is_expired).length
  const uniqueCities = [...new Set(slots.map(slot => slot.city).filter(Boolean))].length
  const uniqueCounties = [...new Set(slots.map(slot => slot.county).filter(Boolean))].length

  // Table columns
  const columns = [
    {
      key: 'serial_number',
      label: 'SERIE',
      sortable: true,
      render: (item) => (
        <a
          href={item.onjn_details_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors flex items-center space-x-1"
          title="Vezi detalii pe ONJN"
        >
          <span>{item.serial_number}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )
    },
    { 
      key: 'equipment_type', 
      label: 'TIP', 
      sortable: true,
      render: (item) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {item.equipment_type}
        </span>
      )
    },
    {
      key: 'slot_address',
      label: 'ADRESĂ',
      sortable: true,
      render: (item) => (
        <div className="flex items-start space-x-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="text-slate-700 dark:text-slate-300">{item.slot_address}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs">
              {item.city}, {item.county}
            </div>
          </div>
        </div>
      )
    },
    { 
      key: 'license_number', 
      label: 'LICENȚĂ', 
      sortable: true,
      render: (item) => (
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
          {item.license_number}
        </span>
      )
    },
    {
      key: 'authorization_date',
      label: 'AUTORIZARE',
      sortable: true,
      render: (item) => item.authorization_date ? (
        <div className="flex items-center space-x-1 text-sm">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{new Date(item.authorization_date).toLocaleDateString('ro-RO')}</span>
        </div>
      ) : <span className="text-slate-400">N/A</span>
    },
    {
      key: 'expiry_date',
      label: 'EXPIRARE',
      sortable: true,
      render: (item) => {
        if (!item.expiry_date) return <span className="text-slate-400">N/A</span>
        const expiry = new Date(item.expiry_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        expiry.setHours(0, 0, 0, 0)

        let colorClass = 'text-green-600'
        let statusText = expiry.toLocaleDateString('ro-RO')

        if (expiry < today) {
          colorClass = 'text-red-600 font-bold'
          statusText += ' (Expirat)'
        } else {
          const diffTime = expiry.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays <= 30) {
            colorClass = 'text-orange-600 font-bold'
            statusText += ` (${diffDays} zile)`
          }
        }
        return (
          <div className="flex items-center space-x-1 text-sm">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className={colorClass}>{statusText}</span>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => {
        const statusColor = item.status === 'În exploatare' 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {item.status}
          </span>
        )
      }
    }
  ]

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </Layout>
    )
  }

  if (!brand) {
    return (
      <Layout>
        <div className="card p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
            Brand negăsit
          </h2>
          <button onClick={() => navigate('/onjn-operators')} className="btn-primary">
            Înapoi la Operatori ONJN
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Brand Info */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/onjn-operators')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Înapoi la Operatori ONJN"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              
              {/* Brand Logo */}
              <div 
                className="relative group cursor-pointer"
                onClick={() => setShowLogoModal(true)}
                title="Click pentru a edita logo"
              >
                {brand.brand_logo ? (
                  <img 
                    src={brand.brand_logo} 
                    alt={brand.brand_name}
                    className="w-20 h-20 object-contain rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Edit className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                  {brand.brand_name}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  {brand.company_name}
                </p>
                {brand.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {brand.description}
                  </p>
                )}
                {brand.website_url && (
                  <a 
                    href={brand.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 mt-1"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Sloturi</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {totalSlots}
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">În Exploatare</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeSlots}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Expirate</span>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {expiredSlots}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Orașe</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {uniqueCities}
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Județe</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {uniqueCounties}
              </div>
            </div>
          </div>
        </div>

        {/* Slots Table */}
        <div className="card p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
            Toate Sloturile ({totalSlots})
          </h3>
          <DataTable
            data={slots}
            columns={columns}
            loading={loading}
            moduleColor="indigo"
          />
        </div>
      </div>

      {/* Logo Modal */}
      {showLogoModal && (
        <BrandLogoModal
          brand={brand}
          onClose={() => setShowLogoModal(false)}
          onSave={handleLogoUpdate}
        />
      )}
    </Layout>
  )
}

export default ONJNBrandDetails

