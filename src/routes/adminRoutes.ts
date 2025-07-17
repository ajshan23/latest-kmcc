import {
  addMembershipManually,
  createEvent,
  deleteEvent,
  deleteUser,
  downloadEventRegistrations,
  editMembership,
  getAllMemberships,
  getAllUsers,
  getBanner,
  getEventById,
  getEventRegistrations,
  getEvents,
  getMembershipById,
  getStats,
  getUserById,
  markAttendance,
  updateEvent,
  updateEventImage,
  updateEventStatus,
  updateUserWithProfile,
  upload,
  uploadBanner,
  uploadMembership,
  uploadMiddleware,
} from "../controllers/adminController";

import express from "express";

const router = express.Router();

// Upload Membership File
router.post("/upload-membership", uploadMiddleware, uploadMembership);
router.post("/memberships", addMembershipManually);
router.put("/memberships/:id", editMembership);
router.get("/memberships/:id", getMembershipById);
router.get("/see", getAllMemberships);

// Banner
router.post("/upload-banner", upload.single("image"), uploadBanner);
router.get("/get-banner", getBanner);

// Events
router.post("/create-event", upload.single("image"), createEvent);
router.post("/events/:eventId", upload.single("image"), updateEvent);
router.post("/update-event-image", upload.single("image"), updateEventImage);
router.get("/get-events", getEvents);
router.get("/events/:eventId", getEventById);
router.get("/events/:eventId/registrations", getEventRegistrations);
router.patch("/events/:eventId/attendance", markAttendance);
router.delete("/event/:eventId", deleteEvent);
router.get('/events/:eventId/registrations/download', downloadEventRegistrations);
router.patch("/status/event/:eventId", updateEventStatus);

// Users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:userId", deleteUser);
router.route("/stats").get(getStats);
router.put(
  "/users-with-profile/:id",
  upload.single("profileImage"),
  updateUserWithProfile
);

export default router;
