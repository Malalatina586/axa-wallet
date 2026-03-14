import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, formatNumber, formatAriary, RATES, preciseDecimal } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { ArrowLeft, TrendingUp, Check, Info } from 'lucide-react'

const plans = [
  { id: 1, name: 'Bronze', min: 100, apy: 15, duration: 30, color: 'from-amber-600 to-amber-700' },
  { id: 2, name: 'Silver', min: 500, apy: 22, duration: 60, color: 'from-slate-400 to-slate-500' },
  { id: 3, name: 'Gold', min: 1000, apy: 35, duration: 90, color: 'from-yellow-400 to-yellow-500' },
]

export default function InvestPage() {
  const { wallet, addTransaction, updateBalance } = useWallet()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(plans[0])
  const [amount, setAmount] = useState('')
  const [success, setSuccess] = useState(false)

  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0A1628] border-[#2A3A5A] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'

  const amt = parseFloat(amount || '0')
  const profit = preciseDecimal((amt * selected.apy * selected.duration) / 365 / 100, 8)
  const profitAriary = preciseDecimal(profit * RATES.AXE_ARIARY, 8)

  const handleInvest = () => {
    if (!amount || isNaN(amt) || amt < selected.min) return
    if (amt > wallet.balance_axe) return
    updateBalance('balance_axe', wallet.balance_axe - amt)
    updateBalance('invested_axe', wallet.invested_axe + amt)
    addTransaction({ type: 'invest', amount: amt, currency: 'AXE', status: 'completed' })
    setSuccess(true)
    setTimeout(() => navigate('/'), 2500)
  }

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className={`w-9 h-9 rounded-full flex items-center justify-center border ${card}`}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold">Investir</h1>
        </div>

        {success ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={36} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Investissement confirmé !</h2>
            <p className={sub}>Vos profits seront versés en AXE</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plans */}
            <div className={`rounded-2xl p-4 border ${card}`}>
              <p className={`text-xs ${sub} mb-3`}>Choisir un plan</p>
              <div className="space-y-2">
                {plans.map(plan => (
                  <button key={plan.id} onClick={() => { setSelected(plan); setAmount('') }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selected.id === plan.id ? 'border-[#3B82F6] bg-[#3B82F6]/10' : dark ? 'border-[#2A3A5A]/50 bg-[#0A1628]/40' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                        <TrendingUp size={18} className="text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{plan.name}</p>
                        <p className={`text-[10px] ${sub}`}>Min: {plan.min} AXE • {plan.duration} jours</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">{plan.apy}%</p>
                      <p className={`text-[10px] ${sub}`}>APY</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className={`rounded-2xl p-4 border ${card}`}>
              <div className="flex justify-between mb-2">
                <p className={`text-xs ${sub}`}>Montant à investir (AXE)</p>
                <p className={`text-xs ${sub}`}>Solde: {formatNumber(wallet.balance_axe)}</p>
              </div>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder={`Min ${selected.min} AXE`}
                className={`w-full rounded-xl px-3 py-2.5 text-sm border outline-none ${input}`} />
            </div>

            {/* Profit preview */}
            {amt >= selected.min && (
              <div className={`rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/10`}>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-emerald-400" />
                  <p className="text-xs text-emerald-400 font-semibold">Estimation des profits</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={`text-[10px] ${sub}`}>Profit en AXE</p>
                    <p className="text-base font-bold text-emerald-400">+{formatNumber(profit)} AXE</p>
                  </div>
                  <div>
                    <p className={`text-[10px] ${sub}`}>Valeur en Ariary</p>
                    <p className="text-base font-bold text-emerald-400">+{formatAriary(profitAriary)}</p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleInvest} disabled={amt < selected.min || amt > wallet.balance_axe}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              <TrendingUp size={18} />
              Investir maintenant
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
