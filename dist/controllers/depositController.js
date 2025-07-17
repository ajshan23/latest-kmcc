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
exports.getInvestmentDeposits = exports.addDeposit = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
// Add Deposit
exports.addDeposit = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    const { amount, notes } = req.body;
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    if (!amount || amount <= 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Valid deposit amount is required");
    }
    try {
        const [deposit, updatedInvestment] = yield db_1.prismaClient.$transaction([
            db_1.prismaClient.investmentDeposit.create({
                data: {
                    investmentId,
                    amount: parseFloat(amount),
                    notes,
                },
            }),
            db_1.prismaClient.longTermInvestment.update({
                where: { id: investmentId },
                data: {
                    totalDeposited: { increment: parseFloat(amount) },
                },
            }),
        ]);
        res
            .status(201)
            .json(new apiHandlerHelpers_1.ApiResponse(201, deposit, "Deposit recorded successfully"));
    }
    catch (error) {
        console.error("Error recording deposit:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to record deposit");
    }
}));
// Get All Deposits for Investment
exports.getInvestmentDeposits = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const investmentId = parseInt(req.params.id);
    if (isNaN(investmentId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid investment ID");
    }
    try {
        const deposits = yield db_1.prismaClient.investmentDeposit.findMany({
            where: { investmentId },
            orderBy: { depositDate: "desc" },
        });
        res
            .status(200)
            .json(new apiHandlerHelpers_1.ApiResponse(200, deposits, "Deposits retrieved successfully"));
    }
    catch (error) {
        console.error("Error fetching deposits:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch deposits");
    }
}));
