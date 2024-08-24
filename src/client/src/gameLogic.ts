import { ref } from 'vue';
import { Roles, RoomEvents } from '../../common/interfaces';
import { WhoAmIRoom, WhoAmIState } from '../../common/gameType';
import { JSONSet } from '../../common/utils';
import { ReactAppWindow } from './react-common';
const GAME_CHANNEL = '/bg/who-am-i';

type data = Partial<WhoAmIRoom> &
  Partial<WhoAmIState> & {
    inited: boolean;
    userId: string;
  };

type windowApp = ReactAppWindow<data>;
declare const window: windowApp;
const commonRoom = () => window.commonRoom;

const state = ref(window.gameState || { inited: false });
let initialized = false;

const initGame = () => {
  window.socket.of(GAME_CHANNEL).on('state', (data: WhoAmIRoom) => {
    if (!state.value.inited && data.inited) {
      setTimeout(
        () => document.getElementById('background')?.classList?.add('blurred'),
        1500
      );
    }

    Object.assign(state.value, data, {
      userId: window.gameApp.userId,
      players: new JSONSet(data.players),
      onlinePlayers: new JSONSet(data.onlinePlayers),
      spectators: new JSONSet(data.spectators),
      playerNotes: state.value.playerNotes || {},
      roles: state.value.roles || {},
    });
  });

  window.socket
    .of(GAME_CHANNEL)
    .on('player-state', (data: { roles: { [key: string]: Roles } }) => {
      Object.assign(state.value, data);
    });

  window.socket
    .of(GAME_CHANNEL)
    .on('notes', (data: { user: string; note: string }) => {
      state.value.playerNotes![data.user] = data.note;
    });

  window.socket.on('disconnect', () => {
    state.value.inited = false;
  });
};

const service = new Proxy({} as { [K in keyof RoomEvents]: RoomEvents[K] }, {
  get(_target, event: keyof RoomEvents) {
    return (...args: Parameters<RoomEvents[typeof event]>) => {
      window.socket.of(GAME_CHANNEL)?.emit(event, ...args);
    };
  },
});

export const useGameLogic = () => {
  if (!initialized) {
    initialized = true;
    initGame();
  }
  return { state: state.value, service, commonRoom: commonRoom() };
};
