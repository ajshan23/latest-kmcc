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
exports.generateExcel = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const generateExcel = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet("Cycle Data");
    // Add cycle info
    worksheet.addRow(["Cycle Name", data.cycleName]);
    worksheet.addRow(["Program Name", data.programName]);
    worksheet.addRow(["Start Date", data.startDate]);
    worksheet.addRow(["End Date", data.endDate || "N/A"]);
    worksheet.addRow(["Status", data.status]);
    worksheet.addRow([]);
    // Add participants
    worksheet.addRow(["Participants"]);
    worksheet.addRow([
        "Lot Number",
        "Member Name",
        "Member ID",
        "Payments",
        "Wins",
    ]);
    data.participants.forEach((participant) => {
        worksheet.addRow([
            participant.lotNumber,
            participant.memberName,
            participant.memberId,
            participant.payments,
            participant.wins,
        ]);
    });
    worksheet.addRow([]);
    // Add winners
    worksheet.addRow(["Monthly Winners"]);
    worksheet.addRow(["Month", "Year", "Draw Date", "Winner Name", "Lot Number"]);
    data.monthlyWinners.forEach((winner) => {
        worksheet.addRow([
            winner.month,
            winner.year,
            winner.drawDate,
            winner.winnerName,
            winner.lotNumber,
        ]);
    });
    // Generate buffer
    const buffer = yield workbook.xlsx.writeBuffer();
    return buffer;
});
exports.generateExcel = generateExcel;
