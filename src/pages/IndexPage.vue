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
          <q-card-section>
            中午 {{ unwrap(home_point24.name) }} <br>
            排班 <q-badge color="secondary text-h5" > {{ unwrap(home_point24.schedule) }}</q-badge><br>
            預計 <q-badge color="secondary text-h5" >{{ unwrap(home_point24.arrival) }}到達</q-badge><br>

            <span v-if="isLate24 > 0 ">站點 <q-badge color="secondary text-h5" >離開{{isLate24}}站</q-badge></span>
            <span v-else-if="isLate24 === 0 ">站點  <q-badge color="secondary text-h5" >到了</q-badge></span>
            <span v-else>
              <template v-if="isLate24">
                站點 <q-badge color="primary text-h5" >還有{{-isLate24}}站</q-badge>
                <q-linear-progress size="50px" :value="-isLate24" color="accent" class="q-mt-sm">
                  <div class="absolute-full flex flex-center">
                    <q-badge color="white" text-color="accent" :label="unwrap(arrival_point24.name)" />
                  </div>
                </q-linear-progress>
              </template>
            </span>
            <br>
            <br>


            <br>
            <a v-if="arrival_map24" :href="arrival_map24" target="_blank">到達位置地圖 {{ unwrap(arrival_point24.longitude) }}/{{ unwrap(arrival_point24.latitude) }}</a><br>
            <span v-if="data24placemap">
              GPS定位:<a :href="data24placemap" target="_blank">{{ unwrap(data24.place) }}</a>
            </span><br>
            <br>
          </q-card-section>
          <q-separator></q-separator>
          <q-card-section>
            晚上 {{ unwrap(home_point60.name) }} <br>
            排班 <q-badge color="secondary text-h5" > {{ unwrap(home_point60.schedule) }}</q-badge><br>
            預計 <q-badge color="secondary text-h5" >{{ unwrap(home_point60.arrival) }}到達</q-badge><br>
            <span v-if="isLate60 > 0 ">站點 <q-badge color="secondary text-h5" >離開{{isLate60}}站</q-badge></span>
            <span v-else-if="isLate60 === 0 ">站點  <q-badge color="secondary text-h5" >到了</q-badge></span>
            <span v-else>
              <template v-if="isLate60">
                站點 <q-badge color="primary text-h5" >還有{{-isLate60}}站</q-badge>
                <q-linear-progress size="50px" :value="-isLate60" color="accent" class="q-mt-sm">
                  <div class="absolute-full flex flex-center">
                    <q-badge color="white" text-color="accent" :label="unwrap(arrival_point60.name)" />
                  </div>
                </q-linear-progress>
              </template>
            </span>

          </q-card-section>
          <q-card-section>
            <span v-if="data60placemap">
              GPS定位:<a :href="data60placemap" target="_blank">{{ unwrap(data60.place) }}</a>
            </span>
          </q-card-section>
          <q-separator></q-separator>
          <div v-for="(w, idx) in extraWatchers" :key="idx" class="col-12 col-md-6">
            <q-card-section>
              監看 {{ watchersStore.watchers.slice(2)[idx].lineParam }} {{ unwrap(w.home_point.name) }}<br>
              排班 <q-badge color="secondary">{{ unwrap(w.home_point.schedule) }}</q-badge><br>
              預計 <q-badge color="secondary">{{ unwrap(w.home_point.arrival) }}到達</q-badge><br>
              <span v-if="w.isLate > 0">站點 <q-badge color="secondary">離開{{ w.isLate }}站</q-badge></span>
              <span v-else-if="w.isLate === 0">站點 <q-badge color="secondary">到了</q-badge></span>
              <span v-else-if="w.isLate"><q-badge color="primary">還有{{ -w.isLate }}站</q-badge></span>
              <br><br>
              <a v-if="w.arrival_map" :href="w.arrival_map" target="_blank">到達位置地圖 {{ unwrap(w.arrival_point.longitude) }}/{{ unwrap(w.arrival_point.latitude) }}</a><br>
              <span v-if="w.dataPlacemap">
              GPS定位:<a :href="w.dataPlacemap" target="_blank">{{ unwrap(w.data.place) }}</a>
            </span>
            </q-card-section>
            <q-separator></q-separator>
          </div>




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
import {onBeforeMount, ref, watch} from "vue";
import axios from "axios";
import { API_BASE_URL } from "src/boot/axios";
import { useWatchersStore } from "src/stores/watchers";
// 參考 https://github.com/SmartCodeDavid/vue3-json-viewer/blob/master/readme_cn.md
import { JsonViewer } from "vue3-json-source-viewer"
import "vue3-json-source-viewer/dist/index.css"

const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v
const data24 = ref({})
const arrival24 = ref({})
const arrival_point24 = ref({})
const home_point24 = ref({})
const arrival_map24 = ref("")
const home_map24 = ref("")
const isLate24 = ref(null);
const data24placemap = ref({});
const data60 = ref({})
const arrival60 = ref({})
const arrival_point60 = ref({})
const home_point60 = ref({})
const arrival_map60 = ref("")
const home_map60 = ref("")
const isLate60 = ref(null);
const data60placemap = ref({});
const inService = ref("有垃圾車");
const watchersStore = useWatchersStore();
const extraWatchers = ref([]);

watch(
  () => watchersStore.watchers.length,
  () => {
    extraWatchers.value = watchersStore.watchers.slice(2).map(() => ({
      data: ref({}),
      arrival: ref({}),
      arrival_point: ref({}),
      home_point: ref({}),
      arrival_map: ref(""),
      home_map: ref(""),
      isLate: ref(null),
      dataPlacemap: ref("")
    }));
    loadData()
  },
  { immediate: true }
);
onBeforeMount(() => {
  loadData()
  setInterval(loadData, 30000)
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
  const res = await axios.get(`${API_BASE_URL}?${lineParam}=true`)
  data.value = res.data.line

  const arrivalIdx = parseInt(data.value.arrival?.['#text'] ?? data.value.arrival)
  if (arrivalIdx > 0) {
    arrival.value = arrivalIdx
    arrival_point.value = data.value.points.point[arrivalIdx - 1]
  }

  data.value.points.point.forEach(item => {
    if (parseInt(item.id?.['#text'] ?? item.id) === homeId) {
      home_point.value = item
    }
  })

  if (updateService) {
    inService.value = (home_point.value.schedule === '本日無清運') ? '本日無清運' : null
    inService.value = (home_point.value.schedule === '停止收運') ? '停止收運' : inService.value
  }

  dataPlacemap.value = data.value.place
    ? `https://www.google.com/maps/place/${data.value.place}`
    : ''
  const aLon = arrival_point.value.longitude?.['#text'] ?? arrival_point.value.longitude
  const aLat = arrival_point.value.latitude?.['#text'] ?? arrival_point.value.latitude
  const hLon = home_point.value.longitude?.['#text'] ?? home_point.value.longitude
  const hLat = home_point.value.latitude?.['#text'] ?? home_point.value.latitude
  arrival_map.value = aLon && aLat ?
    `https://maps.nlsc.gov.tw/go/${aLon}/${aLat}/15/EMAP_B/DMAPS,ROAD` : ''
  home_map.value = hLon && hLat ?
    `https://maps.nlsc.gov.tw/go/${hLon}/${hLat}/15/EMAP_B/DMAPS,ROAD` : ''

  isLate.value =
    parseInt(arrival_point.value.rank?.['#text'] ?? arrival_point.value.rank) -
    parseInt(home_point.value.rank?.['#text'] ?? home_point.value.rank)
}

async function loadData() {
  const tasks = [
    loadLineData({
      lineParam: 'line24',
      homeId: 894299,
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
      homeId: 995714,
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
  })
  await Promise.all(tasks)
}

const bar = ref(null)
</script>
<style>

</style>
