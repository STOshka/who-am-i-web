<template>
  <div v-if="state.inited" className="game">
    <div id="background" />
    <div :class="['game-board', { active: state.inited }]">
      <SpectatorsList />
      <PlayerList />
      <div
        v-if="state.currentPlayer === state.userId"
        class="end-turn-button"
        @click="service.endTurn()"
      >
        {{ getLocaleText('endTurn') }}
      </div>
      <NotebookBox v-if="state.players?.has(state.userId)" />
      <HostControl />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './gameLogic.ts';
import SpectatorsList from './components/SpectatorsList.vue';
import PlayerList from './components/PlayerList.vue';
import NotebookBox from './components/NotebookBox.vue';
import HostControl from './components/HostControl/HostControl.vue';
import { getLocaleText } from './locale.ts';
import './style.css';
const { state, service } = useGameLogic();

import '@interactjs/auto-start';
import '@interactjs/actions/drag';
import '@interactjs/dev-tools';
import '@interactjs/modifiers';
import '@interactjs/inertia';
import interact from '@interactjs/interact';

interact('.draggable', {
  context: document.body,
}).draggable({
  ignoreFrom: '.role',
  inertia: true,
  modifiers: [
    interact.modifiers.restrict({
      restriction: 'parent',
      endOnly: true,
      elementRect: { left: 0, right: 1, top: 0, bottom: 1 },
    }),
  ],
  listeners: {
    move(event) {
      const target = event.target as HTMLElement;
      const x = parseFloat(target.getAttribute('data-x') || '0') + event.dx;
      const y = parseFloat(target.getAttribute('data-y') || '0') + event.dy;
      target.style.webkitTransform =
        target.style.transform = `translate(${x}px, ${y}px)`;
      target.setAttribute('data-x', x.toString());
      target.setAttribute('data-y', y.toString());
    },
    start(event) {
      event.target.classList.remove('transition');
    },
    end(event) {
      const target = event.target as HTMLElement;
      target.classList.add('transition');
      service.moveRoleSticker(target.getAttribute('data-id')!, {
        x: event.pageX - event.x0,
        y: event.pageY - event.y0,
      });
    },
  },
});
</script>
