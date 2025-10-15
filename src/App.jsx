import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Locations from './pages/Locations'
import LocationDetail from './pages/LocationDetail'
import Providers from './pages/Providers'
import Cabinets from './pages/Cabinets'
import GameMixes from './pages/GameMixes'
import GameDetail from './pages/GameDetail'
import Slots from './pages/Slots'
import SlotDetail from './pages/SlotDetail'
import SlotHistory from './pages/SlotHistory'
import CyberImport from './pages/CyberImport'
import Warehouse from './pages/Warehouse'
import Metrology from './pages/Metrology'
import Jackpots from './pages/Jackpots'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import CompanyDetail from './pages/CompanyDetail'
import ONJNReports from './pages/ONJNReports'
import LegalDocuments from './pages/LegalDocuments'
import Users from './pages/Users'
import Settings from './pages/Settings'

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/locations/:id" element={<LocationDetail />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/cabinets" element={<Cabinets />} />
            <Route path="/game-mixes" element={<GameMixes />} />
            <Route path="/games/:gameId" element={<GameDetail />} />
            <Route path="/slots" element={<Slots />} />
            <Route path="/slots/history" element={<SlotHistory />} />
            <Route path="/slots/marina-import" element={<CyberImport />} />
            <Route path="/slots/:id" element={<SlotDetail />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/metrology" element={<Metrology />} />
            <Route path="/jackpots" element={<Jackpots />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/onjn-reports" element={<ONJNReports />} />
            <Route path="/legal-documents" element={<LegalDocuments />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </DataProvider>
    </AuthProvider>
  )
}

export default App
