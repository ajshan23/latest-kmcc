import express from "express";
import {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getRecentBooks,
  downloadBookPdf,
} from "../controllers/bookController";
import { upload } from "../helpers/upload";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router();
router.get("/recent/books", getRecentBooks);
// Apply authentication middleware to all routes
// router.use(authenticateUser);

// Create a book
router.post(
  "/",
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  createBook
);

// Get recent books

// Get all books
router.get("/", getAllBooks);

// Download book PDF (should come BEFORE "/:id" route)
router.get("/:id/download", downloadBookPdf);

// Get a single book by ID
router.get("/:id", getBookById);

// Update a book
router.put(
  "/:id",
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateBook
);

// Delete a book
router.delete("/:id", deleteBook);

export default router;
