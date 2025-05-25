import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from '@/types';

interface AppStore extends AppState {
  // Theme actions
  setThemeMode: (mode: 'light' | 'dark') => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  
  // User actions
  setAuthenticated: (isAuthenticated: boolean) => void;
  setUserPreference: (key: string, value: unknown) => void;
  
  // Notification actions
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Initial state
      theme: {
        mode: 'light',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
      },
      user: {
        isAuthenticated: false,
        preferences: {},
      },
      notifications: [],

      // Theme actions
      setThemeMode: (mode) =>
        set((state) => ({
          ...state,
          theme: { ...state.theme, mode },
        })),

      setPrimaryColor: (color) =>
        set((state) => ({
          ...state,
          theme: { ...state.theme, primaryColor: color },
        })),

      setSecondaryColor: (color) =>
        set((state) => ({
          ...state,
          theme: { ...state.theme, secondaryColor: color },
        })),

      // User actions
      setAuthenticated: (isAuthenticated) =>
        set((state) => ({
          ...state,
          user: { ...state.user, isAuthenticated },
        })),

      setUserPreference: (key, value) =>
        set((state) => ({
          ...state,
          user: {
            ...state.user,
            preferences: { ...state.user.preferences, [key]: value },
          },
        })),

      // Notification actions
      addNotification: (notification) =>
        set((state) => ({
          ...state,
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: Date.now().toString(),
              timestamp: new Date(),
            },
          ],
        })),

      removeNotification: (id) =>
        set((state) => ({
          ...state,
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () =>
        set((state) => ({
          ...state,
          notifications: [],
        })),
    }),
    {
      name: 'loadforge-app-store',
      partialize: (state) => ({
        theme: state.theme,
        user: {
          isAuthenticated: state.user.isAuthenticated,
          preferences: state.user.preferences,
        },
      }),
    }
  )
);

export default useAppStore; 