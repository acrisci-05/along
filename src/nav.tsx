import { createContext, useContext } from 'react'

export type Tab = 'explore' | 'radar' | 'likes' | 'plans' | 'crew' | 'profile'

export interface Nav {
  tab: Tab
  setTab: (t: Tab) => void
  openPlan: (id: string) => void
  openUser: (id: string) => void
  openChat: (id: string) => void
  openCreate: () => void
  openPaywall: (reason?: string) => void
  openGatekeeperForUser: (id: string) => void
  openSafety: (userId: string, mode?: 'menu' | 'block' | 'report') => void
}

export const NavCtx = createContext<Nav | null>(null)

export function useNav() {
  const n = useContext(NavCtx)
  if (!n) throw new Error('useNav outside provider')
  return n
}
