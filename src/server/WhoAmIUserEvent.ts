import { StickerPosition, StickerSize, WhoAmIRoom } from '../common/gameType';
import { RoomEvents } from '../common/interfaces';
import { WhoAmIGameStateType } from './WhoAmIState';

export class UserEventHandler implements RoomEvents {
  game: InstanceType<WhoAmIGameStateType>;
  user: string;

  constructor(game: InstanceType<WhoAmIGameStateType>, user: string) {
    this.game = game;
    this.user = user;
  }

  get room(): WhoAmIRoom {
    return this.game.room;
  }

  isHost(): boolean {
    return this.user === this.room.hostId;
  }

  isUserPlaying(playerId: string): boolean {
    return this.room.players?.has(playerId);
  }

  toggleLock() {
    if (this.isHost()) {
      this.room.teamsLocked = !this.room.teamsLocked;
      this.game.update();
    }
  }

  toggleRoleLock() {
    if (this.isHost()) {
      this.room.rolesLocked = !this.room.rolesLocked;
      this.game.update();
    }
  }

  removePlayer(playerId: string) {
    if (this.room.onlinePlayers?.has(playerId) && this.isHost()) {
      this.game.removePlayer(playerId);
      this.game.update();
    }
  }

  giveHost(playerId: string) {
    if (this.room.onlinePlayers?.has(playerId) && this.isHost()) {
      this.room.hostId = playerId;
      this.game.update();
    }
  }

  playersJoin() {
    if (!this.room.teamsLocked) {
      this.room.spectators.delete(this.user);
      this.room.players.add(this.user);
      if (this.room.players.size === 1) {
        this.room.currentPlayer = this.user;
      }
      this.game.update();
    }
  }

  spectatorsJoin() {
    if (!this.room.teamsLocked) {
      this.room.players.delete(this.user);
      this.room.spectators.add(this.user);
      if (this.room.currentPlayer === this.user) {
        this.game.nextPlayer();
      }
      this.game.update();
    }
  }

  changeWord(playerId: string, word: string) {
    if (
      this.isUserPlaying(playerId) &&
      this.isUserPlaying(this.user) &&
      this.user !== playerId &&
      !this.room.rolesLocked
    ) {
      this.game.state.roles[playerId] = word;
      this.game.updateState();
    }
  }

  changeNotes(note: string) {
    if (this.isUserPlaying(this.user)) {
      this.game.state.playerNotes[this.user] = note;
    }
  }

  getNotes(playerId: string) {
    if (this.isUserPlaying(playerId)) {
      this.game.send(this.user, 'notes', {
        user: playerId,
        note: this.game.state.playerNotes[playerId],
      });
    }
  }

  moveRoleSticker(playerId: string, position: StickerPosition) {
    if (this.isUserPlaying(playerId)) {
      const prevPosition = this.room.roleStickers[playerId];
      this.room.roleStickers[playerId] = {
        x: prevPosition.x + position.x,
        y: prevPosition.y + position.y,
      };
      this.game.update();
    }
  }

  resizeRoleSticker(playerId: string, size: StickerSize) {
    if (this.isUserPlaying(playerId)) {
      this.room.roleStickersSize[playerId] = {
        h: size.h,
        w: size.w,
      };
      this.game.update();
    }
  }

  setCurrentPlayer(playerId: string) {
    if (this.isUserPlaying(playerId) && this.isHost()) {
      this.room.currentPlayer = playerId;
      this.game.update();
    }
  }

  endTurn() {
    if (this.room.currentPlayer === this.user) {
      this.game.nextPlayer();
      this.game.update();
    }
  }

  changeName(name: string) {
    this.room.playerNames[this.user] = name;
    this.game.update();
  }
}
