<template>
  <div class="watcher-selector">
    <v-card class="ma-4">
      <v-card-title>新增監看點</v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="12" md="5">
            <v-select
              v-model="selectedLineParam"
              :items="lineOptions"
              item-title="label"
              item-value="value"
              label="選擇路線"
              variant="outlined"
              @update:model-value="onLineChanged"
            ></v-select>
          </v-col>

          <v-col cols="12" md="5">
            <v-select
              v-model="selectedHomeId"
              :items="pointOptions"
              item-title="label"
              item-value="value"
              label="選擇監看點"
              variant="outlined"
              :loading="loadingPoints"
              :disabled="!selectedLineParam"
            ></v-select>
          </v-col>

          <v-col cols="12" md="2">
            <v-btn
              color="primary"
              @click="addWatcher"
              :disabled="!selectedLineParam || !selectedHomeId"
              block
              height="56"
            >
              新增
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'WatcherSelector',

  setup() {
    const watchersStore = useWatchersStore()
    const selectedLineParam = ref(null)
    const selectedHomeId = ref(null)
    const loadingPoints = ref(false)
    const pointOptions = ref([])

    const lineOptions = [
      { label: '中午清運路線', value: 'line24' },
      { label: '晚上清運路線', value: 'line60' }
    ]

    const onLineChanged = async (lineParam) => {
      selectedHomeId.value = null
      pointOptions.value = []
      
      if (!lineParam) return

      loadingPoints.value = true
      try {
        // 檢查 store 中是否已有緩存的點位數據
        if (watchersStore.availablePoints[lineParam] && watchersStore.availablePoints[lineParam].length > 0) {
          updatePointOptions(watchersStore.availablePoints[lineParam])
        } else {
          // 如果沒有，則調用 API 獲取
          const lineConfig = watchersStore.getLineConfig(lineParam)
          const response = await api.get('/', { params: { lineId: lineConfig.id } })
          const data = response.data
          
          let points = []
          if (data.line && data.line.points && data.line.points.point) {
            const rawPoints = Array.isArray(data.line.points.point) ? 
              data.line.points.point : [data.line.points.point]
              
            points = rawPoints.map(point => {
              return {
                homeId: parseInt(point.id?.['#text'] || point.id || 0),
                homeName: point.name?.['#text'] || point.name || '',
                schedule: point.schedule?.['#text'] || point.schedule || ''
              }
            }).filter(p => p.homeId > 0)
            
            // 更新 store
            watchersStore.setAvailablePoints(lineParam, points)
            updatePointOptions(points)
          }
        }
      } catch (error) {
        console.error('載入監看點失敗:', error)
      } finally {
        loadingPoints.value = false
      }
    }

    const updatePointOptions = (points) => {
      pointOptions.value = points.map(point => ({
        label: `${point.homeName} (${point.homeId})`,
        value: point.homeId
      }))
    }

    const addWatcher = () => {
      if (selectedLineParam.value && selectedHomeId.value) {
        // 查找選中的點位名稱
        const point = pointOptions.value.find(p => p.value === selectedHomeId.value)
        const label = point ? point.label : ''
        
        watchersStore.addWatcher(selectedLineParam.value, selectedHomeId.value, label)
        
        // 重置選擇
        selectedLineParam.value = null
        selectedHomeId.value = null
        pointOptions.value = []
      }
    }

    return {
      lineOptions,
      pointOptions,
      selectedLineParam,
      selectedHomeId,
      loadingPoints,
      onLineChanged,
      addWatcher
    }
  }
})
</script>
