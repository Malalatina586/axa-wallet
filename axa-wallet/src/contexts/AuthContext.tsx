import React, { createContext, useContext, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { supabase, User } from '../lib/supabase'
import { encryptPrivateKey } from '../lib/crypto'
import { generateUserDisplayID } from '../lib/id-generator'
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
  changePassword: (oldPassword: string, newPassword: string) => Promise<{success: boolean; error?: string}>
  changeEmail: (newEmail: string) => Promise<{success: boolean; error?: string}>
  changeMvola: (mvola: string) => Promise<{success: boolean; error?: string}>
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
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (!error && data.user) {
        const { address, privateKey } = generateBNBWallet()
        
        // 🔐 ENCRYPT private key with password before storing!
        const encryptedPrivateKey = await encryptPrivateKey(privateKey, password)
        
        // 🆔 Generate stylized user ID
        const displayID = generateUserDisplayID()
        
        await supabase.from('users').insert({
          id: data.user.id,
          display_id: displayID,
          nom,
          telephone,
          wallet_address: address,
          wallet_private_key: encryptedPrivateKey, // ✅ Now encrypted!
          balance_axe: 0,
          balance_ariary: 0,
          balance_usdt: 0,
          axe_staked: 0,
        })
      }
      return { error }
    } catch (err) {
      console.error('❌ SignUp error:', err)
      return { error: err }
    }
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

  async function changePassword(oldPassword: string, newPassword: string) {
    try {
      if (!session?.user.email) return { success: false, error: 'Email not found' }
      
      // First verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: oldPassword,
      })
      
      if (signInError) return { success: false, error: 'Mot de passe actuel incorrect' }
      
      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { success: false, error: error.message }
      
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async function changeEmail(newEmail: string) {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) return { success: false, error: error.message }
      
      // Email change requires confirmation, so we just update the database
      if (user) {
        await supabase.from('users').update({ email: newEmail }).eq('id', user.id)
        await refreshUser()
      }
      
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async function changeMvola(mvola: string) {
    try {
      if (!user) return { success: false, error: 'User not found' }
      
      const { error } = await supabase.from('users').update({ mvola }).eq('id', user.id)
      if (error) throw error
      
      await refreshUser()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, refreshUser, changePassword, changeEmail, changeMvola }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
