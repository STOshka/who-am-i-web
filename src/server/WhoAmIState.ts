import fs from 'fs';
import {
  JoinData,
  Registry,
  RegistryRoomState,
  Snapshot,
} from '../common/commonType';
import { SendData, WhoAmIRoom, WhoAmIState } from '../common/gameType';
import { JSONSet } from '../common/utils';
import { Roles, RoomEvents } from '../common/interfaces';
import { UserEventHandler } from './WhoAmIUserEvent';

export function createGameState(
  RoomState: RegistryRoomState,
  id: string,
  path: string
) {
  class WhoAmIGameState extends RoomState {
    state: WhoAmIState;
    room: WhoAmIRoom;

    constructor(hostId: string, hostData: JoinData, userRegistry: Registry) {
      super(hostId, hostData, userRegistry, id, path);
      this.room = {
        ...this!.room,
        inited: true,
        hostId,
        spectators: new JSONSet(),
        playerNames: {},
        onlinePlayers: new JSONSet(),
        players: new JSONSet(),
        teamsLocked: false,
        rolesLocked: false,
        playerAvatars: {},
        roleStickers: {},
        roleStickersSize: {},
        currentPlayer: null,
        managedVoice: true,
      };
      this.state = {
        roles: {},
        playerNotes: {},
      };
      this.lastInteraction = new Date();
      this.updatePublicState = this.update.bind(this);
      this.userJoin = this.userJoin.bind(this);
      this.userLeft = this.userLeftHandler.bind(this);
      this.userEvent = this.userEventHandler.bind(this);
    }

    send(target: string | JSONSet<string>, event: string, data: SendData) {
      this.userRegistry.send(target, event, data);
    }

    sendState(user: string) {
      const roles = Object.keys(this.state.roles).reduce<Record<string, Roles>>(
        (acc, cur) => {
          acc[cur] =
            user === cur || !this.room.players.has(user)
              ? this.state.roles[cur]
                ? false
                : null
              : this.state.roles[cur];
          return acc;
        },
        {}
      );
      this.send(user, 'player-state', { roles });
    }

    update() {
      if (this.room.voiceEnabled) {
        this.processUserVoice();
      }
      this.room.onlinePlayers.forEach((playerId) =>
        this.send(playerId, 'state', this.room)
      );
      this.updateState();
    }

    processUserVoice() {
      this.room.userVoice = {};
      this.room.onlinePlayers.forEach((user) => {
        this.room.userVoice[user] =
          !this.room.managedVoice ||
          !this.room.teamsLocked ||
          this.room.players.has(user);
      });
    }

    updateState() {
      [...this.room.onlinePlayers].forEach((user) => this.sendState(user));
    }

    removePlayer(playerId: string) {
      this.room.players.delete(playerId);
      if (
        this.room.spectators.has(playerId) ||
        !this.room.onlinePlayers.has(playerId)
      ) {
        this.room.spectators.delete(playerId);
        delete this.room.playerNames[playerId];
        this.emit('user-kicked', playerId);
      } else {
        if (this.room.currentPlayer === playerId) {
          this.nextPlayer();
        }
        this.room.spectators.add(playerId);
      }
    }

    nextPlayer() {
      const playersArray = [...this.room.players];
      const currentPlayerIndex = playersArray.indexOf(this.room.currentPlayer!);

      if (
        currentPlayerIndex === -1 ||
        currentPlayerIndex === playersArray.length - 1
      ) {
        this.room.currentPlayer = playersArray[0];
      } else {
        this.room.currentPlayer = playersArray[currentPlayerIndex + 1];
      }
    }

    userJoin(data: JoinData) {
      const user = data.userId;
      if (!this.room.playerNames[user]) {
        this.room.spectators.add(user);
      }
      this.room.onlinePlayers.add(user);
      this.room.playerNames[user] = data.userName.substring(0, 60);
      this.room.roleStickers[user] = this.room.roleStickers[user] || {
        x: 0,
        y: 0,
      };
      this.room.roleStickersSize[user] = this.room.roleStickersSize[user] || {
        w: 108,
        h: 38,
      };

      if (data.avatarId) {
        const avatarPath = `${this.registry.config.appDir || __dirname}/public/avatars/${user}/${data.avatarId}.png`;
        fs.stat(avatarPath, (err) => {
          if (!err) {
            this.room.playerAvatars[user] = data.avatarId!;
            this.update();
          }
        });
      }
      this.update();
      this.sendState(user);
    }

    userLeftHandler(user: string) {
      this.room.onlinePlayers.delete(user);
      if (this.room.spectators.has(user)) {
        delete this.room.playerNames[user];
      }
      this.room.spectators.delete(user);
      this.update();
    }

    userEventHandler(user: string, event: keyof RoomEvents, args: unknown[]) {
      const specialCases: Record<string, keyof RoomEvents> = {
        'give-host': 'giveHost',
        'remove-player': 'removePlayer',
        'change-name': 'changeName',
      };
      const normalizedEvent = specialCases[event] || event;
      if (this.eventHandlers[normalizedEvent]) {
        return this.eventHandlers[normalizedEvent](user, ...args);
      }
      const handleEvent = new UserEventHandler(this, user);
      const eventHandler = handleEvent[normalizedEvent as keyof RoomEvents] as (
        ...args: unknown[]
      ) => void;
      if (typeof eventHandler === 'function') {
        eventHandler.call(handleEvent, ...args);
      }
    }

    getPlayerCount(): number {
      return Object.keys(this.room.playerNames).length;
    }

    getActivePlayerCount(): number {
      return this.room.onlinePlayers.size;
    }

    getLastInteraction(): Date {
      return this.lastInteraction;
    }

    getSnapshot(): Snapshot {
      return {
        room: this.room,
        state: this.state,
      };
    }

    setSnapshot(snapshot: Snapshot) {
      Object.assign(this.room, snapshot.room);
      Object.assign(this.state, snapshot.state);
      this.room.onlinePlayers = new JSONSet();
      this.room.spectators = new JSONSet();
      this.room.players = new JSONSet(this.room.players);
      this.room.onlinePlayers.clear();
    }
  }

  return WhoAmIGameState;
}

export type WhoAmIGameStateType = ReturnType<typeof createGameState>;
