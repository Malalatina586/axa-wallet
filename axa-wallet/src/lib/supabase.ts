import { createClient } from '@supabase/supabase-js'

// Vite env variables type
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types
export type User = {
  id: string
  display_id?: string  // Stylized ID (e.g., "1548AXE5789")
  email?: string
  nom: string
  telephone: string
  role?: 'admin' | 'user'
  balance_axe: number
  balance_ariary: number
  balance_usdt: number
  axe_staked: number
  wallet_address?: string
  wallet_private_key?: string  // ⚠️ This will be encrypted in the database
  created_at: string
}

export type Depot = {
  id: string
  user_id: string
  montant_ariary: number
  axe_credite: number
  frais: number
  mvola: string
  statut: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type Retrait = {
  id: string
  user_id: string
  axe_envoye: number
  montant_ariary: number
  frais: number
  mvola: string
  statut: 'pending' | 'completed' | 'rejected'
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  type: 'depot' | 'retrait' | 'conversion' | 'p2p' | 'staking'
  montant: number
  frais: number
  statut: string
  created_at: string
}

export type Taux = {
  id: number
  axe_ariary: number
  axe_usdt: number
  usdt_ariary: number
  frais_depot: number
  frais_retrait: number
  frais_p2p: number
  frais_conversion: number
  mvola_admin: string
}
