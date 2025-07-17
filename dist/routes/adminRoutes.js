"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adminController_1 = require("../controllers/adminController");
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Upload Membership File
router.post("/upload-membership", adminController_1.uploadMiddleware, adminController_1.uploadMembership);
router.post("/memberships", adminController_1.addMembershipManually);
router.put("/memberships/:id", adminController_1.editMembership);
router.get("/memberships/:id", adminController_1.getMembershipById);
router.get("/see", adminController_1.getAllMemberships);
// Banner
router.post("/upload-banner", adminController_1.upload.single("image"), adminController_1.uploadBanner);
router.get("/get-banner", adminController_1.getBanner);
// Events
router.post("/create-event", adminController_1.upload.single("image"), adminController_1.createEvent);
router.post("/events/:eventId", adminController_1.upload.single("image"), adminController_1.updateEvent);
router.post("/update-event-image", adminController_1.upload.single("image"), adminController_1.updateEventImage);
router.get("/get-events", adminController_1.getEvents);
router.get("/events/:eventId", adminController_1.getEventById);
router.get("/events/:eventId/registrations", adminController_1.getEventRegistrations);
router.patch("/events/:eventId/attendance", adminController_1.markAttendance);
router.delete("/event/:eventId", adminController_1.deleteEvent);
router.get('/events/:eventId/registrations/download', adminController_1.downloadEventRegistrations);
router.patch("/status/event/:eventId", adminController_1.updateEventStatus);
// Users
router.get("/users", adminController_1.getAllUsers);
router.get("/users/:id", adminController_1.getUserById);
router.delete("/users/:userId", adminController_1.deleteUser);
router.route("/stats").get(adminController_1.getStats);
router.put("/users-with-profile/:id", adminController_1.upload.single("profileImage"), adminController_1.updateUserWithProfile);
exports.default = router;
