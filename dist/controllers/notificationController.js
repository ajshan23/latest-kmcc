"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.getAllNotifications = exports.getUserNotifications = exports.sendGlobalNotifications = exports.registerFCMToken = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const db_1 = require("../config/db");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const firebase_1 = require("../config/firebase");
const notify_1 = require("../utils/notify");
// Register FCM token for a user
exports.registerFCMToken = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, token } = req.body;
    // Validate input
    if (!userId || !token) {
        return res
            .status(400)
            .json(new apiHandlerHelpers_1.ApiResponse(400, null, "User ID and token are required"));
    }
    // Update user with FCM token
    const user = yield db_1.prismaClient.user.update({
        where: { id: parseInt(userId) },
        data: { fcmToken: token },
        select: { id: true, name: true },
    });
    // Subscribe the user to the 'all' topic for global notifications
    try {
        yield firebase_1.admin.messaging().subscribeToTopic(token, "all");
    }
    catch (error) {
        console.error("Error subscribing to topic:", error);
        // Continue even if subscription fails
    }
    res.json(new apiHandlerHelpers_1.ApiResponse(200, { user }, "FCM token registered successfully"));
}));
// Send global notification (admin-only)
exports.sendGlobalNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, body, data } = req.body;
    // Create notification in database
    const notification = yield db_1.prismaClient.notification.create({
        data: {
            title,
            body,
            data: data || {},
        },
    });
    yield (0, notify_1.sendGlobalNotification)({
        title: title,
        body: body,
        data: { type: "admin" },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, { notification }, "Global notification sent successfully"));
}));
// Get user notifications
exports.getUserNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    if (!userId) {
        return res.status(400).json({ message: "User ID is missing" });
    }
    const notifications = yield db_1.prismaClient.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, { notifications }, "Notifications fetched"));
}));
// Get all notifications (admin only)
exports.getAllNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit = 20, offset = 0 } = req.query;
    const notifications = yield db_1.prismaClient.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
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
    res.json(new apiHandlerHelpers_1.ApiResponse(200, { notifications }, "All notifications fetched"));
}));
// Mark as read
exports.markAsRead = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { notificationId } = req.params;
    yield db_1.prismaClient.notification.update({
        where: { id: parseInt(notificationId) },
        data: { isRead: true },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, null, "Notification marked as read"));
}));
