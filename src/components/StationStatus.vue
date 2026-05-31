<template>
  <div class="station-status">
    <!-- 基本信息 -->
    <div class="status-info">
      <div class="point-name">{{ unwrap(homePoint.name) }}</div>
      <div class="schedule-info">
        表定<q-badge color="secondary text-h5"> {{ unwrap(homePoint.schedule) }}</q-badge>
        <span class="arrival-text">預估</span>
        <q-badge color="secondary text-h5">{{ formatArrivalDisplay(unwrap(homePoint.arrival)) }}到達</q-badge>
      </div>
    </div>

    <!-- 站點狀態 -->
    <div class="station-progress q-mt-md">
      <template v-if="isLate === null || isLate === undefined">
        <!-- 数据不完整或加载中：保持空白以簡化畫面 -->
      </template>

      <template v-else-if="isLate > 0">
        <!-- 已經離開 -->
        <div class="status-badge">
          <q-badge color="negative text-h6">
            <q-icon name="check_circle" class="q-mr-xs" />
            已離開 {{ isLate }} 站
          </q-badge>
        </div>
      </template>

      <template v-else-if="isLate === 0">
        <!-- 剛好到達 -->
        <div class="status-badge">
          <q-badge color="positive text-h6" class="pulse">
            <q-icon name="location_on" class="q-mr-xs" />
            垃圾車到了！
          </q-badge>
        </div>
      </template>

      <template v-else-if="isLate < 0 && arrivalPoint && Object.keys(arrivalPoint).length > 0">
        <!-- 還沒到，顯示進度 -->
        <div class="approaching-status">
          <div class="status-text q-mb-sm">
            <q-badge color="primary text-h6">
              <q-icon name="directions_bus" class="q-mr-xs" />
              還有 {{ -isLate }} 站
            </q-badge>
          </div>

          <!-- 進度條 -->
          <div class="progress-container">
            <q-linear-progress
              :value="progressValue"
              color="primary"
              size="12px"
              class="progress-bar"
              :animation-speed="200"
            >
              <div class="absolute-full flex flex-center">
                <q-badge
                  color="white"
                  text-color="primary"
                  :label="currentLocationLabel"
                  class="progress-label"
                />
              </div>
            </q-linear-progress>

            <!-- 進度說明 -->
            <div class="progress-details q-mt-xs">
              <div class="current-location">
                <small>目前位置: {{ unwrap(arrivalPoint.name) || '未知' }}</small>
              </div>

            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 無法取得位置信息 -->
        <div class="status-badge">
          <q-badge color="grey text-body1">
            <q-icon name="help_outline" class="q-mr-xs" />
            位置信息不完整
          </q-badge>
        </div>
      </template>
    </div>

  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { unwrap } from 'src/utils/xml'

export default defineComponent({
  name: 'StationStatus',

  emits: ['show-home-point-on-map', 'show-gps-location'],

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
      type: Number,
      default: 0
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
      default: 29 // 預設總站數
    },
    showMapLinks: {
      type: Boolean,
      default: true
    }
  },

  setup(props, { emit }) {
    // 顯示監看點在地圖上
    const showHomePointOnMap = () => {
      console.log('顯示監看點在地圖上:', props.homePoint)
      emit('show-home-point-on-map', {
        point: props.homePoint,
        type: 'home',
        title: `監看點 - ${unwrap(props.homePoint.name)}`,
        description: `時程: ${unwrap(props.homePoint.schedule)}`
      })
    }

    // 計算進度百分比
    const progressValue = computed(() => {
      if (props.isLate >= 0) return 1 // 已到達或已離開

      const currentStation = parseInt(unwrap(props.arrivalPoint.rank) || 0)
      const targetStation = parseInt(unwrap(props.homePoint.rank) || 0)

      if (currentStation === 0 || targetStation === 0) return 0

      // 計算進度：已完成的站數 / 總需要完成的站數
      const progress = currentStation / targetStation
      return Math.min(Math.max(progress, 0), 0.95) // 限制在 0-95% 之間
    })

    // 當前位置標籤
    const currentLocationLabel = computed(() => {
      const currentRank = parseInt(unwrap(props.arrivalPoint.rank) || 0)
      const targetRank = parseInt(unwrap(props.homePoint.rank) || 0)

      if (currentRank === 0) return '準備中'
      if (currentRank >= targetRank) return '即將到達'

      return `第 ${currentRank} 站`
    })

    // 格式化到達時間顯示
    const formatArrivalDisplay = (arrivalText) => {
      if (!arrivalText) return '時程未定'

      // 如果包含HTML標籤（垃圾車圖示），顯示為"目前位置"
      if (arrivalText.includes('Icon_CarS.png') || arrivalText.includes('now-at')) {
        return '目前位置'
      }

      return arrivalText
    }

    // 處理GPS定位按鈕點擊
    const handleGPSLocationClick = () => {
      console.log('GPS定位按鈕被點擊，發送GPS定位事件')

      // 檢查是否有垃圾車位置數據
      if (props.arrivalPoint && props.arrivalPoint.id) {
        console.log('發送GPS定位事件，垃圾車位置:', props.arrivalPoint)
        emit('show-gps-location', {
          point: props.arrivalPoint,
          type: 'gps',
          title: '垃圾車GPS定位',
          description: `垃圾車目前位置 - ${unwrap(props.arrivalPoint.name) || '未知位置'}`
        })
      } else {
        console.warn('沒有垃圾車GPS位置數據')
        // 可以在這裡添加提示訊息給用戶
      }
    }

    return {
      unwrap,
      progressValue,
      currentLocationLabel,
      formatArrivalDisplay,
      showHomePointOnMap,
      handleGPSLocationClick
    }
  }
})
</script>

<style scoped>
.station-status {
  width: 100%;
  padding: 12px; /* 從 16px 減少到 12px */
  background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px; /* 從 12px 減少到 8px */
  box-shadow: 0 1px 4px rgba(0,0,0,0.08); /* 減少陰影 */
}

.status-info {
  margin-bottom: 8px; /* 從 12px 減少到 8px */
}

.point-name {
  font-size: 1em; /* 從 1.1em 減少 */
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px; /* 從 8px 減少到 6px */
}

.schedule-info {
  display: flex;
  align-items: center;
  gap: 6px; /* 從 8px 減少到 6px */
  flex-wrap: wrap;
}

.arrival-text {
  color: #6c757d;
  font-size: 0.9em;
}

.station-progress {
  min-height: 50px; /* 從 60px 減少到 50px */
}

.status-badge {
  display: flex;
  justify-content: center;
  margin: 12px 0; /* 從 16px 減少到 12px */
}

.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.approaching-status {
  text-align: center;
}

.status-text {
  display: flex;
  justify-content: center;
}

.progress-container {
  max-width: 280px; /* 從 300px 減少 */
  margin: 0 auto;
}

.progress-bar {
  border-radius: 8px; /* 從 10px 減少 */
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1); /* 減少陰影 */
}

.progress-label {
  font-size: 0.8em; /* 從 0.85em 減少 */
  font-weight: 600;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  color: #6c757d;
  font-size: 0.75em; /* 從 0.8em 減少 */
}

.map-links {
  border-top: 1px solid #dee2e6;
  padding-top: 8px; /* 從 12px 減少到 8px */
}

/* 響應式設計 - 手機端進一步優化 */
@media (max-width: 600px) {
  .station-status {
    padding: 8px; /* 手機端進一步減少到 8px */
    border-radius: 6px;
  }

  .point-name {
    font-size: 0.95em;
    margin-bottom: 4px;
  }

  .schedule-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .progress-details {
    flex-direction: column;
    text-align: center;
    gap: 2px;
  }

  .progress-container {
    max-width: 250px;
  }

  .station-progress {
    min-height: 40px;
  }

  .map-links {
    padding-top: 6px;
  }
}
</style>
