/**
 * @file historyStore.ts
 * @brief Zustand store slice for undo/redo availability and stack counters.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { create } from 'zustand'
import type { HistorySnapshot } from '@renderer/types/appShell'

interface HistoryStore extends HistorySnapshot {
  setSnapshot: (snapshot: HistorySnapshot) => void
  reset: () => void
}

const initialSnapshot: HistorySnapshot = {
  undoCount: 0,
  redoCount: 0,
  canUndo: false,
  canRedo: false
}

export const useHistoryStore = create<HistoryStore>()((set) => ({
  ...initialSnapshot,
  setSnapshot: (snapshot) => {
    set(snapshot)
  },
  reset: () => {
    set(initialSnapshot)
  }
}))
