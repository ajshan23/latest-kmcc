import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prismaClient } from "../config/db";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { admin } from "../config/firebase";
import { AuthRequest } from "../middlewares/authMiddleware";
import { sendGlobalNotification } from "../utils/notify";

// Register FCM token for a user
export const registerFCMToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, token } = req.body;

    // Validate input
    if (!userId || !token) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "User ID and token are required"));
    }

    // Update user with FCM token
    const user = await prismaClient.user.update({
      where: { id: parseInt(userId) },
      data: { fcmToken: token },
      select: { id: true, name: true },
    });

    // Subscribe the user to the 'all' topic for global notifications
    try {
      await admin.messaging().subscribeToTopic(token, "all");
    } catch (error) {
      console.error("Error subscribing to topic:", error);
      // Continue even if subscription fails
    }

    res.json(
      new ApiResponse(200, { user }, "FCM token registered successfully")
    );
  }
);

// Send global notification (admin-only)
export const sendGlobalNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const { title, body, data } = req.body;

    // Create notification in database
    const notification = await prismaClient.notification.create({
      data: {
        title,
        body,
        data: data || {},
      },
    });
    await sendGlobalNotification({
      title: title,
      body: body,
      data: { type: "admin" },
    });

    res.json(
      new ApiResponse(
        200,
        { notification },
        "Global notification sent successfully"
      )
    );
  }
);

// Get user notifications
export const getUserNotifications = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(400).json({ message: "User ID is missing" });
    }

    const notifications = await prismaClient.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    res.json(new ApiResponse(200, { notifications }, "Notifications fetched"));
  }
);

// Get all notifications (admin only)
export const getAllNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit = 20, offset = 0 } = req.query;

    const notifications = await prismaClient.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(
      new ApiResponse(200, { notifications }, "All notifications fetched")
    );
  }
);

// Mark as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;

  await prismaClient.notification.update({
    where: { id: parseInt(notificationId) },
    data: { isRead: true },
  });

  res.json(new ApiResponse(200, null, "Notification marked as read"));
});

