// Tipos base do banco de dados
export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  total_points: number
  is_admin: boolean
  is_approved: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  flag_emoji: string
  group_name: string | null
}

export type MatchStatus = 'upcoming' | 'live' | 'finished'

export interface Match {
  id: number
  home_team_id: number
  away_team_id: number
  match_date: string
  venue: string | null
  round: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  updated_at: string | null
  created_at: string
  // joins
  home_team?: Team
  away_team?: Team
}

export interface Prediction {
  id: number
  user_id: string
  match_id: number
  home_score: number
  away_score: number
  points_earned: number
  created_at: string
  updated_at: string
  // joins
  match?: Match
  profile?: Profile
}

// Tipo combinado para exibição de partida com palpite do usuário
export interface MatchWithPrediction extends Match {
  user_prediction?: Prediction | null
}

// Tipo para ranking
export interface RankingEntry {
  rank: number
  profile: Profile
  total_predictions: number
  exact_scores: number
}
