import { Router } from "express";
import {  loginUser, logoutUser, registerUser } from "../controllers/authController.js";
import passport from "../config/googleAuth.js";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);


router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const user = req.user as User; // ✅ Type assertion

    if (!user) return res.redirect("/login");

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.CLIENT_URL || "/");
  }
);

export default router;