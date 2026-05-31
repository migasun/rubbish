<template>
  <div class="stations-list">
    <q-card class="q-mt-xs">
      <q-card-section class="q-pa-xs">
        <div class="text-subtitle1 q-mb-xs">
          {{ lineLabel }} - 所有站點列表
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
import { unwrap } from 'src/utils/xml'

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
        return '目前位置'
      }

      return arrivalText
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); /* 從 200px 減少 */
  gap: 4px; /* 從 6px 減少 */
  margin-top: 4px; /* 從 6px 減少 */
}

.station-item {
  position: relative;
}

.station-card {
  height: 100%;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  min-height: 70px; /* 從 80px 減少 */
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
  margin-bottom: 1px; /* 從 2px 減少 */
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
  font-size: 0.7rem; /* 從 0.75rem 減少 */
}

.station-times {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.time-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-time {
  font-size: 0.65rem; /* 從 0.7rem 減少 */
  font-weight: 500;
  color: #2c3e50;
}

.arrival-time {
  font-size: 0.65rem; /* 從 0.7rem 減少 */
  font-weight: 500;
}

/* 響應式設計 */
@media (max-width: 600px) {
  .stations-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2px; /* 從 4px 進一步減少 */
  }

  .station-card {
    min-height: 60px; /* 從 70px 減少 */
  }

  .station-name {
    font-size: 0.65rem; /* 從 0.7rem 減少 */
  }

  .schedule-time, .arrival-time {
    font-size: 0.55rem; /* 從 0.6rem 減少 */
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
