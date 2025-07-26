// 測試 API 回應結構
fetch('https://steep-smoke-0e4c.vega-0b1.workers.dev/?lineId=235024')
  .then(response => response.json())
  .then(data => {
    console.log('完整 API 回應:', JSON.stringify(data, null, 2))

    // 查找所有可能包含監看點信息的屬性
    function findAllKeys(obj, path = '') {
      const keys = []
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key
        keys.push(currentPath)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys.push(...findAllKeys(value, currentPath))
        }
      }
      return keys
    }

    const allKeys = findAllKeys(data)
    console.log('所有可用的屬性路徑:', allKeys)

    // 尋找包含 schedule 或時程相關的信息
    const scheduleKeys = allKeys.filter(key =>
      key.toLowerCase().includes('schedule') ||
      key.toLowerCase().includes('time') ||
      key.toLowerCase().includes('hour') ||
      key.toLowerCase().includes('minute')
    )
    console.log('時程相關屬性:', scheduleKeys)
  })
  .catch(error => console.error('API 錯誤:', error))

