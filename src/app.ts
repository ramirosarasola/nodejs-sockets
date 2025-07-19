import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import gameRoutes from "./routes/gameRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Rutas de usuarios
app.use("/users", userRoutes);
app.use("/games", gameRoutes);

export default app;
