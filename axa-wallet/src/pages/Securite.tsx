import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import AppLayout from '../components/AppLayout'
import { ChevronLeft, Eye, EyeOff, Check, X } from 'lucide-react'

export default function SecuritePage() {
  const navigate = useNavigate()
  const { user, changePassword, changeEmail, changeMvola } = useAuth()
  const { dark } = useTheme()

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
      setTimeout(() => setPasswordMsg(null), 3000)
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
      setTimeout(() => setEmailMsg(null), 3000)
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
      setTimeout(() => setMvolaMsg(null), 3000)
    } else {
      setMvolaMsg({ type: 'error', text: result.error || 'Erreur lors du changement' })
    }
    setMvolaLoading(false)
  }

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/profil')}
            className="p-2 hover:bg-[#1A2A4A] rounded-lg transition"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">🔐 Sécurité</h1>
        </div>

        {/* CHANGER MOT DE PASSE */}
        <div className={`border rounded-2xl p-5 mb-5 ${card}`}>
          <h3 className="font-bold text-lg mb-4">Changer de Mot de Passe</h3>
          
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold ${sub}`}>MOT DE PASSE ACTUEL</label>
              <div className={`flex items-center border rounded-lg mt-2 ${input}`}>
                <input
                  type={showPasswords.old ? 'text' : 'password'}
                  value={passwords.old}
                  onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                  placeholder="Entrez votre mot de passe"
                  className={`flex-1 px-3 py-3 outline-none ${input}`}
                />
                <button onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})} className="px-3">
                  {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold ${sub}`}>NOUVEAU MOT DE PASSE</label>
              <div className={`flex items-center border rounded-lg mt-2 ${input}`}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  placeholder="Entrez le nouveau mot de passe"
                  className={`flex-1 px-3 py-3 outline-none ${input}`}
                />
                <button onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})} className="px-3">
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold ${sub}`}>CONFIRMEZ LE MOT DE PASSE</label>
              <div className={`flex items-center border rounded-lg mt-2 ${input}`}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  placeholder="Confirmez le nouveau mot de passe"
                  className={`flex-1 px-3 py-3 outline-none ${input}`}
                />
                <button onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})} className="px-3">
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {passwordMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${passwordMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {passwordMsg.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span className="text-sm">{passwordMsg.text}</span>
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 py-3 rounded-lg font-semibold text-white transition-colors active:scale-95"
            >
              {passwordLoading ? '⏳ En cours...' : '✓ Changer le Mot de Passe'}
            </button>
          </div>
        </div>

        {/* CHANGER EMAIL */}
        <div className={`border rounded-2xl p-5 mb-5 ${card}`}>
          <h3 className="font-bold text-lg mb-4">Changer d'Email</h3>
          
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold ${sub}`}>EMAIL ACTUEL</label>
              <p className={`text-sm font-medium mt-2 p-3 rounded-lg ${dark ? 'bg-[#0d1829]' : 'bg-gray-50'}`}>
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
                className={`w-full px-3 py-3 border rounded-lg mt-2 outline-none ${input}`}
              />
            </div>

            {emailMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${emailMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {emailMsg.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span className="text-sm">{emailMsg.text}</span>
              </div>
            )}

            <button
              onClick={handleEmailChange}
              disabled={emailLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 py-3 rounded-lg font-semibold text-white transition-colors active:scale-95"
            >
              {emailLoading ? '⏳ En cours...' : '✓ Changer l\'Email'}
            </button>
          </div>
        </div>

        {/* CHANGER MVOLA */}
        <div className={`border rounded-2xl p-5 mb-5 ${card}`}>
          <h3 className="font-bold text-lg mb-4">Changer de Numéro Mvola</h3>
          
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold ${sub}`}>NOM</label>
              <input
                type="text"
                value={mvola.nom}
                onChange={(e) => setMvola({...mvola, nom: e.target.value})}
                placeholder="Ex: Mvola Orange"
                className={`w-full px-3 py-3 border rounded-lg mt-2 outline-none ${input}`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold ${sub}`}>NUMÉRO MVOLA</label>
              <input
                type="tel"
                value={mvola.numero}
                onChange={(e) => setMvola({...mvola, numero: e.target.value})}
                placeholder="Ex: 0XX XXX XXX"
                className={`w-full px-3 py-3 border rounded-lg mt-2 outline-none ${input}`}
              />
            </div>

            {mvolaMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${mvolaMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {mvolaMsg.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span className="text-sm">{mvolaMsg.text}</span>
              </div>
            )}

            <button
              onClick={handleMvolaChange}
              disabled={mvolaLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 py-3 rounded-lg font-semibold text-white transition-colors active:scale-95"
            >
              {mvolaLoading ? '⏳ En cours...' : '✓ Changer le Mvola'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
