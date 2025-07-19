import dotenv from "dotenv";

export class AppConfig {
  private static instance: AppConfig;
  private config: Record<string, any>;

  private constructor() {
    dotenv.config();
    this.config = {
      port: process.env.PORT || 5001,
      nodeEnv: process.env.NODE_ENV || "development",
      databaseUrl: process.env.DATABASE_URL,
      corsOrigin: process.env.CORS_ORIGIN || "*",
      gameSettings: {
        roundTimer: 30000, // 30 segundos
        pointsPerWin: 10,
        minPlayers: 2,
        maxPlayers: 8,
      },
    };
  }

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  public get(key: string): any {
    return this.config[key];
  }

  public getPort(): number {
    return this.config.port;
  }

  public getNodeEnv(): string {
    return this.config.nodeEnv;
  }

  public getDatabaseUrl(): string {
    return this.config.databaseUrl;
  }

  public getCorsOrigin(): string {
    return this.config.corsOrigin;
  }

  public getGameSettings(): Record<string, any> {
    return this.config.gameSettings;
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === "development";
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === "production";
  }
}
