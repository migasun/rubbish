<template>
  <div class="route-tabs">
    <q-tabs
      :model-value="modelValue"
      class="route-tab-container"
      indicator-color="primary"
      active-color="primary"
      align="justify"
      dense
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <q-tab name="noon" label="中午清運" class="route-tab" />
      <q-tab name="evening" label="晚上清運" class="route-tab" />
      <q-tab
        v-for="(watcher, idx) in extraWatchers"
        :key="`extra-${idx}`"
        :name="`extra-${idx}`"
        :label="getExtraTabLabel(idx)"
        class="route-tab"
      />
    </q-tabs>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RouteTabs',

  props: {
    modelValue: {
      type: String,
      required: true
    },
    extraWatchers: {
      type: Array,
      default: () => []
    },
    watcherConfigs: {
      type: Array,
      default: () => []
    }
  },

  emits: ['update:modelValue'],

  setup(props) {
    function getExtraTabLabel(idx) {
      const watcher = props.watcherConfigs[idx]
      return watcher ? `${watcher.label.split(' - ')[0]}` : '未知路線'
    }

    return {
      getExtraTabLabel
    }
  }
})
</script>

<style scoped>
.route-tabs {
  margin-bottom: 4px;
}

.route-tab-container {
  background-color: #f9f9f9;
  border-radius: 6px;
}

.route-tab {
  border-radius: 6px;
}

@media (max-width: 600px) {
  .route-tabs {
    margin-bottom: 4px;
  }
}
</style>
