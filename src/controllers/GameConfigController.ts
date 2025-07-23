import { Request, Response } from "express";
import { GameConfigService } from "../services/GameConfigService";
import type { GameConfig } from "../types";

export class GameConfigController {
  private configService: GameConfigService;

  constructor() {
    this.configService = GameConfigService.getInstance();
  }

  /**
   * Obtiene todas las configuraciones disponibles
   */
  public async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await this.configService.getAllSettings();

      res.status(200).json(settings);
    } catch (error) {
      console.error("Error obteniendo configuraciones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Obtiene la configuración por defecto
   */
  public async getDefaultSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await this.configService.getDefaultSettings();

      if (!settings) {
        res.status(404).json({ error: "No se encontró configuración por defecto" });
        return;
      }

      res.status(200).json(settings);
    } catch (error) {
      console.error("Error obteniendo configuración por defecto:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Obtiene una configuración por ID
   */
  public async getSettingsById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "ID de configuración requerido" });
        return;
      }

      const settings = await this.configService.getSettingsById(id);

      if (!settings) {
        res.status(404).json({ error: "Configuración no encontrada" });
        return;
      }

      res.status(200).json(settings);
    } catch (error) {
      console.error("Error obteniendo configuración por ID:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Crea una nueva configuración
   */
  public async createSettings(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, config } = req.body;

      if (!name || !description || !config) {
        res.status(400).json({ error: "Nombre, descripción y configuración son requeridos" });
        return;
      }

      // Validar la configuración
      const validation = this.configService.validateConfig(config);
      if (!validation.isValid) {
        res.status(400).json({
          error: "Configuración inválida",
          details: validation.errors,
        });
        return;
      }

      const settings = await this.configService.createSettings(name, description, config);

      res.status(201).json(settings);
    } catch (error) {
      console.error("Error creando configuración:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Actualiza una configuración existente
   */
  public async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, config } = req.body;

      if (!id) {
        res.status(400).json({ error: "ID de configuración requerido" });
        return;
      }

      if (!name || !description || !config) {
        res.status(400).json({ error: "Nombre, descripción y configuración son requeridos" });
        return;
      }

      // Validar la configuración
      const validation = this.configService.validateConfig(config);
      if (!validation.isValid) {
        res.status(400).json({
          error: "Configuración inválida",
          details: validation.errors,
        });
        return;
      }

      const settings = await this.configService.updateSettings(id, name, description, config);

      res.status(200).json(settings);
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Establece una configuración como predeterminada
   */
  public async setDefaultSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "ID de configuración requerido" });
        return;
      }

      await this.configService.setDefaultSettings(id);

      res.status(200).json({
        success: true,
        message: "Configuración establecida como predeterminada",
      });
    } catch (error) {
      console.error("Error estableciendo configuración por defecto:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Elimina una configuración
   */
  public async deleteSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "ID de configuración requerido" });
        return;
      }

      await this.configService.deleteSettings(id);

      res.status(200).json({
        success: true,
        message: "Configuración eliminada",
      });
    } catch (error) {
      console.error("Error eliminando configuración:", error);

      if (error instanceof Error && error.message.includes("No se puede eliminar")) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Inicializa las configuraciones por defecto
   */
  public async initializeDefaultSettings(req: Request, res: Response): Promise<void> {
    try {
      await this.configService.initializeDefaultSettings();

      res.status(200).json({
        success: true,
        message: "Configuraciones por defecto inicializadas",
      });
    } catch (error) {
      console.error("Error inicializando configuraciones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  /**
   * Valida una configuración
   */
  public async validateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;

      if (!config) {
        res.status(400).json({ error: "Configuración requerida" });
        return;
      }

      const validation = this.configService.validateConfig(config);

      res.status(200).json({
        success: true,
        isValid: validation.isValid,
        errors: validation.errors,
      });
    } catch (error) {
      console.error("Error validando configuración:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
