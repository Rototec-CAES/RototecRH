import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (value: boolean) => void
}

/** Preferencias de la interfaz (sidebar colapsado), recordadas en el navegador. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
    }),
    {
      name: 'rototec-ui',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
