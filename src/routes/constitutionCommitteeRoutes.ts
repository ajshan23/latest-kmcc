import express from "express";
import {
  createCommittee,
  addCommitteeMember,
  getAllCommittees,
  getCommitteeMembers,
  getCommitteeDetails,
  updateCommittee,
  updateCommitteeMember,
  deleteCommittee,
  deleteCommitteeMember,
  getCommitteeMember,
} from "../controllers/constitutionCommitteeController";
import { upload } from "../controllers/adminController";

const router = express.Router();

// Committee routes
router.post("/", createCommittee);
router.get("/", getAllCommittees);
router.get("/:committeeId", getCommitteeDetails);
router.put("/:committeeId", updateCommittee);
router.delete("/:committeeId", deleteCommittee);

// Committee member routes
router.post(
  "/:committeeId/members",
  upload.single("image"),
  addCommitteeMember
);
router.get("/:committeeId/members", getCommitteeMembers);
router.put("/members/:memberId", upload.single("image"), updateCommitteeMember);
router.delete("/members/:memberId", deleteCommitteeMember);
// Add this route before the update/delete member routes
router.get("/members/:memberId", getCommitteeMember);
export default router;
