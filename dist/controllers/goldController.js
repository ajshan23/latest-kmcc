"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.deleteLot = exports.deleteWinner = exports.updateWinner = exports.getCurrentWinners = exports.exportPaymentsToExcel = exports.getProgramWinners = exports.addWinners = exports.deletePayment = exports.updatePayment = exports.recordPayment = exports.getLotsByProgram = exports.getLotDetails = exports.assignGoldLot = exports.getProgramDetails = exports.getAllPrograms = exports.getActiveProgram = exports.endGoldProgram = exports.startGoldProgram = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const db_1 = require("../config/db");
const XLSX = __importStar(require("xlsx"));
// ===================== PROGRAM LIFECYCLE =====================
exports.startGoldProgram = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description } = req.body;
    const activeProgram = yield db_1.prismaClient.goldProgram.findFirst({
        where: { isActive: true },
    });
    if (activeProgram)
        throw new apiHandlerHelpers_1.ApiError(400, "Another program is already active");
    const program = yield db_1.prismaClient.goldProgram.create({
        data: { name, description, isActive: true },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, program, "Program started successfully"));
}));
exports.endGoldProgram = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { programId } = req.body;
    const program = yield db_1.prismaClient.goldProgram.update({
        where: { id: programId, isActive: true },
        data: {
            isActive: false,
            endDate: new Date(),
        },
    });
    if (!program)
        throw new apiHandlerHelpers_1.ApiError(404, "No active program found");
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, program, "Program ended successfully"));
}));
// ===================== PROGRAM QUERIES =====================
exports.getActiveProgram = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const program = yield db_1.prismaClient.goldProgram.findFirst({
        where: { isActive: true },
        include: {
            lots: { include: { user: true } },
            winners: { include: { lot: { include: { user: true } } } },
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, program, "Active program retrieved"));
}));
exports.getAllPrograms = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const programs = yield db_1.prismaClient.goldProgram.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { lots: true, winners: true },
            },
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, programs, "All programs retrieved"));
}));
exports.getProgramDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const programId = parseInt(req.params.programId);
    if (isNaN(programId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid program ID");
    const program = yield db_1.prismaClient.goldProgram.findUnique({
        where: { id: programId },
        include: {
            lots: {
                include: {
                    user: true,
                    payments: { orderBy: [{ year: "asc" }, { month: "asc" }] }, // Updated
                    winners: { orderBy: [{ year: "asc" }, { month: "asc" }] }, // Updated
                },
            },
            winners: {
                include: {
                    lot: { include: { user: true } },
                },
                orderBy: [{ year: "desc" }, { month: "asc" }], // New sorting
            },
        },
    });
    if (!program)
        throw new apiHandlerHelpers_1.ApiError(404, "Program not found");
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, program, "Program details retrieved"));
}));
// ===================== LOT MANAGEMENT =====================
exports.assignGoldLot = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { programId, userId } = req.body;
    // Convert programId to number
    const programIdNumber = Number(programId);
    if (isNaN(programIdNumber)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid program ID");
    }
    const [program, user] = yield Promise.all([
        db_1.prismaClient.goldProgram.findFirst({
            where: {
                id: programIdNumber, // Use the converted number
                isActive: true,
            },
        }),
        db_1.prismaClient.user.findUnique({ where: { id: userId } }),
    ]);
    if (!program)
        throw new apiHandlerHelpers_1.ApiError(400, "No active program found");
    if (!user)
        throw new apiHandlerHelpers_1.ApiError(404, "User not found");
    const lot = yield db_1.prismaClient.goldLot.create({
        data: {
            programId: programIdNumber, // Use number here too
            userId,
        },
        include: { user: true },
    });
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, lot, "Lot assigned successfully"));
}));
exports.getLotDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const lotId = parseInt(req.params.lotId);
    if (isNaN(lotId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid lot ID");
    const lot = yield db_1.prismaClient.goldLot.findUnique({
        where: { id: lotId },
        include: {
            user: true,
            program: true,
            payments: { orderBy: { month: "asc" } },
            winners: true,
        },
    });
    if (!lot)
        throw new apiHandlerHelpers_1.ApiError(404, "Lot not found");
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, lot, "Lot details retrieved"));
}));
exports.getLotsByProgram = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const programId = parseInt(req.params.programId);
    if (isNaN(programId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid program ID");
    const lots = yield db_1.prismaClient.goldLot.findMany({
        where: { programId },
        include: {
            user: true,
            payments: true,
            winners: true,
        },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, lots, "Lots retrieved successfully"));
}));
// ===================== PAYMENT MANAGEMENT =====================
exports.recordPayment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { lotId, year, month } = req.body;
    if (!lotId || !month || !year)
        throw new apiHandlerHelpers_1.ApiError(400, "Lot ID, year and month are required");
    lotId = parseInt(lotId);
    year = parseInt(year);
    month = parseInt(month);
    const payment = yield db_1.prismaClient.goldPayment.upsert({
        where: {
            lotId_year_month: { lotId, year, month },
        },
        update: {
            isPaid: true,
            paidAt: new Date(),
        },
        create: {
            lotId,
            year,
            month,
            isPaid: true,
            paidAt: new Date(),
        },
        include: { lot: true },
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, payment, "Payment recorded successfully"));
}));
exports.updatePayment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentId } = req.params;
    const { year, month, lotId } = req.body;
    // Check if this payment already exists for another record
    const existingPayment = yield db_1.prismaClient.goldPayment.findFirst({
        where: {
            id: { not: Number(paymentId) },
            lotId: Number(lotId),
            year: Number(year),
            month: Number(month),
        },
    });
    if (existingPayment) {
        throw new apiHandlerHelpers_1.ApiError(400, "Payment already exists for this month/year");
    }
    const updatedPayment = yield db_1.prismaClient.goldPayment.update({
        where: { id: Number(paymentId) },
        data: {
            year: Number(year),
            month: Number(month),
            paidAt: new Date(),
        },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, updatedPayment, "Payment updated successfully"));
}));
// Delete payment
exports.deletePayment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentId } = req.params;
    const payment = yield db_1.prismaClient.goldPayment.delete({
        where: { id: Number(paymentId) },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, payment, "Payment deleted successfully"));
}));
// ===================== WINNERS MANAGEMENT =====================
exports.addWinners = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { programId, winners } = req.body;
    if (!programId || !winners || winners.length === 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Program ID and winners are required");
    }
    programId = parseInt(programId);
    if (isNaN(programId)) {
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid program ID");
    }
    // Validate all winners have required fields
    for (const winner of winners) {
        if (!winner.lotId || !winner.month || !winner.year) {
            throw new apiHandlerHelpers_1.ApiError(400, "Each winner must have lotId, month, and year");
        }
    }
    const lotIds = winners.map((w) => parseInt(w.lotId));
    const months = winners.map((w) => parseInt(w.month));
    const years = winners.map((w) => parseInt(w.year));
    // Validate lots belong to this program
    const validLots = yield db_1.prismaClient.goldLot.findMany({
        where: {
            id: { in: lotIds },
            programId,
        },
        select: { id: true },
    });
    if (validLots.length !== winners.length) {
        throw new apiHandlerHelpers_1.ApiError(400, "Some lots don't belong to this program");
    }
    // Check for existing winners for the same month/year combinations
    const existingWinners = yield db_1.prismaClient.goldWinner.findMany({
        where: {
            programId,
            OR: winners.map((w) => ({
                AND: [{ month: parseInt(w.month) }, { year: parseInt(w.year) }],
            })),
        },
    });
    if (existingWinners.length > 0) {
        const conflicts = existingWinners
            .map((w) => `Month ${w.month}, Year ${w.year}`)
            .join(", ");
        throw new apiHandlerHelpers_1.ApiError(400, `Winners already exist for: ${conflicts}`);
    }
    // Check if any lots have already won (in any year)
    const alreadyWinningLots = yield db_1.prismaClient.goldWinner.findMany({
        where: {
            programId,
            lotId: { in: lotIds },
        },
        distinct: ["lotId"],
    });
    if (alreadyWinningLots.length > 0) {
        const wonIds = alreadyWinningLots.map((w) => w.lotId).join(", ");
        throw new apiHandlerHelpers_1.ApiError(400, `Lot(s) already won: ${wonIds}`);
    }
    // Create all winners in a transaction
    const createdWinners = yield db_1.prismaClient.$transaction(winners.map((winner) => db_1.prismaClient.goldWinner.create({
        data: {
            programId,
            lotId: parseInt(winner.lotId),
            month: parseInt(winner.month),
            year: parseInt(winner.year),
            prizeAmount: winner.prizeAmount
                ? parseFloat(winner.prizeAmount)
                : undefined,
        },
        include: {
            lot: {
                include: {
                    user: true,
                },
            },
        },
    })));
    res
        .status(201)
        .json(new apiHandlerHelpers_1.ApiResponse(201, createdWinners, "Winners added successfully!"));
}));
exports.getProgramWinners = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const programId = parseInt(req.params.programId);
    if (isNaN(programId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid program ID");
    const winners = yield db_1.prismaClient.goldWinner.findMany({
        where: { programId },
        include: {
            lot: { include: { user: true } },
        },
        orderBy: [
            { year: "desc" }, // New: Sort by year first
            { month: "asc" }, // Then by month
        ],
    });
    res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, winners, "Program winners retrieved"));
}));
exports.exportPaymentsToExcel = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const programId = parseInt(req.params.programId);
    if (isNaN(programId))
        throw new apiHandlerHelpers_1.ApiError(400, "Invalid program ID");
    // Get program name for filename
    const program = yield db_1.prismaClient.goldProgram.findUnique({
        where: { id: programId },
        select: { name: true },
    });
    // Get all lots with payments and user info
    const lots = yield db_1.prismaClient.goldLot.findMany({
        where: { programId },
        include: {
            user: true,
            payments: {
                where: { isPaid: true },
                orderBy: [{ year: "asc" }, { month: "asc" }],
            },
        },
    });
    if (!lots.length) {
        throw new apiHandlerHelpers_1.ApiError(404, "No lots found for this program");
    }
    // Prepare Excel data
    const excelData = lots.map((lot) => ({
        "Member ID": lot.user.memberId,
        Name: lot.user.name,
        "Total Payments": lot.payments.length,
        "Payment Dates": lot.payments
            .map((p) => `${p.year}-${String(p.month).padStart(2, "0")}`)
            .join(", "),
        "Last Payment": lot.payments.length
            ? `${lot.payments[lot.payments.length - 1].year}-${String(lot.payments[lot.payments.length - 1].month).padStart(2, "0")}`
            : "None",
    }));
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
    });
    // Set response headers
    const filename = `gold_payments_${(program === null || program === void 0 ? void 0 : program.name) || programId}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    // Send the Excel file
    res.send(Buffer.from(buffer));
}));
exports.getCurrentWinners = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();
    // First try to find winners for current month
    let winners = yield db_1.prismaClient.goldWinner.findMany({
        where: {
            month: currentMonth,
            year: currentYear,
        },
        include: {
            lot: {
                include: {
                    user: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });
    let selectedMonth = currentMonth;
    let selectedYear = currentYear;
    let isFallback = false;
    // If no winners found for current month, try previous month
    if (winners.length === 0) {
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = currentYear - 1;
        }
        winners = yield db_1.prismaClient.goldWinner.findMany({
            where: {
                month: prevMonth,
                year: prevYear,
            },
            include: {
                lot: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        if (winners.length > 0) {
            selectedMonth = prevMonth;
            selectedYear = prevYear;
            isFallback = true;
        }
    }
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
        winners,
        month: selectedMonth,
        year: selectedYear,
        isFallback,
    }, "Winners retrieved successfully"));
}));
exports.updateWinner = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { winnerId } = req.params;
    const { month, year, lotId, prizeAmount, programId } = req.body;
    // Check if the new month/year combination already has a winner
    const existingWinner = yield db_1.prismaClient.goldWinner.findFirst({
        where: {
            id: { not: Number(winnerId) },
            month: Number(month),
            year: Number(year),
            programId: Number(programId),
        },
    });
    if (existingWinner) {
        throw new apiHandlerHelpers_1.ApiError(400, "This month/year combination already has a winner");
    }
    const updatedWinner = yield db_1.prismaClient.goldWinner.update({
        where: { id: Number(winnerId) },
        data: {
            month: Number(month),
            year: Number(year),
            lotId: Number(lotId),
            prizeAmount: prizeAmount ? parseFloat(prizeAmount) : null,
            programId: programId,
        },
        include: {
            lot: {
                include: {
                    user: true,
                },
            },
        },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, updatedWinner, "Winner updated successfully"));
}));
// Delete winner
exports.deleteWinner = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { winnerId } = req.params;
    const winner = yield db_1.prismaClient.goldWinner.delete({
        where: { id: Number(winnerId) },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, winner, "Winner deleted successfully"));
}));
// Delete lot
exports.deleteLot = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lotId } = req.params;
    // Check if lot has any payments or winners
    const lot = yield db_1.prismaClient.goldLot.findUnique({
        where: { id: Number(lotId) },
        include: { payments: true, winners: true },
    });
    if (lot === null) {
        throw new apiHandlerHelpers_1.ApiError(400, "Cannot delete lot ");
    }
    if (lot.winners.length > 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Cannot delete lot with winners");
    }
    if (lot.payments.length > 0) {
        throw new apiHandlerHelpers_1.ApiError(400, "Cannot delete lot with payments");
    }
    yield db_1.prismaClient.goldLot.delete({
        where: { id: Number(lotId) },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(200, null, "Lot deleted successfully"));
}));
