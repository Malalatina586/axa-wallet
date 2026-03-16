// ===== Configuration Management =====
import { sb, showNotification } from './api.js'

export async function saveFeeConfig() {
  try {
    const fees = {
      fee_p2p_axe: parseFloat(document.getElementById('fee_p2p_axe')?.value || 1),
      fee_p2p_usdt: parseFloat(document.getElementById('fee_p2p_usdt')?.value || 1),
      fee_p2p_ariary: parseFloat(document.getElementById('fee_p2p_ariary')?.value || 1),
      fee_deposit_axe: parseFloat(document.getElementById('fee_deposit_axe')?.value || 0),
      fee_deposit_usdt: parseFloat(document.getElementById('fee_deposit_usdt')?.value || 0),
      fee_deposit_ariary: parseFloat(document.getElementById('fee_deposit_ariary')?.value || 2),
      fee_withdraw_axe: parseFloat(document.getElementById('fee_withdraw_axe')?.value || 0),
      fee_withdraw_usdt: parseFloat(document.getElementById('fee_withdraw_usdt')?.value || 0),
      fee_withdraw_ariary: parseFloat(document.getElementById('fee_withdraw_ariary')?.value || 3),
      fee_convert: parseFloat(document.getElementById('fee_convert')?.value || 1)
    }

    await sb.from('config').update(fees).eq('id', 1)
    showNotification('✅ Frais configurés avec succès')
  } catch (err) {
    console.error('❌ Erreur configuration frais:', err)
    showNotification('❌ Erreur lors de la sauvegarde')
  }
}

export async function saveExchangeRates() {
  try {
    const rates = {
      rate_axe_ariary: parseFloat(document.getElementById('rate-axe-ariary-input')?.value || 220),
      rate_axe_usdt: parseFloat(document.getElementById('rate-axe-usdt-input')?.value || 0.045),
      rate_usdt_ariary: parseFloat(document.getElementById('rate-usdt-ariary-input')?.value || 4889)
    }

    await sb.from('config').update(rates).eq('id', 1)
    showNotification('✅ Taux de change mis à jour')
    loadRates()
  } catch (err) {
    console.error('❌ Erreur configuration taux:', err)
    showNotification('❌ Erreur lors de la sauvegarde')
  }
}

export async function saveWalletsConfig() {
  try {
    const wallets = {
      wallet_admin_axe: document.getElementById('wallet-admin-axe')?.value || '',
      wallet_admin_usdt: document.getElementById('wallet-admin-usdt')?.value || ''
    }

    await sb.from('config').update(wallets).eq('id', 1)
    showNotification('✅ Adresses wallets configurées')
  } catch (err) {
    console.error('❌ Erreur configuration wallets:', err)
    showNotification('❌ Erreur lors de la sauvegarde')
  }
}

export async function saveStakingConfig() {
  try {
    const staking = {
      staking_apy_flexible: parseFloat(document.getElementById('staking-apy-flexible')?.value || 12),
      staking_apy_fixed: parseFloat(document.getElementById('staking-apy-fixed')?.value || 18),
      staking_bonus_multiplier: parseFloat(document.getElementById('staking-bonus-multiplier')?.value || 1.5),
      staking_min_amount: parseFloat(document.getElementById('staking-min-amount')?.value || 100)
    }

    await sb.from('config').update(staking).eq('id', 1)
    showNotification('✅ Configuration staking mise à jour')
  } catch (err) {
    console.error('❌ Erreur configuration staking:', err)
    showNotification('❌ Erreur lors de la sauvegarde')
  }
}

export async function loadRates() {
  try {
    const { data: config } = await sb.from('config').select('*').eq('id', 1).single()

    if (config) {
      document.getElementById('rate-axe-ariary-display').textContent = config.rate_axe_ariary || '220'
      document.getElementById('rate-axe-usdt-display').textContent = config.rate_axe_usdt || '0.045'
      document.getElementById('rate-usdt-ariary-display').textContent = config.rate_usdt_ariary || '4889'
    }
  } catch (err) {
    console.error('❌ Erreur chargement taux:', err)
  }
}

export async function setFeeCollectionInterval(minutes) {
  try {
    await sb.from('config').update({ fee_collection_interval: minutes }).eq('id', 1)
    document.getElementById('current-interval-display').textContent = minutes + (minutes === 1 ? ' minute' : ' minutes')
    showNotification(`✅ Intervalle défini à ${minutes} minute(s)`)
  } catch (err) {
    console.error('❌ Erreur configuration intervalle:', err)
  }
}

export async function applyAllFeeChanges() {
  await saveFeeConfig()
  await saveExchangeRates()
}

export async function resetFeeInputs() {
  document.getElementById('fee_p2p_axe').value = '1'
  document.getElementById('fee_p2p_usdt').value = '1'
  document.getElementById('fee_p2p_ariary').value = '1'
  document.getElementById('fee_deposit_axe').value = '0'
  document.getElementById('fee_deposit_usdt').value = '0'
  document.getElementById('fee_deposit_ariary').value = '2'
  document.getElementById('fee_withdraw_axe').value = '0'
  document.getElementById('fee_withdraw_usdt').value = '0'
  document.getElementById('fee_withdraw_ariary').value = '3'
  document.getElementById('fee_convert').value = '1'
}
