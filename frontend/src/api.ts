import axios from 'axios'

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(cb: () => void) {
  onUnauthorized = cb
}

export const api = axios.create({
  baseURL: 'http://localhost:3333',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (onUnauthorized) {
        onUnauthorized()
      }
    }

    const wrapped = new Error(error.message)
    return Promise.reject(wrapped)
  }
)
