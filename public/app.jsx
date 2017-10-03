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
            <div className={
                "player"
                + (!~data.onlinePlayers.indexOf(id) ? " offline" : "")
                + (id === data.userId ? " self" : "")
            }>
                {data.playerNames[id]}
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!localStorage.userId) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.userId = makeId();
        }
        if (!location.hash)
            location.hash = makeId();
        if (localStorage.notebook)
            this.notebook = localStorage.notebook;
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.userId;
        initArgs.userName = localStorage.userName;
        this.socket = io();
        this.socket.on("state", state => this.setState(Object.assign({
            userId: this.userId,
            notebook: this.notebook,
            avatars: this.avatars
        }, state)));
        this.socket.on("roles", (player, word) => {
            if (this.userId !== player)
                document.getElementById(player).value = word;
        });
        this.socket.on("request-avatar", () => {
            if (localStorage.avatar)
                this.socket.emit("set-avatar", localStorage.avatar);
        });
        this.socket.on("update-avatars", avatars => {
            this.avatars = Object.assign({}, this.avatars, avatars);
            this.setState(this.state);
        });
        this.socket.on("disconnect", () => {
            this.setState({
                inited: false
            });
            window.location.reload();
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
                const target = event.target,
                    x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                target.style.webkitTransform =
                    target.style.transform =
                        'translate(' + x + 'px, ' + y + 'px)';
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            },
            onstart: (event) => event.target.classList.remove("transition"),
            onend: (event) => {
                event.target.classList.add("transition");
                this.socket.emit("move-role-sticker", event.target.getAttribute("data-id"), {x: event.dx, y: event.dy});
            }
        });
        setTimeout(() => document.getElementById("background").classList.add("blurred"), 1500);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    handleRoleChange(event) {
        const target = event.target;
        setTimeout(() => {
            this.socket.emit("change-word", target.id, target.value);
        }, 0);
    }

    handleNotebookChange(event) {
        const target = event.target;
        setTimeout(() => {
            localStorage.notebook = target.value;
        }, 0);
    }

    handleSetAvatar(event) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const
                fileSize = ((input.files[0].size / 1024) / 1024).toFixed(4), // MB
                FR = new FileReader();
            if (fileSize <= 5) {
                FR.addEventListener("load", event => {
                    localStorage.avatar = event.target.result;
                    this.socket.emit("set-avatar", event.target.result);
                });
                FR.readAsDataURL(input.files[0]);
            } else alert("File shouldn't be larger than 5 MB")
        }
    }

    handleHostAction(evt) {
        const action = evt.target.className;
        if (action === "give-host")
            this.socket.emit("give-host", prompt("Nickname"));
        else if (action === "set-avatar")
            document.getElementById("avatar-input").click();
        else if (action === "remove-player")
            this.socket.emit("remove-player", prompt("Nickname"));
        else if (action === "change-name") {
            const name = prompt("New name");
            this.socket.emit("change-name", name);
            localStorage.userName = name;
        }
        else
            this.socket.emit(action);
    }

    render() {
        if (this.state.inited && !this.state.playerNames[this.state.userId])
            return (<div className="kicked">You were kicked</div>);
        else if (this.state.inited) {
            const
                data = this.state,
                isHost = data.hostId === data.userId;
            return (
                <div className="game">
                    <div id="background"/>
                    <div className={
                        "game-board"
                        + (this.state.inited ? " active" : "")
                    }>
                    </div>
                    <div className="player-list">
                        {data.players.map(player => (
                            <div className="player-container">
                                <div className="avatar"
                                     style={{"background-image": `url(${data.avatars[player] || "default-user.png"})`}}/>
                                <Player id={player} data={data}/>
                                <div
                                    className="draggable role-container transition"
                                    data-id={player}
                                    style={{transform: `translate(${data.roleStickers[player].x}px, ${data.roleStickers[player].y}px)`}}
                                    data-x={data.roleStickers[player].x}
                                    data-y={data.roleStickers[player].y}
                                >
                                    <input className="role"
                                           type={player === data.userId ? "password" : "text"}
                                           disabled={player === data.userId}
                                           id={player}
                                           defaultValue={player !== data.userId ? data.roles[player] : "**********"}
                                           onKeyDown={(event => this.handleRoleChange(event))}/>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="notebook">
                        <textarea id="notebook"
                                  placeholder="notes"
                                  onKeyDown={evt => this.handleNotebookChange(event)}>{data.notebook}</textarea>
                    </div>
                    <div className="host-controls">
                        <div className="host-controls-menu" onClick={evt => this.handleHostAction(evt)}>
                            {isHost ? (
                                <div>
                                    <div className="remove-player">Remove player</div>
                                    <div className="remove-offline">Remove offline</div>
                                    <div className="give-host">Give host</div>
                                </div>
                            ) : ""}
                            <div>
                                <div className="set-avatar">Set avatar</div>
                                <div className="change-name">Change name</div>
                            </div>
                        </div>
                        <i className="material-icons settings-button">settings</i>
                    </div>
                    <input id="avatar-input" type="file" onChange={evt => this.handleSetAvatar(evt)}/>
                </div>
            );
        }
        else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
