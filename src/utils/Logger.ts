import { AppConfig } from "../config/AppConfig";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private observers: Array<(entry: LogEntry) => void> = [];
  private config: AppConfig;

  private constructor() {
    this.config = AppConfig.getInstance();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public addObserver(observer: (entry: LogEntry) => void): void {
    this.observers.push(observer);
  }

  public removeObserver(observer: (entry: LogEntry) => void): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  private notifyObservers(entry: LogEntry): void {
    this.observers.forEach((observer) => observer(entry));
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): void {
    const entry = this.createLogEntry(level, message, context, data);

    // Solo mostrar logs en desarrollo o si es error/warn en producción
    if (this.config.isDevelopment() || level >= LogLevel.WARN) {
      const timestamp = entry.timestamp.toISOString();
      const levelStr = LogLevel[level];
      const contextStr = context ? ` [${context}]` : "";
      const dataStr = data ? ` ${JSON.stringify(data)}` : "";

      console.log(
        `${timestamp} ${levelStr}${contextStr}: ${message}${dataStr}`
      );
    }

    this.notifyObservers(entry);
  }

  public debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  public info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  public warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  public error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  public logGameEvent(gameCode: string, event: string, data?: any): void {
    this.info(`Game event: ${event}`, `Game:${gameCode}`, data);
  }

  public logPlayerAction(
    gameCode: string,
    username: string,
    action: string,
    data?: any
  ): void {
    this.info(`Player action: ${action}`, `Game:${gameCode}`, {
      username,
      ...data,
    });
  }

  public logError(error: Error, context?: string): void {
    this.error(error.message, context, { stack: error.stack });
  }
}
