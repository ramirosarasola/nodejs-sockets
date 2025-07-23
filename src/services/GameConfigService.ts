import { DatabaseService } from "./DatabaseService";
import type { GameConfig, GameSettings } from "../types";

export class GameConfigService {
  private static instance: GameConfigService;
  private databaseService: DatabaseService;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  public static getInstance(): GameConfigService {
    if (!GameConfigService.instance) {
      GameConfigService.instance = new GameConfigService();
    }
    return GameConfigService.instance;
  }

  /**
   * Helper para convertir config de Prisma a GameConfig
   */
  private parseConfig(config: any): GameConfig {
    if (!config) {
      return {
        maxRounds: 5,
        roundTimeSeconds: 60,
        autoStartDelay: 10,
        minPlayers: 2,
        maxPlayers: 8,
        categories: ["name", "country", "animal", "thing"],
        pointsPerWin: 10,
        pointsPerUniqueAnswer: 5,
      };
    }
    return config as GameConfig;
  }

  /**
   * Helper para convertir GameConfig a formato de Prisma
   */
  private serializeConfig(config: GameConfig): any {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Configuración por defecto para partidas estándar
   */
  private getDefaultConfig(): GameConfig {
    return {
      maxRounds: 5,
      roundTimeSeconds: 60,
      autoStartDelay: 10,
      minPlayers: 2,
      maxPlayers: 8,
      categories: ["name", "country", "animal", "thing"],
      pointsPerWin: 10,
      pointsPerUniqueAnswer: 5,
    };
  }

  /**
   * Configuración para partidas rápidas
   */
  private getQuickConfig(): GameConfig {
    return {
      maxRounds: 3,
      roundTimeSeconds: 30,
      autoStartDelay: 5,
      minPlayers: 2,
      maxPlayers: 6,
      categories: ["name", "country", "animal"],
      pointsPerWin: 15,
      pointsPerUniqueAnswer: 10,
    };
  }

  /**
   * Configuración para partidas largas
   */
  private getLongConfig(): GameConfig {
    return {
      maxRounds: 10,
      roundTimeSeconds: 90,
      autoStartDelay: 15,
      minPlayers: 3,
      maxPlayers: 10,
      categories: ["name", "country", "animal", "thing", "food", "color"],
      pointsPerWin: 8,
      pointsPerUniqueAnswer: 3,
    };
  }

  /**
   * Inicializa las configuraciones por defecto en la base de datos
   */
  public async initializeDefaultSettings(): Promise<void> {
    try {
      const prisma = this.databaseService.getPrismaClient();

      // Verificar si ya existen configuraciones
      const existingSettings = await prisma.gameSettings.findMany();
      if (existingSettings.length > 0) {
        console.log("Configuraciones ya inicializadas");
        return;
      }

      // Crear configuraciones por defecto
      const settings = [
        {
          name: "Estándar",
          description: "Partida clásica de 5 rondas con 60 segundos por ronda",
          config: this.getDefaultConfig(),
          isDefault: true,
        },
        {
          name: "Rápida",
          description: "Partida rápida de 3 rondas con 30 segundos por ronda",
          config: this.getQuickConfig(),
          isDefault: false,
        },
        {
          name: "Larga",
          description: "Partida extendida de 10 rondas con 90 segundos por ronda",
          config: this.getLongConfig(),
          isDefault: false,
        },
      ];

      for (const setting of settings) {
        await prisma.gameSettings.create({
          data: {
            name: setting.name,
            description: setting.description,
            config: this.serializeConfig(setting.config),
            isDefault: setting.isDefault,
          },
        });
      }

      console.log("Configuraciones por defecto inicializadas");
    } catch (error) {
      console.error("Error inicializando configuraciones:", error);
      throw error;
    }
  }

  /**
   * Obtiene todas las configuraciones disponibles
   */
  public async getAllSettings(): Promise<GameSettings[]> {
    try {
      const prisma = this.databaseService.getPrismaClient();
      const settings = await prisma.gameSettings.findMany({
        orderBy: { isDefault: "desc" },
      });

      return settings.map((setting) => ({
        id: setting.id,
        name: setting.name,
        description: setting.description,
        config: this.parseConfig(setting.config),
        isDefault: setting.isDefault,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      }));
    } catch (error) {
      console.error("Error obteniendo configuraciones:", error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración por defecto
   */
  public async getDefaultSettings(): Promise<GameSettings | null> {
    try {
      const prisma = this.databaseService.getPrismaClient();
      const setting = await prisma.gameSettings.findFirst({
        where: { isDefault: true },
      });

      if (!setting) return null;

      return {
        id: setting.id,
        name: setting.name,
        description: setting.description,
        config: this.parseConfig(setting.config),
        isDefault: setting.isDefault,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      };
    } catch (error) {
      console.error("Error obteniendo configuración por defecto:", error);
      throw error;
    }
  }

  /**
   * Obtiene una configuración por ID
   */
  public async getSettingsById(id: string): Promise<GameSettings | null> {
    try {
      const prisma = this.databaseService.getPrismaClient();
      const setting = await prisma.gameSettings.findUnique({
        where: { id },
      });

      if (!setting) return null;

      return {
        id: setting.id,
        name: setting.name,
        description: setting.description,
        config: this.parseConfig(setting.config),
        isDefault: setting.isDefault,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      };
    } catch (error) {
      console.error("Error obteniendo configuración por ID:", error);
      throw error;
    }
  }

  /**
   * Crea una nueva configuración
   */
  public async createSettings(name: string, description: string, config: GameConfig): Promise<GameSettings> {
    try {
      const prisma = this.databaseService.getPrismaClient();
      const setting = await prisma.gameSettings.create({
        data: {
          name,
          description,
          config: this.serializeConfig(config),
          isDefault: false,
        },
      });

      return {
        id: setting.id,
        name: setting.name,
        description: setting.description,
        config: this.parseConfig(setting.config),
        isDefault: setting.isDefault,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      };
    } catch (error) {
      console.error("Error creando configuración:", error);
      throw error;
    }
  }

  /**
   * Actualiza una configuración existente
   */
  public async updateSettings(id: string, name: string, description: string, config: GameConfig): Promise<GameSettings> {
    try {
      const prisma = this.databaseService.getPrismaClient();
      const setting = await prisma.gameSettings.update({
        where: { id },
        data: {
          name,
          description,
          config: this.serializeConfig(config),
        },
      });

      return {
        id: setting.id,
        name: setting.name,
        description: setting.description,
        config: this.parseConfig(setting.config),
        isDefault: setting.isDefault,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      };
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      throw error;
    }
  }

  /**
   * Establece una configuración como predeterminada
   */
  public async setDefaultSettings(id: string): Promise<void> {
    try {
      const prisma = this.databaseService.getPrismaClient();

      // Primero, quitar el flag de default de todas las configuraciones
      await prisma.gameSettings.updateMany({
        data: { isDefault: false },
      });

      // Luego, establecer la nueva configuración como default
      await prisma.gameSettings.update({
        where: { id },
        data: { isDefault: true },
      });

      console.log(`Configuración ${id} establecida como predeterminada`);
    } catch (error) {
      console.error("Error estableciendo configuración por defecto:", error);
      throw error;
    }
  }

  /**
   * Elimina una configuración
   */
  public async deleteSettings(id: string): Promise<void> {
    try {
      const prisma = this.databaseService.getPrismaClient();

      // Verificar que no sea la configuración por defecto
      const setting = await prisma.gameSettings.findUnique({
        where: { id },
      });

      if (setting?.isDefault) {
        throw new Error("No se puede eliminar la configuración por defecto");
      }

      await prisma.gameSettings.delete({
        where: { id },
      });

      console.log(`Configuración ${id} eliminada`);
    } catch (error) {
      console.error("Error eliminando configuración:", error);
      throw error;
    }
  }

  /**
   * Valida una configuración
   */
  public validateConfig(config: GameConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.maxRounds < 1 || config.maxRounds > 20) {
      errors.push("El número máximo de rondas debe estar entre 1 y 20");
    }

    if (config.roundTimeSeconds < 10 || config.roundTimeSeconds > 300) {
      errors.push("El tiempo por ronda debe estar entre 10 y 300 segundos");
    }

    if (config.autoStartDelay < 0 || config.autoStartDelay > 60) {
      errors.push("El retraso de inicio automático debe estar entre 0 y 60 segundos");
    }

    if (config.minPlayers < 2 || config.minPlayers > 10) {
      errors.push("El número mínimo de jugadores debe estar entre 2 y 10");
    }

    if (config.maxPlayers < config.minPlayers || config.maxPlayers > 20) {
      errors.push("El número máximo de jugadores debe ser mayor al mínimo y no más de 20");
    }

    if (config.categories.length < 2 || config.categories.length > 10) {
      errors.push("Debe haber entre 2 y 10 categorías");
    }

    if (config.pointsPerWin < 1 || config.pointsPerWin > 50) {
      errors.push("Los puntos por ganar deben estar entre 1 y 50");
    }

    if (config.pointsPerUniqueAnswer < 0 || config.pointsPerUniqueAnswer > 20) {
      errors.push("Los puntos por respuesta única deben estar entre 0 y 20");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
