'use client';
import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  // True once hydrate() has run. Route guards must wait for this before
  // deciding to redirect, otherwise a logged-in user is briefly treated as
  // anonymous on first paint (the store starts empty until hydration).
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hasHydrated: false,

  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      // Non-sensitive presence marker so the server proxy can do a fast
      // pre-render redirect (it cannot read localStorage). The JWT is NOT
      // stored in this cookie — it's just a "logged in" flag.
      document.cookie = 'cl_auth=1; path=/; max-age=2592000; samesite=lax';
    }
    set({ user, accessToken });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      document.cookie = 'cl_auth=; path=/; max-age=0; samesite=lax';
    }
    set({ user: null, accessToken: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        set({ user: JSON.parse(userStr), accessToken: token });
      } catch {}
    }
    set({ hasHydrated: true });
  },
}));
