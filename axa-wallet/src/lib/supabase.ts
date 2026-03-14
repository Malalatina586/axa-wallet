import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bozaertrmldtacnkfvan.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvemFlcnRybWxkdGFjbmtmdmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzkwNDQsImV4cCI6MjA4ODk1NTA0NH0.J_jkVDwzphVVV-EwuT5hpB-_lzMbBGXO-alJhIAOKog'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types
export type User = {
  id: string
  email?: string
  nom: string
  telephone: string
  role?: 'admin' | 'user'
  balance_axe: number
  balance_ariary: number
  balance_usdt: number
  axe_staked: number
  wallet_address?: string
  wallet_private_key?: string
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
