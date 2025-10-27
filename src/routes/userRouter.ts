import express from "express";
import { getUserProfile, updateUserProfile } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js"; // make sure path is correct

const router = express.Router();

// ✅ Protected route — only accessible if user has valid token
router.get("/getprofile", isAuthenticated, getUserProfile);
router.put("/updateprofile", isAuthenticated, updateUserProfile);

export default router;
