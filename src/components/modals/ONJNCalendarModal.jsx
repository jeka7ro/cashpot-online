import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'

const ONJNCalendarModal = ({ isOpen, onClose }) => {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]

  // Mock data pentru demonstrație - în producție se va înlocui cu date reale de la ONJN
  const mockCommissions = [
    {
      id: 1,
      title: 'Comisia de Autorizare - Sloturi Electronice',
      date: '2025-10-15',
      time: '09:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Autorizare',
      status: 'Programată',
      description: 'Examinarea cererilor de autorizare pentru sloturi electronice'
    },
    {
      id: 2,
      title: 'Comisia de Metrologie - Verificare CVT',
      date: '2025-10-22',
      time: '10:30',
      location: 'București, Bd. Magheru 28-30',
      type: 'Metrologie',
      status: 'Programată',
      description: 'Verificarea certificatelor de verificare tehnică'
    },
    {
      id: 3,
      title: 'Comisia de Control - Inspecții Teren',
      date: '2025-11-05',
      time: '08:00',
      location: 'Cluj-Napoca, Str. Memorandumului 28',
      type: 'Control',
      status: 'Programată',
      description: 'Inspecții de control la operatorii de jocuri de noroc'
    },
    {
      id: 4,
      title: 'Comisia de Autorizare - Licențe',
      date: '2025-11-12',
      time: '14:00',
      location: 'București, Bd. Magheru 28-30',
      type: 'Autorizare',
      status: 'Programată',
      description: 'Examinarea cererilor de licențiere pentru operatori'
    }
  ]

  useEffect(() => {
    if (isOpen) {
      loadCommissions()
    }
  }, [isOpen, selectedMonth, selectedYear])

  const loadCommissions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulare încărcare date - în producție se va face request la ONJN
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Filtrare după lună și an
      const filteredCommissions = mockCommissions.filter(commission => {
        const commissionDate = new Date(commission.date)
        return commissionDate.getMonth() === selectedMonth && 
               commissionDate.getFullYear() === selectedYear
      })
      
      setCommissions(filteredCommissions)
    } catch (err) {
      setError('Eroare la încărcarea calendarului ONJN')
      console.error('Error loading ONJN calendar:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Programată':
        return 'bg-blue-100 text-blue-800'
      case 'În desfășurare':
        return 'bg-yellow-100 text-yellow-800'
      case 'Finalizată':
        return 'bg-green-100 text-green-800'
      case 'Anulată':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Autorizare':
        return 'bg-purple-100 text-purple-800'
      case 'Metrologie':
        return 'bg-indigo-100 text-indigo-800'
      case 'Control':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    return timeString
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Calendar ONJN</h2>
                <p className="text-blue-100">Comisiile organizate de Oficiul Național pentru Jocuri de Noroc</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Luna:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Anul:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={loadCommissions}
              disabled={loading}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizează</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Eroare la încărcare</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={loadCommissions}
                  className="btn-primary"
                >
                  Încearcă din nou
                </button>
              </div>
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nu există comisii programate</h3>
              <p className="text-gray-500">Pentru luna {months[selectedMonth]} {selectedYear}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {commission.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(commission.type)}`}>
                          {commission.type}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(commission.status)}`}>
                          {commission.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{commission.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {formatDate(commission.date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {formatTime(commission.time)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {commission.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => window.open('https://onjn.gov.ro/structura-organizatorica/autorizare/', '_blank')}
                      className="ml-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Vezi pe site-ul ONJN"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Datele sunt preluate de pe site-ul oficial ONJN
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('https://onjn.gov.ro/structura-organizatorica/autorizare/', '_blank')}
                className="btn-secondary flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Site ONJN</span>
              </button>
              <button
                onClick={onClose}
                className="btn-primary"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ONJNCalendarModal


