import { create } from "zustand";

const persistTokens = ({ accessToken, refreshToken, token }) => {
  const access = accessToken || token;
  if (access) localStorage.setItem("token", access);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};

export const useAuthStore = create((set) => ({
  user: null,
  isReady: false,
  setUser: (user) => set({ user, isReady: true }),
  setSession: ({ user, accessToken, refreshToken, token }) => {
    persistTokens({ accessToken, refreshToken, token });
    set({ user, isReady: true });
  },
  clearUser: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    set({ user: null, isReady: true });
  },
  setReady: () => set({ isReady: true }),
}));
