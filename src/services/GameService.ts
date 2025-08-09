import { Server } from "socket.io";
import { Player } from "../types";
import { Logger } from "../utils/Logger";
import { GameManager } from "./GameManager";
import { DatabaseService } from "./DatabaseService";

export class GameService {
  private gameManager: GameManager;
  private databaseService: DatabaseService;
  private io: Server;
  private logger: Logger;

  constructor(io: Server) {
    this.gameManager = GameManager.getInstance();
    this.databaseService = DatabaseService.getInstance();
    this.io = io;
    this.logger = Logger.getInstance();
  }

  private generateRandomLetter(): string {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters[Math.floor(Math.random() * letters.length)];
  }

  public async joinGame(gameCode: string, username: string, socketId: string): Promise<boolean> {
    console.log(`🎯 GameService.joinGame iniciado: ${gameCode}, ${username}, ${socketId}`);

    // Check if the player is already in another game
    const playerInOtherGame = this.gameManager.findPlayerInAllGames(username);
    let playerRemovedFromOtherGame = false;

    if (playerInOtherGame && playerInOtherGame.gameCode !== gameCode) {
      // Remove player from the other game
      this.gameManager.removePlayer(playerInOtherGame.gameCode, playerInOtherGame.player.socketId);
      console.log(`🔄 Jugador ${username} removido del juego ${playerInOtherGame.gameCode} para unirse a ${gameCode}`);
      playerRemovedFromOtherGame = true;

      // Get updated game state after removal
      const otherGameState = this.gameManager.getGameState(playerInOtherGame.gameCode);
      if (otherGameState) {
        // Notify players in the other game about the player leaving
        this.io.to(playerInOtherGame.gameCode).emit("player_list", otherGameState.room.players);
        this.io.to(playerInOtherGame.gameCode).emit("player_left", {
          username,
          message: `${username} se unió a otro juego`,
        });
      }
    }

    // Create the game if it doesn't exist
    if (!this.gameManager.getGameState(gameCode)) {
      this.gameManager.createGame(gameCode);
      console.log(`Juego creado en sistema de sockets: ${gameCode}`);
    }

    // Get the current game state
    const gameState = this.gameManager.getGameState(gameCode);
    if (!gameState) {
      console.error(`No se pudo obtener el estado del juego ${gameCode}`);
      return false;
    }

    // Check if the player already exists in the current game
    const existingPlayer = gameState.room.players.find((p) => p.username === username);

    if (existingPlayer) {
      // Update the existing player's socketId
      existingPlayer.socketId = socketId;
      console.log(`Jugador ${username} ya existe en este juego, actualizando socketId a: ${socketId}`);
    } else {
      // Add the current player to the socket system
      const newPlayer = {
        id: socketId,
        username,
        socketId,
        score: 0,
      };

      this.gameManager.addPlayer(gameCode, newPlayer);
      console.log(`Jugador ${username} agregado al juego ${gameCode}`);
    }

    // Emit the updated list of players
    console.log(`📤 Emitiendo player_list con ${gameState.room.players.length} jugadores`);
    console.log(
      `📋 Jugadores a emitir:`,
      gameState.room.players.map((p) => ({
        username: p.username,
        socketId: p.socketId,
      }))
    );
    console.log(`🎯 Sala: ${gameCode}`);
    console.log(`🔌 Socket.io disponible:`, !!this.io);
    console.log(`🔌 Socket.io rooms:`, this.io.sockets.adapter.rooms);

    // Small delay to ensure the socket is in the room
    setTimeout(() => {
      this.io.to(gameCode).emit("player_list", gameState.room.players);
      console.log(`✅ Evento player_list emitido a la sala ${gameCode}`);

      // Test event to verify communication
      this.io.to(gameCode).emit("test_event", {
        message: "Test desde backend",
        players: gameState.room.players.length,
      });
      console.log(`🧪 Evento de prueba emitido a la sala ${gameCode}`);
    }, 200);

    return true;
  }

  public startGame(gameCode: string, username: string): void {
    this.logger.logPlayerAction(gameCode, username, "start_game");

    // The host confirms automatically
    this.gameManager.addConfirmation(gameCode, username);

    // Ensure game is marked as started with round counter at 1
    this.gameManager.startGame(gameCode);

    // Start immediately when the host starts manually
    const letter = this.generateRandomLetter();
    const round = this.gameManager.createRound(gameCode, letter);

    this.io.to(gameCode).emit("game_started", {
      letter,
      autoStarted: false,
      roundNumber: round.roundNumber,
      isNewRound: false,
    });

    // Clear confirmations
    this.gameManager.clearTimer(gameCode);
  }

  public startNextRound(gameCode: string, username: string): void {
    this.logger.logPlayerAction(gameCode, username, "start_next_round");

    // Increment the round number
    this.gameManager.startNextRound(gameCode);

    // The host confirms automatically
    this.gameManager.addConfirmation(gameCode, username);

    // Start timer and confirmation process for new round
    this.startGameWithTimer(gameCode, true);
  }

  public playerReady(gameCode: string, username: string): void {
    this.logger.logPlayerAction(gameCode, username, "player_ready");

    this.gameManager.addConfirmation(gameCode, username);

    // Notify all players who confirmed
    const confirmations = this.gameManager.getAllConfirmations(gameCode);
    this.io.to(gameCode).emit("player_confirmed", {
      username,
      confirmedPlayers: confirmations,
    });

    // Check if all players confirmed
    const gameState = this.gameManager.getGameState(gameCode);
    const isNewRound = gameState && gameState.room.currentRound && gameState.room.currentRound > 1;
    if (isNewRound === undefined) {
      return;
    }
    this.checkAllConfirmed(gameCode, isNewRound ? true : false);
  }

  public finishRound(gameCode: string, username: string, answers: Record<string, string>): void {
    this.logger.logPlayerAction(gameCode, username, "finish_round", {
      answers,
    });

    // Save answers and add points
    this.gameManager.addRoundAnswer(gameCode, username, answers);

    const scores = this.gameManager.getScores(gameCode);
    const state = this.gameManager.getGameState(gameCode);
    const currentRoundNumber = state?.room.currentRound || 1;
    const currentRound = this.gameManager.getCurrentRound(gameCode);
    const answersByPlayer: Record<string, Record<string, string>> = {};
    if (state) {
      const submittedByPlayer = (currentRound?.answers || {}) as Record<string, Record<string, string>>;
      state.room.players.forEach((p) => {
        answersByPlayer[p.username] = submittedByPlayer[p.username] || {};
      });
    }

    this.logger.logGameEvent(gameCode, "round_finished", {
      scores,
      currentRound: currentRoundNumber,
    });

    // Notify all players in the room that someone finished
    this.io.to(gameCode).emit("round_finished", {
      finishedBy: username,
      answersByPlayer,
      letter: currentRound?.letter,
      scores: scores,
      roundNumber: currentRoundNumber,
    });
  }

  public voteAnswer(gameCode: string, voterUsername: string, targetUsername: string, category: string, points: number): void {
    // Normalizar puntos
    const valid = [0, 5, 10];
    if (!valid.includes(points)) {
      points = 0;
    }

    const result = this.gameManager.addVote(gameCode, voterUsername, targetUsername, category, points);
    if (!result) return;

    // Notificar el update de puntos de ronda a todos
    const currentRound = this.gameManager.getCurrentRound(gameCode);
    this.io.to(gameCode).emit("round_points_updated", {
      roundNumber: currentRound?.roundNumber,
      roundPoints: currentRound?.roundPoints || {},
      votes: currentRound?.votes || {},
    });
  }

  public disconnectPlayer(socketId: string): void {
    // Remove the player from all rooms
    const allGames = this.gameManager.getAllGames();

    allGames.forEach((game) => {
      const removedPlayer = this.gameManager.removePlayer(game.code, socketId);
      if (removedPlayer) {
        const gameState = this.gameManager.getGameState(game.code);
        if (gameState) {
          this.io.to(game.code).emit("player_list", gameState.room.players);
        }
      }
    });
  }

  private startGameWithTimer(gameCode: string, isNewRound: boolean = false): void {
    // Clear existing timer if there is one
    this.gameManager.clearTimer(gameCode);

    // Start timer
    const timer = setTimeout(() => {
      this.logger.logGameEvent(gameCode, "timer_expired", { isNewRound });

      // If it's the first ever round, make sure the counter starts at 1
      const stateBefore = this.gameManager.getGameState(gameCode);
      if (stateBefore && stateBefore.room.currentRound === 0 && !isNewRound) {
        this.gameManager.startGame(gameCode);
      }

      const letter = this.generateRandomLetter();
      const round = this.gameManager.createRound(gameCode, letter);
      const gameState = this.gameManager.getGameState(gameCode);

      this.io.to(gameCode).emit("game_started", {
        letter,
        autoStarted: true,
        roundNumber: round.roundNumber,
        isNewRound,
      });

      // Clear confirmations
      this.gameManager.clearTimer(gameCode);
    }, this.gameManager.getRoundTimer(gameCode));

    this.gameManager.setTimer(gameCode, timer);

    // Notify all players that the game is about to start
    const gameState = this.gameManager.getGameState(gameCode);
    if (gameState) {
      this.io.to(gameCode).emit("game_ready_to_start", {
        timeLeft: this.gameManager.getRoundTimer(gameCode) / 1000,
        totalPlayers: gameState.room.players.length,
        isNewRound,
      });
    }
  }

  private checkAllConfirmed(gameCode: string, isNewRound: boolean = false): void {
    if (this.gameManager.isAllConfirmed(gameCode)) {
      this.logger.logGameEvent(gameCode, "all_confirmed", { isNewRound });

      // Clear timer
      this.gameManager.clearTimer(gameCode);

      const letter = this.generateRandomLetter();
      const round = this.gameManager.createRound(gameCode, letter);

      this.io.to(gameCode).emit("game_started", {
        letter,
        autoStarted: false,
        roundNumber: round.roundNumber,
        isNewRound,
      });
    }
  }

  public cleanup(): void {
    this.gameManager.cleanup();
  }
}
