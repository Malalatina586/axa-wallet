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
  amountAriary: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('transfer_p2p_ariary', {
      sender_id: senderID,
      recipient_id: recipientID,
      amount: amountAriary,
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return { success: false, error: error.message }
    }

    const result = data?.[0]
    if (!result) return { success: false, error: 'Invalid response' }

    return {
      success: result.success,
      error: result.error,
    }
  } catch (err) {
    console.error('❌ Transfer error:', err)
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
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('transfer_p2p_axe', {
      sender_id: senderID,
      recipient_id: recipientID,
      amount: amountAXE,
      tx_hash: txHash,
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return { success: false, error: error.message }
    }

    const result = data?.[0]
    if (!result) return { success: false, error: 'Invalid response' }

    return {
      success: result.success,
      error: result.error,
    }
  } catch (err) {
    console.error('❌ Transfer error:', err)
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
  currency: 'ariary' | 'axe'
): Promise<{ valid: boolean; error?: string }> {
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

    // Check sender balance
    const { data: senderData } = await supabase
      .from('users')
      .select(currency === 'ariary' ? 'balance_ariary' : 'balance_axe')
      .eq('id', senderID)
      .single()

    const balanceField = currency === 'ariary' ? 'balance_ariary' : 'balance_axe'
    const balance = ((senderData?.[balanceField as keyof typeof senderData] as unknown) as number) || 0

    if (balance < amount) {
      return { valid: false, error: `Insufficient ${currency} balance` }
    }

    return { valid: true }
  } catch (err) {
    console.error('❌ Validation error:', err)
    return { valid: false, error: 'Validation failed' }
  }
}
