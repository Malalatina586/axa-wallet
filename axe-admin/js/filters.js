// ===== Advanced Filtering & Search =====
import { sb, formatCurrency, formatDate } from './api.js'

export async function searchUsers(query) {
  try {
    if (!query || query.length < 2) {
      console.log('Query trop court')
      return []
    }

    // Chercher par email ou ID
    const { data } = await sb
      .from('users')
      .select('id, email, balance_axe, balance_usdt, balance_ariary, created_at')
      .or(`email.ilike.%${query}%,id.ilike.%${query}%`)
      .limit(10)

    return data || []
  } catch (err) {
    console.error('❌ Erreur recherche utilisateurs:', err)
    return []
  }
}

export async function filterTransactionsByDateRange(tableName, startDate, endDate) {
  try {
    const { data } = await sb
      .from(tableName)
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    return data || []
  } catch (err) {
    console.error('❌ Erreur filtrage dates:', err)
    return []
  }
}

export async function filterTransactionsByAmount(tableName, minAmount, maxAmount) {
  try {
    const { data } = await sb
      .from(tableName)
      .select('*')
      .gte('montant_ariary', minAmount)
      .lte('montant_ariary', maxAmount)
      .order('created_at', { ascending: false })

    return data || []
  } catch (err) {
    console.error('❌ Erreur filtrage montants:', err)
    return []
  }
}

export async function filterByUser(tableName, userId) {
  try {
    const { data } = await sb
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return data || []
  } catch (err) {
    console.error('❌ Erreur filtrage utilisateur:', err)
    return []
  }
}

export async function getTransactionStats(period) {
  try {
    const now = new Date()
    let startDate

    switch(period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(2020, 0, 1)
    }

    // Dépôts
    const { data: deposits } = await sb
      .from('depots')
      .select('montant_ariary')
      .gte('created_at', startDate.toISOString())

    // Retraits
    const { data: withdrawals } = await sb
      .from('retraits')
      .select('montant_ariary')
      .gte('created_at', startDate.toISOString())

    const totalDeposits = (deposits || []).reduce((sum, d) => sum + (d.montant_ariary || 0), 0)
    const totalWithdrawals = (withdrawals || []).reduce((sum, w) => sum + (w.montant_ariary || 0), 0)
    const transactionCount = (deposits?.length || 0) + (withdrawals?.length || 0)

    return {
      period,
      totalDeposits,
      totalWithdrawals,
      netFlow: totalDeposits - totalWithdrawals,
      transactionCount
    }

  } catch (err) {
    console.error('❌ Erreur stats transactions:', err)
    return null
  }
}

export function populateSearchResults(results) {
  const container = document.getElementById('search-results-container')
  if (!container) return

  if (results.length === 0) {
    container.innerHTML = '<div style="padding: 16px; color: var(--sub); text-align: center;">Aucun utilisateur trouvé</div>'
    return
  }

  const html = results.map(user => `
    <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: 600; color: var(--text);">${user.email}</div>
        <div style="font-size: 11px; color: var(--sub);">ID: ${user.id.substring(0, 8)}...</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-family: var(--mono); color: var(--gold);">${formatCurrency(user.balance_axe / 1000000, 1)} AXE</div>
        <div style="font-size: 11px; color: var(--sub);">${formatDate(user.created_at)}</div>
      </div>
    </div>
  `).join('')

  container.innerHTML = html
}
