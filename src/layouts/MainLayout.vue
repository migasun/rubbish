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

        <q-avatar size="32px" class="q-ml-sm logo-toolbar-avatar">
          <img src="~assets/app-logo.png" alt="Logo">
        </q-avatar>

        <q-toolbar-title>
          垃圾車追蹤APP
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <div class="drawer-header q-pa-md text-center text-white">
        <q-avatar size="72px" class="q-mb-sm shadow-2 logo-avatar">
          <img src="~assets/app-logo.png" alt="App Logo">
        </q-avatar>
        <div class="text-subtitle1 text-weight-bold">垃圾車即時追蹤</div>
        <div class="text-caption text-amber-2">Real-time Tracker</div>
      </div>

      <q-list dense class="q-pt-sm">
        <q-item-label header class="q-mt-sm">目前監看點</q-item-label>
        <q-item v-for="(w, index) in watchers" :key="w.lineParam + w.homeId" clickable dense>
          <q-item-section>
            <q-item-label>{{ w.label || w.lineParam }}</q-item-label>
            <q-item-label caption>ID: {{ w.homeId }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="index >= 2" side>
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
        <q-item dense>
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
        <q-item dense>
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
          class="external-link-item"
          dense
          @click="openOfficalWebsite"
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
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'MainLayout',

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
              currentLocationStatus: isCurrentLocation || hasCarIcon ? '垃圾車目前位置' : '',
              raw: point
            }
          })
        }

        if (homes.length > 0) {
          const points = homes.map(home => {
            const id = home.id
            const name = home.name
            const schedule = home.schedule || home.arrival

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

    const reloadAvailablePoints = () => {
      Object.keys(watchersStore.lineConfigs).forEach(lineParam => {
        loadPointsForLine(lineParam)
      })
    }

    const handleAutoReload = () => {
      console.log('Auto reload triggered, reloading points data...')
      reloadAvailablePoints()
    }

    // 在組件掛載時載入監看點數據
    onMounted(() => {
      reloadAvailablePoints()

      window.addEventListener('auto-reload', handleAutoReload)
    })

    onUnmounted(() => {
      window.removeEventListener('auto-reload', handleAutoReload)
    })

    // 創建響應式的選項計算屬性
    const line24Options = computed(() => {
      const points = watchersStore.availablePoints['line24'] || []
      return points.map(point => {
        let label = `${point.homeName || point.homeId} - ${point.schedule || '時程未定'}`

        if (point.isCurrentLocation) {
          label = `${point.homeName || point.homeId} - ${point.schedule || '時程未定'} (垃圾車目前位置)`
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
          label = `${point.homeName || point.homeId} - ${point.schedule || '時程未定'} (垃圾車目前位置)`
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

<style scoped lang="scss">
.drawer-header {
  background: #076293;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.logo-avatar {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.logo-toolbar-avatar {
  /* No border */
}
</style>
