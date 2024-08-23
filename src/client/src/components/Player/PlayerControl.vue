<template>
  <div
    v-if="props.button.isShow"
    class="material-icons host-button"
    :title="props.button.title"
    @click="props.button.onClick"
  >
    {{ props.button.icon }}
  </div>
</template>

<script setup lang="ts">
import { PlayerButton } from '../../../../common/interfaces';

const props = defineProps<{
  button: PlayerButton;
}>();
</script>
