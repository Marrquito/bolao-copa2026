import { Clock, LogOut, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function PendingPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-brand-green rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-brand-green/20">
          ⚽
        </div>

        {/* Card */}
        <div className="card shadow-xl shadow-black/20 space-y-5">
          <div className="w-14 h-14 bg-brand-gold/10 border border-brand-gold/20 rounded-full flex items-center justify-center mx-auto">
            <Clock size={28} className="text-brand-gold" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">{t('pending.title')}</h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              {t('pending.greeting', { name: profile?.username })}{' '}
              {t('pending.message')}
            </p>
          </div>

          <div className="bg-surface border border-surface-border rounded-xl p-4 text-left space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('pending.whatNext')}</p>
            <div className="space-y-2.5">
              {[
                { icon: '✅', key: 'pending.step1' },
                { icon: '🏆', key: 'pending.step2' },
                { icon: '⚽', key: 'pending.step3' },
                { icon: '🎯', key: 'pending.step4' },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-base">{item.icon}</span>
                  {t(item.key)}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MessageCircle size={16} className="text-brand-green shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 text-left">
                {t('pending.contact')}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn-secondary w-full text-sm"
          >
            <LogOut size={14} />
            {t('pending.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
