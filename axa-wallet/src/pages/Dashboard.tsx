import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logoAxeWallet from '../assets/logo-axe-wallet.png'
import { useWallet, formatAriary, formatNumber, RATES, NETWORK_CONFIG } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import {
  Send, Download, ArrowLeftRight, Layers, TrendingUp, TrendingDown,
  ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet, Users, Bell, X, Sun, Moon, Globe, Gift
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0A1628] border border-[#2A3A5A] rounded-xl px-3 py-2">
        <p className="text-white text-xs font-semibold">${payload[0].value.toFixed(5)}</p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { wallet, transactions, priceHistory, loading, refreshWallet } = useWallet()
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [showNotif, setShowNotif] = useState(false)
  const [stakingRewards, setStakingRewards] = useState(0)
  const [stakingAPY, setStakingAPY] = useState(12)
  const [notifications, setNotifications] = useState([
    { id: '1', msg: 'Bienvenue sur AXA Wallet !', time: "Maintenant", read: false },
  ])

  // Calculate staking rewards in real-time
  useEffect(() => {
    if (!user || wallet.staked_axe === 0) {
      setStakingRewards(0)
      return
    }

    const calculateStakingRewards = async () => {
      try {
        // Get staking config
        const { data: config } = await supabase.from('staking_config').select('*').eq('id', 1).single()
        if (config) {
          setStakingAPY(config.apy || 12)
        }

        // Get active staking positions
        const { data: positions } = await supabase
          .from('staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .is('ended_at', null)

        if (!positions || positions.length === 0) {
          setStakingRewards(0)
          return
        }

        // Calculate total accumulated rewards
        let totalRewards = 0
        const now = Date.now()
        const apy = config?.apy || 12

        positions.forEach((pos: any) => {
          const startTime = new Date(pos.started_at).getTime()
          const hoursElapsed = (now - startTime) / (1000 * 60 * 60)
          const hourlyReward = (pos.amount * apy / 365 / 24) / 100
          const accumulated = hourlyReward * hoursElapsed - (pos.claimed_rewards || 0)
          totalRewards += Math.max(0, accumulated)
        })

        setStakingRewards(totalRewards)
      } catch (err) {
        console.error('Erreur calcul staking rewards:', err)
      }
    }

    calculateStakingRewards()
    const interval = setInterval(calculateStakingRewards, 1000)
    return () => clearInterval(interval)
  }, [user, wallet.staked_axe])

  const currentPrice = priceHistory[priceHistory.length - 1]?.price || 0
  const prevPrice = priceHistory[priceHistory.length - 2]?.price || 0
  const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100
  const priceUp = priceChange >= 0
  const unread = notifications.filter(n => !n.read).length
  const totalAriary = wallet.balance_axe * RATES.AXE_ARIARY + wallet.balance_usdt * RATES.USDT_ARIARY + wallet.balance_ariary

  const actions = [
    { label: 'Envoyer', icon: Send, path: '/envoyer', color: 'from-blue-500 to-blue-600' },
    { label: 'Recevoir', icon: Download, path: '/recevoir', color: 'from-emerald-500 to-emerald-600' },
    { label: 'P2P', icon: Users, path: '/p2p', color: 'from-cyan-500 to-blue-600' },
    { label: 'Convertir', icon: ArrowLeftRight, path: '/convert', color: 'from-purple-500 to-purple-600' },
    { label: 'Staking', icon: Layers, path: '/staking', color: 'from-amber-500 to-amber-600' },
  ]

  const txIcon = (type: string) => {
    const map: any = {
      send: <ArrowUpRight size={16} className="text-red-400" />,
      retrait: <ArrowUpRight size={16} className="text-red-400" />,
      p2p_send: <ArrowUpRight size={16} className="text-red-400" />,
      receive: <ArrowDownLeft size={16} className="text-emerald-400" />,
      depot: <ArrowDownLeft size={16} className="text-emerald-400" />,
      p2p_receive: <ArrowDownLeft size={16} className="text-emerald-400" />,
      convert: <RefreshCw size={16} className="text-purple-400" />,
      conversion: <RefreshCw size={16} className="text-purple-400" />,
      stake: <Layers size={16} className="text-amber-400" />,
      unstake: <Layers size={16} className="text-amber-400" />,
      invest: <TrendingUp size={16} className="text-blue-400" />,
    }
    return map[type] || <ArrowLeftRight size={16} className="text-gray-400" />
  }

  const txColor = (type: string) =>
    ['receive', 'depot', 'p2p_receive', 'unstake'].includes(type) ? 'text-emerald-400' : 'text-red-400'

  const txLabel: any = {
    send: 'Envoi', receive: 'Réception', depot: 'Dépôt',
    retrait: 'Retrait', p2p_send: 'P2P Envoi',
    p2p_receive: 'P2P Reçu', convert: 'Conversion',
    conversion: 'Conversion', stake: 'Staking',
    unstake: 'Unstaking', invest: 'Investissement',
  }

  const bg = dark ? 'bg-[#0A1628]' : 'bg-[#F0F4FF]'
  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <img src={logoAxeWallet} alt="AXE Wallet" className="h-8 object-contain" />
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-xs ${sub}`}>Bienvenue, {wallet.name} 👋</p>
              <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1 border border-yellow-500/30">
                <Globe size={10} /> {NETWORK_CONFIG.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center border ${dark ? 'bg-[#1A2A4A] border-[#2A3A5A]' : 'bg-white border-gray-200'}`}>
              {dark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-[#3B82F6]" />}
            </button>
            <button onClick={refreshWallet} className={`w-9 h-9 rounded-full flex items-center justify-center border ${dark ? 'bg-[#1A2A4A] border-[#2A3A5A]' : 'bg-white border-gray-200'}`}>
              <RefreshCw size={15} className={`text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative">
              <button onClick={() => { setShowNotif(!showNotif); setNotifications(p => p.map(n => ({ ...n, read: true }))) }}
                className={`w-9 h-9 rounded-full flex items-center justify-center border ${dark ? 'bg-[#1A2A4A] border-[#2A3A5A]' : 'bg-white border-gray-200'}`}>
                <Bell size={16} className="text-[#3B82F6]" />
                {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{unread}</span>}
              </button>
              {showNotif && (
                <div className={`absolute right-0 top-11 w-64 rounded-2xl shadow-2xl z-50 border overflow-hidden ${dark ? 'bg-[#0F1F3A] border-[#2A3A5A]' : 'bg-white border-gray-200'}`}>
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${dark ? 'border-[#2A3A5A]' : 'border-gray-100'}`}>
                    <span className="text-sm font-semibold">Notifications</span>
                    <button onClick={() => setShowNotif(false)}><X size={14} className={sub} /></button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className={`text-xs text-center py-4 ${sub}`}>Aucune notification</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 flex items-start justify-between border-b ${dark ? 'border-[#2A3A5A]/30' : 'border-gray-50'}`}>
                      <div>
                        <p className="text-xs font-medium">{n.msg}</p>
                        <p className={`text-[10px] mt-0.5 ${sub}`}>{n.time}</p>
                      </div>
                      <button onClick={() => setNotifications(p => p.filter(x => x.id !== n.id))}>
                        <X size={11} className={sub} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`bg-gradient-to-br ${dark ? 'from-[#1A2A4A] to-[#0F1F3A]' : 'from-blue-600 to-blue-800'} rounded-3xl p-6 mb-4 border ${dark ? 'border-[#2A3A5A]/50' : 'border-transparent'} shadow-xl`}>
          <p className="text-blue-200 text-xs mb-1 uppercase tracking-wider">Solde Total</p>
          {loading ? (
            <div className="flex items-center gap-2 mb-5">
              <div className="w-32 h-8 bg-white/10 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-1">{formatAriary(totalAriary)}</h2>
              <div className="flex items-center gap-2 mb-5">
                {priceUp ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
                <span className={`text-xs font-medium ${priceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceUp ? '+' : ''}{priceChange.toFixed(2)}% aujourd'hui
                </span>
                <span className="text-blue-300 text-xs">1 AXE = ${currentPrice.toFixed(5)}</span>
              </div>
            </>
          )}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'AXE', val: loading ? '...' : formatNumber(wallet.balance_axe) },
              { label: 'USDT', val: loading ? '...' : formatNumber(wallet.balance_usdt) },
              { label: 'Ariary', val: loading ? '...' : formatNumber(wallet.balance_ariary, 0) },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-3">
                <p className="text-blue-200 text-[10px] uppercase mb-1">{label}</p>
                <p className="text-white text-sm font-semibold">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Chart */}
        <div className={`rounded-2xl p-4 mb-5 border ${card}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className={`text-xs ${sub}`}>Prix AXE (30 jours)</p>
              <p className="text-sm font-bold">${currentPrice.toFixed(5)}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${priceUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {priceUp ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={priceHistory}>
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke={priceUp ? '#34D399' : '#F87171'} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {actions.map(({ label, icon: Icon, path, color }) => (
            <button key={label} onClick={() => navigate(path)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className={`text-[10px] font-medium ${sub}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Staking Rewards Card */}
        {wallet.staked_axe > 0 && (
          <div className={`rounded-2xl p-4 mb-6 border bg-emerald-500/10 border-emerald-500/30`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift size={14} className="text-emerald-400" />
                  <p className={`text-xs ${sub}`}>Récompenses Staking</p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{formatNumber(stakingRewards)} AXE</p>
                <p className={`text-xs ${sub} mt-1`}>APY {stakingAPY}% • Flexible (retrait anytime)</p>
              </div>
              <button onClick={() => navigate('/staking')} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                Gérer
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Transactions récentes</h3>
          <span className={`text-xs ${sub}`}>{transactions.length} total</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className={`rounded-2xl p-4 border ${card} animate-pulse`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10" />
                  <div className="flex-1">
                    <div className="w-24 h-3 bg-white/10 rounded mb-1" />
                    <div className="w-16 h-2 bg-white/10 rounded" />
                  </div>
                  <div className="w-16 h-3 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center border ${card}`}>
            <Wallet size={32} className={`${sub} mx-auto mb-3 opacity-50`} />
            <p className={`${sub} text-sm`}>Aucune transaction pour l'instant</p>
            <p className={`${sub} text-xs mt-1`}>Faites votre premier dépôt !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 6).map(tx => (
              <div key={tx.id} className={`rounded-2xl p-4 flex items-center justify-between border ${card}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-[#0A1628]' : 'bg-gray-100'}`}>
                    {txIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{txLabel[tx.type] || tx.type}</p>
                    <p className={`text-[10px] ${sub}`}>{new Date(tx.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${txColor(tx.type)}`}>
                    {['receive', 'depot', 'p2p_receive', 'unstake'].includes(tx.type) ? '+' : '-'}{formatNumber(tx.amount)} AXE
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
