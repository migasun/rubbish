<template>
  <div class="auto-reload-progress q-mb-md" v-if="show">
    <q-card class="progress-card">
      <q-card-section class="q-pa-sm">
        <div class="progress-content">
          <div class="progress-info">
            <q-icon name="schedule" size="sm" color="primary" class="q-mr-xs" />
            <small class="text-grey-7">{{ countdown }}秒後自動更新</small>
          </div>
          <q-linear-progress
            :value="progress"
            color="primary"
            size="4px"
            class="q-mt-xs"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RefreshProgress',

  props: {
    show: {
      type: Boolean,
      default: false
    },
    countdown: {
      type: Number,
      default: 5
    },
    progress: {
      type: Number,
      default: 0
    }
  }
})
</script>

<style scoped>
.auto-reload-progress {
  margin-bottom: 8px;
}

.progress-card {
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>
