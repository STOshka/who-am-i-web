import { CommonRoom, CommonState } from './commonType';
import { JSONSet } from './utils';

export interface WhoAmIRoom extends CommonRoom {
  inited: boolean;
  spectators: JSONSet<string>;
  teamsLocked: boolean;
  rolesLocked: boolean;
  roleStickers: { [key: string]: StickerPosition };
  roleStickersSize: { [key: string]: StickerSize };
  currentPlayer: string | null;
}

export interface WhoAmIState extends CommonState {
  roles: { [key: string]: string };
  playerNotes: { [key: string]: string };
}

export type SendData =
  | WhoAmIRoom
  | { roles: RolesData }
  | { user: string; note: string };

export interface RolesData {
  [key: string]: boolean | string | null;
}

export interface StickerPosition {
  x: number;
  y: number;
}

export interface StickerSize {
  h: number;
  w: number;
}
