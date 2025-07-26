import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWatchersStore = defineStore('watchers', () => {
  const watchers = ref([
    { lineParam: 'line24', homeId: 894299, label: '中午' },
    { lineParam: 'line60', homeId: 995714, label: '晚上' }
  ])

  function addWatcher(lineParam, homeId) {
    watchers.value.push({ lineParam, homeId })
  }

  function updateWatcher(lineParam, homeId) {
    const target = watchers.value.find(w => w.lineParam === lineParam)
    if (target) {
      target.homeId = homeId
    }
  }

  return { watchers, addWatcher, updateWatcher }
})
