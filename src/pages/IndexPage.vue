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

<script setup>
import { onBeforeMount, onBeforeUnmount, ref, computed, defineOptions } from 'vue'
import axios from "axios";
import { API_BASE_URL } from "src/boot/axios";
// 參考 https://github.com/SmartCodeDavid/vue3-json-viewer/blob/master/readme_cn.md
import { JsonViewer } from "vue3-json-source-viewer"
import "vue3-json-source-viewer/dist/index.css"

defineOptions({ name: 'IndexPage' })

const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v
const mapUrl = (lon, lat) => `https://maps.nlsc.gov.tw/go/${lon}/${lat}/15/EMAP_B/DMAPS,ROAD`
const data24 = ref({})
const arrival_point24 = ref({})
const home_point24 = ref({})
const arrival_map24 = computed(() => {
  const lon = arrival_point24.value.longitude?.['#text'] ?? arrival_point24.value.longitude
  const lat = arrival_point24.value.latitude?.['#text'] ?? arrival_point24.value.latitude
  return mapUrl(lon, lat)
})
const isLate24 = ref(null);
const data24placemap = computed(() =>
  data24.value.place ? `https://www.google.com/maps/place/${data24.value.place}` : ''
)
const data60 = ref({})
const arrival_point60 = ref({})
const home_point60 = ref({})
const arrival_map60 = computed(() => {
  const lon = arrival_point60.value.longitude?.['#text'] ?? arrival_point60.value.longitude
  const lat = arrival_point60.value.latitude?.['#text'] ?? arrival_point60.value.latitude
  return mapUrl(lon, lat)
})
const isLate60 = ref(null);
const data60placemap = computed(() =>
  data60.value.place ? `https://www.google.com/maps/place/${data60.value.place}` : ''
)
const inService = ref("有垃圾車");
let intervalID
onBeforeMount(()=>{
  console.log("onBeforeMount");
  loadData()
  intervalID = setInterval(() => {
    loadData()
  }, 30000)
})
onBeforeUnmount(() => {
  clearInterval(intervalID)
})

function refresh(done){
  console.log('refresh')
  loadData()
  console.log('refresh done1')
  done()
  console.log('refresh done2')
}
 function loadData() {
   console.log("loading Data!")
  axios.get(API_BASE_URL + '?line24=true')
    .then(res => {
      console.log("Data 24 Loaded!")
      console.log("res.data.data 24", res.data)
      data24.value = res.data.line
      const arrivalIdx24 = parseInt(data24.value.arrival?.['#text'] ?? data24.value.arrival)
      if(arrivalIdx24 > 0){
        arrival_point24.value = data24.value.points.point[arrivalIdx24-1];
      }
      data24.value.points.point.forEach(item => {
        if (parseInt(item.id?.['#text'] ?? item.id) === 894299) {
          home_point24.value = item;
        }
      });

      inService.value = (home_point24.value.schedule === '本日無清運') ?  "本日無清運" : null;
      inService.value = (home_point24.value.schedule === '停止收運') ?  "停止收運" : inService.value;

      isLate24.value =
        parseInt(arrival_point24.value.rank?.['#text'] ?? arrival_point24.value.rank) -
        parseInt(home_point24.value.rank?.['#text'] ?? home_point24.value.rank);
      console.log(arrival_point24.value.rank  );
      console.log(  home_point24.value.rank);
    })



axios.get(API_BASE_URL + '?line60=true')
  .then(res => {
    console.log("Data 60 Loaded!")
    console.log("res.data.data 60", res.data)
    data60.value = res.data.line

    const arrivalIdx60 = parseInt(data60.value.arrival?.['#text'] ?? data60.value.arrival)
    if(arrivalIdx60 > 0){
      arrival_point60.value = data60.value.points.point[arrivalIdx60-1];
    }

    data60.value.points.point.forEach(item => {
      if (parseInt(item.id?.['#text'] ?? item.id) === 995714) {
        home_point60.value = item;
      }
    });
    isLate60.value =
      parseInt(arrival_point60.value.rank?.['#text'] ?? arrival_point60.value.rank) -
      parseInt(home_point60.value.rank?.['#text'] ?? home_point60.value.rank);
    console.log(arrival_point60.value.rank );
    console.log(  home_point60.value.rank);

  })
 }

</script>
<style>

</style>
