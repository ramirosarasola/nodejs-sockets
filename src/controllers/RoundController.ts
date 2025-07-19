import { Request, Response } from "express";
import { RoundService } from "../services/RoundService";

export class RoundController {
  private roundService: RoundService;

  constructor() {
    this.roundService = new RoundService();
  }

  public async createRound(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, roundNumber, letter } = req.body;

      if (!gameId || !roundNumber || !letter) {
        res
          .status(400)
          .json({ error: "Game ID, round number and letter are required" });
        return;
      }

      const round = await this.roundService.createRound(
        gameId,
        roundNumber,
        letter
      );
      res.status(201).json(round);
    } catch (error) {
      console.error("Error creating round:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async saveRoundAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, roundNumber, userId, answers } = req.body;

      if (!gameId || !roundNumber || !userId || !answers) {
        res.status(400).json({
          error: "Game ID, round number, user ID and answers are required",
        });
        return;
      }

      const roundAnswer = await this.roundService.saveRoundAnswer(
        gameId,
        roundNumber,
        userId,
        answers
      );
      res.status(201).json(roundAnswer);
    } catch (error) {
      console.error("Error saving round answer:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getRoundDetails(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, roundNumber } = req.params;

      const round = await this.roundService.getRoundDetails(
        gameId,
        parseInt(roundNumber)
      );
      if (!round) {
        res.status(404).json({ error: "Round not found" });
        return;
      }

      res.json(round);
    } catch (error) {
      console.error("Error getting round details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getGameRounds(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const rounds = await this.roundService.getGameRounds(gameId);
      res.json(rounds);
    } catch (error) {
      console.error("Error getting game rounds:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async finishRound(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, roundNumber } = req.params;

      const round = await this.roundService.finishRound(
        gameId,
        parseInt(roundNumber)
      );
      res.json(round);
    } catch (error) {
      console.error("Error finishing round:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getRoundAnswers(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, roundNumber } = req.params;

      const answers = await this.roundService.getRoundAnswers(
        gameId,
        parseInt(roundNumber)
      );
      res.json(answers);
    } catch (error) {
      console.error("Error getting round answers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
