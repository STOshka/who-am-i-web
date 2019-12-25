function init(wsServer, path, vkToken) {
    const
        fs = require("fs"),
        EventEmitter = require("events"),
        express = require("express"),
        fileUpload = require("express-fileupload"),
        exec = require("child_process").exec,
        app = wsServer.app,
        registry = wsServer.users,
        channel = "who-am-i";

    app.post("/who-am-i/upload-avatar", function (req, res) {
        registry.log(`who-am-i - ${req.body.userId} - upload-avatar`);
        if (req.files && req.files.avatar && registry.checkUserToken(req.body.userId, req.body.userToken)) {
            const userDir = `${registry.config.appDir || __dirname}/public/avatars/${req.body.userId}`;
            exec(`rm -r ${userDir}`, () => {
                fs.mkdir(userDir, () => {
                    req.files.avatar.mv(`${userDir}/${req.files.avatar.md5}.png`, function (err) {
                        if (err) {
                            log(`fileUpload mv error ${err}`);
                            return res.status(500).send("FAIL");
                        }
                        res.send(req.files.avatar.md5);
                    });
                })

            });
        } else res.status(500).send("Wrong data");
    });
    app.use("/who-am-i", express.static(`${__dirname}/public`));
    if (registry.config.appDir)
        app.use("/who-am-i", express.static(`${registry.config.appDir}/public`));
    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    class GameState extends EventEmitter {
        constructor(hostId, hostData, userRegistry) {
            super();
            const
                room = {
                    inited: true,
                    hostId: hostId,
                    spectators: new JSONSet(),
                    playerNames: {},
                    onlinePlayers: new JSONSet(),
                    players: new JSONSet(),
                    teamsLocked: false,
                    playerAvatars: {},
                    roleStickers: {},
                    currentPlayer: null
                },
                state = {
                    roles: {},
                    playerNotes: {}
                };
            this.room = room;
            this.state = state;
            this.lastInteraction = new Date();
            const
                send = (target, event, data1) => userRegistry.send(target, event, data1),
                sendState = (user) => {
                    send(user, "player-state", Object.assign({}, {
                        roles: Object.assign({}, state.roles, {[user]: state.roles[user] ? "**********" : ""})
                    }));
                },
                update = () => send(room.onlinePlayers, "state", room),
                updateState = () => [...room.onlinePlayers].forEach(sendState),
                removePlayer = (playerId) => {
                    room.players.delete(playerId);
                    if (room.spectators.has(playerId) || !room.onlinePlayers.has(playerId)) {
                        room.spectators.delete(playerId);
                        delete room.playerNames[playerId];
                        this.emit("user-kicked", playerId);
                    } else {
                        if (room.currentPlayer === playerId)
                            nextPlayer();
                        room.spectators.add(playerId);
                    }
                },
                nextPlayer = () => {
                    if (!room.currentPlayer)
                        room.currentPlayer = [...room.players][0];
                    else {
                        let nextPlayerIndex = [...room.players].indexOf(room.currentPlayer) + 1;
                        if (![...room.players][nextPlayerIndex])
                            nextPlayerIndex = 0;
                        room.currentPlayer = [...room.players][nextPlayerIndex];
                    }
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    room.roleStickers[user] = room.roleStickers[user] || {x: 0, y: 0};
                    if (data.avatarId) {
                        fs.stat(`${registry.config.appDir || __dirname}/public/avatars/${user}/${data.avatarId}.png`, (err) => {
                            if (!err) {
                                room.playerAvatars[user] = data.avatarId;
                                update()
                            }
                        });
                    }
                    update();
                    sendState(user);
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    update();
                },
                userEvent = (user, event, data) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.eventHandlers[event])
                            this.eventHandlers[event](user, data[0], data[1], data[2]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {
                "update-avatar": (user, id) => {
                    room.playerAvatars[user] = id;
                    update()
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                },
                "remove-player": (user, playerId) => {
                    if (playerId && user === room.hostId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (playerId && user === room.hostId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "players-join": (user) => {
                    if (!room.teamsLocked) {
                        room.spectators.delete(user);
                        room.players.add(user);
                        if (room.players.size === 1)
                            room.currentPlayer = user;
                        update();
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked) {
                        room.players.delete(user);
                        room.spectators.add(user);
                        if (room.currentPlayer === user)
                            nextPlayer();
                        update();
                    }
                },
                "change-word": (user, player, word) => {
                    if (room.players.has(user) && room.players.has(player) && player !== user)
                        state.roles[player] = word;
                    updateState();
                },
                "change-notes": (user, word) => {
                    if (room.players.has(user))
                        state.playerNotes[user] = word;
                },
                "get-notes": (user, userNote) => {
                    send(user, "notes", {user: userNote, note: state.playerNotes[userNote]});
                },
                "move-role-sticker": (user, player, position) => {
                    if (room.players.has(user) && room.players.has(player)) {
                        const prevPosition = room.roleStickers[player];
                        room.roleStickers[player] = {x: prevPosition.x + position.x, y: prevPosition.y + position.y};
                    }
                    update();
                },
                "set-current-player": (user, player) => {
                    if (room.players.has(player) && user === room.hostId)
                        room.currentPlayer = player;
                    update();
                },
                "end-turn": (user) => {
                    if (room.currentPlayer === user)
                        nextPlayer();
                    update();
                }
            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.players = new JSONSet(this.room.players);
            this.room.onlinePlayers.clear();
        }
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;

