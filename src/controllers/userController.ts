import sharp from "sharp";
import { prismaClient } from "../config/db";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { asyncHandler } from "../utils/asyncHandler";
import { Response, Request } from "express";

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Count only active events
  const totalEvents = await prismaClient.event.count({
    where: { isFinished: false },
  });

  // Fetch only active events
  const events = await prismaClient.event.findMany({
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
  const eventsWithImages = events.map((event) => ({
    ...event,
    image: event.image
      ? `data:image/jpeg;base64,${Buffer.from(event.image).toString("base64")}`
      : null,
    registrations: event.registrations.map((registration) => ({
      user: {
        profileImage: registration.user.profileImage
          ? `data:image/jpeg;base64,${Buffer.from(
              registration.user.profileImage
            ).toString("base64")}`
          : null,
      },
    })),
  }));

  res.json({
    success: true,
    totalEvents,
    currentPage: page,
    totalPages: Math.ceil(totalEvents / limit),
    data: eventsWithImages,
    message: "Active events retrieved successfully",
  });
});

export const getEventById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const eventId = Number(req.params.eventId);
    const userId = req.user?.userId;

    if (!eventId) throw new ApiError(400, "Event ID is required");

    // Fetch event details and suggested events in parallel
    const [event, suggestedEvents] = await Promise.all([
      // Main event details
      prismaClient.event.findUnique({
        where: { id: eventId },
        include: {
          registrations: true,
          _count: {
            select: { registrations: true },
          },
        },
      }),
      // Suggested events (3 upcoming events excluding the current one)
      prismaClient.event.findMany({
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

    if (!event) throw new ApiError(404, "Event not found");

    // Convert binary images to base64 for main event
    const eventWithBase64Image = {
      ...event,
      image: event.image
        ? `data:image/jpeg;base64,${Buffer.from(event.image).toString(
            "base64"
          )}`
        : null,
      totalRegistrations: event._count.registrations,
    };

    // Convert binary images for suggested events
    const suggestedEventsWithImages = suggestedEvents.map((event) => ({
      ...event,
      image: event.image
        ? `data:image/jpeg;base64,${Buffer.from(event.image).toString(
            "base64"
          )}`
        : null,
      registrations: event.registrations.map((reg) => ({
        user: {
          profileImage: reg.user.profileImage
            ? `data:image/jpeg;base64,${Buffer.from(
                reg.user.profileImage
              ).toString("base64")}`
            : null,
        },
      })),
      totalRegistrations: event._count.registrations,
    }));

    const isRegistered = event.registrations.some(
      (reg) => reg.userId === userId
    );

    res.json(
      new ApiResponse(
        200,
        {
          event: eventWithBase64Image,
          isRegistered,
          suggestedEvents: suggestedEventsWithImages,
        },
        "Event details retrieved successfully"
      )
    );
  }
);

export const registerForEvent = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { eventId } = req.body;
    const userId = req.user?.userId;

    if (!userId) throw new ApiError(401, "User is not authenticated.");
    if (!eventId) throw new ApiError(400, "Event ID is required.");

    const existingRegistration =
      await prismaClient.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });

    if (existingRegistration)
      throw new ApiError(400, "You are already registered for this event.");

    const registration = await prismaClient.eventRegistration.create({
      data: { eventId, userId },
      select: {
        id: true,
        eventId: true,
        userId: true,
        isAttended: true,
        createdAt: true,
      },
    });

    res.json(
      new ApiResponse(
        201,
        registration,
        "Successfully registered for the event"
      )
    );
  }
);
export const homePageData = asyncHandler(
  async (req: Request, res: Response) => {
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
      const [
        eventsWithRegistrations,
        services,
        jobs,
        banner,
        newsList,
        travels,
        activeProgram,
        currentMonthWinners,
        previousMonthWinners,
        activeInvestmentsCount,
        goldProgramParticipantsCount,
      ] = await Promise.all([
        prismaClient.event.findMany({
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
        prismaClient.service.findMany({
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
        prismaClient.job.findMany({
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
        prismaClient.banner.findFirst(),
        prismaClient.news.findMany({
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
        prismaClient.travel.findMany({
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
        prismaClient.goldProgram.findFirst({
          where: { isActive: true },
        }),
        prismaClient.goldWinner.findMany({
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
        prismaClient.goldWinner.findMany({
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
        prismaClient.longTermInvestment.count({
          where: { isActive: true },
        }),
        prismaClient.goldLot.count({
          where: {
            program: {
              isActive: true,
            },
          },
        }),
      ]);

      // Convert banner image if available
      const bannerImage = banner?.image
        ? `data:image/jpeg;base64,${Buffer.from(banner.image).toString(
            "base64"
          )}`
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
          ? `data:image/jpeg;base64,${Buffer.from(event.image).toString(
              "base64"
            )}`
          : null,
        isFinished: event.isFinished,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        totalRegistrations: event._count.registrations,
        registrations: event.registrations.slice(0, 3).map((reg) => ({
          user: {
            profileImage: reg.user.profileImage
              ? `data:image/jpeg;base64,${Buffer.from(
                  reg.user.profileImage
                ).toString("base64")}`
              : null,
          },
        })),
      }));

      // Format services
      const formattedServices = services.map((service) => ({
        ...service,
        image: service.image
          ? `data:image/jpeg;base64,${Buffer.from(service.image).toString(
              "base64"
            )}`
          : null,
      }));

      // Format news
      const formattedNews = newsList.map((news) => ({
        id: news.id,
        type: news.type,
        heading: news.heading,
        author: news.author,
        createdAt: news.createdAt,
        image: news.image
          ? `data:image/jpeg;base64,${Buffer.from(news.image).toString(
              "base64"
            )}`
          : null,
      }));

      // Format jobs
      const formattedJobs = jobs.map((job) => ({
        ...job,
        logo: job.logo
          ? `data:image/jpeg;base64,${Buffer.from(job.logo).toString("base64")}`
          : null,
      }));

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
      const winnersToShow =
        currentMonthWinners.length > 0
          ? currentMonthWinners
          : previousMonthWinners;
      const isCurrentMonthWinners = currentMonthWinners.length > 0;
      const displayMonth = isCurrentMonthWinners
        ? currentMonth
        : previousMonthWinners[0]?.month || currentMonth - 1 || 12;
      const displayYear = isCurrentMonthWinners
        ? currentYear
        : previousMonthWinners[0]?.year ||
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

      res.json(
        new ApiResponse(
          200,
          {
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
          },
          "Home data retrieved successfully"
        )
      );
    } catch (error) {
      console.error("Error in homePageData:", error);
      throw new ApiError(500, "Failed to fetch home page data");
    }
  }
);
export const uploadAvatar = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId; // Ensure user is authenticated
    if (!req.file) {
      return res.status(400).json(new ApiResponse(400, {}, "Provide file"));
    }

    // Convert image to buffer and optimize size
    const resizedImage = await sharp(req.file.buffer)
      .resize(150, 150)
      .toBuffer();

    // Update the user's avatar in the database
    await prismaClient.user.update({
      where: { id: userId },
      data: { profileImage: resizedImage },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "file uploaded successfully"));
  }
);

export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
    }

    const {
      name,
      email,
      phoneNumber,
      gender, // User fields
      occupation,
      employer,
      place,
      dateOfBirth,
      bloodGroup,
      address, // Profile fields
    } = req.body;

    // Convert dateOfBirth to Date object
    const formattedDOB = dateOfBirth ? new Date(dateOfBirth) : undefined;

    // Update User Table
    const user = await prismaClient.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phoneNumber,
        gender,
      },
    });

    // Update or Create Profile
    const profile = await prismaClient.profile.upsert({
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
      .json(
        new ApiResponse(200, { user, profile }, "Profile updated successfully")
      );
  }
);
export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
    }

    // Fetch all user data in parallel
    const [
      user,
      goldLots,
      longTermInvestment,
      investmentDeposits,
      goldPaymentsCount,
    ] = await Promise.all([
      // User basic info
      prismaClient.user.findUnique({
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
      prismaClient.goldLot.findMany({
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
      prismaClient.longTermInvestment.findFirst({
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
      prismaClient.investmentDeposit.findMany({
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
      prismaClient.goldPayment.count({
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
        .json(new ApiResponse(404, {}, "Profile not found"));
    }

    // Format profile image
    const base64Image = user.profileImage
      ? `data:image/png;base64,${Buffer.from(user.profileImage).toString(
          "base64"
        )}`
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

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...user,
          membershipId: user.memberId,
          profileImage: base64Image,
          goldPrograms: {
            count: goldLots.length, // Number of active gold lots
            totalPayments: goldPaymentsCount, // Total number of payments made
            details: goldProgramDetails,
          },
          longTermInvestment: investmentDetails,
        },
        "Profile retrieved successfully"
      )
    );
  }
);
export const getAttendedEvents = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // Get user ID from authenticated request (added by authMiddleware)
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, "Unauthorized access");

    // Get all events where user is marked as attended
    const attendedEvents = await prismaClient.eventRegistration.findMany({
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
        ? `data:image/jpeg;base64,${Buffer.from(
            registration.event.image
          ).toString("base64")}`
        : null,
      createdAt: registration.event.createdAt,
      attendedAt: registration.createdAt, // When they were marked as attended
    }));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          events: formattedEvents,
          totalAttended: formattedEvents.length,
        },
        "Attended events retrieved successfully"
      )
    );
  }
);

// Add to userController.ts
export const getNorkaDetails = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
    }

    try {
      // Find all surveys that might have NORKA questions
      const surveys = await prismaClient.survey.findMany({
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
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              hasNorkaId: false,
              norkaIdExpiryDate: null,
              message: "No NORKA-related surveys found",
            },
            "No NORKA data available"
          )
        );
      }

      // Get all NORKA-related answers for this user
      const norkaAnswers = await prismaClient.userSurveyAnswer.findMany({
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
        } else if (questionText.includes("norka id expiry date")) {
          norkaIdExpiryDate = answer.answer || "Not provided";
        }
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            hasNorkaId,
            norkaIdExpiryDate,
          },
          "NORKA details retrieved successfully"
        )
      );
    } catch (error) {
      console.error("Error fetching NORKA details:", error);
      return res
        .status(500)
        .json(new ApiResponse(500, {}, "Failed to fetch NORKA details"));
    }
  }
);

export const getSecuritySchemeDetails = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
    }

    try {
      // Find answers to the specific security scheme questions
      const saudiNationalAnswer = await prismaClient.userSurveyAnswer.findFirst(
        {
          where: {
            userId,
            question: {
              text: {
                equals: "Joined in Saudi National Security Scheme?",
              },
            },
          },
        }
      );

      const riyadhCentralAnswer = await prismaClient.userSurveyAnswer.findFirst(
        {
          where: {
            userId,
            question: {
              text: {
                equals: "Joined in Riyadh Central Security Scheme?",
              },
            },
          },
        }
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            joinedSaudiNationalSecurity: saudiNationalAnswer?.answer,
            joinedRiyadhCentralSecurity: riyadhCentralAnswer?.answer,
          },
          "Security scheme details retrieved successfully"
        )
      );
    } catch (error) {
      console.error("Error fetching security scheme details:", error);
      return res
        .status(500)
        .json(
          new ApiResponse(500, {}, "Failed to fetch security scheme details")
        );
    }
  }
);

export const getPravasiWelfareMembership = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
    }

    try {
      // Find answer to the Pravasi Welfare membership question
      const pravasiWelfareAnswer = await prismaClient.userSurveyAnswer.findFirst(
        {
          where: {
            userId,
            question: {
              text: {
                equals: "Pravasi Welfare അംഗമാണോ ?",
              },
            },
          },
        }
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            isPravasiWelfareMember: pravasiWelfareAnswer?.answer,
          },
          "Pravasi Welfare membership status retrieved successfully"
        )
      );
    } catch (error) {
      console.error("Error fetching Pravasi Welfare membership:", error);
      return res
        .status(500)
        .json(
          new ApiResponse(500, {}, "Failed to fetch Pravasi Welfare membership status")
        );
    }
  }
);


import ExcelJS from 'exceljs';

export const exportAllUsers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      // Get all users with their related data
      const users = await prismaClient.user.findMany({
        include: {
          profile: true,
          contactInfo: true,
          EventRegistration: {
            include: {
              event: true
            }
          },
          GoldLot: {
            include: {
              program: true,
              payments: true,
              winners: true
            }
          },
          LongTermInvestment: {
            include: {
              deposits: true,
              profitPayouts: true
            }
          },
          Travel: {
            include: {
              fromAirport: true,
              toAirport: true
            }
          },
          UserSurveyAnswer: true,
          Notification: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Create workbook and worksheets
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'KMCC Admin System';
      workbook.created = new Date();

      // 1. Users Worksheet
      const usersWorksheet = workbook.addWorksheet('Users');
      usersWorksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phoneNumber', width: 20 },
        { header: 'Member ID', key: 'memberId', width: 15 },
        { header: 'Iqama Number', key: 'iqamaNumber', width: 20 },
        { header: 'Area', key: 'areaName', width: 20 },
        { header: 'Admin', key: 'isAdmin', width: 10 },
        { header: 'Survey Completed', key: 'isSurveyCompleted', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 }
      ];

      // 2. Profiles Worksheet
      const profileWorksheet = workbook.addWorksheet('Profiles');
      profileWorksheet.columns = [
        { header: 'User ID', key: 'userId', width: 10 },
        { header: 'Occupation', key: 'occupation', width: 25 },
        { header: 'Employer', key: 'employer', width: 25 },
        { header: 'Place', key: 'place', width: 20 },
        { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
        { header: 'Blood Group', key: 'bloodGroup', width: 15 },
        { header: 'KMCC Position', key: 'kmccPosition', width: 20 },
        { header: 'Address', key: 'address', width: 40 }
      ];

      // 3. Events Worksheet
      const eventsWorksheet = workbook.addWorksheet('Event Registrations');
      eventsWorksheet.columns = [
        { header: 'User ID', key: 'userId', width: 10 },
        { header: 'Event', key: 'eventTitle', width: 30 },
        { header: 'Date', key: 'eventDate', width: 15 },
        { header: 'Location', key: 'eventPlace', width: 20 },
        { header: 'Attended', key: 'attended', width: 15 },
        { header: 'Registered At', key: 'registeredAt', width: 20 }
      ];

      // 4. Gold Program Worksheet
      const goldWorksheet = workbook.addWorksheet('Gold Program');
      goldWorksheet.columns = [
        { header: 'User ID', key: 'userId', width: 10 },
        { header: 'Program', key: 'programName', width: 25 },
        { header: 'Lot ID', key: 'lotId', width: 10 },
        { header: 'Payments', key: 'paymentCount', width: 15 },
        { header: 'Last Payment', key: 'lastPayment', width: 20 },
        { header: 'Wins', key: 'winCount', width: 10 },
        { header: 'Last Win', key: 'lastWin', width: 20 }
      ];

      // 5. Investments Worksheet
      const investmentsWorksheet = workbook.addWorksheet('Investments');
      investmentsWorksheet.columns = [
        { header: 'User ID', key: 'userId', width: 10 },
        { header: 'Investment ID', key: 'investmentId', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Total Deposited', key: 'totalDeposited', width: 20 },
        { header: 'Total Profit', key: 'totalProfit', width: 20 },
        { header: 'Deposits', key: 'depositCount', width: 15 },
        { header: 'Last Deposit', key: 'lastDeposit', width: 20 },
        { header: 'Payouts', key: 'payoutCount', width: 15 }
      ];

      // Add data to worksheets
      users.forEach(user => {
        // Add to Users sheet
        usersWorksheet.addRow({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          memberId: user.memberId,
          iqamaNumber: user.iqamaNumber,
          areaName: user.areaName,
          isAdmin: user.isAdmin ? 'Yes' : 'No',
          isSurveyCompleted: user.isSurveyCompleted ? 'Yes' : 'No',
          createdAt: user.createdAt
        });

        // Add to Profiles sheet
        if (user.profile) {
          profileWorksheet.addRow({
            userId: user.id,
            occupation: user.profile.occupation,
            employer: user.profile.employer,
            place: user.profile.place,
            dateOfBirth: user.profile.dateOfBirth?.toISOString().split('T')[0],
            bloodGroup: user.profile.bloodGroup,
            kmccPosition: user.profile.kmccPosition,
            address: user.profile.address
          });
        }

        // Add to Events sheet
        user.EventRegistration.forEach(registration => {
          eventsWorksheet.addRow({
            userId: user.id,
            eventTitle: registration.event.title,
            eventDate: registration.event.eventDate?.toISOString().split('T')[0],
            eventPlace: registration.event.place,
            attended: registration.isAttended ? 'Yes' : 'No',
            registeredAt: registration.createdAt
          });
        });

        // Add to Gold Program sheet
        user.GoldLot.forEach(lot => {
          const lastPayment = lot.payments[0] 
            ? `${lot.payments[0].month}/${lot.payments[0].year}`
            : 'None';
            
          const lastWin = lot.winners[0]
            ? `${lot.winners[0].month}/${lot.winners[0].year} (${lot.winners[0].prizeAmount})`
            : 'None';

          goldWorksheet.addRow({
            userId: user.id,
            programName: lot.program.name,
            lotId: lot.id,
            paymentCount: lot.payments.length,
            lastPayment: lastPayment,
            winCount: lot.winners.length,
            lastWin: lastWin
          });
        });

        // Add to Investments sheet
        user.LongTermInvestment.forEach(investment => {
          investmentsWorksheet.addRow({
            userId: user.id,
            investmentId: investment.id,
            status: investment.isActive ? 'Active' : 'Inactive',
            totalDeposited: investment.totalDeposited,
            totalProfit: investment.totalProfit,
            depositCount: investment.deposits.length,
            lastDeposit: investment.deposits[0]?.depositDate.toISOString().split('T')[0] || 'None',
            payoutCount: investment.profitPayouts.length
          });
        });
      });

      // Style all worksheets
      const styleHeader = (worksheet: ExcelJS.Worksheet) => {
        worksheet.getRow(1).eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2E86C1' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        
        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      };

      [usersWorksheet, profileWorksheet, eventsWorksheet, goldWorksheet, investmentsWorksheet]
        .forEach(worksheet => {
          styleHeader(worksheet);
          // Auto filter
          worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: worksheet.columnCount }
          };
        });

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=kmcc_users_export_${new Date().toISOString().split('T')[0]}.xlsx`
      );

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error("Error exporting users:", error);
      return res.status(500).json(
        new ApiResponse(500, {}, "Failed to export users data")
      );
    }
  }
);