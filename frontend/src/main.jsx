import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App.jsx";
import "./index.css";
import AuthBootstrap from "@/components/AuthBootstrap";
import { useThemeStore } from "@/store/themeStore";

const queryClient = new QueryClient();

const ThemeSync = () => {
  const dark = useThemeStore((state) => state.dark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return null;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <ThemeSync />
      <App />
    </QueryClientProvider>
  </StrictMode>
);
