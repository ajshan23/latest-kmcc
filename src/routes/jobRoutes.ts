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
} from "../controllers/jobController";
import { upload } from "../controllers/adminController";

const router = express.Router();

// ✅ Create a new job (Admin Only)
router.post("/create", upload.single("logo"), createJob);

// ✅ Edit an existing job (Admin Only)
router.put("/:jobId", upload.single("logo"), editJob);

// ✅ Delete a job (Admin Only)
router.delete("/:jobId", deleteJob);

// ✅ Get all active jobs (Public)
router.get("/", getActiveJobs);

// ✅ Get a single job by ID (Public)
router.get("/:jobId", getJobById);

// ✅ Get all jobs (Admin only)
router.get("/admin/all", getAllJobsAdmin);

// ✅ Apply for a job (User)
router.post("/apply", upload.single("resume"), applyJob);

//for admin to gert all job application for a perticular job
router.get("/get-applications/:jobId", getJobApplications);

//close a job for admin
router.patch("/:jobId/close", closeJob);

export default router;
