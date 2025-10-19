import React, { useState, useEffect } from 'react'
import { CheckSquare, AlertTriangle, Clock, User, ChevronRight } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const TasksWidget = () => {
  const { tasks, refreshData } = useData()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  // Filter tasks for current user
  const userTasks = tasks.filter(task => 
    task.assigned_users?.some(assigned => assigned.id === user?.userId) || 
    task.created_by === user?.userId
  )

  // Get urgent and overdue tasks
  const urgentTasks = userTasks.filter(task => 
    task.priority === 'urgent' && task.status !== 'completed'
  )

  const overdueTasks = userTasks.filter(task => {
    if (!task.due_date || task.status === 'completed') return false
    return new Date(task.due_date) < new Date()
  })

  const pendingTasks = userTasks.filter(task => task.status === 'pending')

  const inProgressTasks = userTasks.filter(task => task.status === 'in_progress')

  // Quick toggle task status
  const handleStatusToggle = async (task) => {
    setLoading(true)
    try {
      const newStatus = task.status === 'completed' ? 'in_progress' : 'completed'
      await axios.put(`/api/tasks/${task.id}/status`, { status: newStatus })
      toast.success(`Sarcina ${newStatus === 'completed' ? 'completată' : 'reinițiată'}!`)
      refreshData()
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Eroare la actualizarea sarcinii!')
    } finally {
      setLoading(false)
    }
  }

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium': return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'low': return 'text-green-600 bg-green-100 border-green-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
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

  // Get tasks to display (urgent first, then overdue, then recent)
  const displayTasks = [
    ...urgentTasks,
    ...overdueTasks.filter(task => !urgentTasks.includes(task)),
    ...userTasks.filter(task => 
      task.status !== 'completed' && 
      !urgentTasks.includes(task) && 
      !overdueTasks.includes(task)
    ).slice(0, 3)
  ].slice(0, 5)

  const totalTasks = userTasks.length
  const completedTasks = userTasks.filter(t => t.status === 'completed').length

  return (
    <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Sarcini
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {totalTasks > 0 ? `${completedTasks}/${totalTasks} finalizate` : 'Nu ai sarcini'}
            </p>
          </div>
        </div>
        <Link 
          to="/tasks"
          className="flex items-center space-x-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
        >
          <span className="text-sm font-medium">Vezi toate</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{pendingTasks.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Așteaptă</div>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{inProgressTasks.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">În progres</div>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-red-600">{urgentTasks.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Urgente</div>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-orange-600">{overdueTasks.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Întârziate</div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {displayTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nu ai sarcini active</p>
          </div>
        ) : (
          displayTasks.map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
            const isUrgent = task.priority === 'urgent'
            
            return (
              <div 
                key={task.id}
                className={`bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 border-l-4 ${
                  isOverdue ? 'border-l-red-500' : isUrgent ? 'border-l-orange-500' : 'border-l-green-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => handleStatusToggle(task)}
                        disabled={loading}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                        )}
                      </button>
                      
                      <h4 className={`font-medium text-sm truncate ${
                        task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {task.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {getPriorityText(task.priority)}
                      </span>
                      
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${
                          isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString('ro-RO')}
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </span>
                      )}
                    </div>

                    {task.assigned_users && task.assigned_users.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>
                          {task.assigned_users.map(u => u.full_name || u.username).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {displayTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {totalTasks - completedTasks} sarcini active
            </span>
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {overdueTasks.length} întârziate
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksWidget
