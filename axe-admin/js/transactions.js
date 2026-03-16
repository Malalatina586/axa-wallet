// ===== Transaction Management (Deposits/Withdrawals/P2P) =====
import { sb, formatCurrency, formatDate } from './api.js'

export async function loadDepots() {
  try {
    const { data: depots } = await sb.from('depots').select('*').order('created_at', { ascending: false })
    const tbody = document.getElementById('depots-usdt-table')
    if (!tbody) return

    tbody.innerHTML = ''
    depots?.forEach(depot => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td>${depot.user_email || 'N/A'}</td>
        <td class="mono">${formatCurrency(depot.montant_usdt || 0, 2)}</td>
        <td class="mono">${formatCurrency((depot.montant_usdt || 0) * 0.02, 2)}</td>
        <td class="mono">${formatCurrency((depot.montant_usdt || 0) * 0.98, 2)}</td>
        <td class="mono">${formatDate(depot.created_at)}</td>
        <td><span class="status pending">Attente</span></td>
        <td><button class="btn btn-approve" onclick="approveDepot('${depot.id}')">✓ Approuver</button></td>
      `
      tbody.appendChild(row)
    })
  } catch (err) {
    console.error('Erreur chargement dépôts:', err)
  }
}

export async function loadRetraits() {
  try {
    const { data: retraits } = await sb.from('retraits').select('*').order('created_at', { ascending: false })
    const tbody = document.getElementById('retraits-ariary-table')
    if (!tbody) return

    tbody.innerHTML = ''
    retraits?.forEach(retrait => {
      const row = document.createElement('tr')
      const montant = retrait.montant_ariary || 0
      const frais = montant * 0.03
      const aEnvoyer = montant - frais
      
      row.innerHTML = `
        <td>${retrait.user_email || 'N/A'}</td>
        <td class="mono">${formatCurrency(montant)}</td>
        <td class="mono">${formatCurrency(frais)}</td>
        <td class="mono">${formatCurrency(aEnvoyer)}</td>
        <td class="mono">${retrait.user_phone || 'N/A'}</td>
        <td>${retrait.operator || 'N/A'}</td>
        <td class="mono">${formatDate(retrait.created_at)}</td>
        <td><span class="status pending">Attente</span></td>
        <td><button class="btn btn-approve" onclick="approveRetrait('${retrait.id}')">✓ Approuver</button></td>
      `
      tbody.appendChild(row)
    })

    updateBadges()
  } catch (err) {
    console.error('Erreur chargement retraits:', err)
  }
}

export async function loadTransactions() {
  try {
    // Load all transaction types
    const { data: depots } = await sb.from('depots').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: retraits } = await sb.from('retraits').select('*').order('created_at', { ascending: false }).limit(100)

    const tbody = document.getElementById('transactions-table')
    if (!tbody) return

    tbody.innerHTML = ''
    const allTransactions = []

    depots?.forEach((d, idx) => {
      allTransactions.push({
        id: `D${idx}`,
        user: d.user_email,
        type: 'Dépôt',
        montant: d.montant_ariary || 0,
        frais: (d.montant_ariary || 0) * 0.02,
        net: (d.montant_ariary || 0) * 0.98,
        date: d.created_at
      })
    })

    retraits?.forEach((r, idx) => {
      allTransactions.push({
        id: `R${idx}`,
        user: r.user_email,
        type: 'Retrait',
        montant: r.montant_ariary || 0,
        frais: (r.montant_ariary || 0) * 0.03,
        net: (r.montant_ariary || 0) * 0.97,
        date: r.created_at
      })
    })

    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date))

    allTransactions.forEach((tx, idx) => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${tx.user}</td>
        <td>${tx.type}</td>
        <td class="mono">${formatCurrency(tx.montant)}</td>
        <td class="mono">${formatCurrency(tx.frais)}</td>
        <td class="mono">${formatCurrency(tx.net)}</td>
        <td class="mono">${formatDate(tx.date)}</td>
        <td><span class="status completed">Complété</span></td>
      `
      tbody.appendChild(row)
    })
  } catch (err) {
    console.error('Erreur chargement transactions:', err)
  }
}

export async function loadUsers() {
  try {
    const { data: users } = await sb.from('users').select('*').order('created_at', { ascending: false })
    const tbody = document.getElementById('users-table')
    if (!tbody) return

    tbody.innerHTML = ''
    users?.forEach(user => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td>${user.email || 'N/A'}</td>
        <td class="mono">${formatCurrency(user.balance_axe / 1000000, 1)}</td>
        <td class="mono">${formatCurrency(user.balance_usdt, 2)}</td>
        <td class="mono">${formatCurrency(user.balance_ariary / 1000000, 1)}</td>
        <td class="mono">${formatCurrency(user.axe_staked / 1000, 0)}</td>
        <td>--</td>
        <td>--</td>
        <td class="mono">${formatDate(user.created_at)}</td>
        <td><span class="status approved">Actif</span></td>
      `
      tbody.appendChild(row)
    })
  } catch (err) {
    console.error('Erreur chargement utilisateurs:', err)
  }
}

export async function updateBadges() {
  try {
    const { data: pendingDepots } = await sb.from('depots').select('id').eq('statut', 'pending')
    const { data: pendingRetraits } = await sb.from('retraits').select('id').eq('statut', 'pending')

    document.getElementById('badge-depots').textContent = pendingDepots?.length || 0
    document.getElementById('badge-retraits').textContent = pendingRetraits?.length || 0
  } catch (err) {
    console.error('Erreur mise à jour badges:', err)
  }
}

export async function approveDepot(depotId) {
  if (!confirm('Approuver ce dépôt ?')) return
  
  try {
    // Update depot status
    await sb.from('depots').update({ statut: 'approved' }).eq('id', depotId)
    console.log('✅ Dépôt approuvé')
    loadDepots()
  } catch (err) {
    console.error('❌ Erreur approbation dépôt:', err)
  }
}

export async function approveRetrait(retraitId) {
  if (!confirm('Approuver ce retrait ?')) return
  
  try {
    // Update retrait status
    await sb.from('retraits').update({ statut: 'approved' }).eq('id', retraitId)
    console.log('✅ Retrait approuvé')
    loadRetraits()
  } catch (err) {
    console.error('❌ Erreur approbation retrait:', err)
  }
}
