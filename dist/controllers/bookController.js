"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadBookPdf = exports.getRecentBooks = exports.deleteBook = exports.updateBook = exports.getBookById = exports.getAllBooks = exports.createBook = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
const sharp_1 = __importDefault(require("sharp"));
exports.createBook = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, author, description } = req.body;
    if (!title || !author || !req.files) {
        throw new apiHandlerHelpers_1.ApiError(400, "Title, author, and both PDF and cover image are required.");
    }
    const files = req.files;
    if (!files.pdf || !files.coverImage) {
        throw new apiHandlerHelpers_1.ApiError(400, "Both PDF file and cover image are required.");
    }
    try {
        // Compress the cover image
        const compressedCoverImage = yield (0, sharp_1.default)(files.coverImage[0].buffer)
            .resize(800)
            .jpeg({ quality: 80 })
            .toBuffer();
        const book = yield db_1.prismaClient.book.create({
            data: {
                title,
                author,
                description: description || null,
                pdfData: files.pdf[0].buffer, // Store PDF as-is
                coverImage: compressedCoverImage,
            },
        });
        res
            .status(201)
            .json(new apiHandlerHelpers_1.ApiResponse(201, book, "Book created successfully."));
    }
    catch (error) {
        console.error("Error creating book:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Internal Server Error.");
    }
}));
exports.getAllBooks = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { page, limit } = req.query;
        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const books = yield db_1.prismaClient.book.findMany({
            skip,
            take: pageSize,
            select: {
                id: true,
                title: true,
                author: true,
                description: true,
                coverImage: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const formattedBooks = books.map((book) => (Object.assign(Object.assign({}, book), { coverImage: book.coverImage
                ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString("base64")}`
                : null })));
        const totalBooks = yield db_1.prismaClient.book.count();
        const totalPages = Math.ceil(totalBooks / pageSize);
        res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
            currentPage: pageNumber,
            totalPages,
            pageSize,
            totalBooks,
            books: formattedBooks,
        }, "Books retrieved successfully."));
    }
    catch (error) {
        console.error("Error fetching books:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error retrieving books");
    }
}));
exports.getBookById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bookId = Number(req.params.id);
    if (isNaN(bookId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid book ID.");
    try {
        const book = yield db_1.prismaClient.book.findUnique({
            where: { id: bookId },
        });
        if (!book)
            throw new apiHandlerHelpers_1.ApiError(404, "Book not found.");
        const formattedBook = Object.assign(Object.assign({}, book), { coverImage: `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString("base64")}`, pdfData: `data:application/pdf;base64,${Buffer.from(book.pdfData).toString("base64")}` });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, formattedBook, "Book retrieved successfully."));
    }
    catch (error) {
        console.error("Error fetching book:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error retrieving book");
    }
}));
exports.updateBook = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, author, description } = req.body;
    const { id } = req.params;
    try {
        const existingBook = yield db_1.prismaClient.book.findUnique({
            where: { id: Number(id) },
        });
        if (!existingBook) {
            throw new apiHandlerHelpers_1.ApiError(404, "Book not found.");
        }
        const files = req.files;
        let updatedCoverImage = existingBook.coverImage;
        let updatedPdfData = existingBook.pdfData;
        if (files === null || files === void 0 ? void 0 : files.coverImage) {
            updatedCoverImage = yield (0, sharp_1.default)(files.coverImage[0].buffer)
                .resize(800)
                .jpeg({ quality: 80 })
                .toBuffer();
        }
        if (files === null || files === void 0 ? void 0 : files.pdf) {
            updatedPdfData = files.pdf[0].buffer;
        }
        const updatedBook = yield db_1.prismaClient.book.update({
            where: { id: Number(id) },
            data: {
                title: title || existingBook.title,
                author: author || existingBook.author,
                description: description || existingBook.description,
                coverImage: updatedCoverImage,
                pdfData: updatedPdfData,
            },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, updatedBook, "Book updated successfully."));
    }
    catch (error) {
        console.error("Error updating book:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error updating book");
    }
}));
exports.deleteBook = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bookId = Number(req.params.id);
    if (isNaN(bookId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid book ID.");
    try {
        const existingBook = yield db_1.prismaClient.book.findUnique({
            where: { id: bookId },
        });
        if (!existingBook)
            throw new apiHandlerHelpers_1.ApiError(404, "Book not found.");
        yield db_1.prismaClient.book.delete({ where: { id: bookId } });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, null, "Book deleted successfully."));
    }
    catch (error) {
        console.error("Error deleting book:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error deleting book");
    }
}));
exports.getRecentBooks = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit } = req.query;
        const bookLimit = parseInt(limit) || 5; // Default to 5 recent books
        const recentBooks = yield db_1.prismaClient.book.findMany({
            take: bookLimit,
            select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const formattedBooks = recentBooks.map((book) => (Object.assign(Object.assign({}, book), { coverImage: book.coverImage
                ? `data:image/jpeg;base64,${Buffer.from(book.coverImage).toString("base64")}`
                : null })));
        res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
            count: recentBooks.length,
            books: formattedBooks,
        }, "Recent books retrieved successfully."));
    }
    catch (error) {
        console.error("Error fetching recent books:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error retrieving recent books");
    }
}));
exports.downloadBookPdf = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bookId = Number(req.params.id);
    if (isNaN(bookId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid book ID.");
    try {
        const book = yield db_1.prismaClient.book.findUnique({
            where: { id: bookId },
            select: {
                title: true,
                author: true,
                pdfData: true,
            },
        });
        if (!book)
            throw new apiHandlerHelpers_1.ApiError(404, "Book not found.");
        if (!book.pdfData)
            throw new apiHandlerHelpers_1.ApiError(404, "PDF not available for this book.");
        // Sanitize filename
        const sanitizeFilename = (str) => str.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
        const safeTitle = sanitizeFilename(book.title);
        const safeAuthor = sanitizeFilename(book.author);
        const filename = `${safeTitle}-${safeAuthor}.pdf`;
        // Set headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", book.pdfData.length);
        // Send the PDF buffer directly
        res.end(book.pdfData);
    }
    catch (error) {
        console.error("Error downloading book PDF:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error downloading book PDF");
    }
}));
