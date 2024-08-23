<template>
  <div
    v-if="isHost || !props.button.isHost"
    :class="[props.button.class, 'settings-button']"
    @click="props.button.onClick"
  >
    {{ props.button.msg }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameLogic } from '../../gameLogic.ts';
import { MenuButton } from '../../../../common/interfaces';

const props = defineProps<{
  button: MenuButton;
}>();

const { state } = useGameLogic();

const isHost = computed(() => state.hostId === state.userId);
</script>
