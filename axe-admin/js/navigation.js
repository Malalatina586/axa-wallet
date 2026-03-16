// ===== Dashboard & Page Navigation =====
export function switchPage(pageId, element) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active')
  })
  
  // Remove active class from nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active')
  })
  
  // Show selected page
  const pageElement = document.getElementById(`page-${pageId}`)
  if (pageElement) {
    pageElement.classList.add('active')
  }
  
  // Mark nav item as active
  if (element) {
    element.classList.add('active')
  }
  
  console.log(`Switched to page: ${pageId}`)
}

export function switchDepositTab(type, element) {
  // Hide all deposit containers
  document.getElementById('deposit-usdt-container').style.display = 'none'
  document.getElementById('deposit-ariary-container').style.display = 'none'
  
  // Show selected container
  if (type === 'usdt') {
    document.getElementById('deposit-usdt-container').style.display = 'block'
  } else {
    document.getElementById('deposit-ariary-container').style.display = 'block'
  }
  
  // Update tab styles
  document.querySelectorAll('[id^="tab-deposit-"]').forEach(btn => {
    btn.style.background = 'transparent'
    btn.style.borderBottom = 'none'
  })
  
  element.style.background = 'rgba(59, 130, 246, 0.15)'
  element.style.borderBottom = '3px solid var(--blue)'
}

export function switchWithdrawalTab(type, element) {
  // Hide all withdrawal containers
  document.getElementById('withdrawal-ariary-container').style.display = 'none'
  
  // Show selected container
  document.getElementById(`withdrawal-${type}-container`).style.display = 'block'
  
  // Update tab styles
  document.querySelectorAll('[id^="tab-withdrawal-"]').forEach(btn => {
    btn.style.background = 'transparent'
    btn.style.borderBottom = 'none'
  })
  
  element.style.background = 'rgba(59, 130, 246, 0.15)'
  element.style.borderBottom = '3px solid var(--blue)'
}

export function switchP2PTab(type, element) {
  // Hide all P2P containers
  document.getElementById('p2p-ariary-container').style.display = 'none'
  document.getElementById('p2p-usdt-container').style.display = 'none'
  document.getElementById('p2p-axe-container').style.display = 'none'
  
  // Show selected container
  document.getElementById(`p2p-${type}-container`).style.display = 'block'
  
  // Update tab styles
  document.querySelectorAll('[id^="tab-p2p-"]').forEach(btn => {
    btn.style.background = 'transparent'
    btn.style.borderBottom = 'none'
  })
  
  element.style.background = 'rgba(59, 130, 246, 0.15)'
  element.style.borderBottom = '3px solid var(--blue)'
}

export function openModal(title, content) {
  const modal = document.getElementById('transaction-modal')
  if (modal) {
    document.getElementById('modal-title').textContent = title
    // Content will be set by caller
    modal.style.display = 'flex'
  }
}

export function closeModal() {
  const modal = document.getElementById('transaction-modal')
  if (modal) {
    modal.style.display = 'none'
  }
}

export function filterRetraits(status, element) {
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active')
  })
  element.classList.add('active')
  
  // Filter table rows
  const tbody = document.getElementById('retraits-ariary-table')
  if (tbody) {
    const rows = tbody.querySelectorAll('tr')
    rows.forEach(row => {
      const statusBadge = row.querySelector('.status')
      if (status === 'all') {
        row.style.display = ''
      } else if (statusBadge && statusBadge.classList.contains(status)) {
        row.style.display = ''
      } else {
        row.style.display = 'none'
      }
    })
  }
  
  console.log(`Filtered retraits by: ${status}`)
}
