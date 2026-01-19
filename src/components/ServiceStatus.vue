<template>
  <div class="status-overview">
    <q-card class="status-card">
      <q-card-section class="text-center q-pa-md">
        <div class="service-status">
          <q-icon name="local_shipping" size="2rem" color="primary" />
          <div class="status-text q-mt-sm">
            <div class="text-h6">今日服務狀態</div>
            <q-badge :color="serviceColor" class="text-h6 q-mt-xs">
              {{ status }}
            </q-badge>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'ServiceStatus',

  props: {
    status: {
      type: String,
      default: '有垃圾車'
    }
  },

  setup(props) {
    const serviceColor = computed(() => {
      if (props.status === '本日無清運' || props.status === '停止收運') {
        return 'negative'
      }
      return 'positive'
    })

    return {
      serviceColor
    }
  }
})
</script>

<style scoped>
.status-overview {
  margin-bottom: 12px;
}

.status-card {
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.service-status {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.status-text {
  margin-top: 6px;
}

@media (max-width: 600px) {
  .status-overview {
    margin-bottom: 8px;
  }
}
</style>
