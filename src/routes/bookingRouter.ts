import express from "express";
import { isAdminOrSuperAdmin, isAuthenticated } from "../middlewares/auth.js"; // make sure path is correct
import { createBooking, getAllBookings, getBookingsByDate, getBookingTicketPDF, getUserBookings, verifyBooking } from "../controllers/bookingController.js";

const router = express.Router();

// ✅ Protected route — only accessible if user has valid token
router.post("/createbooking", isAuthenticated, createBooking);
router.get("/getallbooking", isAuthenticated, getAllBookings);
router.post("/userbooking", isAuthenticated, getUserBookings);
router.get("/:id/ticket", isAuthenticated, getBookingTicketPDF);

router.get("/verify", isAuthenticated, verifyBooking);

router.get("/date", getBookingsByDate);

export default router;
