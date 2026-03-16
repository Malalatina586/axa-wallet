// ===== API Configuration =====
const SUPABASE_URL = 'https://bozaertrmldtacnkfvan.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvemFlcnRybWxkdGFjbmtmdmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzkwNDQsImV4cCI6MjA4ODk1NTA0NH0.J_jkVDwzphVVV-EwuT5hpB-_lzMbBGXO-alJhIAOKog'

const { createClient } = supabase
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== Session Cache =====
let currentUser = null
let currentId = null
let autoRefreshInterval = null

// ===== Helper Functions =====
function formatCurrency(amount, decimals = 2) {
  return parseFloat(amount || 0).toFixed(decimals)
}

function formatDate(dateString) {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', { year: '2-digit', month: '2-digit', day: '2-digit' })
}

function formatTime(dateString) {
  if (!dateString) return '--:--'
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function showNotification(message, type = 'success') {
  // Simple notification for now
  console.log(`[${type.toUpperCase()}] ${message}`)
}

function getDateRange(period) {
  const now = new Date()
  const ranges = {
    today: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    },
    week: {
      start: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      end: now
    },
    month: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now
    },
    all: {
      start: new Date(2020, 0, 1),
      end: now
    }
  }
  return ranges[period] || ranges.today
}

export { sb, formatCurrency, formatDate, formatTime, showNotification, getDateRange }
