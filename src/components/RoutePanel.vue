<template>
  <div class="route-panel-container">
    <!-- 路線標題 -->
    <div class="route-header">
      <div class="route-title">
        <q-icon :name="routeIcon" size="1.5rem" color="primary" class="q-mr-sm" />
        <span class="text-h6">{{ routeName }}</span>
      </div>

      <!-- 快速狀態指示器 -->
      <div class="quick-status">
        <q-chip
          :color="getQuickStatusColor()"
          text-color="white"
          :icon="getQuickStatusIcon()"
          size="sm"
        >
          {{ getQuickStatusText() }}
        </q-chip>
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
        <!-- 路線地圖區域 -->
        <div class="map-section q-mb-md" v-if="hasStations">
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
        <div class="map-links-section q-mb-md" v-if="hasMapLinks">
          <div class="section-title">🔗 外部地圖連結</div>
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
              class="q-mr-sm q-mb-xs"
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
              class="q-mr-sm q-mb-xs"
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
          <div class="section-title">🚏 所有站點</div>
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

    return {
      expanded,
      highlightPoint,
      handleShowHomePointOnMap,
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
      getCenterLocation
    }
  }
})
</script>

<style scoped>
.route-panel-container {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
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
  padding: 20px;
  background: #ffffff;
}

.expand-section {
  padding: 12px 20px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.detailed-info {
  padding: 20px;
  background: #fafbfc;
  border-top: 1px solid #dee2e6;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #e9ecef;
}

.map-section {
  margin-bottom: 24px;
}

.map-links-section {
  margin-bottom: 24px;
}

.map-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stations-section {
  /* 站點區域不需要額外樣式，StationsList 組件會處理 */
}

/* 響應式設計 */
@media (max-width: 600px) {
  .route-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .quick-status {
    align-self: stretch;
  }

  .map-buttons {
    justify-content: center;
  }
}
</style>
