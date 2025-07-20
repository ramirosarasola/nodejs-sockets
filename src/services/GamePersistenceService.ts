import { DatabaseService } from "./DatabaseService";
import { GameState, GameRoom, Player, GameRound } from "../types";

export interface GameSnapshot {
  id: string;
  gameId: string;
  snapshot: GameState;
  roundNumber?: number;
  createdAt: Date;
}

export interface GameEvent {
  id: string;
  gameId: string;
  eventType: string;
  eventData: any;
  timestamp: Date;
}

export class GamePersistenceService {
  private static instance: GamePersistenceService;
  private databaseService: DatabaseService;
  private snapshotInterval: number = 30000; // 30 segundos
  private snapshotTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  public static getInstance(): GamePersistenceService {
    if (!GamePersistenceService.instance) {
      GamePersistenceService.instance = new GamePersistenceService();
    }
    return GamePersistenceService.instance;
  }

  // ===== SNAPSHOTS =====

  /**
   * Limpia el estado del juego para serialización
   */
  private cleanGameStateForSerialization(gameState: GameState): any {
    return {
      room: {
        id: gameState.room.id,
        code: gameState.room.code,
        players: gameState.room.players.map((player) => ({
          id: player.id,
          username: player.username,
          socketId: player.socketId,
          score: player.score,
        })),
        currentRound: gameState.room.currentRound,
        isActive: gameState.room.isActive,
        createdAt: gameState.room.createdAt,
      },
      rounds: gameState.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        letter: round.letter,
        answers: round.answers,
        startTime: round.startTime,
        endTime: round.endTime,
      })),
      confirmations: Array.from(gameState.confirmations),
      // No incluir timer ya que no se puede serializar
    };
  }

  /**
   * Guarda un snapshot del estado actual del juego
   */
  public async saveGameSnapshot(gameCode: string, gameState: GameState): Promise<void> {
    try {
      // Buscar el juego por código para obtener el ID
      const game = await this.databaseService.findGameByCode(gameCode);
      if (!game) {
        console.warn(`No se encontró el juego con código ${gameCode} para guardar snapshot`);
        return;
      }

      // Limpiar el estado antes de serializar
      const cleanState = this.cleanGameStateForSerialization(gameState);

      await this.databaseService.getPrismaClient().gameSnapshot.create({
        data: {
          gameId: game.id,
          snapshot: cleanState,
          roundNumber: gameState.room.currentRound,
        },
      });
      console.log(`Snapshot guardado para el juego ${gameCode}`);
    } catch (error) {
      console.error("Error guardando snapshot:", error);
      throw error;
    }
  }

  /**
   * Restaura el estado del juego desde datos serializados
   */
  private restoreGameStateFromSerialized(serializedState: any): GameState {
    return {
      room: {
        id: serializedState.room.id,
        code: serializedState.room.code,
        players: serializedState.room.players.map((player: any) => ({
          id: player.id,
          username: player.username,
          socketId: player.socketId,
          score: player.score,
        })),
        currentRound: serializedState.room.currentRound,
        isActive: serializedState.room.isActive,
        createdAt: new Date(serializedState.room.createdAt),
      },
      rounds: serializedState.rounds.map((round: any) => ({
        roundNumber: round.roundNumber,
        letter: round.letter,
        answers: round.answers,
        startTime: new Date(round.startTime),
        endTime: round.endTime ? new Date(round.endTime) : undefined,
      })),
      confirmations: new Set(serializedState.confirmations || []),
      // Timer se inicializa como undefined
    };
  }

  /**
   * Obtiene el snapshot más reciente de un juego
   */
  public async getLatestSnapshot(gameCode: string): Promise<GameSnapshot | null> {
    try {
      // Buscar el juego por código para obtener el ID
      const game = await this.databaseService.findGameByCode(gameCode);
      if (!game) {
        console.warn(`No se encontró el juego con código ${gameCode} para obtener snapshot`);
        return null;
      }

      const snapshot = await this.databaseService.getPrismaClient().gameSnapshot.findFirst({
        where: { gameId: game.id },
        orderBy: { createdAt: "desc" },
      });

      if (!snapshot) return null;

      // Restaurar el estado desde los datos serializados
      const restoredState = this.restoreGameStateFromSerialized(snapshot.snapshot);

      return {
        id: snapshot.id,
        gameId: snapshot.gameId,
        snapshot: restoredState,
        roundNumber: snapshot.roundNumber || undefined,
        createdAt: snapshot.createdAt,
      };
    } catch (error) {
      console.error("Error obteniendo snapshot:", error);
      throw error;
    }
  }

  /**
   * Restaura el estado del juego desde un snapshot
   */
  public async restoreGameFromSnapshot(gameCode: string): Promise<GameState | null> {
    try {
      const snapshot = await this.getLatestSnapshot(gameCode);
      if (!snapshot) return null;

      return snapshot.snapshot as GameState;
    } catch (error) {
      console.error("Error restaurando juego desde snapshot:", error);
      throw error;
    }
  }

  /**
   * Inicia el guardado automático de snapshots para un juego
   */
  public startAutoSnapshot(gameCode: string): void {
    // Limpiar timer existente si hay uno
    this.stopAutoSnapshot(gameCode);

    const timer = setInterval(async () => {
      try {
        // Aquí necesitaríamos acceso al GameManager para obtener el estado actual
        // Por ahora, esto es un placeholder
        console.log(`Auto-snapshot programado para el juego ${gameCode}`);
      } catch (error) {
        console.error("Error en auto-snapshot:", error);
      }
    }, this.snapshotInterval);

    this.snapshotTimers.set(gameCode, timer);
  }

  /**
   * Detiene el guardado automático de snapshots para un juego
   */
  public stopAutoSnapshot(gameCode: string): void {
    const timer = this.snapshotTimers.get(gameCode);
    if (timer) {
      clearInterval(timer);
      this.snapshotTimers.delete(gameCode);
    }
  }

  // ===== EVENTOS =====

  /**
   * Registra un evento del juego
   */
  public async logGameEvent(gameCode: string, eventType: string, eventData: any): Promise<void> {
    try {
      // Buscar el juego por código para obtener el ID
      const game = await this.databaseService.findGameByCode(gameCode);
      if (!game) {
        console.warn(`No se encontró el juego con código ${gameCode} para registrar evento`);
        return;
      }

      await this.databaseService.getPrismaClient().gameEvent.create({
        data: {
          gameId: game.id,
          eventType,
          eventData: eventData as any,
        },
      });
    } catch (error) {
      console.error("Error registrando evento:", error);
      throw error;
    }
  }

  /**
   * Obtiene todos los eventos de un juego
   */
  public async getGameEvents(gameCode: string): Promise<GameEvent[]> {
    try {
      // Buscar el juego por código para obtener el ID
      const game = await this.databaseService.findGameByCode(gameCode);
      if (!game) {
        console.warn(`No se encontró el juego con código ${gameCode} para obtener eventos`);
        return [];
      }

      return await this.databaseService.getPrismaClient().gameEvent.findMany({
        where: { gameId: game.id },
        orderBy: { timestamp: "asc" },
      });
    } catch (error) {
      console.error("Error obteniendo eventos:", error);
      throw error;
    }
  }

  /**
   * Reconstruye el estado del juego desde eventos
   */
  public async reconstructGameState(gameCode: string): Promise<GameState | null> {
    try {
      const events = await this.getGameEvents(gameCode);
      if (events.length === 0) return null;

      // Implementar lógica de reconstrucción basada en eventos
      // Por ahora retornamos null
      return null;
    } catch (error) {
      console.error("Error reconstruyendo estado desde eventos:", error);
      throw error;
    }
  }

  // ===== PERSISTENCIA INTELIGENTE =====

  /**
   * Guarda un snapshot en milestones importantes
   */
  public async saveMilestoneSnapshot(gameCode: string, gameState: GameState, milestone: string): Promise<void> {
    try {
      await this.saveGameSnapshot(gameCode, gameState);
      await this.logGameEvent(gameCode, "MILESTONE_SNAPSHOT", { milestone });
      console.log(`Milestone snapshot guardado: ${milestone} para el juego ${gameCode}`);
    } catch (error) {
      console.error("Error guardando milestone snapshot:", error);
      throw error;
    }
  }

  /**
   * Limpia snapshots antiguos (mantiene solo los últimos N)
   */
  public async cleanupOldSnapshots(gameCode: string, keepCount: number = 5): Promise<void> {
    try {
      // Buscar el juego por código para obtener el ID
      const game = await this.databaseService.findGameByCode(gameCode);
      if (!game) {
        console.warn(`No se encontró el juego con código ${gameCode} para limpiar snapshots`);
        return;
      }

      const snapshots = await this.databaseService.getPrismaClient().gameSnapshot.findMany({
        where: { gameId: game.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (snapshots.length > keepCount) {
        const toDelete = snapshots.slice(keepCount);
        const idsToDelete = toDelete.map((s: any) => s.id);

        await this.databaseService.getPrismaClient().gameSnapshot.deleteMany({
          where: { id: { in: idsToDelete } },
        });

        console.log(`Eliminados ${toDelete.length} snapshots antiguos del juego ${gameCode}`);
      }
    } catch (error) {
      console.error("Error limpiando snapshots antiguos:", error);
      throw error;
    }
  }

  // ===== UTILIDADES =====

  /**
   * Verifica si un juego tiene datos de persistencia
   */
  public async hasPersistenceData(gameCode: string): Promise<boolean> {
    try {
      // Buscar el juego por código para obtener el ID
      const game = await this.databaseService.findGameByCode(gameCode);
      if (!game) {
        return false;
      }

      const snapshotCount = await this.databaseService.getPrismaClient().gameSnapshot.count({
        where: { gameId: game.id },
      });
      const eventCount = await this.databaseService.getPrismaClient().gameEvent.count({
        where: { gameId: game.id },
      });

      return snapshotCount > 0 || eventCount > 0;
    } catch (error) {
      console.error("Error verificando datos de persistencia:", error);
      return false;
    }
  }

  /**
   * Limpia todos los timers al cerrar
   */
  public cleanup(): void {
    this.snapshotTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.snapshotTimers.clear();
  }
}
