"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const constitutionCommitteeController_1 = require("../controllers/constitutionCommitteeController");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// Committee routes
router.post("/", constitutionCommitteeController_1.createCommittee);
router.get("/", constitutionCommitteeController_1.getAllCommittees);
router.get("/:committeeId", constitutionCommitteeController_1.getCommitteeDetails);
router.put("/:committeeId", constitutionCommitteeController_1.updateCommittee);
router.delete("/:committeeId", constitutionCommitteeController_1.deleteCommittee);
// Committee member routes
router.post("/:committeeId/members", adminController_1.upload.single("image"), constitutionCommitteeController_1.addCommitteeMember);
router.get("/:committeeId/members", constitutionCommitteeController_1.getCommitteeMembers);
router.put("/members/:memberId", adminController_1.upload.single("image"), constitutionCommitteeController_1.updateCommitteeMember);
router.delete("/members/:memberId", constitutionCommitteeController_1.deleteCommitteeMember);
// Add this route before the update/delete member routes
router.get("/members/:memberId", constitutionCommitteeController_1.getCommitteeMember);
exports.default = router;
