<template>
  <div class="station-status">
    <!-- 基本信息 -->
    <div class="status-info">
      <div class="point-name text-h6 font-weight-bold">{{ unwrap(homePoint.name) }}</div>
      <div class="schedule-info mt-1">
        表定 <v-chip color="secondary" size="small" label class="mx-1">{{ unwrap(homePoint.schedule) }}</v-chip>
        <span class="arrival-text">預估</span>
        <v-chip color="secondary" size="small" label class="ml-1">{{ formatArrivalDisplay(unwrap(homePoint.arrival)) }}到達</v-chip>
      </div>
    </div>

    <!-- 站點狀態 -->
    <div class="station-progress mt-4">
      <template v-if="isLate === null || isLate === undefined">
        <!-- 数据不完整或加载中 -->
        <div class="status-badge">
          <v-chip color="grey" label>
            isLate: {{ isLate }}
          </v-chip>
        </div>
      </template>

      <template v-else-if="isLate > 0">
        <!-- 已經離開 -->
        <div class="status-badge">
          <v-chip color="error" size="large" label>
            <v-icon start icon="mdi-check-circle"></v-icon>
            已離開 {{ isLate }} 站
          </v-chip>
        </div>
      </template>

      <template v-else-if="isLate === 0">
        <!-- 剛好到達 -->
        <div class="status-badge">
          <v-chip color="success" size="large" label class="pulse">
            <v-icon start icon="mdi-map-marker"></v-icon>
            垃圾車到了！
          </v-chip>
        </div>
      </template>

      <template v-else-if="isLate < 0 && arrivalPoint && Object.keys(arrivalPoint).length > 0">
        <!-- 還沒到，顯示進度 -->
        <div class="approaching-status">
          <div class="status-text mb-2">
            <v-chip color="primary" size="large" label>
              <v-icon start icon="mdi-bus"></v-icon>
              還有 {{ -isLate }} 站
            </v-chip>
          </div>

          <!-- 進度條 -->
          <div class="progress-container">
            <v-progress-linear
              :model-value="progressValue * 100"
              color="primary"
              height="25"
              striped
              class="rounded-pill"
            >
              <template v-slot:default="{ value }">
                <strong class="text-white">{{ currentLocationLabel }}</strong>
              </template>
            </v-progress-linear>

            <!-- 進度說明 -->
            <div class="progress-details mt-1">
              <div class="current-location text-caption text-grey-darken-1">
                目前位置: {{ unwrap(arrivalPoint.name) || '未知' }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 無法取得位置信息 -->
        <div class="status-badge">
          <v-chip color="grey" label>
            <v-icon start icon="mdi-help-circle-outline"></v-icon>
            位置信息不完整
          </v-chip>
        </div>
      </template>
    </div>

    <!-- 地圖連結 -->
    <div class="map-links mt-4" v-if="showMapLinks">
      <div class="d-flex flex-wrap gap-2">
        <div v-if="arrivalMap">
          <v-btn
            size="small"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-crosshairs-gps"
            :href="arrivalMap"
            target="_blank"
            class="text-none"
          >
            垃圾車位置
          </v-btn>
        </div>
        <div v-if="homeMap">
          <v-btn
            size="small"
            color="secondary"
            variant="outlined"
            prepend-icon="mdi-home"
            :href="homeMap"
            target="_blank"
            class="text-none"
          >
            監看點位置
          </v-btn>
        </div>
        <div v-if="dataPlacemap">
          <v-btn
            size="small"
            color="info"
            variant="outlined"
            prepend-icon="mdi-crosshairs"
            :href="dataPlacemap"
            target="_blank"
            class="text-none"
          >
            GPS定位
          </v-btn>
        </div>
        <!-- 新增：在地圖上顯示監看點按鈕 -->
        <div>
          <v-btn
            size="small"
            color="warning"
            variant="outlined"
            prepend-icon="mdi-map-marker-radius"
            @click="showHomePointOnMap"
            class="text-none"
          >
            地圖顯示
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'StationStatus',

  props: {
    homePoint: {
      type: Object,
      default: () => ({})
    },
    arrivalPoint: {
      type: Object,
      default: () => ({})
    },
    isLate: {
      type: [Number, null],
      default: null
    },
    arrivalMap: {
      type: String,
      default: ''
    },
    homeMap: {
      type: String,
      default: ''
    },
    dataPlacemap: {
      type: String,
      default: ''
    },
    totalStations: {
      type: Number,
      default: 30 // 預設總站數，用於計算進度條
    },
    showMapLinks: {
      type: Boolean,
      default: true
    }
  },

  emits: ['show-home-point-on-map', 'show-gps-location'],

  setup(props, { emit }) {
    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v

    const formatArrivalDisplay = (time) => {
      if (!time) return '未知'
      // 簡單的時間格式化，只顯示 HH:mm
      try {
        const date = new Date(time)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch (e) {
        return time
      }
    }

    const progressValue = computed(() => {
      if (props.isLate === null || props.isLate >= 0) return 1
      // isLate 是負數，表示還有幾站
      // 假設總站數為 totalStations，計算進度
      // 這只是一個估算，實際進度應該基於 rank
      const remaining = -props.isLate
      // 簡單的進度計算：1 - (剩餘站數 / 總參考站數)
      // 限制最小進度為 0.05 以顯示一點點條
      return Math.max(0.05, 1 - (remaining / props.totalStations))
    })

    const currentLocationLabel = computed(() => {
      if (!props.arrivalPoint || !props.arrivalPoint.name) return ''
      return `目前在: ${unwrap(props.arrivalPoint.name)}`
    })

    const showHomePointOnMap = () => {
      // 準備監看點數據
      const pointData = {
        point: props.homePoint,
        type: 'home',
        title: `監看點: ${unwrap(props.homePoint.name)}`,
        description: `表定時間: ${unwrap(props.homePoint.schedule)}`
      }
      emit('show-home-point-on-map', pointData)
    }

    return {
      unwrap,
      formatArrivalDisplay,
      progressValue,
      currentLocationLabel,
      showHomePointOnMap
    }
  }
})
</script>

<style scoped>
.station-status {
  width: 100%;
}

.status-info {
  margin-bottom: 8px;
}

.point-name {
  font-size: 1.1rem;
  color: #2c3e50;
}

.schedule-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.arrival-text {
  margin: 0 4px;
}

.station-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.status-badge {
  margin-bottom: 8px;
}

.approaching-status {
  width: 100%;
}

.progress-container {
  width: 100%;
  margin-top: 4px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #7f8c8d;
}

.pulse {
  animation: pulse-animation 2s infinite;
}

@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}
</style>
