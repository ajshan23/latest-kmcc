import ExcelJS from "exceljs";

export const generateExcel = async (data: any) => {
  const workbook = new ExcelJS.Workbook();
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
  data.participants.forEach((participant: any) => {
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
  data.monthlyWinners.forEach((winner: any) => {
    worksheet.addRow([
      winner.month,
      winner.year,
      winner.drawDate,
      winner.winnerName,
      winner.lotNumber,
    ]);
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
