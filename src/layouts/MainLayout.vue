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
        <q-item-label header>監看點</q-item-label>
        <q-item v-for="w in watchers" :key="w.lineParam + w.homeId">
          <q-item-section>{{ w.label || w.lineParam }} - {{ w.homeId }}</q-item-section>
        </q-item>
        <q-item>
          <q-input v-model.number="line24HomeId" label="line24 id" type="number" dense />
        </q-item>
        <q-item>
          <q-input v-model.number="line60HomeId" label="line60 id" type="number" dense />
        </q-item>
        <q-separator class="q-my-md" />
        <q-item-label header>新增監看點</q-item-label>
        <q-item>
          <q-input v-model="newLineParam" label="line" dense />
        </q-item>
        <q-item>
          <q-input v-model.number="newHomeId" label="home id" type="number" dense />
        </q-item>
        <q-item>
          <q-btn label="新增" color="primary" @click="addWatcher" dense />
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref, watch } from 'vue'
import { useWatchersStore } from 'src/stores/watchers'

export default defineComponent({
  name: 'MainLayout',

  setup () {
    const leftDrawerOpen = ref(false)
    const watchersStore = useWatchersStore()
    const newLineParam = ref('')
    const newHomeId = ref('')
    const line24HomeId = ref(watchersStore.watchers[0].homeId)
    const line60HomeId = ref(watchersStore.watchers[1].homeId)

    function addWatcher () {
      if (newLineParam.value && newHomeId.value) {
        watchersStore.addWatcher(newLineParam.value, parseInt(newHomeId.value))
        newLineParam.value = ''
        newHomeId.value = ''
      }
    }

    watch(line24HomeId, (id) => {
      if (id) watchersStore.updateWatcher('line24', parseInt(id))
    })
    watch(line60HomeId, (id) => {
      if (id) watchersStore.updateWatcher('line60', parseInt(id))
    })

    return {
      watchers: watchersStore.watchers,
      newLineParam,
      newHomeId,
      line24HomeId,
      line60HomeId,
      addWatcher,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  }
})
</script>
