import React, { useState, useEffect } from 'react'
import { X, CheckSquare, Calendar, Users, AlertCircle } from 'lucide-react'

const TaskModal = ({ task, users, onSubmit, onClose }) => {
  // Helper function for today's date
  const getToday = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: [],
    due_date: getToday() // Default to today
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_users ? task.assigned_users.map(u => u.id) : [],
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : getToday()
      })
    } else {
      // Reset form for new task with today's date
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: [],
        due_date: getToday()
      })
    }
  }, [task])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleUsersChange = (e) => {
    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
    setFormData(prev => ({
      ...prev,
      assigned_to: values
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                <CheckSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {task ? 'Editează sarcina' : 'Sarcină nouă'}
                </h2>
                <p className="text-blue-100 text-sm">Gestionare sarcini echipă</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <CheckSquare className="w-4 h-4 inline mr-2" />
              Titlu *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Titlul sarcinii..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descriere
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descrierea sarcinii..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Prioritate
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="low">Mică</option>
                <option value="medium">Medie</option>
                <option value="high">Mare</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Termen limită
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>

          {/* Responsabili */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Responsabili
            </label>
            <select
              multiple
              value={formData.assigned_to}
              onChange={handleUsersChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              size={4}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Ține apăsat Ctrl pentru a selecta mai mulți utilizatori
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t-2 border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 
                       text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 
                       transition-all font-medium"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl 
                       hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg font-medium"
            >
              {task ? 'Actualizează' : 'Creează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal

