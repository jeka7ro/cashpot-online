import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import { MODULES } from './utils/permissions'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Locations from './pages/Locations'
import LocationDetail from './pages/LocationDetail'
import Providers from './pages/Providers'
import Cabinets from './pages/Cabinets'
import GameMixes from './pages/GameMixes'
import Marketing from './pages/Marketing'
import MarketingAI from './pages/MarketingAI'
import PromotionDetail from './pages/PromotionDetail'
import GameDetail from './pages/GameDetail'
import Slots from './pages/Slots'
import SlotDetail from './pages/SlotDetail'
import SlotHistory from './pages/SlotHistory'
import CyberImport from './pages/CyberImport'
import Warehouse from './pages/Warehouse'
import Metrology from './pages/Metrology'
import ApprovalDetail from './pages/ApprovalDetail'
import Jackpots from './pages/Jackpots'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import CompanyDetail from './pages/CompanyDetail'
import ONJNReports from './pages/ONJNReports'
import ONJNOperators from './pages/ONJNOperators'
import ONJNBrandDetails from './pages/ONJNBrandDetails'
import ONJNBrandDetail from './pages/ONJNBrandDetail'
import ONJNCityDetail from './pages/ONJNCityDetail'
import ONJNCountyDetail from './pages/ONJNCountyDetail'
import ONJNAnalytics from './pages/ONJNAnalytics'
import LegalDocuments from './pages/LegalDocuments'
import UsersPage from './pages/Users'
import Settings from './pages/Settings'
import Tasks from './pages/Tasks'
import Messages from './pages/Messages'

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/companies" element={<RoleProtectedRoute module={MODULES.COMPANIES}><Companies /></RoleProtectedRoute>} />
            <Route path="/companies/:id" element={<RoleProtectedRoute module={MODULES.COMPANIES}><CompanyDetail /></RoleProtectedRoute>} />
            <Route path="/locations" element={<RoleProtectedRoute module={MODULES.LOCATIONS}><Locations /></RoleProtectedRoute>} />
            <Route path="/locations/:id" element={<RoleProtectedRoute module={MODULES.LOCATIONS}><LocationDetail /></RoleProtectedRoute>} />
            <Route path="/providers" element={<RoleProtectedRoute module={MODULES.PROVIDERS}><Providers /></RoleProtectedRoute>} />
            <Route path="/cabinets" element={<RoleProtectedRoute module={MODULES.CABINETS}><Cabinets /></RoleProtectedRoute>} />
            <Route path="/game-mixes" element={<RoleProtectedRoute module={MODULES.GAME_MIXES}><GameMixes /></RoleProtectedRoute>} />
            <Route path="/games/:gameId" element={<RoleProtectedRoute module={MODULES.SLOTS}><GameDetail /></RoleProtectedRoute>} />
            <Route path="/slots" element={<RoleProtectedRoute module={MODULES.SLOTS}><Slots /></RoleProtectedRoute>} />
            <Route path="/slots/history" element={<RoleProtectedRoute module={MODULES.SLOTS}><SlotHistory /></RoleProtectedRoute>} />
            <Route path="/slots/cyber-import" element={<RoleProtectedRoute module={MODULES.CYBER_IMPORT}><CyberImport /></RoleProtectedRoute>} />
            <Route path="/slots/:id" element={<RoleProtectedRoute module={MODULES.SLOTS}><SlotDetail /></RoleProtectedRoute>} />
            <Route path="/warehouse" element={<RoleProtectedRoute module={MODULES.WAREHOUSE}><Warehouse /></RoleProtectedRoute>} />
            <Route path="/metrology" element={<RoleProtectedRoute module={MODULES.METROLOGY}><Metrology /></RoleProtectedRoute>} />
            <Route path="/approval-detail/:id" element={<RoleProtectedRoute module={MODULES.METROLOGY}><ApprovalDetail /></RoleProtectedRoute>} />
            <Route path="/jackpots" element={<RoleProtectedRoute module={MODULES.JACKPOTS}><Jackpots /></RoleProtectedRoute>} />
            <Route path="/invoices" element={<RoleProtectedRoute module={MODULES.INVOICES}><Invoices /></RoleProtectedRoute>} />
            <Route path="/invoices/:id" element={<RoleProtectedRoute module={MODULES.INVOICES}><InvoiceDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-reports" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNReports /></RoleProtectedRoute>} />
            <Route path="/onjn-reports/brand/:brandName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNBrandDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-reports/city/:cityName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNCityDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-reports/county/:countyName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNCountyDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-analytics" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNAnalytics /></RoleProtectedRoute>} />
            <Route path="/onjn-operators" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNOperators /></RoleProtectedRoute>} />
            <Route path="/onjn-operators/brand/:brandName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNBrandDetails /></RoleProtectedRoute>} />
            <Route path="/legal-documents" element={<RoleProtectedRoute module={MODULES.LEGAL}><LegalDocuments /></RoleProtectedRoute>} />
            <Route path="/marketing" element={<RoleProtectedRoute module={MODULES.MARKETING}><Marketing /></RoleProtectedRoute>} />
            <Route path="/marketing-ai" element={<RoleProtectedRoute module={MODULES.MARKETING}><MarketingAI /></RoleProtectedRoute>} />
            <Route path="/marketing/:id" element={<RoleProtectedRoute module={MODULES.MARKETING}><PromotionDetail /></RoleProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/users" element={<RoleProtectedRoute requiredRole="admin"><UsersPage /></RoleProtectedRoute>} />
            <Route path="/settings" element={<RoleProtectedRoute module={MODULES.SETTINGS}><Settings /></RoleProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </DataProvider>
    </AuthProvider>
  )
}

export default App
