"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const newsController_1 = require("../controllers/newsController");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
router.post("/", adminController_1.upload.fields([{ name: "image" }, { name: "authorImage" }]), newsController_1.createNews); // ✅ Create News
router.get("/", newsController_1.getAllNews); // ✅ Get All News
router.get("/:id", newsController_1.getNewsById); // ✅ Get Single News
router.put("/:id", adminController_1.upload.fields([{ name: "image" }, { name: "authorImage" }]), newsController_1.updateNews); // ✅ Update News
router.delete("/:id", newsController_1.deleteNews); // ✅ Delete News
exports.default = router;
