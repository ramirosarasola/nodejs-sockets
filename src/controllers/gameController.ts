import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

export const createGame = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verificamos que exista el usuario
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Creamos un código corto para la partida (puede ser de 6 letras)
    const code = nanoid(6).toUpperCase();

    // Creamos la partida y agregamos al usuario como primer jugador
    const game = await prisma.game.create({
      data: {
        code,
        players: {
          create: {
            user: { connect: { id: userId } },
          },
        },
      },
      include: {
        players: {
          include: { user: true },
        },
      },
    });

    return res.status(201).json(game);
  } catch (error) {
    console.error("Error creating game:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const joinGame = async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: "User ID and code are required" });
    }

    // Verificar usuario
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Buscar partida por código
    const game = await prisma.game.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // ¿Ya está en la partida?
    const alreadyJoined = await prisma.gamePlayer.findFirst({
      where: { gameId: game.id, userId },
    });
    if (alreadyJoined) {
      return res.status(409).json({ error: "User already joined this game" });
    }

    // Agregar al usuario a la partida
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId,
      },
    });

    // Devolver la partida con todos los jugadores
    const updatedGame = await prisma.game.findUnique({
      where: { id: game.id },
      include: { players: { include: { user: true } } },
    });

    return res.json(updatedGame);
  } catch (error) {
    console.error("Error joining game:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
