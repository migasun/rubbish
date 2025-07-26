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
              :options="getPointOptions('line24')"
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
              :options="getPointOptions('line60')"
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
      </q-list>
    </q-drawer>

    <q-page-container>
      <WatcherSelector />
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref, watch, computed, nextTick } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'
import WatcherSelector from 'src/components/WatcherSelector.vue'

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

    const getPointOptions = computed(() => (lineParam) => {
      // 從 store 獲取可用的監看點
      const points = watchersStore.availablePoints[lineParam] || []
      console.log(`Getting point options for ${lineParam}:`, points)

      // 處理數據格式，確保與 WatcherSelector 中的格式一致
      return points.map(point => ({
        value: point.homeId,
        label: `${point.homeName || point.homeId} - ${point.schedule || '時程未定'} (ID: ${point.homeId})`
      })).filter(option => option.value && option.value > 0) // 過濾無效選項
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
      getPointOptions,
      removeWatcher,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  }
})
</script>
