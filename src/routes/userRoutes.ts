import { Router } from "express";
import { UserController } from "../controllers/UserController";

const router = Router();
const userController = new UserController();

// Registro de usuario
router.post("/register", (req, res) => userController.register(req, res));

// Login de usuario
router.post("/login", (req, res) => userController.login(req, res));

// Crear usuario (mantener para compatibilidad)
router.post("/", (req, res) => userController.createUser(req, res));

// Obtener usuario por ID
router.get("/:id", (req, res) => userController.getUserById(req, res));

// Obtener usuario por email
router.get("/email/:email", (req, res) =>
  userController.getUserByEmail(req, res)
);

export default router;
