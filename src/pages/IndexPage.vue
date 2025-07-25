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
          排班 <q-badge color="secondary text-h5" > {{home_point24.schedule}}</q-badge><br>
          預計 <q-badge color="secondary text-h5" >{{home_point24.arrival}}到達</q-badge><br>

          <span v-if="isLate24 > 0 ">站點 <q-badge color="secondary text-h5" >離開{{isLate24}}站</q-badge></span>
          <span v-else-if="isLate24 === 0 ">站點  <q-badge color="secondary text-h5" >到了</q-badge></span>
          <span v-else>
            <template v-if="isLate24">
              站點 <q-badge color="primary text-h5" >還有{{-isLate24}}站</q-badge>
              <q-linear-progress size="50px" :value="-isLate24" color="accent" class="q-mt-sm">
                <div class="absolute-full flex flex-center">
                  <q-badge color="white" text-color="accent" :label="arrival_point24.name" />
                </div>
              </q-linear-progress>
            </template>
          </span>
          <br>
          <br>

          {{home_point24.name}}
          <br><a :href="arrival_map24" target="_blank">到達位置地圖 {{arrival_point24.longitude}}/{{arrival_point24.latitude}}</a><br>
          GPS定位:<a :href="data24placemap" target="_blank">{{data24.place}}</a><br>
          <br>
        </q-card-section>
        <q-separator></q-separator>
        <q-card-section>
          晚上<br>
          排班 <q-badge color="secondary text-h5" > {{home_point60.schedule}}</q-badge><br>
          預計 <q-badge color="secondary text-h5" >{{home_point60.arrival}}到達</q-badge><br>
          <span v-if="isLate60 > 0 ">站點 <q-badge color="secondary text-h5" >離開{{isLate60}}站</q-badge></span>
          <span v-else-if="isLate60 === 0 ">站點  <q-badge color="secondary text-h5" >到了</q-badge></span>
          <span v-else>
            <template v-if="isLate60">
              站點 <q-badge color="primary text-h5" >還有{{-isLate60}}站</q-badge>
              <q-linear-progress size="50px" :value="-isLate60" color="accent" class="q-mt-sm">
                <div class="absolute-full flex flex-center">
                  <q-badge color="white" text-color="accent" :label="arrival_point60.name" />
                </div>
              </q-linear-progress>
            </template>
          </span>

        </q-card-section>
        <q-card-section>
          GPS定位:<a :href="data60placemap" target="_blank">{{data60.place}}</a>

        </q-card-section>

      </q-card>
      <q-card>
        <q-card-section>
          <table>

            <tbody>

            <tr>
              <td><h5>晚上</h5></td>
              <td>
                <h6>{{arrival_point60.name}}</h6>
                預計{{arrival_point60.schedule}}
                <a :href="arrival_map60" target="_blank">地圖 {{arrival_point60.longitude}}/{{arrival_point60.latitude}}</a>
              </td>
              <td>
                <h6>({{home_point60.arrival}})
                  <br>{{home_point60.name}}</h6>
                預計{{home_point60.schedule}}
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
            <q-card-section v-for="point in data24.points.point ">
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
// 參考 https://github.com/SmartCodeDavid/vue3-json-viewer/blob/master/readme_cn.md
import { JsonViewer } from "vue3-json-source-viewer"
import "vue3-json-source-viewer/dist/index.css"

const API_BASE_URL = 'https://your-cloudflare-worker.example.com';
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
onBeforeMount(()=>{
  console.log("onBeforeMount");
  loadData()
  var timeoutID = window.setInterval(( () => {
    loadData()
  } ), 30000);
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
      data24.value = res.data.line.data
      if(data24.value.arrival >0 ){
        arrival24.value = data24.value.arrival
        arrival_point24.value = data24.value.points.point[arrival24.value-1];
      }
      data24.value.points.point.forEach(item => {
        if (item.id === 894299) {
          home_point24.value = item;
        }
      });

      inService.value = (home_point24.value.schedule === '本日無清運') ?  "本日無清運" : null;
      inService.value = (home_point24.value.schedule === '停止收運') ?  "停止收運" : inService.value;

      data24placemap.value = "https://www.google.com/maps/place/"+data24.value.place
      arrival_map24.value = "https://maps.nlsc.gov.tw/go/" + arrival_point24.value.longitude + "/" + arrival_point24.value.latitude + "/15/EMAP_B/DMAPS,ROAD";
      home_map24.value = "https://maps.nlsc.gov.tw/go/" + home_point24.value.longitude + "/" + home_point24.value.latitude + "/15/EMAP_B/DMAPS,ROAD";

      isLate24.value = arrival_point24.value.rank - home_point24.value.rank;
      console.log(arrival_point24.value.rank  );
      console.log(  home_point24.value.rank);
    })



axios.get(API_BASE_URL + '?line60=true')
  .then(res => {
    console.log("Data 60 Loaded!")
    console.log("res.data.data 60", res.data)
    data60.value = res.data.line.data

    if(data60.value.arrival >0 ){
      arrival60.value = data60.value.arrival
      arrival_point60.value = data60.value.points.point[arrival60.value-1];
    }

    data60.value.points.point.forEach(item => {
      if (item.id === 797354) {
        home_point60.value = item;
      }
    });
    data60placemap.value ="https://www.google.com/maps/place/"+data60.value.place
    arrival_map60.value = "https://maps.nlsc.gov.tw/go/" + arrival_point60.value.longitude + "/" + arrival_point60.value.latitude + "/15/EMAP_B/DMAPS,ROAD";
    home_map60.value = "https://maps.nlsc.gov.tw/go/" + home_point60.value.longitude + "/" + home_point60.value.latitude + "/15/EMAP_B/DMAPS,ROAD";

    isLate60.value = arrival_point60.value.rank - home_point60.value.rank;
    console.log(arrival_point60.value.rank );
    console.log(  home_point60.value.rank);

  })
 }

const bar = ref(null)
</script>
<style>

</style>
