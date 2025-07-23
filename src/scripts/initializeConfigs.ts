import { PrismaClient } from "@prisma/client";
import type { GameConfig } from "../types";

const prisma = new PrismaClient();

const defaultConfigs = [
  {
    name: "Estándar",
    description: "Configuración clásica para 5 rondas con tiempo moderado",
    isDefault: true,
    config: {
      maxRounds: 5,
      roundTimeSeconds: 60,
      autoStartDelay: 5,
      minPlayers: 2,
      maxPlayers: 8,
      pointsPerWin: 10,
      pointsPerUniqueAnswer: 5,
      categories: ["name", "country", "animal", "thing"],
    } as GameConfig,
  },
  {
    name: "Rápida",
    description: "Partida rápida de 3 rondas con tiempo limitado",
    isDefault: false,
    config: {
      maxRounds: 3,
      roundTimeSeconds: 30,
      autoStartDelay: 3,
      minPlayers: 2,
      maxPlayers: 6,
      pointsPerWin: 15,
      pointsPerUniqueAnswer: 10,
      categories: ["name", "country", "animal"],
    } as GameConfig,
  },
  {
    name: "Larga",
    description: "Partida extendida de 10 rondas con más categorías",
    isDefault: false,
    config: {
      maxRounds: 10,
      roundTimeSeconds: 90,
      autoStartDelay: 10,
      minPlayers: 2,
      maxPlayers: 10,
      pointsPerWin: 8,
      pointsPerUniqueAnswer: 3,
      categories: ["name", "country", "animal", "thing", "food", "color"],
    } as GameConfig,
  },
];

async function initializeConfigs() {
  try {
    console.log("Inicializando configuraciones por defecto...");

    // Limpiar configuraciones existentes
    await prisma.gameSettings.deleteMany({});
    console.log("Configuraciones anteriores eliminadas");

    // Crear configuraciones por defecto
    for (const config of defaultConfigs) {
      const created = await prisma.gameSettings.create({
        data: {
          name: config.name,
          description: config.description,
          isDefault: config.isDefault,
          config: config.config as any, // Prisma maneja JSON automáticamente
        },
      });
      console.log(`Configuración creada: ${created.name} (ID: ${created.id})`);
    }

    console.log("✅ Configuraciones inicializadas exitosamente");
  } catch (error) {
    console.error("❌ Error inicializando configuraciones:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeConfigs();
}

export { initializeConfigs };
