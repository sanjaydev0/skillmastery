import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  kind: ToastKind
  duration: number
}

interface UiStore {
  paletteOpen: boolean
  settingsOpen: boolean
  subjectSheetOpen: boolean
  moreOpen: boolean
  toasts: ToastItem[]
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  openSettings: () => void
  closeSettings: () => void
  openSubjectSheet: () => void
  closeSubjectSheet: () => void
  openMore: () => void
  closeMore: () => void
  toast: (message: string, kind?: ToastKind, duration?: number) => void
  dismissToast: (id: string) => void
}

let toastSeq = 0

export const useUiStore = create<UiStore>()((set, get) => ({
  paletteOpen: false,
  settingsOpen: false,
  subjectSheetOpen: false,
  moreOpen: false,
  toasts: [],
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openSubjectSheet: () => set({ subjectSheetOpen: true }),
  closeSubjectSheet: () => set({ subjectSheetOpen: false }),
  openMore: () => set({ moreOpen: true }),
  closeMore: () => set({ moreOpen: false }),
  toast: (message, kind = 'info', duration = 3800) => {
    const id = `toast-${++toastSeq}`
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { id, message, kind, duration }],
    }))
    window.setTimeout(() => {
      if (get().toasts.some((entry) => entry.id === id)) {
        set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) }))
      }
    }, duration)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })),
}))
