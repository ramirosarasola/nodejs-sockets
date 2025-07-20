import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import app from "./app";
import { SocketHandler } from "./sockets/SocketHandler";
import { DatabaseService } from "./services/DatabaseService";
import { GameRecoveryService } from "./services/GameRecoveryService";
import { AppConfig } from "./config/AppConfig";
import { Logger } from "./utils/Logger";

dotenv.config();

const config = AppConfig.getInstance();
const logger = Logger.getInstance();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: config.getCorsOrigin() },
});

// Inicializar el manejador de sockets con la nueva arquitectura
const socketHandler = new SocketHandler(io);

// Inicializar el servicio de recuperación
const recoveryService = GameRecoveryService.getInstance();

// Función de inicialización del servidor
async function initializeServer() {
  try {
    // Ejecutar recuperación de juegos al iniciar
    await recoveryService.performStartupRecovery();

    const PORT = config.getPort();
    server.listen(PORT, () => {
      logger.info(`Servidor escuchando en http://localhost:${PORT}`, "Server");
    });
  } catch (error) {
    logger.error("Error durante la inicialización del servidor:", error as string);
    process.exit(1);
  }
}

// Manejo de señales para limpieza
process.on("SIGINT", async () => {
  logger.info("Cerrando servidor...");
  socketHandler.cleanup();
  await DatabaseService.getInstance().disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Cerrando servidor...");
  socketHandler.cleanup();
  await DatabaseService.getInstance().disconnect();
  process.exit(0);
});

// Iniciar el servidor
initializeServer();
