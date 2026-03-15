/**
 * @file shellStore.ts
 * @brief Zustand store slice for AppShell sidebar and active panel UI state.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { create } from 'zustand'

interface ShellStore {
  sidebarOpen: boolean
  activePanelId: string | null
  registeredPanelIds: string[]
  setSidebarOpen: (open: boolean) => void
  setActivePanelId: (panelId: string | null) => void
  setRegisteredPanelIds: (ids: string[]) => void
  reset: () => void
}

const initialState = {
  sidebarOpen: true,
  activePanelId: null,
  registeredPanelIds: []
} satisfies Pick<ShellStore, 'sidebarOpen' | 'activePanelId' | 'registeredPanelIds'>

export const useShellStore = create<ShellStore>()((set) => ({
  ...initialState,
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },
  setActivePanelId: (panelId) => {
    set({ activePanelId: panelId })
  },
  setRegisteredPanelIds: (ids) => {
    set({ registeredPanelIds: ids })
  },
  reset: () => {
    set(initialState)
  }
}))
