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
exports.closeInvestment = exports.getInvestmentDetails = exports.getInvestments = exports.checkActiveInvestment = exports.getUserInvestments = exports.createInvestment = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Create Investment
// Create Investment - Updated to check for existing active investment
exports.createInvestment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, initialDeposit, notes } = req.body;
    if (!userId) {
        throw new apiHandlerHelpers_1.ApiError(400, "User ID is required");
    }
    const userIdNumber = parseInt(userId);
    if (isNaN(userIdNumber)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid user ID format");
    }
    try {
        // Check for existing active investment
        const existingActive = yield db_1.prismaClient.longTermInvestment.findFirst({
            where: {
                userId: userIdNumber,
                isActive: true,
            },
        });
        if (existingActive) {
            throw new apiHandlerHelpers_1.ApiError(400, "User already has an active investment");
        }
        const investment = yield db_1.prismaClient.longTermInvestment.create({
            data: {
                userId: userIdNumber,
                totalDeposited: initialDeposit ? parseFloat(initialDeposit) : 0,
                deposits: initialDeposit
                    ? {
                        create: [
                            {
                                amount: parseFloat(initialDeposit),
                                notes: notes || null, // Include notes in the deposit record
                            },
                        ],
                    }
                    : undefined,
            },
            include: {
                user: true,
                deposits: true,
            },
        });
        res
            .status(201)
            .json(new apiHandlerHelpers_1.ApiResponse(201, investment, "Investment created successfully"));
    }
    catch (error) {
        if (error instanceof apiHandlerHelpers_1.ApiError) {
            throw error;
        }
        console.error("Error creating investment:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to create investment");
    }
}));
// Get All Investments for User
exports.getUserInvestments = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid user ID");
    }
    try {
        const investments = yield db_1.prismaClient.longTermInvestment.findMany({
            where: { userId },
            include: {
                deposits: { orderBy: { depositDate: "desc" } },
                profitPayouts: { orderBy: { payoutDate: "desc" } },
                user: true,
            },
            orderBy: { startDate: "desc" },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, investments, "Investments retrieved"));
    }
    catch (error) {
        console.error("Error fetching investments:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch investments");
    }
}));
exports.checkActiveInvestment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate userId parameter
    if (!req.query.userId) {
        throw new apiHandlerHelpers_1.ApiError(400, "User ID query parameter is required");
    }
    const userId = parseInt(req.query.userId);
    if (isNaN(userId) || userId <= 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid user ID - must be a positive number");
    }
    try {
        const activeInvestment = yield db_1.prismaClient.longTermInvestment.findFirst({
            where: {
                userId,
                isActive: true,
            },
            select: {
                id: true,
                startDate: true,
                totalDeposited: true,
            },
        });
        res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
            hasActiveInvestment: !!activeInvestment,
            activeInvestment: activeInvestment || null,
        }, "Active investment check completed"));
    }
    catch (error) {
        console.error("Error checking active investment:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to check active investment");
    }
}));
// Get All Investments
exports.getInvestments = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investments = yield db_1.prismaClient.longTermInvestment.findMany({
            include: {
                user: true,
                deposits: { orderBy: { depositDate: "desc" }, take: 1 },
                profitPayouts: { orderBy: { payoutDate: "desc" }, take: 1 },
            },
            orderBy: { createdAt: "desc" },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, investments, "Investments retrieved"));
    }
    catch (error) {
        console.error("Error fetching investments:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch investments");
    }
}));
// Get Investment Details
exports.getInvestmentDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    try {
        const investment = yield db_1.prismaClient.longTermInvestment.findUnique({
            where: { id: investmentId },
            include: {
                user: true,
                deposits: { orderBy: { depositDate: "desc" } },
                profitPayouts: { orderBy: { payoutDate: "desc" } },
            },
        });
        if (!investment) {
            throw new apiHandlerHelpers_1.ApiError(404, "Investment not found");
        }
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, investment, "Investment details retrieved"));
    }
    catch (error) {
        console.error("Error fetching investment:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch investment details");
    }
}));
// Close Investment
exports.closeInvestment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    try {
        // Check if there's any pending profit
        const investment = yield db_1.prismaClient.longTermInvestment.findUnique({
            where: { id: investmentId },
        });
        if (!investment) {
            throw new apiHandlerHelpers_1.ApiError(404, "Investment not found");
        }
        if (investment.profitPending > 0) {
            throw new apiHandlerHelpers_1.ApiError(400, "Cannot close investment with pending profit");
        }
        const updatedInvestment = yield db_1.prismaClient.longTermInvestment.update({
            where: { id: investmentId },
            data: {
                isActive: false,
                endDate: new Date(),
            },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, updatedInvestment, "Investment closed successfully"));
    }
    catch (error) {
        console.error("Error closing investment:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to close investment");
    }
}));
