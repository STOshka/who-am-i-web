<template>
  <div
    :class="[
      'player',
      {
        offline: !state.onlinePlayers?.has(props.player),
        self: props.player === state.userId,
      },
    ]"
  >
    <span>{{ state.playerNames?.[props.player] }}</span>
    <div v-if="isShowControl" class="player-host-controls">
      <PlayerControlItem
        v-for="(button, index) in controlButtons"
        :key="index"
        :button="button"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue';
import { useGameLogic } from '../../gameLogic.ts';
import PlayerControlItem from './PlayerControl.vue';
import { PlayerButton } from '../../../../common/interfaces';
const { state, service, commonRoom } = useGameLogic();

const props = defineProps<{
  player: string;
}>();

const isHostThisUser = computed(() => state.hostId === props.player);
const isHostIsYou = computed(() => state.hostId === state.userId);
const isUserPlaying = computed(() => state.players?.has(props.player) || false);

const controlButtons = computed<PlayerButton[]>(() => [
  {
    title: 'Game host',
    icon: 'stars',
    isShow: isHostThisUser.value,
  },
  {
    title: 'Set turn',
    icon: 'reply',
    isShow: isHostIsYou.value && !isHostThisUser.value && isUserPlaying.value,
    onClick: () => service.setCurrentPlayer(props.player),
  },
  {
    title: 'Give host',
    icon: 'vpn_key',
    isShow: isHostIsYou.value && !isHostThisUser.value,
    onClick: (evt: MouseEvent) => commonRoom.handleGiveHost(props.player, evt),
  },
  {
    title: 'Remove',
    icon: 'delete_forever',
    isShow: isHostIsYou.value && !isHostThisUser.value,
    onClick: (evt: MouseEvent) =>
      commonRoom.handleRemovePlayer(props.player, evt),
  },
]);

const isShowControl = computed(() =>
  controlButtons.value.some((c) => c.isShow)
);
</script>
