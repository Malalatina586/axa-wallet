import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { sendAXE, getAXEBalance, syncBlockchainBalance } from '../lib/blockchain'
import { decryptPrivateKey } from '../lib/crypto'
import { atomicTransferP2PAriary, atomicTransferP2PAXE, validateP2PTransfer } from '../lib/atomic-transactions'
import { verifyBlockchainTransaction, sendVerifiedAXETransfer } from '../lib/blockchain-verification'

// AXE Token Contract Address on BNB Chain (Madagascar)
const AXE_TOKEN_ADDRESS = '0xc8d07b5c2403efFa58aDCCC23f8D4217e94F11Fa'

// 🌐 RÉSEAU CONFIGURATION
export const NETWORK_CONFIG = {
  name: 'Binance Smart Chain (BSC)',
  chainId: 56,
  rpcUrl: 'https://bsc-dataseed1.binance.org:443',
  blockExplorer: 'https://bscscan.com',
  supportedTokens: ['AXE', 'USDT'],
  nativeCurrency: 'BNB',
}

export const SUPPORTED_CURRENCIES = ['AXE', 'USDT']

export const RATES = {
  AXE_ARIARY: 1000,
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
        // 🔄 Si pas d'adresse wallet, la générer!
        let walletAddr = userData.wallet_address
        if (!walletAddr) {
          const randomWallet = ethers.Wallet.createRandom()
          walletAddr = randomWallet.address
          // Sauvegarde l'adresse générée
          await supabase.from('users').update({ wallet_address: walletAddr }).eq('id', session.user.id)
        }

        setWallet({
          name: userData.nom || session.user.email?.split('@')[0] || 'Utilisateur',
          address: session.user.id,
          wallet_address: walletAddr,
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
    if (session?.user?.id) {
      refreshWallet()
      // Auto-refresh balances toutes les 10 secondes
      const interval = setInterval(() => {
        refreshWallet()
      }, 10000)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [session?.user?.id])

  // 🔄 Polling blockchain pour sync AXE balance
  useEffect(() => {
    if (session?.user?.id && wallet.wallet_address) {
      // Sync immédiatement au démarrage
      syncBlockchainBalance(session.user.id, wallet.wallet_address)
        .then(result => {
          if (result.success && result.balance !== undefined) {
            setWallet(prev => ({ ...prev, balance_axe: result.balance! }))
          }
        })

      // Puis toutes les 30 secondes
      const interval = setInterval(() => {
        syncBlockchainBalance(session.user.id, wallet.wallet_address)
          .then(result => {
            if (result.success && result.balance !== undefined) {
              setWallet(prev => ({ ...prev, balance_axe: result.balance! }))
            }
          })
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [session?.user?.id, wallet.wallet_address])


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
    
    try {
      // Get sender's encrypted private key
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_private_key, balance_axe')
        .eq('id', session.user.id)
        .single()
      
      if (!userData?.wallet_private_key) {
        return { error: 'Clé privée non trouvée' }
      }

      if (userData.balance_axe < amountAXE) {
        return { error: 'Solde insuffisant' }
      }

      // 🔐 DECRYPT private key
      let decryptedKey: string
      try {
        // NOTE: In production, implement proper password handling
        decryptedKey = await decryptPrivateKey(userData.wallet_private_key, session.user?.email || '')
      } catch (err) {
        return { error: 'Impossible de déchiffrer la clé privée' }
      }

      // Create ethers.Wallet signer from decrypted key
      const wallet = new ethers.Wallet(decryptedKey)

      // 🚀 Send AXE and verify blockchain confirmation
      const result = await sendVerifiedAXETransfer(
        wallet,
        AXE_TOKEN_ADDRESS,
        recipientAddr,
        amountAXE,
        (status: string) => console.log('Transfer status:', status)
      )

      if (result.error) {
        return { error: result.error }
      }

      // ✅ Record transaction (blockchain already verified)
      await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'envoi_axe_direct',
        montant: amountAXE,
        frais: 0,
        statut: 'completed',
        blockchain_tx: result.txHash,
      })

      // Update local balance
      setWallet(prev => ({ ...prev, balance_axe: userData.balance_axe - amountAXE }))

      return { txHash: result.txHash }
    } catch (err: any) {
      console.error('❌ Direct AXE transfer error:', err)
      return { error: err.message || 'Erreur lors du transfert' }
    }
  }

  async function sendP2PAriary(recipientUID: string, montantAriary: number) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    
    try {
      // 🔐 Validate sender and recipient
      const validation = await validateP2PTransfer(session.user.id, recipientUID, montantAriary, 'ariary')
      if (!validation.valid) {
        return { error: validation.error || 'Validation échouée' }
      }

      // 🔄 Call atomic RPC function - ALL-OR-NOTHING transaction
      const result = await atomicTransferP2PAriary(session.user.id, recipientUID, montantAriary)
      
      if (!result.success || result.error) {
        return { error: result.error || 'Transfert échoué' }
      }

      // ✅ Transaction succeeded atomically at DB level
      // Update local state
      setWallet(prev => ({ ...prev, balance_ariary: wallet.balance_ariary - montantAriary }))
      
      // Refresh full wallet to get correct balances from DB
      await refreshWallet()

      return { success: true }
    } catch (err: any) {
      console.error('❌ P2P Ariary transfer error:', err)
      return { error: err.message || 'Erreur lors du transfert' }
    }
  }

  async function sendP2PAXE(recipientUID: string, amountAXE: number) {
    if (!session?.user?.id) return { error: 'Non connecté' }
    
    try {
      // 🔐 Validate sender and recipient
      const validation = await validateP2PTransfer(session.user.id, recipientUID, amountAXE, 'axe')
      if (!validation.valid) {
        return { error: validation.error || 'Validation échouée' }
      }

      // Get sender's encrypted private key
      const { data: senderData } = await supabase
        .from('users')
        .select('wallet_private_key')
        .eq('id', session.user.id)
        .single()
      
      if (!senderData?.wallet_private_key) {
        return { error: 'Clé privée non trouvée' }
      }

      // Get recipient's wallet address
      const { data: recipientData } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('id', recipientUID)
        .single()
      
      if (!recipientData?.wallet_address) {
        return { error: 'Adresse wallet du destinataire non trouvée' }
      }

      // 🔐 DECRYPT private key (user password needed -> TODO: implement password prompt)
      // For now, assume password is available from auth session
      let decryptedKey: string
      try {
        // NOTE: In production, you'll need to get password from user input
        // This is a simplified approach - implement proper password handling
        decryptedKey = await decryptPrivateKey(senderData.wallet_private_key, session.user?.email || '')
      } catch (err) {
        return { error: 'Impossible de déchiffrer la clé privée' }
      }

      // Create ethers.Wallet signer from decrypted key
      const signer = new ethers.Wallet(decryptedKey)

      // 🚀 Send AXE transfer with blockchain verification
      const transferResult = await sendVerifiedAXETransfer(
        signer,
        AXE_TOKEN_ADDRESS,
        recipientData.wallet_address,
        amountAXE,
        (status: string) => console.log('Transfer status:', status) // Could be UI feedback
      )

      if (transferResult.error) {
        return { error: transferResult.error }
      }

      // ✅ Blockchain transfer confirmed - now atomic DB update
      const txHash = transferResult.txHash
      if (!txHash) {
        return { error: 'Transaction hash not returned from blockchain' }
      }

      const dbResult = await atomicTransferP2PAXE(session.user.id, recipientUID, amountAXE, txHash)

      if (!dbResult.success || dbResult.error) {
        // Blockchain succeeded but DB failed - critical error!
        console.warn('⚠️ CRITICAL: Blockchain TX succeeded but DB update failed!', { txHash, error: dbResult.error })
        return { error: dbResult.error || 'Enregistrement DB échoué. Contactez support.' }
      }

      // ✅ Blockchain + DB both succeeded
      setWallet(prev => ({ ...prev, balance_axe: prev.balance_axe - amountAXE }))
      await refreshWallet()

      return { txHash }
    } catch (err: any) {
      console.error('❌ P2P AXE transfer error:', err)
      return { error: err.message || 'Erreur lors du transfert' }
    }
  }

  Object.assign(RATES, rates)

  return (
    <WalletContext.Provider value={{ wallet, transactions, priceHistory, loading, addTransaction, updateBalance, refreshWallet, submitDepot, submitRetrait, saveWalletAddress, sendAXEDirect, sendP2PAriary, sendP2PAXE }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
