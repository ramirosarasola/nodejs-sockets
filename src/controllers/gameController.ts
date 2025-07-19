import { Request, Response } from "express";
import { DatabaseService } from "../services/DatabaseService";

export class GameController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  public async createGame(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      // Verificar que exista el usuario
      const user = await this.databaseService.findUserById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Crear la partida
      const game = await this.databaseService.createGame(userId);
      res.status(201).json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async joinGame(req: Request, res: Response): Promise<void> {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        res.status(400).json({ error: "User ID and code are required" });
        return;
      }

      // Verificar usuario
      const user = await this.databaseService.findUserById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Buscar partida por código
      const game = await this.databaseService.findGameByCode(code);
      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      try {
        // Agregar al usuario a la partida
        const updatedGame = await this.databaseService.joinGame(
          game.id,
          userId
        );
        res.json(updatedGame);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "User already joined this game"
        ) {
          res.status(409).json({ error: "User already joined this game" });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Error joining game:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getGameByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      const game = await this.databaseService.findGameByCode(code);
      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      res.json(game);
    } catch (error) {
      console.error("Error getting game:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getGameById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const game = await this.databaseService.findGameById(id);
      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      res.json(game);
    } catch (error) {
      console.error("Error getting game:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async updateGameStatus(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: "Status is required" });
        return;
      }

      const game = await this.databaseService.updateGameStatus(gameId, status);
      res.json(game);
    } catch (error) {
      console.error("Error updating game status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getGameScores(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const scores = await this.databaseService.getGameScores(gameId);
      res.json(scores);
    } catch (error) {
      console.error("Error getting game scores:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getPlayerScores(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const scores = await this.databaseService.getPlayerScores(gameId);
      res.json(scores);
    } catch (error) {
      console.error("Error getting player scores:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async saveGameScore(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, userId, score } = req.body;

      if (!gameId || !userId || score === undefined) {
        res
          .status(400)
          .json({ error: "Game ID, User ID and score are required" });
        return;
      }

      const savedScore = await this.databaseService.saveGameScore(
        gameId,
        userId,
        score
      );
      res.status(201).json(savedScore);
    } catch (error) {
      console.error("Error saving score:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getActiveGames(req: Request, res: Response): Promise<void> {
    try {
      const games = await this.databaseService.getActiveGames();
      res.json(games);
    } catch (error) {
      console.error("Error getting active games:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getGameWithFullDetails(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const game = await this.databaseService.getGameWithFullDetails(gameId);
      if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      res.json(game);
    } catch (error) {
      console.error("Error getting game with full details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
