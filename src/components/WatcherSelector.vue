<template>
  <div class="watcher-selector">
    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6">新增監看點</div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col-12 col-md-5">
            <q-select
              v-model="selectedLineParam"
              :options="lineOptions"
              option-value="value"
              option-label="label"
              label="選擇路線"
              outlined
              emit-value
              map-options
              @update:model-value="onLineChanged"
            />
          </div>

          <div class="col-12 col-md-5">
            <q-select
              v-model="selectedHomeId"
              :options="pointOptions"
              option-value="value"
              option-label="label"
              label="選擇監看點"
              outlined
              emit-value
              map-options
              :loading="loadingPoints"
              :disable="!selectedLineParam"
            />
          </div>

          <div class="col-12 col-md-2">
            <q-btn
              color="primary"
              label="新增"
              @click="addWatcher"
              :disable="!selectedLineParam || !selectedHomeId"
              class="full-width"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'

export default defineComponent({
  name: 'WatcherSelector',

  setup() {
    const watchersStore = useWatchersStore()
    const selectedLineParam = ref('')
    const selectedHomeId = ref('')
    const loadingPoints = ref(false)
    const availablePoints = ref({})

    const lineOptions = computed(() => {
      return Object.entries(watchersStore.lineConfigs).map(([key, config]) => ({
        value: key,
        label: config.label
      }))
    })

    const pointOptions = computed(() => {
      if (!selectedLineParam.value || !availablePoints.value[selectedLineParam.value]) {
        return []
      }

      return availablePoints.value[selectedLineParam.value].map(point => {
        let label = `${point.homeName} - ${point.schedule}`

        // 如果是當前垃圾車位置，添加特殊標記
        if (point.isCurrentLocation) {
          label = `🚛 ${point.homeName} - ${point.schedule} (垃圾車目前位置)`
        }

        label += ` (ID: ${point.homeId})`

        return {
          value: point.homeId,
          label: label
        }
      })
    })

    // 根據環境設定 API 基礎網址
    const getApiBaseUrl = () => {
      return import.meta.env.VITE_API_BASE_URL ||
        (import.meta.env.DEV
          ? 'http://localhost:8787'
          : 'https://steep-smoke-0e4c.vega-0b1.workers.dev')
    }

    async function loadPointsForLine(lineParam) {
      if (!lineParam) return

      loadingPoints.value = true
      try {
        const lineConfig = watchersStore.getLineConfig(lineParam)
        const apiBaseUrl = getApiBaseUrl()

        console.log(`Loading points for ${lineParam}, API: ${apiBaseUrl}/?lineId=${lineConfig.id}`)

        // 使用環境相應的 API 網址
        const response = await fetch(`${apiBaseUrl}/?lineId=${lineConfig.id}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('API response:', data)
        console.log('Complete data structure:', JSON.stringify(data, null, 2))

        // 加強數據結構分析
        function analyzeDataStructure(obj, path = '') {
          const analysis = []
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key
            analysis.push(`${currentPath}: ${typeof value} ${Array.isArray(value) ? `(array length: ${value.length})` : ''}`)

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              analysis.push(...analyzeDataStructure(value, currentPath))
            } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
              analysis.push(`  Sample item in ${currentPath}:`, ...analyzeDataStructure(value[0], `${currentPath}[0]`))
            }
          }
          return analysis
        }

        const structureAnalysis = analyzeDataStructure(data)
        console.log('Data structure analysis:', structureAnalysis)

        // 獲取當前垃圾車位置（arrival 站點編號）
        const currentArrivalRank = parseInt(data.line?.arrival?.['#text'] || data.line?.arrival || 0)
        console.log('Current truck location (arrival rank):', currentArrivalRank)

        // 修正數據結構解析邏輯 - 針對實際的 API 結構
        let homes = []

        // 根據實際的 API 結構解析監看點
        if (data.line && data.line.points && data.line.points.point) {
          console.log('Found points in data.line.points.point')
          const points = Array.isArray(data.line.points.point) ?
            data.line.points.point : [data.line.points.point]

          console.log('Raw points from API:', points)

          homes = points.map(point => {
            const pointRank = parseInt(point.rank?.['#text'] || point.rank || 0)
            const isCurrentLocation = pointRank === currentArrivalRank

            // 檢查 arrival 欄位是否包含垃圾車圖示標記
            const arrivalText = point.arrival?.['#text'] || point.arrival || ''
            const hasCarIcon = arrivalText.includes('Icon_CarS.png') || arrivalText.includes('now-at')

            return {
              // 從 #text 屬性中提取實際值
              id: point.id?.['#text'],
              name: point.name?.['#text'],
              schedule: point.schedule?.['#text'],
              arrival: point.arrival?.['#text'],
              rank: point.rank?.['#text'],
              longitude: point.longitude?.['#text'],
              latitude: point.latitude?.['#text'],
              fixedPoint: point.fixedPoint?.['#text'],
              // 新增：標記當前垃圾車位置
              isCurrentLocation: isCurrentLocation || hasCarIcon,
              currentLocationStatus: isCurrentLocation || hasCarIcon ? '🚛 垃圾車目前位置' : '',
              // 保留原始數據
              raw: point
            }
          })
        }
        // 備用搜尋邏輯（保留原有的深度搜尋作為後備）
        else {
          console.log('Using fallback deep search...')
          // 函數：遞歸搜尋所有可能的監看點數據
          function deepFindHomes(obj, currentPath = '') {
            const foundHomes = []

            if (!obj || typeof obj !== 'object') return foundHomes

            // 檢查當前對象是否就是一個 home 對象
            if (obj['@attributes'] && obj['@attributes'].id) {
              console.log(`Found potential home at ${currentPath}:`, obj)
              foundHomes.push(obj)
              return foundHomes
            }

            // 遍歷所有屬性
            for (const [key, value] of Object.entries(obj)) {
              const newPath = currentPath ? `${currentPath}.${key}` : key

              if (value === null || value === undefined) continue

              // 如果是數組
              if (Array.isArray(value)) {
                console.log(`Checking array at ${newPath}, length: ${value.length}`)
                value.forEach((item, index) => {
                  if (typeof item === 'object' && item !== null) {
                    foundHomes.push(...deepFindHomes(item, `${newPath}[${index}]`))
                  }
                })
              }
              // 如果是對象
              else if (typeof value === 'object') {
                // 檢查是否包含 home 相關的關鍵字
                if (key.toLowerCase().includes('home') ||
                    key.toLowerCase().includes('point') ||
                    key.toLowerCase().includes('station')) {
                  console.log(`Found potential homes container at ${newPath}:`, value)
                  if (Array.isArray(value)) {
                    foundHomes.push(...value)
                  } else {
                    foundHomes.push(value)
                  }
                } else {
                  // 繼續遞歸搜尋
                  foundHomes.push(...deepFindHomes(value, newPath))
                }
              }
            }

            return foundHomes
          }

          homes = deepFindHomes(data.line)
        }

        console.log('All found potential homes:', homes)

        if (homes.length > 0) {
          const points = homes.map(home => {
            // 處理新的 API 數據格式（從 #text 屬性中提取值）
            let id, name, schedule;

            if (home.id && home.name && home.schedule) {
              // 新的 API 格式：從 #text 屬性中提取
              id = home.id;
              name = home.name;
              schedule = home.schedule || home.arrival;
            } else {
              // 舊格式的備用處理
              const attributes = home['@attributes'] || home.attributes || home
              id = attributes?.id || home.id || home.homeId
              name = attributes?.name || home.name || home.homeName || `監看點 ${id}`
              schedule = attributes?.schedule || home.schedule || home.arrival
            }

            return {
              homeId: parseInt(id || 0),
              homeName: name || `監看點 ${id}`,
              schedule: schedule || '時程未定',
              status: home.status || '未知',
              rank: home.rank || '',
              longitude: home.longitude || '',
              latitude: home.latitude || '',
              // 新增：當前位置標記
              isCurrentLocation: home.isCurrentLocation || false,
              currentLocationStatus: home.currentLocationStatus || '',
              // 保留原始數據以供調試
              raw: home
            }
          }).filter(point => point.homeId > 0) // 過濾掉無效的 homeId

          console.log('Processed points with schedule:', points)

          availablePoints.value[lineParam] = points
          watchersStore.setAvailablePoints(lineParam, points)
        } else {
          console.warn('No homes found in data structure:', data)
          availablePoints.value[lineParam] = []

          // 在開發環境提供模擬數據
          if (import.meta.env.DEV) {
            console.log('Using mock data for development - no homes found')
            const mockPoints = [
              { homeId: 894299, homeName: '預設監看點1', status: '正常' },
              { homeId: 995714, homeName: '預設監看點2', status: '正常' },
              { homeId: 123456, homeName: '測試監看點', status: '測試' }
            ]
            availablePoints.value[lineParam] = mockPoints
            watchersStore.setAvailablePoints(lineParam, mockPoints)
          }
        }
      } catch (error) {
        console.error('載入監看點失敗:', error)
        availablePoints.value[lineParam] = []

        // 如果是開發環境且 API 調用失敗，使用模擬數據
        if (import.meta.env.DEV) {
          console.log('Using mock data for development - API error')
          const mockPoints = [
            { homeId: 894299, homeName: '預設監看點1', status: '正常' },
            { homeId: 995714, homeName: '預設監看點2', status: '正常' },
            { homeId: 123456, homeName: '測試監看點', status: '測試' }
          ]
          availablePoints.value[lineParam] = mockPoints
          watchersStore.setAvailablePoints(lineParam, mockPoints)
        }
      } finally {
        loadingPoints.value = false
      }
    }

    function onLineChanged(lineParam) {
      selectedHomeId.value = ''
      if (lineParam) {
        loadPointsForLine(lineParam)
      }
    }

    function addWatcher() {
      if (selectedLineParam.value && selectedHomeId.value) {
        const lineConfig = watchersStore.getLineConfig(selectedLineParam.value)
        const point = availablePoints.value[selectedLineParam.value]?.find(
          p => p.homeId === selectedHomeId.value
        )

        watchersStore.addWatcher(
          selectedLineParam.value,
          selectedHomeId.value,
          `${lineConfig.label} - ${point?.homeName || selectedHomeId.value}`
        )

        // 重置選擇
        selectedLineParam.value = ''
        selectedHomeId.value = ''
      }
    }

    // 初始化載入預設路線的監看點
    onMounted(() => {
      Object.keys(watchersStore.lineConfigs).forEach(lineParam => {
        loadPointsForLine(lineParam)
      })
    })

    return {
      selectedLineParam,
      selectedHomeId,
      loadingPoints,
      lineOptions,
      pointOptions,
      onLineChanged,
      addWatcher
    }
  }
})
</script>

<style scoped>
.watcher-selector {
  width: 100%;
}
</style>
