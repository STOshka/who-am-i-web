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
            id = this.props.id;
        return (
            <div className={cs("player", {offline: !~data.onlinePlayers.indexOf(id), self: id === data.userId})}
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                {data.playerNames[id]}
                <div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Give host"
                           onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
                    ) : ""}
                    {(data.hostId === data.userId && id !== data.currentPlayer && !~data.spectators.indexOf(id)) ? (
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
                                                    handleGiveHost={this.props.handleGiveHost}/>)
                    ) : " ..."
                }
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!localStorage.whoAmIUserId || !localStorage.whoAmIUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.whoAmIUserId = makeId();
            localStorage.whoAmIUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.whoAmIUserId;
        initArgs.token = this.userToken = localStorage.whoAmIUserToken;
        initArgs.userName = localStorage.userName;
        initArgs.wssToken = window.wssToken;
        this.socket = window.socket.of("who-am-i");
        this.socket.on("state", (state) => {
            clearTimeout(this.timerTimeout);
            if (!this.state.inited && state.inited)
                this.timerTimeout = setTimeout(() => document.getElementById("background").classList.add("blurred"), 1500);
            if (this.state.inited && !~this.state.spectators.indexOf(this.userId)
                && this.state.currentPlayer !== this.userId && state.currentPlayer === this.userId)
                this.turnSound.play();
            this.setState(Object.assign({
                userId: this.userId,
                roles: this.state.roles || {},
                playerNotes: this.state.playerNotes || {}
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
                disconnectReason: event.reason
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
                elementRect: {left: 0, right: 1, top: 0, bottom: 1}
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
            onstart: (event) => event.target.classList.remove("transition"),
            onend: (event) => {
                event.target.classList.add("transition");
                if (~this.state.players.indexOf(this.state.userId))
                    this.socket.emit("move-role-sticker", event.target.getAttribute("data-id"), {
                        x: event.dx,
                        y: event.dy
                    });
            }
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
            inited: false
        };
    }

    handleRoleChange(id, value) {
        this.socket.emit("change-word", id, value);
    }

    handleNotesChange(id, value) {
        this.debouncedEmit("change-notes", id, value);
    }

    debouncedEmit(event, a1, a2) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, a1, a2);
        }, 1000);
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Removing ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
    }

    handleSetPlayer(id, evt) {
        evt.stopPropagation();
        this.socket.emit("set-current-player", id);
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
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
        popup.prompt({content: "New name", value: this.state.playerNames[this.state.userId] || ""}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                this.socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    handleClickSetAvatar() {
        document.getElementById("avatar-input").click();
    }

    handleSetAvatar(event) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const
                file = input.files[0],
                uri = "/who-am-i/upload-avatar",
                xhr = new XMLHttpRequest(),
                fd = new FormData(),
                fileSize = ((file.size / 1024) / 1024).toFixed(4); // MB
            if (fileSize <= 5) {
                xhr.open("POST", uri, true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        localStorage.avatarId = xhr.responseText;
                        this.socket.emit("update-avatar", localStorage.avatarId);
                    } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "File upload error"});
                };
                fd.append("avatar", file);
                fd.append("userId", this.userId);
                fd.append("userToken", this.userToken);
                xhr.send(fd);
            } else
                popup.alert({content: "File shouldn't be larger than 5 MB"});
        }
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
                    <div id="background"/>
                    <div className={cs("game-board", {active: this.state.inited})}>
                        <div className="player-list">
                            {data.players.map(player => (
                                <div
                                    onTouchStart={(e) => e.target.focus()}
                                    className={cs("player-container", {"current-player": player === data.currentPlayer})}>
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
                                             "background-image": `url(/who-am-i/${data.playerAvatars[player]
                                                 ? `avatars/${player}/${data.playerAvatars[player]}.png`
                                                 : "default-user.png"})`
                                         }}/>
                                    <Player id={player} data={data}
                                            handleSetPlayer={(id, evt) => this.handleSetPlayer(id, evt)}
                                            handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                            handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}/>
                                    <div
                                        className="draggable role-container transition"
                                        data-id={player}
                                        style={{transform: `translate(${data.roleStickers[player].x}px, ${data.roleStickers[player].y}px)`}}
                                        data-x={data.roleStickers[player].x}
                                        data-y={data.roleStickers[player].y}
                                    >
                                        <input className="role"
                                               autoComplete="off"
                                               type={player === data.userId && data.roles[player] ? "password" : "text"}
                                               disabled={!isPlayer || player === data.userId || data.rolesLocked}
                                               id={player}
                                               value={(player !== data.userId && ~data.players.indexOf(data.userId))
                                                   ? data.roles[player] : (data.roles[player] ? "**********" : "")}
                                               onChange={(event => this.handleRoleChange(event.target.id, event.target.value))}/>
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
                                  onChange={(event => this.handleNotesChange(event.target.value))}/>
                        </div>) : ""}
                        {data.currentPlayer === data.userId ? (
                            <div className="end-turn-button" onClick={() => this.handleClickEndTurn()}>End
                                turn</div>) : ""}
                        <div
                            className={cs("spectators-section", {active: data.spectators.length > 0 || !data.teamsLocked})}>
                            <Spectators data={this.state}
                                        handleSpectatorsClick={() => this.handleSpectatorsClick()}
                                        handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                        handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}/>
                        </div>
                        <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                            <div className="side-buttons">
                                <i onClick={() => window.location = parentDir}
                                   className="material-icons exit settings-button">exit_to_app</i>
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
                            <input id="avatar-input" type="file" onChange={evt => this.handleSetAvatar(evt)}/>
                        </div>
                    </div>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
