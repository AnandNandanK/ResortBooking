import express from "express";
import { isAuthenticated } from "../middlewares/auth.js"; // make sure path is correct
import { createBooking, getAllBookings, getUserBookings } from "../controllers/bookingController.js";

const router = express.Router();

// ✅ Protected route — only accessible if user has valid token
router.post("/createbooking", isAuthenticated, createBooking);
router.get("/getallbooking", isAuthenticated, getAllBookings);
router.post("/userbooking", isAuthenticated, getUserBookings);

export default router;
