import { Router } from "express";
import { RoundController } from "../controllers/RoundController";

const router = Router();
const roundController = new RoundController();

// Crear ronda
router.post("/", (req, res) => roundController.createRound(req, res));

// Guardar respuesta de ronda
router.post("/answer", (req, res) => roundController.saveRoundAnswer(req, res));

// Obtener detalles de una ronda específica
router.get("/:gameId/:roundNumber", (req, res) =>
  roundController.getRoundDetails(req, res)
);

// Obtener todas las rondas de un juego
router.get("/:gameId", (req, res) => roundController.getGameRounds(req, res));

// Finalizar una ronda
router.put("/:gameId/:roundNumber/finish", (req, res) =>
  roundController.finishRound(req, res)
);

// Obtener respuestas de una ronda
router.get("/:gameId/:roundNumber/answers", (req, res) =>
  roundController.getRoundAnswers(req, res)
);

export default router;
