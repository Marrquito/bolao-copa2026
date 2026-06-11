import { NavLink, useNavigate } from 'react-router-dom'
import { Trophy, Calendar, BarChart3, Shield, LogOut, Menu, X, Globe } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import clsx from 'clsx'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('pt') ? 'en' : 'pt'
    i18n.changeLanguage(newLang)
    localStorage.setItem('bolao-lang', newLang)
  }

  const navLinks = [
    { to: '/dashboard', label: t('nav.home'), icon: Trophy },
    { to: '/matches', label: t('nav.matches'), icon: Calendar },
    { to: '/rankings', label: t('nav.rankings'), icon: BarChart3 },
    ...(profile?.is_admin ? [{ to: '/admin', label: t('nav.admin'), icon: Shield }] : []),
  ]

  return (
    <nav className="bg-surface-card border-b border-surface-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center text-lg">
              ⚽
            </div>
            <span className="font-bold text-white text-lg hidden sm:block">
              Bolão <span className="text-brand-gold">2026</span>
            </span>
          </NavLink>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-green/20 text-brand-green-light'
                      : 'text-slate-400 hover:text-white hover:bg-surface-hover'
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* User area */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-semibold border border-surface-border hover:border-slate-500 rounded-md px-2 py-1"
              title="Toggle language"
            >
              <Globe size={12} />
              {i18n.language.startsWith('pt') ? 'EN' : 'PT'}
            </button>

            {/* Points badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/20 px-3 py-1.5 rounded-full">
              <Trophy size={14} className="text-brand-gold" />
              <span className="text-brand-gold font-bold text-sm">{profile?.total_points ?? 0}</span>
            </div>

            {/* Username */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm uppercase">
                {profile?.username?.[0] ?? '?'}
              </div>
              <span className="text-sm text-slate-300 font-medium">{profile?.username}</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm"
              title={t('nav.signOut')}
            >
              <LogOut size={16} />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-surface-border py-3 space-y-1 animate-fade-in">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full',
                    isActive
                      ? 'bg-brand-green/20 text-brand-green-light'
                      : 'text-slate-400 hover:text-white hover:bg-surface-hover'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between px-4 pt-3 border-t border-surface-border mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm uppercase">
                  {profile?.username?.[0] ?? '?'}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{profile?.username}</p>
                  <p className="text-xs text-brand-gold font-semibold">{profile?.total_points ?? 0} {t('nav.pts')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-semibold border border-surface-border hover:border-slate-500 rounded-md px-2 py-1"
                >
                  <Globe size={12} />
                  {i18n.language.startsWith('pt') ? 'EN' : 'PT'}
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm"
                >
                  <LogOut size={16} />
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
