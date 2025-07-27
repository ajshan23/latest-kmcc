import { Request, Response } from "express";
import sharp from "sharp";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Helper function to convert image buffer to data URL
const bufferToImageDataUrl = (
  buffer: Buffer | Uint8Array | null
): string | null => {
  if (!buffer) return null;

  try {
    const base64String =
      buffer instanceof Buffer
        ? buffer.toString("base64")
        : Buffer.from(buffer).toString("base64");
    return `data:image/jpeg;base64,${base64String}`;
  } catch (error) {
    console.error("Failed to convert image buffer to data URL:", error);
    return null;
  }
};

// Create a new constitution committee
export const createCommittee = asyncHandler(
  async (req: Request, res: Response) => {
    const { title, description } = req.body;

    if (!title) {
      throw new ApiError(400, "Committee title is required.");
    }

    const committee = await prismaClient.constitutionCommittee.create({
      data: {
        title,
        description,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, committee, "Committee created successfully."));
  }
);

// Add a member to a constitution committee
export const addCommitteeMember = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, position } = req.body;
    const committeeId = Number(req.params.committeeId);

    if (!name || !position || isNaN(committeeId)) {
      throw new ApiError(
        400,
        "Name, position, and valid committee ID are required."
      );
    }

    let imageBuffer: Buffer | null = null;
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(163, 231) // Standard size for consistency
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const member = await prismaClient.constitutionCommitteeMember.create({
      data: {
        name,
        position,
        image: imageBuffer,
        committeeId,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, member, "Member added successfully."));
  }
);

// Get all constitution committees with member counts
export const getAllCommittees = asyncHandler(
  async (req: Request, res: Response) => {
    const committees = await prismaClient.constitutionCommittee.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true },
        },
      },
      
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, committees, "Committees retrieved successfully.")
      );
  }
);

// Get members of a specific committee
export const getCommitteeMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const committeeId = Number(req.params.committeeId);
    if (isNaN(committeeId)) throw new ApiError(400, "Invalid committee ID.");

    const members = await prismaClient.constitutionCommitteeMember.findMany({
      where: { committeeId },
      orderBy: { id: "desc" },
    });

    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: member.name,
      position: member.position,
      committeeId: member.committeeId,
      image: bufferToImageDataUrl(member.image),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formattedMembers,
          "Committee members retrieved successfully."
        )
      );
  }
);

// Get single committee member
export const getCommitteeMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.memberId);
    if (isNaN(memberId)) throw new ApiError(400, "Invalid member ID.");

    const member = await prismaClient.constitutionCommitteeMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new ApiError(404, "Member not found.");
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          ...member,
          image: bufferToImageDataUrl(member.image),
        },
        "Member retrieved successfully."
      )
    );
  }
);
// Get full details of a committee including members
export const getCommitteeDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const committeeId = Number(req.params.committeeId);
    if (isNaN(committeeId)) throw new ApiError(400, "Invalid committee ID.");

    const committee = await prismaClient.constitutionCommittee.findUnique({
      where: { id: committeeId },
      include: {
        members: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!committee) {
      throw new ApiError(404, "Committee not found.");
    }

    const formattedCommittee = {
      ...committee,
      members: committee.members.map((member) => ({
        ...member,
        image: bufferToImageDataUrl(member.image),
      })),
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formattedCommittee,
          "Committee details retrieved successfully."
        )
      );
  }
);

// Update committee information
export const updateCommittee = asyncHandler(
  async (req: Request, res: Response) => {
    const committeeId = Number(req.params.committeeId);
    const { title, description } = req.body;

    if (isNaN(committeeId)) {
      throw new ApiError(400, "Invalid committee ID.");
    }

    const updatedCommittee = await prismaClient.constitutionCommittee.update({
      where: { id: committeeId },
      data: {
        title,
        description,
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedCommittee,
          "Committee updated successfully."
        )
      );
  }
);

// Update committee member
export const updateCommitteeMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.memberId);
    const { name, position } = req.body;

    if (isNaN(memberId) || !name || !position) {
      throw new ApiError(400, "Invalid member ID or missing required fields.");
    }

    let imageBuffer: Buffer | null = null;
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(163, 231)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const updateData: {
      name: string;
      position: string;
      image?: Buffer;
    } = {
      name,
      position,
    };

    if (imageBuffer) {
      updateData.image = imageBuffer;
    }

    const updatedMember = await prismaClient.constitutionCommitteeMember.update(
      {
        where: { id: memberId },
        data: updateData,
      }
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          ...updatedMember,
          image: bufferToImageDataUrl(updatedMember.image),
        },
        "Member updated successfully."
      )
    );
  }
);

// Delete a committee (will cascade delete members)
export const deleteCommittee = asyncHandler(
  async (req: Request, res: Response) => {
    const committeeId = Number(req.params.committeeId);
    if (isNaN(committeeId)) throw new ApiError(400, "Invalid committee ID.");

    await prismaClient.constitutionCommittee.delete({
      where: { id: committeeId },
    });

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Committee deleted successfully."));
  }
);

// Delete a committee member
export const deleteCommitteeMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.memberId);
    if (isNaN(memberId)) throw new ApiError(400, "Invalid member ID.");

    await prismaClient.constitutionCommitteeMember.delete({
      where: { id: memberId },
    });

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Member deleted successfully."));
  }
);
