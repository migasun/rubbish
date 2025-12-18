<template>
  <div class="stations-list">
    <v-card class="mt-2" variant="flat">
      <v-card-text class="pa-2">
        <div class="text-subtitle-1 mb-2 font-weight-bold">
          📍 {{ lineLabel }} - 所有站點列表
          <v-chip v-if="currentStation" color="primary" size="small" class="ml-2">
            目前位置：第 {{ currentStation }} 站
          </v-chip>
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
            <v-card
              class="station-card"
              :elevation="isCurrentStation(station) ? 4 : 1"
              :color="isCurrentStation(station) ? 'primary-lighten-5' : undefined"
            >
              <v-card-text class="pa-1">
                <!-- 站點編號和狀態 -->
                <div class="station-header d-flex justify-space-between align-center">
                  <v-chip
                    :color="getStationBadgeColor(station)"
                    :variant="isCurrentStation(station) ? 'elevated' : 'tonal'"
                    size="x-small"
                    class="station-rank font-weight-bold"
                  >
                    {{ unwrap(station.rank) }}
                  </v-chip>
                  <div class="station-status" v-if="isCurrentStation(station)">
                    <v-icon color="primary" size="small">mdi-map-marker</v-icon>
                  </div>
                </div>

                <!-- 站點名稱 -->
                <div class="station-name text-caption mt-1 font-weight-medium text-truncate">
                  {{ getShortName(unwrap(station.name)) }}
                </div>

                <!-- 時程信息 - 精簡版 -->
                <div class="station-times mt-1">
                  <div class="time-compact">
                    <div class="schedule-time text-caption text-grey">{{ unwrap(station.schedule) }}</div>
                    <div class="arrival-time text-caption text-primary font-weight-bold" v-if="hasArrivalTime(station)">
                      {{ formatArrivalTime(unwrap(station.arrival)) }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-card-text>
    </v-card>
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
      return rank > props.currentArrivalRank || props.currentArrivalRank === 0
    }

    const getStationBadgeColor = (station) => {
      if (isCurrentStation(station)) return 'primary'
      if (isPassedStation(station)) return 'grey'
      return 'secondary'
    }

    const getStationTextColor = (station) => {
      return 'white'
    }

    const getShortName = (name) => {
      if (!name) return ''
      // 如果名字太長，截斷它
      return name.length > 8 ? name.substring(0, 8) + '...' : name
    }

    const hasArrivalTime = (station) => {
      const arrival = unwrap(station.arrival)
      return arrival && arrival.length > 0
    }

    const formatArrivalTime = (time) => {
      if (!time) return ''
      try {
        const date = new Date(time)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch (e) {
        return ''
      }
    }

    return {
      unwrap,
      currentStation,
      isCurrentStation,
      isPassedStation,
      isUpcomingStation,
      getStationBadgeColor,
      getStationTextColor,
      getShortName,
      hasArrivalTime,
      formatArrivalTime
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
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.station-item {
  transition: all 0.3s ease;
}

.station-card {
  height: 100%;
  transition: all 0.3s ease;
}

.current-station .station-card {
  border: 2px solid var(--v-primary-base);
  transform: scale(1.05);
  z-index: 1;
}

.passed-station .station-card {
  opacity: 0.7;
  background-color: #f5f5f5;
}

.station-name {
  line-height: 1.2;
  height: 2.4em; /* 限制兩行高度 */
  overflow: hidden;
}

.time-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 手機端優化 */
@media (max-width: 600px) {
  .stations-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 6px;
  }
  
  .station-name {
    font-size: 0.7rem !important;
  }
}
</style>
