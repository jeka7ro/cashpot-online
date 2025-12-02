import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import { MODULES } from './utils/permissions'
import useBackendKeepAlive from './hooks/useBackendKeepAlive'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Locations from './pages/Locations'
import LocationDetail from './pages/LocationDetail'
import ContractDetail from './pages/ContractDetail'
import Competitors from './pages/Competitors'
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
import InventoryCentralizer from './pages/InventoryCentralizer'
import Metrology from './pages/Metrology'
import ApprovalDetail from './pages/ApprovalDetail'
import CVTDetail from './pages/CVTDetail'
import CommissionDetail from './pages/CommissionDetail'
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
import ONJNMap from './pages/ONJNMap'
import ONJNClass2 from './pages/ONJNClass2'
import ONJNClass2Detail from './pages/ONJNClass2Detail'
import ONJNClass2Operator from './pages/ONJNClass2Operator'
import ONJNClass1 from './pages/ONJNClass1'
import ONJNCompanyDetail from './pages/ONJNCompanyDetail'
import LegalDocuments from './pages/LegalDocuments'
import UsersPage from './pages/Users'
import Expenditures from './pages/Expenditures'
import ExpendituresSettings from './pages/ExpendituresSettings'
import ExpendituresPOS from './pages/ExpendituresPOS'
import ExpendituresSQLTable from './pages/ExpendituresSQLTable'
import ExpendituresDetail from './pages/ExpendituresDetail'
import ExpendituresSlotsMonthly from './pages/ExpendituresSlotsMonthly'
import ExpendituresElectric from './pages/ExpendituresElectric'
import ExpendituresElectricMonth from './pages/ExpendituresElectricMonth'
import CyberTable from './pages/CyberTable'
import IncasariSettings from './pages/IncasariSettings'
import Incasari from './pages/Incasari'
import IncasariMonthly from './pages/IncasariMonthly'
import IncasariOperational from './pages/IncasariOperational'
import IncasariSmartAnalytics from './pages/IncasariSmartAnalytics'
import LocationPLDetail from './pages/LocationPLDetail'
import POSBancaAIAnalysis from './pages/POSBancaAIAnalysis'
import AdvancedAnalytics from './pages/AdvancedAnalytics'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import Tasks from './pages/Tasks'
import Messages from './pages/Messages'

function App() {
  // Keep-Alive: Previne cold starts pe backend (Render.com)
  // Face ping la fiecare 5 minute pentru a menține backend-ul activ
  useBackendKeepAlive(true, 5)

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
            <Route path="/contracts/:id" element={<RoleProtectedRoute module={MODULES.LOCATIONS}><ContractDetail /></RoleProtectedRoute>} />
            <Route path="/competitors" element={<RoleProtectedRoute module={MODULES.LOCATIONS}><Competitors /></RoleProtectedRoute>} />
            <Route path="/providers" element={<RoleProtectedRoute module={MODULES.PROVIDERS}><Providers /></RoleProtectedRoute>} />
            <Route path="/cabinets" element={<RoleProtectedRoute module={MODULES.CABINETS}><Cabinets /></RoleProtectedRoute>} />
            <Route path="/game-mixes" element={<RoleProtectedRoute module={MODULES.GAME_MIXES}><GameMixes /></RoleProtectedRoute>} />
            <Route path="/games/:gameId" element={<RoleProtectedRoute module={MODULES.SLOTS}><GameDetail /></RoleProtectedRoute>} />
            <Route path="/slots" element={<RoleProtectedRoute module={MODULES.SLOTS}><Slots /></RoleProtectedRoute>} />
            <Route path="/slots/history" element={<RoleProtectedRoute module={MODULES.SLOTS}><SlotHistory /></RoleProtectedRoute>} />
            <Route path="/slots/cyber-import" element={<RoleProtectedRoute module={MODULES.CYBER_IMPORT}><CyberImport /></RoleProtectedRoute>} />
            <Route path="/slots/:id" element={<RoleProtectedRoute module={MODULES.SLOTS}><SlotDetail /></RoleProtectedRoute>} />
            <Route path="/warehouse" element={<RoleProtectedRoute module={MODULES.WAREHOUSE}><Warehouse /></RoleProtectedRoute>} />
            <Route path="/warehouse/inventory-centralizer" element={<RoleProtectedRoute module={MODULES.WAREHOUSE}><InventoryCentralizer /></RoleProtectedRoute>} />
            <Route path="/metrology" element={<RoleProtectedRoute module={MODULES.METROLOGY}><Metrology /></RoleProtectedRoute>} />
            <Route path="/metrology/cvt/:id" element={<RoleProtectedRoute module={MODULES.METROLOGY}><CVTDetail /></RoleProtectedRoute>} />
            <Route path="/approval-detail/:id" element={<RoleProtectedRoute module={MODULES.METROLOGY}><ApprovalDetail /></RoleProtectedRoute>} />
            <Route path="/metrology/commission/:id" element={<RoleProtectedRoute module={MODULES.METROLOGY}><CommissionDetail /></RoleProtectedRoute>} />
            <Route path="/jackpots" element={<RoleProtectedRoute module={MODULES.JACKPOTS}><Jackpots /></RoleProtectedRoute>} />
            <Route path="/invoices" element={<RoleProtectedRoute module={MODULES.INVOICES}><Invoices /></RoleProtectedRoute>} />
            <Route path="/invoices/:id" element={<RoleProtectedRoute module={MODULES.INVOICES}><InvoiceDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-reports" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNReports /></RoleProtectedRoute>} />
            <Route path="/onjn-reports/brand/:brandName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNBrandDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-reports/city/:cityName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNCityDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-reports/county/:countyName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNCountyDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-analytics" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNAnalytics /></RoleProtectedRoute>} />
            <Route path="/onjn-map" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNMap /></RoleProtectedRoute>} />
            {/* ONJN Class pages under /onjn */}
            <Route path="/onjn" element={<Navigate to="/onjn/class-1" replace />} />
            <Route path="/onjn/class-1" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNClass1 /></RoleProtectedRoute>} />
            <Route path="/onjn/class-2" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNClass2 /></RoleProtectedRoute>} />
            <Route path="/onjn/class-2/:id" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNClass2Detail /></RoleProtectedRoute>} />
            <Route path="/onjn/class-2/operator/:name" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNClass2Operator /></RoleProtectedRoute>} />
            <Route path="/onjn-class-1" element={<Navigate to="/onjn/class-1" replace />} />
            {/* Backward compatibility redirects */}
            <Route path="/onjn-class-2" element={<Navigate to="/onjn/class-2" replace />} />
            <Route path="/onjn-class-2/:id" element={<Navigate to="/onjn/class-2/:id" replace />} />
            <Route path="/onjn-class-2/operator/:name" element={<Navigate to="/onjn/class-2/operator/:name" replace />} />
            <Route path="/onjn-reports/company/:companyName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNCompanyDetail /></RoleProtectedRoute>} />
            <Route path="/onjn-operators" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNOperators /></RoleProtectedRoute>} />
            <Route path="/onjn-operators/brand/:brandName" element={<RoleProtectedRoute module={MODULES.ONJN}><ONJNBrandDetails /></RoleProtectedRoute>} />
            <Route path="/legal-documents" element={<RoleProtectedRoute module={MODULES.LEGAL}><LegalDocuments /></RoleProtectedRoute>} />
            <Route path="/expenditures" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><Expenditures /></RoleProtectedRoute>} />
            <Route path="/expenditures/settings" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresSettings /></RoleProtectedRoute>} />
            <Route path="/expenditures/pos-banca" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresPOS /></RoleProtectedRoute>} />
            <Route path="/expenditures/pos-banca/ai-analysis" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><POSBancaAIAnalysis /></RoleProtectedRoute>} />
            <Route path="/expenditures/advanced-analytics" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><AdvancedAnalytics /></RoleProtectedRoute>} />
            <Route path="/expenditures/sql-table" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresSQLTable /></RoleProtectedRoute>} />
            <Route path="/expenditures/slots-monthly" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresSlotsMonthly /></RoleProtectedRoute>} />
            <Route path="/expenditures/electric" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresElectric /></RoleProtectedRoute>} />
            <Route path="/expenditures/electric/:monthKey" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresElectricMonth /></RoleProtectedRoute>} />
            <Route path="/expenditures/detail" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><ExpendituresDetail /></RoleProtectedRoute>} />
            <Route path="/ai-insights" element={<RoleProtectedRoute module={MODULES.EXPENDITURES}><AIInsights /></RoleProtectedRoute>} />
            <Route path="/incasari/operational" element={<RoleProtectedRoute module={MODULES.INCASARI}><IncasariOperational /></RoleProtectedRoute>} />
            <Route path="/incasari/monthly" element={<RoleProtectedRoute module={MODULES.INCASARI}><IncasariMonthly /></RoleProtectedRoute>} />
            <Route path="/incasari/dashboard" element={<RoleProtectedRoute module={MODULES.INCASARI}><Incasari /></RoleProtectedRoute>} />
            <Route path="/incasari" element={<Navigate to="/incasari/dashboard" replace />} />
            <Route path="/incasari/smart-analytics" element={<RoleProtectedRoute module={MODULES.INCASARI}><IncasariSmartAnalytics /></RoleProtectedRoute>} />
            <Route path="/incasari/location-pl/:locationName" element={<RoleProtectedRoute module={MODULES.INCASARI}><LocationPLDetail /></RoleProtectedRoute>} />
            <Route path="/incasari/cyber-table" element={<RoleProtectedRoute module={MODULES.INCASARI}><CyberTable /></RoleProtectedRoute>} />
            <Route path="/incasari/settings" element={<RoleProtectedRoute module={MODULES.INCASARI}><IncasariSettings /></RoleProtectedRoute>} />
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
// Force Vercel rebuild - Fri Nov  7 16:56:12 EET 2025
// Force Vercel rebuild Sun Nov  9 13:32:10 EET 2025
// Force rebuild Wed Nov 12 09:59:01 EET 2025
// Force Vercel rebuild Sun Nov 16 13:13:15 EET 2025
