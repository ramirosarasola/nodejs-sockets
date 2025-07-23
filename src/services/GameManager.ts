import { GameState, GameRoom, Player, GameRound, GameConfig } from "../types";
import { GamePersistenceService } from "./GamePersistenceService";
import { GameConfigService } from "./GameConfigService";

export class GameManager {
  private static instance: GameManager;
  private gameStates: Map<string, GameState> = new Map();
  private gameConfigs: Map<string, GameConfig> = new Map(); // Configuración por juego
  private persistenceService: GamePersistenceService;
  private configService: GameConfigService;

  /**
   * Asegura que confirmations sea un Set válido
   */
  private ensureConfirmationsIsSet(gameState: GameState): void {
    if (!(gameState.confirmations instanceof Set)) {
      gameState.confirmations = new Set(gameState.confirmations || []);
    }
  }

  private constructor() {
    this.persistenceService = GamePersistenceService.getInstance();
    this.configService = GameConfigService.getInstance();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public async createGame(code: string, configId?: string): Promise<GameRoom> {
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

    // Obtener configuración por defecto si no se especifica
    let config: GameConfig;
    if (configId) {
      const settings = await this.configService.getSettingsById(configId);
      config = settings?.config || (await this.getDefaultConfig());
    } else {
      config = await this.getDefaultConfig();
    }

    this.gameConfigs.set(code, config);

    // Log del evento de creación
    this.persistenceService.logGameEvent(code, "GAME_CREATED", { room, config });

    return room;
  }

  /**
   * Obtiene la configuración por defecto
   */
  private async getDefaultConfig(): Promise<GameConfig> {
    const defaultSettings = await this.configService.getDefaultSettings();
    return (
      defaultSettings?.config || {
        maxRounds: 5,
        roundTimeSeconds: 60,
        autoStartDelay: 10,
        minPlayers: 2,
        maxPlayers: 8,
        categories: ["name", "country", "animal", "thing"],
        pointsPerWin: 10,
        pointsPerUniqueAnswer: 5,
      }
    );
  }

  /**
   * Obtiene la configuración de un juego específico
   */
  public getGameConfig(code: string): GameConfig | undefined {
    return this.gameConfigs.get(code);
  }

  public getGameState(code: string): GameState | undefined {
    return this.gameStates.get(code);
  }

  public addPlayer(code: string, player: Player): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    // We validate the player by socket or by user id
    const existingPlayerIndex = gameState.room.players.findIndex((p) => p.socketId === player.socketId || p.id === player.id);
    if (existingPlayerIndex !== -1) {
      gameState.room.players[existingPlayerIndex] = player;
    } else {
      gameState.room.players.push(player);
    }

    // Log del evento de jugador agregado
    this.persistenceService.logGameEvent(code, "PLAYER_JOINED", { player });

    // Guardar snapshot en milestone
    this.persistenceService.saveMilestoneSnapshot(code, gameState, "PLAYER_JOINED");

    return true;
  }

  public removePlayer(code: string, socketId: string): Player | undefined {
    const gameState = this.gameStates.get(code);
    if (!gameState) return undefined;

    const playerIndex = gameState.room.players.findIndex((p) => p.socketId === socketId);
    if (playerIndex === -1) return undefined;

    const removedPlayer = gameState.room.players.splice(playerIndex, 1)[0];

    // Log del evento de jugador removido
    this.persistenceService.logGameEvent(code, "PLAYER_LEFT", { player: removedPlayer });

    // Si no quedan jugadores, eliminar la partida
    if (gameState.room.players.length === 0) {
      this.gameStates.delete(code);
      this.persistenceService.stopAutoSnapshot(code);
      this.persistenceService.logGameEvent(code, "GAME_EMPTY", {});
    } else {
      // Guardar snapshot en milestone
      this.persistenceService.saveMilestoneSnapshot(code, gameState, "PLAYER_LEFT");
    }

    return removedPlayer;
  }

  public startGame(code: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState || gameState.room.players.length < 2) return false;

    gameState.room.isActive = true;
    gameState.room.currentRound = 1;

    // Log del evento de inicio de juego
    this.persistenceService.logGameEvent(code, "GAME_STARTED", {
      playerCount: gameState.room.players.length,
    });

    // Guardar snapshot en milestone e iniciar auto-snapshots
    this.persistenceService.saveMilestoneSnapshot(code, gameState, "GAME_STARTED");
    this.persistenceService.startAutoSnapshot(code);

    return true;
  }

  public startNextRound(code: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    gameState.room.currentRound++;
    gameState.confirmations.clear();

    // Log del evento de nueva ronda
    this.persistenceService.logGameEvent(code, "ROUND_STARTED", {
      roundNumber: gameState.room.currentRound,
    });

    // Guardar snapshot en milestone
    this.persistenceService.saveMilestoneSnapshot(code, gameState, "ROUND_STARTED");

    return true;
  }

  public addConfirmation(code: string, username: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    this.ensureConfirmationsIsSet(gameState);
    gameState.confirmations.add(username);

    // Log del evento de confirmación
    this.persistenceService.logGameEvent(code, "PLAYER_CONFIRMED", { username });

    return true;
  }

  public getAllConfirmations(code: string): string[] {
    const gameState = this.gameStates.get(code);
    if (!gameState) return [];

    this.ensureConfirmationsIsSet(gameState);
    return Array.from(gameState.confirmations);
  }

  public isAllConfirmed(code: string): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    this.ensureConfirmationsIsSet(gameState);
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

    // Log del evento de ronda creada
    this.persistenceService.logGameEvent(code, "ROUND_CREATED", {
      roundNumber: round.roundNumber,
      letter: round.letter,
    });

    return round;
  }

  public addRoundAnswer(code: string, username: string, answers: Record<string, string>): boolean {
    const gameState = this.gameStates.get(code);
    if (!gameState) return false;

    const currentRound = gameState.rounds[gameState.rounds.length - 1];
    if (!currentRound) return false;

    currentRound.answers[username] = answers;

    // Add points to the player based on configuration
    const config = this.getGameConfig(code);
    const pointsPerWin = config?.pointsPerWin || 10;

    const player = gameState.room.players.find((p) => p.username === username);
    if (player) {
      player.score += pointsPerWin;
    }

    // Log del evento de respuesta
    this.persistenceService.logGameEvent(code, "ANSWER_SUBMITTED", {
      username,
      roundNumber: currentRound.roundNumber,
      score: pointsPerWin,
    });

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

  public getRoundTimer(code: string): number {
    const config = this.getGameConfig(code);
    return (config?.roundTimeSeconds || 60) * 1000; // Convertir a milisegundos
  }

  public getAllGames(): GameRoom[] {
    return Array.from(this.gameStates.values()).map((state) => state.room);
  }

  /**
   * Busca un jugador por username en todos los juegos
   * @param username Nombre del jugador a buscar
   * @returns Objeto con el juego y el jugador encontrado, o null si no se encuentra
   */
  public findPlayerInAllGames(username: string): { gameCode: string; player: Player } | null {
    for (const [gameCode, gameState] of this.gameStates) {
      const player = gameState.room.players.find((p) => p.username === username);
      if (player) {
        return { gameCode, player };
      }
    }
    return null;
  }

  // ===== MÉTODOS DE PERSISTENCIA =====

  /**
   * Restaura un juego desde la base de datos
   */
  public async restoreGame(code: string): Promise<boolean> {
    try {
      const snapshot = await this.persistenceService.getLatestSnapshot(code);
      if (!snapshot) return false;

      this.gameStates.set(code, snapshot.snapshot);
      console.log(`Juego ${code} restaurado desde snapshot`);
      return true;
    } catch (error) {
      console.error("Error restaurando juego:", error);
      return false;
    }
  }

  /**
   * Guarda un snapshot manual del estado actual
   */
  public async saveCurrentState(code: string): Promise<void> {
    const gameState = this.gameStates.get(code);
    if (!gameState) return;

    await this.persistenceService.saveGameSnapshot(code, gameState);
  }

  /**
   * Verifica si un juego tiene datos de persistencia
   */
  public async hasPersistenceData(code: string): Promise<boolean> {
    return await this.persistenceService.hasPersistenceData(code);
  }

  public cleanup(): void {
    this.gameStates.forEach((state, code) => {
      if (state.timer) {
        clearTimeout(state.timer);
      }
      this.persistenceService.stopAutoSnapshot(code);
    });
    this.gameStates.clear();
    this.persistenceService.cleanup();
  }
}
