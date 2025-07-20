import { Router } from "express";
import { GameController } from "../controllers/GameController";

const router = Router();
const gameController = new GameController();

// Crear partida
router.post("/", (req, res) => gameController.createGame(req, res));

// Unirse a partida
router.post("/join", (req, res) => gameController.joinGame(req, res));

// Obtener partida por código
router.get("/code/:code", (req, res) => gameController.getGameByCode(req, res));

// Obtener partida por ID
router.get("/:id", (req, res) => gameController.getGameById(req, res));

// Obtener partida con detalles completos
router.get("/:gameId/details", (req, res) =>
  gameController.getGameWithFullDetails(req, res)
);

// Actualizar estado de partida
router.put("/:gameId/status", (req, res) =>
  gameController.updateGameStatus(req, res)
);

// Obtener puntuaciones de partida
router.get("/:gameId/scores", (req, res) =>
  gameController.getGameScores(req, res)
);

// Obtener puntuaciones de jugadores
router.get("/:gameId/player-scores", (req, res) =>
  gameController.getPlayerScores(req, res)
);

// Guardar puntuación
router.post("/scores", (req, res) => gameController.saveGameScore(req, res));

// Obtener partidas activas
router.get("/active/list", (req, res) =>
  gameController.getActiveGames(req, res)
);

export default router;
