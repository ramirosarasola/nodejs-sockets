import { Router } from "express";
import { GameConfigController } from "../controllers/GameConfigController";

const router = Router();
const configController = new GameConfigController();

// ===== RUTAS DE CONFIGURACIÓN =====

// Obtener todas las configuraciones
router.get("/", configController.getAllSettings.bind(configController));

// Obtener configuración por defecto
router.get("/default", configController.getDefaultSettings.bind(configController));

// Obtener configuración por ID
router.get("/:id", configController.getSettingsById.bind(configController));

// Crear nueva configuración
router.post("/", configController.createSettings.bind(configController));

// Actualizar configuración existente
router.put("/:id", configController.updateSettings.bind(configController));

// Establecer configuración como predeterminada
router.patch("/:id/default", configController.setDefaultSettings.bind(configController));

// Eliminar configuración
router.delete("/:id", configController.deleteSettings.bind(configController));

// Inicializar configuraciones por defecto
router.post("/initialize", configController.initializeDefaultSettings.bind(configController));

// Validar configuración
router.post("/validate", configController.validateConfig.bind(configController));

export default router;
