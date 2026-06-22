/** Tipos compartidos de la Economía Protones H+. */

export interface ElectronBalance {
  user_id: string;
  current_electrons: number;
  lifetime_electrons: number;
  current_rank: number;
}

export interface ElectronTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface ProtonBalance {
  user_id: string;
  current_protons: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

export type ProtonTxType =
  | 'subscription_bonus' | 'package_purchase' | 'conversion_from_electron'
  | 'action_spent' | 'reto_entry' | 'reto_prize' | 'referral_bonus'
  | 'achievement_bonus' | 'refund';

export interface ProtonTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: ProtonTxType;
  action_key?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id?: string | null;
  referral_code: string;
  status: 'pending' | 'signed_up' | 'paid' | 'rewarded' | 'cancelled';
  reward_protons?: number | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  category: 'habits' | 'fitness' | 'mind' | 'labs' | 'community';
  entry_cost_protons: number;
  prize_protons: number;
  criteria: Record<string, unknown>;
  start_date: string;
  end_date: string;
  electron_multiplier: number;
  active: boolean;
}

export interface ChallengeParticipant {
  id: string;
  user_id: string;
  challenge_id: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  joined_at: string;
  completed_at?: string | null;
  progress?: Record<string, unknown> | null;
  prize_awarded: boolean;
}
