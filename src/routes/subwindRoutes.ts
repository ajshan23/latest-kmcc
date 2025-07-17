import { Router } from "express";
import {
  createSubWing,
  addSubWingMember,
  getAllSubWings,
  getSubWingMembers,
  getSubWingDetails,
  updateSubWing,
  deleteSubWingMember,
  updateSubWingMember,
} from "../controllers/subwingController";
import { upload } from "../controllers/adminController";

const router = Router();

// Create sub-wing with optional icon
router.post("/", upload.single("icon"), createSubWing);

// Get all sub-wings
router.get("/", getAllSubWings);

// Get specific sub-wing details
router.get("/:subWingId", getSubWingDetails);
router.put("/:subWingId", upload.single("icon"), updateSubWing);
// Add member to sub-wing with optional image
router.post("/:subWingId/members", upload.single("image"), addSubWingMember);

// Get members of specific sub-wing
router.get("/:subWingId/members", getSubWingMembers);
// Add these routes
router.delete("/:subWingId/members/:memberId", deleteSubWingMember);
router.put(
  "/:subWingId/members/:memberId",
  upload.single("image"),
  updateSubWingMember
);
export default router;
