<template>
  <div
    :class="[
      'player-container',
      {
        'current-player': state.currentPlayer === props.id,
      },
    ]"
  >
    <i
      v-if="state.currentPlayer === props.id"
      class="turn-marker material-icons"
    >
      star
    </i>
    <div
      v-if="state.userId === props.id"
      class="set-avatar-button"
      @click="commonRoom.handleClickSetImage('avatar')"
    >
      <i class="toggle-theme material-icons settings-button">edit</i>
    </div>
    <div v-else class="show-notes-button">
      <i
        class="toggle-theme material-icons settings-button"
        @mouseover="service.getNotes(props.id)"
      >
        assignment
      </i>
      <div class="player-notes">{{ state.playerNotes?.[props.id] }}</div>
    </div>
    <div
      class="avatar"
      :style="{
        backgroundImage: `url(${commonRoom.getPlayerAvatarURL(props.id) || '/who-am-i/assets/default-user.png'})`,
      }"
    ></div>
    <PlayerName :player="props.id" />
    <div
      :class="[
        'draggable role-container transition',
        {
          hiddenFilled: typeof state.roles?.[props.id] === 'boolean',
          disabled: props.id === state.userId,
        },
      ]"
      :style="{
        transform: `translate(${state.roleStickers?.[props.id].x}px, ${state.roleStickers?.[props.id].y}px)`,
      }"
      :data-id="props.id"
      :data-x="state.roleStickers?.[props.id].x"
      :data-y="state.roleStickers?.[props.id].y"
    >
      <textarea
        :id="props.id"
        v-model="inputValue"
        :style="{
          width: `${state.roleStickersSize?.[props.id].w}px`,
          height: `${state.roleStickersSize?.[props.id].h}px`,
        }"
        :type="props.id === state.userId ? 'password' : 'text'"
        class="role"
        @mousedown="storeDimensions"
        @mouseup="onResizeMaybe"
        @input="updateValue"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { defineProps } from 'vue';
import { useGameLogic } from '../gameLogic.ts';
import PlayerName from './Player/PlayerName.vue';
import { StickerSize } from '../../../common/interfaces';

const props = defineProps<{
  id: string;
}>();

const { state, service, commonRoom } = useGameLogic();

const inputValue = ref('');

watch(
  () => state.roles?.[props.id],
  (newRoleValue) => {
    inputValue.value =
      typeof newRoleValue === 'boolean' ? '' : newRoleValue?.toString() || '';
  }
);

const textareaSize = ref<StickerSize>({ w: 0, h: 0 });

function updateValue(event: Event) {
  if (state.userId === props.id) {
    inputValue.value = '';
    return;
  }
  const target = event.target as HTMLTextAreaElement;
  inputValue.value = target.value;
  service.changeWord(props.id, target.value);
}

function storeDimensions(e: MouseEvent) {
  const target = e.target as HTMLTextAreaElement;
  textareaSize.value = { w: target.offsetWidth, h: target.offsetHeight };
}

function onResizeMaybe(e: MouseEvent) {
  const target = e.target as HTMLTextAreaElement;
  if (
    textareaSize.value.w !== target.offsetWidth ||
    textareaSize.value.h !== target.offsetHeight
  ) {
    service.resizeRoleSticker(props.id, {
      w: target.offsetWidth,
      h: target.offsetHeight,
    });
  }
}
</script>
