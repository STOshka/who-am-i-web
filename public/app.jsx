//import React from "react";
//import ReactDOM from "react-dom"
//import io from "socket.io"
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Player extends React.Component {
    render() {
        const
            data = this.props.data,
            id = this.props.id,
            isSpectator = data.spectators.includes(id);
        return (
            <div className={cs("player", {offline: !~data.onlinePlayers.indexOf(id), self: id === data.userId})}
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                {isSpectator ? <UserAudioMarker data={data} user={id} /> : ""}
                <PlayerName data={data} id={id} />
                <div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Give host"
                           onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
                    ) : ""}
                    {(data.hostId === data.userId && id !== data.currentPlayer && !isSpectator) ? (
                        <i className="material-icons host-button"
                           title="Set turn"
                           onClick={(evt) => this.props.handleSetPlayer(id, evt)}>
                            reply
                        </i>
                    ) : ""}
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Remove"
                           onClick={(evt) => this.props.handleRemovePlayer(id, evt)}>
                            delete_forever
                        </i>
                    ) : ""}
                    {(data.hostId === id) ? (
                        <i className="material-icons host-button inactive"
                           title="Game host">
                            stars
                        </i>
                    ) : ""}
                </div>
            </div>
        );
    }
}


class Spectators extends React.Component {
    render() {
        const
            data = this.props.data,
            handleSpectatorsClick = this.props.handleSpectatorsClick;
        return (
            <div
                onClick={handleSpectatorsClick}
                className="spectators">
                Spectators:
                {
                    data.spectators.length ? data.spectators.map(
                        (player, index) => (<Player key={index} data={data} id={player}
                                                    handleRemovePlayer={this.props.handleRemovePlayer}
                                                    handleGiveHost={this.props.handleGiveHost} />),
                    ) : " ..."
                }
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        this.gameName = "whoAmI";
        const initArgs = CommonRoom.roomInit(this);
        this.socket.on("state", (state) => {
            CommonRoom.processCommonRoom(state, this.state, {
                maxPlayers: "∞",
                largeImageKey: "who-am-i",
                details: "Кто я?",
            }, this);
            clearTimeout(this.timerTimeout);
            if (!this.state.inited && state.inited)
                this.timerTimeout = setTimeout(() => document.getElementById("background")?.classList?.add("blurred"), 1500);
            if (this.state.inited && !~this.state.spectators.indexOf(this.userId)
                && this.state.currentPlayer !== this.userId && state.currentPlayer === this.userId)
                this.turnSound.play();
            this.setState(Object.assign({
                userId: this.userId,
                roles: this.state.roles || {},
                playerNotes: this.state.playerNotes || {},
            }, state));
        });
        this.socket.on("player-state", (state) => {
            this.setState(Object.assign({}, this.state, state));
        });
        this.socket.on("notes", (data) => {
            this.state.playerNotes[data.user] = data.note;
            this.setState(this.state);
        });
        window.socket.on("disconnect", (event) => {
            this.setState({
                inited: false,
                disconnected: true,
                disconnectReason: event.reason,
            });
        });
        document.title = `Who am I - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
        interact(".draggable", {
            context: document.body,
            ignoreFrom: '.role',
        }).draggable({
            inertia: true,
            restrict: {
                restriction: 'parent',
                endOnly: true,
                elementRect: {left: 0, right: 1, top: 0, bottom: 1},
            },
            onmove: (event) => {
                if (~this.state.players.indexOf(this.state.userId)) {
                    const target = event.target,
                        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    target.style.webkitTransform =
                        target.style.transform =
                            'translate(' + x + 'px, ' + y + 'px)';
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            },
            onstart: (event) => event?.target?.classList?.remove("transition"),
            onend: (event) => {
                const user = event.target.getAttribute("data-id");
                event?.target?.classList?.add("transition");
                if (~this.state.players.indexOf(this.state.userId))
                    this.socket.emit("move-role-sticker", event.target.getAttribute("data-id"), {
                        x: event.dx,
                        y: event.dy,
                    });
            },
        });
        this.socket.on("prompt-delete-prev-room", (roomList) => {
            if (localStorage.acceptDelete =
                prompt(`Limit for hosting rooms per IP was reached: ${roomList.join(", ")}. Delete one of rooms?`, roomList[0]))
                location.reload();
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        this.socket.on("message", text => {
            popup.alert({content: text});
        });
        this.turnSound = new Audio("/who-am-i/chime.mp3");
        this.turnSound.volume = 0.8;
    }

    constructor() {
        super();
        this.state = {
            inited: false,
        };
    }

    handleRoleChange(id, value) {
        if (this.state.roles[id] !== false && this.state.roles[id] !== null) {
            this.state.roles[id] = value;
            this.setState(this.state);
            this.debouncedEmit("change-word", id, value);
        }
    }

    handleNotesChange(id, value) {
        this.state.playerNotes[id] = value;
        this.setState(this.state);
        this.debouncedEmit("change-notes", id, value);
    }

    storeDimensions(e, player) {
        const element = e.target;
        if (this.state.roles[player] === null || this.state.roles[player] === false)
            setTimeout(() => element.blur(), 0);
        element.textWidth = element.offsetWidth;
        element.textHeight = element.offsetHeight;
    }

    onResizeMaybe(e) {
        const element = e.target;
        const user = e.target.getAttribute("data-id");
        if (!(element.textWidth === element.offsetWidth
            && element.textHeight === element.offsetHeight)) {
            this.socket.emit("resize-role-sticker", user, {
                w: element.offsetWidth,
                h: element.offsetHeight,
            });
        }
    }

    debouncedEmit(event, a1, a2) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, a1, a2);
        }, 300);
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Removing ${window.commonRoom.getPlayerName(id)}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
    }

    handleSetPlayer(id, evt) {
        evt.stopPropagation();
        this.socket.emit("set-current-player", id);
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${window.commonRoom.getPlayerName(id)}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleToggleRoleLockClick() {
        this.socket.emit("toggle-role-lock");
    }

    handleSpectatorsClick() {
        this.socket.emit("spectators-join");
    }

    handlePlayersClick() {
        this.socket.emit("players-join");
    }

    handleClickChangeName() {
        popup.prompt({content: "New name", value: window.commonRoom.getPlayerName(this.state.userId || "")}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                this.socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    handleClickSetAvatar() {
        window.commonRoom.handleClickSetImage('avatar');
    }

    handleClickEndTurn() {
        this.socket.emit("end-turn");
    }

    handleHoverNotes(user) {
        this.socket.emit("get-notes", user);
    }

    render() {
        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            const
                data = this.state,
                isHost = data.hostId === data.userId,
                isPlayer = !!~data.players.indexOf(data.userId),
                parentDir = location.pathname.match(/(.+?)\//)[1];
            return (
                <div className="game">
                    <CommonRoom state={this.state} app={this} />
                    <div id="background" />
                    <div className={cs("game-board", {active: this.state.inited})}>
                        <div className="player-list">
                            {data.players.map(player => (
                                <div
                                    onTouchStart={(e) => e.target.focus()}
                                    className={cs("player-container",
                                        {"current-player": player === data.currentPlayer},
                                        ...UserAudioMarker.getAudioMarkerClasses(data, player),
                                    )}>
                                    {data.currentPlayer === player ? (
                                        <i className="turn-marker material-icons">star</i>) : ""}
                                    {player === data.userId
                                        ? (<div className="set-avatar-button">
                                            <i onClick={() => this.handleClickSetAvatar()}
                                               className="toggle-theme material-icons settings-button">edit</i>
                                        </div>)
                                        : (<div className="show-notes-button" onTouchStart={(e) => e.target.focus()}>
                                            <i className="toggle-theme material-icons settings-button"
                                               onMouseOver={() => this.handleHoverNotes(player)}>assignment</i>
                                            <div className="player-notes">
                                                {data.playerNotes[player]}
                                            </div>
                                        </div>)}
                                    <div className="avatar"
                                         style={{
                                             "background-image": `url(${window.commonRoom?.getPlayerAvatarURL(player) ? window.commonRoom?.getPlayerAvatarURL(player) : '/who-am-i/default-user.png'})`,
                                         }} />
                                    <Player id={player} data={data}
                                            handleSetPlayer={(id, evt) => this.handleSetPlayer(id, evt)}
                                            handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                            handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)} />
                                    <div
                                        className={cs('draggable role-container transition',
                                            {
                                                hiddenFilled: data.roles[player] === false,
                                                disabled: !isPlayer || player === data.userId || data.rolesLocked,
                                            })}
                                        data-id={player}
                                        style={{transform: `translate(${data.roleStickers[player].x}px, ${data.roleStickers[player].y}px)`}}
                                        data-x={data.roleStickers[player].x}
                                        data-y={data.roleStickers[player].y}
                                    >
                                        <textarea
                                            className="role"
                                            style={{
                                                width: `${data.roleStickersSize[player].w}px`,
                                                height: `${data.roleStickersSize[player].h}px`,
                                            }}
                                            data-id={player}
                                            onMouseDown={(e) => this.storeDimensions(e, player)}
                                            onMouseUp={(e) => this.onResizeMaybe(e)}
                                            value={data.roles[player] ? data.roles[player] : ''}
                                            onChange={(event => this.handleRoleChange(player, event.target.value))} />
                                    </div>
                                </div>
                            ))}
                            {!data.teamsLocked && !isPlayer ? (
                                <div className="join-players-button"
                                     onClick={() => this.handlePlayersClick()}>+
                                </div>) : ""}
                        </div>
                        {isPlayer ? (<div className="notebook">
                        <textarea id="notebook"
                                  placeholder="notes"
                                  defaultValue={data.playerNotes[data.userId]}
                                  onChange={(event => this.handleNotesChange(event.target.value))} />
                        </div>) : ""}
                        {data.currentPlayer === data.userId ? (
                            <div className="end-turn-button" onClick={() => this.handleClickEndTurn()}>End
                                turn</div>) : ""}
                        <div
                            className={cs("spectators-section", {active: data.spectators.length > 0 || !data.teamsLocked})}>
                            <Spectators data={this.state}
                                        handleSpectatorsClick={() => this.handleSpectatorsClick()}
                                        handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                        handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)} />
                        </div>
                        <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                            <div className="side-buttons">
                                {this.state.userId === this.state.hostId ?
                                    <i onClick={() => this.socket.emit("set-room-mode", false)}
                                       className="material-icons exit settings-button">store</i> : ""}
                                {(isHost || data.rolesLocked) ? (data.rolesLocked
                                    ? (<i onClick={() => this.handleToggleRoleLockClick()}
                                          className="material-icons-outlined start-game settings-button">label_off</i>)
                                    : (<i onClick={() => this.handleToggleRoleLockClick()}
                                          className="material-icons-outlined start-game settings-button">label</i>)) : ""}
                                {isHost ? (data.teamsLocked
                                    ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_outline</i>)
                                    : (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_open</i>)) : ""}
                                <i onClick={() => this.handleClickChangeName()}
                                   className="toggle-theme material-icons settings-button">edit</i>
                            </div>
                            <i className="settings-hover-button material-icons">settings</i>
                        </div>
                    </div>
                </div>
            );
        } else return (<div />);
    }
}

ReactDOM.render(<Game />, document.getElementById('root'));
