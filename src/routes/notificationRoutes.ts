import express from "express";
import {
  registerFCMToken,
  sendGlobalNotifications,
  getUserNotifications,
  markAsRead,
  getAllNotifications,
} from "../controllers/notificationController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router();

// Public routes
router.post("/register-token", registerFCMToken);

// Admin routes
router.post("/global", sendGlobalNotifications);
router.get("/admin/all", getAllNotifications);
// User routes
router.get("/user", authenticateUser, getUserNotifications);
router.patch("/:notificationId/read", authenticateUser, markAsRead);

export default router;