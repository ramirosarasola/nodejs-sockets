import { DatabaseService } from "./DatabaseService";
import { Logger } from "../utils/Logger";

export class RoundService {
  private databaseService: DatabaseService;
  private logger: Logger;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.logger = Logger.getInstance();
  }

  public async createRound(
    gameId: string,
    roundNumber: number,
    letter: string
  ) {
    try {
      this.logger.info(
        `Creating round ${roundNumber} for game ${gameId}`,
        "RoundService"
      );

      const round = await this.databaseService.createRound(
        gameId,
        roundNumber,
        letter
      );

      this.logger.info(
        `Round ${roundNumber} created successfully`,
        "RoundService",
        {
          gameId,
          roundNumber,
          letter,
        }
      );

      return round;
    } catch (error) {
      this.logger.error(`Error creating round: ${error}`, "RoundService");
      throw error;
    }
  }

  public async saveRoundAnswer(
    gameId: string,
    roundNumber: number,
    userId: string,
    answers: Record<string, string>
  ) {
    try {
      this.logger.info(
        `Saving round answer for user ${userId}`,
        "RoundService",
        {
          gameId,
          roundNumber,
          answers,
        }
      );

      // Buscar la ronda
      const round = await this.databaseService.findRoundByGameAndNumber(
        gameId,
        roundNumber
      );
      if (!round) {
        throw new Error(`Round ${roundNumber} not found for game ${gameId}`);
      }

      // Guardar la respuesta
      const roundAnswer = await this.databaseService.saveRoundAnswer(
        round.id,
        userId,
        answers
      );

      // Actualizar puntuación del jugador
      await this.databaseService.updatePlayerScore(gameId, userId, 10);

      this.logger.info(`Round answer saved successfully`, "RoundService", {
        gameId,
        roundNumber,
        userId,
        score: 10,
      });

      return roundAnswer;
    } catch (error) {
      this.logger.error(`Error saving round answer: ${error}`, "RoundService");
      throw error;
    }
  }

  public async getRoundDetails(gameId: string, roundNumber: number) {
    try {
      const round = await this.databaseService.findRoundByGameAndNumber(
        gameId,
        roundNumber
      );

      if (!round) {
        return null;
      }

      return round;
    } catch (error) {
      this.logger.error(
        `Error getting round details: ${error}`,
        "RoundService"
      );
      throw error;
    }
  }

  public async getGameRounds(gameId: string) {
    try {
      const game = await this.databaseService.findGameById(gameId);

      if (!game) {
        return [];
      }

      return game.rounds || [];
    } catch (error) {
      this.logger.error(`Error getting game rounds: ${error}`, "RoundService");
      throw error;
    }
  }

  public async finishRound(gameId: string, roundNumber: number) {
    try {
      this.logger.info(
        `Finishing round ${roundNumber} for game ${gameId}`,
        "RoundService"
      );

      const round = await this.databaseService.findRoundByGameAndNumber(
        gameId,
        roundNumber
      );
      if (!round) {
        throw new Error(`Round ${roundNumber} not found for game ${gameId}`);
      }

      // Actualizar la ronda con endTime
      const updatedRound = await this.databaseService["prisma"].round.update({
        where: { id: round.id },
        data: { endTime: new Date() },
      });

      this.logger.info(
        `Round ${roundNumber} finished successfully`,
        "RoundService",
        {
          gameId,
          roundNumber,
          endTime: updatedRound.endTime,
        }
      );

      return updatedRound;
    } catch (error) {
      this.logger.error(`Error finishing round: ${error}`, "RoundService");
      throw error;
    }
  }

  public async getRoundAnswers(gameId: string, roundNumber: number) {
    try {
      const round = await this.databaseService.findRoundByGameAndNumber(
        gameId,
        roundNumber
      );

      if (!round) {
        return [];
      }

      return round.answers || [];
    } catch (error) {
      this.logger.error(
        `Error getting round answers: ${error}`,
        "RoundService"
      );
      throw error;
    }
  }
}
