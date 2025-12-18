import axios from 'axios'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
// Base URL for the backend proxy.
// If `VITE_API_BASE_URL` is provided it takes precedence. Otherwise, use the
// development server when running `quasar dev` and the deployed worker when
// building for production.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8787'
    : 'https://steep-smoke-0e4c.vega-0b1.workers.dev')

const api = axios.create({ baseURL: API_BASE_URL })

// Add interceptor for error handling if needed
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export { api, axios, API_BASE_URL }
