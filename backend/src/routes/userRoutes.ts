import { Router } from "express";
import { getUser } from "../controllers/userController";

const router = Router();

// Exemple de route
router.get("/:id", getUser);

export default router;
