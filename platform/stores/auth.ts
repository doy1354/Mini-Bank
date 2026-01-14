import { create } from 'zustand';
import { clearToken, getToken, setToken } from '../lib/token';
import * as api from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { resetSocket } from '../lib/realtime';

type AuthState = {
  token: string | null;
  user: api.User | null;
  loading: boolean;
  error: string | null;
  initFromStorage: () => void;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  initFromStorage: () => {
    const token = getToken();
    set({ token });
  },

  fetchMe: async () => {
    set({ loading: true, error: null });
    try {
      const user = await api.me();
      set({ user, loading: false });
    } catch (e: unknown) {
      set({
        user: null,
        loading: false,
        error: getErrorMessage(e) || 'Failed to load user',
      });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: getErrorMessage(e) || 'Login failed' });
    }
  },

  register: async (email, name, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register(email, name, password);
      setToken(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: getErrorMessage(e) || 'Registration failed' });
    }
  },

  logout: () => {
    clearToken();
    resetSocket();
    set({ token: null, user: null });
  },
}));


