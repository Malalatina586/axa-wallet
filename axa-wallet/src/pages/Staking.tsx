import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, formatNumber } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { ArrowLeft, Layers, TrendingUp, Lock, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function StakingPage() {
  const { wallet, addTransaction, updateBalance } = useWallet()
  const { user } = useAuth()
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
  const [accumulatedRewards, setAccumulatedRewards] = useState(0)
  const [hourlyReward, setHourlyReward] = useState(0)
  const [dailyReward, setDailyReward] = useState(0)

  // Load staking config
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

  // Calculate rewards in real-time (every second)
  useEffect(() => {
    if (!user || wallet.staked_axe === 0) {
      setAccumulatedRewards(0)
      setHourlyReward(0)
      setDailyReward(0)
      return
    }

    const calculateRewards = async () => {
      try {
        // Get active staking positions
        const { data: positions, error } = await supabase
          .from('staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .is('ended_at', null)

        if (error || !positions || positions.length === 0) {
          setAccumulatedRewards(0)
          setHourlyReward(0)
          setDailyReward(0)
          return
        }

        // Calculate hourly reward: (staked_axe * APY / 365 / 24) / 100
        const hourly = (wallet.staked_axe * stakingConfig.apy / 365 / 24) / 100
        setHourlyReward(hourly)
        setDailyReward(hourly * 24)

        // Calculate accumulated rewards (time since first position started)
        let totalAccumulated = 0
        const now = Date.now()

        positions.forEach((pos: any) => {
          const startTime = new Date(pos.started_at).getTime()
          const hoursElapsed = (now - startTime) / (1000 * 60 * 60)
          const positionHourlyReward = (pos.amount * stakingConfig.apy / 365 / 24) / 100
          const positionAccumulated = positionHourlyReward * hoursElapsed - (pos.claimed_rewards || 0)
          totalAccumulated += Math.max(0, positionAccumulated)
        })

        setAccumulatedRewards(totalAccumulated)
      } catch (err) {
        console.error('Erreur calcul récompenses:', err)
      }
    }

    calculateRewards()

    // Update every second for real-time effect
    const interval = setInterval(calculateRewards, 1000)
    return () => clearInterval(interval)
  }, [user, wallet.staked_axe, stakingConfig.apy])

  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0A1628] border-[#2A3A5A] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'

  const handleStake = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return

    if (stakingConfig.max_amount > 0 && amt > stakingConfig.max_amount) {
      alert(`Montant maximum: ${stakingConfig.max_amount} AXE`)
      return
    }
    if (amt < stakingConfig.min_amount) {
      alert(`Montant minimum: ${stakingConfig.min_amount} AXE`)
      return
    }
    if (amt > wallet.balance_axe) {
      alert(`Solde insuffisant: ${wallet.balance_axe} AXE disponible`)
      return
    }

    try {
      // 1. Create staking position in database
      const { data, error: insertError } = await supabase
        .from('staking_positions')
        .insert([
          {
            user_id: user?.id,
            amount: amt,
            type: 'flexible',
            started_at: new Date().toISOString(),
          },
        ])
        .select()

      if (insertError) throw insertError

      // 2. Update wallet
      updateBalance('balance_axe', wallet.balance_axe - amt)
      updateBalance('staked_axe', wallet.staked_axe + amt)

      // 3. Add transaction
      addTransaction({
        type: 'stake',
        amount: amt,
        currency: 'AXE',
        status: 'completed',
        note: 'Staking flexible Ariary',
      })

      setAmount('')
      alert(`${amt} AXE stakés avec succès! 🎉\nRecompense: +${formatNumber(dailyReward)}/jour`)
    } catch (err) {
      console.error('Erreur staking:', err)
      alert('Erreur lors du staking')
    }
  }

  const handleUnstake = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return
    if (amt > wallet.staked_axe) {
      alert(`Montant max stakés: ${wallet.staked_axe} AXE`)
      return
    }

    try {
      // 1. Get staking positions to end
      const { data: positions, error: getError } = await supabase
        .from('staking_positions')
        .select('*')
        .eq('user_id', user?.id)
        .is('ended_at', null)
        .order('started_at', { ascending: true })

      if (getError) throw getError

      let remainingToUnstake = amt
      for (const pos of positions) {
        if (remainingToUnstake <= 0) break

        const unstakeAmount = Math.min(remainingToUnstake, pos.amount)

        // End this position
        const { error: updateError } = await supabase
          .from('staking_positions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', pos.id)

        if (updateError) throw updateError

        remainingToUnstake -= unstakeAmount
      }

      // 2. Update wallet
      // Add accumulated rewards + unstaked amount
      const totalBack = amt + accumulatedRewards
      updateBalance('staked_axe', wallet.staked_axe - amt)
      updateBalance('balance_axe', wallet.balance_axe + totalBack)

      // 3. Add transaction
      addTransaction({
        type: 'unstake',
        amount: amt,
        currency: 'AXE',
        status: 'completed',
        note: `Unstaking: ${amt} AXE + ${formatNumber(accumulatedRewards)} AXE rewards`,
      })

      setAmount('')
      alert(`Unstaked avec succès!\n💰 ${formatNumber(amt)} AXE\n🎁 Récompenses: ${formatNumber(accumulatedRewards)} AXE`)
    } catch (err) {
      console.error('Erreur unstaking:', err)
      alert('Erreur lors de l\'unstaking')
    }
  }

  const handleAction = () => {
    if (tab === 'stake') {
      handleStake()
    } else {
      handleUnstake()
    }
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
            { label: 'APY Flexible', val: `${stakingConfig.apy}%`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Récompense/heure', val: `${formatNumber(hourlyReward)} AXE`, icon: Layers, color: 'text-blue-400' },
            { label: 'Récompense/jour', val: `${formatNumber(dailyReward)} AXE`, icon: Gift, color: 'text-pink-400' },
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

        {/* Accumulated Rewards */}
        {wallet.staked_axe > 0 && (
          <div className={`rounded-2xl p-4 border mb-4 bg-emerald-500/10 border-emerald-500/30`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs ${sub} mb-1`}>Récompenses Accumulées</p>
                <p className="text-2xl font-bold text-emerald-400">{formatNumber(accumulatedRewards)} AXE</p>
                <p className={`text-xs ${sub} mt-1`}>S'ajoute à l'unstaking automatiquement</p>
              </div>
              <Gift size={24} className="text-emerald-400" />
            </div>
          </div>
        )}

        {/* Info Type Staking */}
        <div className={`rounded-2xl p-4 border mb-4 bg-emerald-500/10 border-emerald-500/30`}>
          <p className="text-sm font-semibold mb-2 text-emerald-400">🔓 Staking Flexible</p>
          <p className={`text-xs ${sub}`}>Retrait à tout moment sans pénalité • Récompenses au unstaking</p>
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
              Récompense annuelle estimée: <span className="text-emerald-400 font-semibold">+{formatNumber(parseFloat(amount) * stakingConfig.apy / 100)} AXE</span>
            </p>
          </div>
        )}

        <button onClick={handleAction}
          className={`w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform bg-gradient-to-r ${tab === 'stake' ? 'from-amber-500 to-amber-600' : 'from-purple-500 to-purple-600'}`}>
          <Layers size={18} />
          {tab === 'stake' ? 'Staker les AXE' : 'Unstaker les AXE'}
        </button>
      </div>
    </AppLayout>
  )
}
