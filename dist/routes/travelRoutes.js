"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TravelController_1 = require("../controllers/TravelController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post("/", authMiddleware_1.authenticateUser, TravelController_1.addTravel);
router.get("/", TravelController_1.getAllTravels);
router.get("/upcoming", authMiddleware_1.authenticateUser, TravelController_1.getUpcomingTravels); // Add this new route
router.put("/:id", authMiddleware_1.authenticateUser, TravelController_1.updateTravel);
router.delete("/:id", authMiddleware_1.authenticateUser, TravelController_1.deleteTravel); // ✅ Secure delete route
exports.default = router;
