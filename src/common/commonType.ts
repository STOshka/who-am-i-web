import { Application, static as static_ } from 'express';
import { JSONSet } from './utils';

export interface WSServer {
  app: Application;
  users: Registry;
  static: typeof static_;
}

export interface CommonRoom {
  voiceEnabled: boolean;
  userVoice: Record<string, boolean>;
  playerNames: { [key: string]: string };
  onlinePlayers: JSONSet<string>;
  players: JSONSet<string>;
  playerAvatars: { [key: string]: string };
  hostId: string;
  managedVoice: boolean;
  [key: string]: unknown;
}

export interface CommonState {
  [key: string]: unknown;
}

export interface RoomState {
  room: CommonRoom;
  state: CommonState;
  lastInteraction: Date;
  userRegistry: Registry;
  registry: Registry;
  updatePublicState(): void;
  userJoin(data: JoinData): void;
  userLeft(user: string): void;
  userEvent(user: string, event: string, data: unknown[]): void | never;
  emit(eventName: string, ...data: unknown[]): void;
  eventHandlers: { [key: string]: (user: string, ...data: unknown[]) => void };
}

export interface RegistryRoomState {
  new (
    hostID: string,
    hostData: object,
    userRegistry: Registry,
    gameID: string,
    path: string
  ): RoomState;
  room: CommonRoom;
}

export interface Registry {
  config: {
    appDir: string;
  };
  achievements: Record<string, { id: string }>;
  games: Record<string, { id: string }>;
  roomManagers: Map<string, { rooms: Map<string, { room: CommonRoom }> }>;
  authUsers: {
    processAchievement(
      userData: { user: string; room: CommonRoom },
      achievements: string,
      achievementData?: { game: string }
    ): Promise<void>;
  };
  handleAppPage(
    path: string,
    filePath: string,
    viteManifestPath?: string,
    viteStaticPath?: string
  ): void;
  send(target: JSONSet<string> | string, event: string, data: object): void;
  log(message: string): void;
  createRoomManager(path: string, gameState: RoomStateClass): void;
  RoomState: RegistryRoomState;
}

export interface RoomStateClass {
  new (hostId: string, hostData: JoinData, userRegistry: Registry): RoomState;
}

export interface JoinData {
  roomId: string;
  userId: string;
  userName: string;
  token: string;
  wssToken: string;
  avatarId?: string;
}

export interface Snapshot {
  room: CommonRoom;
  state: CommonState;
}
