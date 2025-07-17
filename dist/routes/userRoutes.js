"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adminController_1 = require("../controllers/adminController");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post("/register-event", authMiddleware_1.authenticateUser, userController_1.registerForEvent);
router.get("/events/:eventId", authMiddleware_1.authenticateUser, userController_1.getEventById);
router.get("/events", userController_1.getEvents);
router.get("/home", userController_1.homePageData);
router.put("/upload-avatar", authMiddleware_1.authenticateUser, adminController_1.upload.single("avatar"), userController_1.uploadAvatar);
router.put("/update", authMiddleware_1.authenticateUser, userController_1.updateProfile);
router.get("/me", authMiddleware_1.authenticateUser, userController_1.getProfile);
// Add the new attended events route
router.get("/attended-events", authMiddleware_1.authenticateUser, userController_1.getAttendedEvents);
// Add to userRoutes.ts
router.get("/norka-details", authMiddleware_1.authenticateUser, userController_1.getNorkaDetails);
router.get("/securityschema-details", authMiddleware_1.authenticateUser, userController_1.getSecuritySchemeDetails);
exports.default = router;
