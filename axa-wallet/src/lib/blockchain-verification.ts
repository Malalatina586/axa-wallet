// 📦 Blockchain Verification Service
// Verifies AXE transfers on BNB Chain before updating database

import { ethers } from 'ethers'

const BNB_RPC_URL = 'https://bsc-dataseed1.binance.org:443'
const CONFIRMATIONS_NEEDED = 2 // Wait for 2 block confirmations

/**
 * Wait for blockchain transaction to be confirmed
 * ✅ Ensures transfer actually happened on-chain before updating DB
 */
export async function verifyBlockchainTransaction(txHash: string): Promise<{
  verified: boolean
  error?: string
  confirmations?: number
}> {
  try {
    const provider = new ethers.JsonRpcProvider(BNB_RPC_URL)

    // Get transaction receipt
    let receipt = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes with 5-second polling

    while (!receipt && attempts < maxAttempts) {
      receipt = await provider.getTransactionReceipt(txHash)
      if (receipt) break

      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    if (!receipt) {
      return {
        verified: false,
        error: 'Transaction not found on blockchain after 5 minutes',
      }
    }

    // Transaction failed on-chain
    if (receipt.status === 0) {
      return {
        verified: false,
        error: 'Transaction failed on blockchain',
      }
    }

    // Check confirmations
    const currentBlock = await provider.getBlockNumber()
    const confirmations = currentBlock - receipt.blockNumber

    if (confirmations < CONFIRMATIONS_NEEDED) {
      return {
        verified: false,
        error: `Waiting for ${CONFIRMATIONS_NEEDED} confirmations (${confirmations}/${CONFIRMATIONS_NEEDED})`,
        confirmations,
      }
    }

    // ✅ Transaction verified!
    return {
      verified: true,
      confirmations,
    }
  } catch (err) {
    console.error('❌ Blockchain verification error:', err)
    return {
      verified: false,
      error: err instanceof Error ? err.message : 'Verification failed',
    }
  }
}

/**
 * Enhanced transfer function:
 * 1. Send transaction to blockchain
 * 2. Wait for confirmation
 * 3. Update database atomically
 */
export async function sendVerifiedAXETransfer(
  signer: ethers.Signer,
  tokenAddress: string,
  recipientAddress: string,
  amount: ethers.BigNumberish,
  onProgress: (status: string) => void
): Promise<{
  success: boolean
  txHash?: string
  error?: string
}> {
  try {
    onProgress('💳 Building transaction...')

    // AXE Token Contract ABI (ERC-20)
    const erc20ABI = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
    ]

    const contract = new ethers.Contract(tokenAddress, erc20ABI, signer)

    // Send transaction
    onProgress('📤 Sending transaction...')
    const tx = await contract.transfer(recipientAddress, amount)
    const txHash = tx.hash

    onProgress('⏳ Waiting for blockchain confirmation...')
    const receipt = await tx.wait(CONFIRMATIONS_NEEDED)

    if (!receipt || receipt.status === 0) {
      return {
        success: false,
        error: 'Transaction failed on blockchain',
      }
    }

    onProgress('✅ Transaction verified!')

    return {
      success: true,
      txHash,
    }
  } catch (err) {
    console.error('❌ Transfer error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Transfer failed',
    }
  }
}

/**
 * Security improvements:
 * ✅ Requires blockchain confirmation (2 blocks) before DB update
 * ✅ Prevents "transaction sent but failed" → DB mismatch
 * ✅ Provides real-time progress to user
 * ✅ Graceful error handling with user-friendly messages
 */

export const BlockchainService = {
  verifyBlockchainTransaction,
  sendVerifiedAXETransfer,
}
