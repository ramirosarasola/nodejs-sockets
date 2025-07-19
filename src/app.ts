import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import gameRoutes from "./routes/gameRoutes";
import roundRoutes from "./routes/roundRoutes";
import { AppConfig } from "./config/AppConfig";

const app = express();
const config = AppConfig.getInstance();

app.use(cors({ origin: config.getCorsOrigin() }));
app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Rutas de usuarios
app.use("/users", userRoutes);

// Rutas de juegos
app.use("/games", gameRoutes);

// Rutas de rondas
app.use("/rounds", roundRoutes);

export default app;
