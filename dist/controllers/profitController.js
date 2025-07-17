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
exports.getProfitSummary = exports.getInvestmentProfitPayouts = exports.addProfitPayout = exports.addProfit = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Add Profit (total profit earned)
exports.addProfit = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    const { amount, notes } = req.body;
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    if (!amount || amount <= 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Valid profit amount is required");
    }
    try {
        const updatedInvestment = yield db_1.prismaClient.longTermInvestment.update({
            where: { id: investmentId },
            data: {
                totalProfit: { increment: parseFloat(amount) },
                profitPending: { increment: parseFloat(amount) },
            },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, updatedInvestment, "Profit added successfully"));
    }
    catch (error) {
        console.error("Error adding profit:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to add profit");
    }
}));
// Add Profit Payout (amount given to user)
exports.addProfitPayout = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    const { amount, notes, payoutDate } = req.body;
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    if (!amount || amount <= 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Valid payout amount is required");
    }
    try {
        // Check if enough pending profit exists
        const investment = yield db_1.prismaClient.longTermInvestment.findUnique({
            where: { id: investmentId },
        });
        if (!investment) {
            throw new apiHandlerHelpers_1.ApiError(404, "Investment not found");
        }
        if (investment.profitPending < parseFloat(amount)) {
            throw new apiHandlerHelpers_1.ApiError(400, "Not enough pending profit to distribute");
        }
        const [payout, updatedInvestment] = yield db_1.prismaClient.$transaction([
            db_1.prismaClient.profitPayout.create({
                data: {
                    investmentId,
                    amount: parseFloat(amount),
                    notes,
                    payoutDate: payoutDate ? new Date(payoutDate) : new Date(),
                },
            }),
            db_1.prismaClient.longTermInvestment.update({
                where: { id: investmentId },
                data: {
                    profitDistributed: { increment: parseFloat(amount) },
                    profitPending: { decrement: parseFloat(amount) },
                },
            }),
        ]);
        res
            .status(201)
            .json(new apiHandlerHelpers_1.ApiResponse(201, payout, "Profit payout recorded successfully"));
    }
    catch (error) {
        console.error("Error recording profit payout:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to record profit payout");
    }
}));
// Get All Profit Payouts for Investment
exports.getInvestmentProfitPayouts = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    try {
        const payouts = yield db_1.prismaClient.profitPayout.findMany({
            where: { investmentId },
            orderBy: { payoutDate: "desc" },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, payouts, "Profit payouts retrieved successfully"));
    }
    catch (error) {
        console.error("Error fetching profit payouts:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch profit payouts");
    }
}));
// Get Profit Summary
exports.getProfitSummary = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    try {
        const investment = yield db_1.prismaClient.longTermInvestment.findUnique({
            where: { id: investmentId },
            select: {
                totalProfit: true,
                profitDistributed: true,
                profitPending: true,
            },
        });
        if (!investment) {
            throw new apiHandlerHelpers_1.ApiError(404, "Investment not found");
        }
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, investment, "Profit summary retrieved"));
    }
    catch (error) {
        console.error("Error fetching profit summary:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch profit summary");
    }
}));
