// ===== Dashboard & Statistics =====
import { sb, formatCurrency, formatDate, getDateRange } from './api.js'

export async function loadDashboardStats() {
  try {
    // Fetch configuration
    const { data: configData } = await sb.from('config').select('*').eq('id', 1).single()
    const rateAxeAriary = configData?.rate_axe_ariary || 220
    const rateAxeUsdt = configData?.rate_axe_usdt || 0.045
    const feeDepot = configData?.fee_depot || 2
    const feeRetrait = configData?.fee_retrait || 3

    // Fetch user statistics
    const { data: usersData } = await sb.from('users').select('balance_axe, axe_staked, balance_usdt, balance_ariary')
    const totalUsers = usersData?.length || 0
    const totalAXE = (usersData || []).reduce((sum, u) => sum + (u.balance_axe || 0), 0)
    const totalStaked = (usersData || []).reduce((sum, u) => sum + (u.axe_staked || 0), 0)
    const totalUSDT = (usersData || []).reduce((sum, u) => sum + (u.balance_usdt || 0), 0)
    const totalAriary = (usersData || []).reduce((sum, u) => sum + (u.balance_ariary || 0), 0)

    // Fetch deposit/withdrawal statistics
    const { data: depositsData } = await sb.from('depots').select('montant_ariary')
    const { data: withdrawalsData } = await sb.from('retraits').select('montant_ariary')

    const totalDepots = depositsData?.length || 0
    const totalRetraits = withdrawalsData?.length || 0

    // Calculate fees
    const depositFees = (depositsData || []).reduce((sum, d) => sum + (d.montant_ariary || 0) * (feeDepot / 100), 0) / rateAxeAriary
    const withdrawalFees = (withdrawalsData || []).reduce((sum, r) => sum + (r.montant_ariary || 0) * (feeRetrait / 100), 0) / rateAxeAriary
    const feesStats = await loadFeesStats()
    const totalFees = depositFees + withdrawalFees + feesStats.totalAllTime

    // Calculate active users today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const activeUserIds = new Set()
    const { data: activeUsers } = await sb.from('users').select('id').gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString())
    activeUsers?.forEach(u => activeUserIds.add(u.id))

    // Update DOM elements
    if (document.getElementById('stat-axe-circulation')) {
      document.getElementById('stat-axe-circulation').textContent = formatCurrency(totalAXE / 1000000, 1)
      document.getElementById('stat-total-fees').textContent = formatCurrency(totalFees, 2)
      document.getElementById('stat-depots-pending').textContent = totalDepots
      document.getElementById('stat-retraits-pending').textContent = totalRetraits
      document.getElementById('stat-usdt-circulation').textContent = formatCurrency(totalUSDT, 2)
      document.getElementById('stat-ariary-circulation').textContent = formatCurrency(totalAriary / 1000000, 1)
      document.getElementById('active-users-label').textContent = activeUserIds.size + ' utilisateurs'

      // Fee details
      if (document.getElementById('fees-today')) {
        document.getElementById('fees-today').textContent = formatCurrency(feesStats.totalToday, 8) + ' AXE'
        document.getElementById('fees-month').textContent = formatCurrency(feesStats.totalThisMonth, 8) + ' AXE'
        document.getElementById('fees-alltime').textContent = formatCurrency(feesStats.totalAllTime, 8) + ' AXE'

        const byType = feesStats.byType || {}
        document.getElementById('fees-type-p2p-axe').textContent = formatCurrency(byType['p2p_axe'] || 0, 8)
        document.getElementById('fees-type-p2p-usdt').textContent = formatCurrency(byType['p2p_usdt'] || 0, 8)
        document.getElementById('fees-type-p2p-ariary').textContent = formatCurrency(byType['p2p_ariary'] || 0, 8)

        let otherTotal = 0
        ;['conversion', 'retrait', 'depot'].forEach(type => {
          otherTotal += byType[type] || 0
        })
        document.getElementById('fees-type-other').textContent = formatCurrency(otherTotal, 8)
      }

      // User page stats
      if (document.getElementById('stat-users-page')) {
        document.getElementById('stat-users-page').textContent = totalUsers
        document.getElementById('stat-axe-page').textContent = formatCurrency(totalAXE / 1000000, 1)
        document.getElementById('stat-staked-page').textContent = formatCurrency(totalStaked / 1000, 0) + 'K'
      }
    }

    // Load charts
    await loadLast7DaysChart(rateAxeAriary, rateAxeUsdt)
    await loadActiveUsersChart(activeUserIds.size)

  } catch (err) {
    console.error('Erreur chargement stats:', err)
  }
}

async function loadFeesStats() {
  try {
    const { data: allFees } = await sb.from('fees_collected').select('amount_axe, transaction_type, created_at')

    if (!allFees || allFees.length === 0) {
      return { totalAllTime: 0, totalToday: 0, totalThisMonth: 0, byType: {} }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalAllTime = 0
    let totalToday = 0
    let totalThisMonth = 0
    const byType = {}

    allFees.forEach(fee => {
      const amount = fee.amount_axe || 0
      totalAllTime += amount

      const feeDate = new Date(fee.created_at)
      const feeDay = new Date(feeDate.getFullYear(), feeDate.getMonth(), feeDate.getDate())

      if (feeDay.getTime() === today.getTime()) {
        totalToday += amount
      }

      if (feeDate >= startOfMonth && feeDate < now) {
        totalThisMonth += amount
      }

      const type = fee.transaction_type || 'unknown'
      byType[type] = (byType[type] || 0) + amount
    })

    return { totalAllTime, totalToday, totalThisMonth, byType }

  } catch (err) {
    console.error('Erreur chargement stats frais:', err)
    return { totalAllTime: 0, totalToday: 0, totalThisMonth: 0, byType: {} }
  }
}

async function loadLast7DaysChart(rateAxeAriary, rateAxeUsdt) {
  try {
    const labels = []
    const depositsData = []
    const withdrawsData = []
    const p2pData = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      labels.push(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }))

      const { data: dayDeposits } = await sb.from('depots').select('montant_ariary').gte('created_at', date.toISOString()).lt('created_at', nextDate.toISOString())
      const depositVolume = (dayDeposits || []).reduce((sum, d) => sum + (d.montant_ariary || 0), 0) / rateAxeAriary
      depositsData.push(depositVolume)

      const { data: dayWithdraws } = await sb.from('retraits').select('montant_ariary').gte('created_at', date.toISOString()).lt('created_at', nextDate.toISOString())
      const withdrawVolume = (dayWithdraws || []).reduce((sum, r) => sum + (r.montant_ariary || 0), 0) / rateAxeAriary
      withdrawsData.push(withdrawVolume)

      p2pData.push(0)
    }

    const canvasEl = document.getElementById('transactionsChart')
    if (!canvasEl) return

    if (window.transactionsChartInstance) {
      window.transactionsChartInstance.destroy()
    }

    const ctx = canvasEl.getContext('2d')
    window.transactionsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Dépôts', data: depositsData, backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: 'rgba(34, 197, 94, 1)', borderWidth: 1 },
          { label: 'Retraits', data: withdrawsData, backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: 'rgba(239, 68, 68, 1)', borderWidth: 1 },
          { label: 'P2P', data: p2pData, backgroundColor: 'rgba(59, 130, 246, 0.6)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { labels: { color: 'rgba(232, 237, 245, 0.7)' } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: 'rgba(107, 138, 173, 0.7)' }, grid: { color: 'rgba(26, 45, 74, 0.3)' } },
          x: { ticks: { color: 'rgba(107, 138, 173, 0.7)' }, grid: { color: 'rgba(26, 45, 74, 0.3)' } }
        }
      }
    })

  } catch (err) {
    console.error('Erreur graphique 7 jours:', err)
  }
}

async function loadActiveUsersChart(activeCount) {
  // Placeholder for pie/donut chart
  console.log(`Active users: ${activeCount}`)
}

export { loadFeesStats }
