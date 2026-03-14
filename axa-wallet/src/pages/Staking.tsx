import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, formatNumber } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { ArrowLeft, Layers, TrendingUp, Lock, Unlock } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function StakingPage() {
  const { wallet, addTransaction, updateBalance } = useWallet()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'stake' | 'unstake'>('stake')
  const [stakingConfig, setStakingConfig] = useState({
    apy: 12,
    type: 'flexible' as 'flexible' | 'fixed',
    duration_days: 30,
    bonus_percentage: 3,
    min_amount: 100,
    max_amount: 1000000,
  })

  useEffect(() => {
    async function loadStakingConfig() {
      try {
        const { data, error } = await supabase.from('staking_config').select('*').eq('id', 1).single()
        if (!error && data) {
          setStakingConfig({
            apy: data.apy || 12,
            type: data.type || 'flexible',
            duration_days: data.duration_days || 30,
            bonus_percentage: data.bonus_percentage || 3,
            min_amount: data.min_amount || 100,
            max_amount: data.max_amount || 1000000,
          })
        }
      } catch (err) {
        console.error('Erreur chargement config staking:', err)
      }
    }
    loadStakingConfig()
  }, [])
  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0A1628] border-[#2A3A5A] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'

  // Calculer l'APY selon le type et la durée
  const effectiveAPY = stakingConfig.type === 'fixed' ? stakingConfig.apy + stakingConfig.bonus_percentage : stakingConfig.apy
  const dailyReward = (wallet.staked_axe * effectiveAPY) / 365 / 100

  const handleAction = () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return
    
    // Validation min/max
    if (stakingConfig.max_amount > 0 && amt > stakingConfig.max_amount) {
      alert(`Montant maximum: ${stakingConfig.max_amount} AXE`)
      return
    }
    if (amt < stakingConfig.min_amount) {
      alert(`Montant minimum: ${stakingConfig.min_amount} AXE`)
      return
    }
    
    if (tab === 'stake') {
      if (amt > wallet.balance_axe) return
      updateBalance('balance_axe', wallet.balance_axe - amt)
      updateBalance('staked_axe', wallet.staked_axe + amt)
      addTransaction({ type: 'stake', amount: amt, currency: 'AXE', status: 'completed' })
    } else {
      if (amt > wallet.staked_axe) return
      updateBalance('staked_axe', wallet.staked_axe - amt)
      updateBalance('balance_axe', wallet.balance_axe + amt)
      addTransaction({ type: 'unstake', amount: amt, currency: 'AXE', status: 'completed' })
    }
    setAmount('')
  }

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className={`w-9 h-9 rounded-full flex items-center justify-center border ${card}`}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold">Staking AXE</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'AXE Stakés', val: formatNumber(wallet.staked_axe), icon: Lock, color: 'text-amber-400' },
            { label: 'APY', val: `${effectiveAPY}%`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Récompense/jour', val: `${formatNumber(dailyReward)} AXE`, icon: Layers, color: 'text-blue-400' },
            { label: 'Disponible', val: formatNumber(wallet.balance_axe), icon: Unlock, color: 'text-purple-400' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className={`rounded-2xl p-4 border ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <p className={`text-xs ${sub}`}>{label}</p>
              </div>
              <p className="text-base font-bold">{val}</p>
            </div>
          ))}
        </div>

        {/* Info Type Staking */}
        <div className={`rounded-2xl p-4 border mb-4 ${stakingConfig.type === 'fixed' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <p className={`text-sm font-semibold mb-2 ${stakingConfig.type === 'fixed' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stakingConfig.type === 'fixed' ? '🔒 Staking Fixe' : '🔓 Staking Flexible'}
          </p>
          <p className={`text-xs ${sub}`}>
            {stakingConfig.type === 'fixed' 
              ? `Déblocage après ${stakingConfig.duration_days} jours • Bonus: +${stakingConfig.bonus_percentage}% APY`
              : 'Retrait à tout moment sans pénalité'
            }
          </p>
        </div>

        {/* Tab */}
        <div className={`flex rounded-2xl p-1 mb-4 border ${card}`}>
          {(['stake', 'unstake'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${tab === t ? 'bg-[#3B82F6] text-white' : sub}`}>
              {t === 'stake' ? 'Staker' : 'Unstaker'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className={`rounded-2xl p-4 border mb-4 ${card}`}>
          <div className="flex justify-between mb-2">
            <p className={`text-xs ${sub}`}>Montant AXE</p>
            <p className={`text-xs ${sub}`}>Max: {formatNumber(tab === 'stake' ? wallet.balance_axe : wallet.staked_axe)}</p>
          </div>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00"
            className={`w-full rounded-xl px-3 py-2.5 text-sm border outline-none ${input}`} />
          <button onClick={() => setAmount(String(tab === 'stake' ? wallet.balance_axe : wallet.staked_axe))}
            className="text-[#3B82F6] text-xs mt-2">MAX</button>
        </div>

        {parseFloat(amount) > 0 && tab === 'stake' && (
          <div className={`rounded-2xl p-3 border mb-4 ${card}`}>
            <p className={`text-xs ${sub} text-center`}>
              Récompense annuelle estimée: <span className="text-emerald-400 font-semibold">+{formatNumber(parseFloat(amount) * effectiveAPY / 100)} AXE</span>
            </p>
          </div>
        )}

        <button onClick={handleAction}
          className={`w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform bg-gradient-to-r ${tab === 'stake' ? 'from-amber-500 to-amber-600' : 'from-purple-500 to-purple-600'}`}>
          <Layers size={18} />
          {tab === 'stake' 
            ? `Staker les AXE${stakingConfig.type === 'fixed' ? ` (${stakingConfig.duration_days}j)` : ''}` 
            : 'Unstaker les AXE'}
        </button>
      </div>
    </AppLayout>
  )
}
