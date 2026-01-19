import { ref, computed, onUnmounted } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from 'src/boot/axios'
import { useWatchersStore } from 'src/stores/watchers'

/**
 * 解包 XML 格式的值
 * @param {any} v - 可能包含 '#text' 屬性的值
 * @returns {any} - 解包後的值
 */
export function unwrap(v) {
  return (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v
}

/**
 * 路線數據管理 composable
 * @param {Object} options - 配置選項
 * @param {number} options.reloadInterval - 自動重新載入間隔（秒）
 * @returns {Object} - 路線數據和方法
 */
export function useRouteData(options = {}) {
  const { reloadInterval = 30 } = options
  const watchersStore = useWatchersStore()

  // 狀態
  const loading = ref(false)
  const showAutoReloadProgress = ref(false)
  const autoReloadCountdown = ref(5)
  const autoReloadProgress = ref(0)

  // 中午路線數據
  const data24 = ref({})
  const arrival24 = ref({})
  const arrival_point24 = ref({})
  const home_point24 = ref({})
  const arrival_map24 = ref('')
  const home_map24 = ref('')
  const isLate24 = ref(null)
  const data24placemap = ref('')

  // 晚上路線數據
  const data60 = ref({})
  const arrival60 = ref({})
  const arrival_point60 = ref({})
  const home_point60 = ref({})
  const arrival_map60 = ref('')
  const home_map60 = ref('')
  const isLate60 = ref(null)
  const data60placemap = ref('')

  // 服務狀態
  const inService = ref('有垃圾車')

  // 額外監看點
  const extraWatchers = ref([])

  // 計時器
  let autoReloadTimer = null
  let countdownTimer = null

  /**
   * 初始化額外監看點
   */
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

  /**
   * 載入單一路線數據
   */
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
    const lineConfig = watchersStore.getLineConfig(lineParam)
    const res = await axios.get(`${API_BASE_URL}?lineId=${lineConfig.id}`)
    data.value = res.data.line

    const arrivalIdx = parseInt(unwrap(data.value.arrival) ?? 0)
    if (arrivalIdx > 0 && data.value.points?.point && data.value.points.point[arrivalIdx - 1]) {
      arrival.value = arrivalIdx
      arrival_point.value = data.value.points.point[arrivalIdx - 1]
    } else {
      arrival_point.value = {}
    }

    home_point.value = {}

    if (data.value.points?.point) {
      data.value.points.point.forEach(item => {
        if (parseInt(unwrap(item.id)) === homeId) {
          home_point.value = item
        }
      })
    }

    if (updateService) {
      const schedule = unwrap(home_point.value.schedule) ?? ''
      if (schedule === '本日無清運') {
        inService.value = '本日無清運'
      } else if (schedule === '停止收運') {
        inService.value = '停止收運'
      } else {
        inService.value = schedule || '有垃圾車'
      }
    }

    const placeText = unwrap(data.value.place) ?? ''
    if (dataPlacemap && typeof dataPlacemap === 'object' && 'value' in dataPlacemap) {
      dataPlacemap.value = placeText ? `https://www.google.com/maps/place/${placeText}` : ''
    }

    const aLon = unwrap(arrival_point.value?.longitude) ?? ''
    const aLat = unwrap(arrival_point.value?.latitude) ?? ''
    const hLon = unwrap(home_point.value?.longitude) ?? ''
    const hLat = unwrap(home_point.value?.latitude) ?? ''

    if (arrival_map && typeof arrival_map === 'object' && 'value' in arrival_map) {
      arrival_map.value = aLon && aLat
        ? `https://maps.nlsc.gov.tw/go/${aLon}/${aLat}/15/EMAP_B/DMAPS,ROAD`
        : ''
    }

    if (home_map && typeof home_map === 'object' && 'value' in home_map) {
      home_map.value = hLon && hLat
        ? `https://maps.nlsc.gov.tw/go/${hLon}/${hLat}/15/EMAP_B/DMAPS,ROAD`
        : ''
    }

    const arrivalRank = parseInt(unwrap(arrival_point.value?.rank) ?? 0)
    const homeRank = parseInt(unwrap(home_point.value?.rank) ?? 0)

    if (isLate && typeof isLate === 'object' && 'value' in isLate) {
      if (arrivalRank === 0 || homeRank === 0) {
        isLate.value = null
      } else {
        isLate.value = arrivalRank - homeRank
      }
    }
  }

  /**
   * 載入所有路線數據
   */
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

  /**
   * 開始自動重新載入倒數計時
   */
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

  /**
   * 啟動自動重新載入
   */
  function startAutoReload() {
    autoReloadTimer = setInterval(() => {
      startAutoReloadCountdown()
    }, (reloadInterval - 5) * 1000)
  }

  /**
   * 停止自動重新載入
   */
  function stopAutoReload() {
    if (autoReloadTimer) {
      clearInterval(autoReloadTimer)
      autoReloadTimer = null
    }
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  /**
   * 手動刷新並重置計時器
   */
  function refresh(done) {
    stopAutoReload()
    loadData().finally(() => {
      startAutoReload()
      if (done) done()
    })
  }

  // 組件卸載時清理
  onUnmounted(() => {
    stopAutoReload()
  })

  return {
    // 狀態
    loading,
    showAutoReloadProgress,
    autoReloadCountdown,
    autoReloadProgress,
    inService,

    // 中午路線
    data24,
    arrival24,
    arrival_point24,
    home_point24,
    arrival_map24,
    home_map24,
    isLate24,
    data24placemap,

    // 晚上路線
    data60,
    arrival60,
    arrival_point60,
    home_point60,
    arrival_map60,
    home_map60,
    isLate60,
    data60placemap,

    // 額外監看點
    extraWatchers,

    // 方法
    unwrap,
    initializeExtraWatchers,
    loadData,
    startAutoReload,
    stopAutoReload,
    refresh
  }
}
