import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
};

const performRefresh = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    const body = refreshToken ? { refreshToken } : {};
    const { data } = await axios.post(`${baseURL}/auth/refresh`, body, {
      withCredentials: true,
    });
    if (data?.accessToken) localStorage.setItem("token", data.accessToken);
    if (data?.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    return data?.accessToken || null;
  } catch {
    clearSession();
    return null;
  }
};

const isAuthPath = () => {
  const path = window.location.pathname;
  return path === "/login" || path === "/admin-login" || path === "/register" || path.startsWith("/invite/");
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error?.response?.status;
    const url = original.url || "";
    const isRefreshCall = url.includes("/auth/refresh");
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !original._retried && !isRefreshCall && !isAuthCall) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    if (status === 401 && !isAuthCall) {
      clearSession();
      if (!isAuthPath()) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { clearSession };
