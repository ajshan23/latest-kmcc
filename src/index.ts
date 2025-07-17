import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import { prismaClient } from "./config/db";
import { ApiError } from "./utils/apiHandlerHelpers";
import { errorHandler } from "./utils/errorHandler";
import authRouter from "./routes/authRoutes";
import adminRouter from "./routes/adminRoutes";
import userRouter from "./routes/userRoutes";
import jobRouter from "./routes/jobRoutes";
import newsRouter from "./routes/newsRoutes";
import serviceRouter from "./routes/serviceRoutes";
import surveyRouter from "./routes/surveyRoutes";
import travelRouter from "./routes/travelRoutes";
import airportRouter from "./routes/airportRoutes";
import exclusiveMemberRouter from "./routes/exclusiveMemberRoutes";
import subwingRouter from "./routes/subwindRoutes";
import bookRouter from "./routes/bookRoutes";
import goldRouter from "./routes/goldRoutes";
import constitutionCommitteeRouter from "./routes/constitutionCommitteeRoutes";
import investmentRouter from "./routes/investmentRoutes";
import nofiticationRouter from "./routes/notificationRoutes";
import { admin } from "./config/firebase";

dotenv.config();

const app = express();

app.use(cors());

const limiter = rateLimit({
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("/var/www/kmcc-frontend/dist/"));
app.use(morgan("dev")); // Logging
app.use(helmet()); // Security
app.use(compression({ threshold: 1024 }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Secure and Logged World!");
});

app.use("/api/auth/", authRouter);
app.use("/api/admin/", adminRouter);
app.use("/api/user/", userRouter);
app.use("/api/jobs/", jobRouter);
app.use("/api/news/", newsRouter);
app.use("/api/services/", serviceRouter);
app.use("/api/survey/", surveyRouter);
app.use("/api/travel/", travelRouter);
app.use("/api/airport/", airportRouter);
app.use("/api/exclusive-members/", exclusiveMemberRouter);
app.use("/api/sub-wing/", subwingRouter);
app.use("/api/book/", bookRouter);
app.use("/api/gold/", goldRouter);
app.use("/api/constitution-committees/", constitutionCommitteeRouter);
app.use("/api/investments/", investmentRouter);
app.use("/api/notify/", nofiticationRouter);

app.post("/api/subscribe-token", (req: Request, res: Response) => {
  (async () => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: "Missing token" });

    try {
      await admin.messaging().subscribeToTopic([token], "global");
      console.log("subscribed to global topic:", token);

      res.json({ success: true, message: "Subscribed to global topic" });
    } catch (err) {
      console.error("Subscription error:", err);
      res.status(500).json({ error: "Failed to subscribe token" });
    }
  })();
});

app.use(errorHandler as ErrorRequestHandler);
app.use((req: Request, res: Response, next: NextFunction) => {
  throw new ApiError(404, "Route not found");
});

// Error-handling middleware

app.get("*", (req, res) => {
  res.sendFile("/var/www/glomium/kmcc-frontend/dist/index.html");
});
// Function to start the server
const startServer = async () => {
  try {
    await prismaClient.$connect();
    console.log("✅ Database connected successfully!");

    app.listen(3000, () => {
      console.log("🚀 Server is running on port 3000");
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1); // Exit process on DB connection failure
  }
};

// Gracefully handle Prisma shutdown on app termination
process.on("SIGINT", async () => {
  await prismaClient.$disconnect();
  console.log("🛑 Prisma disconnected. Exiting...");
  process.exit(0);
});

startServer();

