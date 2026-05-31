<template>
  <q-ajax-bar
    position="bottom"
    color="accent"
    size="10px"
  />
  <q-page class="index-page">
    <q-pull-to-refresh color="primary" @refresh="refresh">
      <div class="page-container">

        <!-- 下拉刷新提示 -->
        <div v-if="showRefreshHint" class="refresh-hint q-pa-sm text-center">
          <q-btn
            flat
            no-caps
            class="refresh-hint-btn"
            @click="handleRefreshClick"
          >
            <q-icon name="refresh" size="sm" color="primary" class="q-mr-xs" />
            <small class="text-grey-7">下拉可更新垃圾車位置資訊</small>
          </q-btn>
        </div>

        <!-- 自動重新載入進度條 -->
        <div v-if="showAutoReloadProgress" class="auto-reload-progress q-mb-sm">
          <q-card class="progress-card">
            <q-card-section class="q-pa-sm">
              <div class="progress-content">
                <div class="progress-info">
                  <q-icon name="schedule" size="sm" color="primary" class="q-mr-xs" />
                  <small class="text-grey-7">{{ autoReloadCountdown }}秒後自動更新</small>
                </div>
                <q-linear-progress
                  :value="autoReloadProgress"
                  color="primary"
                  size="4px"
                  class="q-mt-xs"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- 主要監看路線 -->
        <div class="main-routes">
          <div class="route-tabs">
            <q-tabs
              v-model="activeTab"
              class="route-tab-container"
              indicator-color="primary"
              active-color="primary"
              align="justify"
              dense
            >
              <q-tab name="noon" label="中午清運" class="route-tab" />
              <q-tab name="evening" label="晚上清運" class="route-tab" />
              <q-tab
                v-for="tab in extraWatcherTabs"
                :key="tab.name"
                :name="tab.name"
                :label="tab.label"
                class="route-tab"
              />
            </q-tabs>
          </div>

          <q-tab-panels
            v-model="activeTab"
            animated
            class="route-panels"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <!-- 中午路線 -->
            <q-tab-panel name="noon" class="route-panel">
                            <RoutePanel
                route-name="中午清運路線"
                route-icon="wb_sunny"
                :route-data="data24"
                :home-point="home_point24"
                :arrival-point="arrival_point24"
                :is-late="isLate24"
                :arrival-map="arrival_map24"
                :home-map="home_map24"
                :data-placemap="data24placemap"
                @map-interaction-change="handleMapInteractionChange"
                @refresh="handleRefreshClick"
              />
            </q-tab-panel>

            <!-- 晚上路線 -->
            <q-tab-panel name="evening" class="route-panel">
                            <RoutePanel
                route-name="晚上清運路線"
                route-icon="nights_stay"
                :route-data="data60"
                :home-point="home_point60"
                :arrival-point="arrival_point60"
                :is-late="isLate60"
                :arrival-map="arrival_map60"
                :home-map="home_map60"
                :data-placemap="data60placemap"
                @map-interaction-change="handleMapInteractionChange"
                @refresh="handleRefreshClick"
              />
            </q-tab-panel>

            <!-- 額外監看點 -->
            <q-tab-panel
              v-for="tab in extraWatcherTabs"
              :key="`panel-${tab.name}`"
              :name="tab.name"
              class="route-panel"
            >
                            <RoutePanel
                :route-name="tab.config?.label || '未知路線'"
                route-icon="location_on"
                :route-data="tab.watcher.data?.value || {}"
                :home-point="tab.watcher.home_point?.value || {}"
                :arrival-point="tab.watcher.arrival_point?.value || {}"
                :is-late="tab.watcher.isLate?.value || 0"
                :arrival-map="tab.watcher.arrival_map?.value || ''"
                :home-map="tab.watcher.home_map?.value || ''"
                :data-placemap="tab.watcher.dataPlacemap?.value || ''"
                @map-interaction-change="handleMapInteractionChange"
                @refresh="handleRefreshClick"
              />
            </q-tab-panel>
          </q-tab-panels>
        </div>

      </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { onBeforeMount, ref, watch, onUnmounted } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from 'src/boot/axios'
import { useWatchersStore } from 'src/stores/watchers'
import RoutePanel from 'src/components/RoutePanel.vue'

export default defineComponent({
  name: 'IndexPage',

  components: {
    RoutePanel
  },

  setup() {
    // 添加缺失的 showRefreshHint 變數
    const showRefreshHint = ref(true)
    const showAutoReloadProgress = ref(false) // 新增：自動重新載入進度條顯示狀態
    const autoReloadCountdown = ref(5) // 新增：倒數秒數
    const autoReloadProgress = ref(0) // 新增：進度條百分比
    const loading = ref(false) // 新增：loading 狀態
    const data24 = ref({})
    const arrival24 = ref({})
    const arrival_point24 = ref({})
    const home_point24 = ref({})
    const arrival_map24 = ref('')
    const home_map24 = ref('')
    const isLate24 = ref(null)
    const data24placemap = ref('')
    const data60 = ref({})
    const arrival60 = ref({})
    const arrival_point60 = ref({})
    const home_point60 = ref({})
    const arrival_map60 = ref('')
    const home_map60 = ref('')
    const isLate60 = ref(null)
    const data60placemap = ref('')
    const inService = ref('有垃圾車')
    const watchersStore = useWatchersStore()
    const extraWatchers = ref([])
    const mapInteractionLocked = ref(false)

    // 新增：Tab 狀態管理
    const activeTab = ref('noon')

    const extraWatcherTabs = computed(() => {
      return extraWatchers.value
        .map((watcher, idx) => {
          const config = watchersStore.watchers[idx + 2]
          if (!config) return null

          return {
            name: `extra-${idx}`,
            label: config.label ? config.label.split(' - ')[0] : '未知路線',
            config,
            watcher
          }
        })
        .filter(Boolean)
    })

    // 新增：動態計算當前 tab 的 home_point
    const currentHomePoint = computed(() => {
      if (activeTab.value === 'noon') {
        return home_point24.value
      } else if (activeTab.value === 'evening') {
        return home_point60.value
      } else if (activeTab.value.startsWith('extra-')) {
        const idx = parseInt(activeTab.value.replace('extra-', ''))
        return extraWatchers.value[idx]?.home_point?.value || {}
      }
      return {}
    })

    // 新增：動態計算當前 tab 的 arrival_point
    const currentArrivalPoint = computed(() => {
      if (activeTab.value === 'noon') {
        return arrival_point24.value
      } else if (activeTab.value === 'evening') {
        return arrival_point60.value
      } else if (activeTab.value.startsWith('extra-')) {
        const idx = parseInt(activeTab.value.replace('extra-', ''))
        return extraWatchers.value[idx]?.arrival_point?.value || {}
      }
      return {}
    })

    // 新增：動態計算當前 tab 的 route_data
    const currentRouteData = computed(() => {
      if (activeTab.value === 'noon') {
        return data24.value
      } else if (activeTab.value === 'evening') {
        return data60.value
      } else if (activeTab.value.startsWith('extra-')) {
        const idx = parseInt(activeTab.value.replace('extra-', ''))
        return extraWatchers.value[idx]?.data?.value || {}
      }
      return {}
    })

    // 新增：動態計算當前服務狀態（根據當前 tab 的 home_point）
    const currentServiceStatus = computed(() => {
      const homePoint = currentHomePoint.value
      const schedule = homePoint?.schedule?.['#text'] ?? homePoint?.schedule ?? ''

      if (schedule === '本日無清運') {
        return '本日無清運'
      } else if (schedule === '停止收運') {
        return '停止收運'
      } else {
        // 如果schedule为空或其他值，显示正常服务状态
        return schedule || '有垃圾車'
      }
    })

    // 新增：自動判斷當前時間應該顯示哪個 Tab
    function getDefaultTab() {
      const now = new Date()
      const hour = now.getHours()
      // 16:00 前顯示中午，16:00 後顯示晚上
      return hour < 16 ? 'noon' : 'evening'
    }

    // 新增：服務狀態顏色判斷（改為使用動態狀態）
    function getServiceColor() {
      if (currentServiceStatus.value === '本日無清運' || currentServiceStatus.value === '停止收運') {
        return 'negative'
      }
      return 'positive'
    }

    // 初始化 extraWatchers 的函数
    function initializeExtraWatchers() {
      const extraCount = Math.max(0, watchersStore.watchers.length - 2)
      extraWatchers.value = Array.from({ length: extraCount }, () => ({
        data: ref({}),
        arrival: ref({}),
        arrival_point: ref({}),
        home_point: ref({}),
        arrival_map: ref(''),
        home_map: ref(''),
        isLate: ref(null),
        dataPlacemap: ref('')
      }))
    }

    watch(
      () => watchersStore.watchers.length,
      (newLength, oldLength) => {
        // 只有当长度真正变化时才重新初始化
        if (newLength !== oldLength) {
          initializeExtraWatchers()
          // 延迟加载数据，确保组件状态稳定
          setTimeout(() => {
            loadData()
          }, 100)
        }
      }
    )

    // 新增：自動重新載入計時器相關變數
    let autoReloadTimer = null
    let countdownTimer = null
    const RELOAD_INTERVAL = 30 // 30秒間隔

    function clearAutoReloadTimers() {
      if (autoReloadTimer) {
        clearInterval(autoReloadTimer)
        autoReloadTimer = null
      }
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
      showAutoReloadProgress.value = false
      autoReloadCountdown.value = 5
      autoReloadProgress.value = 0
    }

    function scheduleAutoReloadTimer() {
      if (mapInteractionLocked.value) return

      if (autoReloadTimer) {
        clearInterval(autoReloadTimer)
      }

      autoReloadTimer = setInterval(() => {
        startAutoReloadCountdown()
      }, (RELOAD_INTERVAL - 5) * 1000) // 25秒後開始倒數
    }

    function handleMapInteractionChange(isOpen) {
      mapInteractionLocked.value = isOpen

      if (isOpen) {
        clearAutoReloadTimers()
        return
      }

      scheduleAutoReloadTimer()
    }

    // 新增：開始自動重新載入倒數計時
    function startAutoReloadCountdown() {
      if (mapInteractionLocked.value) return

      // 清除現有的倒數計時器，避免重複
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }

      showAutoReloadProgress.value = true
      autoReloadCountdown.value = 5 // 最後5秒顯示倒數
      autoReloadProgress.value = 0

      countdownTimer = setInterval(() => {
        autoReloadCountdown.value--
        autoReloadProgress.value = (5 - autoReloadCountdown.value) / 5

        if (autoReloadCountdown.value <= 0) {
          clearInterval(countdownTimer)
          countdownTimer = null
          showAutoReloadProgress.value = false
          if (!mapInteractionLocked.value) {
            loadData()
          }
        }
      }, 1000)
    }

    function handleWatcherUpdated(event) {
      console.log('Received watcher update event:', event.detail)
      loadData()
    }

    onBeforeMount(() => {
      // 設定預設 Tab（根據當前時間）
      activeTab.value = getDefaultTab()

      // 首次初始化
      initializeExtraWatchers()
      loadData()

      // 修改：改用新的計時器邏輯
      scheduleAutoReloadTimer()

      // 監聽來自 MainLayout 的更新事件
      window.addEventListener('watcher-updated', handleWatcherUpdated)
    })

    // 在組件卸載時清理事件監聽器和計時器
    onUnmounted(() => {
      window.removeEventListener('watcher-updated', handleWatcherUpdated)
      clearAutoReloadTimers()
    })

    function refresh(done) {
      if (mapInteractionLocked.value) {
        done()
        return
      }

      loadData().finally(done)
    }

    async function loadLineData({
      lineParam,
      homeId,
      data,
      arrival,
      arrival_point,
      home_point,
      arrival_map,
      home_map,
      isLate,
      dataPlacemap,
      updateService
    }) {
      // 使用新的 lineId 參數而不是舊的 line24/line60 參數
      const watchersStore = useWatchersStore()
      const lineConfig = watchersStore.getLineConfig(lineParam)
      const res = await axios.get(`${API_BASE_URL}?lineId=${lineConfig.id}`)
      data.value = res.data.line

      const arrivalIdx = parseInt(data.value.arrival?.['#text'] ?? data.value.arrival ?? 0)
      if (arrivalIdx > 0 && data.value.points?.point && data.value.points.point[arrivalIdx - 1]) {
        arrival.value = arrivalIdx
        arrival_point.value = data.value.points.point[arrivalIdx - 1]
      } else {
        arrival_point.value = {}
      }

      // 確保 home_point 有初始值
      home_point.value = {}

      if (data.value.points?.point) {
        data.value.points.point.forEach(item => {
          if (parseInt(item.id?.['#text'] ?? item.id) === homeId) {
            home_point.value = item
          }
        })
      }

      if (updateService) {
        const schedule = home_point.value.schedule?.['#text'] ?? home_point.value.schedule ?? ''


        // 修复服务状态逻辑
        if (schedule === '本日無清運') {
          inService.value = '本日無清運'
        } else if (schedule === '停止收運') {
          inService.value = '停止收運'
        } else {
          // 如果schedule为空或其他值，显示正常服务状态
          inService.value = schedule || '有垃圾車'
        }
      }

      // 修復 place 處理邏輯
      const placeText = data.value.place?.['#text'] ?? data.value.place ?? ''

      // 檢查 dataPlacemap 是否為有效的 ref 對象
      if (dataPlacemap && typeof dataPlacemap === 'object' && 'value' in dataPlacemap) {
        dataPlacemap.value = placeText
          ? `https://www.google.com/maps/place/${placeText}`
          : ''
      } else {
        console.warn('dataPlacemap is not a valid ref object:', dataPlacemap)
      }

      // 安全地提取經緯度數據，避免在空對象上訪問屬性
      const aLon = arrival_point.value?.longitude?.['#text'] ?? arrival_point.value?.longitude ?? ''
      const aLat = arrival_point.value?.latitude?.['#text'] ?? arrival_point.value?.latitude ?? ''
      const hLon = home_point.value?.longitude?.['#text'] ?? home_point.value?.longitude ?? ''
      const hLat = home_point.value?.latitude?.['#text'] ?? home_point.value?.latitude ?? ''

      // 檢查 arrival_map 和 home_map 是否為有效的 ref 對象
      if (arrival_map && typeof arrival_map === 'object' && 'value' in arrival_map) {
        arrival_map.value = aLon && aLat ?
          `https://maps.nlsc.gov.tw/go/${aLon}/${aLat}/15/EMAP_B/DMAPS,ROAD` : ''
      } else {
        console.warn('arrival_map is not a valid ref object:', arrival_map)
      }

      if (home_map && typeof home_map === 'object' && 'value' in home_map) {
        home_map.value = hLon && hLat ?
          `https://maps.nlsc.gov.tw/go/${hLon}/${hLat}/15/EMAP_B/DMAPS,ROAD` : ''
      } else {
        console.warn('home_map is not a valid ref object:', home_map)
      }

      // 安全地提取 rank 數據
      const arrivalRank = parseInt(arrival_point.value?.rank?.['#text'] ?? arrival_point.value?.rank ?? 0)
      const homeRank = parseInt(home_point.value?.rank?.['#text'] ?? home_point.value?.rank ?? 0)

      // 檢查 isLate 是否為有效的 ref 對象
      if (isLate && typeof isLate === 'object' && 'value' in isLate) {
        // 修复 isLate 的计算逻辑
        // arrivalRank = 0 表示垃圾车还没开始或者数据无效
        // arrivalRank < homeRank 表示垃圾车还没到达监看点
        // arrivalRank === homeRank 表示垃圾车刚好到达监看点
        // arrivalRank > homeRank 表示垃圾车已经离开监看点

        if (arrivalRank === 0 || homeRank === 0) {
          // 如果任一数值为0，表示数据不完整，设为未知状态
          isLate.value = null
        } else {
          // 计算差值：正数表示已离开几站，0表示刚到达，负数表示还差几站
          isLate.value = arrivalRank - homeRank
        }
      } else {
        console.warn('isLate is not a valid ref object:', isLate)
      }
    }

    async function loadData() {
      loading.value = true
      const tasks = [
        loadLineData({
          lineParam: 'line24',
          homeId: watchersStore.watchers[0]?.homeId || 894299, // 使用 store 中的動態值
          data: data24,
          arrival: arrival24,
          arrival_point: arrival_point24,
          home_point: home_point24,
          arrival_map: arrival_map24,
          home_map: home_map24,
          isLate: isLate24,
          dataPlacemap: data24placemap,
          updateService: true
        }),
        loadLineData({
          lineParam: 'line60',
          homeId: watchersStore.watchers[1]?.homeId || 995714, // 使用 store 中的動態值
          data: data60,
          arrival: arrival60,
          arrival_point: arrival_point60,
          home_point: home_point60,
          arrival_map: arrival_map60,
          home_map: home_map60,
          isLate: isLate60,
          dataPlacemap: data60placemap,
          updateService: false
        })
      ]
      extraWatchers.value.forEach((watcher, idx) => {
        const cfg = watchersStore.watchers.slice(2)[idx]
        if (cfg) { // 确保配置存在
          tasks.push(
            loadLineData({
              lineParam: cfg.lineParam,
              homeId: cfg.homeId,
              data: watcher.data,
              arrival: watcher.arrival,
              arrival_point: watcher.arrival_point,
              home_point: watcher.home_point,
              arrival_map: watcher.arrival_map,
              home_map: watcher.home_map,
              isLate: watcher.isLate,
              dataPlacemap: watcher.dataPlacemap,
              updateService: false
            })
          )
        }
      })
      await Promise.all(tasks)

      // 觸發 MainLayout 重新載入監看點選項
      window.dispatchEvent(new CustomEvent('auto-reload'))

      loading.value = false
    }

    const bar = ref(null)

    // 新增：手機滑動相關
    const touchStartX = ref(0)
    const touchStartY = ref(0)
    const touchEndX = ref(0)
    const touchEndY = ref(0)
    const isSwiping = ref(false)
    const touchStartTime = ref(0)

    // 新增：處理滑動開始
    function handleTouchStart(e) {
      if (mapInteractionLocked.value) return

      touchStartX.value = e.touches[0].clientX
      touchStartY.value = e.touches[0].clientY
      touchStartTime.value = Date.now()
      isSwiping.value = false
    }

    // 新增：處理滑動移動
    function handleTouchMove(e) {
      if (mapInteractionLocked.value) return
      if (!touchStartX.value) return

      touchEndX.value = e.touches[0].clientX
      touchEndY.value = e.touches[0].clientY

      const deltaX = Math.abs(touchEndX.value - touchStartX.value)
      const deltaY = Math.abs(touchEndY.value - touchStartY.value)

      // 只有当水平滑动距离大于垂直滑动距离且超过阈值时，才认为是滑动手势
      if (deltaX > 20 && deltaX > deltaY * 1.5) {
        isSwiping.value = true
        // 阻止默认的滚动行为
        e.preventDefault()
      }
    }

    // 新增：處理滑動結束
    function handleTouchEnd() {
      if (mapInteractionLocked.value) {
        resetTouchState()
        return
      }

      const touchEndTime = Date.now()
      const touchDuration = touchEndTime - touchStartTime.value

      // 如果触摸时间太短（小于100ms）或者没有标记为滑动，则忽略
      if (touchDuration < 100 || !isSwiping.value) {
        resetTouchState()
        return
      }

      const deltaX = touchEndX.value - touchStartX.value
      const deltaY = Math.abs(touchEndY.value - touchStartY.value)
      const minSwipeDistance = 50 // 最小滑动距离

      // 确保是水平滑动且距离足够
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
        // 左滑：切換到下一個 Tab
        if (deltaX < 0) {
          switchToNextTab()
        }
        // 右滑：切換到上一個 Tab
        else if (deltaX > 0) {
          switchToPreviousTab()
        }
      }

      resetTouchState()
    }

    // 新增：重置触摸状态
    function resetTouchState() {
      isSwiping.value = false
      touchStartX.value = 0
      touchStartY.value = 0
      touchEndX.value = 0
      touchEndY.value = 0
      touchStartTime.value = 0
    }

    // 新增：切換到下一個 Tab
    function switchToNextTab() {
      const tabs = ['noon', 'evening', ...extraWatcherTabs.value.map(tab => tab.name)]
      const currentIndex = tabs.indexOf(activeTab.value)
      const nextIndex = (currentIndex + 1) % tabs.length
      activeTab.value = tabs[nextIndex]
    }

    // 新增：切換到上一個 Tab
    function switchToPreviousTab() {
      const tabs = ['noon', 'evening', ...extraWatcherTabs.value.map(tab => tab.name)]
      const currentIndex = tabs.indexOf(activeTab.value)
      const previousIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
      activeTab.value = tabs[previousIndex]
    }

    // 新增：處理刷新按鈕點擊
    function handleRefreshClick() {
      // 重置自動重新載入計時器，避免衝突
      clearAutoReloadTimers()

      // 執行刷新
      refresh(() => {
        // 刷新完成後，重新啟動自動重新載入計時器
        scheduleAutoReloadTimer()
      })
    }

    return {
      // 數據
      showRefreshHint,
      showAutoReloadProgress, // 新增：自動重新載入進度條顯示狀態
      autoReloadCountdown, // 新增：倒數秒數
      autoReloadProgress, // 新增：進度條百分比
      loading, // 新增：loading 狀態
      data24,
      arrival24,
      arrival_point24,
      home_point24,
      arrival_map24,
      home_map24,
      isLate24,
      data24placemap,
      data60,
      arrival60,
      arrival_point60,
      home_point60,
      arrival_map60,
      home_map60,
      isLate60,
      data60placemap,
      inService,
      watchersStore,
      extraWatchers,
      extraWatcherTabs,
      mapInteractionLocked,
      activeTab,
      bar,
      // 新增：動態計算的當前 tab 數據
      currentHomePoint,
      currentArrivalPoint,
      currentRouteData,
      currentServiceStatus,

      // 方法
      getServiceColor,
      refresh,
      loadData,
      handleMapInteractionChange,
      handleRefreshClick, // 新增：刷新按鈕點擊處理函數
      // 新增：滑動相關方法
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      switchToNextTab,
      switchToPreviousTab
    }
  }
})
</script>
<style>
.index-page {
  /* 背景色和字體顏色 */
  background-color: #f4f4f9;
  color: #333;
  padding: 0; /* 移除頁面級別的默認 padding */
}

.page-container {
  /* 容器樣式 - 大幅減少間距 */
  max-width: 1200px;
  margin: 0 auto;
  padding: 6px; /* 從 16px 減少到 6px */
}

.status-overview {
  /* 頂部狀態卡片樣式 */
  margin-bottom: 8px; /* 進一步緊湊 */
}

.status-card {
  /* 狀態卡片內部樣式 */
  background-color: #ffffff;
  border-radius: 6px; /* 從 8px 減少 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08); /* 減少陰影 */
}

.service-status {
  /* 服務狀態區域樣式 */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.status-text {
  /* 狀態文字樣式 */
  margin-top: 6px; /* 從 8px 減少 */
}

.main-routes {
  /* 主要監看路線區域樣式 */
  background-color: #ffffff;
  border-radius: 6px; /* 從 8px 減少 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08); /* 減少陰影 */
  padding: 6px; /* 進一步緊湊 */
}

.route-tabs {
  /* 路線選項卡樣式 */
  margin-bottom: 4px; /* 進一步緊湊 */
}

.route-tab-container {
  /* 選項卡容器樣式 */
  background-color: #f9f9f9;
  border-radius: 6px; /* 從 8px 略減 */
}

.route-tab {
  /* 單個選項卡樣式 */
  border-radius: 6px; /* 從 8px 略減 */
}

.route-panels {
  /* 路線面板樣式 */
  padding: 0;
}

.route-panel {
  /* 單個路線面板樣式 */
  padding: 0; /* 移除內邊距，讓子組件自己控制 */
  border-top: none; /* 移除邊框，減少視覺干擾 */
}

.route-panel:first-child {
  /* 第一個路線面板的特殊樣式 */
  border-top: none;
}

.refresh-hint {
  /* 下拉刷新提示樣式 */
  position: relative;
  overflow: hidden;
  padding: 6px; /* 進一步緊湊 */
  border-radius: 6px; /* 從 8px 略減 */
  background-color: #f1f8e9;
  margin-bottom: 6px; /* 進一步緊湊 */
}

.auto-reload-progress {
  /* 自動重新載入進度條樣式 */
  margin-bottom: 6px; /* 進一步緊湊 */
}

.progress-card {
  /* 進度條卡片樣式 */
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 手機端進一步優化 */
@media (max-width: 600px) {
  .page-container {
    padding: 4px; /* 手機端進一步減少到 4px */
  }

  .status-overview {
    margin-bottom: 8px; /* 手機端進一步減少 */
  }

  .main-routes {
    padding: 4px; /* 手機端進一步減少 */
  }

  .route-tabs {
    margin-bottom: 4px; /* 手機端進一步減少 */
  }

  .refresh-hint {
    padding: 6px;
    margin-bottom: 6px;
  }
}

/* 移除 Quasar 默認的過大間距 */
.q-page {
  padding: 0 !important;
}

/* 優化 q-tab-panels 的間距 */
.q-tab-panels {
  background: transparent !important;
}

.q-tab-panel {
  padding: 0 !important;
}

/* 優化 q-card 的默認間距 */
.q-card + .q-card {
  margin-top: 8px; /* 卡片間的間距 */
}

/* 優化進度條區域 */
.progress-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>
