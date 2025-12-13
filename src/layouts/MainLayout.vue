<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          垃圾車追蹤APP
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>目前監看點</q-item-label>
        <q-item v-for="(w, index) in watchers" :key="w.lineParam + w.homeId" clickable>
          <q-item-section>
            <q-item-label>{{ w.label || w.lineParam }}</q-item-label>
            <q-item-label caption>ID: {{ w.homeId }}</q-item-label>
          </q-item-section>
          <q-item-section side v-if="index >= 2">
            <q-btn
              flat
              round
              icon="delete"
              size="sm"
              color="negative"
              @click="removeWatcher(index)"
            />
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item-label header>快速調整預設監看點</q-item-label>
        <q-item>
          <q-item-section>
            <q-select
              v-model="line24HomeId"
              :options="line24Options"
              option-value="value"
              option-label="label"
              label="中午清運路線監看點"
              outlined
              dense
              emit-value
              map-options
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-select
              v-model="line60HomeId"
              :options="line60Options"
              option-value="value"
              option-label="label"
              label="晚上清運路線監看點"
              outlined
              dense
              emit-value
              map-options
            />
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item-label header>相關連結</q-item-label>
        <q-item
          clickable
          @click="openOfficalWebsite"
          class="external-link-item"
        >
          <q-item-section avatar>
            <q-icon name="map" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>新北垃圾車清運資訊查詢</q-item-label>
            <q-item-label caption>官方清運路線地圖</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="open_in_new" color="grey-6" size="sm" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <!-- 隱藏新增監看點功能 -->
      <!-- <WatcherSelector /> -->
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref, watch, computed, nextTick, onMounted } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'
import WatcherSelector from 'src/components/WatcherSelector.vue'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'MainLayout',

  components: {
    WatcherSelector
  },

  setup () {
    const leftDrawerOpen = ref(false)
    const watchersStore = useWatchersStore()

    // 動態獲取當前的 homeId 值
    const line24HomeId = ref(watchersStore.watchers[0]?.homeId || 894299)
    const line60HomeId = ref(watchersStore.watchers[1]?.homeId || 995714)

    // 載入監看點數據的函數
    async function loadPointsForLine(lineParam) {
      if (!lineParam) return

      try {
        const lineConfig = watchersStore.getLineConfig(lineParam)
        console.log(`Loading points for ${lineParam}, API call with lineId: ${lineConfig.id}`)

        const response = await api.get('/', { params: { lineId: lineConfig.id } })
        const data = response.data

        // 獲取當前垃圾車位置（arrival 站點編號）
        const currentArrivalRank = parseInt(data.line?.arrival?.['#text'] || data.line?.arrival || 0)

        let homes = []

        // 根據實際的 API 結構解析監看點
        if (data.line && data.line.points && data.line.points.point) {
          const points = Array.isArray(data.line.points.point) ?
            data.line.points.point : [data.line.points.point]

          homes = points.map(point => {
            const pointRank = parseInt(point.rank?.['#text'] || point.rank || 0)
            const isCurrentLocation = pointRank === currentArrivalRank

            // 檢查 arrival 欄位是否包含垃圾車圖示標記
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
        // The axios interceptor will handle the dialog, but we still log the error
        console.error('載入監看點失敗:', error)
        watchersStore.setAvailablePoints(lineParam, [])
      }
    }

    // 在組件掛載時載入監看點數據
    onMounted(() => {
      Object.keys(watchersStore.lineConfigs).forEach(lineParam => {
        loadPointsForLine(lineParam)
      })

      // 監聽自動更新事件，重新載入監看點數據
      const handleAutoReload = () => {
        console.log('Auto reload triggered, reloading points data...')
        Object.keys(watchersStore.lineConfigs).forEach(lineParam => {
          loadPointsForLine(lineParam)
        })
      }

      // 監聽頁面的自動更新事件
      window.addEventListener('auto-reload', handleAutoReload)
      window.addEventListener('refresh', handleAutoReload)

      // 組件卸載時清理事件監聽器
      return () => {
        window.removeEventListener('auto-reload', handleAutoReload)
        window.removeEventListener('refresh', handleAutoReload)
      }
    })

    // 創建響應式的選項計算屬性
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

    // 保留 getPointOptions 函數用於調試或其他用途
    const getPointOptions = (lineParam) => {
      // 從 store 獲取可用的監看點
      const points = watchersStore.availablePoints[lineParam] || []
      console.log(`Getting point options for ${lineParam}:`, points)

      // 處理數據格式，確保與 WatcherSelector 中的格式一致
      return points.map(point => {
        let label = `${point.homeName || point.homeId} - ${point.schedule || '時程未定'}`

        // 如果是當前垃圾車位置，添加特殊標記
        if (point.isCurrentLocation) {
          label = `🚛 ${point.homeName || point.homeId} - ${point.schedule || '時程未定'} (垃圾車目前位置)`
        }

        label += ` (ID: ${point.homeId})`

        return {
          value: point.homeId,
          label: label
        }
      }).filter(option => option.value && option.value > 0) // 過濾無效選項
    }

    function removeWatcher(index) {
      watchersStore.removeWatcher(index)
    }

    // 監聽 store 中 watchers 的變化，同步更新本地的 homeId
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
        // 手動觸發頁面重新載入數據
        nextTick(() => {
          // 發送自定義事件通知 IndexPage 重新載入數據
          window.dispatchEvent(new CustomEvent('watcher-updated', {
            detail: { lineParam: 'line24', homeId: parseInt(newId) }
          }))
        })
      }
    })

    watch(line60HomeId, (newId) => {
      if (newId && newId !== watchersStore.watchers[1]?.homeId) {
        watchersStore.updateWatcher('line60', parseInt(newId))
        // 手動觸發頁面重新載入數據
        nextTick(() => {
          // 發送自定義事件通知 IndexPage 重新載入數據
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
      getPointOptions,
      removeWatcher,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      openOfficalWebsite() {
        // 開啟新北垃圾車清運資訊查詢官方網站
        window.open('https://crd-rubbish.epd.ntpc.gov.tw/dispPageBox/Ntpcepd/NtpMP.aspx?ddsPageID=MAP', '_blank')
      }
    }
  }
})
</script>
