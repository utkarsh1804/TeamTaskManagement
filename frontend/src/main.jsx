import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import App from "./App.jsx";
import "./index.css";
import AuthBootstrap from "@/components/AuthBootstrap";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useThemeStore } from "@/store/themeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

const ThemeSync = () => {
  const dark = useThemeStore((state) => state.dark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return null;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap />
        <ThemeSync />
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "font-sans text-sm",
            },
          }}
          richColors
          closeButton
        />
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
