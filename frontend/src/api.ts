import axios from 'axios'
import { useRouter } from 'vue-router'

const API_BASE_URL = 'http://localhost:3333'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
      console.warn('Unauthorized → redirect to login')
      localStorage.removeItem('token')

      const router = useRouter()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)
