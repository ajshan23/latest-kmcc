import express from "express";
import {
  createExclusiveMember,
  getAllExclusiveMembers,
  getExclusiveMember,
  updateExclusiveMember,
  deleteExclusiveMember,
  reorderExclusiveMembers,
} from "../controllers/exclusiveMemberController";
import { upload } from "../controllers/adminController";


const router = express.Router();

router.post("/", upload.single("image"), createExclusiveMember);
router.get("/", getAllExclusiveMembers);
router.get("/:id", getExclusiveMember);
router.put("/:id", upload.single("image"), updateExclusiveMember);
router.delete("/:id", deleteExclusiveMember);
router.post("/reorder-members", reorderExclusiveMembers);

export default router;
