import { GameManager } from "./GameManager";
import { GamePersistenceService } from "./GamePersistenceService";
import { DatabaseService } from "./DatabaseService";

export class GameRecoveryService {
  private static instance: GameRecoveryService;
  private gameManager: GameManager;
  private persistenceService: GamePersistenceService;
  private databaseService: DatabaseService;

  private constructor() {
    this.gameManager = GameManager.getInstance();
    this.persistenceService = GamePersistenceService.getInstance();
    this.databaseService = DatabaseService.getInstance();
  }

  public static getInstance(): GameRecoveryService {
    if (!GameRecoveryService.instance) {
      GameRecoveryService.instance = new GameRecoveryService();
    }
    return GameRecoveryService.instance;
  }

  /**
   * Recupera todos los juegos activos al iniciar el servidor
   */
  public async recoverActiveGames(): Promise<void> {
    try {
      console.log("🔄 Iniciando recuperación de juegos activos...");

      // Obtener todos los juegos activos de la base de datos
      const activeGames = await this.databaseService.getActiveGames();

      if (activeGames.length === 0) {
        console.log("✅ No hay juegos activos para recuperar");
        return;
      }

      console.log(`📊 Encontrados ${activeGames.length} juegos activos`);

      let recoveredCount = 0;
      let failedCount = 0;

      for (const game of activeGames) {
        try {
          const recovered = await this.recoverGame(game.code);
          if (recovered) {
            recoveredCount++;
            console.log(`✅ Juego ${game.code} recuperado exitosamente`);
          } else {
            failedCount++;
            console.log(`❌ No se pudo recuperar el juego ${game.code}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`❌ Error recuperando juego ${game.code}:`, error);
        }
      }

      console.log(`📈 Recuperación completada: ${recoveredCount} exitosos, ${failedCount} fallidos`);
    } catch (error) {
      console.error("❌ Error en recuperación de juegos:", error);
    }
  }

  /**
   * Recupera un juego específico
   */
  public async recoverGame(code: string): Promise<boolean> {
    try {
      // Verificar si hay datos de persistencia
      const hasData = await this.persistenceService.hasPersistenceData(code);
      if (!hasData) {
        console.log(`⚠️ No hay datos de persistencia para el juego ${code}`);
        return false;
      }

      // Intentar restaurar desde snapshot
      const restored = await this.gameManager.restoreGame(code);
      if (!restored) {
        console.log(`⚠️ No se pudo restaurar el juego ${code} desde snapshot`);
        return false;
      }

      // Verificar que el juego se restauró correctamente
      const gameState = this.gameManager.getGameState(code);
      if (!gameState) {
        console.log(`⚠️ El juego ${code} no está en memoria después de la restauración`);
        return false;
      }

      // Si el juego estaba activo, reiniciar auto-snapshots
      if (gameState.room.isActive) {
        this.persistenceService.startAutoSnapshot(code);
        console.log(`🔄 Auto-snapshots reiniciados para el juego ${code}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error recuperando juego ${code}:`, error);
      return false;
    }
  }

  /**
   * Verifica la integridad de los datos de persistencia
   */
  public async verifyPersistenceIntegrity(): Promise<void> {
    try {
      console.log("🔍 Verificando integridad de datos de persistencia...");

      const activeGames = await this.databaseService.getActiveGames();
      let integrityIssues = 0;

      for (const game of activeGames) {
        const hasData = await this.persistenceService.hasPersistenceData(game.code);
        const latestSnapshot = await this.persistenceService.getLatestSnapshot(game.code);
        const events = await this.persistenceService.getGameEvents(game.code);

        if (!hasData) {
          console.log(`⚠️ Juego ${game.code}: Sin datos de persistencia`);
          integrityIssues++;
        } else {
          console.log(`✅ Juego ${game.code}: ${events.length} eventos, ${latestSnapshot ? "1" : "0"} snapshots`);
        }
      }

      if (integrityIssues === 0) {
        console.log("✅ Integridad de persistencia verificada correctamente");
      } else {
        console.log(`⚠️ Se encontraron ${integrityIssues} problemas de integridad`);
      }
    } catch (error) {
      console.error("❌ Error verificando integridad:", error);
    }
  }

  /**
   * Limpia datos de persistencia de juegos finalizados
   */
  public async cleanupFinishedGames(): Promise<void> {
    try {
      console.log("🧹 Limpiando datos de persistencia de juegos finalizados...");

      const finishedGames = await this.databaseService.getPrismaClient().game.findMany({
        where: {
          status: "FINISHED",
          finishedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Juegos terminados hace más de 24 horas
          },
        },
        select: { id: true, code: true },
      });

      let cleanedCount = 0;

      for (const game of finishedGames) {
        try {
          // Limpiar snapshots antiguos (mantener solo los últimos 2)
          await this.persistenceService.cleanupOldSnapshots(game.code, 2);
          cleanedCount++;
          console.log(`🧹 Datos limpiados para el juego ${game.code}`);
        } catch (error) {
          console.error(`❌ Error limpiando datos del juego ${game.code}:`, error);
        }
      }

      console.log(`✅ Limpieza completada: ${cleanedCount} juegos procesados`);
    } catch (error) {
      console.error("❌ Error en limpieza de juegos finalizados:", error);
    }
  }

  /**
   * Ejecuta todas las tareas de recuperación al iniciar el servidor
   */
  public async performStartupRecovery(): Promise<void> {
    console.log("🚀 Iniciando proceso de recuperación del servidor...");

    // Verificar integridad
    await this.verifyPersistenceIntegrity();

    // Limpiar juegos finalizados
    await this.cleanupFinishedGames();

    // Recuperar juegos activos
    await this.recoverActiveGames();

    console.log("✅ Proceso de recuperación completado");
  }
}
