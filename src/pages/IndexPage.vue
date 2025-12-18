<template>
  <v-container class="index-page pa-0" fluid>
    <!-- Refresh Button -->
    <div class="d-flex justify-center my-2" v-if="showRefreshHint">
      <v-btn
        variant="text"
        color="primary"
        @click="handleRefreshClick"
        prepend-icon="mdi-refresh"
      >
        <small class="text-grey-darken-1">點擊更新垃圾車位置資訊</small>
      </v-btn>
    </div>

    <!-- Auto Reload Progress -->
    <div class="auto-reload-progress mb-4 px-4" v-if="showAutoReloadProgress">
      <v-card class="progress-card">
        <v-card-text class="pa-2">
          <div class="progress-content">
            <div class="progress-info d-flex align-center justify-center">
              <v-icon size="small" color="primary" class="mr-1">mdi-clock-outline</v-icon>
              <small class="text-grey-darken-1">{{ autoReloadCountdown }}秒後自動更新</small>
            </div>
            <v-progress-linear
              :model-value="autoReloadProgress * 100"
              color="primary"
              height="4"
              class="mt-1"
            ></v-progress-linear>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Status Overview -->
    <div class="status-overview px-4">
      <v-card class="status-card">
        <v-card-text class="text-center pa-4">
          <div class="service-status">
            <v-icon size="x-large" color="primary">mdi-truck-delivery</v-icon>
            <div class="status-text mt-2">
              <div class="text-h6">今日服務狀態</div>
              <v-chip :color="getServiceColor() === 'positive' ? 'success' : 'error'" class="mt-1 text-h6" label>
                {{ currentServiceStatus }}
              </v-chip>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Main Routes -->
    <div class="main-routes mt-4 px-4">
      <v-tabs
        v-model="activeTab"
        color="primary"
        align-tabs="center"
        grow
      >
        <v-tab value="noon">🌞 中午清運</v-tab>
        <v-tab value="evening">🌙 晚上清運</v-tab>
        <v-tab
          v-for="(watcher, idx) in extraWatchers"
          :key="`extra-${idx}`"
          :value="`extra-${idx}`"
          v-if="watchersStore.watchers.length > 2 && watchersStore.watchers[idx + 2]"
        >
          {{ getExtraTabLabel(idx) }}
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="mt-2" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
        <v-window-item value="noon">
          <RoutePanel
            route-name="中午清運路線"
            route-icon="mdi-weather-sunny"
            :route-data="data24"
            :home-point="home_point24"
            :arrival-point="arrival_point24"
            :is-late="isLate24"
            :arrival-map="arrival_map24"
            :home-map="home_map24"
            :data-placemap="data24placemap"
          />
        </v-window-item>

        <v-window-item value="evening">
          <RoutePanel
            route-name="晚上清運路線"
            route-icon="mdi-weather-night"
            :route-data="data60"
            :home-point="home_point60"
            :arrival-point="arrival_point60"
            :is-late="isLate60"
            :arrival-map="arrival_map60"
            :home-map="home_map60"
            :data-placemap="data60placemap"
          />
        </v-window-item>

        <v-window-item
          v-for="(w, idx) in extraWatchers"
          :key="`panel-${idx}`"
          :value="`extra-${idx}`"
          v-if="watchersStore.watchers.length > 2 && watchersStore.watchers[idx + 2]"
        >
          <RoutePanel
            :route-name="watchersStore.watchers[idx + 2]?.label || '未知路線'"
            route-icon="mdi-map-marker"
            :route-data="w.data?.value || {}"
            :home-point="w.home_point?.value || {}"
            :arrival-point="w.arrival_point?.value || {}"
            :is-late="w.isLate?.value || 0"
            :arrival-map="w.arrival_map?.value || ''"
            :home-map="w.home_map?.value || ''"
            :data-placemap="w.dataPlacemap?.value || ''"
          />
        </v-window-item>
      </v-window>
    </div>
  </v-container>
</template>

<script>
import { defineComponent, computed, onBeforeMount, ref, watch, onUnmounted } from 'vue'
import axios from "axios";
import { API_BASE_URL } from "src/boot/axios";
import { useWatchersStore } from "src/stores/watchers";
import StationStatus from "src/components/StationStatus.vue";
import StationsList from "src/components/StationsList.vue";
import RoutePanel from "src/components/RoutePanel.vue";

export default defineComponent({
  name: 'IndexPage',

  components: {
    StationStatus,
    StationsList,
    RoutePanel
  },

  setup() {
    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v
    const showRefreshHint = ref(true)
    const showAutoReloadProgress = ref(false)
    const autoReloadCountdown = ref(5)
    const autoReloadProgress = ref(0)
    const loading = ref(false)
    const data24 = ref({})
    const arrival24 = ref({})
    const arrival_point24 = ref({})
    const home_point24 = ref({})
    const arrival_map24 = ref("")
    const home_map24 = ref("")
    const isLate24 = ref(null);
    const data24placemap = ref("");
    const data60 = ref({})
    const arrival60 = ref({})
    const arrival_point60 = ref({})
    const home_point60 = ref({})
    const arrival_map60 = ref("")
    const home_map60 = ref("")
    const isLate60 = ref(null);
    const data60placemap = ref("");
    const inService = ref("有垃圾車");
    const watchersStore = useWatchersStore();
    const extraWatchers = ref([]);
    const activeTab = ref('noon');

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

    const currentServiceStatus = computed(() => {
      const homePoint = currentHomePoint.value
      const schedule = homePoint?.schedule?.['#text'] ?? homePoint?.schedule ?? ''

      if (schedule === '本日無清運') {
        return '本日無清運'
      } else if (schedule === '停止收運') {
        return '停止收運'
      } else {
        return schedule || '有垃圾車'
      }
    })

    function getDefaultTab() {
      const now = new Date()
      const hour = now.getHours()
      return hour < 16 ? 'noon' : 'evening'
    }

    function getServiceColor() {
      if (currentServiceStatus.value === '本日無清運' || currentServiceStatus.value === '停止收運') {
        return 'negative'
      }
      return 'positive'
    }

    function getExtraTabLabel(idx) {
      const watcher = watchersStore.watchers.slice(2)[idx]
      return watcher ? `📍 ${watcher.label.split(' - ')[0]}` : '未知路線'
    }

    function initializeExtraWatchers() {
      const extraCount = Math.max(0, watchersStore.watchers.length - 2);
      extraWatchers.value = Array.from({ length: extraCount }, () => ({
        data: ref({}),
        arrival: ref({}),
        arrival_point: ref({}),
        home_point: ref({}),
        arrival_map: ref(""),
        home_map: ref(""),
        isLate: ref(null),
        dataPlacemap: ref("")
      }));
    }

    watch(
      () => watchersStore.watchers.length,
      (newLength, oldLength) => {
        if (newLength !== oldLength) {
          initializeExtraWatchers()
          setTimeout(() => {
            loadData()
          }, 100)
        }
      }
    );

    let autoReloadTimer = null
    let countdownTimer = null
    const RELOAD_INTERVAL = 30

    function startAutoReloadCountdown() {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }

      showAutoReloadProgress.value = true
      autoReloadCountdown.value = 5
      autoReloadProgress.value = 0

      countdownTimer = setInterval(() => {
        autoReloadCountdown.value--
        autoReloadProgress.value = (5 - autoReloadCountdown.value) / 5

        if (autoReloadCountdown.value <= 0) {
          clearInterval(countdownTimer)
          countdownTimer = null
          showAutoReloadProgress.value = false
          loadData()
        }
      }, 1000)
    }

    onBeforeMount(() => {
      activeTab.value = getDefaultTab()
      initializeExtraWatchers()
      loadData()

      autoReloadTimer = setInterval(() => {
        startAutoReloadCountdown()
      }, (RELOAD_INTERVAL - 5) * 1000)

      window.addEventListener('watcher-updated', (event) => {
        console.log('Received watcher update event:', event.detail)
        loadData()
      })
    })

    onUnmounted(() => {
      window.removeEventListener('watcher-updated', loadData)
      if (autoReloadTimer) {
        clearInterval(autoReloadTimer)
      }
      if (countdownTimer) {
        clearInterval(countdownTimer)
      }
    })

    function refresh(done) {
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

        if (schedule === '本日無清運') {
          inService.value = '本日無清運'
        } else if (schedule === '停止收運') {
          inService.value = '停止收運'
        } else {
          inService.value = schedule || '有垃圾車'
        }
      }

      const placeText = data.value.place?.['#text'] ?? data.value.place ?? ''

      if (dataPlacemap && typeof dataPlacemap === 'object' && 'value' in dataPlacemap) {
        dataPlacemap.value = placeText
          ? `https://www.google.com/maps/place/${placeText}`
          : ''
      } else {
        console.warn('dataPlacemap is not a valid ref object:', dataPlacemap)
      }

      const aLon = arrival_point.value?.longitude?.['#text'] ?? arrival_point.value?.longitude ?? ''
      const aLat = arrival_point.value?.latitude?.['#text'] ?? arrival_point.value?.latitude ?? ''
      const hLon = home_point.value?.longitude?.['#text'] ?? home_point.value?.longitude ?? ''
      const hLat = home_point.value?.latitude?.['#text'] ?? home_point.value?.latitude ?? ''

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

      const arrivalRank = parseInt(arrival_point.value?.rank?.['#text'] ?? arrival_point.value?.rank ?? 0)
      const homeRank = parseInt(home_point.value?.rank?.['#text'] ?? home_point.value?.rank ?? 0)

      if (isLate && typeof isLate === 'object' && 'value' in isLate) {
        if (arrivalRank === 0 || homeRank === 0) {
          isLate.value = null
        } else {
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
          homeId: watchersStore.watchers[0]?.homeId || 894299,
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
          homeId: watchersStore.watchers[1]?.homeId || 995714,
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
        if (cfg) {
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

      window.dispatchEvent(new CustomEvent('auto-reload'))

      loading.value = false
    }

    const touchStartX = ref(0)
    const touchStartY = ref(0)
    const touchEndX = ref(0)
    const touchEndY = ref(0)
    const isSwiping = ref(false)
    const touchStartTime = ref(0)

    function handleTouchStart(e) {
      touchStartX.value = e.touches[0].clientX
      touchStartY.value = e.touches[0].clientY
      touchStartTime.value = Date.now()
      isSwiping.value = false
    }

    function handleTouchMove(e) {
      if (!touchStartX.value) return

      touchEndX.value = e.touches[0].clientX
      touchEndY.value = e.touches[0].clientY

      const deltaX = Math.abs(touchEndX.value - touchStartX.value)
      const deltaY = Math.abs(touchEndY.value - touchStartY.value)

      if (deltaX > 20 && deltaX > deltaY * 1.5) {
        isSwiping.value = true
        e.preventDefault()
      }
    }

    function handleTouchEnd() {
      const touchEndTime = Date.now()
      const touchDuration = touchEndTime - touchStartTime.value

      if (touchDuration < 100 || !isSwiping.value) {
        resetTouchState()
        return
      }

      const deltaX = touchEndX.value - touchStartX.value
      const deltaY = Math.abs(touchEndY.value - touchStartY.value)
      const minSwipeDistance = 50

      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
        if (deltaX < 0) {
          switchToNextTab()
        }
        else if (deltaX > 0) {
          switchToPreviousTab()
        }
      }

      resetTouchState()
    }

    function resetTouchState() {
      isSwiping.value = false
      touchStartX.value = 0
      touchStartY.value = 0
      touchEndX.value = 0
      touchEndY.value = 0
      touchStartTime.value = 0
    }

    function switchToNextTab() {
      const tabs = ['noon', 'evening', ...extraWatchers.value.map((_, idx) => `extra-${idx}`).filter((_, idx) => watchersStore.watchers.slice(2)[idx])]
      const currentIndex = tabs.indexOf(activeTab.value)
      const nextIndex = (currentIndex + 1) % tabs.length
      activeTab.value = tabs[nextIndex]
    }

    function switchToPreviousTab() {
      const tabs = ['noon', 'evening', ...extraWatchers.value.map((_, idx) => `extra-${idx}`).filter((_, idx) => watchersStore.watchers.slice(2)[idx])]
      const currentIndex = tabs.indexOf(activeTab.value)
      const previousIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
      activeTab.value = tabs[previousIndex]
    }

    function handleRefreshClick() {
      if (autoReloadTimer) {
        clearInterval(autoReloadTimer)
      }
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }

      refresh(() => {
        autoReloadTimer = setInterval(() => {
          startAutoReloadCountdown()
        }, (RELOAD_INTERVAL - 5) * 1000)
      })
    }

    return {
      unwrap,
      showRefreshHint,
      showAutoReloadProgress,
      autoReloadCountdown,
      autoReloadProgress,
      loading,
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
      activeTab,
      currentHomePoint,
      currentArrivalPoint,
      currentRouteData,
      currentServiceStatus,
      getServiceColor,
      getExtraTabLabel,
      refresh,
      loadData,
      handleRefreshClick,
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
  background-color: #f4f4f9;
  color: #333;
}

.status-overview {
  margin-bottom: 12px;
}

.status-card {
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.service-status {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.status-text {
  margin-top: 6px;
}

.main-routes {
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 8px;
}

.progress-card {
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

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
