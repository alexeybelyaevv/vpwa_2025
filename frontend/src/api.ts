import axios from 'axios';

const fallbackHost =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}`
    : 'http://localhost';

console.log(fallbackHost, 'FALLBACK HOST');

const baseURL = import.meta.env.VITE_BASE_URL ?? `${fallbackHost}:3333`;

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(cb: () => void) {
  onUnauthorized = cb;
}

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    const wrapped = new Error(error.message);
    return Promise.reject(wrapped);
  },
);
