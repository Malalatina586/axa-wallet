import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import logoAxeWallet from '../assets/logo-axe-wallet.png'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError('Email ou mot de passe incorrect')
    } else {
      if (!prenom || !nom || !telephone || !email || !password) {
        setError('Veuillez remplir tous les champs')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Mot de passe minimum 6 caractères')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, `${prenom} ${nom}`, telephone)
      if (error) setError(error.message)
      else setSuccess('✅ Compte créé ! Vous pouvez vous connecter.')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError('Erreur Google : ' + error.message); setGoogleLoading(false) }
  }

  const inputClass = "w-full bg-[#070d1a] border border-[#1a2d4a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#3b82f6] transition-colors placeholder-[#4a6080]"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0d2040 100%)' }}>

      {/* Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6, #22c55e)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <img src={logoAxeWallet} alt="AXE Wallet" className="h-12 object-contain mb-2" />
          <p className="text-[#6b8aad] text-xs tracking-widest font-mono">VOTRE PORTEFEUILLE AXE</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d1829] border border-[#1a2d4a] rounded-2xl p-6 shadow-2xl">

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-[#1a2d4a] mb-5">
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-sm font-bold transition-all ${mode === 'login' ? 'bg-[#3b82f6] text-white' : 'text-[#6b8aad] hover:text-white'}`}>
              🔓 Connexion
            </button>
            <button onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-sm font-bold transition-all ${mode === 'register' ? 'bg-[#3b82f6] text-white' : 'text-[#6b8aad] hover:text-white'}`}>
              🚀 Inscription
            </button>
          </div>

          {/* Google Button */}
          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#1a2d4a] bg-white/5 hover:bg-white/10 transition-all mb-4 text-sm font-semibold text-white">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#1a2d4a]"/>
            <span className="text-[#4a6080] text-xs">ou</span>
            <div className="flex-1 h-px bg-[#1a2d4a]"/>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            {mode === 'register' && (
              <>
                <div className="flex gap-2">
                  <input value={prenom} onChange={e => setPrenom(e.target.value)}
                    placeholder="Prénom" className={inputClass} />
                  <input value={nom} onChange={e => setNom(e.target.value)}
                    placeholder="Nom" className={inputClass} />
                </div>
                <input value={telephone} onChange={e => setTelephone(e.target.value)}
                  placeholder="Numéro Mvola (034...)" type="tel" className={inputClass} />
              </>
            )}
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="Email" className={inputClass} />
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe (min. 6 caractères)" className={inputClass + ' pr-12'} />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a6080] text-xs">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
              <p className="text-green-400 text-xs text-center">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-black transition-all active:scale-95"
            style={{ background: loading ? '#333' : 'linear-gradient(135deg, #f0b429, #e07b00)' }}>
            {loading ? '⏳ Chargement...' : mode === 'login' ? '🔓 Se connecter' : '🚀 Créer mon compte'}
          </button>
        </div>

        <p className="text-center text-[#4a6080] text-xs mt-4">
          AXA Wallet — Sécurisé & Fiable 🔒
        </p>
      </div>
    </div>
  )
}
