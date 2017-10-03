const
    path = require('path'),
    fs = require('fs'),
    express = require('express'),
    socketIo = require("socket.io");

function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function shuffleArray(array) {
    array.sort(() => (Math.random() - 0.5));
    return array;
}

class JSONSet extends Set {
    constructor(iterable) {
        super(iterable)
    }

    toJSON() {
        return [...this]
    }
}

const
    rooms = {};

// Server part
const app = express();
app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/who-am-i', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

const server = app.listen(1489);
console.log('Server listening on port 8000');


// Socket.IO part
const io = socketIo(server);

io.on("connection", socket => {
    let room, user,
        update = () => {
            const roles = Object.assign({}, room.roles);
            delete room.roles[user];
            io.to(room.roomId).emit("state", room);
            room.roles = roles;
        },
        removePlayer = playerId => {
            room.onlinePlayers.delete(playerId);
            delete room.roles[playerId];
        },
        getPlayerByName = name => {
            let playerId;
            Object.keys(room.playerNames).forEach(userId => {
                if (room.playerNames[userId] === name)
                    playerId = userId;
            });
        };
    socket.on("init", args => {
        socket.join(args.roomId);
        user = args.userId;
        room = rooms[args.roomId] = rooms[args.roomId] || {
            inited: true,
            roomId: args.roomId,
            hostId: user,
            players: new JSONSet(),
            playerNames: {},
            roles: {},
            onlinePlayers: new JSONSet()
        };
        room.players.add(user);
        room.onlinePlayers.add(user);
        room.playerNames[user] = args.userName;
        update();
    });
    socket.on("change-word", (player, word) => {
        room.roles[player] = word;
        socket.broadcast.to(room.roomId).emit("roles", player, word);
    });
    socket.on("change-name", value => {
        if (value)
            room.playerNames[user] = value;
        update();
    });
    socket.on("remove-player", name => {
        const playerId = getPlayerByName(name);
        if (playerId)
            removePlayer(playerId);
        update();
    });
    socket.on("remove-offline", () => {
        Object.keys(room.playerNames).forEach(playerId => {
            if (!room.onlinePlayers.has(playerId))
                removePlayer(playerId);
        });
        update();
    });
    socket.on("give-host", name => {
        const playerId = getPlayerByName(name);
        if (playerId)
            room.hostId = playerId;
        update();
    });
    socket.on("disconnect", () => {
        if (room) {
            room.onlinePlayers.delete(user);
            update();
        }
    });
    socket.emit("re-init");
});

