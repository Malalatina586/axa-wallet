// 🔐 Atomic Transaction Functions
// Calls Supabase RPC functions for guaranteed atomicity

import { supabase } from './supabase'

/**
 * Atomic P2P Ariary transfer using database transaction
 * ✅ Guaranteed: Either BOTH updates succeed or BOTH rollback
 * ❌ Never partial (one debit, other no credit)
 */
export async function atomicTransferP2PAriary(
  senderID: string,
  recipientID: string,
  amountAriary: number,
  feePercentage: number = 1,
  displayID?: string
): Promise<{ success: boolean; error?: string; displayID?: string }> {
  try {
    const { data, error } = await supabase.rpc('transfer_p2p_ariary', {
      sender_id: senderID,
      recipient_id: recipientID,
      amount: amountAriary,
      fee_percentage: feePercentage,
      display_id: displayID || undefined,
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return { success: false, error: error.message }
    }

    // Supabase RPC returns object directly, not in array
    const result = Array.isArray(data) ? data[0] : data
    if (!result) return { success: false, error: 'Invalid response' }

    return {
      success: result.success,
      error: result.error,
      displayID: result.display_id,
    }
  } catch (err) {
    console.error('❌ Transfer error (atomicTransferP2PAriary):', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Atomic P2P AXE transfer using database transaction
 * ✅ Guaranteed atomicity + blockchain tx reference stored
 * @param txHash - Blockchain transaction hash (for verification)
 */
export async function atomicTransferP2PAXE(
  senderID: string,
  recipientID: string,
  amountAXE: number,
  txHash: string,
  feePercentage: number = 1,
  displayID?: string
): Promise<{ success: boolean; error?: string; displayID?: string }> {
  try {
    const { data, error } = await supabase.rpc('transfer_p2p_axe', {
      sender_id: senderID,
      recipient_id: recipientID,
      amount: amountAXE,
      tx_hash: txHash,
      fee_percentage: feePercentage,
      display_id: displayID || undefined,
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return { success: false, error: error.message }
    }

    // Supabase RPC returns object directly, not in array
    const result = Array.isArray(data) ? data[0] : data
    if (!result) return { success: false, error: 'Invalid response' }

    return {
      success: result.success,
      error: result.error,
      displayID: result.display_id,
    }
  } catch (err) {
    console.error('❌ Transfer error (atomicTransferP2PAXE):', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Atomic P2P USDT transfer using database transaction
 * ✅ Guaranteed atomicity + blockchain tx reference stored
 * @param txHash - Blockchain transaction hash (for verification)
 */
export async function atomicTransferP2PUSDT(
  senderID: string,
  recipientID: string,
  amountUSDT: number,
  txHash: string,
  feePercentage: number = 1,
  displayID?: string
): Promise<{ success: boolean; error?: string; displayID?: string }> {
  try {
    const { data, error } = await supabase.rpc('transfer_p2p_usdt', {
      sender_id: senderID,
      recipient_id: recipientID,
      amount: amountUSDT,
      tx_hash: txHash,
      fee_percentage: feePercentage,
      display_id: displayID || undefined,
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return { success: false, error: error.message }
    }

    // Supabase RPC returns object directly, not in array
    const result = Array.isArray(data) ? data[0] : data
    if (!result) return { success: false, error: 'Invalid response' }

    return {
      success: result.success,
      error: result.error,
      displayID: result.display_id,
    }
  } catch (err) {
    console.error('❌ Transfer error (atomicTransferP2PUSDT):', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Verify status before calling atomic transfer
 * Pre-checks to avoid unnecessary RPC calls
 */
export async function validateP2PTransfer(
  senderID: string,
  recipientID: string,
  amount: number,
  currency: 'ariary' | 'axe' | 'usdt',
  feePercentage: number = 1
): Promise<{ valid: boolean; error?: string; totalCost?: number; fee?: number }> {
  try {
    // Check sender and recipient exist
    const { data: sender } = await supabase
      .from('users')
      .select('id')
      .eq('id', senderID)
      .single()

    if (!sender) return { valid: false, error: 'Sender not found' }

    const { data: recipient } = await supabase
      .from('users')
      .select('id')
      .eq('id', recipientID)
      .single()

    if (!recipient) return { valid: false, error: 'Recipient not found' }

    // 🔥 For Ariary: check Ariary balance AND AXE for fees
    if (currency === 'ariary') {
      const { data: senderData } = await supabase
        .from('users')
        .select('balance_ariary, balance_axe')
        .eq('id', senderID)
        .single()

      const ariaryBalance = senderData?.balance_ariary || 0
      const axeBalance = senderData?.balance_axe || 0

      // Check Ariary balance
      if (ariaryBalance < amount) {
        return { valid: false, error: `Insufficient Ariary balance` }
      }

      // Calculate fee in AXE (amount valorized in AXE)
      // 1 AXE = 220 Ariary (configured in backoffice), so value_in_axe = amount / 220
      const valueInAXE = amount / 220
      const feeInAXE = valueInAXE * feePercentage / 100

      // Check AXE balance for fee
      if (axeBalance < feeInAXE) {
        return { 
          valid: false, 
          error: `❌ Insufficient AXE for P2P fee (need ${feeInAXE.toFixed(8)} AXE, have ${axeBalance.toFixed(8)} AXE)`,
          fee: feeInAXE
        }
      }

      return { 
        valid: true,
        totalCost: amount, // Ariary amount
        fee: feeInAXE // Fee in AXE
      }
    }

    // For AXE/USDT: check both token balance AND AXE for fee
    const balanceField = currency === 'axe' ? 'balance_axe' : 'balance_usdt'
    
    const { data: senderData } = await supabase
      .from('users')
      .select('balance_axe, balance_ariary, balance_usdt')
      .eq('id', senderID)
      .single()

    const balance = ((senderData?.[balanceField as keyof typeof senderData] as unknown) as number) || 0
    const axeBalance = senderData?.balance_axe || 0

    if (balance < amount) {
      return { valid: false, error: `Insufficient ${currency} balance` }
    }

    // Calculate fee in AXE
    let feeInAXE = 0
    
    if (currency === 'axe') {
      // Fee for AXE: amount * fee%
      feeInAXE = amount * feePercentage / 100
    } else if (currency === 'usdt') {
      // Fee for USDT: amount * fee% * exchange rate (0.045)
      feeInAXE = amount * feePercentage / 100 * 0.045
    }

    if (axeBalance < feeInAXE) {
      return { 
        valid: false, 
        error: `❌ Insufficient AXE for transaction fee (need ${feeInAXE.toFixed(8)} AXE, have ${axeBalance.toFixed(8)} AXE)`,
        fee: feeInAXE
      }
    }

    return { 
      valid: true,
      totalCost: currency === 'axe' ? amount + feeInAXE : amount,
      fee: feeInAXE
    }
  } catch (err) {
    console.error('❌ Validation error:', err)
    return { valid: false, error: 'Validation failed' }
  }
}
