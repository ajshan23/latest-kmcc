import express from "express";
import {
  createInvestment,
  getUserInvestments,
  getInvestmentDetails,
  closeInvestment,
  getInvestments,
  checkActiveInvestment,
} from "../controllers/investmentController";
import {
  addDeposit,
  getInvestmentDeposits,
} from "../controllers/depositController";
import {
  addProfit,
  addProfitPayout,
  getInvestmentProfitPayouts,
  getProfitSummary,
} from "../controllers/profitController";

const router = express.Router();

// Investment routes
router.post("/", createInvestment);
router.get("/", getInvestments);
router.get("/check-active", checkActiveInvestment);
router.get("/user/:userId", getUserInvestments);
router.get("/:id", getInvestmentDetails);
router.patch("/:id/close", closeInvestment);

// Deposit routes
router.post("/:id/deposits", addDeposit);
router.get("/:id/deposits", getInvestmentDeposits);

// Profit routes
router.post("/:id/profits", addProfit); // Add to total profit
router.post("/:id/profit-payouts", addProfitPayout); // Distribute to user
router.get("/:id/profit-payouts", getInvestmentProfitPayouts);
router.get("/:id/profit-summary", getProfitSummary);

export default router;
