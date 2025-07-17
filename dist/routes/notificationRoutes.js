"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.post("/register-token", notificationController_1.registerFCMToken);
// Admin routes
router.post("/global", notificationController_1.sendGlobalNotifications);
router.get("/admin/all", notificationController_1.getAllNotifications);
// User routes
router.get("/user", authMiddleware_1.authenticateUser, notificationController_1.getUserNotifications);
router.patch("/:notificationId/read", authMiddleware_1.authenticateUser, notificationController_1.markAsRead);
exports.default = router;
