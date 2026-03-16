// ===== Advanced Analytics & Exports =====
import { sb, formatCurrency, formatDate, getDateRange } from './api.js'

export async function exportToCSV(tableName, period = 'all') {
  try {
    const range = getDateRange(period)
    
    let { data } = await sb
      .from(tableName)
      .select('*')
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString())
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter')
      return
    }

    // Convertir en CSV
    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escaper les guillemets
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')

    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${tableName}_${period}_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log(`✅ Exporté ${data.length} lignes de ${tableName}`)
  } catch (err) {
    console.error('❌ Erreur export CSV:', err)
    alert('Erreur lors de l\'export')
  }
}

export async function loadFeeDistributionChart() {
  try {
    const { data: fees } = await sb.from('fees_collected').select('transaction_type, amount_axe')

    if (!fees || fees.length === 0) {
      console.log('Pas de frais à afficher')
      return
    }

    // Grouper par type
    const byType = {}
    fees.forEach(fee => {
      const type = fee.transaction_type || 'unknown'
      byType[type] = (byType[type] || 0) + (fee.amount_axe || 0)
    })

    const labels = Object.keys(byType)
    const data = Object.values(byType)
    const colors = ['#f0b429', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4']

    const canvasEl = document.getElementById('feeDistributionChart')
    if (!canvasEl) return

    if (window.feeDistributionChart) {
      window.feeDistributionChart.destroy()
    }

    const ctx = canvasEl.getContext('2d')
    window.feeDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(l => l.toUpperCase()),
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: 'rgba(26, 45, 74, 0.5)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: 'rgba(232, 237, 245, 0.7)' } }
        }
      }
    })

  } catch (err) {
    console.error('Erreur graphique frais:', err)
  }
}

export async function loadCurrencyBreakdownChart() {
  try {
    const { data: wallets } = await sb.from('users').select('balance_axe, balance_usdt, balance_ariary')

    const totalAXE = (wallets || []).reduce((sum, w) => sum + (w.balance_axe || 0), 0)
    const totalUSDT = (wallets || []).reduce((sum, w) => sum + (w.balance_usdt || 0), 0)
    const totalAriary = (wallets || []).reduce((sum, w) => sum + (w.balance_ariary || 0), 0)

    const canvasEl = document.getElementById('currencyBreakdownChart')
    if (!canvasEl) return

    if (window.currencyBreakdownChart) {
      window.currencyBreakdownChart.destroy()
    }

    const ctx = canvasEl.getContext('2d')
    window.currencyBreakdownChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['AXE', 'USDT', 'Ariary'],
        datasets: [{
          data: [totalAXE / 1000000, totalUSDT, totalAriary / 1000000],
          backgroundColor: ['#f0b429', '#06b6d4', '#ef4444'],
          borderColor: 'rgba(26, 45, 74, 0.5)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: 'rgba(232, 237, 245, 0.7)' } }
        }
      }
    })

  } catch (err) {
    console.error('Erreur graphique devises:', err)
  }
}

export async function loadCumulativeRevenueChart() {
  try {
    const labels = []
    const cumulativeData = []
    let cumulative = 0

    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      labels.push(date.toLocaleDateString('fr-FR', { month: '2-digit', day: '2-digit' }))

      // Frais du jour
      const { data: dayFees } = await sb
        .from('fees_collected')
        .select('amount_axe')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())

      const dayTotal = (dayFees || []).reduce((sum, f) => sum + (f.amount_axe || 0), 0)
      cumulative += dayTotal
      cumulativeData.push(cumulative)
    }

    const canvasEl = document.getElementById('cumulativeRevenueChart')
    if (!canvasEl) return

    if (window.cumulativeRevenueChart) {
      window.cumulativeRevenueChart.destroy()
    }

    const ctx = canvasEl.getContext('2d')
    window.cumulativeRevenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenus Cumulatifs (AXE)',
          data: cumulativeData,
          borderColor: '#f0b429',
          backgroundColor: 'rgba(240, 180, 41, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
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
    console.error('Erreur graphique revenus:', err)
  }
}

export async function loadUserGrowthChart() {
  try {
    const labels = []
    const userCountData = []

    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      labels.push(date.toLocaleDateString('fr-FR', { month: '2-digit', day: '2-digit' }))

      // Utilisateurs créés ce jour
      const { data: dayUsers } = await sb
        .from('users')
        .select('id')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())

      userCountData.push(dayUsers?.length || 0)
    }

    const canvasEl = document.getElementById('userGrowthChart')
    if (!canvasEl) return

    if (window.userGrowthChart) {
      window.userGrowthChart.destroy()
    }

    const ctx = canvasEl.getContext('2d')
    window.userGrowthChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nouveaux Utilisateurs',
          data: userCountData,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        }]
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
    console.error('Erreur graphique utilisateurs:', err)
  }
}

export async function setupRealtimeUpdates() {
  try {
    // Subscribe to realtime fee updates
    sb.channel('fees-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fees_collected' }, (payload) => {
        console.log('🔔 Nouveaux frais collectés:', payload.new)
        loadDashboardStats()
      })
      .subscribe()

    console.log('✅ Real-time updates activées')
  } catch (err) {
    console.error('❌ Erreur real-time:', err)
  }
}
