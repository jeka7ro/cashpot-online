import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import Layout from '../components/Layout'
import DataTable from '../components/DataTable'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { CheckSquare, Square, AlertTriangle, Clock, Users, Plus, Filter } from 'lucide-react'

const Tasks = () => {
  const { tasks, users, loading, refreshData } = useData()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedItems, setSelectedItems] = useState([])

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get status text in Romanian
  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Finalizată'
      case 'in_progress': return 'În progres'
      case 'pending': return 'Așteaptă'
      case 'cancelled': return 'Anulată'
      default: return status
    }
  }

  // Get priority text in Romanian
  const getPriorityText = (priority) => {
    switch (priority) {
      case 'urgent': return 'Urgent'
      case 'high': return 'Mare'
      case 'medium': return 'Medie'
      case 'low': return 'Mică'
      default: return priority
    }
  }

  // Toggle task status
  const handleStatusToggle = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'in_progress' : 'completed'
      await axios.put(`/api/tasks/${task.id}/status`, { status: newStatus })
      toast.success(`Sarcina ${newStatus === 'completed' ? 'completată' : 'reinițiată'}!`)
      refreshData()
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Eroare la actualizarea sarcinii!')
    }
  }

  // Delete task
  const handleDelete = async (task) => {
    if (!window.confirm('Ești sigur că vrei să ștergi această sarcină?')) return

    try {
      await axios.delete(`/api/tasks/${task.id}`)
      toast.success('Sarcina a fost ștearsă!')
      refreshData()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Eroare la ștergerea sarcinii!')
    }
  }

  // Create/Update task
  const handleSubmit = async (taskData) => {
    try {
      if (editingTask) {
        await axios.put(`/api/tasks/${editingTask.id}`, taskData)
        toast.success('Sarcina a fost actualizată!')
      } else {
        await axios.post('/api/tasks', taskData)
        toast.success('Sarcina a fost creată!')
      }
      setShowModal(false)
      setEditingTask(null)
      refreshData()
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error('Eroare la salvarea sarcinii!')
    }
  }

  // Columns definition
  const columns = [
    {
      key: 'status',
      label: '',
      sortable: false,
      render: (task) => (
        <button
          onClick={() => handleStatusToggle(task)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {task.status === 'completed' ? (
            <CheckSquare className="w-5 h-5 text-green-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
      )
    },
    {
      key: 'title',
      label: 'TITLU',
      sortable: true,
      render: (task) => (
        <div>
          <div className="font-semibold text-gray-900">{task.title}</div>
          {task.description && (
            <div className="text-sm text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'priority',
      label: 'PRIORITATE',
      sortable: true,
      render: (task) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
          {getPriorityText(task.priority)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (task) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
          {getStatusText(task.status)}
        </span>
      )
    },
    {
      key: 'assigned_users',
      label: 'RESPONSABILI',
      sortable: false,
      render: (task) => (
        <div className="flex flex-wrap gap-1">
          {task.assigned_users && task.assigned_users.length > 0 ? (
            task.assigned_users.map((user, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {user.full_name || user.username}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Niciun responsabil</span>
          )}
        </div>
      )
    },
    {
      key: 'due_date',
      label: 'TERMEN',
      sortable: true,
      render: (task) => {
        if (!task.due_date) return <span className="text-gray-400">-</span>
        
        const dueDate = new Date(task.due_date)
        const today = new Date()
        const isOverdue = dueDate < today && task.status !== 'completed'
        const isToday = dueDate.toDateString() === today.toDateString()
        
        return (
          <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : isToday ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
            {dueDate.toLocaleDateString('ro-RO')}
            {isOverdue && <AlertTriangle className="w-4 h-4 inline ml-1" />}
            {isToday && <Clock className="w-4 h-4 inline ml-1" />}
          </div>
        )
      }
    },
    {
      key: 'created_by_name',
      label: 'CREAT DE',
      sortable: false,
      render: (task) => (
        <span className="text-sm text-gray-600">
          {task.created_by_full_name || task.created_by_name || 'Unknown'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'CREAT',
      sortable: true,
      render: (task) => (
        <span className="text-sm text-gray-500">
          {new Date(task.created_at).toLocaleDateString('ro-RO')}
        </span>
      )
    }
  ]

  const handleEdit = (task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingTask(null)
    setShowModal(true)
  }

  // Quick stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      return new Date(t.due_date) < new Date()
    }).length
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sarcini</h1>
            <p className="text-gray-600">Gestionează sarcinile echipei</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sarcină nouă
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-sm text-gray-500">Așteaptă</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
                <div className="text-sm text-gray-500">În progres</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
                <div className="text-sm text-gray-500">Finalizate</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.overdue}</div>
                <div className="text-sm text-gray-500">Întârziate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Caută sarcini..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toate statusurile</option>
              <option value="pending">Așteaptă</option>
              <option value="in_progress">În progres</option>
              <option value="completed">Finalizată</option>
              <option value="cancelled">Anulată</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toate prioritățile</option>
              <option value="urgent">Urgent</option>
              <option value="high">Mare</option>
              <option value="medium">Medie</option>
              <option value="low">Mică</option>
            </select>
          </div>
        </div>

        {/* Tasks Table */}
        <DataTable
          data={filteredTasks}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          moduleColor="blue"
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
        />
      </div>

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          users={users}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false)
            setEditingTask(null)
          }}
        />
      )}
    </Layout>
  )
}

// Task Modal Component
const TaskModal = ({ task, users, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: [],
    due_date: ''
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_users ? task.assigned_users.map(u => u.id) : [],
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
      })
    }
  }, [task])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {task ? 'Editează sarcina' : 'Sarcină nouă'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titlu *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioritate
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Mică</option>
                <option value="medium">Medie</option>
                <option value="high">Mare</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsabili
              </label>
              <select
                multiple
                value={formData.assigned_to}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                  setFormData({ ...formData, assigned_to: values })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size={4}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Ține apăsat Ctrl pentru a selecta mai mulți utilizatori</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termen limită
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {task ? 'Actualizează' : 'Creează'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Anulează
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Tasks
