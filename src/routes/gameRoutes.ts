import { Router } from "express";
import { createGame, joinGame } from "../controllers/gameController";

const router = Router();

router.post("/", createGame); // POST /games  (crear partida)
router.post("/join", joinGame); // POST /games/join (unirse a partida)

export default router;
