import { useEffect, useState, useCallback } from 'react'
import { Calendar, Search, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { MatchWithPrediction } from '../types'
import MatchCard from '../components/MatchCard'
import clsx from 'clsx'

const ROUNDS = ['Todos', 'Fase de Grupos', 'Segunda Rodada', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Terceiro Lugar', 'Final']
const STATUSES = [
  { value: 'all', labelKey: 'matches.all' },
  { value: 'upcoming', labelKey: 'matches.scheduled' },
  { value: 'live', labelKey: 'matches.inProgress' },
  { value: 'finished', labelKey: 'matches.finished' },
]

export default function MatchesPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US'
  const [matches, setMatches] = useState<MatchWithPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [roundFilter, setRoundFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchMatches = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [matchRes, predRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .order('match_date', { ascending: true }),
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id),
    ])

    const predictions = predRes.data ?? []
    const withPredictions: MatchWithPrediction[] = (matchRes.data ?? []).map(m => ({
      ...m,
      user_prediction: predictions.find(p => p.match_id === m.id) ?? null,
    }))

    setMatches(withPredictions)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const filtered = matches.filter(m => {
    const roundOk = roundFilter === 'Todos' || m.round === roundFilter
    const statusOk = statusFilter === 'all' || m.status === statusFilter
    const searchLower = search.toLowerCase()
    const searchOk = !search || 
      m.home_team?.name.toLowerCase().includes(searchLower) ||
      m.away_team?.name.toLowerCase().includes(searchLower)
    return roundOk && statusOk && searchOk
  })

  // Agrupa por data
  const grouped = filtered.reduce<Record<string, MatchWithPrediction[]>>((acc, m) => {
    const date = new Date(m.match_date).toLocaleDateString(locale, {
      weekday: 'long', day: '2-digit', month: 'long',
    })
    acc[date] = [...(acc[date] ?? []), m]
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar size={22} className="text-brand-green" />
          {t('matches.title')}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('matches.subtitle')}
        </p>
      </div>

      {/* Filtros */}
      <div className="card space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('matches.searchPlaceholder')}
            className="input pl-9"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
                statusFilter === s.value
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-transparent text-slate-400 border-surface-border hover:text-white hover:border-slate-500',
              )}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>

        {/* Round filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
            <Filter size={11} /> {t('matches.roundFilter')}
          </span>
          {ROUNDS.map(r => (
            <button
              key={r}
              onClick={() => setRoundFilter(r)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                roundFilter === r
                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {t(`rounds.${r}`, { defaultValue: r })}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-14">
          <Calendar size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">{t('matches.noMatches')}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayMatches]) => (
          <div key={date} className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider capitalize border-b border-surface-border pb-2">
              {date}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayMatches.map(match => (
                <MatchCard key={match.id} match={match} onPredictionSaved={fetchMatches} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
