import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import MarketingModal from '../components/modals/MarketingModal'
import MarketingDetailModal from '../components/modals/MarketingDetailModal'
import { TrendingUp, Plus, Calendar, Award, AlertTriangle } from 'lucide-react'

const Marketing = () => {
  const { promotions, locations, createItem, updateItem, deleteItem, loading } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [viewingItem, setViewingItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filter promotions
  const filteredPromotions = promotions.filter(promo =>
    promo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promo.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate days remaining
  const getDaysRemaining = (endDate) => {
    if (!endDate) return null
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Columns definition
  const columns = [
    {
      key: 'name',
      label: 'DENUMIRE PROMOȚIE',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-900 dark:text-white font-semibold text-base">
            {item.name}
          </div>
          {item.description && (
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              {item.description.substring(0, 60)}...
            </div>
          )}
        </div>
      )
    },
    {
      key: 'period',
      label: 'PERIOADA',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 font-medium text-base">
            {new Date(item.start_date).toLocaleDateString('ro-RO')} - {new Date(item.end_date).toLocaleDateString('ro-RO')}
          </div>
          <div className="text-slate-500 text-sm">
            {getDaysRemaining(item.end_date) !== null && (
              getDaysRemaining(item.end_date) > 0 
                ? `${getDaysRemaining(item.end_date)} zile rămase`
                : getDaysRemaining(item.end_date) === 0
                ? 'Se termină astăzi'
                : `Expirat cu ${Math.abs(getDaysRemaining(item.end_date))} zile`
            )}
          </div>
        </div>
      )
    },
    {
      key: 'location',
      label: 'LOCAȚIE',
      sortable: true,
      render: (item) => (
        <div className="text-slate-800 font-medium text-base">
          {item.location || 'N/A'}
        </div>
      )
    },
    {
      key: 'prize',
      label: 'PREMII',
      sortable: true,
      render: (item) => {
        let prizes = []
        if (item.prizes) {
          prizes = typeof item.prizes === 'string' ? JSON.parse(item.prizes) : item.prizes
        } else if (item.prize_amount) {
          prizes = [{
            amount: item.prize_amount,
            currency: item.prize_currency || 'RON',
            date: item.prize_date
          }]
        }
        
        const totalAmount = prizes.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        const nextPrizeDate = prizes.find(p => p.date && new Date(p.date) >= new Date())?.date
        
        return (
          <div className="space-y-1">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {totalAmount > 0 ? `${totalAmount.toLocaleString('ro-RO')} ${prizes[0]?.currency || 'RON'}` : 'N/A'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {prizes.length} {prizes.length === 1 ? 'premiu' : 'premii'}
            </div>
            {nextPrizeDate && (
              <div className="text-xs text-pink-600 dark:text-pink-400 font-semibold">
                Următor: {new Date(nextPrizeDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => {
        const daysRemaining = getDaysRemaining(item.end_date)
        const isActive = item.status === 'Active' && daysRemaining > 0
        const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0
        
        return (
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            isActive && !isExpiringSoon
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : isExpiringSoon
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
          }`}>
            {isActive && !isExpiringSoon ? 'Activ' : isExpiringSoon ? 'Expiră curând' : 'Încheiat'}
          </span>
        )
      }
    },
    {
      key: 'created_info',
      label: 'CREAT DE / DATA',
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <div className="text-slate-800 font-medium text-base">
            {item.created_by || 'N/A'}
          </div>
          <div className="text-slate-500 text-sm">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO') : 'N/A'}
          </div>
        </div>
      )
    }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (window.confirm(`Sigur vrei să ștergi promoția "${item.name}"?`)) {
      await deleteItem('promotions', item.id)
    }
  }

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('promotions', editingItem.id, data)
    } else {
      await createItem('promotions', data)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  // Statistics
  const activePromotions = promotions.filter(p => {
    const daysRemaining = getDaysRemaining(p.end_date)
    return p.status === 'Active' && daysRemaining > 0
  })

  const totalPrizePool = promotions.reduce((sum, p) => {
    let prizes = []
    if (p.prizes) {
      prizes = typeof p.prizes === 'string' ? JSON.parse(p.prizes) : p.prizes
    } else if (p.prize_amount) {
      prizes = [{ amount: p.prize_amount }]
    }
    const promoTotal = prizes.reduce((s, prize) => s + (parseFloat(prize.amount) || 0), 0)
    return sum + promoTotal
  }, 0)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Marketing & Promoții</h1>
              <p className="text-slate-600 dark:text-slate-400">Gestionare tombole și campanii promoționale</p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl flex items-center space-x-2 transition-all shadow-lg font-medium"
          >
            <Plus size={18} />
            <span>Adaugă Promoție</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold">Promoții Active</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{activePromotions.length}</p>
              </div>
              <Award className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Total Promoții</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{promotions.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">Fond Total Premii</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {totalPrizePool.toLocaleString('ro-RO')} RON
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={filteredPromotions}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={(item) => {
            setViewingItem(item)
            setShowDetailModal(true)
          }}
          loading={loading.promotions}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          moduleColor="pink"
        />

        {/* Add/Edit Modal */}
        {showModal && (
          <MarketingModal
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={handleSave}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && (
          <MarketingDetailModal
            item={viewingItem}
            onClose={() => {
              setShowDetailModal(false)
              setViewingItem(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}

export default Marketing

