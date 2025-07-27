<template>
  <div class="route-map-container">
    <div class="map-header q-pa-md">
      <div class="text-h6">
        <q-icon name="map" class="q-mr-sm" />
        {{ routeName }} 路線地圖
      </div>
      <div class="text-caption text-grey-7">
        顯示垃圾車路線及各站點位置 (使用 OpenStreetMap)
      </div>
    </div>

    <div class="map-wrapper">
      <div ref="mapContainer" class="leaflet-map"></div>

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
          @click="retryInit"
          class="q-mt-md"
        />
      </div>

      <!-- 成功但無數據 -->
      <div v-else-if="mapState === 'ready' && !hasValidData" class="map-overlay">
        <q-icon name="info" size="50px" color="info" />
        <div class="q-mt-md">等待路線數據...</div>
      </div>
    </div>

    <!-- 圖例 -->
    <div class="map-legend q-pa-md" v-if="mapState === 'ready'">
      <div class="text-subtitle2 q-mb-sm">圖例說明</div>
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
          <div class="legend-marker route-point"></div>
          <span>其他站點</span>
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

// 修復 Leaflet 預設標記圖標問題
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
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

  setup(props) {
    const mapContainer = ref(null)
    const mapState = ref('loading') // 'loading', 'ready', 'error'
    const errorMessage = ref('')
    const map = ref(null)
    const markersLayer = ref(null)
    const highlightMarker = ref(null)

    // 輔助函數：提取值
    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v

    // 檢查是否有有效數據
    const hasValidData = computed(() => {
      return props.routeData?.points?.point &&
             Array.isArray(props.routeData.points.point) &&
             props.routeData.points.point.length > 0
    })

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
        const popupContent = `
          <div style="padding: 10px; min-width: 220px;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #FF6B00;">
              ${pointData.title || '特別標記點'}
            </div>
            <div><strong>名稱:</strong> ${unwrap(point.name) || '未命名'}</div>
            <div><strong>編號:</strong> ${unwrap(point.id) || 'N/A'}</div>
            <div><strong>時程:</strong> ${unwrap(point.schedule) || '時程未定'}</div>
            <div><strong>順序:</strong> 第 ${unwrap(point.rank) || 'N/A'} 站</div>
            ${pointData.description ? `<div style="margin-top: 6px; color: #666;"><strong>說明:</strong> ${pointData.description}</div>` : ''}
            <div style="color: #666; font-size: 12px; margin-top: 6px;">
              座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `

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
        const bounds = new L.LatLngBounds()
        let validMarkerCount = 0

        const points = Array.isArray(props.routeData.points.point)
          ? props.routeData.points.point
          : [props.routeData.points.point]

        const homePointId = parseInt(props.homePoint.id?.['#text'] || props.homePoint.id || 0)
        const arrivalPointId = parseInt(props.arrivalPoint.id?.['#text'] || props.arrivalPoint.id || 0)

        points.forEach((point, index) => {
          const lat = parseFloat(point.latitude?.['#text'] || point.latitude || 0)
          const lng = parseFloat(point.longitude?.['#text'] || point.longitude || 0)

          if (lat === 0 || lng === 0) return

          const pointId = parseInt(point.id?.['#text'] || point.id || 0)
          const pointName = point.name?.['#text'] || point.name || `站點 ${index + 1}`
          const schedule = point.schedule?.['#text'] || point.schedule || '時程未定'
          const rank = point.rank?.['#text'] || point.rank || (index + 1)

          // 創建帶編號的自定義標記
          let markerHtml, className, title

          if (pointId === arrivalPointId) {
            // 垃圾車目前位置 - 使用卡車圖標
            markerHtml = `
              <div class="truck-marker">
                <div class="marker-icon">🚛</div>
                <div class="marker-number">${rank}</div>
              </div>
            `
            className = 'truck-marker-container'
            title = `🚛 垃圾車目前位置 - ${pointName}`
          } else if (pointId === homePointId) {
            // 監看點 - 使用特殊標記
            markerHtml = `
              <div class="home-marker">
                <div class="marker-icon">📍</div>
                <div class="marker-number">${rank}</div>
              </div>
            `
            className = 'home-marker-container'
            title = `📍 監看點 - ${pointName}`
          } else {
            // 普通站點 - 使用編號圓圈
            markerHtml = `
              <div class="route-marker">
                <div class="marker-number-circle">${rank}</div>
              </div>
            `
            className = 'route-marker-container'
            title = `站點 ${rank} - ${pointName}`
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

          // 彈出視窗
          const popupContent = `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
              <div><strong>編號:</strong> ${pointId}</div>
              <div><strong>時程:</strong> ${schedule}</div>
              <div><strong>順序:</strong> 第 ${rank} 站</div>
              <div style="color: #666; font-size: 12px; margin-top: 4px;">
                座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}
              </div>
            </div>
          `

          marker.bindPopup(popupContent)
          markersLayer.value.addLayer(marker)
          bounds.extend([lat, lng])
          validMarkerCount++
        })

        if (validMarkerCount > 0) {
          map.value.addLayer(markersLayer.value)

          // 調整視野
          requestAnimationFrame(() => {
            if (map.value && bounds.isValid()) {
              map.value.fitBounds(bounds, {
                padding: [20, 20],
                maxZoom: 16
              })
            }
          })

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
      if (newHighlightPoint && mapState.value === 'ready') {
        console.log('接收到高亮點請求:', newHighlightPoint)
        highlightSpecificPoint(newHighlightPoint)
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

    return {
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
  padding: 8px 12px; /* 從預設的 q-pa-md 減少 */
}

.map-wrapper {
  position: relative;
  height: 300px; /* 從 400px 減少 */
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
  padding: 8px 12px; /* 從預設的 q-pa-md 減少 */
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

/* 自定義標記樣式已移至 src/css/leaflet-fixes.scss */

@media (max-width: 600px) {
  .route-map-container {
    border-radius: 4px;
  }

  .map-header {
    padding: 6px 10px; /* 手機端進一步減少 */
  }

  .map-wrapper {
    height: 250px; /* 手機端進一步減少高度 */
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

  .custom-marker {
    width: 28px;
    height: 36px;
    font-size: 0.8rem;
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

  .custom-marker::after {
    border-left-width: 6px;
    border-right-width: 6px;
    border-top-width: 10px;
    bottom: -10px;
  }
}

/* Leaflet 樣式修復已移至 src/css/leaflet-fixes.scss */
</style>
