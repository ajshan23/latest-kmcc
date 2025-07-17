"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AirportController_1 = require("../controllers/AirportController");
const router = express_1.default.Router();
// Public routes
router.get("/", AirportController_1.getAllAirports);
router.get("/:id", AirportController_1.getAirportById);
// Protected routes (Only Admins)
router.post("/", AirportController_1.addAirport);
router.put("/:id", AirportController_1.updateAirport);
router.delete("/:id", AirportController_1.deleteAirport);
exports.default = router;
