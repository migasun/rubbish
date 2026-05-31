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
        :icon="localExpanded ? 'expand_less' : 'expand_more'"
        :label="localExpanded ? '收起站點' : '查看所有站點'"
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
      <div v-show="localExpanded" class="detailed-info">
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
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import StationStatus from './StationStatus.vue'
import StationsList from './StationsList.vue'
import { unwrap } from 'src/utils/xml'

export default defineComponent({
  name: 'RoutePanel',

  components: {
    StationStatus,
    StationsList
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
    },
    expanded: {
      type: Boolean,
      default: false
    }
  },

  emits: ['map-interaction-change', 'refresh', 'update:expanded', 'open-map'],

  setup(props, { emit }) {
    const localExpanded = computed({
      get: () => props.expanded,
      set: (val) => emit('update:expanded', val)
    })

    // 處理顯示監看點在地圖上的事件
    const handleShowHomePointOnMap = (pointData) => {
      console.log('RoutePanel 接收到顯示監看點請求:', pointData)
      emit('open-map', pointData)
    }

    // 處理GPS定位功能 - 在地圖上顯示垃圾車當前位置
    const handleGPSLocation = (gpsData) => {
      console.log('GPS定位被點擊，顯示垃圾車當前位置:', gpsData)

      // 如果詳細資訊區域未展開，先展開它
      if (!localExpanded.value) {
        localExpanded.value = true
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
        emit('open-map', pointData)
      } else {
        console.warn('沒有有效的GPS定位數據')
      }
    }

    const hasStations = computed(() => {
      return !!(props.routeData?.points?.point && Array.isArray(props.routeData.points.point))
    })

    const toggleExpanded = () => {
      localExpanded.value = !localExpanded.value
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

    const handleZoomMapClick = () => {
      emit('open-map', null)
    }

    const handleRefresh = () => {
      emit('refresh')
    }

    return {
      handleZoomMapClick,
      handleRefresh,
      localExpanded,
      handleShowHomePointOnMap,
      handleGPSLocation,
      hasStations,
      toggleExpanded,
      unwrap,
      safeRouteData,
      safeStations,
      safeCurrentArrivalRank
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
