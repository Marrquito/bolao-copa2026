import { Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RankingEntry } from '../types'
import clsx from 'clsx'

interface RankingTableProps {
  entries: RankingEntry[]
  currentUserId?: string
}

const medals = ['🥇', '🥈', '🥉']

export default function RankingTable({ entries, currentUserId }: RankingTableProps) {
  const { t } = useTranslation()
  if (entries.length === 0) {
    return (
      <div className="card text-center py-10">
        <Trophy size={36} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">{t('rankings.noPlayers')}</p>
        <p className="text-slate-600 text-sm mt-1">{t('rankings.noPlayersHint')}</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 w-12">#</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">{t('rankings.colPlayer')}</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">{t('rankings.colPoints')}</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 hidden sm:table-cell">{t('rankings.colScores')}</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">{t('rankings.colPredictions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50">
            {entries.map((entry) => {
              const isCurrentUser = entry.profile.id === currentUserId
              const medal = medals[entry.rank - 1]

              return (
                <tr
                  key={entry.profile.id}
                  className={clsx(
                    'transition-colors',
                    isCurrentUser
                      ? 'bg-brand-green/10 hover:bg-brand-green/15'
                      : 'hover:bg-surface-hover',
                  )}
                >
                  {/* Rank */}
                  <td className="px-5 py-4">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className={clsx(
                        'text-sm font-bold tabular-nums',
                        entry.rank <= 10 ? 'text-slate-300' : 'text-slate-500',
                      )}>
                        {entry.rank}
                      </span>
                    )}
                  </td>

                  {/* Player */}
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shrink-0',
                        isCurrentUser ? 'bg-brand-green' : 'bg-slate-600',
                      )}>
                        {entry.profile.username[0]}
                      </div>
                      <div>
                        <p className={clsx(
                          'font-semibold text-sm',
                          isCurrentUser ? 'text-brand-green-light' : 'text-white',
                        )}>
                          {entry.profile.username}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-brand-green font-normal">({t('rankings.you')})</span>
                          )}
                        </p>
                        {entry.profile.full_name && (
                          <p className="text-xs text-slate-500">{entry.profile.full_name}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Points */}
                  <td className="px-3 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={clsx(
                        'font-black text-lg tabular-nums',
                        entry.rank === 1 ? 'text-brand-gold' :
                        entry.rank === 2 ? 'text-slate-300' :
                        entry.rank === 3 ? 'text-amber-700' :
                        'text-white',
                      )}>
                        {entry.profile.total_points}
                      </span>
                      <span className="text-xs text-slate-500">pts</span>
                    </div>
                  </td>

                  {/* Exact scores */}
                  <td className="px-3 py-4 text-right hidden sm:table-cell">
                    <span className="text-brand-gold font-semibold text-sm">
                      🎯 {entry.exact_scores}
                    </span>
                  </td>

                  {/* Total predictions */}
                  <td className="px-5 py-4 text-right hidden sm:table-cell">
                    <span className="text-slate-400 text-sm tabular-nums">{entry.total_predictions}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
