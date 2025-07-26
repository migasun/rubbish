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

// 全域資源管理
const LEAFLET_CDN = {
  css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
}

class LeafletLoader {
  static instance = null
  static loadPromise = null
  static isLoaded = false

  static getInstance() {
    if (!this.instance) {
      this.instance = new LeafletLoader()
    }
    return this.instance
  }

  async load() {
    if (LeafletLoader.isLoaded && window.L) {
      return Promise.resolve()
    }

    if (LeafletLoader.loadPromise) {
      return LeafletLoader.loadPromise
    }

    LeafletLoader.loadPromise = this._loadResources()
    return LeafletLoader.loadPromise
  }

  async _loadResources() {
    try {
      // 同時載入 CSS 和 JS
      await Promise.all([
        this._loadCSS(),
        this._loadJS()
      ])

      LeafletLoader.isLoaded = true
      LeafletLoader.loadPromise = null

      // 確保 Leaflet 完全可用
      await new Promise(resolve => {
        if (window.L && window.L.map) {
          resolve()
        } else {
          setTimeout(resolve, 100) // 給一點時間讓 Leaflet 初始化
        }
      })

    } catch (error) {
      LeafletLoader.loadPromise = null
      throw error
    }
  }

  _loadCSS() {
    return new Promise((resolve, reject) => {
      // 檢查是否已經載入
      const existingLink = document.querySelector(`link[href="${LEAFLET_CDN.css}"]`)
      if (existingLink) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CDN.css
      link.onload = resolve
      link.onerror = () => reject(new Error('CSS 載入失敗'))
      document.head.appendChild(link)
    })
  }

  _loadJS() {
    return new Promise((resolve, reject) => {
      // 檢查是否已經載入
      if (window.L) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = LEAFLET_CDN.js
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error('JavaScript 載入失敗'))
      document.head.appendChild(script)
    })
  }
}

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
    }
  },

  setup(props) {
    const mapContainer = ref(null)
    const mapState = ref('loading') // 'loading', 'ready', 'error'
    const errorMessage = ref('')
    const map = ref(null)
    const markersLayer = ref(null)

    const leafletLoader = LeafletLoader.getInstance()

    // 檢查是否有有效數據
    const hasValidData = computed(() => {
      return props.routeData?.points?.point &&
             Array.isArray(props.routeData.points.point) &&
             props.routeData.points.point.length > 0
    })

    // 初始化地圖
    async function initMap() {
      try {
        console.log('開始初始化地圖...')
        mapState.value = 'loading'
        errorMessage.value = ''

        // 確保 DOM 準備好
        await nextTick()
        if (!mapContainer.value) {
          throw new Error('地圖容器未找到')
        }

        // 載入 Leaflet
        console.log('載入 Leaflet 資源...')
        await leafletLoader.load()
        console.log('Leaflet 載入完成')

        // 清理舊地圖
        if (map.value) {
          console.log('清理舊地圖...')
          map.value.remove()
          map.value = null
          markersLayer.value = null
        }

        // 等待一個 tick 確保清理完成
        await nextTick()

        // 創建新地圖
        console.log('創建新地圖...')
        map.value = L.map(mapContainer.value, {
          center: [props.centerLocation.lat, props.centerLocation.lng],
          zoom: 15,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: false, // 簡化設置
          fadeAnimation: true,
          zoomAnimation: true,
          markerZoomAnimation: true
        })

        // 添加圖層
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        })

        tileLayer.addTo(map.value)

        // 強制刷新地圖尺寸 - 多次嘗試確保生效
        const forceResize = () => {
          if (map.value) {
            map.value.invalidateSize()
            console.log('地圖尺寸已刷新')
          }
        }

        // 立即執行一次
        forceResize()

        // 延遲執行多次，確保在不同時機都能正確調整
        setTimeout(forceResize, 50)
        setTimeout(forceResize, 150)
        setTimeout(forceResize, 300)
        setTimeout(forceResize, 500)

        // 監聽視窗尺寸變化
        const handleResize = () => {
          if (map.value) {
            map.value.invalidateSize()
          }
        }
        window.addEventListener('resize', handleResize)

        // 清理函數
        const cleanup = () => {
          window.removeEventListener('resize', handleResize)
        }

        await new Promise((resolve) => {
          tileLayer.on('load', () => {
            // 圖層載入完成後再次刷新尺寸
            setTimeout(forceResize, 100)
            resolve()
          })
          // 超時保護
          setTimeout(() => {
            forceResize()
            resolve()
          }, 2000)
        })

        console.log('地圖初始化完成')
        mapState.value = 'ready'

        // 如果有數據，立即添加標記
        if (hasValidData.value) {
          await nextTick()
          addMarkers()
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

        markersLayer.value = L.layerGroup()
        const bounds = L.latLngBounds()
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

          // 創建標記
          let color, title, size
          if (pointId === arrivalPointId) {
            color = '#FF5722'
            title = `🚛 垃圾車目前位置 - ${pointName}`
            size = 12
          } else if (pointId === homePointId) {
            color = '#4CAF50'
            title = `📍 監看點 - ${pointName}`
            size = 10
          } else {
            color = '#2196F3'
            title = `站點 ${index + 1} - ${pointName}`
            size = 8
          }

          const marker = L.circleMarker([lat, lng], {
            radius: size,
            fillColor: color,
            color: 'white',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          })

          // 彈出視窗
          const popupContent = `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
              <div><strong>編號:</strong> ${pointId}</div>
              <div><strong>時程:</strong> ${schedule}</div>
              <div><strong>順序:</strong> 第 ${point.rank?.['#text'] || point.rank || index + 1} 站</div>
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
          markersLayer.value.addTo(map.value)

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
      retryInit
    }
  }
})
</script>

<style scoped>
.route-map-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.map-header {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.map-wrapper {
  position: relative;
  height: 400px;
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

/* 修復 Leaflet 樣式問題 */
:deep(.leaflet-container) {
  width: 100% !important;
  height: 100% !important;
  position: relative;
  outline: 0;
}

:deep(.leaflet-map-pane) {
  position: absolute;
}

:deep(.leaflet-tile-container) {
  margin: 0;
  border: 0;
  padding: 0;
  outline: 0;
  max-width: none !important;
  max-height: none !important;
}

:deep(.leaflet-tile) {
  filter: inherit;
  visibility: inherit;
  opacity: 1;
  width: 256px !important;
  height: 256px !important;
}

/* 確保地圖控制項正常顯示 */
:deep(.leaflet-control-container) {
  pointer-events: none;
}

:deep(.leaflet-control) {
  pointer-events: auto;
}

:deep(.leaflet-control-attribution) {
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  pointer-events: auto;
}
</style>
