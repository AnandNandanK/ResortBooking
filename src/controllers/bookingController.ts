import dotenv from "dotenv";
dotenv.config(); // <-- Load env variables first

import PDFDocument, { end } from "pdfkit";
import QRCode from "qrcode";


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

    if (!guestName || !email || !phone || !checkInDate || !checkOutDate || !numberOfPerson) {
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
      statusCode: 200,
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get all bookings with pagination and optional date/date-range filter (based on createdAt)
export const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const { date, startDate, endDate } = req.query as {
    date?: string;
    startDate?: string;
    endDate?: string;
  };

  console.log("DATE:", date);
  console.log("START DATE:", startDate);
  console.log("END DATE:", endDate);

  // ✅ Build dynamic filter
  let whereClause: any = {};

  if (date) {
    // Filter for single specific created date
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    whereClause.createdAt = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (startDate && endDate) {
    // Filter for created date range
    whereClause.createdAt = {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  // Fetch bookings
  const [bookings, totalBookings] = await Promise.all([
    prisma.booking.findMany({
      skip,
      take: limit,
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" }, // order by created date
    }),
    prisma.booking.count({ where: whereClause }),
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

  console.log('JWT SECRET...........',process.env.JWT_SECRET)
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




export const getBookingTicketPDF = async (req: Request, res: Response) => {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    

    const token = jwt.sign(
      { bookingId: booking.id, email: booking.email },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }  // Token valid for 2 days
    );


    // ✅ Ensure FRONTEND_URL is defined
    const frontendUrl = process.env.CLIENT_URL;
    console.log('FRONTEND URL IN BOOKING PDF.......',frontendUrl);

    const qrCodeDataURL = await QRCode.toDataURL(
      `${frontendUrl}/verify-booking/${token}`
    );
    
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=booking-${booking.id}.pdf`);
    doc.pipe(res);

    // 🏝️ Header
    doc
      .fontSize(20)
      .fillColor("#007B7F")
      .text("Gartang Gali Resort - Booking Ticket", { align: "center" })
      .moveDown(1);

    // 📋 Booking info
    doc.fontSize(12).fillColor("black");
    doc.text(`Guest Name: ${booking.guestName}`);
    doc.text(`Email: ${booking.email}`);
    doc.text(`Phone: ${booking.phone}`);
    doc.text(`Check-In: ${new Date(booking.checkInDate).toLocaleString()}`);
    doc.text(`Check-Out: ${new Date(booking.checkOutDate).toLocaleString()}`);
    doc.text(`Guests: ${booking.numberOfPerson}`);
    doc.text(`Status: ${booking.status}`);
    doc.moveDown(1.5);


    // 📱 Add QR Code
    const qrImage = qrCodeDataURL.split(",")[1];
    if (qrImage) {
      const buffer = Buffer.from(qrImage, "base64");
      doc.image(buffer, { fit: [150, 150], align: "center" });
    }

    doc.moveDown(1);
    doc.text("Scan this QR at check-in to verify your booking", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Error generating booking PDF:", error);
    return res.status(500).json({ message: "Failed to generate ticket" });
  }
};


export const verifyBooking = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ message: "Token is missing" });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      bookingId: number;
      email: string;
    };

    // ✅ Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: decoded.bookingId },
    });

    if (!booking || booking.email !== decoded.email) {
      return res.status(404).json({ message: "Invalid or fake booking" });
    }

    // ⚠️ Check if already verified
    if (booking.isVerified) {  //  1 true
      return res.status(400).json({ message: "QR already used / booking already verified" });
    }

    // ✅ Mark as verified now
    await prisma.booking.update({
      where: { id: booking.id },
      data: { isVerified: true },
    });

    return res.status(200).json({
      message: "Booking verified successfully",
      booking,
    });

  } catch (error) {
    console.error("Error verifying booking:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};





export const getBookingsByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startDate, endDate } = req.query as {
      date?: string;
      startDate?: string;
      endDate?: string;
    };

    let filter: Record<string, any> = {};

    // 🎯 Case 1: Specific date
    if (date) {
      const selectedDate = new Date(date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      filter = {
        checkInDate: {
          gte: selectedDate,
          lt: nextDate,
        },
      };
    }

    // 🎯 Case 2: Date range
    else if (startDate && endDate) {
      filter = {
        checkInDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    } else {
      res.status(400).json({
        success: false,
        message: "Please provide either a date or startDate & endDate",
      });
      return;
    }

    // 🔍 Fetch bookings
    const bookings = await prisma.booking.findMany({
      where: filter,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { checkInDate: "asc" },
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching bookings by date:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
    });
  }
};
