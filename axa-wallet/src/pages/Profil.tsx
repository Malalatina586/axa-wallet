import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, formatNumber } from '../contexts/WalletContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { User, Sun, Moon, Shield, Bell, ChevronRight, Copy, Check, LogOut, TrendingUp, X, Eye, EyeOff } from 'lucide-react'

export default function ProfilPage() {
  const { wallet } = useWallet()
  const { dark, toggle } = useTheme()
  const { signOut, user, changePassword, changeEmail, changeMvola } = useAuth()
  const navigate = useNavigate()
  
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<'info' | 'security' | null>(null)
  
  // Password change states
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false })
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success' | 'error'; text: string} | null>(null)
  
  // Email change states
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{type: 'success' | 'error'; text: string} | null>(null)
  
  // Mvola change states
  const [mvola, setMvola] = useState({ nom: '', numero: user?.mvola || '' })
  const [mvolaLoading, setMvolaLoading] = useState(false)
  const [mvolaMsg, setMvolaMsg] = useState<{type: 'success' | 'error'; text: string} | null>(null)

  const card = dark ? 'bg-[#1A2A4A]/60 border-[#2A3A5A]/50' : 'bg-white border-gray-200'
  const sub = dark ? 'text-[#94A3B8]' : 'text-gray-500'
  const input = dark ? 'bg-[#0d1829] border-[#2A3A5A] text-white' : 'bg-gray-50 border-gray-200 text-black'

  const copy = () => {
    navigator.clipboard.writeText(wallet.display_id || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwords.new || !passwords.confirm) {
      setPasswordMsg({ type: 'error', text: 'Tous les champs sont requis' })
      return
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }
    if (passwords.new.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères' })
      return
    }
    
    setPasswordLoading(true)
    const result = await changePassword(passwords.old, passwords.new)
    if (result.success) {
      setPasswordMsg({ type: 'success', text: 'Mot de passe changé avec succès!' })
      setPasswords({ old: '', new: '', confirm: '' })
      setTimeout(() => setActiveSection(null), 2000)
    } else {
      setPasswordMsg({ type: 'error', text: result.error || 'Erreur lors du changement' })
    }
    setPasswordLoading(false)
  }

  // Handle email change
  const handleEmailChange = async () => {
    if (!newEmail) {
      setEmailMsg({ type: 'error', text: 'Email requis' })
      return
    }
    
    setEmailLoading(true)
    const result = await changeEmail(newEmail)
    if (result.success) {
      setEmailMsg({ type: 'success', text: 'Email changé avec succès!' })
      setTimeout(() => setActiveSection(null), 2000)
    } else {
      setEmailMsg({ type: 'error', text: result.error || 'Erreur lors du changement' })
    }
    setEmailLoading(false)
  }

  // Handle Mvola change
  const handleMvolaChange = async () => {
    if (!mvola.numero) {
      setMvolaMsg({ type: 'error', text: 'Numéro Mvola requis' })
      return
    }
    
    setMvolaLoading(true)
    const result = await changeMvola(mvola.numero)
    if (result.success) {
      setMvolaMsg({ type: 'success', text: 'Mvola changé avec succès!' })
      setTimeout(() => setActiveSection(null), 2000)
    } else {
      setMvolaMsg({ type: 'error', text: result.error || 'Erreur lors du changement' })
    }
    setMvolaLoading(false)
  }

  const menuItems = [
    { icon: Bell, label: 'Notifications', action: () => {} },
    { icon: Shield, label: 'Sécurité', action: () => setActiveSection('security') },
    { icon: TrendingUp, label: 'Investissements', action: () => navigate('/invest') },
    { icon: dark ? Sun : Moon, label: dark ? 'Mode Clair' : 'Mode Sombre', action: toggle },
  ]

  return (
    <AppLayout>
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-xl font-bold mb-6">Mon Profil</h1>

        {/* Avatar */}
        <div className={`rounded-3xl p-6 border mb-5 text-center ${card}`}>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-lg font-bold mb-1">{wallet.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <p className={`text-xs font-mono ${sub}`}>{wallet.display_id || 'ID...'}</p>
            <button onClick={copy}>
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className={sub} />}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'AXE Total', val: formatNumber(wallet.balance_axe + wallet.staked_axe + wallet.invested_axe) },
            { label: 'Stakés', val: formatNumber(wallet.staked_axe) },
            { label: 'Investis', val: formatNumber(wallet.invested_axe) },
          ].map(({ label, val }) => (
            <div key={label} className={`rounded-2xl p-3 border text-center ${card}`}>
              <p className={`text-[10px] ${sub} mb-1`}>{label}</p>
              <p className="text-sm font-bold">{val}</p>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          {menuItems.map(({ icon: Icon, label, action }, i) => (
            <button key={label} onClick={action}
              className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${dark ? 'hover:bg-[#0A1628]/50' : 'hover:bg-gray-50'} ${i < menuItems.length - 1 ? `border-b ${dark ? 'border-[#2A3A5A]/30' : 'border-gray-100'}` : ''}`}>
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-[#3B82F6]" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <ChevronRight size={16} className={sub} />
            </button>
          ))}
        </div>

        <button onClick={signOut} className="w-full mt-4 py-4 rounded-2xl border border-red-500/30 text-red-400 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>

      {/* MODALS */}

      {/* Info Modal */}
      {activeSection === 'info' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className={`w-full rounded-t-3xl p-6 ${card} border border-b-0 animate-in slide-in-from-bottom`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Informations du Profil</h2>
              <button onClick={() => setActiveSection(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 pb-6">
              <div>
                <label className={`text-xs font-semibold ${sub}`}>NOM</label>
                <p className="text-base font-medium mt-1">{user?.nom || 'N/A'}</p>
              </div>
              <div>
                <label className={`text-xs font-semibold ${sub}`}>IDENTIFIANT</label>
                <p className="text-base font-mono font-medium mt-1">{user?.display_id || 'N/A'}</p>
              </div>
              <div>
                <label className={`text-xs font-semibold ${sub}`}>TÉLÉPHONE</label>
                <p className="text-base font-medium mt-1">{user?.telephone || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Modal */}
      {activeSection === 'security' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end overflow-y-auto">
          <div className={`w-full rounded-t-3xl p-6 ${card} border border-b-0 my-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield size={20} className="text-blue-400" />
                Sécurité
              </h2>
              <button onClick={() => setActiveSection(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 pb-20 max-h-[80vh] overflow-y-auto">
              {/* CHANGER MOT DE PASSE */}
              <div className={`border rounded-2xl p-4 ${dark ? 'border-[#2A3A5A]' : 'border-gray-200'}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  🔐 Changer de Mot de Passe
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>MOT DE PASSE ACTUEL</label>
                    <div className={`flex items-center border rounded-lg mt-1 ${input}`}>
                      <input
                        type={showPasswords.old ? 'text' : 'password'}
                        value={passwords.old}
                        onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                        placeholder="Entrez votre mot de passe"
                        className={`flex-1 px-3 py-2 outline-none ${input}`}
                      />
                      <button onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})} className="px-3">
                        {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>NOUVEAU MOT DE PASSE</label>
                    <div className={`flex items-center border rounded-lg mt-1 ${input}`}>
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwords.new}
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        placeholder="Entrez le nouveau mot de passe"
                        className={`flex-1 px-3 py-2 outline-none ${input}`}
                      />
                      <button onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})} className="px-3">
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>CONFIRMEZ LE MOT DE PASSE</label>
                    <div className={`flex items-center border rounded-lg mt-1 ${input}`}>
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                        placeholder="Confirmez le nouveau mot de passe"
                        className={`flex-1 px-3 py-2 outline-none ${input}`}
                      />
                      <button onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})} className="px-3">
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {passwordMsg && (
                    <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {passwordMsg.text}
                    </p>
                  )}

                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 py-2 rounded-lg font-semibold text-white transition-colors"
                  >
                    {passwordLoading ? 'En cours...' : 'Changer le Mot de Passe'}
                  </button>
                </div>
              </div>

              {/* CHANGER EMAIL */}
              <div className={`border rounded-2xl p-4 ${dark ? 'border-[#2A3A5A]' : 'border-gray-200'}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  📧 Changer d'Email
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>EMAIL ACTUEL</label>
                    <p className={`text-sm font-medium mt-1 p-2 rounded-lg ${dark ? 'bg-[#0d1829]' : 'bg-gray-50'}`}>
                      {user?.email || 'Pas d\'email défini'}
                    </p>
                  </div>

                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>NOUVEL EMAIL</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Entrez votre nouvel email"
                      className={`w-full px-3 py-2 border rounded-lg mt-1 outline-none ${input}`}
                    />
                  </div>

                  {emailMsg && (
                    <p className={`text-sm ${emailMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {emailMsg.text}
                    </p>
                  )}

                  <button
                    onClick={handleEmailChange}
                    disabled={emailLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 py-2 rounded-lg font-semibold text-white transition-colors"
                  >
                    {emailLoading ? 'En cours...' : 'Changer l\'Email'}
                  </button>
                </div>
              </div>

              {/* CHANGER MVOLA */}
              <div className={`border rounded-2xl p-4 ${dark ? 'border-[#2A3A5A]' : 'border-gray-200'}`}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  📱 Changer de Numéro Mvola
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>NOM</label>
                    <input
                      type="text"
                      value={mvola.nom}
                      onChange={(e) => setMvola({...mvola, nom: e.target.value})}
                      placeholder="Ex: Mvola Orange"
                      className={`w-full px-3 py-2 border rounded-lg mt-1 outline-none ${input}`}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-semibold ${sub}`}>NUMÉRO MVOLA</label>
                    <input
                      type="tel"
                      value={mvola.numero}
                      onChange={(e) => setMvola({...mvola, numero: e.target.value})}
                      placeholder="Ex: 0XX XXX XXX"
                      className={`w-full px-3 py-2 border rounded-lg mt-1 outline-none ${input}`}
                    />
                  </div>

                  {mvolaMsg && (
                    <p className={`text-sm ${mvolaMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {mvolaMsg.text}
                    </p>
                  )}

                  <button
                    onClick={handleMvolaChange}
                    disabled={mvolaLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 py-2 rounded-lg font-semibold text-white transition-colors"
                  >
                    {mvolaLoading ? 'En cours...' : 'Changer le Mvola'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
