import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { sendAXE, getAXEBalance } from '../lib/blockchain'

export const RATES = {
  AXE_ARIARY: 220,
  AXE_USDT: 0.045,
  USDT_ARIARY: 4800,
}

export const formatNumber = (n: number, decimals = 2) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)

export const formatAriary = (n: number) =>
  'Ar ' + new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)

interface Wallet {
  name: string
  address: string
  wallet_address: string
  balance_axe: number
  balance_usdt: number
  balance_ariary: number
  staked_axe: number
  invested_axe: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  created_at: string
  note?: string
}

interface WalletCtx {
  wallet: Wallet
  transactions: Transaction[]
  priceHistory: { day: number; price: number }[]
  loading: boolean
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => void
  updateBalance: (field: keyof Wallet, value: number) => void
  refreshWallet: () => Promise<void>
  submitDepot: (montant: number, mvola: string) => Promise<{error: any}>
  submitRetrait: (axe: number, mvola: string) => Promise<{error: any}>
  saveWalletAddress: (walletAddress: string) => Promise<{error: any}>
  sendAXEDirect: (recipientAddr: string, amountAXE: number) => Promise<{txHash?: string | null; error?: string}>
  sendP2PAriary: (recipientUID: string, montantAriary: number) => Promise<{success?: boolean; error?: string}>
  sendP2PAXE: (recipientUID: string, amountAXE: number) => Promise<{txHash?: string | null; error?: string}>
}

const WalletContext = createContext<WalletCtx>({} as WalletCtx)

const genHistory = () => {
  const data = []
  let price = 0.042
  for (let i = 30; i >= 0; i--) {
    price += (Math.random() - 0.48) * 0.002
    price = Math.max(0.03, price)
    data.push({ day: i, price: parseFloat(price.toFixed(5)) })
  }
  return data
}

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState(RATES)

  const [wallet, setWallet] = useState<Wallet>({
    name: 'Mon Wallet',
    address: '',
    wallet_address: '',
    balance_axe: 0,
    balance_usdt: 0,
    balance_ariary: 0,
    staked_axe: 0,
    invested_axe: 0,
  })

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [priceHistory] = useState(genHistory)

  async function refreshWallet() {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const { data: tauxData } = await supabase.from('taux').select('*').single()
      if (tauxData) {
        setRates({
          AXE_ARIARY: tauxData.axe_ariary,
          AXE_USDT: tauxData.axe_usdt,
          USDT_ARIARY: tauxData.usdt_ariary,
        })
      }

      const { data: userData } = await supabase
        .from('users').select('*').eq('id', session.user.id).single()

      if (userData) {
        setWallet({
          name: userData.nom || session.user.email?.split('@')[0] || 'Utilisateur',
          address: session.user.id,
          wallet_address: userData.wallet_address || '',
          balance_axe: userData.balance_axe || 0,
          balance_usdt: userData.balance_usdt || 0,
          balance_ariary: userData.balance_ariary || 0,
          staked_axe: userData.axe_staked || 0,
          invested_axe: 0,
        })
      }

      const { data: txData } = await supabase
        .from('transactions').select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }).limit(20)

      if (txData) {
        setTransactions(txData.map(t => ({
          id: t.id, type: t.type, amount: t.montant,
          currency: 'AXE', status: t.statut, created_at: t.created_at,
        })))
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => {
    if (session?.user?.id) refreshWallet()
    else setLoading(false)
  }, [session?.user?.id])

  async function submitDepot(montant: number, mvola: string) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    const frais = Math.round(montant * 0.02)
    const axe_credite = parseFloat(((montant - frais) / rates.AXE_ARIARY).toFixed(2))
    const { error } = await supabase.from('depots').insert({
      user_id: session.user.id, montant_ariary: montant,
      axe_credite, frais, mvola, statut: 'pending'
    })
    return { error }
  }

  async function submitRetrait(axe: number, mvola: string) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    const montant_ariary = axe * rates.AXE_ARIARY
    const frais = Math.round(montant_ariary * 0.03)
    const { error } = await supabase.from('retraits').insert({
      user_id: session.user.id, axe_envoye: axe,
      montant_ariary: montant_ariary - frais, frais, mvola, statut: 'pending'
    })
    return { error }
  }

  const addTransaction = (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    setTransactions(prev => [{ ...tx, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev])
  }

  const updateBalance = (field: keyof Wallet, value: number) => {
    setWallet(prev => ({ ...prev, [field]: value }))
  }

  async function saveWalletAddress(walletAddress: string) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    const { error } = await supabase
      .from('users').update({ wallet_address: walletAddress })
      .eq('id', session.user.id)
    if (!error) {
      setWallet(prev => ({ ...prev, wallet_address: walletAddress }))
    }
    return { error }
  }

  async function sendAXEDirect(recipientAddr: string, amountAXE: number) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    
    // Récupérer la clé privée de l'user
    const { data: userData } = await supabase
      .from('users').select('wallet_private_key').eq('id', session.user.id).single()
    
    if (!userData?.wallet_private_key) {
      return { error: 'Clé privée non trouvée' }
    }

    // Envoyer via blockchain
    const result = await sendAXE(userData.wallet_private_key, recipientAddr, amountAXE)
    
    if (result.error) {
      return { error: result.error }
    }

    // Enregistrer dans la base de données
    await supabase.from('transactions').insert({
      user_id: session.user.id,
      type: 'envoi_axe_blockchain',
      montant: amountAXE,
      frais: 0,
      statut: 'completed',
    })

    return { txHash: result.txHash || undefined }
  }

  async function sendP2PAriary(recipientUID: string, montantAriary: number) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    
    // Trouver le destinataire par UID
    const { data: recipientUser } = await supabase
      .from('users').select('id, balance_ariary, nom').eq('id', recipientUID).single()
    
    if (!recipientUser) {
      return { error: 'Utilisateur introuvable' }
    }

    if (wallet.balance_ariary < montantAriary) {
      return { error: 'Solde insuffisant' }
    }

    // Réduire balance du sender
    const { error: err1 } = await supabase
      .from('users')
      .update({ balance_ariary: wallet.balance_ariary - montantAriary })
      .eq('id', session.user.id)

    if (err1) return { error: 'Erreur lors du débit' }

    // Augmenter balance du recipient
    const { error: err2 } = await supabase
      .from('users')
      .update({ balance_ariary: (recipientUser.balance_ariary || 0) + montantAriary })
      .eq('id', recipientUser.id)

    if (err2) return { error: 'Erreur lors du crédit' }

    // Enregistrer transaction sender
    await supabase.from('transactions').insert({
      user_id: session.user.id,
      type: 'p2p_ariary_envoi',
      montant: montantAriary,
      frais: 0,
      statut: 'completed',
    })

    // Enregistrer transaction recipient
    await supabase.from('transactions').insert({
      user_id: recipientUser.id,
      type: 'p2p_ariary_reception',
      montant: montantAriary,
      frais: 0,
      statut: 'completed',
    })

    // Mettre à jour le wallet local
    setWallet(prev => ({ ...prev, balance_ariary: wallet.balance_ariary - montantAriary }))

    return { success: true }
  }

  async function sendP2PAXE(recipientUID: string, amountAXE: number) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    
    // Trouver le destinataire par UID
    const { data: recipientUser } = await supabase
      .from('users').select('id, wallet_address, wallet_private_key').eq('id', recipientUID).single()
    
    if (!recipientUser) {
      return { error: 'Utilisateur introuvable' }
    }

    if (!recipientUser.wallet_address) {
      return { error: 'Destinataire n\'a pas de wallet' }
    }

    // Récupérer la clé privée du sender
    const { data: senderData } = await supabase
      .from('users').select('wallet_private_key').eq('id', session.user.id).single()
    
    if (!senderData?.wallet_private_key) {
      return { error: 'Clé privée non trouvée' }
    }

    // Envoyer via blockchain
    const result = await sendAXE(senderData.wallet_private_key, recipientUser.wallet_address, amountAXE)
    
    if (result.error) {
      return { error: result.error }
    }

    // Enregistrer transaction sender
    await supabase.from('transactions').insert({
      user_id: session.user.id,
      type: 'p2p_axe_envoi',
      montant: amountAXE,
      frais: 0,
      statut: 'completed',
    })

    // Enregistrer transaction recipient
    await supabase.from('transactions').insert({
      user_id: recipientUser.id,
      type: 'p2p_axe_reception',
      montant: amountAXE,
      frais: 0,
      statut: 'completed',
    })

    return { txHash: result.txHash || undefined }
  }

  Object.assign(RATES, rates)

  return (
    <WalletContext.Provider value={{ wallet, transactions, priceHistory, loading, addTransaction, updateBalance, refreshWallet, submitDepot, submitRetrait, saveWalletAddress, sendAXEDirect, sendP2PAriary, sendP2PAXE }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
