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
import { UserEventHandler } from './UserEvent';

export function createGameState(
  RoomState: RegistryRoomState,
  id: string,
  path: string
) {
  class GameState extends RoomState {
    state: WhoAmIState;

    constructor(hostId: string, hostData: JoinData, userRegistry: Registry) {
      super(hostId, hostData, userRegistry, id, path);
      this.room = {
        ...this.room,
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

    get game() {
      return this.room as WhoAmIRoom;
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
        this.send(playerId, 'state', this.game)
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
      [...this.game.onlinePlayers].forEach((user) => this.sendState(user));
    }

    removePlayer(playerId: string) {
      this.game.players.delete(playerId);
      if (
        this.game.spectators.has(playerId) ||
        !this.game.onlinePlayers.has(playerId)
      ) {
        this.game.spectators.delete(playerId);
        delete this.game.playerNames[playerId];
        this.emit('user-kicked', playerId);
      } else {
        if (this.game.currentPlayer === playerId) {
          this.nextPlayer();
        }
        this.game.spectators.add(playerId);
      }
    }

    nextPlayer() {
      const playersArray = [...this.room.players];
      const currentPlayerIndex = playersArray.indexOf(this.game.currentPlayer!);

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
      if (!this.game.playerNames[user]) {
        this.game.spectators.add(user);
      }
      this.game.onlinePlayers.add(user);
      this.game.playerNames[user] = data.userName.substring(0, 60);
      this.game.roleStickers[user] = this.game.roleStickers[user] || {
        x: 0,
        y: 0,
      };
      this.game.roleStickersSize[user] = this.game.roleStickersSize[user] || {
        w: 108,
        h: 38,
      };

      if (data.avatarId) {
        const avatarPath = `${this.registry.config.appDir || __dirname}/public/avatars/${user}/${data.avatarId}.png`;
        fs.stat(avatarPath, (err) => {
          if (!err) {
            this.game.playerAvatars[user] = data.avatarId!;
            this.update();
          }
        });
      }
      this.update();
      this.sendState(user);
    }

    userLeftHandler(user: string) {
      this.game.onlinePlayers.delete(user);
      if (this.game.spectators.has(user)) {
        delete this.game.playerNames[user];
      }
      this.game.spectators.delete(user);
      this.update();
    }

    userEventHandler(user: string, event: keyof RoomEvents, args: unknown[]) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event](user, ...args);
      }
      const handleEvent = new UserEventHandler(this, user);
      const eventHandler = handleEvent[event as keyof RoomEvents] as (
        ...args: unknown[]
      ) => void;
      if (typeof eventHandler === 'function') {
        eventHandler.call(handleEvent, ...args);
      }
    }

    getPlayerCount(): number {
      return Object.keys(this.game.playerNames).length;
    }

    getActivePlayerCount(): number {
      return this.game.onlinePlayers.size;
    }

    getLastInteraction(): Date {
      return this.lastInteraction;
    }

    getSnapshot(): Snapshot {
      return {
        room: this.game,
        state: this.state,
      };
    }

    setSnapshot(snapshot: Snapshot) {
      Object.assign(this.game, snapshot.room);
      Object.assign(this.state, snapshot.state);
      this.game.onlinePlayers = new JSONSet();
      this.game.spectators = new JSONSet();
      this.game.players = new JSONSet(this.game.players);
      this.game.onlinePlayers.clear();
    }
  }

  return GameState;
}

export type GameStateType = ReturnType<typeof createGameState>;
