import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
  // 生產環境優化：移除 console.log
  if (import.meta.env.PROD) {
    console.log = () => {}
    console.debug = () => {}
    console.info = () => {}
  }

  // 全局錯誤處理
  app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err)
    console.error('Error info:', info)
    // 可發送到錯誤追蹤服務
    // 例如: Sentry, LogRocket 等
  }

  // 警告處理（僅開發環境）
  if (import.meta.env.DEV) {
    app.config.warnHandler = (msg, instance, trace) => {
      console.warn('Vue warning:', msg)
      if (trace) {
        console.warn('Trace:', trace)
      }
    }
  }
})
