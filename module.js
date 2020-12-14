function init(wsServer, path, vkToken) {
    const
        fs = require("fs"),
        app = wsServer.app,
        registry = wsServer.users,
        channel = "who-am-i";

    app.use("/who-am-i", wsServer.static(`${__dirname}/public`));
    if (registry.config.appDir)
        app.use("/who-am-i", wsServer.static(`${registry.config.appDir}/public`));
    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    class GameState extends wsServer.users.RoomState {
        constructor(hostId, hostData, userRegistry) {
            super(hostId, hostData, userRegistry);
            const
                room = {
                    ...this.room,
                    inited: true,
                    hostId: hostId,
                    spectators: new JSONSet(),
                    playerNames: {},
                    onlinePlayers: new JSONSet(),
                    players: new JSONSet(),
                    teamsLocked: false,
                    rolesLocked: false,
                    playerAvatars: {},
                    roleStickers: {},
                    currentPlayer: null,
                    managedVoice: true
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
                update = () => {
                    if (room.voiceEnabled)
                        processUserVoice();
                    send(room.onlinePlayers, "state", room);
                },
                processUserVoice = () => {
                    room.userVoice = {};
                    room.onlinePlayers.forEach((user) => {
                        if (!room.managedVoice || !room.teamsLocked)
                            room.userVoice[user] = true;
                        else if (room.players.has(user))
                            room.userVoice[user] = true;
                    });
                },
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
            this.updatePublicState = update;
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {
                ...this.eventHandlers,
                "update-avatar": (user, id) => {
                    room.playerAvatars[user] = id;
                    update()
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "toggle-role-lock": (user) => {
                    if (user === room.hostId)
                        room.rolesLocked = !room.rolesLocked;
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
                    if (room.players.has(user) && room.players.has(player) && player !== user && !room.rolesLocked)
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

