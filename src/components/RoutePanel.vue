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

        <!-- 獨立功能按鈕 -->
    <div class="route-actions">
      <q-btn
        color="primary"
        outline
        :icon="expanded ? 'expand_less' : 'expand_more'"
        :label="expanded ? '收起站點' : '查看所有站點'"
        no-caps
        @click="toggleExpanded"
      />
      <q-btn
        color="primary"
        unelevated
        icon="map"
        label="開啟路線地圖"
        no-caps
        :disable="!hasStations"
        @click="handleZoomMapClick"
      />
    </div>

    <!-- 站點資訊區域 -->
    <q-slide-transition>
      <div v-show="expanded" class="detailed-info">
        <!-- 所有站點列表 -->
        <div v-if="hasStations" class="stations-section">
          <div class="section-title">所有站點</div>
          <StationsList
            :line-label="routeName"
            :stations="safeStations"
            :current-arrival-rank="safeCurrentArrivalRank"
          />
        </div>
      </div>
    </q-slide-transition>

    <q-dialog
      v-model="mapDialogOpen"
      maximized
      persistent
      no-refocus
      no-route-dismiss
      transition-show="fade"
      transition-hide="fade"
      @show="handleMapDialogShow"
      @hide="handleMapDialogHide"
    >
      <q-card class="map-dialog-card">
        <q-toolbar class="map-dialog-toolbar">
          <q-icon name="map" color="primary" size="sm" class="q-mr-sm" />
          <q-toolbar-title>{{ routeName }} 路線地圖</q-toolbar-title>
          <q-btn
            flat
            round
            dense
            icon="close"
            aria-label="關閉路線地圖"
            @click="closeMapDialog"
          />
        </q-toolbar>

                <q-card-section class="map-dialog-body">
          <OpenStreetMapView
            class="dialog-map"
            :route-name="routeName"
            :route-data="routeData"
            :home-point="homePoint"
            :arrival-point="arrivalPoint"
            :center-location="getCenterLocation()"
            :highlight-point="highlightPoint"
            @refresh="handleRefresh"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, computed, nextTick } from 'vue'
import StationStatus from './StationStatus.vue'
import StationsList from './StationsList.vue'
import OpenStreetMapView from './OpenStreetMapView.vue'
import { unwrap } from 'src/utils/xml'

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

    emits: ['map-interaction-change', 'refresh'],

  setup(props, { emit }) {
    const expanded = ref(false)
    const highlightPoint = ref(null)
    const mapDialogOpen = ref(false)
    let savedScrollTop = 0
    let openFrame = null

    const captureScrollPosition = () => {
      if (typeof window === 'undefined') return

      savedScrollTop = window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
    }

    const restoreScrollPosition = () => {
      if (typeof window === 'undefined') return

      const scrollTop = savedScrollTop
      nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: scrollTop,
              left: 0,
              behavior: 'auto'
            })
          })
        })
      })
    }

    const openMapDialog = () => {
      captureScrollPosition()

      if (openFrame !== null) {
        cancelAnimationFrame(openFrame)
      }

      openFrame = requestAnimationFrame(() => {
        mapDialogOpen.value = true
        openFrame = null
      })
    }

    const closeMapDialog = () => {
      mapDialogOpen.value = false
    }

    const handleMapDialogShow = () => {
      emit('map-interaction-change', true)
    }

    const handleMapDialogHide = () => {
      emit('map-interaction-change', false)
      restoreScrollPosition()
    }

    // 處理顯示監看點在地圖上的事件
    const handleShowHomePointOnMap = (pointData) => {
      console.log('RoutePanel 接收到顯示監看點請求:', pointData)

      openMapDialog()

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

        openMapDialog()

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

    const hasStations = computed(() => {
      return !!(props.routeData?.points?.point && Array.isArray(props.routeData.points.point))
    })

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

    const handleZoomMapClick = () => {
      highlightPoint.value = null
      openMapDialog()
    }

    const handleRefresh = () => {
      emit('refresh')
    }

        return {
      handleZoomMapClick,
      handleRefresh,
      expanded,
      mapDialogOpen,
      highlightPoint,
      openMapDialog,
      closeMapDialog,
      handleMapDialogShow,
      handleMapDialogHide,
      handleShowHomePointOnMap,
      handleGPSLocation,
      hasStations,
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

.main-status-area {
  padding: 8px; /* 進一步緊湊 */
  background: #ffffff;
}

.route-actions {
  padding: 8px 12px;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.route-actions :deep(.q-btn) {
  min-height: 40px;
  border-radius: 8px;
  font-weight: 500;
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

.map-dialog-card {
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-radius: 0;
}

.map-dialog-toolbar {
  flex: 0 0 auto;
  background: #ffffff;
  border-bottom: 1px solid #dee2e6;
}

.map-dialog-body {
  flex: 1;
  min-height: 0;
  padding: 0;
  display: flex;
}

.dialog-map {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  box-shadow: none;
}

.dialog-map :deep(.map-header) {
  display: none;
}

.dialog-map :deep(.map-wrapper) {
  flex: 1;
  height: auto;
  min-height: 0;
}

.stations-section {
  /* 站點區域不需要額外樣式，StationsList 組件會處理 */
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

  .main-status-area {
    padding: 8px; /* 手機端進一步減少 */
  }

    .route-actions {
    padding: 6px 10px;
    gap: 8px;
  }
  
  .route-actions :deep(.q-btn) {
    min-height: 36px;
    font-size: 0.85rem;
  }

  .detailed-info {
    padding: 8px;
  }

  .section-title {
    font-size: 0.9rem;
    margin-bottom: 6px;
    padding-bottom: 3px;
  }
}
</style>
