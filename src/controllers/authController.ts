import type { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

interface RegisterDT {
  userName: string;
  userEmail: string;
  password: string;
}


// User registration controller
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  
  const { userName, userEmail, password }:RegisterDT = req.body;

  // Validate input
  if (!userName || !userEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, and password",
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const user = await prisma.user.create({
    data: {
      name:userName,
      email: userEmail.toLowerCase(),
      password:hashedPassword
    },
  });


  // Return success response (without password)
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});




interface CreateAdminDT {
  name: string;
  email: string;
  password: string;
  role?: Role; // optional: can create ADMIN or SUPER_ADMIN
}

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role }: CreateAdminDT = req.body;

  // 1️⃣ Validate input
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, and password",
    });
  }

  // 2️⃣ Verify requester (must be Super Admin)
  const requesterId = (req as any).userId; // set by your auth middleware

  if (!requesterId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please login as Super Admin",
    });
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
  });

  if (!requester || requester.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Access denied: Only Super Admins can create admins",
    });
  }

  // 3️⃣ Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  // 4️⃣ Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 5️⃣ Assign role — default ADMIN if not provided
  const finalRole = role && role === Role.SUPER_ADMIN ? Role.SUPER_ADMIN : Role.ADMIN;

  // 6️⃣ Create new Admin
  const newAdmin = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: finalRole,
    },
  });

  // 7️⃣ Respond
  res.status(201).json({
    success: true,
    message: `${finalRole} account created successfully`,
    data: {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
    },
  });
});





interface LoginDT {
  userEmail: string;
  password: string;
}

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { userEmail, password }: LoginDT = req.body;

  // Validate input
  if (!userEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password",
    });
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );


  // Set token in HTTP-only cookie
  res.cookie("token", token, {
    httpOnly: true,        // makes cookie inaccessible to JS
    secure: process.env.NODE_ENV === "production", // true on HTTPS
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Send response
  res.status(200).json({
    success: true,
    statusCode:200,
    message: "Login successful",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});




// User logout controller
export const logoutUser = (req: Request, res: Response) => {
  // Clear the cookie
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true on HTTPS
    sameSite: "strict",
    expires: new Date(0), // Set cookie expiration in the past
  });

  
  // Send response
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: "Logout successful",
  });
};