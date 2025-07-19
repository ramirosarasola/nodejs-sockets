export interface Player {
  id: string;
  username: string;
  socketId: string;
  score: number;
}

export interface GameRoom {
  id: string;
  code: string;
  players: Player[];
  currentRound: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GameRound {
  roundNumber: number;
  letter: string;
  answers: Record<string, Record<string, string>>;
  startTime: Date;
  endTime?: Date;
}

export interface GameState {
  room: GameRoom;
  rounds: GameRound[];
  confirmations: Set<string>;
  timer?: NodeJS.Timeout;
}

export interface GameEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface GameResult {
  winner: string;
  scores: Record<string, number>;
  roundData: GameRound;
}
