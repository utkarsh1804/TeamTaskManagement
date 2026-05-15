import { create } from "zustand";

const getInitialDark = () => {
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const useThemeStore = create((set) => ({
  dark: getInitialDark(),
  toggle: () =>
    set((state) => {
      const next = !state.dark;
      localStorage.setItem("theme", next ? "dark" : "light");
      return { dark: next };
    }),
  setDark: (value) => {
    localStorage.setItem("theme", value ? "dark" : "light");
    set({ dark: value });
  },
}));
