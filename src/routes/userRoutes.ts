import { Router } from "express";
import { createUser, searchUser } from "../controllers/userController";

const router = Router();

// POST /users
router.post("/", createUser);

// GET /users/search?username=...
router.get("/search", searchUser);

export default router;
