"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exclusiveMemberController_1 = require("../controllers/exclusiveMemberController");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
router.post("/", adminController_1.upload.single("image"), exclusiveMemberController_1.createExclusiveMember);
router.get("/", exclusiveMemberController_1.getAllExclusiveMembers);
router.get("/:id", exclusiveMemberController_1.getExclusiveMember);
router.put("/:id", adminController_1.upload.single("image"), exclusiveMemberController_1.updateExclusiveMember);
router.delete("/:id", exclusiveMemberController_1.deleteExclusiveMember);
router.post("/reorder-members", exclusiveMemberController_1.reorderExclusiveMembers);
exports.default = router;
