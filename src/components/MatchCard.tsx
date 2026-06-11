import { useState } from 'react'
import { Lock, CheckCircle, Clock, Minus, Plus, Save, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { MatchWithPrediction } from '../types'
import clsx from 'clsx'

interface MatchCardProps {
  match: MatchWithPrediction
  onPredictionSaved?: () => void
}

function formatDate(dateStr: string, locale: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale, {
    weekday: 'short', day: '2-digit', month: 'short',
  })
}

function formatTime(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function ScoreInput({ value, onChange, disabled }: {
  value: number; onChange: (v: number) => void; disabled: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className="w-8 h-8 rounded-lg bg-surface border border-surface-border text-slate-300 flex items-center justify-center hover:bg-surface-hover hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center text-white font-bold text-xl tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="w-8 h-8 rounded-lg bg-surface border border-surface-border text-slate-300 flex items-center justify-center hover:bg-surface-hover hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default function MatchCard({ match, onPredictionSaved }: MatchCardProps) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US'
  const [homeScore, setHomeScore] = useState(match.user_prediction?.home_score ?? 0)
  const [awayScore, setAwayScore] = useState(match.user_prediction?.away_score ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  // Rastreia localmente se já existe palpite (evita refetch da lista toda)
  const [hasPredictionLocal, setHasPredictionLocal] = useState(!!match.user_prediction)
  const [savedHome, setSavedHome] = useState(match.user_prediction?.home_score ?? 0)
  const [savedAway, setSavedAway] = useState(match.user_prediction?.away_score ?? 0)

  const now = new Date()
  const matchDate = new Date(match.match_date)
  const isTimeLocked = matchDate <= now
  const isLocked = match.status === 'finished' || isTimeLocked
  const isTBD = match.home_team?.name === 'A Definir' || match.away_team?.name === 'A Definir'
  const hasPrediction = hasPredictionLocal
  const predictionChanged =
    homeScore !== savedHome ||
    awayScore !== savedAway

  const handleSave = async () => {
    if (!user || isLocked) return
    setSaving(true)
    setError(null)

    try {
      if (hasPrediction) {
        const { error } = await supabase
          .from('predictions')
          .update({ home_score: homeScore, away_score: awayScore, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('match_id', match.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('predictions')
          .insert({ user_id: user.id, match_id: match.id, home_score: homeScore, away_score: awayScore })
        if (error) throw error
      }
      setSaved(true)
      setHasPredictionLocal(true)
      setSavedHome(homeScore)
      setSavedAway(awayScore)
      setTimeout(() => setSaved(false), 2000)
      onPredictionSaved?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'save error'
      if (msg.includes('new row violates') || msg.includes('upcoming')) {
        setError(t('match.lockError'))
      } else {
        setError(t('match.saveError'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={clsx(
      'card animate-slide-up transition-all duration-200',
      match.status === 'live' && 'border-red-500/40 shadow-lg shadow-red-500/5',
      match.status === 'finished' && 'opacity-90',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isLocked && match.status !== 'finished' && <span className="badge-live"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-slow" />{t('match.inProgress')}</span>}
          {!isLocked && (
            <span className="badge-upcoming">
              <Clock size={10} />
              {formatDate(match.match_date, locale)} · {formatTime(match.match_date, locale)}
            </span>
          )}
          {match.status === 'finished' && (
            <span className="badge-finished">
              <CheckCircle size={10} />
              {t('match.finished')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t(`rounds.${match.round}`, { defaultValue: match.round })}</span>
          {isLocked && <Lock size={12} className="text-slate-500" />}
        </div>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center gap-3 mb-4">
        {/* Home Team */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-3xl">{match.home_team?.flag_emoji}</span>
          <span className="text-sm font-semibold text-white text-center leading-tight">
            {match.home_team?.name}
          </span>
        </div>

        {/* Score area */}
        <div className="flex flex-col items-center gap-2 min-w-[120px]">
          {match.status === 'finished' && match.home_score !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white tabular-nums">{match.home_score}</span>
              <span className="text-slate-500 text-xl font-light">–</span>
              <span className="text-3xl font-black text-white tabular-nums">{match.away_score}</span>
            </div>
          ) : match.status === 'live' ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-red-400 tabular-nums">{match.home_score ?? '?'}</span>
              <span className="text-red-500 text-xl font-light">–</span>
              <span className="text-3xl font-black text-red-400 tabular-nums">{match.away_score ?? '?'}</span>
            </div>
          ) : (
            <span className="text-slate-600 font-bold text-2xl">VS</span>
          )}
          {match.venue && (
            <span className="text-xs text-slate-500 text-center leading-tight">{match.venue.split(',')[0]}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-3xl">{match.away_team?.flag_emoji}</span>
          <span className="text-sm font-semibold text-white text-center leading-tight">
            {match.away_team?.name}
          </span>
        </div>
      </div>

      {/* Prediction section — oculto para partidas com times a definir */}
      {isTBD ? (
        <div className="rounded-lg p-3 border border-surface-border bg-surface/30 text-center">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">
            {t('match.tbd')}
          </p>
        </div>
      ) : (
      <div className={clsx(
        'rounded-lg p-3 border',
        isLocked ? 'bg-surface/50 border-surface-border' : 'bg-brand-green/5 border-brand-green/20',
      )}>
        <p className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wider">
          {isLocked ? t('match.yourPrediction') : hasPrediction ? t('match.changePrediction') : t('match.yourPrediction')}
        </p>

        <div className="flex items-center justify-center gap-4">
          <ScoreInput value={homeScore} onChange={setHomeScore} disabled={isLocked} />
          <span className="text-slate-600 font-bold text-lg">×</span>
          <ScoreInput value={awayScore} onChange={setAwayScore} disabled={isLocked} />
        </div>

        {/* Points earned (finished) */}
        {match.status === 'finished' && hasPrediction && (
          <div className={clsx(
            'mt-3 text-center text-sm font-bold rounded-lg py-1.5',
            match.user_prediction!.points_earned === 15 && 'text-brand-gold bg-brand-gold/10',
            match.user_prediction!.points_earned === 7 && 'text-brand-green-light bg-brand-green/10',
            match.user_prediction!.points_earned === 0 && 'text-slate-500 bg-surface',
          )}>
            {match.user_prediction!.points_earned === 15 && t('points.exact')}
            {match.user_prediction!.points_earned === 7 && t('points.partial')}
            {match.user_prediction!.points_earned === 5 && t('points.result')}
            {match.user_prediction!.points_earned === 0 && t('points.miss')}
          </div>
        )}

        {/* Save button (upcoming only) */}
        {!isLocked && (hasPrediction ? predictionChanged : true) && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 w-full btn-primary text-sm py-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <><CheckCircle size={14} /> {t('match.saved')}</>
            ) : (
              <><Save size={14} /> {hasPrediction ? t('match.updatePrediction') : t('match.savePrediction')}</>
            )}
          </button>
        )}

        {/* Sem palpite (locked) */}
        {isLocked && !hasPrediction && (
          <p className="mt-2 text-center text-xs text-slate-600">{t('match.noPrediction')}</p>
        )}

        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
