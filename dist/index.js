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
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const compression_1 = __importDefault(require("compression"));
const db_1 = require("./config/db");
const apiHandlerHelpers_1 = require("./utils/apiHandlerHelpers");
const errorHandler_1 = require("./utils/errorHandler");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const jobRoutes_1 = __importDefault(require("./routes/jobRoutes"));
const newsRoutes_1 = __importDefault(require("./routes/newsRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const surveyRoutes_1 = __importDefault(require("./routes/surveyRoutes"));
const travelRoutes_1 = __importDefault(require("./routes/travelRoutes"));
const airportRoutes_1 = __importDefault(require("./routes/airportRoutes"));
const exclusiveMemberRoutes_1 = __importDefault(require("./routes/exclusiveMemberRoutes"));
const subwindRoutes_1 = __importDefault(require("./routes/subwindRoutes"));
const bookRoutes_1 = __importDefault(require("./routes/bookRoutes"));
const goldRoutes_1 = __importDefault(require("./routes/goldRoutes"));
const constitutionCommitteeRoutes_1 = __importDefault(require("./routes/constitutionCommitteeRoutes"));
const investmentRoutes_1 = __importDefault(require("./routes/investmentRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const firebase_1 = require("./config/firebase");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: {
        status: 429,
        message: "Too many requests. Please try again after an hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// app.use(limiter);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static("/var/www/kmcc-frontend/dist/"));
app.use((0, morgan_1.default)("dev")); // Logging
app.use((0, helmet_1.default)()); // Security
app.use((0, compression_1.default)({ threshold: 1024 }));
app.get("/", (req, res) => {
    res.send("Hello, Secure and Logged World!");
});
app.use("/api/auth/", authRoutes_1.default);
app.use("/api/admin/", adminRoutes_1.default);
app.use("/api/user/", userRoutes_1.default);
app.use("/api/jobs/", jobRoutes_1.default);
app.use("/api/news/", newsRoutes_1.default);
app.use("/api/services/", serviceRoutes_1.default);
app.use("/api/survey/", surveyRoutes_1.default);
app.use("/api/travel/", travelRoutes_1.default);
app.use("/api/airport/", airportRoutes_1.default);
app.use("/api/exclusive-members/", exclusiveMemberRoutes_1.default);
app.use("/api/sub-wing/", subwindRoutes_1.default);
app.use("/api/book/", bookRoutes_1.default);
app.use("/api/gold/", goldRoutes_1.default);
app.use("/api/constitution-committees/", constitutionCommitteeRoutes_1.default);
app.use("/api/investments/", investmentRoutes_1.default);
app.use("/api/notify/", notificationRoutes_1.default);
app.post("/api/subscribe-token", (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const { token } = req.body;
        if (!token)
            return res.status(400).json({ error: "Missing token" });
        try {
            yield firebase_1.admin.messaging().subscribeToTopic([token], "global");
            console.log("subscribed to global topic:", token);
            res.json({ success: true, message: "Subscribed to global topic" });
        }
        catch (err) {
            console.error("Subscription error:", err);
            res.status(500).json({ error: "Failed to subscribe token" });
        }
    }))();
});
app.use(errorHandler_1.errorHandler);
app.use((req, res, next) => {
    throw new apiHandlerHelpers_1.ApiError(404, "Route not found");
});
// Error-handling middleware
app.get("*", (req, res) => {
    res.sendFile("/var/www/glomium/kmcc-frontend/dist/index.html");
});
// Function to start the server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.prismaClient.$connect();
        console.log("✅ Database connected successfully!");
        app.listen(3000, () => {
            console.log("🚀 Server is running on port 3000");
        });
    }
    catch (error) {
        console.error("❌ Failed to connect to the database:", error);
        process.exit(1); // Exit process on DB connection failure
    }
});
// Gracefully handle Prisma shutdown on app termination
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield db_1.prismaClient.$disconnect();
    console.log("🛑 Prisma disconnected. Exiting...");
    process.exit(0);
}));
startServer();
