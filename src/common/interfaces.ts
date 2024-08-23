export interface StickerPosition {
  x: number;
  y: number;
}

export interface StickerSize {
  h: number;
  w: number;
}

export interface RoomEvents {
  toggleLock: () => void;
  toggleRoleLock: () => void;
  removePlayer: (playerId: string) => void;
  giveHost: (playerId: string) => void;
  playersJoin: () => void;
  spectatorsJoin: () => void;
  changeWord: (player: string, word: string) => void;
  changeNotes: (note: string) => void;
  getNotes: (playerId: string) => void;
  moveRoleSticker: (player: string, position: StickerPosition) => void;
  resizeRoleSticker: (playerId: string, size: StickerSize) => void;
  setCurrentPlayer: (playerId: string) => void;
  endTurn: () => void;
  changeName: (name: string) => void;
}

export type Roles = string | null | boolean;

export interface MenuButton {
  class: string;
  msg: string;
  isHost: boolean;
  onClick: () => void;
}

export interface PlayerButton {
  title: string;
  icon: string;
  isShow: boolean;
  onClick?: () => void;
}
