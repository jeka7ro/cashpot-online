import React, { useState } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import { TrendingUp, Plus, Award } from 'lucide-react'

const Marketing = () => {
  const { promotions, loading, createItem, updateItem, deleteItem } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Columns for promotions table
  const columns = [
    {
      key: 'title',
      label: 'TITLU',
      sortable: true,
      render: (item) => (
        <div className="font-medium text-slate-900 dark:text-white">
          {item.title || item.name || 'Fără titlu'}
        </div>
      )
    },
    {
      key: 'description',
      label: 'DESCRIERE',
      sortable: false,
      render: (item) => (
        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
          {item.description || 'Fără descriere'}
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'DATA ÎNCEPERE',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          {item.start_date ? new Date(item.start_date).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
    {
      key: 'end_date',
      label: 'DATA SFÂRȘIT',
      sortable: true,
      render: (item) => (
        <div className="text-sm">
          {item.end_date ? new Date(item.end_date).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      )
    },
    {
      key: 'discount_percent',
      label: 'REDUCERE',
      sortable: true,
      render: (item) => (
        <div className="font-medium text-green-600">
          {item.discount_percent ? `${item.discount_percent}%` : 'N/A'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (item) => {
        const today = new Date()
        const endDate = item.end_date ? new Date(item.end_date) : null
        const isActive = endDate && endDate >= today
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
          }`}>
            {isActive ? 'Activ' : 'Inactiv'}
          </span>
        )
      }
    }
  ]

  const handleEdit = (item) => {
    setEditingItem(item)
    setShowAddModal(true)
  }

  const handleDelete = async (item) => {
    const itemName = item.title || item.name || 'această promoție'
    if (window.confirm(`Sigur vrei să ștergi ${itemName}?`)) {
      await deleteItem('promotions', item.id)
    }
  }

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem('promotions', editingItem.id, data)
    } else {
      await createItem('promotions', data)
    }
    setShowAddModal(false)
    setEditingItem(null)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setShowAddModal(true)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Marketing</h2>
                <p className="text-slate-600 dark:text-slate-400">Gestionare promoții</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl flex items-center space-x-2 transition-all shadow-lg font-medium"
            >
              <Plus size={18} />
              <span>Adaugă Promoție</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Total Promoții</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{promotions.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Promoții Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {promotions.filter(p => {
                    const today = new Date()
                    const endDate = p.end_date ? new Date(p.end_date) : null
                    return endDate && endDate >= today
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Status</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {loading ? 'Se încarcă...' : 'Gata'}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Promotions Table */}
        <DataTable
          data={promotions}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          moduleColor="blue"
        />
      </div>
    </Layout>
  )
}

export default Marketing