import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateUsername = (u: string) => /^[a-zA-Z0-9_]{3,20}$/.test(u)

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateUsername(username)) {
      setError(t('auth.usernameError'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordError'))
      return
    }

    setLoading(true)

    // Verifica se username já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError(t('auth.usernameExists'))
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError(t('auth.emailExists'))
      } else {
        setError(t('auth.signUpError'))
      }
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const usernameValid = username.length === 0 || validateUsername(username)

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-green rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-brand-green/20">
            ⚽
          </div>
          <h1 className="text-3xl font-black text-white">
            {t('auth.createAccount')}
          </h1>
          <p className="text-slate-400 mt-2 text-sm">{t('auth.registerTitle')}</p>
        </div>

        <div className="card shadow-xl shadow-black/20">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('auth.username')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.trim())}
                  placeholder="ex: joao_silva"
                  required
                  maxLength={20}
                  autoComplete="username"
                  className={`input pr-9 ${!usernameValid ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {username.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameValid
                      ? <CheckCircle size={16} className="text-brand-green-light" />
                      : <AlertCircle size={16} className="text-red-400" />
                    }
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('auth.usernameHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('auth.fullName')} <span className="text-slate-500 font-normal">({t('auth.optional')})</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="João Silva"
                autoComplete="name"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.passwordHint')}
                  required
                  autoComplete="new-password"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3 mt-2">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><UserPlus size={18} /> {t('auth.createAccount')}</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 mt-6 text-sm">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-brand-green-light hover:text-brand-gold font-semibold transition-colors">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
