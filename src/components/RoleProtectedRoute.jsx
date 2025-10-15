import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasPermission } from '../utils/permissions'
import LoadingSpinner from './LoadingSpinner'

const RoleProtectedRoute = ({ children, requiredRole, requiredPermission, module, action = 'view' }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acces Restricționat</h2>
          <p className="text-slate-600 mb-6">
            Nu aveți permisiunea necesară pentru a accesa această pagină.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Înapoi
          </button>
        </div>
      </div>
    )
  }

  // Check permission-based access
  if (requiredPermission && module && !hasPermission(user.permissions, module, action)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Permisiune Insuficientă</h2>
          <p className="text-slate-600 mb-6">
            Nu aveți permisiunea necesară pentru a accesa această secțiune.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Înapoi
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default RoleProtectedRoute
