import { Request, Response } from "express";
import { GameManager } from "../services/GameManager";
import { DatabaseService } from "../services/DatabaseService";
import { GamePersistenceService } from "../services/GamePersistenceService";

export class GameController {
  private gameManager: GameManager;
  private databaseService: DatabaseService;
  private persistenceService: GamePersistenceService;

  constructor() {
    this.gameManager = GameManager.getInstance();
    this.databaseService = DatabaseService.getInstance();
    this.persistenceService = GamePersistenceService.getInstance();
  }

  // ===== MÉTODOS EXISTENTES =====

  public async createGame(req: Request, res: Response): Promise<void> {
    try {
      const { userId, configId } = req.body;

      if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
      }

      const game = await this.databaseService.createGame(userId);
      console.log(game);
      if (!game) {
        res.status(500).json({ error: "Error creating game" });
        return;
      }

      // Crear juego con configuración específica o por defecto
      await this.gameManager.createGame(game.code, configId);

      res.status(201).json({
        success: true,
        game: {
          id: game.id,
          code: game.code,
          status: game.status,
          players: game.players,
        },
      });
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  public async joinGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, userId } = req.body;

      if (!gameId || !userId) {
        res.status(400).json({ error: "gameId y userId son requeridos" });
        return;
      }

      const game = await this.databaseService.joinGame(gameId, userId);
      console.log(game);

      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      res.status(200).json({
        id: game.id,
        code: game.code,
        status: game.status,
        players: game.players,
      });
    } catch (error) {
      console.error("Error joining game:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  public async getGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        res.status(400).json({ error: "gameId is required" });
        return;
      }

      const game = await this.databaseService.findGameById(gameId);

      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      res.status(200).json({
        success: true,
        game: {
          id: game.id,
          code: game.code,
          status: game.status,
          players: game.players,
          rounds: game.rounds,
        },
      });
    } catch (error) {
      console.error("Error getting game:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  public async getGameByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({ error: "code is required" });
        return;
      }

      const game = await this.databaseService.findGameByCode(code);

      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      res.status(200).json({
        id: game.id,
        code: game.code,
        status: game.status,
        players: game.players,
        rounds: game.rounds,
      });
    } catch (error) {
      console.error("Error getting game by code:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  public async getActiveGames(req: Request, res: Response): Promise<void> {
    try {
      const games = await this.databaseService.getActiveGames();

      res.status(200).json({
        success: true,
        games: games.map((game) => ({
          id: game.id,
          code: game.code,
          status: game.status,
          playerCount: game.players.length,
          createdAt: game.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error getting active games:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  public async getUserGames(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: "userId es requerido" });
        return;
      }

      const games = await this.databaseService.getUserGames(userId);

      res.status(200).json({
        success: true,
        games: games.map((game) => ({
          id: game.id,
          code: game.code,
          status: game.status,
          playerCount: game.players.length,
          createdAt: game.createdAt,
          players: game.players.map((player) => ({
            id: player.user.id,
            username: player.user.username,
          })),
        })),
      });
    } catch (error) {
      console.error("Error getting user games:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // ===== NUEVOS MÉTODOS DE PERSISTENCIA =====

  /**
   * Restaura un juego desde la base de datos
   */
  public async restoreGame(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({ error: "Código de juego requerido" });
        return;
      }

      // Verificar si hay datos de persistencia
      const hasData = await this.persistenceService.hasPersistenceData(code);
      if (!hasData) {
        res.status(404).json({ error: "No hay datos de persistencia para este juego" });
        return;
      }

      // Intentar restaurar el juego
      const restored = await this.gameManager.restoreGame(code);
      if (!restored) {
        res.status(500).json({ error: "Error restaurando el juego" });
        return;
      }

      const gameState = this.gameManager.getGameState(code);
      if (!gameState) {
        res.status(500).json({ error: "Error obteniendo el estado del juego restaurado" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Juego restaurado exitosamente",
        game: {
          code: gameState.room.code,
          status: gameState.room.isActive ? "PLAYING" : "WAITING",
          players: gameState.room.players,
          currentRound: gameState.room.currentRound,
          rounds: gameState.rounds,
        },
      });
    } catch (error) {
      console.error("Error restoring game:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Guarda un snapshot manual del estado actual
   */
  public async saveSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({ error: "Código de juego requerido" });
        return;
      }

      const gameState = this.gameManager.getGameState(code);
      if (!gameState) {
        res.status(404).json({ error: "Juego no encontrado en memoria" });
        return;
      }

      await this.gameManager.saveCurrentState(code);

      res.status(200).json({
        success: true,
        message: "Snapshot guardado exitosamente",
      });
    } catch (error) {
      console.error("Error saving snapshot:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Obtiene información de persistencia de un juego
   */
  public async getPersistenceInfo(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({ error: "Código de juego requerido" });
        return;
      }

      const hasData = await this.persistenceService.hasPersistenceData(code);
      const latestSnapshot = await this.persistenceService.getLatestSnapshot(code);
      const events = await this.persistenceService.getGameEvents(code);

      res.status(200).json({
        success: true,
        persistence: {
          hasData,
          snapshotCount: latestSnapshot ? 1 : 0,
          eventCount: events.length,
          latestSnapshot: latestSnapshot
            ? {
                id: latestSnapshot.id,
                roundNumber: latestSnapshot.roundNumber,
                createdAt: latestSnapshot.createdAt,
              }
            : null,
          recentEvents: events.slice(-5).map((event) => ({
            type: event.eventType,
            timestamp: event.timestamp,
          })),
        },
      });
    } catch (error) {
      console.error("Error getting persistence info:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Limpia datos de persistencia antiguos
   */
  public async cleanupPersistence(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { keepCount = 5 } = req.body;

      if (!code) {
        res.status(400).json({ error: "Código de juego requerido" });
        return;
      }

      await this.persistenceService.cleanupOldSnapshots(code, keepCount);

      res.status(200).json({
        success: true,
        message: "Datos de persistencia limpiados exitosamente",
      });
    } catch (error) {
      console.error("Error cleaning up persistence:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
