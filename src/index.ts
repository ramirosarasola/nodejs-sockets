import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import app from "./app"; // 👈 importamos tu app express
import { registerGameSocket } from "./sockets/gameSocket";

dotenv.config();

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });

// Usar el handler modularizado
registerGameSocket(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
