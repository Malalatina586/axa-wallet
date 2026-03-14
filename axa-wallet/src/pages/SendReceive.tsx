import React, { useState, useEffect } from 'react'
// @ts-ignore
import { QRCodeSVG as QRCode } from 'qrcode.react'
import { useWallet, formatAriary, formatNumber, RATES, NETWORK_CONFIG, preciseDecimal } from '../contexts/WalletContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { ArrowUpRight, ArrowDownLeft, Copy, CheckCircle, Clock, AlertCircle, QrCode, Globe, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SendReceive({ initialTab }: { initialTab?: 'depot' | 'retrait' }) {
  const { wallet, submitDepot, submitRetrait, refreshWallet } = useWallet()
  const { dark } = useTheme()
  const [tab, setTab] = useState<'depot' | 'retrait'>(initialTab || 'depot')
  const [devise, setDevise] = useState<'axe' | 'ariary' | 'usdt'>('ariary')
  const [montant, setMontant] = useState('')
  const [mvola, setMvola] = useState('')
  const [axe, setAxe] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [walletAdminAXE, setWalletAdminAXE] = useState('')
  const [walletAdminUSDT, setWalletAdminUSDT] = useState('')

  const MVOLA_ADMIN = '034 00 000 00' // remplacez par votre numéro Mvola

  useEffect(() => {
    async function loadAdminWallets() {
      try {
        const { data, error } = await supabase.from('config').select('wallet_admin_axe, wallet_admin_usdt').eq('id', 1).single()
        if (!error && data) {
          setWalletAdminAXE(data.wallet_admin_axe || '')
          setWalletAdminUSDT(data.wallet_admin_usdt || '')
        }
      } catch (err) {
        console.error('Erreur chargement wallets admin:', err)
      }
    }
    loadAdminWallets()
  }, [])

  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0A1628] border-[#2A3A5A] text-white placeholder-[#4a6080]' : 'bg-gray-50 border-gray-200 text-gray-900'

  // Calculs pour DÉPÔT
  const fraisDepot = montant ? Math.round(parseFloat(montant) * 0.02) : 0
  const montantNetDepot = montant ? parseFloat(montant) - fraisDepot : 0
  const axeEstime = devise === 'axe'
    ? preciseDecimal(montantNetDepot, 8)
    : devise === 'ariary' 
      ? preciseDecimal(montantNetDepot / RATES.AXE_ARIARY, 8)
      : preciseDecimal(montantNetDepot * RATES.AXE_USDT, 8)

  // Calculs pour RETRAIT
  const fraisRetrait = axe ? Math.round(parseFloat(axe) * 0.03) : 0
  const montantNetRetrait = axe ? parseFloat(axe) - fraisRetrait : 0
  const ariaryEstime = devise === 'axe'
    ? preciseDecimal(montantNetRetrait, 8)
    : devise === 'ariary' 
      ? Math.round(preciseDecimal(montantNetRetrait * RATES.AXE_ARIARY, 8))
      : Math.round(preciseDecimal(montantNetRetrait * RATES.AXE_USDT * RATES.USDT_ARIARY, 8))

  async function handleDepot() {
    if (!montant || !mvola) { setError('Remplissez tous les champs'); return }
    const amt = parseFloat(montant)
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide'); return }
    const min = devise === 'axe' ? 1 : devise === 'ariary' ? 5000 : 1
    if (amt < min) { 
      const msg = devise === 'axe' ? 'Minimum 1 AXE' : devise === 'ariary' ? 'Minimum Ar 5,000' : 'Minimum $1 USDT'
      setError(msg)
      return 
    }
    setLoading(true); setError('')
    const { error: err } = await submitDepot(parseFloat(montant), mvola)
    if (err) setError('Erreur : ' + err.message)
    else {
      setSuccess('✅ Demande de dépôt envoyée ! L\'admin va créditer vos AXE.')
      setMontant(''); setMvola('')
      await refreshWallet()
    }
    setLoading(false)
  }

  async function handleRetrait() {
    if (!axe || !mvola) { setError('Remplissez tous les champs'); return }
    const amt = parseFloat(axe)
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide'); return }
    if (amt > wallet.balance_axe) { setError('Solde AXE insuffisant'); return }
    if (amt < 10) { setError('Minimum 10 AXE'); return }
    setLoading(true); setError('')
    const { error: err } = await submitRetrait(parseFloat(axe), mvola)
    if (err) setError('Erreur : ' + err.message)
    else {
      setSuccess('✅ Demande de retrait envoyée ! L\'admin va envoyer le Mvola.')
      setAxe(''); setMvola('')
      await refreshWallet()
    }
    setLoading(false)
  }

  function copyMvola() {
    navigator.clipboard.writeText(MVOLA_ADMIN)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyWalletAddress() {
    navigator.clipboard.writeText(wallet.wallet_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold mb-1">Dépôt & Retrait</h1>
        <p className={`text-xs ${sub} mb-5`}>Choisissez la devise et l'action</p>

        {/* Info BSC */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3 mb-5 flex gap-2">
          <Info size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-cyan-400">Réseau: {NETWORK_CONFIG.name}</p>
            <p className={`text-xs ${sub}`}>Seuls <strong>AXE</strong> et <strong>USDT</strong> sont supportés sur BSC</p>
          </div>
        </div>

        {/* Sélecteur de devise */}
        <div className={`flex rounded-2xl overflow-hidden border mb-5 gap-2 ${card}`}>
          <button onClick={() => setDevise('axe')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${devise === 'axe' ? 'bg-blue-500 text-white' : sub}`}>
            🪙 AXE
          </button>
          <button onClick={() => setDevise('ariary')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${devise === 'ariary' ? 'bg-blue-500 text-white' : sub}`}>
            💰 Ariary
          </button>
          <button onClick={() => setDevise('usdt')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${devise === 'usdt' ? 'bg-blue-500 text-white' : sub}`}>
            💵 USDT
          </button>
        </div>

        <div className="space-y-6">
          {tab === 'depot' ? (
            // DÉPÔT
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><ArrowDownLeft size={18} className="text-emerald-500" /> Dépôt</h2>
              
              {/* Instructions */}
              <div className={`rounded-2xl p-4 border mb-3 ${card}`}>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" /> Comment déposer
                </p>
                <ol className={`text-xs ${sub} space-y-1.5 list-decimal list-inside`}>
                  <li>Envoyez l'argent via Mvola au numéro ci-dessous</li>
                  <li>Remplissez le formulaire avec le montant et votre numéro</li>
                  <li>L'admin créditera vos AXE sous 1-24h</li>
                </ol>
                <div className={`mt-3 flex items-center justify-between p-3 rounded-xl ${dark ? 'bg-[#0A1628]' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`text-[10px] ${sub}`}>Numéro Mvola Admin</p>
                    <p className="text-sm font-bold text-emerald-400">{MVOLA_ADMIN}</p>
                  </div>
                  <button onClick={copyMvola} className="flex items-center gap-1 text-xs text-[#3B82F6]">
                    {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className={`rounded-2xl p-4 border space-y-3 ${card}`}>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Montant en {devise === 'axe' ? 'AXE' : devise === 'ariary' ? 'Ariary' : 'USDT'}</label>
                  <input value={montant} onChange={e => setMontant(e.target.value)} type="number"
                    placeholder={devise === 'axe' ? 'Ex: 100 AXE' : devise === 'ariary' ? 'Ex: 100000' : 'Ex: 50'} className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3b82f6] ${input}`} />
                  {montant && parseFloat(montant) >= (devise === 'axe' ? 1 : devise === 'ariary' ? 5000 : 1) && (
                    <p className="text-emerald-400 text-xs mt-1">≈ {devise === 'axe' ? montantNetDepot + ' AXE' : axeEstime + ' AXE'} (frais 2%: {devise === 'axe' ? fraisDepot + ' AXE' : devise === 'ariary' ? formatAriary(fraisDepot) : '$' + fraisDepot.toFixed(2)})</p>
                  )}
                </div>

                {/* Affichage dépend de la devise */}
                {devise === 'ariary' ? (
                  <div>
                    <label className={`text-xs ${sub} mb-1 block`}>Votre numéro Mvola</label>
                    <input value={mvola} onChange={e => setMvola(e.target.value)} type="tel"
                      placeholder="034 XX XXX XX" className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3b82f6] ${input}`} />
                  </div>
                ) : (
                  <div>
                    <div className={`rounded-xl p-3 ${dark ? 'bg-[#0A1628]' : 'bg-blue-50'}`}>
                      <p className={`text-xs ${sub} mb-2`}>Envoyez à cette adresse</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-mono text-blue-400 break-all">
                          {devise === 'axe' ? walletAdminAXE : walletAdminUSDT}
                        </p>
                        <button onClick={() => {
                          navigator.clipboard.writeText(devise === 'axe' ? walletAdminAXE : walletAdminUSDT)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }} className="text-[#3B82F6] hover:text-emerald-400 flex-shrink-0">
                          {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 rounded-xl px-3 py-2">{success}</p>}
                <button onClick={handleDepot} disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-500 active:scale-95 transition-all">
                  {loading ? '⏳ Envoi...' : '✅ Soumettre la demande'}
                </button>
              </div>

              {/* ADRESSE DE RÉCEPTION */}
              <div className="mt-6">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><QrCode size={18} className="text-blue-500" /> Recevoir directement</h2>
                
                <div className={`rounded-2xl p-4 border space-y-3 ${card}`}>
                  <p className={`text-xs ${sub}`}>Partagez votre adresse unique pour recevoir <strong>AXE</strong> ou <strong>USDT</strong> sur {NETWORK_CONFIG.name}</p>
                  
                  <div className="flex justify-center py-4">
                    <QRCode value={wallet.wallet_address} size={200} level="H" includeMargin={true} />
                  </div>
                  
                  <div className={`rounded-xl p-3 ${dark ? 'bg-[#0A1628]' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${sub} mb-2`}>Votre adresse de portefeuille BSC</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-mono text-blue-400 break-all">{wallet.wallet_address}</p>
                      <button onClick={copyWalletAddress} className="text-[#3B82F6] hover:text-emerald-400 flex-shrink-0">
                        {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // RETRAIT
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><ArrowUpRight size={18} className="text-red-500" /> Retrait</h2>
              
              {/* Solde */}
              <div className={`rounded-2xl p-4 border mb-3 ${card}`}>
                <p className={`text-xs ${sub}`}>Solde disponible</p>
                <p className="text-xl font-bold text-amber-400">{formatNumber(wallet.balance_axe)} AXE</p>
                <p className={`text-xs ${sub}`}>≈ {formatAriary(wallet.balance_axe * RATES.AXE_ARIARY)}</p>
              </div>

              {/* Instructions */}
              <div className={`rounded-2xl p-4 border mb-3 ${card}`}>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-400" /> Comment retirer
                </p>
                <ol className={`text-xs ${sub} space-y-1.5 list-decimal list-inside`}>
                  <li>Entrez le montant AXE à retirer</li>
                  <li>Indiquez votre numéro Mvola ou adresse</li>
                  <li>L'admin traitera sous 1-24h</li>
                </ol>
              </div>

              {/* Form */}
              <div className={`rounded-2xl p-4 border space-y-3 ${card}`}>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Montant en AXE à retirer</label>
                  <input value={axe} onChange={e => setAxe(e.target.value)} type="number"
                    placeholder="Ex: 100" className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3b82f6] ${input}`} />
                  {axe && parseFloat(axe) >= 10 && (
                    <p className="text-red-400 text-xs mt-1">≈ {devise === 'axe' ? ariaryEstime + ' AXE' : devise === 'ariary' ? formatAriary(ariaryEstime) : '$' + ariaryEstime.toFixed(2)} {devise === 'axe' ? 'AXE' : devise === 'ariary' ? 'Ariary' : 'USDT'} (frais 3%: {devise === 'axe' ? fraisRetrait + ' AXE' : devise === 'ariary' ? formatAriary(fraisRetrait) : '$' + fraisRetrait.toFixed(2)})</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>{devise === 'axe' ? 'Adresse AXE' : devise === 'usdt' ? 'Adresse USDT' : 'Votre numéro Mvola'}</label>
                  <input value={mvola} onChange={e => setMvola(e.target.value)} type="tel"
                    placeholder={devise === 'axe' ? '0x...' : devise === 'usdt' ? '0x...' : '034 XX XXX XX'} className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3b82f6] ${input}`} />
                </div>
                {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 rounded-xl px-3 py-2">{success}</p>}
                <button onClick={handleRetrait} disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-red-500 active:scale-95 transition-all">
                  {loading ? '⏳ Envoi...' : '📤 Soumettre le retrait'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
