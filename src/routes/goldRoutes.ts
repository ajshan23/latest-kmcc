import express from "express";
import {
  // Program Lifecycle
  startGoldProgram,
  endGoldProgram,

  // Program Queries
  getActiveProgram,
  getAllPrograms,
  getProgramDetails,

  // Lot Management
  assignGoldLot,
  getLotDetails,

  // Payment Tracking
  recordPayment,

  // Winners Management
  addWinners,
  getProgramWinners,
  getLotsByProgram,
  exportPaymentsToExcel,
  getCurrentWinners,
  deleteWinner,
  deleteLot,
  updateWinner,
  deletePayment,
  updatePayment,
} from "../controllers/goldController";
import { authenticateUser } from "../middlewares/authMiddleware";
// import { isAdmin } from "../middlewares/roleMiddleware";

const router = express.Router();

// Program Lifecycle
router.post("/start", startGoldProgram);
router.post("/end", endGoldProgram);

// Program Queries
router.get("/active", getActiveProgram);
router.get("/all", getAllPrograms);
router.get("/:programId", getProgramDetails);

// Lot Management
router.post("/lots", assignGoldLot);
router.get("/lots/:lotId", getLotDetails);
router.delete("/lots/:lotId", deleteLot);
// Payment Tracking
router.post("/payments", recordPayment);
router.put("/payments/:paymentId", authenticateUser, updatePayment);
router.delete("/payments/:paymentId", authenticateUser, deletePayment);

// Winners Management
router.post("/winners", addWinners);
router.get("/winners/current", getCurrentWinners);
// Add these new routes
router.delete("/winners/:winnerId", deleteWinner);
router.put("/winners/:winnerId", authenticateUser, updateWinner);

router.get("/:programId/winners", getProgramWinners);
router.get("/:programId/lots", getLotsByProgram);
router.get("/:programId/export-payments", exportPaymentsToExcel);
export default router;

