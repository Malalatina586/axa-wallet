import { ethers } from 'ethers'

// Configuration BNB Chain
const BNB_CHAIN_RPC = 'https://bsc-dataseed1.binance.org:443'
const AXE_CONTRACT = '0xc8d07b5c2403efFa58aDCCC23f8D4217e94F11Fa'
const AXE_DECIMALS = 18

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
    console.error('Erreur lecture balance:', err)
    return 0
  }
}

export async function validateAddress(address: string): Promise<boolean> {
  return ethers.isAddress(address)
}
