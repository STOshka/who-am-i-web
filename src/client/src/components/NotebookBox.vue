<template>
  <div className="notebook">
    <textarea
      id="notebook"
      v-model="inputValue"
      :placeholder="getLocaleText('notes')"
      @keyup="handleNotebookChange"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameLogic } from '../gameLogic.ts';
import { getLocaleText } from '../locale.ts';

const { state, service } = useGameLogic();

const inputValue = ref(state.playerNotes?.[state.userId] || '');

const handleNotebookChange = (event: KeyboardEvent) => {
  const target = event.target as HTMLTextAreaElement;
  state.playerNotes![state.userId] = target.value;
  service.changeNotes(target.value);
};
</script>
