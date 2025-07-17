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
exports.getSecuritySchemeDetails = exports.getNorkaDetails = exports.getAttendedEvents = exports.getProfile = exports.updateProfile = exports.uploadAvatar = exports.homePageData = exports.registerForEvent = exports.getEventById = exports.getEvents = void 0;
const sharp_1 = __importDefault(require("sharp"));
const db_1 = require("../config/db");
const apiHandlerHelpers_1 = require("../utils/apiHandlerHelpers");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.getEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    // Count only active events
    const totalEvents = yield db_1.prismaClient.event.count({
        where: { isFinished: false },
    });
    // Fetch only active events
    const events = yield db_1.prismaClient.event.findMany({
        skip,
        take: limit,
        where: { isFinished: false }, // Filter for active events
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            eventDate: true,
            place: true,
            timing: true,
            highlights: true,
            eventType: true,
            image: true,
            isFinished: true,
            createdAt: true,
            updatedAt: true,
            registrations: {
                take: 3, // Get only 3 registered users per event
                select: {
                    user: {
                        select: {
                            profileImage: true,
                        },
                    },
                },
            },
        },
    });
    // Convert binary images to base64 for response
    const eventsWithImages = events.map((event) => (Object.assign(Object.assign({}, event), { image: event.image
            ? `data:image/jpeg;base64,${Buffer.from(event.image).toString("base64")}`
            : null, registrations: event.registrations.map((registration) => ({
            user: {
                profileImage: registration.user.profileImage
                    ? `data:image/jpeg;base64,${Buffer.from(registration.user.profileImage).toString("base64")}`
                    : null,
            },
        })) })));
    res.json({
        success: true,
        totalEvents,
        currentPage: page,
        totalPages: Math.ceil(totalEvents / limit),
        data: eventsWithImages,
        message: "Active events retrieved successfully",
    });
}));
exports.getEventById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const eventId = Number(req.params.eventId);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!eventId)
        throw new apiHandlerHelpers_1.ApiError(400, "Event ID is required");
    // Fetch event details and suggested events in parallel
    const [event, suggestedEvents] = yield Promise.all([
        // Main event details
        db_1.prismaClient.event.findUnique({
            where: { id: eventId },
            include: {
                registrations: true,
                _count: {
                    select: { registrations: true },
                },
            },
        }),
        // Suggested events (3 upcoming events excluding the current one)
        db_1.prismaClient.event.findMany({
            where: {
                isFinished: false,
                id: { not: eventId },
            },
            orderBy: { eventDate: "asc" }, // Get upcoming events first
            take: 3,
            select: {
                id: true,
                title: true,
                eventDate: true,
                place: true,
                timing: true,
                highlights: true,
                eventType: true,
                image: true,
                isFinished: true,
                createdAt: true,
                updatedAt: true,
                registrations: {
                    take: 3,
                    select: {
                        user: {
                            select: {
                                profileImage: true,
                            },
                        },
                    },
                },
                _count: {
                    select: { registrations: true },
                },
            },
        }),
    ]);
    if (!event)
        throw new apiHandlerHelpers_1.ApiError(404, "Event not found");
    // Convert binary images to base64 for main event
    const eventWithBase64Image = Object.assign(Object.assign({}, event), { image: event.image
            ? `data:image/jpeg;base64,${Buffer.from(event.image).toString("base64")}`
            : null, totalRegistrations: event._count.registrations });
    // Convert binary images for suggested events
    const suggestedEventsWithImages = suggestedEvents.map((event) => (Object.assign(Object.assign({}, event), { image: event.image
            ? `data:image/jpeg;base64,${Buffer.from(event.image).toString("base64")}`
            : null, registrations: event.registrations.map((reg) => ({
            user: {
                profileImage: reg.user.profileImage
                    ? `data:image/jpeg;base64,${Buffer.from(reg.user.profileImage).toString("base64")}`
                    : null,
            },
        })), totalRegistrations: event._count.registrations })));
    const isRegistered = event.registrations.some((reg) => reg.userId === userId);
    res.json(new apiHandlerHelpers_1.ApiResponse(200, {
        event: eventWithBase64Image,
        isRegistered,
        suggestedEvents: suggestedEventsWithImages,
    }, "Event details retrieved successfully"));
}));
exports.registerForEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { eventId } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId)
        throw new apiHandlerHelpers_1.ApiError(401, "User is not authenticated.");
    if (!eventId)
        throw new apiHandlerHelpers_1.ApiError(400, "Event ID is required.");
    const existingRegistration = yield db_1.prismaClient.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
    });
    if (existingRegistration)
        throw new apiHandlerHelpers_1.ApiError(400, "You are already registered for this event.");
    const registration = yield db_1.prismaClient.eventRegistration.create({
        data: { eventId, userId },
        select: {
            id: true,
            eventId: true,
            userId: true,
            isAttended: true,
            createdAt: true,
        },
    });
    res.json(new apiHandlerHelpers_1.ApiResponse(201, registration, "Successfully registered for the event"));
}));
exports.homePageData = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    try {
        const [eventsWithRegistrations, services, jobs, banner, newsList, travels, activeProgram, currentMonthWinners, previousMonthWinners, activeInvestmentsCount, goldProgramParticipantsCount,] = yield Promise.all([
            db_1.prismaClient.event.findMany({
                orderBy: { createdAt: "desc" },
                take: 4,
                select: {
                    id: true,
                    title: true,
                    eventDate: true,
                    place: true,
                    timing: true,
                    highlights: true,
                    eventType: true,
                    image: true,
                    isFinished: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            registrations: true,
                        },
                    },
                    registrations: {
                        take: 3,
                        select: {
                            user: {
                                select: {
                                    profileImage: true,
                                },
                            },
                        },
                    },
                },
            }),
            db_1.prismaClient.service.findMany({
                take: 4,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    location: true,
                    startingTime: true,
                    stoppingTime: true,
                    availableDays: true,
                    image: true,
                    phoneNumber: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            db_1.prismaClient.job.findMany({
                take: 4,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    companyName: true,
                    logo: true,
                    position: true,
                    jobMode: true,
                    salary: true,
                    place: true,
                },
            }),
            db_1.prismaClient.banner.findFirst(),
            db_1.prismaClient.news.findMany({
                take: 5,
                select: {
                    id: true,
                    type: true,
                    heading: true,
                    author: true,
                    createdAt: true,
                    image: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            db_1.prismaClient.travel.findMany({
                where: {
                    AND: [
                        {
                            travelDate: {
                                gte: new Date(currentDate.setHours(0, 0, 0, 0)), // Today's date at midnight
                            },
                        },
                        {
                            OR: [
                                {
                                    travelDate: {
                                        gt: currentDate, // After current time today
                                    },
                                },
                                {
                                    AND: [
                                        { travelDate: currentDate }, // Same date as today
                                        { travelTime: { gte: currentDate.toLocaleTimeString() } }, // Time >= current time
                                    ],
                                },
                            ],
                        },
                    ],
                    status: "AVAILABLE",
                },
                take: 4,
                orderBy: [
                    { travelDate: "asc" }, // Nearest date first
                    { travelTime: "asc" }, // Earliest time first
                ],
                include: {
                    user: { select: { name: true } },
                    fromAirport: true,
                    toAirport: true,
                },
            }),
            db_1.prismaClient.goldProgram.findFirst({
                where: { isActive: true },
            }),
            db_1.prismaClient.goldWinner.findMany({
                where: {
                    year: currentYear,
                    month: currentMonth,
                },
                include: {
                    lot: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    memberId: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            }),
            db_1.prismaClient.goldWinner.findMany({
                where: {
                    OR: [
                        { year: currentYear, month: currentMonth - 1 },
                        { year: currentYear - 1, month: 12 },
                    ],
                },
                include: {
                    lot: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    memberId: true,
                                },
                            },
                        },
                    },
                },
                orderBy: [{ year: "desc" }, { month: "desc" }],
                take: 5,
            }),
            db_1.prismaClient.longTermInvestment.count({
                where: { isActive: true },
            }),
            db_1.prismaClient.goldLot.count({
                where: {
                    program: {
                        isActive: true,
                    },
                },
            }),
        ]);
        // Convert banner image if available
        const bannerImage = (banner === null || banner === void 0 ? void 0 : banner.image)
            ? `data:image/jpeg;base64,${Buffer.from(banner.image).toString("base64")}`
            : null;
        // Format events with registration count
        const formattedEvents = eventsWithRegistrations.map((event) => ({
            id: event.id,
            title: event.title,
            eventDate: event.eventDate,
            place: event.place,
            timing: event.timing,
            highlights: event.highlights,
            eventType: event.eventType,
            image: event.image
                ? `data:image/jpeg;base64,${Buffer.from(event.image).toString("base64")}`
                : null,
            isFinished: event.isFinished,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            totalRegistrations: event._count.registrations,
            registrations: event.registrations.slice(0, 3).map((reg) => ({
                user: {
                    profileImage: reg.user.profileImage
                        ? `data:image/jpeg;base64,${Buffer.from(reg.user.profileImage).toString("base64")}`
                        : null,
                },
            })),
        }));
        // Format services
        const formattedServices = services.map((service) => (Object.assign(Object.assign({}, service), { image: service.image
                ? `data:image/jpeg;base64,${Buffer.from(service.image).toString("base64")}`
                : null })));
        // Format news
        const formattedNews = newsList.map((news) => ({
            id: news.id,
            type: news.type,
            heading: news.heading,
            author: news.author,
            createdAt: news.createdAt,
            image: news.image
                ? `data:image/jpeg;base64,${Buffer.from(news.image).toString("base64")}`
                : null,
        }));
        // Format jobs
        const formattedJobs = jobs.map((job) => (Object.assign(Object.assign({}, job), { logo: job.logo
                ? `data:image/jpeg;base64,${Buffer.from(job.logo).toString("base64")}`
                : null })));
        // Format travels
        const formattedTravels = travels.map((travel) => ({
            id: travel.id,
            userId: travel.userId,
            userName: travel.user.name,
            fromAirport: travel.fromAirport,
            toAirport: travel.toAirport,
            travelDate: travel.travelDate,
            travelTime: travel.travelTime,
            status: travel.status,
            createdAt: travel.createdAt,
        }));
        // Determine which winners to show and their month/year
        const winnersToShow = currentMonthWinners.length > 0
            ? currentMonthWinners
            : previousMonthWinners;
        const isCurrentMonthWinners = currentMonthWinners.length > 0;
        const displayMonth = isCurrentMonthWinners
            ? currentMonth
            : ((_a = previousMonthWinners[0]) === null || _a === void 0 ? void 0 : _a.month) || currentMonth - 1 || 12;
        const displayYear = isCurrentMonthWinners
            ? currentYear
            : ((_b = previousMonthWinners[0]) === null || _b === void 0 ? void 0 : _b.year) ||
                (currentMonth === 1 ? currentYear - 1 : currentYear);
        // Format winners
        const formattedWinners = winnersToShow.map((winner) => ({
            id: winner.id,
            year: winner.year,
            month: winner.month,
            monthName: monthNames[winner.month - 1],
            prizeAmount: winner.prizeAmount,
            winnerName: winner.lot.user.name,
            memberId: winner.lot.user.memberId,
            createdAt: winner.createdAt,
        }));
        res.json(new apiHandlerHelpers_1.ApiResponse(200, {
            bannerImage,
            events: formattedEvents,
            jobs: formattedJobs,
            services: formattedServices,
            news: formattedNews,
            travels: formattedTravels,
            goldProgram: {
                isActive: !!activeProgram,
                currentWinners: formattedWinners,
                winnersMonth: monthNames[displayMonth - 1],
                winnersYear: displayYear,
                isCurrentMonth: isCurrentMonthWinners,
                totalParticipants: goldProgramParticipantsCount,
            },
            longTermInvestment: {
                totalParticipants: activeInvestmentsCount,
            },
        }, "Home data retrieved successfully"));
    }
    catch (error) {
        console.error("Error in homePageData:", error);
        throw new apiHandlerHelpers_1.ApiError(500, "Failed to fetch home page data");
    }
}));
exports.uploadAvatar = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // Ensure user is authenticated
    if (!req.file) {
        return res.status(400).json(new apiHandlerHelpers_1.ApiResponse(400, {}, "Provide file"));
    }
    // Convert image to buffer and optimize size
    const resizedImage = yield (0, sharp_1.default)(req.file.buffer)
        .resize(150, 150)
        .toBuffer();
    // Update the user's avatar in the database
    yield db_1.prismaClient.user.update({
        where: { id: userId },
        data: { profileImage: resizedImage },
    });
    return res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, {}, "file uploaded successfully"));
}));
exports.updateProfile = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        return res.status(401).json(new apiHandlerHelpers_1.ApiResponse(401, {}, "Unauthorized"));
    }
    const { name, email, phoneNumber, gender, // User fields
    occupation, employer, place, dateOfBirth, bloodGroup, address, // Profile fields
     } = req.body;
    // Convert dateOfBirth to Date object
    const formattedDOB = dateOfBirth ? new Date(dateOfBirth) : undefined;
    // Update User Table
    const user = yield db_1.prismaClient.user.update({
        where: { id: userId },
        data: {
            name,
            email,
            phoneNumber,
            gender,
        },
    });
    // Update or Create Profile
    const profile = yield db_1.prismaClient.profile.upsert({
        where: { userId },
        update: {
            occupation,
            employer,
            place,
            dateOfBirth: formattedDOB,
            bloodGroup,
            address,
        },
        create: {
            userId,
            occupation,
            employer,
            place,
            dateOfBirth: formattedDOB,
            bloodGroup,
            address,
        },
    });
    return res
        .status(200)
        .json(new apiHandlerHelpers_1.ApiResponse(200, { user, profile }, "Profile updated successfully"));
}));
exports.getProfile = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        return res.status(401).json(new apiHandlerHelpers_1.ApiResponse(401, {}, "Unauthorized"));
    }
    // Fetch all user data in parallel
    const [user, goldLots, longTermInvestment, investmentDeposits, goldPaymentsCount,] = yield Promise.all([
        // User basic info
        db_1.prismaClient.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                gender: true,
                phoneNumber: true,
                profileImage: true,
                profile: {
                    select: {
                        occupation: true,
                        employer: true,
                        place: true,
                        dateOfBirth: true,
                        bloodGroup: true,
                        kmccPosition: true,
                        address: true,
                    },
                },
                memberId: true,
            },
        }),
        // All active gold program lots
        db_1.prismaClient.goldLot.findMany({
            where: {
                userId: userId,
                program: { isActive: true },
            },
            include: {
                program: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
                payments: {
                    orderBy: [{ year: "desc" }, { month: "desc" }],
                    take: 1,
                },
                winners: {
                    orderBy: [{ year: "desc" }, { month: "desc" }],
                    take: 1,
                },
            },
        }),
        // Active long-term investment
        db_1.prismaClient.longTermInvestment.findFirst({
            where: {
                userId: userId,
                isActive: true,
            },
            include: {
                deposits: {
                    orderBy: { depositDate: "desc" },
                    take: 1,
                },
                profitPayouts: {
                    orderBy: { payoutDate: "desc" },
                    take: 1,
                },
            },
        }),
        // All investment deposits for chart data
        db_1.prismaClient.investmentDeposit.findMany({
            where: {
                investment: {
                    userId: userId,
                    isActive: true,
                },
            },
            orderBy: { depositDate: "asc" },
            select: {
                amount: true,
                depositDate: true,
            },
        }),
        // Count of all gold payments made by user
        db_1.prismaClient.goldPayment.count({
            where: {
                lot: {
                    userId: userId,
                    program: { isActive: true },
                },
                isPaid: true,
            },
        }),
    ]);
    if (!user) {
        return res
            .status(404)
            .json(new apiHandlerHelpers_1.ApiResponse(404, {}, "Profile not found"));
    }
    // Format profile image
    const base64Image = user.profileImage
        ? `data:image/png;base64,${Buffer.from(user.profileImage).toString("base64")}`
        : null;
    // Format all gold program data
    const goldProgramDetails = goldLots.map((lot) => ({
        lotId: lot.id,
        programId: lot.program.id,
        programName: lot.program.name,
        lastPayment: lot.payments[0]
            ? {
                month: lot.payments[0].month,
                year: lot.payments[0].year,
                isPaid: lot.payments[0].isPaid,
            }
            : null,
        hasWon: lot.winners.length > 0,
        lastWin: lot.winners[0]
            ? {
                month: lot.winners[0].month,
                year: lot.winners[0].year,
                prizeAmount: lot.winners[0].prizeAmount,
            }
            : null,
    }));
    // Format investment deposits for chart
    const investmentDepositHistory = investmentDeposits.map((deposit) => ({
        date: deposit.depositDate,
        amount: deposit.amount,
    }));
    // Calculate cumulative investment over time
    let cumulativeAmount = 0;
    const cumulativeInvestmentData = investmentDeposits.map((deposit) => {
        cumulativeAmount += deposit.amount;
        return {
            date: deposit.depositDate,
            amount: cumulativeAmount,
        };
    });
    // Format long-term investment data with additional details
    const investmentDetails = longTermInvestment
        ? {
            investmentId: longTermInvestment.id,
            totalDeposited: longTermInvestment.totalDeposited,
            totalProfit: longTermInvestment.totalProfit,
            profitDistributed: longTermInvestment.profitDistributed,
            profitPending: longTermInvestment.profitPending,
            lastDeposit: longTermInvestment.deposits[0]
                ? {
                    amount: longTermInvestment.deposits[0].amount,
                    date: longTermInvestment.deposits[0].depositDate,
                }
                : null,
            lastPayout: longTermInvestment.profitPayouts[0]
                ? {
                    amount: longTermInvestment.profitPayouts[0].amount,
                    date: longTermInvestment.profitPayouts[0].payoutDate,
                }
                : null,
            depositHistory: investmentDepositHistory,
            cumulativeInvestment: cumulativeInvestmentData,
        }
        : null;
    return res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, Object.assign(Object.assign({}, user), { membershipId: user.memberId, profileImage: base64Image, goldPrograms: {
            count: goldLots.length, // Number of active gold lots
            totalPayments: goldPaymentsCount, // Total number of payments made
            details: goldProgramDetails,
        }, longTermInvestment: investmentDetails }), "Profile retrieved successfully"));
}));
exports.getAttendedEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get user ID from authenticated request (added by authMiddleware)
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId)
        throw new apiHandlerHelpers_1.ApiError(401, "Unauthorized access");
    // Get all events where user is marked as attended
    const attendedEvents = yield db_1.prismaClient.eventRegistration.findMany({
        where: {
            userId,
            isAttended: true,
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    eventDate: true,
                    place: true,
                    timing: true,
                    eventType: true,
                    image: true,
                    createdAt: true,
                },
            },
        },
        orderBy: {
            event: {
                eventDate: "desc", // Show most recent events first
            },
        },
    });
    // Format the response with event details
    const formattedEvents = attendedEvents.map((registration) => ({
        id: registration.event.id,
        title: registration.event.title,
        eventDate: registration.event.eventDate,
        place: registration.event.place,
        timing: registration.event.timing,
        eventType: registration.event.eventType,
        image: registration.event.image
            ? `data:image/jpeg;base64,${Buffer.from(registration.event.image).toString("base64")}`
            : null,
        createdAt: registration.event.createdAt,
        attendedAt: registration.createdAt, // When they were marked as attended
    }));
    res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
        events: formattedEvents,
        totalAttended: formattedEvents.length,
    }, "Attended events retrieved successfully"));
}));
// Add to userController.ts
exports.getNorkaDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        return res.status(401).json(new apiHandlerHelpers_1.ApiResponse(401, {}, "Unauthorized"));
    }
    try {
        // Find all surveys that might have NORKA questions
        const surveys = yield db_1.prismaClient.survey.findMany({
            where: {
                questions: {
                    some: {
                        text: {
                            equals: "Valid Norka ID Available?",
                        },
                    },
                },
            },
            include: {
                questions: {
                    where: {
                        text: {
                            equals: "If Yes,Norka ID Expiry Date",
                        },
                    },
                },
            },
        });
        // If no surveys with NORKA questions found
        if (surveys.length === 0) {
            return res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
                hasNorkaId: false,
                norkaIdExpiryDate: null,
                message: "No NORKA-related surveys found",
            }, "No NORKA data available"));
        }
        // Get all NORKA-related answers for this user
        const norkaAnswers = yield db_1.prismaClient.userSurveyAnswer.findMany({
            where: {
                userId,
                question: {
                    text: {
                        contains: "Norka",
                    },
                },
            },
            include: {
                question: {
                    select: {
                        text: true,
                    },
                },
            },
        });
        // Extract NORKA details
        let hasNorkaId = "Not provided";
        let norkaIdExpiryDate = "Not provided";
        norkaAnswers.forEach((answer) => {
            const questionText = answer.question.text.toLowerCase();
            if (questionText.includes("valid norka id available")) {
                hasNorkaId = answer.answer === "yes" ? "Yes" : "No";
            }
            else if (questionText.includes("norka id expiry date")) {
                norkaIdExpiryDate = answer.answer || "Not provided";
            }
        });
        return res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
            hasNorkaId,
            norkaIdExpiryDate,
        }, "NORKA details retrieved successfully"));
    }
    catch (error) {
        console.error("Error fetching NORKA details:", error);
        return res
            .status(500)
            .json(new apiHandlerHelpers_1.ApiResponse(500, {}, "Failed to fetch NORKA details"));
    }
}));
exports.getSecuritySchemeDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        return res.status(401).json(new apiHandlerHelpers_1.ApiResponse(401, {}, "Unauthorized"));
    }
    try {
        // Find answers to the specific security scheme questions
        const saudiNationalAnswer = yield db_1.prismaClient.userSurveyAnswer.findFirst({
            where: {
                userId,
                question: {
                    text: {
                        equals: "Joined in Saudi National Security Scheme?",
                    },
                },
            },
        });
        const riyadhCentralAnswer = yield db_1.prismaClient.userSurveyAnswer.findFirst({
            where: {
                userId,
                question: {
                    text: {
                        equals: "Joined in Riyadh Central Security Scheme?",
                    },
                },
            },
        });
        return res.status(200).json(new apiHandlerHelpers_1.ApiResponse(200, {
            joinedSaudiNationalSecurity: saudiNationalAnswer === null || saudiNationalAnswer === void 0 ? void 0 : saudiNationalAnswer.answer,
            joinedRiyadhCentralSecurity: riyadhCentralAnswer === null || riyadhCentralAnswer === void 0 ? void 0 : riyadhCentralAnswer.answer,
        }, "Security scheme details retrieved successfully"));
    }
    catch (error) {
        console.error("Error fetching security scheme details:", error);
        return res
            .status(500)
            .json(new apiHandlerHelpers_1.ApiResponse(500, {}, "Failed to fetch security scheme details"));
    }
}));
