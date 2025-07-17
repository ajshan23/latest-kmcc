"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const goldController_1 = require("../controllers/goldController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
// import { isAdmin } from "../middlewares/roleMiddleware";
const router = express_1.default.Router();
// Program Lifecycle
router.post("/start", goldController_1.startGoldProgram);
router.post("/end", goldController_1.endGoldProgram);
// Program Queries
router.get("/active", goldController_1.getActiveProgram);
router.get("/all", goldController_1.getAllPrograms);
router.get("/:programId", goldController_1.getProgramDetails);
// Lot Management
router.post("/lots", goldController_1.assignGoldLot);
router.get("/lots/:lotId", goldController_1.getLotDetails);
router.delete("/lots/:lotId", goldController_1.deleteLot);
// Payment Tracking
router.post("/payments", goldController_1.recordPayment);
router.put("/payments/:paymentId", authMiddleware_1.authenticateUser, goldController_1.updatePayment);
router.delete("/payments/:paymentId", authMiddleware_1.authenticateUser, goldController_1.deletePayment);
// Winners Management
router.post("/winners", goldController_1.addWinners);
router.get("/winners/current", goldController_1.getCurrentWinners);
// Add these new routes
router.delete("/winners/:winnerId", goldController_1.deleteWinner);
router.put("/winners/:winnerId", authMiddleware_1.authenticateUser, goldController_1.updateWinner);
router.get("/:programId/winners", goldController_1.getProgramWinners);
router.get("/:programId/lots", goldController_1.getLotsByProgram);
router.get("/:programId/export-payments", goldController_1.exportPaymentsToExcel);
exports.default = router;
