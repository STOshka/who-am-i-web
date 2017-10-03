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
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.userId;
        initArgs.userName = localStorage.userName;
        this.socket = io();
        this.socket.on("state", state => this.setState(Object.assign({
            userId: this.userId
        }, state)));
        this.socket.on("roles", (player, word) => {
            if (this.userId !== player)
                document.getElementById(player).value = word;
        });
        this.socket.on("disconnect", () => {
            this.setState({
                inited: false
            });
            window.location.reload();
        });
        document.title = `Who am I - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    handleChangeWord(event) {
        const target = event.target;
        setTimeout(() => {
            this.socket.emit("change-word", target.id, target.value);
        }, 0);
    }

    handleHostAction(evt) {
        const action = evt.target.className;
        if (action === "give-host")
            this.socket.emit("give-host", prompt("Nickname"));
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
            return (<div>You were kicked</div>);
        else if (this.state.inited) {
            const
                data = this.state,
                isHost = data.hostId === data.userId;
            return (
                <div className="game">
                    <div className={
                        "game-board"
                        + (this.state.inited ? " active" : "")
                    }>
                    </div>
                    <div className="player-list">
                        {data.players.map(player => (
                            <div className="player-row">
                                <Player id={player} data={data}/>
                                <input type={player === data.userId ? "password" : "text"} className="role"
                                       disabled={player === data.userId}
                                       id={player}
                                       defaultValue={player !== data.userId ? data.roles[player] : "*****"}
                                       onKeyDown={(event => this.handleChangeWord(event))}/>
                            </div>
                        ))}
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
                                <div className="change-name">Change name</div>
                            </div>
                        </div>
                        <i className="material-icons settings-button">settings</i>
                    </div>
                </div>
            );
        }
        else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
