import { Router } from "express";
import { getMe, login, logout, register } from "./auth.controller";
import { protect } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

export default router;