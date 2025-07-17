"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subwingController_1 = require("../controllers/subwingController");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// Create sub-wing with optional icon
router.post("/", adminController_1.upload.single("icon"), subwingController_1.createSubWing);
// Get all sub-wings
router.get("/", subwingController_1.getAllSubWings);
// Get specific sub-wing details
router.get("/:subWingId", subwingController_1.getSubWingDetails);
router.put("/:subWingId", adminController_1.upload.single("icon"), subwingController_1.updateSubWing);
// Add member to sub-wing with optional image
router.post("/:subWingId/members", adminController_1.upload.single("image"), subwingController_1.addSubWingMember);
// Get members of specific sub-wing
router.get("/:subWingId/members", subwingController_1.getSubWingMembers);
// Add these routes
router.delete("/:subWingId/members/:memberId", subwingController_1.deleteSubWingMember);
router.put("/:subWingId/members/:memberId", adminController_1.upload.single("image"), subwingController_1.updateSubWingMember);
exports.default = router;
