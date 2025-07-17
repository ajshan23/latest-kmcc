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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAirports = exports.deleteTravel = exports.updateTravel = exports.getUpcomingTravels = exports.getAllTravels = exports.addTravel = void 0;
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const notify_1 = require("../utils/notify");
// ➤ Add a travel entry
exports.addTravel = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { fromAirportId, toAirportId, travelDate, travelTime } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId ||
        !fromAirportId ||
        !toAirportId ||
        !travelDate ||
        !travelTime) {
        throw new apiHandlerHelpers_1.ApiError(400, "All fields are required.");
    }
    // Validate airports exist
    const [fromAirport, toAirport] = yield Promise.all([
        db_1.prismaClient.airport.findUnique({ where: { id: fromAirportId } }),
        db_1.prismaClient.airport.findUnique({ where: { id: toAirportId } }),
    ]);
    if (!fromAirport || !toAirport) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid airport selection");
    }
    const travel = yield db_1.prismaClient.travel.create({
        data: {
            userId,
            fromAirportId,
            toAirportId,
            travelDate: new Date(travelDate),
            travelTime,
            status: "AVAILABLE",
        },
        include: {
            fromAirport: true,
            toAirport: true,
            user: { select: { name: true, email: true } },
        },
    });
    yield (0, notify_1.sendGlobalNotification)({
        title: "Hey KMCC Members!",
        body: "Check out the latest travel update!",
        data: { type: "news", travelId: travel.id.toString() },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, travel, "Travel details added successfully"));
}));
// ➤ Get all travel records
exports.getAllTravels = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const travels = yield db_1.prismaClient.travel.findMany({
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    phoneNumber: true,
                    areaName: true,
                },
            },
            fromAirport: true,
            toAirport: true,
        },
        orderBy: { travelDate: "desc" },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, travels, "Travel data retrieved successfully"));
}));
/**
 * @desc    Get upcoming travels (after current time) with pagination
 * @route   GET /api/travel/upcoming
 * @access  Private
 */
exports.getUpcomingTravels = (0, asyncHandler_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const currentDate = new Date();
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    // Count total upcoming travels for pagination metadata
    const totalTravels = yield db_1.prismaClient.travel.count({
        where: {
            travelDate: {
                gte: currentDate,
            },
        },
    });
    const travels = yield db_1.prismaClient.travel.findMany({
        where: {
            travelDate: {
                gte: currentDate,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    memberId: true,
                },
            },
            fromAirport: true,
            toAirport: true,
        },
        orderBy: {
            travelDate: "asc",
        },
        skip,
        take: limit,
    });
    // Add isAccessed field if user is the creator
    const travelsWithAccess = travels.map((travel) => (Object.assign(Object.assign({}, travel), { isAccessed: travel.user.id === userId })));
    // Pagination metadata
    const pagination = {
        total: totalTravels,
        totalPages: Math.ceil(totalTravels / limit),
        currentPage: page,
        hasNextPage: page * limit < totalTravels,
        hasPreviousPage: page > 1,
    };
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
        travels: travelsWithAccess,
        pagination,
    }, "Upcoming travels fetched successfully"));
}));
// ➤ Update travel record (full update)
exports.updateTravel = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { fromAirportId, toAirportId, travelDate, travelTime, status } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        throw new apiHandlerHelpers_1.ApiError(401, "Unauthorized");
    }
    // Validate required fields
    if (!fromAirportId ||
        !toAirportId ||
        !travelDate ||
        !travelTime ||
        !status) {
        throw new apiHandlerHelpers_1.ApiError(400, "All fields are required.");
    }
    if (!["AVAILABLE", "ONBOARD", "NOT_AVAILABLE"].includes(status)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid status provided");
    }
    // Check if travel record exists
    const travel = yield db_1.prismaClient.travel.findUnique({
        where: { id: Number(id) },
    });
    if (!travel) {
        throw new apiHandlerHelpers_1.ApiError(404, "Travel record not found");
    }
    // Validate airports exist
    const [fromAirport, toAirport] = yield Promise.all([
        db_1.prismaClient.airport.findUnique({ where: { id: fromAirportId } }),
        db_1.prismaClient.airport.findUnique({ where: { id: toAirportId } }),
    ]);
    if (!fromAirport || !toAirport) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid airport selection");
    }
    // Update travel record
    const updatedTravel = yield db_1.prismaClient.travel.update({
        where: { id: Number(id) },
        data: {
            fromAirportId,
            toAirportId,
            travelDate: new Date(travelDate),
            travelTime,
            status,
        },
        include: {
            fromAirport: true,
            toAirport: true,
            user: { select: { name: true } },
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, updatedTravel, "Travel record updated successfully"));
}));
exports.deleteTravel = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const isAdmin = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isAdmin; // Assuming your auth middleware adds isAdmin
    if (!userId) {
        throw new apiHandlerHelpers_1.ApiError(401, "Unauthorized");
    }
    // Find the travel record
    const travel = yield db_1.prismaClient.travel.findUnique({
        where: { id: Number(id) },
    });
    if (!travel) {
        throw new apiHandlerHelpers_1.ApiError(404, "Travel record not found");
    }
    // Check if the user is the owner or an admin
    if (travel.userId !== userId && !isAdmin) {
        throw new apiHandlerHelpers_1.ApiError(403, "You are not authorized to delete this travel record");
    }
    // Delete travel record
    yield db_1.prismaClient.travel.delete({
        where: { id: Number(id) },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, {}, "Travel record deleted successfully"));
}));
// ➤ Get all airports
exports.getAirports = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const airports = yield db_1.prismaClient.airport.findMany({
        orderBy: { name: "asc" },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, airports, "Airports retrieved successfully"));
}));
