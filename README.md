# Guess the Painting multiplayer server

This is a small WebSocket server for the TurboWarp multiplayer extension.

## Deploy on Render

1. Create a GitHub repository and upload `server.js` and `package.json`.
2. In Render, create a **Web Service** and select that repository.
3. Use these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: Free (if available)
4. Deploy. Render will give you a URL like `https://your-service.onrender.com`.
5. In the TurboWarp extension, use the WebSocket version of that URL:
   `wss://your-service.onrender.com`

The server keeps rooms in memory. Rooms disappear when the server restarts or when everyone leaves.
