"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookController_1 = require("../controllers/bookController");
const upload_1 = require("../helpers/upload");
const router = express_1.default.Router();
router.get("/recent/books", bookController_1.getRecentBooks);
// Apply authentication middleware to all routes
// router.use(authenticateUser);
// Create a book
router.post("/", upload_1.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]), bookController_1.createBook);
// Get recent books
// Get all books
router.get("/", bookController_1.getAllBooks);
// Download book PDF (should come BEFORE "/:id" route)
router.get("/:id/download", bookController_1.downloadBookPdf);
// Get a single book by ID
router.get("/:id", bookController_1.getBookById);
// Update a book
router.put("/:id", upload_1.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]), bookController_1.updateBook);
// Delete a book
router.delete("/:id", bookController_1.deleteBook);
exports.default = router;
