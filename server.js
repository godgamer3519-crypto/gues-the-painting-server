const { WebSocketServer, WebSocket } = require("ws");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();

function makeCode() {
  let code;
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(code));
  return code;
}

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function roomList() {
  return Array.from(rooms.values()).map(room => ({
    code: room.code,
    name: room.name,
    players: room.players.size
  }));
}

function sendRoomList() {
  const message = { type: "rooms", rooms: roomList() };
  for (const client of wss.clients) send(client, message);
}

function broadcast(room, message, except = null) {
  for (const player of room.players) {
    if (player !== except) send(player, message);
  }
}

function leaveRoom(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;

  room.players.delete(ws);
  ws.roomCode = null;

  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    broadcast(room, { type: "players", count: room.players.size });
  }
  sendRoomList();
}

function joinRoom(ws, room) {
  if (ws.roomCode) leaveRoom(ws);
  ws.roomCode = room.code;
  ws.playerId = crypto.randomUUID();
  room.players.add(ws);

  send(ws, {
    type: "joined",
    code: room.code,
    player: ws.playerId,
    players: room.players.size
  });

  broadcast(room, {
    type: "players",
    count: room.players.size
  }, ws);

  sendRoomList();
}

wss.on("connection", ws => {
  ws.roomCode = null;
  ws.playerId = null;
  send(ws, { type: "welcome" });

  ws.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid message" });
      return;
    }

    if (msg.type === "list") {
      send(ws, { type: "rooms", rooms: roomList() });
      return;
    }

    if (msg.type === "create") {
      const name = String(msg.name || "My Game").trim().slice(0, 30) || "My Game";
      const room = {
        code: makeCode(),
        name,
        players: new Set()
      };
      rooms.set(room.code, room);
      joinRoom(ws, room);
      return;
    }

    if (msg.type === "join") {
      const code = String(msg.code || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: "error", message: "Room not found" });
      } else if (room.players.size >= 10) {
        send(ws, { type: "error", message: "Room is full" });
      } else {
        joinRoom(ws, room);
      }
      return;
    }

    if (msg.type === "game") {
      const room = rooms.get(ws.roomCode);
      if (!room) {
        send(ws, { type: "error", message: "Join a room first" });
        return;
      }
      // Limit individual messages to 16 KB.
      const data = typeof msg.data === "string" ? msg.data.slice(0, 12000) : msg.data;
      broadcast(room, {
        type: "game",
        player: ws.playerId,
        data
      }, ws);
      return;
    }

    send(ws, { type: "error", message: "Unknown message type" });
  });

  ws.on("close", () => leaveRoom(ws));
  ws.on("error", () => leaveRoom(ws));
});

console.log(`Guess the Painting server listening on port ${PORT}`);
