<template>
  <div className="player-list">
    <PlayerContainer
      v-for="(player, index) in state.players"
      :id="player"
      :key="index"
    />
    <div
      v-if="!state.teamsLocked && !state.players?.has(state.userId)"
      class="join-players-button"
      @click="service.playersJoin()"
    >
      +
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from '../gameLogic.ts';
import PlayerContainer from './PlayerContainer.vue';

const { state, service } = useGameLogic();
</script>
