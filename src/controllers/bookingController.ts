import dotenv from "dotenv";
dotenv.config(); // <-- Load env variables first

import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

const prisma = new PrismaClient();

// ✅ Create new booking
export const createBooking = async (req: Request, res: Response) => {
  try {
    // 1️⃣ Get token from cookies
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });
    // console.log("PRINTING SECRET_KEY",process.env.JWT_SECRET!);
    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const userId = decoded.userId;

    // 3️⃣ Extract data from request body
    const { guestName, email, phone, checkInDate, checkOutDate, numberOfPerson } = req.body;

    if (!guestName || !email || !phone || !checkInDate || !checkOutDate || ! numberOfPerson) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 4️⃣ Create booking entry
    const booking = await prisma.booking.create({
      data: {
        userId,
        guestName,
        email,
        phone,
       numberOfPerson: Number(numberOfPerson),
        checkInDate: new Date(checkInDate), 
        checkOutDate: new Date(checkOutDate),
        status: "success", // default
      },
    });

    

    // 5️⃣ Respond success
    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// ✅ Get all bookings with pagination
export const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  // Extract pagination params from query
  const page = parseInt(req.query.page as string) || 1; // current page (default 1)
  const limit = 10; // number of records per page
  const skip = (page - 1) * limit; // how many records to skip

  // Fetch paginated bookings
  const [bookings, totalBookings] = await Promise.all([
    prisma.booking.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count(),
  ]);

  const totalPages = Math.ceil(totalBookings / limit);

  res.status(200).json({
    success: true,
    currentPage: page,
    totalPages,
    totalBookings,
    results: bookings.length,
    data: bookings,
  });
});

export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {
  // 1️⃣ Get token from cookies
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  // 2️⃣ Verify token and extract userId
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
  const userId = decoded.userId;

  // 3️⃣ Pagination setup
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // 4️⃣ Fetch user's bookings
  const [bookings, totalBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: { userId: Number(userId) } }),
  ]);

  if (!bookings.length) {
    return res.status(404).json({
      success: false,
      message: "No bookings found for this user",
    });
  }

  const totalPages = Math.ceil(totalBookings / limit);

  // 5️⃣ Send paginated response
  res.status(200).json({
    success: true,
    currentPage: page,
    totalPages,
    totalBookings,
    results: bookings.length,
    data: bookings,
  });
});