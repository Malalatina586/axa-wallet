import React, { createContext, useContext, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { supabase, User } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'

// Générer un wallet BNB Chain (EVM-compatible)
function generateBNBWallet() {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  }
}

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, nom: string, telephone: string) => Promise<{error: any}>
  signIn: (email: string, password: string) => Promise<{error: any}>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUser(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUser(session.user.id)
      else { setUser(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUser(id: string) {
    const { data } = await supabase.from('users').select('*').eq('id', id).single()
    setUser(data)
    setLoading(false)
  }

  async function signUp(email: string, password: string, nom: string, telephone: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      const { address, privateKey } = generateBNBWallet()
      await supabase.from('users').insert({
        id: data.user.id,
        nom,
        telephone,
        wallet_address: address,
        wallet_private_key: privateKey,
        balance_axe: 0,
        balance_ariary: 0,
        balance_usdt: 0,
        axe_staked: 0,
      })
    }
    return { error }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshUser() {
    if (session) await fetchUser(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
