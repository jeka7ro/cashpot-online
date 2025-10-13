import React from 'react'

const LoadingSpinner = ({ size = 'lg', text = 'Se încarcă...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      <p className="mt-4 text-slate-600 font-medium animate-pulse">{text}</p>
    </div>
  )
}

export default LoadingSpinner
