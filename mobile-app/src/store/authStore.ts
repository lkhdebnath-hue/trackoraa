import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IUserPayload {
  id: string;
  employeeId: string;
  username: string;
  role: 'super_admin' | 'principal' | 'teacher' | 'coordinator' | 'staff' | 'student';
  department: string;
  permissions: string[];
}

interface AuthState {
  user: IUserPayload | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: IUserPayload, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'trackora-auth-storage',
      storage: createJSONStorage(() => AsyncStorage as any),
    }
  )
);
export default useAuthStore;
