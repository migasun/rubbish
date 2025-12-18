<template>
  <v-app>
    <v-app-bar elevation="2">
      <v-app-bar-nav-icon @click="toggleLeftDrawer"></v-app-bar-nav-icon>
      <v-toolbar-title>垃圾車追蹤APP</v-toolbar-title>
      <div class="mr-4">Vuetify</div>
    </v-app-bar>

    <v-navigation-drawer v-model="leftDrawerOpen" bordered>
      <v-list>
        <v-list-subheader>目前監看點</v-list-subheader>
        <v-list-item
          v-for="(w, index) in watchers"
          :key="w.lineParam + w.homeId"
          :title="w.label || w.lineParam"
          :subtitle="'ID: ' + w.homeId"
        >
          <template v-slot:append v-if="index >= 2">
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="removeWatcher(index)"
            ></v-btn>
          </template>
        </v-list-item>

        <v-divider class="my-4"></v-divider>

        <v-list-subheader>快速調整預設監看點</v-list-subheader>
        <v-list-item>
          <v-select
            v-model="line24HomeId"
            :items="line24Options"
            item-title="label"
            item-value="value"
            label="中午清運路線監看點"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-list-item>
        <v-list-item>
          <v-select
            v-model="line60HomeId"
            :items="line60Options"
            item-title="label"
            item-value="value"
            label="晚上清運路線監看點"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-list-item>

        <v-divider class="my-4"></v-divider>

        <v-list-subheader>相關連結</v-list-subheader>
        <v-list-item
          @click="openOfficalWebsite"
          link
        >
          <template v-slot:prepend>
            <v-icon color="primary">mdi-map</v-icon>
          </template>
          <v-list-item-title>新北垃圾車清運資訊查詢</v-list-item-title>
          <v-list-item-subtitle>官方清運路線地圖</v-list-item-subtitle>
          <template v-slot:append>
            <v-icon color="grey-darken-1" size="small">mdi-open-in-new</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
import { defineComponent, ref, watch, computed, nextTick, onMounted } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'MainLayout',

  setup () {
    const leftDrawerOpen = ref(true)
    const watchersStore = useWatchersStore()

    const line24HomeId = ref(watchersStore.watchers[0]?.homeId || 894299)
    const line60HomeId = ref(watchersStore.watchers[1]?.homeId || 995714)

    async function loadPointsForLine(lineParam) {
      if (!lineParam) return

      try {
        const lineConfig = watchersStore.getLineConfig(lineParam)
        console.log(`Loading points for ${lineParam}, API call with lineId: ${lineConfig.id}`)

        const response = await api.get('/', { params: { lineId: lineConfig.id } })
        const data = response.data

        const currentArrivalRank = parseInt(data.line?.arrival?.['#text'] || data.line?.arrival || 0)

        let homes = []

        if (data.line && data.line.points && data.line.points.point) {
          const points = Array.isArray(data.line.points.point) ?
            data.line.points.point : [data.line.points.point]

          homes = points.map(point => {
            const pointRank = parseInt(point.rank?.['#text'] || point.rank || 0)
            const isCurrentLocation = pointRank === currentArrivalRank

            const arrivalText = point.arrival?.['#text'] || point.arrival || ''
            const hasCarIcon = arrivalText.includes('Icon_CarS.png') || arrivalText.includes('now-at')

            return {
              id: point.id?.['#text'],
              name: point.name?.['#text'],
              schedule: point.schedule?.['#text'],
              arrival: point.arrival?.['#text'],
              rank: point.rank?.['#text'],
              longitude: point.longitude?.['#text'],
              latitude: point.latitude?.['#text'],
              fixedPoint: point.fixedPoint?.['#text'],
              isCurrentLocation: isCurrentLocation || hasCarIcon,
              currentLocationStatus: isCurrentLocation || hasCarIcon ? '🚛 垃圾車目前位置' : '',
              raw: point
            }
          })
        }

        if (homes.length > 0) {
          const points = homes.map(home => {
            const id = home.id;
            const name = home.name;
            const schedule = home.schedule || home.arrival;

            return {
              homeId: parseInt(id || 0),
              homeName: name || `監看點 ${id}`,
              schedule: schedule || '時程未定',
              status: home.status || '未知',
              rank: home.rank || '',
              longitude: home.longitude || '',
              latitude: home.latitude || '',
              isCurrentLocation: home.isCurrentLocation || false,
              currentLocationStatus: home.currentLocationStatus || '',
              raw: home
            }
          }).filter(point => point.homeId > 0)

          watchersStore.setAvailablePoints(lineParam, points)
        }
      } catch (error) {
        console.error('載入監看點失敗:', error)
        watchersStore.setAvailablePoints(lineParam, [])
      }
    }

    onMounted(() => {
      Object.keys(watchersStore.lineConfigs).forEach(lineParam => {
        loadPointsForLine(lineParam)
      })

      const handleAutoReload = () => {
        console.log('Auto reload triggered, reloading points data...')
        Object.keys(watchersStore.lineConfigs).forEach(lineParam => {
          loadPointsForLine(lineParam)
        })
      }

      window.addEventListener('auto-reload', handleAutoReload)
      window.addEventListener('refresh', handleAutoReload)

      return () => {
        window.removeEventListener('auto-reload', handleAutoReload)
        window.removeEventListener('refresh', handleAutoReload)
      }
    })

    const line24Options = computed(() => {
      const points = watchersStore.availablePoints['line24'] || []
      return points.map(point => {
        let label = `${point.homeName || point.homeId} - ${point.schedule || '時程未定'}`

        if (point.isCurrentLocation) {
          label = `🚛 ${point.homeName || point.homeId} - ${point.schedule || '時程未定'} (垃圾車目前位置)`
        }

        label += ` (ID: ${point.homeId})`

        return {
          value: point.homeId,
          label: label
        }
      }).filter(option => option.value && option.value > 0)
    })

    const line60Options = computed(() => {
      const points = watchersStore.availablePoints['line60'] || []
      return points.map(point => {
        let label = `${point.homeName || point.homeId} - ${point.schedule || '時程未定'}`

        if (point.isCurrentLocation) {
          label = `🚛 ${point.homeName || point.homeId} - ${point.schedule || '時程未定'} (垃圾車目前位置)`
        }

        label += ` (ID: ${point.homeId})`

        return {
          value: point.homeId,
          label: label
        }
      }).filter(option => option.value && option.value > 0)
    })

    function removeWatcher(index) {
      watchersStore.removeWatcher(index)
    }

    watch(() => watchersStore.watchers, (newWatchers) => {
      if (newWatchers[0]) {
        line24HomeId.value = newWatchers[0].homeId
      }
      if (newWatchers[1]) {
        line60HomeId.value = newWatchers[1].homeId
      }
    }, { deep: true })

    watch(line24HomeId, (newId) => {
      if (newId && newId !== watchersStore.watchers[0]?.homeId) {
        watchersStore.updateWatcher('line24', parseInt(newId))
        nextTick(() => {
          window.dispatchEvent(new CustomEvent('watcher-updated', {
            detail: { lineParam: 'line24', homeId: parseInt(newId) }
          }))
        })
      }
    })

    watch(line60HomeId, (newId) => {
      if (newId && newId !== watchersStore.watchers[1]?.homeId) {
        watchersStore.updateWatcher('line60', parseInt(newId))
        nextTick(() => {
          window.dispatchEvent(new CustomEvent('watcher-updated', {
            detail: { lineParam: 'line60', homeId: parseInt(newId) }
          }))
        })
      }
    })

    return {
      watchers: watchersStore.watchers,
      line24HomeId,
      line60HomeId,
      line24Options,
      line60Options,
      removeWatcher,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      openOfficalWebsite() {
        window.open('https://crd-rubbish.epd.ntpc.gov.tw/dispPageBox/Ntpcepd/NtpMP.aspx?ddsPageID=MAP', '_blank')
      }
    }
  }
})
</script>
