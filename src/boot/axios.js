import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { Notify } from 'quasar'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
// Base URL for the backend proxy.
// If `VITE_API_BASE_URL` is provided it takes precedence. Otherwise, use the deployed worker.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 
  'https://steep-smoke-0e4c.vega-0b1.workers.dev'

const api = axios.create({ baseURL: API_BASE_URL })

export default boot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status >= 500) {
        Notify.create({
          icon: 'error',
          color: 'negative',
          position: 'top',
          message: `後端服務器錯誤 (代碼: ${error.response.status})`,
          caption: error.message,
          multiLine: true,
          actions: [{ icon: 'close', color: 'white', round: true }]
        })
      } else if (!error.response) {
        Notify.create({
          icon: 'wifi_off',
          color: 'warning',
          textColor: 'dark',
          position: 'top',
          message: '網路連線錯誤',
          caption: '無法連線至伺服器，請檢查您的網路連線。',
          multiLine: true,
          actions: [{ icon: 'close', color: 'dark', round: true }]
        })
      }
      return Promise.reject(error)
    }
  )
})

export { api, API_BASE_URL }
