<template>
  <div
    :class="[
      'spectators-section',
      { active: state.spectators?.size || !state.teamsLocked },
    ]"
    @click="service.spectatorsJoin()"
  >
    <div class="spectators">
      Spectators:
      <template v-if="spectatorsList.length > 0">
        <PlayerName
          v-for="(player, index) in spectatorsList"
          :key="index"
          :player="player"
        />
      </template>
      <template v-else>...</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameLogic } from '../gameLogic.ts';
import PlayerName from './Player/PlayerName.vue';
const { state, service } = useGameLogic();

const spectatorsList = computed(() => Array.from(state.spectators || []));
</script>
