import { Server } from "socket.io";
import { Player } from "../types";
import { Logger } from "../utils/Logger";
import { GameManager } from "./GameManager";

export class GameService {
  private gameManager: GameManager;
  private io: Server;
  private logger: Logger;

  constructor(io: Server) {
    this.gameManager = GameManager.getInstance();
    this.io = io;
    this.logger = Logger.getInstance();
  }

  private generateRandomLetter(): string {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters[Math.floor(Math.random() * letters.length)];
  }

  public joinGame(
    gameCode: string,
    username: string,
    socketId: string
  ): boolean {
    // Crear la partida si no existe
    if (!this.gameManager.getGameState(gameCode)) {
      this.gameManager.createGame(gameCode);
    }

    const player: Player = {
      id: socketId,
      username,
      socketId,
      score: 0,
    };

    const success = this.gameManager.addPlayer(gameCode, player);

    if (success) {
      const gameState = this.gameManager.getGameState(gameCode);
      if (gameState) {
        this.io.to(gameCode).emit("player_list", gameState.room.players);
      }
    }

    return success;
  }

  public startGame(gameCode: string, username: string): void {
    this.logger.logPlayerAction(gameCode, username, "start_game");

    // El host confirma automáticamente
    this.gameManager.addConfirmation(gameCode, username);

    // Iniciar timer y proceso de confirmación
    this.startGameWithTimer(gameCode, false);
  }

  public startNextRound(gameCode: string, username: string): void {
    this.logger.logPlayerAction(gameCode, username, "start_next_round");

    // Incrementar número de ronda
    this.gameManager.startNextRound(gameCode);

    // El host confirma automáticamente
    this.gameManager.addConfirmation(gameCode, username);

    // Iniciar timer y proceso de confirmación para nueva ronda
    this.startGameWithTimer(gameCode, true);
  }

  public playerReady(gameCode: string, username: string): void {
    this.logger.logPlayerAction(gameCode, username, "player_ready");

    this.gameManager.addConfirmation(gameCode, username);

    // Notificar a todos quién confirmó
    const confirmations = this.gameManager.getAllConfirmations(gameCode);
    this.io.to(gameCode).emit("player_confirmed", {
      username,
      confirmedPlayers: confirmations,
    });

    // Verificar si todos confirmaron
    const gameState = this.gameManager.getGameState(gameCode);
    const isNewRound =
      gameState &&
      gameState.room.currentRound &&
      gameState.room.currentRound > 1;
    if (isNewRound === undefined) {
      return;
    }
    this.checkAllConfirmed(gameCode, isNewRound ? true : false);
  }

  public finishRound(
    gameCode: string,
    username: string,
    answers: Record<string, string>
  ): void {
    this.logger.logPlayerAction(gameCode, username, "finish_round", {
      answers,
    });

    // Guardar respuestas y sumar puntos
    this.gameManager.addRoundAnswer(gameCode, username, answers);

    const scores = this.gameManager.getScores(gameCode);
    const currentRound =
      this.gameManager.getGameState(gameCode)?.room.currentRound || 1;

    this.logger.logGameEvent(gameCode, "round_finished", {
      scores,
      currentRound,
    });

    // Notificar a todos en la sala que alguien terminó
    this.io.to(gameCode).emit("round_finished", {
      finishedBy: username,
      answers: answers,
      scores: scores,
      roundNumber: currentRound,
    });
  }

  public disconnectPlayer(socketId: string): void {
    // Eliminar al jugador de todas las salas
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

  private startGameWithTimer(
    gameCode: string,
    isNewRound: boolean = false
  ): void {
    // Limpiar timer existente si hay uno
    this.gameManager.clearTimer(gameCode);

    // Iniciar timer
    const timer = setTimeout(() => {
      this.logger.logGameEvent(gameCode, "timer_expired", { isNewRound });

      const letter = this.generateRandomLetter();
      const round = this.gameManager.createRound(gameCode, letter);
      const gameState = this.gameManager.getGameState(gameCode);

      this.io.to(gameCode).emit("game_started", {
        letter,
        autoStarted: true,
        roundNumber: round.roundNumber,
        isNewRound,
      });

      // Limpiar confirmaciones
      this.gameManager.clearTimer(gameCode);
    }, this.gameManager.getRoundTimer());

    this.gameManager.setTimer(gameCode, timer);

    // Notificar a todos que el juego está por comenzar
    const gameState = this.gameManager.getGameState(gameCode);
    if (gameState) {
      this.io.to(gameCode).emit("game_ready_to_start", {
        timeLeft: this.gameManager.getRoundTimer() / 1000,
        totalPlayers: gameState.room.players.length,
        isNewRound,
      });
    }
  }

  private checkAllConfirmed(
    gameCode: string,
    isNewRound: boolean = false
  ): void {
    if (this.gameManager.isAllConfirmed(gameCode)) {
      this.logger.logGameEvent(gameCode, "all_confirmed", { isNewRound });

      // Limpiar timer
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
