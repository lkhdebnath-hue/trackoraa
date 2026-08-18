import { create } from 'zustand';

interface UserPayload {
  id: string;
  employeeId: string;
  username: string;
  role: 'super_admin' | 'principal' | 'teacher' | 'coordinator' | 'staff' | 'student';
  department: string;
  permissions: string[];
}

interface AuthState {
  user: UserPayload | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserPayload, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<UserPayload>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial state from localStorage
  const storedUser = localStorage.getItem('trackora_user');
  const storedAccess = localStorage.getItem('trackora_access_token');
  const storedRefresh = localStorage.getItem('trackora_refresh_token');

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    accessToken: storedAccess,
    refreshToken: storedRefresh,
    isAuthenticated: !!storedAccess,

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem('trackora_user', JSON.stringify(user));
      localStorage.setItem('trackora_access_token', accessToken);
      localStorage.setItem('trackora_refresh_token', refreshToken);
      set({ user, accessToken, refreshToken, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('trackora_user');
      localStorage.removeItem('trackora_access_token');
      localStorage.removeItem('trackora_refresh_token');
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    },

    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        localStorage.setItem('trackora_user', JSON.stringify(newUser));
        return { user: newUser };
      });
    },
  };
});
export default useAuthStore;
