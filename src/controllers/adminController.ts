import { Request, Response } from "express";

import * as XLSX from "xlsx";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";
import multer from "multer";
import sharp from "sharp";
import bcrypt from "bcrypt";
import { admin } from "../config/firebase";
import { sendGlobalNotification } from "../utils/notify";
// ✅ Controller for Importing Membership Data from Excel
export const uploadMembership = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("here");

    if (!req.file) {
      console.log("this");

      throw new ApiError(400, "No file uploaded");
    }

    // ✅ Read the Excel File
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // ✅ Convert Excel to JSON
    const membershipData = XLSX.utils.sheet_to_json(sheet);

    if (!membershipData.length) {
      throw new ApiError(400, "Uploaded file is empty");
    }

    // ✅ Prepare Data for Bulk Insert (Correct Column Mapping)
    const bulkData = membershipData.map((row: any) => ({
      memberId: row["Membership ID"]?.toString(),
      iqamaNumber: row["Iqama No"]?.toString(),
      name: row["Name of Member"],
      phoneNumber: row["Phone Number"] || null,
      status: row["Status"] || "active",
      areaName: row["Area or Mandalam Name"] || null, // Added the new field
    }));

    console.log("length........................", bulkData.length);
    console.log(
      "Extracted Data from Excel (First 5 Rows):",
      bulkData.slice(0, 5)
    );

    const memberIds = new Set();
    const iqamaNumbers = new Set();
    let duplicateCount = 0;

    membershipData.forEach((row: any) => {
      const memberId = row["Membership ID"]?.toString();
      const iqamaNumber = row["Iqama No"]?.toString();

      if (memberIds.has(memberId) || iqamaNumbers.has(iqamaNumber)) {
        duplicateCount++;
        console.log(
          `Duplicate Found: memberId=${memberId}, iqamaNumber=${iqamaNumber}`
        );
      } else {
        memberIds.add(memberId);
        iqamaNumbers.add(iqamaNumber);
      }
    });

    console.log(`Total Duplicates: ${duplicateCount}`);

    // ✅ Insert Data (Avoid Duplicates)
    await Promise.all(
      bulkData.map(async (member) => {
        if (!member.memberId || !member.iqamaNumber || !member.name) {
          return; // Skip invalid rows
        }

        const exists = await prismaClient.membership.findFirst({
          where: {
            OR: [
              { memberId: member.memberId },
              { iqamaNumber: member.iqamaNumber },
            ],
          },
        });

        if (!exists) {
          await prismaClient.membership.create({ data: member });
        }
      })
    );

    return res
      .status(201)
      .json(
        new ApiResponse(201, null, "Membership data uploaded successfully")
      );
  }
);
// Controller for getting a single membership by ID
export const getMembershipById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Convert string ID to number
    const membershipId = parseInt(id);
    if (isNaN(membershipId)) {
      throw new ApiError(400, "Invalid membership ID");
    }

    // Find the membership
    const membership = await prismaClient.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new ApiError(404, "Membership not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, membership, "Membership retrieved successfully")
      );
  }
);

const storage = multer.memoryStorage(); // use memory for buffer

export const upload = multer({ storage });
// ✅ Multer Middleware
export const uploadMiddleware = upload.single("file");

export const getAllMemberships = asyncHandler(
  async (req: Request, res: Response) => {
    // Extract pagination and search parameters from query
    const page = parseInt(req.query.page as string) || 1; // Default page is 1
    const limit = parseInt(req.query.limit as string) || 10; // Default limit is 10
    const skip = (page - 1) * limit; // Calculate skip value
    const search = (req.query.search as string) || ""; // Search term

    // Build the search filter for MySQL
    const searchFilter = search
      ? {
          OR: [
            { memberId: { contains: search } },
            { iqamaNumber: { contains: search } },
            { name: { contains: search } },
            { phoneNumber: { contains: search } },
            { areaName: { contains: search } },
          ],
        }
      : {};

    // Fetch memberships with pagination and search filter
    const memberships = await prismaClient.membership.findMany({
      where: searchFilter,
      skip: skip,
      take: limit,
    });

    // Get total count of memberships for pagination metadata
    const totalCount = await prismaClient.membership.count({
      where: searchFilter,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Return response with pagination metadata
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          memberships,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
          },
        },
        "Membership data fetched successfully"
      )
    );
  }
);
export const addMembershipManually = asyncHandler(
  async (req: Request, res: Response) => {
    const { memberId, iqamaNumber, name, phoneNumber, status, areaName } =
      req.body;

    // Validate required fields
    if (!memberId || !iqamaNumber || !name) {
      throw new ApiError(400, "memberId, iqamaNumber, and name are required.");
    }

    // Check for duplicates
    const existingMember = await prismaClient.membership.findFirst({
      where: {
        OR: [{ memberId }, { iqamaNumber }],
      },
    });

    if (existingMember) {
      throw new ApiError(
        400,
        "Member with the same memberId or iqamaNumber already exists."
      );
    }

    // Create new membership
    const newMember = await prismaClient.membership.create({
      data: {
        memberId,
        iqamaNumber,
        name,
        phoneNumber: phoneNumber || null,
        status: status || "active",
        areaName: areaName || null,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newMember, "Membership added successfully."));
  }
);
// Controller for editing membership

export const editMembership = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { memberId, iqamaNumber, name, phoneNumber, status, areaName } =
      req.body;

    // Convert string ID to number
    const membershipId = parseInt(id);
    if (isNaN(membershipId)) {
      throw new ApiError(400, "Invalid membership ID");
    }

    // Validate required fields
    if (!memberId || !iqamaNumber || !name) {
      throw new ApiError(400, "memberId, iqamaNumber, and name are required.");
    }

    // Check if membership exists
    const existingMembership = await prismaClient.membership.findUnique({
      where: { id: membershipId },
    });

    if (!existingMembership) {
      throw new ApiError(404, "Membership not found.");
    }

    // Check for duplicates with other members (excluding current one)
    const duplicateCheck = await prismaClient.membership.findFirst({
      where: {
        AND: [
          { id: { not: membershipId } }, // Exclude current membership
          {
            OR: [{ memberId }, { iqamaNumber }],
          },
        ],
      },
    });

    if (duplicateCheck) {
      throw new ApiError(
        400,
        "Another member with the same memberId or iqamaNumber already exists."
      );
    }

    // Update membership
    const updatedMember = await prismaClient.membership.update({
      where: { id: membershipId },
      data: {
        memberId,
        iqamaNumber,
        name,
        phoneNumber: phoneNumber || null,
        status: status || "active",
        areaName: areaName || null,
      },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedMember, "Membership updated successfully.")
      );
  }
);
export const uploadBanner = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    // ✅ Compress image using Sharp (Resize & Convert to JPEG)
    const compressedImage = await sharp(req.file.buffer)
      .resize(376, 388) // Adjust width & height (optional)
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer();

    // Check if a banner already exists (optional)
    const existingBanner = await prismaClient.banner.findFirst();
    if (existingBanner) {
      // ✅ Update the existing banner
      await prismaClient.banner.update({
        where: { id: existingBanner.id },
        data: { image: compressedImage },
      });

      return res.json(
        new ApiResponse(200, null, "Banner updated successfully")
      );
    }

    // ✅ Create new banner
    await prismaClient.banner.create({ data: { image: compressedImage } });

    res
      .status(201)
      .json(new ApiResponse(201, null, "Banner uploaded successfully"));
  }
);

export const getBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await prismaClient.banner.findFirst();
  if (!banner) {
    throw new ApiError(404, "No banner found");
  }

  res.json({
    success: true,
    image: `data:image/jpeg;base64,${Buffer.from(banner.image).toString(
      "base64"
    )}`,
  });
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const { title, eventDate, place, timing, highlights, eventType } = req.body;

  // Process highlights
  const highlightsData = Array.isArray(highlights)
    ? highlights
    : typeof highlights === "string"
    ? JSON.parse(highlights)
    : [];

  // Process image
  const imageBuffer = req.file
    ? await sharp(req.file.buffer).resize(800).jpeg({ quality: 80 }).toBuffer()
    : null;

  // Create event
  const event = await prismaClient.event.create({
    data: {
      title,
      eventDate: new Date(eventDate),
      place,
      timing,
      highlights: highlightsData,
      eventType,
      image: imageBuffer,
    },
    select: { id: true, title: true, eventDate: true },
  });

  // Create notification message
  // const notificationTitle = "New Event Created";
  // const notificationBody = `"${
  //   event.title
  // }" on ${event.eventDate.toLocaleDateString()}`;
  // const notificationData = {
  //   type: "event",
  //   eventId: event.id.toString(),
  // };

  // Create notification in database

  await sendGlobalNotification({
    title: title,
    body: "Check out the latest update!",
    data: { type: "event", eventId: event.id.toString() },
  });

  res.json(
    new ApiResponse(201, { eventId: event.id }, "Event created successfully")
  );
});
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { title, eventDate, place, timing, highlights, eventType } = req.body;

  // Validate required fields
  if (!title || !eventDate || !place || !timing) {
    throw new ApiError(400, "Missing required fields");
  }

  // Process highlights
  const highlightsData = Array.isArray(highlights)
    ? highlights
    : typeof highlights === "string"
    ? JSON.parse(highlights)
    : [];

  // Process image if exists
  let imageBuffer = null;
  if (req.file) {
    imageBuffer = await sharp(req.file.buffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  // Build update data
  const updateData = {
    title,
    eventDate: new Date(eventDate),
    place,
    timing,
    highlights: highlightsData,
    eventType,
    ...(imageBuffer && { image: imageBuffer }), // Only include image if it exists
  };

  // Update event
  const updatedEvent = await prismaClient.event.update({
    where: { id: Number(eventId) },
    data: updateData,
  });

  res.json(new ApiResponse(200, updatedEvent, "Event updated successfully"));
});
export const getEventRegistrations = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = req.params;

    const registrations = await prismaClient.eventRegistration.findMany({
      where: { eventId: Number(eventId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            memberId: true,
            phoneNumber: true,
            profileImage: true,
          },
        },
      },
    });

    // Convert profile images to base64
    const formattedRegistrations = registrations.map((reg) => ({
      ...reg,
      user: {
        ...reg.user,
        profileImage: reg.user.profileImage
          ? Buffer.from(reg.user.profileImage).toString("base64")
          : null,
      },
    }));

    res.json(
      new ApiResponse(
        200,
        { registrations: formattedRegistrations },
        "Event registrations fetched successfully"
      )
    );
  }
);

export const markAttendance = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const { userId, isAttended } = req.body;

    // Find the specific registration using the composite key
    const registration = await prismaClient.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId: Number(eventId),
          userId: Number(userId),
        },
      },
    });

    if (!registration) {
      throw new ApiError(404, "Registration not found");
    }

    // Update the attendance status
    const updatedRegistration = await prismaClient.eventRegistration.update({
      where: {
        eventId_userId: {
          eventId: Number(eventId),
          userId: Number(userId),
        },
      },
      data: {
        isAttended: Boolean(isAttended),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            memberId: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.json(
      new ApiResponse(
        200,
        updatedRegistration,
        "Attendance updated successfully"
      )
    );
  }
);

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [totalEvents, events] = await Promise.all([
    prismaClient.event.count(),
    prismaClient.event.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
        place: true,
        image: true,
        createdAt: true,
        registrations: {
          take: 3,
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Properly typed image conversion function
  const convertImageToBase64 = (image: Uint8Array | null): string | null => {
    if (!image) return null;
    // Handle both Uint8Array from Prisma and Buffer
    const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image.buffer);
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  };

  const eventsWithImages = events.map((event) => ({
    ...event,
    image: convertImageToBase64(event.image),
    registrations: event.registrations.map((reg) => ({
      user: {
        ...reg.user,
        // Add profile image conversion if needed:
        // profileImage: convertImageToBase64(reg.user.profileImage)
      },
    })),
  }));

  res.json({
    success: true,
    totalEvents,
    currentPage: page,
    totalPages: Math.ceil(totalEvents / limit),
    data: eventsWithImages,
    message: "Events retrieved successfully",
  });
});
export const updateEventImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = req.body;

    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    const event = await prismaClient.event.findUnique({
      where: { id: Number(eventId) },
    });
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // ✅ Compress image using Sharp
    const compressedImage = await sharp(req.file.buffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer();

    // ✅ Update event image
    await prismaClient.event.update({
      where: { id: Number(eventId) },
      data: { image: compressedImage },
    });

    res.json(new ApiResponse(200, null, "Event image updated successfully"));
  }
);

export const getEventById = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = req.params;

    // Fetch the requested event with registrations
    const event = await prismaClient.event.findUnique({
      where: { id: Number(eventId) },
      include: {
        registrations: {
          include: { user: true },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // Fetch related events (excluding the current one)
    const relatedEvents = await prismaClient.event.findMany({
      where: {
        NOT: { id: Number(eventId) }, // Exclude current event
        eventDate: { gte: new Date() }, // Only future events
        // Optional: Add more filters for better relevance
        // eventType: event.eventType, // Same type as main event
      },
      take: 3, // Limit to 3 related events
      orderBy: { eventDate: "asc" }, // Sort by nearest date
    });

    // Convert images to Base64 for both main and related events
    const eventWithImage = {
      ...event,
      image: event.image
        ? `data:image/jpeg;base64,${Buffer.from(event.image).toString(
            "base64"
          )}`
        : null,
    };

    const relatedEventsWithImages = relatedEvents.map((ev) => ({
      ...ev,
      image: ev.image
        ? `data:image/jpeg;base64,${Buffer.from(ev.image).toString("base64")}`
        : null,
    }));
    // console.log(
    //   new ApiResponse(
    //     200,
    //     {
    //       event: eventWithImage,
    //       relatedEvents: relatedEventsWithImages,
    //     },
    //     "Event retrieved successfully with related events"
    //   )
    // );

    res.json(
      new ApiResponse(
        200,
        {
          event: eventWithImage,
          relatedEvents: relatedEventsWithImages,
        },
        "Event retrieved successfully with related events"
      )
    );
  }
);

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  // ✅ Check if event exists
  const event = await prismaClient.event.findUnique({
    where: { id: Number(eventId) },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  // ✅ Delete event (Cascade removes all registrations automatically)
  await prismaClient.event.delete({
    where: { id: Number(eventId) },
  });

  res.json(new ApiResponse(200, null, "Event deleted successfully"));
});

export const updateEventStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = req.params;
    // Validate eventId
    if (!eventId) {
      throw new ApiError(400, "Invalid event ID");
    }
    // Check if the event exists
    const event = await prismaClient.event.findUnique({
      where: { id: Number(eventId) },
    });

    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // Update the isFinished state
    const updatedEvent = await prismaClient.event.update({
      where: { id: Number(eventId) },
      data: { isFinished: true },
    });

    res.json(
      new ApiResponse(200, updatedEvent, "Event status updated successfully")
    );
  }
);

// Get all users with pagination and searching
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const searchQuery = search as string;

  const users = await prismaClient.user.findMany({
    where: {
      OR: [
        { name: { contains: searchQuery } },
        { iqamaNumber: { contains: searchQuery } },
        { memberId: { contains: searchQuery } },
      ],
    },
    select: {
      id: true,
      name: true,
      iqamaNumber: true,
      memberId: true,
      phoneNumber: true,
      profileImage: true,
      areaName: true,
    },
    skip: (pageNumber - 1) * pageSize,
    take: pageSize,
  });

  const totalUsers = await prismaClient.user.count({
    where: {
      OR: [
        { name: { contains: searchQuery } },
        { iqamaNumber: { contains: searchQuery } },
        { memberId: { contains: searchQuery } },
      ],
    },
  });

  // Convert profile image to base64
  const formattedUsers = users.map((user) => ({
    ...user,
    profileImage: user.profileImage
      ? Buffer.from(user.profileImage).toString("base64")
      : null,
  }));

  console.log(users, "users");

  res.json(
    new ApiResponse(
      200,
      {
        users: formattedUsers,
        pagination: {
          totalUsers,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(totalUsers / pageSize),
        },
      },
      "Users fetched successfully"
    )
  );
});

// Get a single user by ID
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prismaClient.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      iqamaNumber: true,
      memberId: true,
      phoneNumber: true,
      profileImage: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      createdAt: true,
      updatedAt: true,
      profile: true,
      contactInfo: true,
    },
  });

  if (!user) {
    return res.json(new ApiError(404, "User not found"));
  }

  // Convert profile image to base64
  const formattedUser = {
    ...user,
    profileImage: user.profileImage
      ? Buffer.from(user.profileImage).toString("base64")
      : null,
  };

  res.json(
    new ApiResponse(200, formattedUser, "User details fetched successfully")
  );
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  // Fetch total number of users
  const totalUsers = await prismaClient.user.count();

  // Fetch total number of memberships
  const totalMemberships = await prismaClient.membership.count();

  // Return the stats
  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers,
        totalMemberships,
        userTrend: [10, 15, 30, 25, 40, 50, 60],
        membershipTrend: [5, 10, 15, 12, 20, 25, 28],
      },
      "Stats fetched successfully."
    )
  );
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  // const adminId = req.user?.id; // Assuming you have authentication middleware

  // 1. Validate input
  if (!userId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User ID is required"));
  }

  // 2. Check if admin exists and has privileges
  // const admin = await prismaClient.user.findUnique({
  //   where: { id: adminId },
  //   select: { isAdmin: true, isSuperAdmin: true }
  // });

  // if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
  //   return res.status(403).json(new ApiResponse(403, null, 'Unauthorized: Admin privileges required'));
  // }

  // // 3. Prevent self-deletion
  // if (parseInt(userId) === adminId) {
  //   return res.status(400).json(new ApiResponse(400, null, 'Admins cannot delete themselves'));
  // }

  // 4. Check if user exists
  const userToDelete = await prismaClient.user.findUnique({
    where: { id: parseInt(userId) },
  });

  if (!userToDelete) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  // // 5. Prevent deleting super admins (unless by another super admin)
  // if (userToDelete.isSuperAdmin && !admin.isSuperAdmin) {
  //   return res
  //     .status(403)
  //     .json(
  //       new ApiResponse(
  //         403,
  //         null,
  //         "Only super admins can delete other super admins"
  //       )
  //     );
  // }

  // 6. Perform deletion with transaction (handles related records)
  await prismaClient.$transaction([
    // Delete all related records first
    prismaClient.userSurveyAnswer.deleteMany({
      where: { userId: parseInt(userId) },
    }),
    prismaClient.userSurvey.deleteMany({ where: { userId: parseInt(userId) } }),
    // Add other relations as needed...

    // Then delete the user
    prismaClient.user.delete({ where: { id: parseInt(userId) } }),
  ]);

  // 7. Return success response
  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

// Add this new controller to your existing adminController file
export const updateUserWithProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      // User fields
      name,
      email,
      phoneNumber,
      isAdmin,
      isSuperAdmin,
      password, // Add password field
      // Profile fields
      occupation,
      employer,
      place,
      dateOfBirth,
      bloodGroup,
      kmccPosition,
      address,
    } = req.body;

    // Validate required fields
    if (!name || !phoneNumber) {
      throw new ApiError(400, "Name and phone number are required");
    }

    // Check if user exists
    const existingUser = await prismaClient.user.findUnique({
      where: { id: Number(id) },
      include: { profile: true },
    });

    if (!existingUser) {
      throw new ApiError(404, "User not found");
    }

    // Process profile image if exists
    let profileImageBuffer = null;
    if (req.file) {
      profileImageBuffer = await sharp(req.file.buffer)
        .resize(800)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update user and profile in a transaction
    const [updatedUser] = await prismaClient.$transaction([
      prismaClient.user.update({
        where: { id: Number(id) },
        data: {
          name,
          email: email || null,
          phoneNumber,
          isAdmin: isAdmin === "true",
          isSuperAdmin: isSuperAdmin === "true",
          ...(profileImageBuffer && { profileImage: profileImageBuffer }),
          ...(hashedPassword && { password: hashedPassword }), // Conditionally add password
        },
        include: { profile: true },
      }),
      prismaClient.profile.upsert({
        where: { userId: Number(id) },
        update: {
          occupation: occupation || null,
          employer: employer || null,
          place: place || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          bloodGroup: bloodGroup || null,
          kmccPosition: kmccPosition || null,
          address: address || null,
        },
        create: {
          userId: Number(id),
          occupation: occupation || null,
          employer: employer || null,
          place: place || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          bloodGroup: bloodGroup || null,
          kmccPosition: kmccPosition || null,
          address: address || null,
        },
      }),
    ]);

    // Fetch the updated profile separately to ensure we get all fields
    const updatedProfile = await prismaClient.profile.findUnique({
      where: { userId: Number(id) },
    });

    res.json(
      new ApiResponse(
        200,
        {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            isAdmin: updatedUser.isAdmin,
            isSuperAdmin: updatedUser.isSuperAdmin,
            profileImage: updatedUser.profileImage
              ? Buffer.from(updatedUser.profileImage).toString("base64")
              : null,
          },
          profile: updatedProfile,
        },
        "User and profile updated successfully"
      )
    );
  }
);
export const downloadEventRegistrations = asyncHandler(
  async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const programId = parseInt(eventId);

    if (isNaN(programId)) throw new ApiError(400, "Invalid event ID");

    // Get event details for filename
    const event = await prismaClient.event.findUnique({
      where: { id: programId },
      select: { title: true },
    });

    // Get all registrations with user info
    const registrations = await prismaClient.eventRegistration.findMany({
      where: { eventId: programId },
      include: {
        user: {
          select: {
            name: true,
            memberId: true,
            phoneNumber: true,
            email: true,
            gender: true,
            areaName: true,
            profile: {
              select: {
                occupation: true,
                employer: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!registrations.length) {
      throw new ApiError(404, "No registrations found for this event");
    }
    console.log(registrations);

    // Prepare Excel data
    const excelData = registrations.map((reg, index) => ({
      "#": index + 1,
      Name: reg.user.name,
      "Member ID": reg.user.memberId,
      Phone: reg.user.phoneNumber,
      Email: reg.user.email || "N/A",
      Gender: reg.user.gender || "N/A",
      Occupation: reg.user.profile?.occupation || "N/A",
      Employer: reg.user.profile?.employer || "N/A",
      "Registration Date": reg.createdAt.toISOString().split("T")[0],
      "Attendance Status": reg.isAttended ? "Attended" : "Not Attended",
      Constituency: reg.user.areaName || "N/A",
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet["!cols"] = [
      { width: 5 }, // #
      { width: 25 }, // Name
      { width: 15 }, // Member ID
      { width: 15 }, // Phone
      { width: 25 }, // Email
      { width: 10 }, // Gender
      { width: 20 }, // Occupation
      { width: 20 }, // Employer
      { width: 15 }, // Registration Date
      { width: 15 }, // Attendance Status
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Set response headers
    const filename = `event_registrations_${
      event?.title.replace(/[^a-z0-9]/gi, "_") || eventId
    }.xlsx`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${encodeURIComponent(filename)}`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Send the Excel file
    res.send(buffer);
  }
);

