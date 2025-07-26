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
      <div id="leaflet-map" class="leaflet-map"></div>

      <!-- 載入中顯示 -->
      <div v-if="isLoading" class="map-loading">
        <q-spinner-dots size="50px" color="primary" />
        <div class="q-mt-md">載入地圖中...</div>
      </div>

      <!-- 錯誤顯示 -->
      <div v-if="hasError" class="map-error">
        <q-icon name="error" size="50px" color="negative" />
        <div class="q-mt-md">{{ errorMessage }}</div>
        <q-btn
          color="primary"
          label="重新載入"
          @click="initMap"
          class="q-mt-md"
        />
      </div>
    </div>

    <!-- 圖例 -->
    <div class="map-legend q-pa-md">
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
import { defineComponent, ref, onMounted, watch, nextTick, onUnmounted } from 'vue'

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
        lat: 24.9896,  // 中和中山路三段32號附近
        lng: 121.4953
      })
    }
  },

  setup(props) {
    const isLoading = ref(true)
    const hasError = ref(false)
    const errorMessage = ref('')
    const map = ref(null)
    const markers = ref([])

    // 載入 Leaflet 庫
    function loadLeaflet() {
      return new Promise((resolve, reject) => {
        // 檢查是否已載入
        if (window.L) {
          resolve()
          return
        }

        // 載入 CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        cssLink.crossOrigin = ''
        document.head.appendChild(cssLink)

        // 載入 JavaScript
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
        script.crossOrigin = ''
        script.onload = resolve
        script.onerror = () => reject(new Error('無法載入地圖庫'))
        document.head.appendChild(script)
      })
    }

    // 初始化地圖
    async function initMap() {
      try {
        isLoading.value = true
        hasError.value = false
        errorMessage.value = ''

        // 載入 Leaflet
        await loadLeaflet()

        // 等待 DOM 更新
        await nextTick()

        const mapElement = document.getElementById('leaflet-map')
        if (!mapElement) {
          throw new Error('找不到地圖容器')
        }

        // 創建地圖
        map.value = L.map(mapElement).setView([props.centerLocation.lat, props.centerLocation.lng], 15)

        // 添加 OpenStreetMap 圖層
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map.value)

        // 添加標記
        addMarkersToMap()

        isLoading.value = false
      } catch (error) {
        console.error('地圖初始化失敗:', error)
        hasError.value = true
        errorMessage.value = error.message
        isLoading.value = false
      }
    }

    // 清除所有標記
    function clearMarkers() {
      markers.value.forEach(marker => {
        map.value.removeLayer(marker)
      })
      markers.value = []
    }

    // 創建自定義圖標
    function createCustomIcon(type) {
      const iconConfig = {
        current: { color: '#FF5722', icon: '🚛', size: 32 },
        home: { color: '#4CAF50', icon: '📍', size: 28 },
        route: { color: '#2196F3', icon: '●', size: 24 }
      }

      const config = iconConfig[type] || iconConfig.route

      return L.divIcon({
        html: `
          <div style="
            background-color: ${config.color};
            width: ${config.size}px;
            height: ${config.size}px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${config.size * 0.5}px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${config.icon}</div>
        `,
        className: 'custom-div-icon',
        iconSize: [config.size, config.size],
        iconAnchor: [config.size/2, config.size/2]
      })
    }

    // 添加標記到地圖
    function addMarkersToMap() {
      if (!map.value || !props.routeData.points?.point) return

      clearMarkers()

      const points = Array.isArray(props.routeData.points.point)
        ? props.routeData.points.point
        : [props.routeData.points.point]

      const group = new L.FeatureGroup()

      points.forEach((point, index) => {
        const lat = parseFloat(point.latitude?.['#text'] || point.latitude || 0)
        const lng = parseFloat(point.longitude?.['#text'] || point.longitude || 0)

        if (lat === 0 || lng === 0) return

        const pointId = parseInt(point.id?.['#text'] || point.id || 0)
        const pointName = point.name?.['#text'] || point.name || `站點 ${index + 1}`
        const schedule = point.schedule?.['#text'] || point.schedule || '時程未定'

        // 判斷標記類型
        let iconType, markerTitle
        const homePointId = parseInt(props.homePoint.id?.['#text'] || props.homePoint.id || 0)
        const arrivalPointId = parseInt(props.arrivalPoint.id?.['#text'] || props.arrivalPoint.id || 0)

        if (pointId === arrivalPointId) {
          iconType = 'current'
          markerTitle = `🚛 垃圾車目前位置 - ${pointName}`
        } else if (pointId === homePointId) {
          iconType = 'home'
          markerTitle = `📍 監看點 - ${pointName}`
        } else {
          iconType = 'route'
          markerTitle = `站點 ${index + 1} - ${pointName}`
        }

        const marker = L.marker([lat, lng], {
          icon: createCustomIcon(iconType),
          title: markerTitle
        })

        // 添加彈出視窗
        const popupContent = `
          <div style="padding: 8px; min-width: 200px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${markerTitle}</div>
            <div style="margin-bottom: 2px;"><strong>編號:</strong> ${pointId}</div>
            <div style="margin-bottom: 2px;"><strong>時程:</strong> ${schedule}</div>
            <div style="margin-bottom: 2px;"><strong>順序:</strong> 第 ${point.rank?.['#text'] || point.rank || index + 1} 站</div>
            <div style="color: #666; font-size: 12px;">
              座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `

        marker.bindPopup(popupContent)
        marker.addTo(map.value)
        markers.value.push(marker)
        group.addLayer(marker)
      })

      // 調整地圖視野以包含所有標記
      if (markers.value.length > 0) {
        map.value.fitBounds(group.getBounds(), { padding: [20, 20] })
      }
    }

    // 監聽路線數據變化
    watch(() => [props.routeData, props.homePoint, props.arrivalPoint], () => {
      if (map.value) {
        addMarkersToMap()
      }
    }, { deep: true })

    onMounted(() => {
      initMap()
    })

    onUnmounted(() => {
      if (map.value) {
        map.value.remove()
      }
    })

    return {
      isLoading,
      hasError,
      errorMessage,
      initMap
    }
  }
})
</script>

<style scoped>
.route-map-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-header {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.map-wrapper {
  position: relative;
  height: 400px;
}

.leaflet-map {
  width: 100%;
  height: 100%;
}

.map-loading,
.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

.map-legend {
  background-color: #f9f9f9;
  border-top: 1px solid #e0e0e0;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.legend-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.legend-marker.current-location {
  background-color: #FF5722;
}

.legend-marker.home-point {
  background-color: #4CAF50;
}

.legend-marker.route-point {
  background-color: #2196F3;
}

@media (max-width: 600px) {
  .map-wrapper {
    height: 300px;
  }

  .legend-items {
    flex-direction: column;
    gap: 8px;
  }
}


</style>

