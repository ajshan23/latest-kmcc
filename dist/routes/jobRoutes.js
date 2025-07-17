"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jobController_1 = require("../controllers/jobController");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// ✅ Create a new job (Admin Only)
router.post("/create", adminController_1.upload.single("logo"), jobController_1.createJob);
// ✅ Edit an existing job (Admin Only)
router.put("/:jobId", adminController_1.upload.single("logo"), jobController_1.editJob);
// ✅ Delete a job (Admin Only)
router.delete("/:jobId", jobController_1.deleteJob);
// ✅ Get all active jobs (Public)
router.get("/", jobController_1.getActiveJobs);
// ✅ Get a single job by ID (Public)
router.get("/:jobId", jobController_1.getJobById);
// ✅ Get all jobs (Admin only)
router.get("/admin/all", jobController_1.getAllJobsAdmin);
// ✅ Apply for a job (User)
router.post("/apply", adminController_1.upload.single("resume"), jobController_1.applyJob);
//for admin to gert all job application for a perticular job
router.get("/get-applications/:jobId", jobController_1.getJobApplications);
//close a job for admin
router.patch("/:jobId/close", jobController_1.closeJob);
exports.default = router;
