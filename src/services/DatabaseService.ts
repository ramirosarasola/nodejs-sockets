import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

export class DatabaseService {
  private prisma: PrismaClient;
  private static instance: DatabaseService;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ===== USUARIO =====
  public async createUser(username: string, email: string) {
    try {
      return await this.prisma.user.create({
        data: {
          username,
          email,
        },
      });
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  public async findUserById(id: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error("Error finding user:", error);
      throw error;
    }
  }

  public async findUserByEmail(email: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  public async findUserByUsername(username: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { username },
      });
    } catch (error) {
      console.error("Error finding user by username:", error);
      throw error;
    }
  }

  // ===== JUEGO =====
  public async createGame(userId: string) {
    try {
      const code = nanoid(6).toUpperCase();

      return await this.prisma.game.create({
        data: {
          code,
          players: {
            create: {
              userId,
            },
          },
        },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  }

  public async findGameByCode(code: string) {
    try {
      return await this.prisma.game.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          rounds: {
            orderBy: {
              roundNumber: "asc",
            },
            include: {
              answers: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Error finding game:", error);
      throw error;
    }
  }

  public async findGameById(id: string) {
    try {
      return await this.prisma.game.findUnique({
        where: { id },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          rounds: {
            orderBy: {
              roundNumber: "asc",
            },
            include: {
              answers: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Error finding game by ID:", error);
      throw error;
    }
  }

  public async joinGame(gameId: string, userId: string) {
    try {
      // Verificar si ya está en la partida
      const existingPlayer = await this.prisma.gamePlayer.findUnique({
        where: {
          gameId_userId: {
            gameId,
            userId,
          },
        },
      });

      if (existingPlayer) {
        throw new Error("User already joined this game");
      }

      // Agregar al usuario a la partida
      await this.prisma.gamePlayer.create({
        data: {
          gameId,
          userId,
        },
      });

      // Devolver la partida actualizada
      return await this.findGameById(gameId);
    } catch (error) {
      console.error("Error joining game:", error);
      throw error;
    }
  }

  public async updateGameStatus(
    gameId: string,
    status: "WAITING" | "PLAYING" | "FINISHED" | "CANCELLED"
  ) {
    try {
      const updateData: any = { status };

      if (status === "PLAYING") {
        updateData.startedAt = new Date();
      } else if (status === "FINISHED") {
        updateData.finishedAt = new Date();
      }

      return await this.prisma.game.update({
        where: { id: gameId },
        data: updateData,
      });
    } catch (error) {
      console.error("Error updating game status:", error);
      throw error;
    }
  }

  // ===== RONDAS =====
  public async createRound(
    gameId: string,
    roundNumber: number,
    letter: string
  ) {
    try {
      return await this.prisma.round.create({
        data: {
          gameId,
          roundNumber,
          letter,
        },
      });
    } catch (error) {
      console.error("Error creating round:", error);
      throw error;
    }
  }

  public async findRoundByGameAndNumber(gameId: string, roundNumber: number) {
    try {
      return await this.prisma.round.findUnique({
        where: {
          gameId_roundNumber: {
            gameId,
            roundNumber,
          },
        },
        include: {
          answers: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Error finding round:", error);
      throw error;
    }
  }

  public async saveRoundAnswer(
    roundId: string,
    userId: string,
    answers: Record<string, string>,
    score: number = 10
  ) {
    try {
      return await this.prisma.roundAnswer.create({
        data: {
          roundId,
          userId,
          answers: answers as any, // Prisma maneja JSON automáticamente
          score,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error saving round answer:", error);
      throw error;
    }
  }

  // ===== PUNTUACIONES =====
  public async updatePlayerScore(
    gameId: string,
    userId: string,
    score: number
  ) {
    try {
      return await this.prisma.gamePlayer.update({
        where: {
          gameId_userId: {
            gameId,
            userId,
          },
        },
        data: { score },
      });
    } catch (error) {
      console.error("Error updating player score:", error);
      throw error;
    }
  }

  public async saveGameScore(gameId: string, userId: string, score: number) {
    try {
      return await this.prisma.gameScore.upsert({
        where: {
          gameId_userId: {
            gameId,
            userId,
          },
        },
        update: {
          score,
        },
        create: {
          gameId,
          userId,
          score,
        },
      });
    } catch (error) {
      console.error("Error saving game score:", error);
      throw error;
    }
  }

  public async getGameScores(gameId: string) {
    try {
      return await this.prisma.gameScore.findMany({
        where: { gameId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          score: "desc",
        },
      });
    } catch (error) {
      console.error("Error getting game scores:", error);
      throw error;
    }
  }

  public async getPlayerScores(gameId: string) {
    try {
      return await this.prisma.gamePlayer.findMany({
        where: { gameId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          score: "desc",
        },
      });
    } catch (error) {
      console.error("Error getting player scores:", error);
      throw error;
    }
  }

  // ===== CONSULTAS COMPLEJAS =====
  public async getGameWithFullDetails(gameId: string) {
    try {
      return await this.prisma.game.findUnique({
        where: { id: gameId },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          rounds: {
            orderBy: {
              roundNumber: "asc",
            },
            include: {
              answers: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
          scores: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: {
              score: "desc",
            },
          },
        },
      });
    } catch (error) {
      console.error("Error getting game with full details:", error);
      throw error;
    }
  }

  public async getActiveGames() {
    try {
      return await this.prisma.game.findMany({
        where: {
          status: {
            in: ["WAITING", "PLAYING"],
          },
        },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      console.error("Error getting active games:", error);
      throw error;
    }
  }

  // ===== LIMPIEZA =====
  public async disconnect() {
    await this.prisma.$disconnect();
  }
}
