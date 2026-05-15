import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  isReady: false,
  setUser: (user) => set({ user, isReady: true }),
  clearUser: () => set({ user: null, isReady: true }),
  setReady: () => set({ isReady: true }),
}));
