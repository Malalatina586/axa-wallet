import React from 'react'
import BottomNav from './BottomNav'
import { useTheme } from '../contexts/ThemeContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { dark } = useTheme()
  return (
    <div className={`min-h-screen max-w-md mx-auto relative ${dark ? 'bg-[#0A1628] text-white' : 'bg-[#F0F4FF] text-gray-900'}`}>
      <div className="pb-24 overflow-y-auto h-screen">{children}</div>
      <BottomNav />
    </div>
  )
}
