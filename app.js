const
    wsServer = new (require("ws-server-engine"))(),
    gameWhoAmI = require("./dist/module");
gameWhoAmI(wsServer, "/bg/who-am-i");