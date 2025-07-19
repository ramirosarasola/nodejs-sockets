import { Router } from "express";
import { UserController } from "../controllers/userController";

const router = Router();
const userController = new UserController();

// Crear usuario
router.post("/", (req, res) => userController.createUser(req, res));

// Obtener usuario por ID
router.get("/:id", (req, res) => userController.getUserById(req, res));

// Obtener usuario por email
router.get("/email/:email", (req, res) =>
  userController.getUserByEmail(req, res)
);

export default router;
