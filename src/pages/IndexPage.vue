<template>
  <q-ajax-bar

    position="bottom"
    color="accent"
    size="10px"

  />
  <q-page class="flex ">


    <q-pull-to-refresh @refresh="refresh">
      <q-card >
        <q-card-section>
        今天 <q-badge color="secondary text-h5" >{{inService}} </q-badge>
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          中午<br>
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

          {{ unwrap(home_point24.name) }}
          <br><a :href="arrival_map24" target="_blank">到達位置地圖 {{ unwrap(arrival_point24.longitude) }}/{{ unwrap(arrival_point24.latitude) }}</a><br>
          GPS定位:<a :href="data24placemap" target="_blank">{{ unwrap(data24.place) }}</a><br>
          <br>
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          晚上<br>
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
          GPS定位:<a :href="data60placemap" target="_blank">{{ unwrap(data60.place) }}</a>

        </q-card-section>

      </q-card>
      <q-card>
        <q-card-section>
          <table>

            <tbody>

            <tr>
              <td><h5>晚上</h5></td>
              <td>
                <h6>{{ unwrap(arrival_point60.name) }}</h6>
                預計{{ unwrap(arrival_point60.schedule) }}
                <a :href="arrival_map60" target="_blank">地圖 {{ unwrap(arrival_point60.longitude) }}/{{ unwrap(arrival_point60.latitude) }}</a>
              </td>
              <td>
                <h6>({{ unwrap(home_point60.arrival) }})
                  <br>{{ unwrap(home_point60.name) }}</h6>
                預計{{ unwrap(home_point60.schedule) }}
              </td>
            </tr>
            </tbody>

          </table>

        </q-card-section>
      </q-card>

      <q-card>
        <q-card-section>
          data24
          <JsonViewer :value="data24" copyable sort boxed show-array-index="true"/>
          <template v-if="data24.points">
            <q-card-section v-for="point in data24.points.point ">
              {{ point }}
            </q-card-section>
          </template>

        </q-card-section>
        <q-card-section>
          data60
          <JsonViewer :value="data60" copyable sort boxed show-array-index />
          <template v-if="data60.points">
            <q-card-section v-for="point in data60.points.point ">
              {{ point }}
            </q-card-section>
          </template>

        </q-card-section>

      </q-card>

      <q-card>
      <template v-if="data60.points">
        <q-card-section v-for="point in data60.points.point ">
          {{ point }}
        </q-card-section>
      </template>

      </q-card>
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
import {onBeforeMount, ref} from "vue";
import axios from "axios";
import { API_BASE_URL } from "src/boot/axios";
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

  dataPlacemap.value = `https://www.google.com/maps/place/${data.value.place}`
  const aLon = arrival_point.value.longitude?.['#text'] ?? arrival_point.value.longitude
  const aLat = arrival_point.value.latitude?.['#text'] ?? arrival_point.value.latitude
  const hLon = home_point.value.longitude?.['#text'] ?? home_point.value.longitude
  const hLat = home_point.value.latitude?.['#text'] ?? home_point.value.latitude
  arrival_map.value = `https://maps.nlsc.gov.tw/go/${aLon}/${aLat}/15/EMAP_B/DMAPS,ROAD`
  home_map.value = `https://maps.nlsc.gov.tw/go/${hLon}/${hLat}/15/EMAP_B/DMAPS,ROAD`

  isLate.value =
    parseInt(arrival_point.value.rank?.['#text'] ?? arrival_point.value.rank) -
    parseInt(home_point.value.rank?.['#text'] ?? home_point.value.rank)
}

async function loadData() {
  await Promise.all([
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
  ])
}

const bar = ref(null)
</script>
<style>

</style>
