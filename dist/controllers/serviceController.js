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
exports.uploadMiddleware = exports.deleteService = exports.updateService = exports.updateServiceImage = exports.updateServiceDetails = exports.getServiceById = exports.getAllServices = exports.createService = void 0;
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Multer setup for handling image uploads
const storage = multer_1.default.memoryStorage(); // Store file in memory as Buffer
const upload = (0, multer_1.default)({ storage });
// ✅ Create a Service
exports.createService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, location, startingTime, stoppingTime, availableDays, phoneNumber, } = req.body;
    // Validate required fields
    if (!title ||
        !location ||
        !startingTime ||
        !stoppingTime ||
        !availableDays) {
        throw new apiHandlerHelpers_1.ApiError(400, "All fields are required.");
    }
    let imageBuffer = null;
    // Process image if uploaded
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(300, 300) // Resize to 300x300
            .jpeg({ quality: 80 }) // Compress image
            .toBuffer();
    }
    // Create the service
    const service = yield db_1.prismaClient.service.create({
        data: {
            title,
            location,
            startingTime,
            stoppingTime,
            availableDays,
            image: imageBuffer,
            phoneNumber,
        },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, service, "Service created successfully."));
}));
// ✅ Get All Services (Paginated)
exports.getAllServices = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { page, limit, search } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const searchQuery = search || "";
    const skip = (pageNumber - 1) * pageSize;
    // Fetch services with optional search filter
    const services = yield db_1.prismaClient.service.findMany({
        skip,
        take: pageSize,
        where: {
            title: {
                contains: searchQuery,
            },
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            location: true,
            startingTime: true,
            stoppingTime: true,
            availableDays: true,
            image: true,
            createdAt: true,
            updatedAt: true,
            phoneNumber: true,
        },
    });
    // Convert image Buffer to Base64 safely
    const formattedServices = services.map((service) => (Object.assign(Object.assign({}, service), { image: service.image
            ? `data:image/jpeg;base64,${Buffer.from(service.image).toString("base64")}`
            : null })));
    // Get total count with the same search filter
    const totalServices = yield db_1.prismaClient.service.count({
        where: {
            title: {
                contains: searchQuery,
            },
        },
    });
    const totalPages = Math.ceil(totalServices / pageSize);
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
        currentPage: pageNumber,
        totalPages,
        pageSize,
        totalServices,
        services: formattedServices,
        searchQuery: searchQuery || null, // include the search query in response
    }, searchQuery
        ? `Service list filtered by '${searchQuery}' retrieved successfully.`
        : "Service list retrieved successfully."));
}));
// ✅ Get Single Service
exports.getServiceById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid service ID.");
    const service = yield db_1.prismaClient.service.findUnique({
        where: { id: serviceId },
    });
    if (!service)
        throw new apiHandlerHelpers_1.ApiError(404, "Service not found.");
    // Convert image Buffer to Base64 safely
    const imageData = service.image
        ? `data:image/jpeg;base64,${Buffer.from(service.image).toString("base64")}`
        : null;
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, Object.assign(Object.assign({}, service), { image: imageData }), "Service retrieved successfully."));
}));
// ✅ Update Service (Except Image)
exports.updateServiceDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid service ID.");
    const { title, location, startingTime, stoppingTime, availableDays, phoneNumber, } = req.body;
    // Check if the service exists
    const existingService = yield db_1.prismaClient.service.findUnique({
        where: { id: serviceId },
    });
    if (!existingService)
        throw new apiHandlerHelpers_1.ApiError(404, "Service not found.");
    // Update the service (excluding image)
    const updatedService = yield db_1.prismaClient.service.update({
        where: { id: serviceId },
        data: {
            title: (title === null || title === void 0 ? void 0 : title.trim()) || existingService.title,
            location: (location === null || location === void 0 ? void 0 : location.trim()) || existingService.location,
            startingTime: startingTime || existingService.startingTime,
            stoppingTime: stoppingTime || existingService.stoppingTime,
            availableDays: availableDays || existingService.availableDays,
            phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || existingService.phoneNumber,
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedService, "Service details updated successfully."));
}));
// ✅ Update Service Image Only
exports.updateServiceImage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid service ID.");
    // Check if the service exists
    const existingService = yield db_1.prismaClient.service.findUnique({
        where: { id: serviceId },
    });
    if (!existingService)
        throw new apiHandlerHelpers_1.ApiError(404, "Service not found.");
    let imageBuffer = null;
    // Process image if uploaded
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(300, 300)
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    // Update the service image
    const updatedService = yield db_1.prismaClient.service.update({
        where: { id: serviceId },
        data: {
            image: imageBuffer,
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedService, "Service image updated successfully."));
}));
// Update the updateService function to handle both data and image
exports.updateService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid service ID.");
    const { title, location, startingTime, stoppingTime, availableDays, phoneNumber, } = req.body;
    // Check if the service exists
    const existingService = yield db_1.prismaClient.service.findUnique({
        where: { id: serviceId },
    });
    if (!existingService)
        throw new apiHandlerHelpers_1.ApiError(404, "Service not found.");
    // Process image if uploaded
    let imageBuffer = null;
    if (req.file) {
        imageBuffer = yield (0, sharp_1.default)(req.file.buffer)
            .resize(300, 300)
            .jpeg({ quality: 80 })
            .toBuffer();
    }
    // Update the service
    const updatedService = yield db_1.prismaClient.service.update({
        where: { id: serviceId },
        data: {
            title: (title === null || title === void 0 ? void 0 : title.trim()) || existingService.title,
            location: (location === null || location === void 0 ? void 0 : location.trim()) || existingService.location,
            startingTime: startingTime || existingService.startingTime,
            stoppingTime: stoppingTime || existingService.stoppingTime,
            availableDays: availableDays || existingService.availableDays,
            phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || existingService.phoneNumber,
            image: imageBuffer || existingService.image,
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedService, "Service updated successfully."));
}));
// ✅ Delete Service
exports.deleteService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid service ID.");
    // Directly attempt to delete without redundant lookup
    const deletedService = yield db_1.prismaClient.service
        .delete({ where: { id: serviceId } })
        .catch(() => null);
    if (!deletedService)
        throw new apiHandlerHelpers_1.ApiError(404, "Service not found.");
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, null, "Service deleted successfully."));
}));
// ✅ Export Multer Middleware
exports.uploadMiddleware = upload.single("image");
