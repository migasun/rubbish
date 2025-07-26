import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWatchersStore = defineStore('watchers', () => {
  // 路线配置 - 可以轻松修改路线ID
  const lineConfigs = ref({
    line24: { id: '235024', label: '中午清运路线', defaultHomeId: 894299 },
    line60: { id: '235060', label: '晚上清运路线', defaultHomeId: 995714 }
  })

  const watchers = ref([
    { lineParam: 'line24', homeId: 894299, label: '中午' },
    { lineParam: 'line60', homeId: 995714, label: '晚上' }
  ])

  // 存储各路线的监看点数据
  const availablePoints = ref({})

  function addWatcher(lineParam, homeId, label = '') {
    watchers.value.push({ lineParam, homeId, label })
  }

  function removeWatcher(index) {
    if (index >= 2) { // 保护默认的两个监看点
      watchers.value.splice(index, 1)
    }
  }

  function updateWatcher(lineParam, homeId) {
    const target = watchers.value.find(w => w.lineParam === lineParam)
    if (target) {
      target.homeId = homeId
    }
  }

  function setAvailablePoints(lineParam, points) {
    availablePoints.value[lineParam] = points
  }

  function getLineConfig(lineParam) {
    return lineConfigs.value[lineParam]
  }

  function updateLineConfig(lineParam, config) {
    lineConfigs.value[lineParam] = { ...lineConfigs.value[lineParam], ...config }
  }

  return {
    watchers,
    lineConfigs,
    availablePoints,
    addWatcher,
    removeWatcher,
    updateWatcher,
    setAvailablePoints,
    getLineConfig,
    updateLineConfig
  }
})
