import { useEffect, useState, useCallback } from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { RankingEntry } from '../types'
import RankingTable from '../components/RankingTable'

export default function RankingsPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US'
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastResultAt, setLastResultAt] = useState<string | null>(null)

  const fetchRanking = useCallback(async () => {
    setLoading(true)

    const [profilesRes, predictionsRes, lastMatchRes] = await Promise.all([
      supabase.from('profiles').select('*').order('total_points', { ascending: false }),
      supabase.from('predictions').select('user_id, points_earned'),
      supabase.from('matches').select('updated_at').eq('status', 'finished')
        .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const profiles = profilesRes.data
    if (!profiles) { setLoading(false); return }

    const predictions = predictionsRes.data ?? []

    const predsByUser = (predictions ?? []).reduce<Record<string, { total: number; exact: number }>>((acc, p) => {
      if (!acc[p.user_id]) acc[p.user_id] = { total: 0, exact: 0 }
      acc[p.user_id].total++
      if (p.points_earned === 15) acc[p.user_id].exact++
      return acc
    }, {})

    const ranking: RankingEntry[] = profiles.map((p, i) => ({
      rank: i + 1,
      profile: p,
      total_predictions: predsByUser[p.id]?.total ?? 0,
      exact_scores: predsByUser[p.id]?.exact ?? 0,
    }))

    setEntries(ranking)
    setLastResultAt(lastMatchRes.data?.updated_at ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRanking()
  }, [fetchRanking])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy size={22} className="text-brand-gold" />
            {t('rankings.title')}
          </h1>
            {lastResultAt ? (
            <p className="text-slate-500 text-xs mt-1">
              {t('rankings.lastResult', {
                date: new Date(lastResultAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
                time: new Date(lastResultAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
              })}
            </p>
          ) : (
            <p className="text-slate-600 text-xs mt-1">{t('rankings.noResults')}</p>
          )}
        </div>
        <button
          onClick={fetchRanking}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('rankings.refresh')}
        </button>
      </div>

      {/* Pódio top 3 */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            const podiumData = [
              { height: 'h-20', order: 2, medal: '🥈', color: 'text-slate-300', bg: 'bg-slate-300/10 border-slate-300/20' },
              { height: 'h-28', order: 1, medal: '🥇', color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
              { height: 'h-16', order: 3, medal: '🥉', color: 'text-amber-700', bg: 'bg-amber-700/10 border-amber-700/20' },
            ][i]
            return (
              <div key={entry.profile.id} className={`card border ${podiumData.bg} text-center flex flex-col items-center justify-end pt-4`}>
                <span className="text-2xl">{podiumData.medal}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg uppercase mt-2 ${entry.profile.id === user?.id ? 'bg-brand-green' : 'bg-slate-600'}`}>
                  {entry.profile.username[0]}
                </div>
                <p className="text-sm font-semibold text-white mt-1.5 truncate max-w-full px-2">
                  {entry.profile.username}
                </p>
                <p className={`text-xl font-black ${podiumData.color} mt-1`}>
                  {entry.profile.total_points} <span className="text-xs font-normal text-slate-500">pts</span>
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Sistema de pontos */}
      <div className="card bg-gradient-to-r from-surface-card to-surface-hover">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">{t('rankings.howPoints')}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl">🎯</p>
            <p className="text-brand-gold font-black text-lg">+15</p>
            <p className="text-xs text-slate-500">{t('points.exactLabel')}</p>
          </div>
          <div>
            <p className="text-2xl">✅</p>
            <p className="text-brand-green-light font-black text-lg">+7</p>
            <p className="text-xs text-slate-500">{t('points.resultLabel')}</p>
          </div>
          <div>
            <p className="text-2xl">❌</p>
            <p className="text-slate-500 font-black text-lg">+0</p>
            <p className="text-xs text-slate-500">{t('points.missLabel')}</p>
          </div>
        </div>
      </div>

      {/* Tabela completa */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <RankingTable entries={entries} currentUserId={user?.id} />
      )}
    </div>
  )
}
