import express from "express";
import {
  createJob,
  editJob,
  deleteJob,
  getActiveJobs,
  getJobById,
  getAllJobsAdmin,
  applyJob,
  getJobApplications,
  closeJob,
  applyJobNew,
  getJobByIdNew,
} from "../controllers/jobController";
import { upload } from "../controllers/adminController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router();

// ✅ Create a new job (Admin Only)
router.post("/create", authenticateUser, upload.single("logo"), createJob);

// ✅ Edit an existing job (Admin Only)
router.put("/:jobId", authenticateUser, upload.single("logo"), editJob);

// ✅ Delete a job (Admin Only)
router.delete("/:jobId", authenticateUser, deleteJob);

// ✅ Get all active jobs (Public)
router.get("/", getActiveJobs);

// ✅ Get a single job by ID (Public or Private with user context)
router.get("/:jobId", getJobById);
router.get("/:jobId/new",authenticateUser, getJobByIdNew);

// ✅ Get all jobs (Admin only)
router.get("/admin/all", authenticateUser, getAllJobsAdmin);

// ✅ Apply for a job (User - authenticated only)
router.post("/apply-new", authenticateUser, upload.single("resume"), applyJobNew);
router.post("/apply", upload.single("resume"), applyJob);

// For admin to get all job application for a particular job
router.get("/get-applications/:jobId", authenticateUser, getJobApplications);

// Close a job for admin
router.patch("/:jobId/close", authenticateUser, closeJob);

export default router;