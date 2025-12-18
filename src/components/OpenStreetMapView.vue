<template>
  <div class="route-map-container">
    <div class="map-header pa-4">
      <div class="text-h6 d-flex align-center">
        <v-icon icon="mdi-map" class="mr-2"></v-icon>
        {{ routeName }} 路線地圖
      </div>
      <div class="text-caption text-grey-darken-1">
        顯示垃圾車路線及各站點位置 (使用 OpenStreetMap)
      </div>
    </div>

    <div class="map-wrapper">
      <div ref="mapContainer" class="leaflet-map"></div>

      <!-- 載入狀態 -->
      <div v-if="mapState === 'loading'" class="map-overlay">
        <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
        <div class="mt-4">載入地圖中...</div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else-if="mapState === 'error'" class="map-overlay">
        <v-icon icon="mdi-alert-circle" size="50" color="error"></v-icon>
        <div class="mt-4">{{ errorMessage }}</div>
        <v-btn
          color="primary"
          class="mt-4"
          @click="retryInit"
        >
          重新載入
        </v-btn>
      </div>

      <!-- 成功但無數據 -->
      <div v-else-if="mapState === 'ready' && !hasValidData" class="map-overlay">
        <v-icon icon="mdi-information" size="50" color="info"></v-icon>
        <div class="mt-4">等待路線數據...</div>
      </div>
    </div>

    <!-- 圖例 -->
    <div class="map-legend pa-4" v-if="mapState === 'ready'">
      <div class="text-subtitle-2 mb-2 font-weight-bold">圖例說明</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-marker current-location"></div>
          <span>垃圾車目前位置</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker home-point"></div>
          <span>監看點</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker passed-station"></div>
          <span>已過站點</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker upcoming-station"></div>
          <span>未到站點</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 修正 Leaflet 默認圖標路徑問題
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// 單例模式避免重複載入 Leaflet 資源
class LeafletLoader {
  static instance = null
  static loadPromise = null
  static isLoaded = false

  static getInstance() {
    if (!LeafletLoader.instance) {
      LeafletLoader.instance = new LeafletLoader()
    }
    return LeafletLoader.instance
  }

  async load() {
    if (LeafletLoader.isLoaded && window.L) {
      return Promise.resolve()
    }

    if (LeafletLoader.loadPromise) {
      return LeafletLoader.loadPromise
    }

    LeafletLoader.loadPromise = new Promise((resolve) => {
      if (window.L) {
        LeafletLoader.isLoaded = true
        resolve()
      } else {
        const checkInterval = setInterval(() => {
          if (window.L) {
            clearInterval(checkInterval)
            LeafletLoader.isLoaded = true
            resolve()
          }
        }, 50)
      }
    })

    return LeafletLoader.loadPromise
  }
}

// 設置默認圖標
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
})

// 圖標快取
const iconCache = new Map()

export default defineComponent({
  name: 'OpenStreetMapView',

  props: {
    routeName: {
      type: String,
      default: '路線'
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
      default: () => ({ lat: 24.9896, lng: 121.4953 })
    },
    highlightPoint: {
      type: Object,
      default: null
    }
  },

  setup(props) {
    const mapContainer = ref(null)
    const map = ref(null)
    const mapState = ref('loading') // loading, ready, error
    const errorMessage = ref('')
    const markers = ref([])
    const markersLayer = ref(null)
    const routeLine = ref(null)
    const highlightMarker = ref(null)
    let drawRouteTimer = null

    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v

    const hasValidData = computed(() => {
      return props.routeData?.points?.point && Array.isArray(props.routeData.points.point)
    })

    // 初始化地圖
    const initMap = () => {
      if (!mapContainer.value) return

      try {
        // 如果地圖已經存在，先銷毀
        if (map.value) {
          map.value.remove()
          map.value = null
        }

        console.log('初始化 OpenStreetMap...')
        
        // 創建地圖實例
        map.value = new L.Map(mapContainer.value).setView(
          [props.centerLocation.lat, props.centerLocation.lng], 
          14
        )

        // 添加 OpenStreetMap 圖層
        new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map.value)

        // 初始化標記圖層組
        markersLayer.value = new L.LayerGroup().addTo(map.value)

        mapState.value = 'ready'
        
        // 多重尺寸刷新機制確保地圖正確顯示
        const forceResize = () => {
          if (map.value) {
            map.value.invalidateSize()
          }
        }

        // 在多個時間點執行，確保穩定性
        forceResize()
        setTimeout(forceResize, 50)
        setTimeout(forceResize, 150)
        setTimeout(forceResize, 300)
        setTimeout(forceResize, 500)
        
        // 如果有數據，繪製路線和標記
        if (hasValidData.value) {
          drawRoute()
        }
      } catch (error) {
        console.error('地圖初始化失敗:', error)
        mapState.value = 'error'
        errorMessage.value = '地圖載入失敗: ' + error.message
      }
    }

    // 繪製路線和標記
    const drawRoute = () => {
      if (!map.value || !hasValidData.value) return

      // 清除現有標記和路線
      clearMapObjects()

      const points = props.routeData.points.point
      const latLngs = []
      const currentRank = parseInt(unwrap(props.routeData.arrival) || 0)
      const homeId = props.homePoint.id ? parseInt(unwrap(props.homePoint.id)) : 0

      // 創建自定義圖標（使用快取）
      const createIcon = (color, size = [25, 41], anchor = [12, 41]) => {
        const cacheKey = `${color}-${size.join('-')}-${anchor.join('-')}`
        
        if (iconCache.has(cacheKey)) {
          return iconCache.get(cacheKey)
        }
        
        let className = 'custom-marker'
        if (color === 'red') className += ' marker-red'
        if (color === 'green') className += ' marker-green'
        if (color === 'blue') className += ' marker-blue'
        if (color === 'grey') className += ' marker-grey'
        
        const icon = new L.DivIcon({
          className: className,
          html: `<div style="background-color: ${getColorCode(color)}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
        
        iconCache.set(cacheKey, icon)
        return icon
      }

      const getColorCode = (color) => {
        switch(color) {
          case 'red': return '#f44336'; // current
          case 'green': return '#4caf50'; // home
          case 'blue': return '#2196f3'; // upcoming
          case 'grey': return '#9e9e9e'; // passed
          default: return '#2196f3';
        }
      }

      // 遍歷所有點
      points.forEach(point => {
        const lat = parseFloat(unwrap(point.latitude))
        const lng = parseFloat(unwrap(point.longitude))
        const rank = parseInt(unwrap(point.rank))
        const id = parseInt(unwrap(point.id))
        const name = unwrap(point.name)

        if (!isNaN(lat) && !isNaN(lng)) {
          latLngs.push([lat, lng])

          // 決定標記顏色
          let color = 'blue' // 默認未到
          let zIndex = 100

          if (rank < currentRank) {
            color = 'grey' // 已過
            zIndex = 50
          } else if (rank === currentRank) {
            color = 'red' // 當前位置
            zIndex = 1000
          }
          
          if (id === homeId) {
            color = 'green' // 監看點
            zIndex = 900
          }

          // 創建標記
          const marker = new L.Marker([lat, lng], {
            icon: createIcon(color),
            zIndexOffset: zIndex,
            title: name
          })

          // 添加彈出窗口
          let popupContent = `<b>${name}</b><br>第 ${rank} 站`
          if (rank === currentRank) popupContent += '<br><span style="color:red">垃圾車目前位置</span>'
          if (id === homeId) popupContent += '<br><span style="color:green">監看點</span>'
          
          marker.bindPopup(popupContent)
          markersLayer.value.addLayer(marker)
          markers.value.push(marker)
        }
      })

      // 繪製路線
      if (latLngs.length > 1) {
        routeLine.value = new L.Polyline(latLngs, {
          color: '#2196f3',
          weight: 3,
          opacity: 0.7,
          dashArray: '5, 10' // 虛線表示預估路線
        }).addTo(map.value)
        
        // 調整地圖視野以包含所有點
        map.value.fitBounds(new L.LatLngBounds(latLngs), { padding: [50, 50] })
      }
    }

    const clearMapObjects = () => {
      // 使用 LayerGroup 批量清除標記
      if (markersLayer.value) {
        markersLayer.value.clearLayers()
      }
      markers.value = []
      
      if (routeLine.value) {
        routeLine.value.remove()
        routeLine.value = null
      }
      
      if (highlightMarker.value) {
        highlightMarker.value.remove()
        highlightMarker.value = null
      }
    }

    const retryInit = () => {
      mapState.value = 'loading'
      setTimeout(initMap, 500)
    }

    // 150ms 防抖避免頻繁重繪
    const debouncedDrawRoute = () => {
      if (drawRouteTimer) {
        clearTimeout(drawRouteTimer)
      }
      drawRouteTimer = setTimeout(() => {
        drawRoute()
      }, 150)
    }

    // 處理高亮點
    watch(() => props.highlightPoint, (newPoint) => {
      if (!newPoint || !map.value) return

      console.log('地圖收到高亮請求:', newPoint)
      
      // 移除舊的高亮標記
      if (highlightMarker.value) {
        highlightMarker.value.remove()
        highlightMarker.value = null
      }

      let lat, lng, title, description

      if (newPoint.type === 'gps' && newPoint.point) {
        lat = parseFloat(unwrap(newPoint.point.latitude))
        lng = parseFloat(unwrap(newPoint.point.longitude))
        title = newPoint.title
        description = newPoint.description
      } else if (newPoint.point) {
        lat = parseFloat(unwrap(newPoint.point.latitude))
        lng = parseFloat(unwrap(newPoint.point.longitude))
        title = newPoint.title
        description = newPoint.description
      }

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        // 創建高亮標記 (使用不同樣式)
        const icon = new L.DivIcon({
          className: 'highlight-marker',
          html: `<div style="background-color: #ff9800; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.6); animation: pulse 1.5s infinite;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })

        highlightMarker.value = new L.Marker([lat, lng], {
          icon: icon,
          zIndexOffset: 2000
        }).addTo(map.value)

        highlightMarker.value.bindPopup(`<b>${title}</b><br>${description}`).openPopup()
        
        // 移動地圖中心
        map.value.setView([lat, lng], 16, { animate: true })
      }
    }, { deep: true })

    // 監聽數據變化重新繪製（使用防抖）
    watch(() => props.routeData, () => {
      if (mapState.value === 'ready') {
        debouncedDrawRoute()
      }
    }, { deep: true })

    onMounted(() => {
      // 延遲初始化以確保容器已渲染
      setTimeout(initMap, 100)
    })

    onUnmounted(() => {
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
      retryInit
    }
  }
})
</script>

<style scoped>
.route-map-container {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #dee2e6;
}

.map-header {
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.map-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

.leaflet-map {
  height: 100%;
  width: 100%;
  z-index: 1;
  transform: translateZ(0); /* 硬體加速 */
}

.map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.map-legend {
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #495057;
}

.legend-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
  border: 2px solid white;
  box-shadow: 0 0 2px rgba(0,0,0,0.3);
}

.current-location { background-color: #f44336; }
.home-point { background-color: #4caf50; }
.passed-station { background-color: #9e9e9e; }
.upcoming-station { background-color: #2196f3; }

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
