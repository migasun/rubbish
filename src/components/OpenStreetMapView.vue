<template>
  <div class="route-map-container">
    <div class="map-header q-pa-sm">
      <div class="text-subtitle1 text-weight-medium">
        <q-icon name="map" class="q-mr-sm" />
        {{ routeName }} 路線地圖
      </div>
      <div class="text-caption text-grey-7">
        顯示垃圾車路線及各站點位置 (使用 OpenStreetMap)
      </div>
    </div>

    <div class="map-wrapper">
      <div ref="mapContainer" class="leaflet-map"></div>

      <!-- 懸浮地圖定位控制列 -->
      <div v-if="mapState === 'ready'" class="map-floating-controls">
        <q-btn
          round
          color="white"
          text-color="primary"
          icon="refresh"
          class="floating-btn"
          :loading="isRefreshing"
          @click="triggerRefresh"
        >
          <q-tooltip anchor="center left" self="center right">重新整理數據</q-tooltip>
        </q-btn>
        <q-btn
          round
          color="white"
          text-color="primary"
          icon="map"
          class="floating-btn"
          @click="adjustMapBounds"
        >
          <q-tooltip anchor="center left" self="center right">顯示完整路線</q-tooltip>
        </q-btn>
        <q-btn
          round
          color="white"
          text-color="secondary"
          icon="home"
          :disable="!homePoint || !homePoint.id"
          class="floating-btn"
          @click="focusOnHomePoint"
        >
          <q-tooltip anchor="center left" self="center right">定位監看點</q-tooltip>
        </q-btn>
        <q-btn
          round
          color="white"
          text-color="accent"
          icon="gps_fixed"
          :disable="!arrivalPoint || !arrivalPoint.id"
          class="floating-btn"
          @click="focusOnArrivalPoint"
        >
          <q-tooltip anchor="center left" self="center right">定位垃圾車</q-tooltip>
        </q-btn>
      </div>

      <!-- 載入狀態 -->
      <div v-if="mapState === 'loading'" class="map-overlay">
        <q-spinner-dots size="50px" color="primary" />
        <div class="q-mt-md">載入地圖中...</div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else-if="mapState === 'error'" class="map-overlay">
        <q-icon name="error" size="50px" color="negative" />
        <div class="q-mt-md">{{ errorMessage }}</div>
        <q-btn
          color="primary"
          label="重新載入"
          class="q-mt-md"
          @click="retryInit"
        />
      </div>

      <!-- 成功但無數據 -->
      <div v-else-if="mapState === 'ready' && !hasValidData" class="map-overlay">
        <q-icon name="info" size="50px" color="info" />
        <div class="q-mt-md">等待路線數據...</div>
      </div>
    </div>

    <!-- 圖例 -->
    <div v-if="mapState === 'ready'" class="map-legend q-pa-sm">
      <div class="text-caption text-weight-medium q-mb-xs">圖例說明</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-marker current-location"></div>
          <span>垃圾車目前位置</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker home-point"></div>
          <span>監看點位置</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker cleaned-point"></div>
          <span>已清運站點</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker current-point"></div>
          <span>清運中站點</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker pending-point"></div>
          <span>待清運站點</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, watch, nextTick, onUnmounted, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// 導入 Leaflet 樣式修復
import '../css/leaflet-fixes.scss'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { unwrap } from 'src/utils/xml'

// 修復 Leaflet 預設標記圖標問題
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow
})

export default defineComponent({
  name: 'OpenStreetMapView',

  props: {
    routeName: {
      type: String,
      default: '清運路線'
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
    centerLocation: {
      type: Object,
      default: () => ({
        lat: 24.9896,
        lng: 121.4953
      })
    },
    highlightPoint: {
      type: Object,
      default: null
    }
  },

    emits: ['refresh'],

  setup(props, { emit }) {
    const mapContainer = ref(null)
    const mapState = ref('loading') // 'loading', 'ready', 'error'
    const errorMessage = ref('')
    const map = ref(null)
    const markersLayer = ref(null)
    const highlightMarker = ref(null)

    // 檢查是否有有效數據
    const hasValidData = computed(() => {
      return props.routeData?.points?.point &&
             Array.isArray(props.routeData.points.point) &&
             props.routeData.points.point.length > 0
    })

    // 建立統一的 Popup HTML 內容 (含外部連結)
    function buildPopupHtml(point, title, description = '', type = '') {
      const lat = parseFloat(unwrap(point.latitude) || 0)
      const lng = parseFloat(unwrap(point.longitude) || 0)
      const pointId = unwrap(point.id) || 'N/A'
      const name = unwrap(point.name) || '未命名'
      const schedule = unwrap(point.schedule) || '時程未定'
      const rank = unwrap(point.rank) || 'N/A'

      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      const nlscUrl = `https://maps.nlsc.gov.tw/go/${lng}/${lat}/15/EMAP_B/DMAPS,ROAD`

      let buttonsHtml = ''
      if (lat !== 0 && lng !== 0) {
        buttonsHtml = `
          <div class="map-popup-buttons-container">
            <a href="${googleMapsUrl}" target="_blank" class="map-popup-btn">
              <span class="material-icons">directions</span>
              Google 地圖
            </a>
        `
        if (type === 'home' || type === 'watcher') {
          buttonsHtml += `
            <a href="${nlscUrl}" target="_blank" class="map-popup-btn secondary">
              <span class="material-icons">map</span>
              國土測繪圖
            </a>
          `
        }
        buttonsHtml += '</div>'
      }

      return `
        <div class="map-popup-content">
          <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 6px; color: ${type === 'gps' ? '#FF5722' : type === 'home' ? '#2196F3' : '#333333'};">
            ${title}
          </div>
          <div style="font-size: 0.85rem; line-height: 1.5; color: #495057;">
            <div><strong>站點名稱:</strong> ${name}</div>
            <div><strong>站點編號:</strong> ${pointId}</div>
            <div><strong>清運時程:</strong> ${schedule}</div>
            <div><strong>清運順序:</strong> 第 ${rank} 站</div>
            ${description ? `<div style="margin-top: 4px; color: #6c757d;"><strong>備註:</strong> ${description}</div>` : ''}
          </div>
          ${buttonsHtml}
        </div>
      `
    }

    // 調整地圖視野以容納所有標記
    function adjustMapBounds() {
      if (!map.value || !hasValidData.value) return

      try {
        const bounds = new L.LatLngBounds()
        const points = Array.isArray(props.routeData.points.point)
          ? props.routeData.points.point
          : [props.routeData.points.point]

        let validCount = 0
        points.forEach((point) => {
          const lat = parseFloat(unwrap(point.latitude) || 0)
          const lng = parseFloat(unwrap(point.longitude) || 0)
          if (lat !== 0 && lng !== 0) {
            bounds.extend([lat, lng])
            validCount++
          }
        })

        if (validCount > 0 && bounds.isValid()) {
          map.value.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 16
          })
        }
      } catch (error) {
        console.error('調整地圖邊界失敗:', error)
      }
    }

    // 高亮顯示特定點
    function highlightSpecificPoint(pointData) {
      if (!map.value || !pointData || !pointData.point) {
        console.log('無法高亮點：地圖未準備或點數據無效')
        return
      }

      try {
        // 清除之前的高亮標記
        if (highlightMarker.value) {
          map.value.removeLayer(highlightMarker.value)
        }

        const point = pointData.point
        const lat = parseFloat(unwrap(point.latitude) || 0)
        const lng = parseFloat(unwrap(point.longitude) || 0)

        if (lat === 0 || lng === 0) {
          console.log('點的座標無效:', lat, lng)
          return
        }

        console.log('高亮顯示點:', pointData.title, lat, lng)

        // 創建高亮標記 - 使用不同的樣式突出顯示
        highlightMarker.value = new L.CircleMarker([lat, lng], {
          radius: 15,
          fillColor: '#FFD700', // 金黃色
          color: '#FF6B00',     // 橙色邊框
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
          className: 'highlight-marker'
        })

        // 彈出視窗內容
        const popupContent = buildPopupHtml(
          point,
          pointData.title || '特別標記點',
          pointData.description || '',
          pointData.type
        )

        // 綁定彈出視窗並立即顯示
        highlightMarker.value.bindPopup(popupContent).openPopup()

        // 添加到地圖
        map.value.addLayer(highlightMarker.value)

        // 將地圖中心移到該點並調整縮放
        map.value.setView([lat, lng], 16, {
          animate: true,
          duration: 1
        })

        console.log('高亮標記添加成功')

      } catch (error) {
        console.error('高亮顯示點失敗:', error)
      }
    }

    // 初始化地圖
    async function initMap() {
      if (!mapContainer.value) {
        console.error('地圖容器未找到')
        return
      }

      try {
        console.log('開始初始化地圖...')
        mapState.value = 'loading'

        // 直接初始化地圖，不需要載入 CDN 資源
        await nextTick()

        // 創建地圖實例 - leaflet@2.0.0-alpha 使用 new L.Map()
        map.value = new L.Map(mapContainer.value, {
          zoomControl: true,
          attributionControl: true
        })
        map.value.setView([props.centerLocation.lat, props.centerLocation.lng], 13)

        // 添加 OpenStreetMap 圖層 - 也需要使用 new
        const tileLayer = new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        })
        map.value.addLayer(tileLayer)

        console.log('地圖初始化完成')
        mapState.value = 'ready'

        // 添加標記
        addMarkers()
        requestAnimationFrame(() => {
          if (map.value?.invalidateSize) {
            map.value.invalidateSize()
          }
        })

        if (props.highlightPoint) {
          highlightSpecificPoint(props.highlightPoint)
        }

      } catch (error) {
        console.error('地圖初始化失敗:', error)
        mapState.value = 'error'
        errorMessage.value = error.message || '地圖載入失敗'
      }
    }

    // 添加標記
    function addMarkers() {
      if (!map.value || !hasValidData.value) {
        console.log('無法添加標記：地圖未準備或無數據')
        return
      }

      try {
        console.log('開始添加標記...')

        // 清理舊標記
        if (markersLayer.value) {
          map.value.removeLayer(markersLayer.value)
        }

        // leaflet@2.0.0-alpha 需要使用 new
        markersLayer.value = new L.LayerGroup()
        let validMarkerCount = 0

        const points = Array.isArray(props.routeData.points.point)
          ? props.routeData.points.point
          : [props.routeData.points.point]

        const homePointId = parseInt(unwrap(props.homePoint.id) || 0)
        const arrivalPointId = parseInt(unwrap(props.arrivalPoint.id) || 0)

        points.forEach((point, index) => {
          const lat = parseFloat(unwrap(point.latitude) || 0)
          const lng = parseFloat(unwrap(point.longitude) || 0)

          if (lat === 0 || lng === 0) return

          const pointId = parseInt(unwrap(point.id) || 0)
          const pointName = unwrap(point.name) || `站點 ${index + 1}`
          const schedule = unwrap(point.schedule) || '時程未定'
          const rank = unwrap(point.rank) || (index + 1)

          // 創建帶編號的自定義標記
          let markerHtml, className, title, popupContent

          if (pointId === arrivalPointId) {
            // 垃圾車目前位置 - 使用自定義向量 SVG 圖標
            markerHtml = `
              <div class="truck-marker-svg-container">
                <svg viewBox="0 0 64 64" width="36" height="36" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
                  <!-- Base chassis (black/grey) -->
                  <rect x="10" y="38" width="44" height="6" fill="#424242" rx="1" />
                  <!-- Cargo body (yellow garbage truck) -->
                  <path d="M12 20 h26 v18 H12 z" fill="#FBC02D" />
                  <!-- Slanted back of the cargo body -->
                  <path d="M8 26 l4-6 v18 l-4-4 z" fill="#F57F17" />
                  <!-- Driver cabin (white/light grey) -->
                  <path d="M38 24 h10 l4 6 v8 H38 z" fill="#EEEEEE" />
                  <!-- Cabin window (dark blue/grey) -->
                  <path d="M41 26 h6 l2 4 h-8 z" fill="#37474F" />
                  <!-- Wheels (black circles with white rims) -->
                  <circle cx="20" cy="44" r="7" fill="#212121" stroke="#FFFFFF" stroke-width="1.5" />
                  <circle cx="42" cy="44" r="7" fill="#212121" stroke="#FFFFFF" stroke-width="1.5" />
                  <!-- Orange warning light on top of cabin -->
                  <rect x="42" y="22" width="4" height="2" fill="#FF9800" rx="0.5" class="warning-light" />
                </svg>
                <div class="marker-number">${rank}</div>
              </div>
            `
            className = 'truck-marker-container'
            title = `垃圾車目前位置 - ${pointName}`
            popupContent = buildPopupHtml(
              point,
              `🚛 ${title}`,
              '正在進行垃圾清運',
              'gps'
            )
          } else if (pointId === homePointId) {
            // 監看點 - 使用特殊標記
            markerHtml = `
              <div class="home-marker">
                <div class="marker-icon">📍</div>
                <div class="marker-number">${rank}</div>
              </div>
            `
            className = 'home-marker-container'
            title = `監看點 - ${pointName}`
            popupContent = buildPopupHtml(
              point,
              `📍 ${title}`,
              `表定清運時間: ${schedule}`,
              'home'
            )
          } else {
            // 普通站點 - 根據清運狀態使用不同顏色
            const currentArrivalRank = parseInt(unwrap(props.arrivalPoint.rank) || 0)
            const pointRank = parseInt(rank)

            let markerClass, statusText, statusIcon

            if (pointRank < currentArrivalRank) {
              // 已清運的站點 - 使用綠色
              markerClass = 'cleaned-marker'
              statusText = '已清運'
              statusIcon = '✓'
            } else if (pointRank === currentArrivalRank) {
              // 當前站點 - 使用橙色
              markerClass = 'current-marker'
              statusText = '清運中'
              statusIcon = '🚛'
            } else {
              // 未清運的站點 - 使用藍色
              markerClass = 'pending-marker'
              statusText = '待清運'
              statusIcon = '○'
            }

            markerHtml = `
              <div class="route-marker ${markerClass}">
                <div class="marker-number-circle">${rank}</div>
                <div class="marker-status-icon">${statusIcon}</div>
              </div>
            `
            className = 'route-marker-container'
            title = `站點 ${rank} - ${pointName}`
            popupContent = buildPopupHtml(
              point,
              `${title} (${statusText})`,
              `清運狀態: ${statusText}`,
              'station'
            )
          }

          // 創建自定義圖標
          const customIcon = new L.DivIcon({
            html: markerHtml,
            className: className,
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40]
          })

          // 創建標記
          const marker = new L.Marker([lat, lng], {
            icon: customIcon
          })

          marker.bindPopup(popupContent)
          markersLayer.value.addLayer(marker)
          validMarkerCount++
        })

        if (validMarkerCount > 0) {
          map.value.addLayer(markersLayer.value)

          // 調整視野 - 僅在無高亮點時進行自動全圖縮放
          if (!props.highlightPoint) {
            requestAnimationFrame(() => {
              adjustMapBounds()
            })
          }

          console.log(`成功添加 ${validMarkerCount} 個標記`)
        }

      } catch (error) {
        console.error('添加標記失敗:', error)
      }
    }

    // 重試初始化
    function retryInit() {
      console.log('重試初始化地圖...')
      initMap()
    }

    // 監聽數據變化
    watch(() => [props.routeData, props.homePoint, props.arrivalPoint], () => {
      console.log('數據變化，更新標記...')
      if (mapState.value === 'ready') {
        addMarkers()
      }
    }, { deep: true })

    // 監聽高亮點變化
    watch(() => props.highlightPoint, (newHighlightPoint) => {
      if (mapState.value === 'ready') {
        if (newHighlightPoint) {
          console.log('接收到高亮點請求:', newHighlightPoint)
          highlightSpecificPoint(newHighlightPoint)
        } else if (map.value) {
          // 清除先前的高亮標記
          if (highlightMarker.value) {
            map.value.removeLayer(highlightMarker.value)
            highlightMarker.value = null
          }
          adjustMapBounds()
        }
      }
    }, { deep: true })

    // 生命週期
    onMounted(async () => {
      console.log('組件掛載，開始初始化...')
      // 延遲一點確保 DOM 穩定
      await new Promise(resolve => setTimeout(resolve, 50))
      initMap()
    })

        onUnmounted(() => {
      console.log('組件卸載，清理地圖...')
      if (map.value) {
        map.value.remove()
        map.value = null
      }
    })

const isRefreshing = ref(false)

    function triggerRefresh() {
      isRefreshing.value = true
      emit('refresh')
      setTimeout(() => {
        isRefreshing.value = false
      }, 1200)
    }

    function focusOnHomePoint() {
      if (props.homePoint && (props.homePoint.latitude || props.homePoint.id)) {
        highlightSpecificPoint({
          point: props.homePoint,
          type: 'home',
          title: `監看點 - ${unwrap(props.homePoint.name) || '未命名'}`,
          description: `表定清運時間: ${unwrap(props.homePoint.schedule) || '時程未定'}`
        })
      }
    }

    function focusOnArrivalPoint() {
      if (props.arrivalPoint && (props.arrivalPoint.latitude || props.arrivalPoint.id)) {
        highlightSpecificPoint({
          point: props.arrivalPoint,
          type: 'gps',
          title: '垃圾車目前位置',
          description: `目前位置: ${unwrap(props.arrivalPoint.name) || '未知位置'}`
        })
      }
    }

        return {
      isRefreshing,
      triggerRefresh,
      focusOnHomePoint,
      focusOnArrivalPoint,
      adjustMapBounds,
      mapContainer,
      mapState,
      errorMessage,
      hasValidData,
      retryInit,
      highlightSpecificPoint
    }
  }
})
</script>

<style scoped>
.route-map-container {
  border-radius: 6px; /* 從 8px 減少 */
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); /* 減少陰影 */
  width: 100%;
}

.map-header {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  padding: 6px 10px; /* 進一步緊湊 */
}

.map-wrapper {
  position: relative;
  height: 280px; /* 進一步緊湊 */
  width: 100%;
}

.leaflet-map {
  width: 100% !important;
  height: 100% !important;
  background-color: #f8f9fa;
  position: relative;
  z-index: 1;
}

.map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.95);
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.map-legend {
  background-color: #f9f9f9;
  border-top: 1px solid #e0e0e0;
  padding: 6px 10px; /* 進一步緊湊 */
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px; /* 從 16px 減少 */
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px; /* 從 8px 減少 */
  font-size: 0.85rem; /* 從 14px 轉換並略減 */
}

.legend-marker {
  width: 14px; /* 從 16px 減少 */
  height: 14px; /* 從 16px 減少 */
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.legend-marker.current-location {
  background-color: rgba(255, 87, 34, 0.8); /* 垃圾車位置 - 橙紅色 */
}

.legend-marker.home-point {
  background-color: rgba(33, 150, 243, 0.8); /* 監看點位置 - 藍色 */
}

.legend-marker.cleaned-point {
  background-color: rgba(76, 175, 80, 0.8); /* 已清運站點 - 綠色 */
}

.legend-marker.current-point {
  background-color: rgba(255, 152, 0, 0.8); /* 清運中站點 - 橙色 */
}

.legend-marker.pending-point {
  background-color: rgba(158, 158, 158, 0.8); /* 待清運站點 - 灰色 */
}

/* 自定義標記樣式已移至 src/css/leaflet-fixes.scss */

@media (max-width: 600px) {
  .route-map-container {
    border-radius: 4px;
  }

  .map-header {
    padding: 6px 10px; /* 手機端進一步減少 */
  }

  .map-wrapper {
    height: 220px; /* 手機端進一步減少高度 */
  }

  .map-legend {
    padding: 6px 10px;
  }

  .legend-items {
    flex-direction: column;
    gap: 6px; /* 從 8px 減少 */
  }

  .legend-item {
    font-size: 0.8rem;
    gap: 5px;
  }

  .legend-marker {
    width: 12px;
    height: 12px;
  }

  .marker-icon {
    font-size: 1rem;
    top: 2px;
  }

  .marker-number {
    font-size: 0.7rem;
    bottom: 3px;
    padding: 0px 3px;
  }

  .marker-number-circle {
    width: 22px;
    height: 22px;
    font-size: 0.75rem;
    border-width: 2px;
  }

}

/* Leaflet 樣式修復已移至 src/css/leaflet-fixes.scss */
</style>
