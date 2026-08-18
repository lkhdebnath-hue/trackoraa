import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'dark', // Default to dark for Trackora style
      setThemePreference: (pref) => set({ themePreference: pref }),
    }),
    {
      name: 'trackora-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
