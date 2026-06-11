import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { session, profile, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Usuário logado mas aguardando aprovação do admin
  if (profile && !profile.is_approved && !profile.is_admin) {
    return <Navigate to="/pending" replace />
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
