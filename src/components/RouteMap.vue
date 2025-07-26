<template>
  <div class="route-map-container">
    <div class="map-header q-pa-md">
      <div class="text-h6">
        <q-icon name="map" class="q-mr-sm" />
        {{ routeName }} 路線地圖
      </div>
      <div class="text-caption text-grey-7">
        顯示垃圾車路線及各站點位置
      </div>
    </div>

    <div class="map-wrapper">
      <div id="google-map" class="google-map"></div>

      <!-- 載入中顯示 -->
      <div v-if="isLoading" class="map-loading">
        <q-spinner-dots size="50px" color="primary" />
        <div class="q-mt-md">載入地圖中...</div>
      </div>

      <!-- 錯誤顯示 -->
      <div v-if="hasError" class="map-error">
        <q-icon name="error" size="50px" color="negative" />
        <div class="q-mt-md error-message">
          <div v-if="errorMessage.includes('API 金鑰')">
            <div class="text-subtitle1">需要設置 Google Maps API 金鑰</div>
            <div class="text-caption q-mt-sm">
              請在專案根目錄創建 .env 文件並設置：<br />
              <code>VITE_GOOGLE_MAPS_API_KEY=你的API金鑰</code>
            </div>
            <div class="text-caption q-mt-sm">
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                class="text-primary"
              >
                點此申請 Google Maps API 金鑰
                <q-icon name="open_in_new" size="xs" />
              </a>
            </div>
          </div>
          <div v-else>{{ errorMessage }}</div>
        </div>
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
import { defineComponent, ref, onMounted, watch, nextTick } from 'vue'

export default defineComponent({
  name: 'RouteMap',

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

    // Google Maps API 金鑰 - 從環境變數讀取
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY'

    // 載入 Google Maps API
    function loadGoogleMapsAPI() {
      return new Promise((resolve, reject) => {
        // 檢查是否已載入
        if (window.google && window.google.maps) {
          resolve()
          return
        }

        // 檢查 API 金鑰是否有效
        if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
          reject(new Error('請設置有效的 Google Maps API 金鑰'))
          return
        }

        // 創建 script 標籤，使用 async 載入
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker,geometry&loading=async`
        script.async = true
        script.defer = true
        script.onload = resolve
        script.onerror = () => reject(new Error('Google Maps API 載入失敗'))
        document.head.appendChild(script)
      })
    }

    // 初始化地圖
    async function initMap() {
      try {
        isLoading.value = true
        hasError.value = false
        errorMessage.value = ''

        // 載入 Google Maps API
        await loadGoogleMapsAPI()

        // 等待 DOM 更新
        await nextTick()

        const mapElement = document.getElementById('google-map')
        if (!mapElement) {
          throw new Error('Map element not found')
        }

        // 創建地圖
        map.value = new google.maps.Map(mapElement, {
          center: props.centerLocation,
          zoom: 15,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        // 添加標記
        addMarkersToMap()

        isLoading.value = false
      } catch (error) {
        console.error('Failed to initialize map:', error)
        hasError.value = true
        errorMessage.value = error.message
        isLoading.value = false
      }
    }

    // 清除所有標記
    function clearMarkers() {
      markers.value.forEach(marker => {
        marker.setMap(null)
      })
      markers.value = []
    }

    // 添加標記到地圖
    function addMarkersToMap() {
      if (!map.value || !props.routeData.points?.point) return

      clearMarkers()

      const points = Array.isArray(props.routeData.points.point)
        ? props.routeData.points.point
        : [props.routeData.points.point]

      const bounds = new google.maps.LatLngBounds()

      points.forEach((point, index) => {
        const lat = parseFloat(point.latitude?.['#text'] || point.latitude || 0)
        const lng = parseFloat(point.longitude?.['#text'] || point.longitude || 0)

        if (lat === 0 || lng === 0) return

        const position = new google.maps.LatLng(lat, lng)
        const pointId = parseInt(point.id?.['#text'] || point.id || 0)
        const pointName = point.name?.['#text'] || point.name || `站點 ${index + 1}`
        const schedule = point.schedule?.['#text'] || point.schedule || '時程未定'

        // 判斷標記類型
        let markerIcon, markerTitle
        const homePointId = parseInt(props.homePoint.id?.['#text'] || props.homePoint.id || 0)
        const arrivalPointId = parseInt(props.arrivalPoint.id?.['#text'] || props.arrivalPoint.id || 0)

        if (pointId === arrivalPointId) {
          // 垃圾車目前位置
          markerIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#FF5722" stroke="#FFFFFF" stroke-width="2"/>
                <text x="16" y="21" text-anchor="middle" fill="white" font-size="16">🚛</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16)
          }
          markerTitle = `🚛 垃圾車目前位置 - ${pointName}`
        } else if (pointId === homePointId) {
          // 監看點
          markerIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="10" fill="#4CAF50" stroke="#FFFFFF" stroke-width="2"/>
                <text x="14" y="18" text-anchor="middle" fill="white" font-size="12">📍</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14)
          }
          markerTitle = `📍 監看點 - ${pointName}`
        } else {
          // 一般站點
          markerIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#2196F3" stroke="#FFFFFF" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="white"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
          markerTitle = `站點 ${index + 1} - ${pointName}`
        }

        const marker = new google.maps.Marker({
          position: position,
          map: map.value,
          title: markerTitle,
          icon: markerIcon
        })

        // 添加資訊視窗
        const infoContent = `
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

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        })

        marker.addListener('click', () => {
          // 關閉其他資訊視窗
          markers.value.forEach(m => {
            if (m.infoWindow) {
              m.infoWindow.close()
            }
          })

          infoWindow.open(map.value, marker)
        })

        marker.infoWindow = infoWindow
        markers.value.push(marker)
        bounds.extend(position)
      })

      // 調整地圖視野以包含所有標記
      if (markers.value.length > 0) {
        map.value.fitBounds(bounds)

        // 如果只有一個標記，設置適當的縮放級別
        if (markers.value.length === 1) {
          map.value.setZoom(16)
        }
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

.google-map {
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
  z-index: 10;
}

.error-message {
  text-align: center;
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
