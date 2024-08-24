export interface ReactAppWindow<GameState> extends Window {
  createHyphenator: unknown;
  socket: {
    of: (namespace: string) => WrappedSocket;
    isConnected: boolean;
    on: (event: string, callback: (data: unknown) => void) => void;
  };
  gameState: GameState;
  gameApp: { userId: string };
  commonRoom: {
    getPlayerAvatarURL: (playerId: string) => string;
    handleClickSetImage: (imageType: string) => void;
    handleRemovePlayer: (playerId: string, evt: MouseEvent) => void;
    handleGiveHost: (playerId: string, evt: MouseEvent) => void;
    handleClickChangeName: () => void;
  };
}

export interface WrappedSocket {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: string, callback: (data: any) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
  request: (event: string) => Promise<unknown>;
}
