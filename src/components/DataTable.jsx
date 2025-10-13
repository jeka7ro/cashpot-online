import React, { useState } from 'react'
import { Edit, Trash2, ChevronLeft, ChevronRight, FileText, Building2, Eye } from 'lucide-react'

const DataTable = ({ 
  data, 
  columns, 
  onEdit, 
  onDelete, 
  onView,
  onViewContracts,
  onViewProprietari,
  loading = false, 
  searchTerm = '', 
  onSearchChange,
  itemsPerPage = 15,
  selectedItems = [],
  onSelectAll,
  onSelectItem,
  moduleColor = 'blue' // New prop for module color
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')

  // Module color schemes - subtle versions for table headers
  const moduleColors = {
    blue: {
      header: 'from-blue-50/80 to-blue-100/80 dark:from-blue-900/20 dark:to-blue-800/20',
      text: 'text-blue-800 dark:text-blue-200',
      hover: 'hover:bg-blue-100/60 dark:hover:bg-blue-700/30',
      accent: 'text-blue-600'
    },
    green: {
      header: 'from-emerald-50/80 to-emerald-100/80 dark:from-emerald-900/20 dark:to-emerald-800/20',
      text: 'text-emerald-800 dark:text-emerald-200',
      hover: 'hover:bg-emerald-100/60 dark:hover:bg-emerald-700/30',
      accent: 'text-emerald-600'
    },
    purple: {
      header: 'from-purple-50/80 to-purple-100/80 dark:from-purple-900/20 dark:to-purple-800/20',
      text: 'text-purple-800 dark:text-purple-200',
      hover: 'hover:bg-purple-100/60 dark:hover:bg-purple-700/30',
      accent: 'text-purple-600'
    },
    orange: {
      header: 'from-orange-50/80 to-orange-100/80 dark:from-orange-900/20 dark:to-orange-800/20',
      text: 'text-orange-800 dark:text-orange-200',
      hover: 'hover:bg-orange-100/60 dark:hover:bg-orange-700/30',
      accent: 'text-orange-600'
    },
    red: {
      header: 'from-red-50/80 to-red-100/80 dark:from-red-900/20 dark:to-red-800/20',
      text: 'text-red-800 dark:text-red-200',
      hover: 'hover:bg-red-100/60 dark:hover:bg-red-700/30',
      accent: 'text-red-600'
    },
    indigo: {
      header: 'from-indigo-50/80 to-indigo-100/80 dark:from-indigo-900/20 dark:to-indigo-800/20',
      text: 'text-indigo-800 dark:text-indigo-200',
      hover: 'hover:bg-indigo-100/60 dark:hover:bg-indigo-700/30',
      accent: 'text-indigo-600'
    },
    teal: {
      header: 'from-teal-50/80 to-teal-100/80 dark:from-teal-900/20 dark:to-teal-800/20',
      text: 'text-teal-800 dark:text-teal-200',
      hover: 'hover:bg-teal-100/60 dark:hover:bg-teal-700/30',
      accent: 'text-teal-600'
    },
    pink: {
      header: 'from-pink-50/80 to-pink-100/80 dark:from-pink-900/20 dark:to-pink-800/20',
      text: 'text-pink-800 dark:text-pink-200',
      hover: 'hover:bg-pink-100/60 dark:hover:bg-pink-700/30',
      accent: 'text-pink-600'
    }
  }

  const currentColor = moduleColors[moduleColor] || moduleColors.blue

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedData = [...paginatedData].sort((a, b) => {
    if (!sortField) return 0
    
    const aValue = a[sortField] || ''
    const bValue = b[sortField] || ''
    
    if (sortDirection === 'asc') {
      return aValue.toString().localeCompare(bValue.toString())
    } else {
      return bValue.toString().localeCompare(aValue.toString())
    }
  })

  if (loading) {
    return (
      <div className="card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
          <thead className={`table-header bg-gradient-to-r ${currentColor.header}`}>
            <tr>
              <th className="p-6 w-12">
                <div className="flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    checked={paginatedData.length > 0 && paginatedData.every(item => selectedItems.includes(item.id))}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                  />
                </div>
              </th>
              <th className={`text-left p-6 font-bold ${currentColor.text} text-sm uppercase tracking-wider w-16`}>#</th>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={`text-left p-6 font-bold ${currentColor.text} text-sm uppercase tracking-wider ${
                    column.sortable ? `cursor-pointer ${currentColor.hover} transition-colors` : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.label}</span>
                    {column.sortable && sortField === column.key && (
                      <span className={currentColor.accent}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className={`text-left p-6 font-bold ${currentColor.text} text-sm uppercase tracking-wider`}>Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {sortedData.map((item, idx) => (
              <tr key={item._id || item.id} className="table-row hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                <td className="p-6">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2 group-hover:bg-blue-50 dark:group-hover:bg-slate-600"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => onSelectItem && onSelectItem(item.id, e.target.checked)}
                    />
                  </div>
                </td>
                <td className="p-6 text-slate-600 dark:text-slate-400 font-semibold text-sm">
                  {startIndex + idx + 1}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="p-6">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
                {(onEdit || onDelete || onView || onViewContracts || onViewProprietari) && (
                  <td className="p-6">
                    <div className="flex space-x-2">
                      {onView && (
                        <button 
                          onClick={() => onView(item)} 
                          className="p-3 text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/40 dark:hover:to-indigo-800/40 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 group/btn"
                          title="Previzualizează"
                        >
                          <Eye size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                      {onViewContracts && (
                        <button 
                          onClick={() => onViewContracts(item)} 
                          className="p-3 text-green-600 dark:text-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-800/40 dark:hover:to-emerald-800/40 rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all duration-200 group/btn"
                          title="Vezi contracte"
                        >
                          <FileText size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                      {onViewProprietari && (
                        <button 
                          onClick={() => onViewProprietari(item)} 
                          className="p-3 text-purple-600 dark:text-purple-400 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 hover:from-purple-100 hover:to-violet-100 dark:hover:from-purple-800/40 dark:hover:to-violet-800/40 rounded-2xl shadow-lg hover:shadow-purple-500/25 transition-all duration-200 group/btn"
                          title="Vezi proprietari"
                        >
                          <Building2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(item)} 
                          className="p-3 text-emerald-600 dark:text-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-800/40 dark:hover:to-green-800/40 rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 group/btn"
                          title="Editează"
                        >
                          <Edit size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(item)} 
                          className="p-3 text-red-600 dark:text-red-400 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 hover:from-red-100 hover:to-pink-100 dark:hover:from-red-800/40 dark:hover:to-pink-800/40 rounded-2xl shadow-lg hover:shadow-red-500/25 transition-all duration-200 group/btn"
                          title="Șterge"
                        >
                          <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 px-6 md:px-8 py-4 md:py-6 border-t border-slate-200/50 dark:border-slate-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <span className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-200">Înregistrări:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }} 
            className="border-2 border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-2 text-sm font-medium bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 shadow-lg text-slate-900 dark:text-slate-100"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, data.length)} din {data.length}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
            disabled={currentPage === 1} 
            className="px-4 md:px-6 py-2 md:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm md:text-base font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl group text-slate-700 dark:text-slate-200"
          >
            <span className="group-hover:-translate-x-1 transition-transform inline-block">Înapoi</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm md:text-base text-slate-600 dark:text-slate-200 font-bold bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl shadow-lg">
              Pag {currentPage}/{totalPages || 1}
            </span>
          </div>
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
            disabled={currentPage === totalPages} 
            className="px-4 md:px-6 py-2 md:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-2xl text-sm md:text-base font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl group text-slate-700 dark:text-slate-200"
          >
            <span className="group-hover:translate-x-1 transition-transform inline-block">Înainte</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DataTable
