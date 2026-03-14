import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import SplashScreen from './components/SplashScreen'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import SendReceive from './pages/SendReceive'
import ConvertPage from './pages/Convert'
import StakingPage from './pages/Staking'
import P2PPage from './pages/P2P'
import InvestPage from './pages/Invest'
import ProfilPage from './pages/Profil'

function AppRoutes() {
  const { session, user, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0A1628'}}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!session) return <LoginPage />

  // Rediriger les admins vers le dashboard admin
  if (user?.role === 'admin') {
    window.location.href = '/admin/index.html'
    return null
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/envoyer" element={<SendReceive initialTab="retrait" />} />
        <Route path="/recevoir" element={<SendReceive initialTab="depot" />} />
        <Route path="/convert" element={<ConvertPage />} />
        <Route path="/staking" element={<StakingPage />} />
        <Route path="/p2p" element={<P2PPage />} />
        <Route path="/invest" element={<InvestPage />} />
        <Route path="/profil" element={<ProfilPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WalletProvider>
          <AppRoutes />
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
