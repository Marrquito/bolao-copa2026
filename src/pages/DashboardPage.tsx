import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Calendar, TrendingUp, ChevronRight, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { MatchWithPrediction, RankingEntry } from '../types'
import MatchCard from '../components/MatchCard'

export default function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithPrediction[]>([])
  const [topRanking, setTopRanking] = useState<RankingEntry[]>([])
  const [stats, setStats] = useState({ total: 0, exact: 0, correct: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return

    const [matchesRes, predRes, rankRes] = await Promise.all([
      // Próximas partidas (upcoming + live), máximo 3
      supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .in('status', ['upcoming', 'live'])
        .order('match_date', { ascending: true })
        .limit(3),

      // Palpites do usuário
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id),

      // Top 5 ranking
      supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(5),
    ])

    const predictions = predRes.data ?? []
    const matches = matchesRes.data ?? []

    // Combina partidas com palpites
    const matchesWithPredictions: MatchWithPrediction[] = matches.map(m => ({
      ...m,
      user_prediction: predictions.find(p => p.match_id === m.id) ?? null,
    }))

    setUpcomingMatches(matchesWithPredictions)

    // Estatísticas do usuário
    const total = predictions.length
    const exact = predictions.filter(p => p.points_earned === 15).length
    const correct = predictions.filter(p => p.points_earned >= 5).length
    setStats({ total, exact, correct })

    // Top 5 com ranking
    const ranking: RankingEntry[] = (rankRes.data ?? []).map((p, i) => {
      const userPreds = predictions.filter(pred => pred.user_id === p.id)
      return {
        rank: i + 1,
        profile: p,
        total_predictions: userPreds.length,
        exact_scores: userPreds.filter(pred => pred.points_earned === 15).length,
      }
    })
    setTopRanking(ranking)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePredictionSaved = () => {
    refreshProfile()
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Boas-vindas */}
      <div className="bg-gradient-to-r from-brand-green/20 to-brand-gold/10 border border-brand-green/20 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {t('dashboard.greeting', { name: profile?.username })}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-2xl font-black text-brand-gold">{profile?.total_points ?? 0}</p>
              <p className="text-xs text-slate-500">{t('dashboard.points')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-brand-green-light">{stats.exact}</p>
              <p className="text-xs text-slate-500">{t('dashboard.exactScores')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{stats.total}</p>
              <p className="text-xs text-slate-500">{t('dashboard.predictions')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regra de pontuação */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: '🎯', label: t('points.exactLabel'), pts: 15, color: 'text-brand-gold' },
          { icon: '✅', label: t('points.partialLabel'), pts: 7, color: 'text-brand-green-light' },
          { icon: '✔️', label: t('points.resultLabel'), pts: 5, color: 'text-blue-400' },
          { icon: '❌', label: t('points.missLabel'), pts: 0, color: 'text-slate-500' },
        ].map(item => (
          <div key={item.label} className="card text-center py-4">
            <span className="text-2xl">{item.icon}</span>
            <p className={`text-xl font-black mt-1 ${item.color}`}>+{item.pts}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas partidas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-brand-green" />
              {t('dashboard.upcomingMatches')}
            </h2>
            <Link to="/matches" className="text-sm text-brand-green-light hover:text-brand-gold flex items-center gap-1 transition-colors">
              {t('dashboard.viewAll')} <ChevronRight size={14} />
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="card text-center py-10">
              <Calendar size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">{t('dashboard.noMatches')}</p>
            </div>
          ) : (
            upcomingMatches.map(match => (
              <MatchCard key={match.id} match={match} onPredictionSaved={handlePredictionSaved} />
            ))
          )}
        </div>

        {/* Mini Ranking */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy size={18} className="text-brand-gold" />
              {t('dashboard.rankingTitle')}
            </h2>
            <Link to="/rankings" className="text-sm text-brand-green-light hover:text-brand-gold flex items-center gap-1 transition-colors">
              {t('dashboard.rankingFull')} <ChevronRight size={14} />
            </Link>
          </div>

          <div className="card p-0 overflow-hidden">
            {topRanking.map((entry, i) => {
              const medals = ['🥇', '🥈', '🥉']
              const isCurrentUser = entry.profile.id === user?.id
              return (
                <div
                  key={entry.profile.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < topRanking.length - 1 ? 'border-b border-surface-border/50' : ''} ${isCurrentUser ? 'bg-brand-green/10' : 'hover:bg-surface-hover'} transition-colors`}
                >
                  <span className="text-lg w-7 text-center">
                    {medals[entry.rank - 1] ?? entry.rank}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 ${isCurrentUser ? 'bg-brand-green' : 'bg-slate-600'}`}>
                    {entry.profile.username[0]}
                  </div>
                  <span className={`flex-1 text-sm font-medium truncate ${isCurrentUser ? 'text-brand-green-light' : 'text-slate-300'}`}>
                    {entry.profile.username}
                  </span>
                  <span className={`text-sm font-black tabular-nums ${entry.rank === 1 ? 'text-brand-gold' : 'text-white'}`}>
                    {entry.profile.total_points}
                  </span>
                </div>
              )
            })}
            {topRanking.length === 0 && (
              <div className="py-8 text-center">
                <TrendingUp size={28} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">{t('dashboard.noData')}</p>
              </div>
            )}
          </div>

          {/* User stats mini */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Target size={14} className="text-brand-green" />
              {t('dashboard.statsTitle')}
            </h3>
            <div className="space-y-2">
              {[
                { label: t('dashboard.statTotal'), value: stats.total },
                { label: t('dashboard.statCorrect'), value: stats.correct },
                { label: t('dashboard.statExact'), value: stats.exact },
                {
                  label: t('dashboard.statAccuracy'),
                  value: stats.total > 0 ? `${Math.round((stats.correct / stats.total) * 100)}%` : '—',
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
