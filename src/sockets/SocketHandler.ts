import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";

export class SocketHandler {
  private io: Server;
  private gameService: GameService;

  constructor(io: Server) {
    this.io = io;
    this.gameService = new GameService(io);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Cliente conectado: ${socket.id}`);

      // Unirse a una partida
      socket.on("join_game", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        const success = this.gameService.joinGame(
          gameCode,
          username,
          socket.id
        );
        if (success) {
          socket.join(gameCode);
          socket.emit("joined_game", { gameCode, username });
        } else {
          socket.emit("error", { message: "Failed to join game" });
        }
      });

      // Iniciar juego
      socket.on("start_game", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        this.gameService.startGame(gameCode, username);
      });

      // Iniciar siguiente ronda
      socket.on("start_next_round", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        this.gameService.startNextRound(gameCode, username);
      });

      // Jugador listo
      socket.on("player_ready", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        this.gameService.playerReady(gameCode, username);
      });

      // Terminar ronda
      socket.on("tuti_fruti_finished", ({ gameCode, username, answers }) => {
        if (!gameCode || !username || !answers) {
          socket.emit("error", {
            message: "Game code, username and answers are required",
          });
          return;
        }

        this.gameService.finishRound(gameCode, username, answers);
      });

      // Desconexión
      socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        this.gameService.disconnectPlayer(socket.id);
      });

      // Eventos de error
      socket.on("error", (error) => {
        console.error("Error en socket:", error);
        socket.emit("error", { message: "Internal server error" });
      });
    });
  }

  public cleanup(): void {
    this.gameService.cleanup();
  }
}
