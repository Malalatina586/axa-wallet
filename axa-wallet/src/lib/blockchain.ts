import { ethers } from 'ethers'
import { supabase } from './supabase'

// Configuration BNB Chain
const BNB_CHAIN_RPC = 'https://bsc-dataseed1.binance.org:443'
const AXE_CONTRACT = '0xc8d07b5c2403efFa58aDCCC23f8D4217e94F11Fa'
const AXE_DECIMALS = 18

// 📍 USDT Official on BSC Mainnet
const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'
const USDT_DECIMALS = 6

// ABI minimaliste pour ERC-20
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]

const provider = new ethers.JsonRpcProvider(BNB_CHAIN_RPC)

export async function sendAXE(
  privateKey: string,
  recipientAddress: string,
  amountAXE: number
): Promise<{ txHash: string | null; error?: null } | { txHash?: null; error: string }> {
  try {
    // Valider les adresses
    if (!ethers.isAddress(recipientAddress)) {
      return { error: 'Adresse destinataire invalide' }
    }

    // Créer wallet depuis clé privée
    const wallet = new ethers.Wallet(privateKey, provider)
    
    // Créer contrat instance
    const contract = new ethers.Contract(AXE_CONTRACT, ERC20_ABI, wallet)
    
    // Convertir montant en unités brutes (avec décimales)
    const amount = ethers.parseUnits(amountAXE.toString(), AXE_DECIMALS)
    
    // Estimer les frais de gas
    const gasEstimate = await contract.transfer.estimateGas(recipientAddress, amount)
    
    // Envoyer transaction
    const tx = await contract.transfer(recipientAddress, amount, {
      gasLimit: (gasEstimate * 120n) / 100n, // +20% pour sûreté
    })
    
    // Attendre la confirmation
    await tx.wait()
    
    return { txHash: tx.hash }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de l\'envoi' }
  }
}

export async function getAXEBalance(address: string): Promise<number> {
  try {
    if (!ethers.isAddress(address)) return 0
    
    const contract = new ethers.Contract(AXE_CONTRACT, ERC20_ABI, provider)
    const balance = await contract.balanceOf(address)
    
    return parseFloat(ethers.formatUnits(balance, AXE_DECIMALS))
  } catch (err) {
    console.error('Erreur lecture balance AXE:', err)
    return 0
  }
}

export async function getUSDTBalance(address: string): Promise<number> {
  try {
    if (!ethers.isAddress(address)) return 0
    
    const contract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider)
    const balance = await contract.balanceOf(address)
    
    return parseFloat(ethers.formatUnits(balance, USDT_DECIMALS))
  } catch (err) {
    console.error('Erreur lecture balance USDT:', err)
    return 0
  }
}

export async function validateAddress(address: string): Promise<boolean> {
  return ethers.isAddress(address)
}

// 🔄 Sync blockchain balance with database (AXE & USDT)
export async function syncBlockchainBalance(userID: string, walletAddress: string): Promise<{ success: boolean; balanceAXE?: number; balanceUSDT?: number; error?: string }> {
  try {
    if (!ethers.isAddress(walletAddress)) {
      return { success: false, error: 'Adresse invalide' }
    }

    // 1. Récupérer balances du blockchain
    const blockchainAXE = await getAXEBalance(walletAddress)
    const blockchainUSDT = await getUSDTBalance(walletAddress)

    // 2. Récupérer balances en DB
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('balance_axe, balance_usdt')
      .eq('id', userID)
      .single()

    if (fetchError) return { success: false, error: 'Erreur lecture DB' }

    const dbAXE = userData?.balance_axe || 0
    const dbUSDT = userData?.balance_usdt || 0

    // 3. Mettre à jour si différent
    let updated = false
    const updates: any = {}

    if (Math.abs(blockchainAXE - dbAXE) > 0.0001) {
      updates.balance_axe = blockchainAXE
      updated = true
    }

    if (Math.abs(blockchainUSDT - dbUSDT) > 0.0001) {
      updates.balance_usdt = blockchainUSDT
      updated = true
    }

    if (updated) {
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userID)

      if (updateError) {
        console.error('❌ Erreur sync blockchain:', updateError)
        return { success: false, error: 'Erreur mise à jour' }
      }

      if (updates.balance_axe !== undefined) {
        console.log(`✅ AXE synced: ${dbAXE} → ${blockchainAXE}`)
      }
      if (updates.balance_usdt !== undefined) {
        console.log(`✅ USDT synced: ${dbUSDT} → ${blockchainUSDT}`)
      }
    }

    return { success: true, balanceAXE: blockchainAXE, balanceUSDT: blockchainUSDT }
  } catch (err: any) {
    console.error('❌ Sync blockchain error:', err)
    return { success: false, error: err.message }
  }
}

