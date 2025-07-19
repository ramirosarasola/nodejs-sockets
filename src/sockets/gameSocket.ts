import { Server, Socket } from "socket.io";

interface PlayerInfo {
  username: string;
  socketId: string;
}

const gameRooms: Record<string, PlayerInfo[]> = {};
const playerScores: Record<string, Record<string, number>> = {}; // gameCode -> username -> score
const gameConfirmations: Record<string, Set<string>> = {}; // gameCode -> Set of confirmed usernames
const gameTimers: Record<string, NodeJS.Timeout> = {}; // gameCode -> timer reference
const gameRounds: Record<string, number> = {}; // gameCode -> current round number
const gameRoundData: Record<
  string,
  Record<
    number,
    { letter: string; answers: Record<string, Record<string, string>> }
  >
> = {}; // gameCode -> round -> data

const randomLetter = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * letters.length)];
};

const startGameWithTimer = (
  io: Server,
  gameCode: string,
  isNewRound: boolean = false
) => {
  // Limpiar timer existente si hay uno
  if (gameTimers[gameCode]) {
    clearTimeout(gameTimers[gameCode]);
  }

  // Iniciar timer de 30 segundos
  gameTimers[gameCode] = setTimeout(() => {
    console.log(
      `Timer expirado para sala ${gameCode}, iniciando ${
        isNewRound ? "ronda" : "juego"
      } automáticamente`
    );
    const letter = randomLetter();
    const roundNumber = isNewRound ? gameRounds[gameCode] || 1 : 1;

    // Guardar datos de la ronda
    if (!gameRoundData[gameCode]) {
      gameRoundData[gameCode] = {};
    }
    gameRoundData[gameCode][roundNumber] = { letter, answers: {} };

    io.to(gameCode).emit("game_started", {
      letter,
      autoStarted: true,
      roundNumber,
      isNewRound,
    });

    // Limpiar confirmaciones
    delete gameConfirmations[gameCode];
    delete gameTimers[gameCode];
  }, 30000); // 30 segundos

  // Notificar a todos que el juego está por comenzar
  console.log(
    `Emitiendo game_ready_to_start a sala ${gameCode} con isNewRound: ${isNewRound}`
  );
  io.to(gameCode).emit("game_ready_to_start", {
    timeLeft: 30,
    totalPlayers: gameRooms[gameCode]?.length || 0,
    isNewRound,
  });
};

const checkAllConfirmed = (
  io: Server,
  gameCode: string,
  isNewRound: boolean = false
) => {
  const players = gameRooms[gameCode] || [];
  const confirmed = gameConfirmations[gameCode] || new Set();

  if (confirmed.size >= players.length) {
    console.log(
      `Todos confirmaron en sala ${gameCode}, iniciando ${
        isNewRound ? "ronda" : "juego"
      }`
    );

    // Limpiar timer
    if (gameTimers[gameCode]) {
      clearTimeout(gameTimers[gameCode]);
      delete gameTimers[gameCode];
    }

    const letter = randomLetter();
    const roundNumber = isNewRound ? gameRounds[gameCode] || 1 : 1;

    // Guardar datos de la ronda
    if (!gameRoundData[gameCode]) {
      gameRoundData[gameCode] = {};
    }
    gameRoundData[gameCode][roundNumber] = { letter, answers: {} };

    io.to(gameCode).emit("game_started", {
      letter,
      autoStarted: false,
      roundNumber,
      isNewRound,
    });

    // Limpiar confirmaciones
    delete gameConfirmations[gameCode];
  }
};

export const registerGameSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("join_game", ({ gameCode, username }) => {
      if (!gameCode || !username) return;

      socket.join(gameCode);

      // Guardamos el jugador en la room
      if (!gameRooms[gameCode]) gameRooms[gameCode] = [];
      gameRooms[gameCode].push({ username, socketId: socket.id });

      // Avisar a todos en la sala la lista actualizada de jugadores
      io.to(gameCode).emit("player_list", gameRooms[gameCode]);
    });

    socket.on("start_game", ({ gameCode, username }) => {
      console.log(
        `Host ${username} inició proceso de confirmación en sala ${gameCode}`
      );

      // Inicializar confirmaciones para esta sala
      if (!gameConfirmations[gameCode]) {
        gameConfirmations[gameCode] = new Set();
      }

      // El host confirma automáticamente
      gameConfirmations[gameCode].add(username);

      // Iniciar timer y proceso de confirmación
      startGameWithTimer(io, gameCode);
    });

    socket.on("start_next_round", ({ gameCode, username }) => {
      console.log(
        `Host ${username} inició siguiente ronda en sala ${gameCode}`
      );
      console.log("Estado actual de rondas:", gameRounds);
      console.log("Estado actual de confirmaciones:", gameConfirmations);

      // Incrementar número de ronda
      gameRounds[gameCode] = (gameRounds[gameCode] || 1) + 1;
      console.log(`Nueva ronda: ${gameRounds[gameCode]}`);

      // Inicializar confirmaciones para esta sala
      if (!gameConfirmations[gameCode]) {
        gameConfirmations[gameCode] = new Set();
      }

      // El host confirma automáticamente
      gameConfirmations[gameCode].add(username);
      console.log("Host confirmado automáticamente");

      // Iniciar timer y proceso de confirmación para nueva ronda
      startGameWithTimer(io, gameCode, true);
    });

    socket.on("player_ready", ({ gameCode, username }) => {
      console.log(
        `Jugador ${username} confirmó que está listo en sala ${gameCode}`
      );

      if (!gameConfirmations[gameCode]) {
        gameConfirmations[gameCode] = new Set();
      }

      gameConfirmations[gameCode].add(username);

      // Notificar a todos quién confirmó
      io.to(gameCode).emit("player_confirmed", {
        username,
        confirmedPlayers: Array.from(gameConfirmations[gameCode]),
      });

      // Verificar si todos confirmaron (detectar si es nueva ronda)
      const isNewRound = !!(gameRounds[gameCode] && gameRounds[gameCode] > 1);
      checkAllConfirmed(io, gameCode, isNewRound);
    });

    socket.on("tuti_fruti_finished", ({ gameCode, username, answers }) => {
      console.log(
        `Jugador ${username} terminó en sala ${gameCode} con respuestas:`,
        answers
      );

      // Inicializar scores si no existe
      if (!playerScores[gameCode]) {
        playerScores[gameCode] = {};
      }

      // Sumar 10 puntos al ganador
      playerScores[gameCode][username] =
        (playerScores[gameCode][username] || 0) + 10;

      // Guardar respuestas de la ronda actual
      const currentRound = gameRounds[gameCode] || 1;
      if (!gameRoundData[gameCode]) {
        gameRoundData[gameCode] = {};
      }
      if (!gameRoundData[gameCode][currentRound]) {
        gameRoundData[gameCode][currentRound] = { letter: "", answers: {} };
      }
      gameRoundData[gameCode][currentRound].answers[username] = answers;

      console.log(`Puntuación actual en ${gameCode}:`, playerScores[gameCode]);

      // Notificar a todos en la sala que alguien terminó
      io.to(gameCode).emit("round_finished", {
        finishedBy: username,
        answers: answers,
        scores: playerScores[gameCode],
        roundNumber: currentRound,
      });
    });

    socket.on("disconnect", () => {
      // Eliminar al jugador de todas las salas
      for (const code in gameRooms) {
        gameRooms[code] = gameRooms[code].filter(
          (p) => p.socketId !== socket.id
        );
        // Actualizar la lista a los que quedan
        io.to(code).emit("player_list", gameRooms[code]);
      }
    });
  });
};
