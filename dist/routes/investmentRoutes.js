"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const investmentController_1 = require("../controllers/investmentController");
const depositController_1 = require("../controllers/depositController");
const profitController_1 = require("../controllers/profitController");
const router = express_1.default.Router();
// Investment routes
router.post("/", investmentController_1.createInvestment);
router.get("/", investmentController_1.getInvestments);
router.get("/check-active", investmentController_1.checkActiveInvestment);
router.get("/user/:userId", investmentController_1.getUserInvestments);
router.get("/:id", investmentController_1.getInvestmentDetails);
router.patch("/:id/close", investmentController_1.closeInvestment);
// Deposit routes
router.post("/:id/deposits", depositController_1.addDeposit);
router.get("/:id/deposits", depositController_1.getInvestmentDeposits);
// Profit routes
router.post("/:id/profits", profitController_1.addProfit); // Add to total profit
router.post("/:id/profit-payouts", profitController_1.addProfitPayout); // Distribute to user
router.get("/:id/profit-payouts", profitController_1.getInvestmentProfitPayouts);
router.get("/:id/profit-summary", profitController_1.getProfitSummary);
exports.default = router;
