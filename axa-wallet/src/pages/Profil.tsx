import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, formatNumber } from '../contexts/WalletContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { User, Sun, Moon, Shield, Bell, ChevronRight, Copy, Check, LogOut, TrendingUp } from 'lucide-react'

export default function ProfilPage() {
  const { wallet } = useWallet()
  const { dark, toggle } = useTheme()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'

  const copy = () => {
    navigator.clipboard.writeText(wallet.display_id || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const menuItems = [
    { icon: Bell, label: 'Notifications', action: () => {} },
    { icon: Shield, label: 'Sécurité', action: () => navigate('/securite') },
    { icon: TrendingUp, label: 'Investissements', action: () => navigate('/invest') },
    { icon: dark ? Sun : Moon, label: dark ? 'Mode Clair' : 'Mode Sombre', action: toggle },
  ]

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-xl font-bold mb-6">Mon Profil</h1>

        {/* Avatar */}
        <div className={`rounded-3xl p-6 border mb-5 text-center ${card}`}>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-lg font-bold mb-1">{wallet.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <p className={`text-xs font-mono ${sub}`}>{wallet.display_id || 'ID...'}</p>
            <button onClick={copy}>
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className={sub} />}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'AXE Total', val: formatNumber(wallet.balance_axe + wallet.staked_axe + wallet.invested_axe) },
            { label: 'Stakés', val: formatNumber(wallet.staked_axe) },
            { label: 'Investis', val: formatNumber(wallet.invested_axe) },
          ].map(({ label, val }) => (
            <div key={label} className={`rounded-2xl p-3 border text-center ${card}`}>
              <p className={`text-[10px] ${sub} mb-1`}>{label}</p>
              <p className="text-sm font-bold">{val}</p>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          {menuItems.map(({ icon: Icon, label, action }, i) => (
            <button key={label} onClick={action}
              className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${dark ? 'hover:bg-[#0A1628]/50' : 'hover:bg-gray-50'} ${i < menuItems.length - 1 ? `border-b ${dark ? 'border-[#2A3A5A]/30' : 'border-gray-100'}` : ''}`}>
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-[#3B82F6]" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <ChevronRight size={16} className={sub} />
            </button>
          ))}
        </div>

        <button onClick={signOut} className="w-full mt-4 py-4 rounded-2xl border border-red-500/30 text-red-400 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </AppLayout>
  )
}
