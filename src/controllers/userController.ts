import type { Response } from "express";
import { PrismaClient } from "@prisma/client";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();

export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    console.log("User ID from middleware:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, userId not found",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, address: true, avatar: true, bio: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Profile fetched successfully",
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, userId not found",
      });
    }

    const { name, email, bio, avatar, phone, address } = req.body;

    // Ensure at least one field is being updated
    if (!name && !email && !bio && !avatar && !phone && !address) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update",
      });
    }

    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (bio) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        phone: true,
        address: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
    });
  }
};