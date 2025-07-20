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
      console.log(`🔌 Client connected: ${socket.id}`);

      // Join a game
      socket.on("join_game", async ({ gameCode, username }) => {
        if (!gameCode || !username) {
          console.log(`❌ Invalid data: gameCode=${gameCode}, username=${username}`);
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        console.log(`🎮 Socket ${socket.id} trying to join game ${gameCode} as ${username}`);

        const success = await this.gameService.joinGame(gameCode, username, socket.id);
        if (success) {
          socket.join(gameCode);
          console.log(`✅ Socket ${socket.id} joined successfully to the room ${gameCode}`);

          // Small delay to ensure the socket is in the room
          setTimeout(() => {
            socket.emit("joined_game", { gameCode, username });
            console.log(`✅ Event joined_game emitted to ${socket.id}`);
          }, 100);
        } else {
          console.error(`❌ Socket ${socket.id} failed to join game ${gameCode}`);
          socket.emit("error", { message: "Failed to join game" });
        }
      });

      // Start game
      socket.on("start_game", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        this.gameService.startGame(gameCode, username);
      });

      // Start next round
      socket.on("start_next_round", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        this.gameService.startNextRound(gameCode, username);
      });

      // Player ready
      socket.on("player_ready", ({ gameCode, username }) => {
        if (!gameCode || !username) {
          socket.emit("error", {
            message: "Game code and username are required",
          });
          return;
        }

        this.gameService.playerReady(gameCode, username);
      });

      // Finish round
      socket.on("tuti_fruti_finished", ({ gameCode, username, answers }) => {
        if (!gameCode || !username || !answers) {
          socket.emit("error", {
            message: "Game code, username and answers are required",
          });
          return;
        }

        this.gameService.finishRound(gameCode, username, answers);
      });

      // Disconnect
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.gameService.disconnectPlayer(socket.id);
      });

      // Error events
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
