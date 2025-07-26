<template>
  <div class="stations-list">
    <q-card class="q-mt-sm">
      <q-card-section class="q-pa-sm">
        <div class="text-subtitle1 q-mb-sm">
          📍 {{ lineLabel }} - 所有站點列表
          <q-badge v-if="currentStation" color="primary" class="q-ml-sm">
            目前位置：第 {{ currentStation }} 站
          </q-badge>
        </div>

        <div class="stations-grid">
          <div
            v-for="(station, index) in stations"
            :key="station.id || index"
            class="station-item"
            :class="{
              'current-station': isCurrentStation(station),
              'passed-station': isPassedStation(station),
              'upcoming-station': isUpcomingStation(station)
            }"
          >
            <!-- 站點卡片 -->
            <q-card
              class="station-card"
              :class="{
                'elevation-4': isCurrentStation(station),
                'elevation-1': !isCurrentStation(station)
              }"
            >
              <q-card-section class="q-pa-xs">
                <!-- 站點編號和狀態 -->
                <div class="station-header">
                  <q-badge
                    :color="getStationBadgeColor(station)"
                    :text-color="getStationTextColor(station)"
                    size="xs"
                    class="station-rank"
                  >
                    {{ unwrap(station.rank) }}
                  </q-badge>
                  <div class="station-status" v-if="isCurrentStation(station)">
                    <q-icon name="location_on" color="primary" size="xs" />
                  </div>
                </div>

                <!-- 站點名稱 -->
                <div class="station-name text-caption q-mt-xs">
                  {{ getShortName(unwrap(station.name)) }}
                </div>

                <!-- 時程信息 - 精簡版 -->
                <div class="station-times q-mt-xs">
                  <div class="time-compact">
                    <div class="schedule-time">{{ unwrap(station.schedule) }}</div>
                    <div class="arrival-time" v-if="hasArrivalTime(station)">
                      {{ formatArrivalTime(unwrap(station.arrival)) }}
                    </div>
                  </div>
                </div>

                <!-- 地圖按鈕 -->
                <div class="station-actions q-mt-xs" v-if="hasValidCoordinates(station)">
                  <q-btn
                    flat
                    dense
                    size="xs"
                    icon="map"
                    color="primary"
                    @click="openMap(station)"
                    class="full-width"
                    style="min-height: 18px; font-size: 0.6rem;"
                  >
                    <q-tooltip>查看地圖位置</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'StationsList',

  props: {
    lineLabel: {
      type: String,
      default: '路線'
    },
    stations: {
      type: Array,
      default: () => []
    },
    currentArrivalRank: {
      type: Number,
      default: 0
    }
  },

  setup(props) {
    const unwrap = (v) => (v && typeof v === 'object' && '#text' in v) ? v['#text'] : v

    const currentStation = computed(() => {
      return props.currentArrivalRank > 0 ? props.currentArrivalRank : null
    })

    const isCurrentStation = (station) => {
      const rank = parseInt(unwrap(station.rank) || 0)
      return rank === props.currentArrivalRank && props.currentArrivalRank > 0
    }

    const isPassedStation = (station) => {
      const rank = parseInt(unwrap(station.rank) || 0)
      return rank < props.currentArrivalRank && props.currentArrivalRank > 0
    }

    const isUpcomingStation = (station) => {
      const rank = parseInt(unwrap(station.rank) || 0)
      return rank > props.currentArrivalRank && props.currentArrivalRank > 0
    }

    const getStationBadgeColor = (station) => {
      if (isCurrentStation(station)) return 'primary'
      if (isPassedStation(station)) return 'positive'
      return 'grey-5'
    }

    const getStationTextColor = (station) => {
      if (isCurrentStation(station)) return 'white'
      if (isPassedStation(station)) return 'white'
      return 'grey-8'
    }

    const formatArrivalTime = (arrivalText) => {
      if (!arrivalText) return '未定'

      // 如果包含HTML標籤（垃圾車圖示），顯示為"目前位置"
      if (arrivalText.includes('Icon_CarS.png') || arrivalText.includes('now-at')) {
        return '🚛 目前位置'
      }

      return arrivalText
    }

    const hasValidCoordinates = (station) => {
      const lon = unwrap(station.longitude)
      const lat = unwrap(station.latitude)
      return lon && lat && lon !== '0' && lat !== '0'
    }

    const openMap = (station) => {
      const lon = unwrap(station.longitude)
      const lat = unwrap(station.latitude)
      if (lon && lat) {
        const mapUrl = `https://maps.nlsc.gov.tw/go/${lon}/${lat}/15/EMAP_B/DMAPS,ROAD`
        window.open(mapUrl, '_blank')
      }
    }

    const hasArrivalTime = (station) => {
      const arrival = unwrap(station.arrival)
      return arrival && arrival !== '未定' && !arrival.includes('Icon_CarS.png') && !arrival.includes('now-at')
    }

    const getShortName = (name) => {
      if (!name) return ''
      // 假設短名稱為去掉前綴的名稱，例如去掉"站"字
      return name.replace(/^(.*?)(站.*)/, '$2').trim()
    }

    return {
      unwrap,
      currentStation,
      isCurrentStation,
      isPassedStation,
      isUpcomingStation,
      getStationBadgeColor,
      getStationTextColor,
      formatArrivalTime,
      hasValidCoordinates,
      openMap,
      hasArrivalTime,
      getShortName
    }
  }
})
</script>

<style scoped>
.stations-list {
  width: 100%;
}

.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 6px;
  margin-top: 6px;
}

.station-item {
  position: relative;
}

.station-card {
  height: 100%;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  min-height: 80px;
}

.current-station .station-card {
  border-left-color: var(--q-primary);
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
}

.passed-station .station-card {
  border-left-color: var(--q-positive);
  background: #f1f8e9;
}

.upcoming-station .station-card {
  border-left-color: #e0e0e0;
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.station-rank {
  flex-shrink: 0;
}

.station-status {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.station-name {
  font-weight: 500;
  line-height: 1.2;
  color: #2c3e50;
  font-size: 0.75rem;
}

.station-times {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-label {
  font-size: 0.65rem;
  color: #6c757d;
}

.time-value {
  font-size: 0.7rem;
  font-weight: 500;
}

.station-actions {
  border-top: 1px solid #e0e0e0;
  padding-top: 2px;
  margin-top: 4px;
}

.time-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-time {
  font-size: 0.7rem;
  font-weight: 500;
  color: #2c3e50;
}

.arrival-time {
  font-size: 0.7rem;
  font-weight: 500;
}

/* 響應式設計 */
@media (max-width: 600px) {
  .stations-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }

  .station-card {
    min-height: 70px;
  }

  .station-name {
    font-size: 0.7rem;
  }

  .time-label, .time-value {
    font-size: 0.6rem;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .stations-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .stations-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1200px) {
  .stations-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
