<template>
  <div className="host-controls">
    <div className="side-buttons">
      <HostControlItem
        v-for="(button, index) in controlButtons"
        :key="index"
        :button="button"
      />
    </div>
    <i className="settings-hover-button material-icons">settings</i>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameLogic } from '../../gameLogic.ts';
import { MenuButton } from '../../../../common/interfaces';
import HostControlItem from './HostControlItem.vue';
import { switchToNextLocale } from '../../locale.ts';

const { state, service, commonRoom } = useGameLogic();

const controlButtons = computed<MenuButton[]>(() => {
  return [
    {
      class: 'material-icons-outlined',
      msg: state.rolesLocked ? 'label_off' : 'label',
      isHost: true,
      onClick: () => service.toggleRoleLock(),
    },
    {
      class: 'material-icons',
      msg: 'language',
      isHost: false,
      onClick: () => switchToNextLocale(),
    },
    {
      class: 'material-icons',
      msg: state.teamsLocked ? 'lock_outline' : 'lock_open',
      isHost: true,
      onClick: () => service.toggleLock(),
    },
    {
      class: 'material-icons toggle-theme',
      msg: 'edit',
      isHost: false,
      onClick: () => commonRoom.handleClickChangeName(),
    },
  ];
});
</script>
