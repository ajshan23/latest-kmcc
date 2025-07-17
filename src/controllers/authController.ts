import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler";
import { prismaClient } from "../config/db";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";

// Helper function to remove leading zeros
const normalizeId = (id: string) => parseInt(id, 10).toString();

// Helper function to create survey progress for a new user
async function createSurveyProgressForUser(userId: number) {
  const surveys = await prismaClient.survey.findMany();
  return surveys.map((survey) => ({
    userId,
    surveyId: survey.id,
    completed: false,
    lastQuestionId: null,
  }));
}

// ✅ Signup Route
export const signup = asyncHandler(async (req: Request, res: Response) => {
  let { memberId, iqamaNumber, phoneNumber, password } = req.body;

  // Normalize memberId (remove leading zeros)
  const normalizedMemberId = normalizeId(memberId);

  // Fetch all memberships and normalize `memberId` before checking
  const memberships = await prismaClient.membership.findMany();
  const existingMember = memberships.find(
    (m) =>
      normalizeId(m.memberId) === normalizedMemberId &&
      m.iqamaNumber === iqamaNumber
  );

  if (!existingMember) {
    throw new ApiError(400, "Invalid memberId or iqamaNumber");
  }

  // Extract the name and areaName from Membership table
  const { name, areaName } = existingMember;

  // Create the kmccPosition dynamically
  const kmccPosition = `kmcc ${areaName} member`;

  // Check if the user is already registered
  const existingUser = await prismaClient.user.findFirst({
    where: { OR: [{ memberId: normalizedMemberId }, { iqamaNumber }] },
  });

  if (existingUser) {
    throw new ApiError(400, "User already registered");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if this is the first user to assign as Super Admin
  const isFirstUser = (await prismaClient.user.count()) === 0;

  // Create the user
  const newUser = await prismaClient.user.create({
    data: {
      memberId: normalizedMemberId,
      iqamaNumber,
      phoneNumber,
      password: hashedPassword,
      name,
      isSuperAdmin: isFirstUser, // First user is super admin
      isAdmin: false, // Admins will be set manually
      profile: {
        create: {
          kmccPosition, // Store dynamically created kmccPosition
        },
      },
      areaName: existingMember.areaName,
    },
  });

  // Automatically create a survey progress entry for the new user
  await prismaClient.userSurveyProgress.createMany({
    data: await createSurveyProgressForUser(newUser.id),
  });

  res
    .status(201)
    .json(new ApiResponse(201, newUser, "User registered successfully"));
});
// ✅ Login Route
export const login = asyncHandler(async (req: Request, res: Response) => {
  let { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new ApiError(400, "Identifier and password are required");
  }

  // Normalize identifier (remove leading zeros if it's a memberId)
  const normalizedIdentifier = normalizeId(identifier);

  // Fetch all users and normalize `memberId` before checking
  const users = await prismaClient.user.findMany();
  const user = users.find(
    (u) =>
      normalizeId(u.memberId) === normalizedIdentifier ||
      u.iqamaNumber === identifier
  );

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // ✅ Generate JWT Token
  const token = jwt.sign({ userId: user.id }, "aju", { expiresIn: "7d" });

  res.json(
    new ApiResponse(
      200,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
        },
      },
      "Login successful"
    )
  );
});

// ✅ Make Admin Route (Only Super Admin Can Promote Users)
// export const makeAdmin = asyncHandler(async (req: Request, res: Response) => {
//     const { userId } = req.body;
//     const adminId = req.user.userId; // Assuming you have auth middleware that extracts user ID

//     // Check if the requester is a super admin
//     const adminUser = await prismaClient.user.findUnique({
//         where: { id: adminId }
//     });

//     if (!adminUser || !adminUser.isSuperAdmin) {
//         throw new ApiError(403, "Only super admins can promote users to admin");
//     }

//     // Update user to admin
//     const updatedUser = await prismaClient.user.update({
//         where: { id: userId },
//         data: { isAdmin: true }
//     });

//     res.json(new ApiResponse(200, updatedUser, "User promoted to admin successfully"));
// });
