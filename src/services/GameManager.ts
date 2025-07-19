import { GameState, GameRoom, Player, GameRound } from "../types";

export class GameManager {
  private static instance: GameManager;
  private gameStates: Map<string, GameState> = new Map();
  private readonly ROUND_TIMER = 30000; // 30 segundos
  private readonly POINTS_PER_WIN = 10;

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public createGame(code: string): GameRoom {
    const room: GameRoom = {
      id: code,
      code,
      players: [],
      currentRound: 0,
      isActive: false,
      createdAt: new Date(),
    };

    const gameState: GameState = {
      room,
      rounds: [],
      confirmations: new Set(),
    };

    this.gameStates.set(code, gameState);
    return room;
  }

  public getGameState(code: string): GameState | undefined {
    return this.gameStates.get(code);
  }

  public addPlayer(code: string, player: Player): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    // Verificar si el jugador ya existe
    const existingPlayerIndex = gameState.room.players.findIndex(
      (p) => p.socketId === player.socketId
    );
    if (existingPlayerIndex !== -1) {
      gameState.room.players[existingPlayerIndex] = player;
    } else {
      gameState.room.players.push(player);
    }

    return true;
  }

  public removePlayer(code: string, socketId: string): Player | undefined {
    const gameState = this.gameStates.get(code);
    if (!gameState) return undefined;

    const playerIndex = gameState.room.players.findIndex(
      (p) => p.socketId === socketId
    );
    if (playerIndex === -1) return undefined;

    const removedPlayer = gameState.room.players.splice(playerIndex, 1)[0];

    // Si no quedan jugadores, eliminar la partida
    if (gameState.room.players.length === 0) {
      this.gameStates.delete(code);
    }

    return removedPlayer;
  }

  public startGame(code: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState || gameState.room.players.length < 2) return false;

    gameState.room.isActive = true;
    gameState.room.currentRound = 1;
    return true;
  }

  public startNextRound(code: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    gameState.room.currentRound++;
    gameState.confirmations.clear();
    return true;
  }

  public addConfirmation(code: string, username: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    gameState.confirmations.add(username);
    return true;
  }

  public getAllConfirmations(code: string): string[] {
    const gameState = this.gameStates.get(code);
    if (!gameState) return [];

    return Array.from(gameState.confirmations);
  }

  public isAllConfirmed(code: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    return gameState.confirmations.size >= gameState.room.players.length;
  }

  public createRound(code: string, letter: string): GameRound {
    const gameState = this.gameStates.get(code);
    if (!gameState) throw new Error("Game not found");

    const round: GameRound = {
      roundNumber: gameState.room.currentRound,
      letter,
      answers: {},
      startTime: new Date(),
    };

    gameState.rounds.push(round);
    return round;
  }

  public addRoundAnswer(
    code: string,
    username: string,
    answers: Record<string, string>
  ): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    const currentRound = gameState.rounds[gameState.rounds.length - 1];
    if (!currentRound) return false;

    currentRound.answers[username] = answers;

    // Sumar puntos al jugador
    const player = gameState.room.players.find((p) => p.username === username);
    if (player) {
      player.score += this.POINTS_PER_WIN;
    }

    return true;
  }

  public getCurrentRound(code: string): GameRound | undefined {
    const gameState = this.gameStates.get(code);
    if (!gameState || gameState.rounds.length === 0) return undefined;

    return gameState.rounds[gameState.rounds.length - 1];
  }

  public getScores(code: string): Record<string, number> {
    const gameState = this.gameStates.get(code);
    if (!gameState) return {};

    const scores: Record<string, number> = {};
    gameState.room.players.forEach((player) => {
      scores[player.username] = player.score;
    });

    return scores;
  }

  public setTimer(code: string, timer: NodeJS.Timeout): void {
    const gameState = this.gameStates.get(code);
    if (!gameState) return;

    // Limpiar timer existente
    if (gameState.timer) {
      clearTimeout(gameState.timer);
    }

    gameState.timer = timer;
  }

  public clearTimer(code: string): void {
    const gameState = this.gameStates.get(code);
    if (!gameState || !gameState.timer) return;

    clearTimeout(gameState.timer);
    gameState.timer = undefined;
  }

  public getRoundTimer(): number {
    return this.ROUND_TIMER;
  }

  public getAllGames(): GameRoom[] {
    return Array.from(this.gameStates.values()).map((state) => state.room);
  }

  public cleanup(): void {
    this.gameStates.forEach((state, code) => {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    });
    this.gameStates.clear();
  }
}
