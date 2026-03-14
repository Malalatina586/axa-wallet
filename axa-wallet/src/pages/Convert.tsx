import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, formatNumber, RATES, preciseDecimal } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { ArrowLeft, ArrowUpDown, Check } from 'lucide-react'

const pairs = [
  { from: 'AXE', to: 'Ariary', rate: RATES.AXE_ARIARY, fromKey: 'balance_axe', toKey: 'balance_ariary' },
  { from: 'AXE', to: 'USDT', rate: RATES.AXE_USDT, fromKey: 'balance_axe', toKey: 'balance_usdt' },
  { from: 'USDT', to: 'AXE', rate: 1 / RATES.AXE_USDT, fromKey: 'balance_usdt', toKey: 'balance_axe' },
  { from: 'Ariary', to: 'AXE', rate: 1 / RATES.AXE_ARIARY, fromKey: 'balance_ariary', toKey: 'balance_axe' },
]

export default function ConvertPage() {
  const { wallet, addTransaction, updateBalance } = useWallet()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [pairIdx, setPairIdx] = useState(0)
  const [amount, setAmount] = useState('')
  const [success, setSuccess] = useState(false)

  const pair = pairs[pairIdx]
  const received = preciseDecimal(parseFloat(amount || '0') * pair.rate, 8)
  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0A1628] border-[#2A3A5A] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'

  const handleConvert = () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return
    const fromBal = wallet[pair.fromKey as keyof typeof wallet] as number
    if (amt > fromBal) return
    updateBalance(pair.fromKey as any, fromBal - amt)
    const toBal = wallet[pair.toKey as keyof typeof wallet] as number
    updateBalance(pair.toKey as any, toBal + received)
    addTransaction({ type: 'convert', amount: amt, currency: pair.from, status: 'completed' })
    setSuccess(true)
    setTimeout(() => navigate('/'), 2000)
  }

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className={`w-9 h-9 rounded-full flex items-center justify-center border ${card}`}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold">Convertir</h1>
        </div>

        {success ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={36} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Conversion réussie !</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pair selector */}
            <div className={`rounded-2xl p-4 border ${card}`}>
              <p className={`text-xs ${sub} mb-3`}>Paire de conversion</p>
              <div className="grid grid-cols-2 gap-2">
                {pairs.map((p, i) => (
                  <button key={i} onClick={() => { setPairIdx(i); setAmount('') }}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${pairIdx === i ? 'bg-[#3B82F6] text-white' : dark ? 'bg-[#0A1628] text-[#94A3B8]' : 'bg-gray-100 text-gray-500'}`}>
                    {p.from} → {p.to}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div className={`rounded-2xl p-4 border ${card}`}>
              <div className="flex justify-between mb-2">
                <p className={`text-xs ${sub}`}>Montant ({pair.from})</p>
                <p className={`text-xs ${sub}`}>Solde: {formatNumber(wallet[pair.fromKey as keyof typeof wallet] as number)}</p>
              </div>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00"
                className={`w-full rounded-xl px-3 py-2.5 text-sm border outline-none ${input}`} />
            </div>

            {/* Conversion preview */}
            <div className={`rounded-2xl p-4 border ${card} flex items-center justify-between`}>
              <div>
                <p className={`text-xs ${sub} mb-1`}>Vous recevrez</p>
                <p className="text-xl font-bold text-[#3B82F6]">{formatNumber(received)} {pair.to}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-[#0A1628]' : 'bg-gray-100'}`}>
                <ArrowUpDown size={18} className="text-[#3B82F6]" />
              </div>
            </div>

            <div className={`rounded-2xl p-3 border ${card}`}>
              <p className={`text-xs ${sub} text-center`}>Taux: 1 {pair.from} = {formatNumber(pair.rate)} {pair.to}</p>
            </div>

            <button onClick={handleConvert}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <ArrowUpDown size={18} />
              Convertir
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
