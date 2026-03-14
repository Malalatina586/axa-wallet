import React, { useState } from 'react'
import { useWallet, formatAriary, formatNumber, RATES, NETWORK_CONFIG } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { Banknote, Zap, Info } from 'lucide-react'

export default function P2PPage() {
  const { wallet, sendP2PAriary, sendP2PAXE, refreshWallet } = useWallet()
  const { dark } = useTheme()

  // P2P Ariary
  const [ariaryRecipient, setAriaryRecipient] = useState('')
  const [ariaryAmount, setAriaryAmount] = useState('')

  // P2P AXE/USDT
  const [axeRecipient, setAxeRecipient] = useState('')
  const [axeAmount, setAxeAmount] = useState('')
  const [axeDevise, setAxeDevise] = useState<'axe' | 'usdt'>('axe')

  // UI state
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'ariary' | 'axe'>('ariary')

  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0A1628] border-[#2A3A5A] text-white placeholder-[#4a6080]' : 'bg-gray-50 border-gray-200 text-gray-900'

  async function handleP2PAriary() {
    if (!ariaryRecipient.trim() || !ariaryAmount) {
      setError('Remplissez tous les champs')
      return
    }
    if (parseFloat(ariaryAmount) > wallet.balance_ariary) {
      setError('Solde insuffisant')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await sendP2PAriary(ariaryRecipient, parseFloat(ariaryAmount))
    if (err) setError(err)
    else {
      setSuccess('✅ Ariary envoyé avec succès!')
      setAriaryRecipient('')
      setAriaryAmount('')
      await refreshWallet()
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  async function handleP2PAXE() {
    if (!axeRecipient.trim() || !axeAmount) {
      setError('Remplissez tous les champs')
      return
    }
    if (parseFloat(axeAmount) > wallet.balance_axe) {
      setError('Solde insuffisant')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await sendP2PAXE(axeRecipient, parseFloat(axeAmount))
    if (err) setError(err)
    else {
      setSuccess(`✅ ${axeDevise.toUpperCase()} envoyé via blockchain!`)
      setAxeRecipient('')
      setAxeAmount('')
      await refreshWallet()
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold mb-1">Transfert P2P</h1>
        <p className={`text-xs ${sub} mb-5`}>Envoyez de l'argent à un autre utilisateur</p>

        {/* Info BSC */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3 mb-5 flex gap-2">
          <Info size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-purple-400">P2P sur {NETWORK_CONFIG.name}</p>
            <p className={`text-xs ${sub}`}>Paiements atomiques avec vérification blockchain pour <strong>AXE</strong></p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex rounded-2xl overflow-hidden border mb-6 gap-2 ${card}`}>
          <button onClick={() => setActiveTab('ariary')}
            className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ariary' ? 'bg-emerald-500 text-white' : sub
            }`}>
            <Banknote size={16} /> Ariary
          </button>
          <button onClick={() => setActiveTab('axe')}
            className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'axe' ? 'bg-blue-500 text-white' : sub
            }`}>
            <Zap size={16} /> AXE/USDT
          </button>
        </div>

        {/* P2P Ariary */}
        {activeTab === 'ariary' && (
          <div className={`rounded-2xl p-4 border space-y-4 ${card}`}>
            <div>
              <p className={`text-xs ${sub} mb-2`}>Solde Ariary</p>
              <p className="text-lg font-bold text-emerald-400">{formatAriary(wallet.balance_ariary)}</p>
            </div>
            <div>
              <label className={`text-xs ${sub} mb-1 block`}>UID du destinataire</label>
              <input value={ariaryRecipient} onChange={e => setAriaryRecipient(e.target.value)} type="text"
                placeholder="Ex: user-123-abc..." className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 ${input}`} />
            </div>
            <div>
              <label className={`text-xs ${sub} mb-1 block`}>Montant Ariary</label>
              <input value={ariaryAmount} onChange={e => setAriaryAmount(e.target.value)} type="number"
                placeholder="Ex: 10000" className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 ${input}`} />
            </div>
            {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
            {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 rounded-xl px-3 py-2">{success}</p>}
            <button onClick={handleP2PAriary} disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-500 active:scale-95 transition-all">
              {loading ? '⏳ Envoi...' : '💸 Envoyer Ariary'}
            </button>
          </div>
        )}

        {/* P2P AXE/USDT */}
        {activeTab === 'axe' && (
          <div className={`rounded-2xl p-4 border space-y-4 ${card}`}>
            <div>
              <p className={`text-xs ${sub} mb-2`}>Solde AXE</p>
              <p className="text-lg font-bold text-blue-400">{formatNumber(wallet.balance_axe)} AXE</p>
            </div>

            <div className={`flex rounded-xl overflow-hidden border gap-1 ${card}`}>
              <button onClick={() => setAxeDevise('axe')}
                className={`flex-1 py-2 text-xs font-bold ${axeDevise === 'axe' ? 'bg-blue-500 text-white' : sub}`}>
                🪙 AXE
              </button>
              <button onClick={() => setAxeDevise('usdt')}
                className={`flex-1 py-2 text-xs font-bold ${axeDevise === 'usdt' ? 'bg-blue-500 text-white' : sub}`}>
                💵 USDT
              </button>
            </div>

            <div>
              <label className={`text-xs ${sub} mb-1 block`}>UID du destinataire</label>
              <input value={axeRecipient} onChange={e => setAxeRecipient(e.target.value)} type="text"
                placeholder="Ex: user-123-abc..." className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 ${input}`} />
            </div>
            <div>
              <label className={`text-xs ${sub} mb-1 block`}>Montant {axeDevise === 'axe' ? 'AXE' : 'USDT'}</label>
              <input value={axeAmount} onChange={e => setAxeAmount(e.target.value)} type="number"
                placeholder={axeDevise === 'axe' ? 'Ex: 100' : 'Ex: 5'} className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 ${input}`} />
              {axeAmount && (
                <p className="text-blue-400 text-xs mt-1">
                  ≈ {axeDevise === 'axe' ? (parseFloat(axeAmount) * RATES.AXE_USDT).toFixed(2) + ' USDT' : (parseFloat(axeAmount) / RATES.AXE_USDT).toFixed(2) + ' AXE'}
                </p>
              )}
            </div>
            <p className={`text-xs ${sub}`}>💡 Transaction via BNB Chain - frais de gas appliqués</p>
            {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
            {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 rounded-xl px-3 py-2">{success}</p>}
            <button onClick={handleP2PAXE} disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-blue-500 active:scale-95 transition-all">
              {loading ? '⏳ Envoi...' : `💸 Envoyer ${axeDevise.toUpperCase()}`}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
