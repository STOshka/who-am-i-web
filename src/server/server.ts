import { WSServer } from '../common/commonType';
import { createGameState } from './WhoAmIState';

function init(wsServer: WSServer, path: string) {
  const app = wsServer.app;
  const registry = wsServer.users;

  app.use('/who-am-i', wsServer.static(`${__dirname}/public`));
  if (registry.config.appDir)
    app.use('/who-am-i', wsServer.static(`${registry.config.appDir}/public`));
  registry.handleAppPage(path, `${__dirname}/public/index.html`);

  const WhoAmIState = createGameState(
    wsServer.users.RoomState,
    registry.games.whoAmI.id,
    path
  );

  registry.createRoomManager(path, WhoAmIState);
}

module.exports = init;
