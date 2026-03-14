import React, { useEffect, useState } from 'react'
import logoAxeWallet from '../assets/logo-axe-wallet.png'
import iconAxeWallet from '../assets/icon-256.png'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1800)
    const t2 = setTimeout(() => onDone(), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${fade ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0d2040 100%)' }}>
      
      {/* Glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6, #22c55e)' }} />
      </div>

      {/* Logo */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${fade ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        <img src={iconAxeWallet} alt="AXE Wallet" className="w-28 h-28 mb-6 drop-shadow-2xl" />
        <img src={logoAxeWallet} alt="Axe Wallet" className="h-12 object-contain mb-4" />
        <p className="text-[#6b8aad] text-sm font-mono tracking-widest">Votre portefeuille AXE</p>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}
