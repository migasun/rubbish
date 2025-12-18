<template>
  <div class="route-panel-container">
    <!-- 路線標題 -->
    <div class="route-header">
      <div class="route-title d-flex align-center">
        <v-icon :icon="routeIcon" size="small" color="primary" class="mr-2"></v-icon>
        <span class="text-h6">{{ routeName }}</span>
      </div>

      <!-- 快速狀態指示器 -->
      <div class="quick-status">
        <v-chip
          :color="getQuickStatusColor()"
          :prepend-icon="getQuickStatusIcon()"
          size="small"
          label
          class="text-white"
        >
          {{ getQuickStatusText() }}
        </v-chip>
      </div>
    </div>

    <!-- 主要狀態區域 -->
    <div class="main-status-area">
      <StationStatus
        :home-point="homePoint"
        :arrival-point="arrivalPoint"
        :is-late="isLate"
        :arrival-map="arrivalMap"
        :home-map="homeMap"
        :data-placemap="dataPlacemap"
        :total-stations="29"
        :show-map-links="true"
        @show-home-point-on-map="handleShowHomePointOnMap"
        @show-gps-location="handleGPSLocation"
      />
    </div>

    <!-- 展開/收起按鈕 -->
    <div class="expand-section">
      <v-btn
        @click="toggleExpanded"
        :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        variant="text"
        color="primary"
        block
        class="text-none"
      >
        {{ expanded ? '收起詳細資訊' : '查看所有站點' }}
      </v-btn>
    </div>

    <!-- 詳細資訊區域 -->
    <v-expand-transition>
      <div v-show="expanded" class="detailed-info">
        <!-- 時間資訊區域 -->
        <div class="time-info-section mb-4">
          <div class="section-title">⏰ 時間資訊</div>
          <div class="time-info-grid">
            <div class="time-info-card">
              <div class="time-label">表定時間</div>
              <div class="time-value scheduled-time">
                {{ formatScheduledTime(unwrap(homePoint.schedule)) }}
              </div>
            </div>
            <div class="time-info-card">
              <div class="time-label">預估到達</div>
              <div class="time-value estimated-time">
                {{ formatEstimatedTime(unwrap(homePoint.arrival)) }}
              </div>
            </div>
            <div class="time-info-card" v-if="getTimeDifference()">
              <div class="time-label">時間差異</div>
              <div class="time-value" :class="getTimeDifferenceClass()">
                {{ getTimeDifference() }}
              </div>
            </div>
          </div>
        </div>

        <!-- 路線地圖區域 -->
        <div class="map-section mb-4" v-if="hasStations">
          <div class="section-title">🗺️ 路線地圖</div>
          <OpenStreetMapView
            :route-name="routeName"
            :route-data="routeData"
            :home-point="homePoint"
            :arrival-point="arrivalPoint"
            :center-location="getCenterLocation()"
            :highlight-point="highlightPoint"
          />
        </div>

        <!-- 地圖連結區域 -->
        <div class="map-links-section mb-4" v-if="hasMapLinks">
          <div class="section-title">🔗 外部地圖連結</div>
          <div class="map-buttons d-flex flex-wrap gap-2">
            <v-btn
              v-if="arrivalMap"
              size="small"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-crosshairs-gps"
              :href="arrivalMap"
              target="_blank"
              class="mr-2 mb-1 text-none"
            >
              垃圾車位置
            </v-btn>
            <v-btn
              v-if="homeMap"
              size="small"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-home"
              :href="homeMap"
              target="_blank"
              class="mr-2 mb-1 text-none"
            >
              監看點位置
            </v-btn>
            <v-btn
              v-if="dataPlacemap"
              size="small"
              color="info"
              variant="outlined"
              prepend-icon="mdi-crosshairs"
              :href="dataPlacemap"
              target="_blank"
              class="mb-1 text-none"
            >
              GPS定位
            </v-btn>
          </div>
        </div>

        <!-- 所有站點列表 -->
        <div class="stations-section" v-if="hasStations">
          <div class="section-title">🚏 所有站點</div>
          <StationsList
            :line-label="routeName"
            :stations="safeStations"
            :current-arrival-rank="safeCurrentArrivalRank"
          />
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import StationStatus from './StationStatus.vue'
import StationsList from './StationsList.vue'
import OpenStreetMapView from './OpenStreetMapView.vue'

export default defineComponent({
  name: 'RoutePanel',

  components: {
    StationStatus,
    StationsList,
    OpenStreetMapView
  },

  props: {
    routeName: {
      type: String,
      default: '路線'
    },
    routeIcon: {
      type: String,
      default: 'mdi-bus'
    },
    routeData: {
      type: Object,
      default: () => ({})
    },
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
    }
  },

  setup(props) {
    const expanded = ref(false)
    const highlightPoint = ref(null)

    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v

    const handleShowHomePointOnMap = (pointData) => {
      console.log('RoutePanel 接收到顯示監看點請求:', pointData)

      if (!expanded.value) {
        expanded.value = true
      }

      highlightPoint.value = pointData

      setTimeout(() => {
        highlightPoint.value = { ...pointData, timestamp: Date.now() }
      }, 300)
    }

    const handleGPSLocation = (gpsData) => {
      console.log('GPS定位被點擊，顯示垃圾車當前位置:', gpsData)

      if (!expanded.value) {
        expanded.value = true
      }

      const pointData = gpsData || {
        point: props.arrivalPoint,
        type: 'gps',
        title: '🚛 垃圾車GPS定位',
        description: `垃圾車目前位置 - ${unwrap(props.arrivalPoint.name) || '未知位置'}`
      }

      if (pointData.point && pointData.point.id) {
        console.log('設置GPS高亮點:', pointData)

        highlightPoint.value = pointData

        setTimeout(() => {
          highlightPoint.value = { ...pointData, timestamp: Date.now() }
        }, 300)
      } else {
        console.warn('沒有有效的GPS定位數據')
      }
    }

    const hasMapLinks = computed(() => {
      return !!(props.arrivalMap || props.homeMap || props.dataPlacemap)
    })

    const hasStations = computed(() => {
      return !!(props.routeData?.points?.point && Array.isArray(props.routeData.points.point))
    })

    const getQuickStatusColor = () => {
      if (props.isLate === null || props.isLate === undefined) return 'grey'
      if (props.isLate > 0) return 'error'
      if (props.isLate === 0) return 'success'
      return 'primary'
    }

    const getQuickStatusIcon = () => {
      if (props.isLate === null || props.isLate === undefined) return 'mdi-help-circle-outline'
      if (props.isLate > 0) return 'mdi-check-circle'
      if (props.isLate === 0) return 'mdi-map-marker'
      return 'mdi-clock-outline'
    }

    const getQuickStatusText = () => {
      if (props.isLate === null || props.isLate === undefined) return '載入中'
      if (props.isLate > 0) return `已離開 ${props.isLate} 站`
      if (props.isLate === 0) return '垃圾車到了！'
      return `還有 ${-props.isLate} 站`
    }

    const toggleExpanded = () => {
      expanded.value = !expanded.value
    }

    const safeRouteData = computed(() => {
      return props.routeData || {}
    })

    const safeStations = computed(() => {
      return safeRouteData.value.points?.point || []
    })

    const safeCurrentArrivalRank = computed(() => {
      const rank = safeRouteData.value.arrival?.['#text'] || safeRouteData.value.arrival || 0
      return parseInt(rank) || 0
    })

    const getCenterLocation = () => {
      const defaultCenter = {
        lat: 24.9896,
        lng: 121.4953
      }

      if (props.homePoint?.latitude && props.homePoint?.longitude) {
        const lat = parseFloat(props.homePoint.latitude?.['#text'] || props.homePoint.latitude || 0)
        const lng = parseFloat(props.homePoint.longitude?.['#text'] || props.homePoint.longitude || 0)

        if (lat !== 0 && lng !== 0) {
          return { lat, lng }
        }
      }

      if (props.arrivalPoint?.latitude && props.arrivalPoint?.longitude) {
        const lat = parseFloat(props.arrivalPoint.latitude?.['#text'] || props.arrivalPoint.latitude || 0)
        const lng = parseFloat(props.arrivalPoint.longitude?.['#text'] || props.arrivalPoint.longitude || 0)

        if (lat !== 0 && lng !== 0) {
          return { lat, lng }
        }
      }

      return defaultCenter
    }

    const formatScheduledTime = (time) => {
      if (!time) return '未知'
      const date = new Date(time)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatEstimatedTime = (time) => {
      if (!time) return '未知'
      const date = new Date(time)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const getTimeDifference = () => {
      if (!props.homePoint.arrival || !props.arrivalPoint.arrival) return null
      const scheduled = new Date(props.homePoint.arrival)
      const actual = new Date(props.arrivalPoint.arrival)
      const diff = actual - scheduled

      const minutes = Math.floor(diff / 1000 / 60)

      return `${Math.abs(minutes)} 分鐘`
    }

    const getTimeDifferenceClass = () => {
      const diff = getTimeDifference()
      if (!diff) return ''

      const minutes = parseInt(diff)
      return minutes < 0 ? 'text-error' : 'text-success'
    }

    return {
      expanded,
      highlightPoint,
      handleShowHomePointOnMap,
      handleGPSLocation,
      hasMapLinks,
      hasStations,
      getQuickStatusColor,
      getQuickStatusIcon,
      getQuickStatusText,
      toggleExpanded,
      unwrap,
      safeRouteData,
      safeStations,
      safeCurrentArrivalRank,
      getCenterLocation,
      formatScheduledTime,
      formatEstimatedTime,
      getTimeDifference,
      getTimeDifferenceClass
    }
  }
})
</script>

<style scoped>
.route-panel-container {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}

.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
}

.route-title {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.quick-status {
  flex-shrink: 0;
}

.main-status-area {
  padding: 12px;
  background: #ffffff;
}

.expand-section {
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.detailed-info {
  padding: 12px;
  background: #fafbfc;
  border-top: 1px solid #dee2e6;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid #e9ecef;
}

.map-section {
  margin-bottom: 16px;
}

.map-links-section {
  margin-bottom: 16px;
}

.map-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.time-info-section {
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.time-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.time-info-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-label {
  font-size: 0.85rem;
  color: #868e96;
  margin-bottom: 4px;
}

.time-value {
  font-size: 1.1rem;
  font-weight: 500;
}

@media (max-width: 600px) {
  .route-panel-container {
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .route-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
  }

  .quick-status {
    align-self: stretch;
  }

  .main-status-area {
    padding: 8px;
  }

  .expand-section {
    padding: 6px 12px;
  }

  .detailed-info {
    padding: 8px;
  }

  .section-title {
    font-size: 0.9rem;
    margin-bottom: 6px;
    padding-bottom: 3px;
  }

  .map-section {
    margin-bottom: 12px;
  }

  .map-links-section {
    margin-bottom: 12px;
  }

  .map-buttons {
    justify-content: center;
    gap: 4px;
  }

  .time-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
