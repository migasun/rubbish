<template>
  <q-ajax-bar

    position="bottom"
    color="accent"
    size="10px"

  />
  <q-page class="flex ">


    <q-pull-to-refresh @refresh="refresh">
      <div >
        <q-card >
          <q-card-section>
          今天 <q-badge color="secondary text-h5" >{{inService}} </q-badge>
          </q-card-section>
          <q-separator></q-separator>

          <!-- 中午清運路線狀態 -->
          <q-card-section>
            <div class="text-h6 q-mb-md">🌞 中午清運路線</div>
            <StationStatus
              :home-point="home_point24"
              :arrival-point="arrival_point24"
              :is-late="isLate24"
              :arrival-map="arrival_map24"
              :home-map="home_map24"
              :data-placemap="data24placemap"
              :total-stations="29"
            />
          </q-card-section>

          <q-separator></q-separator>

          <!-- 晚上清運路線狀態 -->
          <q-card-section>
            <div class="text-h6 q-mb-md">🌙 晚上清運路線</div>
            <StationStatus
              :home-point="home_point60"
              :arrival-point="arrival_point60"
              :is-late="isLate60"
              :arrival-map="arrival_map60"
              :home-map="home_map60"
              :data-placemap="data60placemap"
              :total-stations="29"
            />
          </q-card-section>

          <q-separator></q-separator>

          <!-- 新增的監看點 -->
          <template v-for="(w, idx) in extraWatchers" :key="idx">
            <q-card-section v-if="watchersStore.watchers.slice(2)[idx] && w && w.home_point">
              <div class="text-h6 q-mb-md">
                📍 {{ watchersStore.watchers.slice(2)[idx].label }}
              </div>
              <StationStatus
                :home-point="w.home_point?.value || {}"
                :arrival-point="w.arrival_point?.value || {}"
                :is-late="w.isLate?.value || 0"
                :arrival-map="w.arrival_map?.value || ''"
                :home-map="w.home_map?.value || ''"
                :data-placemap="w.dataPlacemap?.value || ''"
                :total-stations="29"
              />
            </q-card-section>
            <q-separator v-if="watchersStore.watchers.slice(2)[idx] && w && w.home_point"></q-separator>
          </template>
        </q-card>




      </div>
    </q-pull-to-refresh>




  </q-page>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'IndexPage'
})

</script>
<script setup>
import {onBeforeMount, ref, watch, onUnmounted} from "vue";
import axios from "axios";
import { API_BASE_URL } from "src/boot/axios";
import { useWatchersStore } from "src/stores/watchers";
import StationStatus from "src/components/StationStatus.vue";

const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v
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

// 初始化 extraWatchers 的函数
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
    // 只有当长度真正变化时才重新初始化
    if (newLength !== oldLength) {
      initializeExtraWatchers()
      // 延迟加载数据，确保组件状态稳定
      setTimeout(() => {
        loadData()
      }, 100)
    }
  }
);

onBeforeMount(() => {
  // 首次初始化
  initializeExtraWatchers()
  loadData()
  setInterval(loadData, 30000)

  // 監聽來自 MainLayout 的更新事件
  window.addEventListener('watcher-updated', (event) => {
    console.log('Received watcher update event:', event.detail)
    // 重新載入數據以反映更新
    loadData()
  })
})

// 在組件卸載時清理事件監聽器
onUnmounted(() => {
  window.removeEventListener('watcher-updated', loadData)
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
    inService.value = (schedule === '本日無清運') ? '本日無清運' : null
    inService.value = (schedule === '停止收運') ? '停止收運' : inService.value
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
}

const bar = ref(null)
</script>
<style>

</style>
