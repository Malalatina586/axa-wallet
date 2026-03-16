// ===== Authentication Management =====
import { sb, showNotification } from './api.js'

let autoRefreshInterval = null

export async function initAuth() {
  // Check if already authenticated
  try {
    const { data } = await sb.auth.getSession()
    
    if (data?.session) {
      console.log('✅ Session active détectée')
      sessionStorage.setItem('admin_authenticated', 'true')
      sessionStorage.setItem('admin_user_id', data.session.user.id)
      document.getElementById('auth-overlay').style.display = 'none'
      loadDashboard()
      startAutoRefresh()
    } else {
      console.log('⚠️ Pas de session active')
      document.getElementById('auth-overlay').style.display = 'flex'
    }
  } catch (err) {
    console.error('❌ Erreur session check:', err)
    document.getElementById('auth-overlay').style.display = 'flex'
  }
}

export function setupAuthListeners() {
  // Login button
  const loginBtn = document.getElementById('btn-login')
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin)
  }

  // Enter key on password input
  const passwordInput = document.getElementById('admin-password')
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin()
      }
    })
  }
}

export async function handleLogin() {
  const email = document.getElementById('admin-email').value
  const password = document.getElementById('admin-password').value
  const errorDiv = document.getElementById('login-error')
  
  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      console.error('❌ Login error:', error)
      errorDiv.textContent = '❌ Email ou mot de passe incorrect'
      errorDiv.classList.add('show')
      document.getElementById('admin-password').value = ''
      setTimeout(() => {
        errorDiv.classList.remove('show')
      }, 3000)
      return
    }
    
    if (data?.user) {
      console.log('✅ Admin authentifié:', data.user.id)
      sessionStorage.setItem('admin_authenticated', 'true')
      sessionStorage.setItem('admin_user_id', data.user.id)
      document.getElementById('auth-overlay').style.display = 'none'
      loadDashboard()
      startAutoRefresh()
    }
  } catch (err) {
    console.error('❌ Erreur login:', err)
    document.getElementById('login-error').textContent = '❌ Erreur de connexion'
    document.getElementById('login-error').classList.add('show')
    setTimeout(() => {
      document.getElementById('login-error').classList.remove('show')
    }, 3000)
  }
}

export async function logout() {
  if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
    try {
      await sb.auth.signOut()
      sessionStorage.removeItem('admin_authenticated')
      sessionStorage.removeItem('admin_user_id')
      if (autoRefreshInterval) clearInterval(autoRefreshInterval)
      location.reload()
    } catch (err) {
      console.error('❌ Erreur logout:', err)
      location.reload()
    }
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval)
  autoRefreshInterval = setInterval(() => {
    loadDashboardStats()
  }, 10000) // 10 secondes
}

function loadDashboard() {
  // Import and call dashboard functions
  console.log('Loading dashboard...')
}

function loadDashboardStats() {
  // Import and call dashboard stats functions
  console.log('Refreshing dashboard stats...')
}
