import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import DashboardParamedico from '@/pages/dashboard/paramedico/DashboardParamedico'
import ChatParamedico from '@/pages/dashboard/paramedico/ChatParamedico'
import DashboardMedico from '@/pages/dashboard/medico/DashboardMedico'
import DashboardTens from '@/pages/dashboard/tens/DashboardTens'
import DashboardAdmin from '@/pages/dashboard/admin/DashboardAdmin'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard/paramedico" element={<DashboardParamedico />} />
        <Route path="/dashboard/paramedico/chat/:fichaId" element={<ChatParamedico />} />
        <Route path="/dashboard/medico" element={<DashboardMedico />} />
        <Route path="/dashboard/tens" element={<DashboardTens />} />
        <Route path="/dashboard/administrador" element={<DashboardAdmin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
