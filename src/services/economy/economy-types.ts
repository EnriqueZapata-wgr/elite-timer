/**
 * Tipos compartidos de la economía de ATP.
 *
 * PREMIUM (16-ago-2026): se fueron los tipos de Protones (H+). No se borran
 * columnas ni tablas: `proton_balance`, `proton_transactions` y las columnas
 * `reward_protons` / `entry_cost_protons` / `prize_protons` siguen en la base
 * con el historial de cada persona. Lo que se quita es la puerta de entrada
 * desde el cliente, para que nadie vuelva a pintarlas por accidente.
 *
 * Los ELECTRONES (E-) se quedan enteros: son logros y avance, no moneda.
 */

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

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id?: string | null;
  referral_code: string;
  status: 'pending' | 'signed_up' | 'paid' | 'rewarded' | 'cancelled';
  created_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  category: 'habits' | 'fitness' | 'mind' | 'labs' | 'community';
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
