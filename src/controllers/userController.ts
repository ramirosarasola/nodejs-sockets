import { Request, Response } from "express";
import { DatabaseService } from "../services/DatabaseService";

export class UserController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email } = req.body;

      if (!username || !email) {
        res.status(400).json({ error: "Username and email are required" });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.databaseService.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: "User already exists" });
        return;
      }

      const user = await this.databaseService.createUser(username, email);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      // Buscar usuario por email
      const user = await this.databaseService.findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, email } = req.body;

      if (!username || !email) {
        res.status(400).json({ error: "Username and email are required" });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.databaseService.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: "User already exists" });
        return;
      }

      const user = await this.databaseService.createUser(username, email);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await this.databaseService.findUserById(id);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async getUserByEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      const user = await this.databaseService.findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting user by email:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
