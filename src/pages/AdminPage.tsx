import { useEffect, useState, useCallback } from 'react'
import { Shield, CheckCircle, Plus, X, AlertCircle, Trash2, Users, UserCheck, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Match, Team, Profile } from '../types'
import { Navigate } from 'react-router-dom'
import clsx from 'clsx'

interface MatchResult {
  matchId: number
  homeScore: string
  awayScore: string
}

export default function AdminPage() {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US'
  const [matches, setMatches] = useState<(Match & { home_team?: Team; away_team?: Team })[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Record<number, MatchResult>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ id: number; type: 'success' | 'error'; msg: string } | null>(null)
  const [approvingUser, setApprovingUser] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'matches' | 'users'>('users')

  // Novo jogo form
  const [showNewMatch, setShowNewMatch] = useState(false)
  const [newMatch, setNewMatch] = useState({
    homeTeamId: '', awayTeamId: '', date: '', time: '', venue: '', round: 'Fase de Grupos',
  })

  const fetchData = useCallback(async () => {
    const [matchRes, teamsRes, pendingRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .order('match_date', { ascending: true }),
      supabase.from('teams').select('*').order('name'),
      supabase.from('profiles').select('*').eq('is_approved', false).eq('is_admin', false).order('created_at', { ascending: true }),
    ])
    setMatches(matchRes.data ?? [])
    setTeams(teamsRes.data ?? [])
    setPendingUsers(pendingRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />

  const showFeedback = (id: number, type: 'success' | 'error', msg: string) => {
    setFeedback({ id, type, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleApproveUser = async (userId: string) => {
    setApprovingUser(userId)
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId)
    if (!error) fetchData()
    setApprovingUser(null)
  }

  const handleRejectUser = async (userId: string) => {
    if (!window.confirm(t('admin.rejectConfirm'))) return
    setApprovingUser(userId)
    // Remove da auth (via admin API não disponível no frontend) — apenas marca como recusado removendo o perfil
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (!error) fetchData()
    setApprovingUser(null)
  }

  // Finalizar partida com resultado
  const handleFinish = async (match: Match) => {
    const result = results[match.id]
    if (!result) return

    const home = parseInt(result.homeScore)
    const away = parseInt(result.awayScore)

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      showFeedback(match.id, 'error', t('admin.invalidScore'))
      return
    }

    setSaving(match.id)
    const { error } = await supabase.rpc('finish_match', {
      p_match_id: match.id,
      p_home_score: home,
      p_away_score: away,
    })

    if (error) showFeedback(match.id, 'error', t('admin.finalizeError') + error.message)
    else { showFeedback(match.id, 'success', t('admin.finalizeSuccess')); fetchData() }
    setSaving(null)
  }

  // Deletar partida
  const handleDelete = async (matchId: number) => {
    if (!window.confirm(t('admin.deleteConfirm'))) return
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) showFeedback(matchId, 'error', t('admin.createError') + error.message)
    else fetchData()
  }

  // Criar nova partida
  const handleCreateMatch = async () => {
    if (!newMatch.homeTeamId || !newMatch.awayTeamId || !newMatch.date || !newMatch.time) {
      alert(t('admin.fillRequired'))
      return
    }
    if (newMatch.homeTeamId === newMatch.awayTeamId) {
      alert(t('admin.sameTeams'))
      return
    }

    const matchDate = new Date(`${newMatch.date}T${newMatch.time}:00`).toISOString()
    const { error } = await supabase.from('matches').insert({
      home_team_id: parseInt(newMatch.homeTeamId),
      away_team_id: parseInt(newMatch.awayTeamId),
      match_date: matchDate,
      venue: newMatch.venue || null,
      round: newMatch.round,
      status: 'upcoming',
    })

    if (error) alert(t('admin.createError') + error.message)
    else {
      setShowNewMatch(false)
      setNewMatch({ homeTeamId: '', awayTeamId: '', date: '', time: '', venue: '', round: 'Fase de Grupos' })
      fetchData()
    }
  }

  const notFinished = matches.filter(m => m.status !== 'finished')
  const finished = matches.filter(m => m.status === 'finished')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-brand-green" />
            {t('admin.title')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('admin.subtitle')}</p>
        </div>
        {activeTab === 'matches' && (
          <button onClick={() => setShowNewMatch(!showNewMatch)} className="btn-primary text-sm">
            {showNewMatch ? <><X size={14} /> {t('admin.cancel')}</> : <><Plus size={14} /> {t('admin.newMatch')}</>}
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
        <button
          onClick={() => setActiveTab('users')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'users'
              ? 'bg-brand-green text-white'
              : 'text-slate-400 hover:text-white',
          )}
        >
          <Users size={15} />
          {t('admin.tabUsers')}
          {pendingUsers.length > 0 && (
            <span className="bg-brand-gold text-surface font-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'matches'
              ? 'bg-brand-green text-white'
              : 'text-slate-400 hover:text-white',
          )}
        >
          <Shield size={15} />
          {t('admin.tabMatches')}
        </button>
      </div>

      {/* Formulário nova partida */}
      {showNewMatch && (
        <div className="card border-brand-green/30 animate-slide-up">
          <h2 className="text-base font-bold text-white mb-4">{t('admin.addMatchTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('admin.homeTeam')}</label>
              <select
                value={newMatch.homeTeamId}
                onChange={e => setNewMatch(p => ({ ...p, homeTeamId: e.target.value }))}
                className="input"
              >
                <option value="">{t('admin.selectTeam')}</option>
                {teams.map(team => <option key={team.id} value={team.id}>{team.flag_emoji} {team.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('admin.awayTeam')}</label>
              <select
                value={newMatch.awayTeamId}
                onChange={e => setNewMatch(p => ({ ...p, awayTeamId: e.target.value }))}
                className="input"
              >
                <option value="">{t('admin.selectTeam')}</option>
                {teams.map(team => <option key={team.id} value={team.id}>{team.flag_emoji} {team.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('admin.dateLabel')}</label>
              <input type="date" value={newMatch.date} onChange={e => setNewMatch(p => ({ ...p, date: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('admin.timeLabel')}</label>
              <input type="time" value={newMatch.time} onChange={e => setNewMatch(p => ({ ...p, time: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('admin.venueLabel')}</label>
              <input type="text" value={newMatch.venue} onChange={e => setNewMatch(p => ({ ...p, venue: e.target.value }))} placeholder="" className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('admin.roundLabel')}</label>
              <select value={newMatch.round} onChange={e => setNewMatch(p => ({ ...p, round: e.target.value }))} className="input">
                {['Fase de Grupos', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'].map(r => (
                  <option key={r} value={r}>{t(`rounds.${r}`, { defaultValue: r })}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleCreateMatch} className="btn-primary mt-4">
            <Plus size={14} /> {t('admin.createMatch')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'users' ? (
        /* ---- ABA USUÁRIOS ---- */
        <div className="space-y-4">
          {/* Pendentes */}
          <div>
            <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-gold" />
              {t('admin.pendingTitle', { count: pendingUsers.length })}
            </h2>
            {pendingUsers.length === 0 ? (
              <div className="card text-center py-8">
                <UserCheck size={28} className="text-brand-green mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{t('admin.noPending')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map(u => (
                  <div key={u.id} className="card flex items-center gap-4 border-brand-gold/20">
                    <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shrink-0">
                      {u.username[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{u.username}</p>
                      {u.full_name && <p className="text-xs text-slate-500">{u.full_name}</p>}
                      <p className="text-xs text-slate-600">
                        {t('admin.registeredAt', { date: new Date(u.created_at).toLocaleDateString(locale) })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveUser(u.id)}
                        disabled={approvingUser === u.id}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {approvingUser === u.id
                          ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          : <><UserCheck size={12} /> {t('admin.approve')}</>
                        }
                      </button>
                      <button
                        onClick={() => handleRejectUser(u.id)}
                        disabled={approvingUser === u.id}
                        className="btn-danger text-xs py-1.5 px-3"
                      >
                        <UserX size={12} /> {t('admin.reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ---- ABA PARTIDAS ---- */
        <>
          {/* Formulário nova partida */}
          {showNewMatch && (
            <div className="card border-brand-green/30 animate-slide-up">
              <h2 className="text-base font-bold text-white mb-4">{t('admin.addMatchTitle')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('admin.homeTeam')}</label>
                  <select
                    value={newMatch.homeTeamId}
                    onChange={e => setNewMatch(p => ({ ...p, homeTeamId: e.target.value }))}
                    className="input"
                  >
                    <option value="">{t('admin.selectTeam')}</option>
                    {teams.map(team => <option key={team.id} value={team.id}>{team.flag_emoji} {team.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('admin.awayTeam')}</label>
                  <select
                    value={newMatch.awayTeamId}
                    onChange={e => setNewMatch(p => ({ ...p, awayTeamId: e.target.value }))}
                    className="input"
                  >
                    <option value="">{t('admin.selectTeam')}</option>
                    {teams.map(team => <option key={team.id} value={team.id}>{team.flag_emoji} {team.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('admin.dateLabel')}</label>
                  <input type="date" value={newMatch.date} onChange={e => setNewMatch(p => ({ ...p, date: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('admin.timeLabel')}</label>
                  <input type="time" value={newMatch.time} onChange={e => setNewMatch(p => ({ ...p, time: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('admin.venueLabel')}</label>
                  <input type="text" value={newMatch.venue} onChange={e => setNewMatch(p => ({ ...p, venue: e.target.value }))} placeholder="" className="input" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">{t('admin.roundLabel')}</label>
                  <select value={newMatch.round} onChange={e => setNewMatch(p => ({ ...p, round: e.target.value }))} className="input">
                    {['Fase de Grupos', 'Segunda Rodada', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Terceiro Lugar', 'Final'].map(r => (
                      <option key={r} value={r}>{t(`rounds.${r}`, { defaultValue: r })}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateMatch} className="btn-primary mt-4">
                <Plus size={14} /> {t('admin.createMatch')}
              </button>
            </div>
          )}
          {/* Seção AGENDADAS / EM ANDAMENTO */}
          {notFinished.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-brand-green-light uppercase tracking-wider mb-3">
              {t('admin.sectionScheduled', { count: notFinished.length })}
              </h2>
              <div className="space-y-3">
                {notFinished.map(match => (
                  <MatchAdminRow
                    key={match.id}
                    match={match}
                    result={results[match.id]}
                    onResultChange={(id, field, val) => setResults(p => ({ ...p, [id]: { matchId: id, homeScore: field === 'home' ? val : p[id]?.homeScore ?? '', awayScore: field === 'away' ? val : p[id]?.awayScore ?? '' } }))}
                    onFinish={() => handleFinish(match)}
                    onDelete={() => handleDelete(match.id)}
                    saving={saving === match.id}
                    feedback={feedback?.id === match.id ? feedback : null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Seção ENCERRADAS */}
          {finished.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {t('admin.sectionFinished', { count: finished.length })}
              </h2>
              <div className="space-y-3">
                {finished.map(match => (
                  <MatchAdminRow
                    key={match.id}
                    match={match}
                    result={results[match.id]}
                    onResultChange={(id, field, val) => setResults(p => ({ ...p, [id]: { matchId: id, homeScore: field === 'home' ? val : p[id]?.homeScore ?? '', awayScore: field === 'away' ? val : p[id]?.awayScore ?? '' } }))}
                    onDelete={() => handleDelete(match.id)}
                    saving={saving === match.id}
                    feedback={feedback?.id === match.id ? feedback : null}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// Componente de linha da partida no admin
function MatchAdminRow({
  match, result, onResultChange, onFinish, onDelete, saving, feedback,
}: {
  match: Match & { home_team?: Team; away_team?: Team }
  result?: MatchResult
  onResultChange: (id: number, field: 'home' | 'away', val: string) => void
  onFinish?: () => void
  onDelete?: () => void
  saving: boolean
  feedback: { type: 'success' | 'error'; msg: string } | null
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US'
  const date = new Date(match.match_date)
  return (
    <div className={clsx(
      'card flex flex-wrap items-center gap-4',
      match.status === 'live' && 'border-red-500/30',
      match.status === 'finished' && 'opacity-75',
    )}>
      {/* Teams */}
      <div className="flex items-center gap-2 flex-1 min-w-48">
        <span className="text-xl">{match.home_team?.flag_emoji}</span>
        <span className="text-sm font-semibold text-white">{match.home_team?.name}</span>
        <span className="text-slate-600 text-xs mx-1">vs</span>
        <span className="text-sm font-semibold text-white">{match.away_team?.name}</span>
        <span className="text-xl">{match.away_team?.flag_emoji}</span>
      </div>

      {/* Date & round */}
      <div className="text-xs text-slate-500">
        <div>{date.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-slate-600">{t(`rounds.${match.round}`, { defaultValue: match.round })}</div>
      </div>

      {/* Result or score input */}
      {match.status === 'finished' ? (
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="text-brand-gold">{match.home_score}</span>
          <span className="text-slate-500">–</span>
          <span className="text-brand-gold">{match.away_score}</span>
          <span className="text-xs text-slate-500 font-normal ml-1">{t('admin.finalLabel')}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="99"
            value={result?.homeScore ?? ''}
            onChange={e => onResultChange(match.id, 'home', e.target.value)}
            placeholder="0"
            className="input w-16 text-center"
          />
          <span className="text-slate-500">–</span>
          <input
            type="number" min="0" max="99"
            value={result?.awayScore ?? ''}
            onChange={e => onResultChange(match.id, 'away', e.target.value)}
            placeholder="0"
            className="input w-16 text-center"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {match.status !== 'finished' && onFinish && (
          <button
            onClick={onFinish}
            disabled={saving || !result?.homeScore === undefined}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {saving
              ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              : <><CheckCircle size={12} /> {t('admin.finalize')}</>
            }
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={clsx(
          'w-full flex items-center gap-1.5 text-xs rounded-lg px-3 py-2',
          feedback.type === 'success' ? 'bg-brand-green/10 text-brand-green-light' : 'bg-red-500/10 text-red-400',
        )}>
          {feedback.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {feedback.msg}
        </div>
      )}
    </div>
  )
}
