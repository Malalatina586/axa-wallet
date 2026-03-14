import React from 'react'
import iconAxeWallet from '../assets/icon-256.png'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ArrowLeftRight, Layers, Users, User } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const tabs = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/convert', icon: ArrowLeftRight, label: 'Convertir' },
  { path: '/staking', icon: Layers, label: 'Staking' },
  { path: '/p2p', icon: Users, label: 'P2P' },
  { path: '/profil', icon: User, label: 'Profil' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { dark } = useTheme()

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t ${dark ? 'bg-[#0A1628] border-[#1A2A4A]' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-around px-2 py-3 max-w-md mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center gap-1 min-w-[56px]">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-[#3B82F6]' : 'bg-transparent'}`}>
                {path === '/' && active
                  ? <img src={iconAxeWallet} alt="home" className="w-6 h-6 rounded-lg" />
                  : <Icon size={20} className={active ? 'text-white' : dark ? 'text-[#94A3B8]' : 'text-gray-400'} />
                }
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#3B82F6]' : dark ? 'text-[#94A3B8]' : 'text-gray-400'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
