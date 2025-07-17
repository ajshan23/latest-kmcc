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
exports.deleteNews = exports.updateNews = exports.getNewsById = exports.getAllNews = exports.createNews = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
const sharp_1 = __importDefault(require("sharp"));
const notify_1 = require("../utils/notify");
exports.createNews = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, heading, author, body, timeToRead } = req.body;
    if (!type || !heading || !author || !body || !timeToRead || !req.files) {
        throw new apiHandlerHelpers_1.ApiError(400, "All fields are required, including the images and timeToRead.");
    }
    const files = req.files;
    if (!files.image || !files.authorImage) {
        throw new apiHandlerHelpers_1.ApiError(400, "Both news image and author image are required.");
    }
    try {
        const compressedImage = yield (0, sharp_1.default)(files.image[0].buffer)
            .resize(800)
            .jpeg({ quality: 70 })
            .toBuffer();
        const compressedAuthorImage = yield (0, sharp_1.default)(files.authorImage[0].buffer)
            .resize(200)
            .jpeg({ quality: 70 })
            .toBuffer();
        const news = yield db_1.prismaClient.news.create({
            data: {
                type,
                heading,
                author,
                body,
                timeToRead,
                image: compressedImage,
                authorImage: compressedAuthorImage,
            },
        });
        yield (0, notify_1.sendGlobalNotification)({
            title: heading,
            body: "Check out the latest update!",
            data: { type: "news", newsId: news.id.toString() },
        });
        res
            .status(201)
            .json(new apiHandlerHelpers_1.ApiResponse(201, news, "News created successfully."));
    }
    catch (error) {
        console.error("Error creating news:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Internal Server Error.");
    }
}));
exports.getAllNews = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { page, limit } = req.query;
        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const newsList = yield db_1.prismaClient.news.findMany({
            skip,
            take: pageSize,
            select: {
                id: true,
                type: true,
                heading: true,
                author: true,
                timeToRead: true,
                createdAt: true,
                image: true,
                authorImage: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const formattedNews = newsList.map((news) => (Object.assign(Object.assign({}, news), { image: news.image
                ? `data:image/jpeg;base64,${Buffer.from(news.image).toString("base64")}`
                : null, authorImage: news.authorImage
                ? `data:image/jpeg;base64,${Buffer.from(news.authorImage).toString("base64")}`
                : null })));
        const totalNews = yield db_1.prismaClient.news.count();
        const totalPages = Math.ceil(totalNews / pageSize);
        res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
            currentPage: pageNumber,
            totalPages,
            pageSize,
            totalNews,
            news: formattedNews,
        }, "News list retrieved successfully."));
    }
    catch (error) {
        console.error("Error fetching news:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error retrieving news");
    }
}));
exports.getNewsById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const newsId = Number(req.params.id);
    if (isNaN(newsId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid news ID.");
    try {
        // Get the requested news article
        const news = yield db_1.prismaClient.news.findUnique({
            where: { id: newsId },
        });
        if (!news)
            throw new apiHandlerHelpers_1.ApiError(404, "News not found.");
        // Get related news (excluding the current article)
        const relatedNews = yield db_1.prismaClient.news.findMany({
            where: {
                NOT: { id: newsId }, // Exclude current news
            },
            take: 3, // Limit to 3 related articles
            select: {
                id: true,
                type: true,
                heading: true,
                timeToRead: true,
                createdAt: true,
                image: true,
                author: true,
                authorImage: true,
            },
            orderBy: { createdAt: "desc" },
        });
        // Format the images for both main news and related news
        const formattedNews = Object.assign(Object.assign({}, news), { image: `data:image/jpeg;base64,${Buffer.from(news.image).toString("base64")}`, authorImage: `data:image/jpeg;base64,${Buffer.from(news.authorImage).toString("base64")}`, relatedNews: relatedNews.map((item) => (Object.assign(Object.assign({}, item), { image: item.image
                    ? `data:image/jpeg;base64,${Buffer.from(item.image).toString("base64")}`
                    : null, authorImage: item.authorImage
                    ? `data:image/jpeg;base64,${Buffer.from(item.authorImage).toString("base64")}`
                    : null }))) });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, formattedNews, "News retrieved successfully with related articles."));
    }
    catch (error) {
        console.error("Error fetching news by ID:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error retrieving news");
    }
}));
exports.updateNews = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, heading, author, body, timeToRead } = req.body;
    const { id } = req.params;
    try {
        const existingNews = yield db_1.prismaClient.news.findUnique({
            where: { id: Number(id) },
        });
        if (!existingNews) {
            throw new apiHandlerHelpers_1.ApiError(404, "News not found.");
        }
        const files = req.files;
        let updatedImage = existingNews.image;
        let updatedAuthorImage = existingNews.authorImage;
        if (files === null || files === void 0 ? void 0 : files.image) {
            updatedImage = yield (0, sharp_1.default)(files.image[0].buffer)
                .resize(800)
                .jpeg({ quality: 70 })
                .toBuffer();
        }
        if (files === null || files === void 0 ? void 0 : files.authorImage) {
            updatedAuthorImage = yield (0, sharp_1.default)(files.authorImage[0].buffer)
                .resize(200)
                .jpeg({ quality: 70 })
                .toBuffer();
        }
        const updatedNews = yield db_1.prismaClient.news.update({
            where: { id: Number(id) },
            data: {
                type,
                heading,
                author,
                body,
                timeToRead,
                image: updatedImage,
                authorImage: updatedAuthorImage,
            },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, updatedNews, "News updated successfully."));
    }
    catch (error) {
        console.error("Error updating news:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error updating news");
    }
}));
exports.deleteNews = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const newsId = Number(req.params.id);
    if (isNaN(newsId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid news ID.");
    try {
        const existingNews = yield db_1.prismaClient.news.findUnique({
            where: { id: newsId },
        });
        if (!existingNews)
            throw new apiHandlerHelpers_1.ApiError(404, "News not found.");
        yield db_1.prismaClient.news.delete({ where: { id: newsId } });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, null, "News deleted successfully."));
    }
    catch (error) {
        console.error("Error deleting news:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Error deleting news");
    }
}));
