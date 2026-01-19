<template>
  <div class="route-panel-container">
    <!-- 路線標題 -->
    <div class="route-header">
      <div class="route-title">
        <q-icon :name="routeIcon" size="1.5rem" color="primary" class="q-mr-sm" />
        <span class="text-h6">{{ routeName }}</span>
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
      <q-btn
        @click="toggleExpanded"
        :icon="expanded ? 'expand_less' : 'expand_more'"
        :label="expanded ? '收起詳細資訊' : '查看所有站點'"
        flat
        color="primary"
        class="full-width"
        no-caps
      />
    </div>

    <!-- 詳細資訊區域 -->
    <q-slide-transition>
      <div v-show="expanded" class="detailed-info">
        <!-- 時間資訊區域 -->
        <div class="time-info-section q-mb-sm">
          <div class="section-title">時間資訊</div>
          <div class="time-info-grid">
            <div class="time-info-card" v-if="scheduledTime">
              <div class="time-label">表定時間</div>
              <div class="time-value scheduled-time">
                {{ scheduledTime }}
              </div>
            </div>
            <div class="time-info-card" v-if="estimatedTime">
              <div class="time-label">預估到達</div>
              <div class="time-value estimated-time">
                {{ estimatedTime }}
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
        <div class="map-section q-mb-sm" v-if="hasStations">
          <div class="section-title">路線地圖</div>
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
        <div class="map-links-section q-mb-sm" v-if="hasMapLinks">
          <div class="section-title">外部地圖連結</div>
          <div class="map-buttons">
            <q-btn
              v-if="arrivalMap"
              size="sm"
              color="primary"
              outline
              icon="my_location"
              label="垃圾車位置"
              :href="arrivalMap"
              target="_blank"
              no-caps
              class="q-mr-xs q-mb-xs"
            />
            <q-btn
              v-if="homeMap"
              size="sm"
              color="secondary"
              outline
              icon="home"
              label="監看點位置"
              :href="homeMap"
              target="_blank"
              no-caps
              class="q-mr-xs q-mb-xs"
            />
            <q-btn
              v-if="dataPlacemap"
              size="sm"
              color="accent"
              outline
              icon="gps_fixed"
              label="GPS定位"
              :href="dataPlacemap"
              target="_blank"
              no-caps
              class="q-mb-xs"
            />
          </div>
        </div>

        <!-- 所有站點列表 -->
        <div class="stations-section" v-if="hasStations">
          <div class="section-title">所有站點</div>
          <StationsList
            :line-label="routeName"
            :stations="safeStations"
            :current-arrival-rank="safeCurrentArrivalRank"
          />
        </div>
      </div>
    </q-slide-transition>
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
      default: 'directions_bus'
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

    // 輔助函數：提取值
    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v

    // 處理顯示監看點在地圖上的事件
    const handleShowHomePointOnMap = (pointData) => {
      console.log('RoutePanel 接收到顯示監看點請求:', pointData)

      // 如果詳細資訊區域未展開，先展開它
      if (!expanded.value) {
        expanded.value = true
      }

      // 設置高亮點數據
      highlightPoint.value = pointData

      // 延遲一點確保地圖已渲染
      setTimeout(() => {
        highlightPoint.value = { ...pointData, timestamp: Date.now() }
      }, 300)
    }

    // 處理GPS定位功能 - 在地圖上顯示垃圾車當前位置
    const handleGPSLocation = (gpsData) => {
      console.log('GPS定位被點擊，顯示垃圾車當前位置:', gpsData)

      // 如果詳細資訊區域未展開，先展開它
      if (!expanded.value) {
        expanded.value = true
      }

      // 使用傳入的GPS數據或預設使用arrivalPoint
      const pointData = gpsData || {
        point: props.arrivalPoint,
        type: 'gps',
        title: '垃圾車GPS定位',
        description: `垃圾車目前位置 - ${unwrap(props.arrivalPoint.name) || '未知位置'}`
      }

      // 檢查是否有有效的GPS位置數據
      if (pointData.point && pointData.point.id) {
        console.log('設置GPS高亮點:', pointData)

        // 設置高亮點數據
        highlightPoint.value = pointData

        // 延遲一點確保地圖已渲染
        setTimeout(() => {
          highlightPoint.value = { ...pointData, timestamp: Date.now() }
        }, 300)
      } else {
        console.warn('沒有有效的GPS定位數據')
        // 這裡可以添加用戶提示，比如使用Quasar的Notify
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
      if (props.isLate > 0) return 'negative'
      if (props.isLate === 0) return 'positive'
      return 'primary'
    }

    const getQuickStatusIcon = () => {
      if (props.isLate === null || props.isLate === undefined) return 'help_outline'
      if (props.isLate > 0) return 'check_circle'
      if (props.isLate === 0) return 'location_on'
      return 'schedule'
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

    // 安全地獲取 routeData 的屬性
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

    // 獲取地圖中心位置
    const getCenterLocation = () => {
      // 預設中心位置：中和中山路三段32號附近
      const defaultCenter = {
        lat: 24.9896,
        lng: 121.4953
      }

      // 如果有監看點位置，使用監看點作為中心
      if (props.homePoint?.latitude && props.homePoint?.longitude) {
        const lat = parseFloat(props.homePoint.latitude?.['#text'] || props.homePoint.latitude || 0)
        const lng = parseFloat(props.homePoint.longitude?.['#text'] || props.homePoint.longitude || 0)

        if (lat !== 0 && lng !== 0) {
          return { lat, lng }
        }
      }

      // 如果有垃圾車當前位置，使用當前位置作為中心
      if (props.arrivalPoint?.latitude && props.arrivalPoint?.longitude) {
        const lat = parseFloat(props.arrivalPoint.latitude?.['#text'] || props.arrivalPoint.latitude || 0)
        const lng = parseFloat(props.arrivalPoint.longitude?.['#text'] || props.arrivalPoint.longitude || 0)

        if (lat !== 0 && lng !== 0) {
          return { lat, lng }
        }
      }

      return defaultCenter
    }

    // 格式化表定時間
    const formatScheduledTime = (time) => {
      if (!time) return null
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return null
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // 格式化預估到達時間
    const formatEstimatedTime = (time) => {
      if (!time) return null
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return null
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // 獲取時間差異
    const getTimeDifference = () => {
      const scheduledRaw = unwrap(props.homePoint.arrival)
      const actualRaw = unwrap(props.arrivalPoint.arrival)
      if (!scheduledRaw || !actualRaw) return null

      const scheduled = new Date(scheduledRaw)
      const actual = new Date(actualRaw)
      if (Number.isNaN(scheduled.getTime()) || Number.isNaN(actual.getTime())) return null

      const diff = actual - scheduled

      // 轉換為分鐘
      const minutes = Math.floor(diff / 1000 / 60)

      if (Number.isNaN(minutes)) return null
      return `${Math.abs(minutes)} 分鐘`
    }

    // 獲取時間差異的樣式
    const getTimeDifferenceClass = () => {
      const diff = getTimeDifference()
      if (!diff) return ''

      const minutes = parseInt(diff)
      return minutes < 0 ? 'text-negative' : 'text-positive'
    }

    const scheduledTime = computed(() => formatScheduledTime(unwrap(props.homePoint.schedule)))
    const estimatedTime = computed(() => formatEstimatedTime(unwrap(props.homePoint.arrival)))

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
      scheduledTime,
      estimatedTime,
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
  border-radius: 8px; /* 從 12px 減少 */
  overflow: hidden;
  margin-bottom: 8px; /* 添加組件間距但保持緊湊 */
}

.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px; /* 進一步緊湊 */
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
  padding: 8px; /* 進一步緊湊 */
  background: #ffffff;
}

.expand-section {
  padding: 6px 12px; /* 進一步緊湊 */
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.detailed-info {
  padding: 8px; /* 進一步緊湊 */
  background: #fafbfc;
  border-top: 1px solid #dee2e6;
}

.section-title {
  font-size: 0.95rem; /* 從 1rem 略減 */
  font-weight: 600;
  color: #495057;
  margin-bottom: 6px; /* 進一步緊湊 */
  padding-bottom: 3px; /* 進一步緊湊 */
  border-bottom: 2px solid #e9ecef;
}

.map-section {
  margin-bottom: 10px; /* 進一步緊湊 */
}

.map-links-section {
  margin-bottom: 10px; /* 進一步緊湊 */
}

.map-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px; /* 進一步緊湊 */
}

.stations-section {
  /* 站點區域不需要額外樣式，StationsList 組件會處理 */
}

/* 時間資訊區域樣式 */
.time-info-section {
  padding: 8px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.time-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.time-info-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-label {
  font-size: 0.85rem;
  color: #868e96;
  margin-bottom: 2px;
}

.time-value {
  font-size: 1rem;
  font-weight: 500;
}

/* 響應式設計 - 手機端進一步優化 */
@media (max-width: 600px) {
  .route-panel-container {
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .route-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px; /* 從 12px 減少 */
    padding: 10px 12px; /* 進一步減少 */
  }

  .quick-status {
    align-self: stretch;
  }

  .main-status-area {
    padding: 8px; /* 手機端進一步減少 */
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
