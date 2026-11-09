import { createContext, useContext } from 'react'

export type Tab = 'explore' | 'likes' | 'crew' | 'profile'

export interface Nav {
  tab: Tab
  setTab: (t: Tab) => void
  openUser: (id: string) => void
  openChat: (id: string) => void
  openPaywall: (reason?: string) => void
  openSafety: (userId: string, mode?: 'menu' | 'block' | 'report') => void
  openVerify: (reason?: string) => void
}

export const NavCtx = createContext<Nav | null>(null)

export function useNav() {
  const n = useContext(NavCtx)
  if (!n) throw new Error('useNav outside provider')
  return n
}
