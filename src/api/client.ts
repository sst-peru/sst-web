import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const ACCESS_KEY = "sst.access";
export const REFRESH_KEY = "sst.refresh";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  save(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = tokens.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Si el access token expiró, lo renueva una sola vez y reintenta la petición. */
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status !== 401 || original?._retried || !tokens.refresh) {
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      refreshing ??= axios
        .post<{ access: string }>(`${BASE_URL}/auth/refresh/`, { refresh: tokens.refresh })
        .then((r) => {
          tokens.save(r.data.access);
          return r.data.access;
        })
        .finally(() => {
          refreshing = null;
        });
      const access = await refreshing;
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      tokens.clear();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  },
);
