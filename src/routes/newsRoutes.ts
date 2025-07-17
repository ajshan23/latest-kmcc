import express from "express";
import { createNews, getAllNews, getNewsById, updateNews, deleteNews } from "../controllers/newsController";
import { upload } from "../controllers/adminController";


const router = express.Router();

router.post("/", upload.fields([{ name: "image" }, { name: "authorImage" }]), createNews); // ✅ Create News
router.get("/", getAllNews); // ✅ Get All News
router.get("/:id", getNewsById); // ✅ Get Single News
router.put("/:id", upload.fields([{ name: "image" }, { name: "authorImage" }]), updateNews); // ✅ Update News
router.delete("/:id", deleteNews); // ✅ Delete News

export default router;
