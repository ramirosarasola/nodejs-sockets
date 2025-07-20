import { Router } from "express";
import { GameController } from "../controllers/GameController";

const router = Router();
const gameController = new GameController();

// ===== EXISTING ROUTES =====

// Create game
router.post("/", gameController.createGame.bind(gameController));

// Join game
router.post("/join", gameController.joinGame.bind(gameController));

// Get active games (debe ir antes de /:code para evitar conflictos)
router.get("/", gameController.getActiveGames.bind(gameController));

// Get user games
router.get("/user/:userId", gameController.getUserGames.bind(gameController));

// Get game by code
router.get("/:code", gameController.getGameByCode.bind(gameController));

// ===== NEW PERSISTENCE ROUTES =====

// Restore game from persistence
router.post("/:code/restore", gameController.restoreGame.bind(gameController));

// Save manual snapshot
router.post("/:code/snapshot", gameController.saveSnapshot.bind(gameController));

// Get persistence information
router.get("/:code/persistence", gameController.getPersistenceInfo.bind(gameController));

// Clean up old persistence data
router.delete("/:code/persistence", gameController.cleanupPersistence.bind(gameController));

export default router;
