import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Tipos para el store
interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: "light" | "dark";
  
  // Filtros globales (ejemplo)
  userFilter: {
    role?: "user" | "admin";
    search?: string;
  };
  
  // Notificaciones
  notifications: Array<{
    id: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
    timestamp: number;
  }>;
}

interface AppActions {
  // UI Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  
  // Filter Actions
  setUserFilter: (filter: Partial<AppState["userFilter"]>) => void;
  clearUserFilter: () => void;
  
  // Notification Actions
  addNotification: (notification: Omit<AppState["notifications"][0], "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

type AppStore = AppState & AppActions;

// Store inicial
const initialState: AppState = {
  sidebarOpen: false,
  theme: "light",
  userFilter: {},
  notifications: [],
};

// Crear el store con persistencia opcional
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      // UI Actions
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),

      // Filter Actions
      setUserFilter: (filter) =>
        set((state) => ({
          userFilter: { ...state.userFilter, ...filter },
        })),
      
      clearUserFilter: () => set({ userFilter: {} }),

      // Notification Actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: Date.now().toString(),
              timestamp: Date.now(),
            },
          ],
        })),
      
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Solo tema; sidebarOpen no debe persistir (rehidratación + móvil rompía el drawer).
        theme: state.theme,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.getState().setSidebarOpen(false);
      },
    },
  ),
);

// Selectores útiles (opcional, pero recomendado para performance)
export const useSidebar = () => useAppStore((state) => state.sidebarOpen);
export const useAppThemeMode = () => useAppStore((state) => state.theme);
export const useUserFilter = () => useAppStore((state) => state.userFilter);
