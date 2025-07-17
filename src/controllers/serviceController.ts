import { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandlerHelpers";
import { prismaClient } from "../config/db";

// Multer setup for handling image uploads
const storage = multer.memoryStorage(); // Store file in memory as Buffer
const upload = multer({ storage });

// ✅ Create a Service
export const createService = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      title,
      location,
      startingTime,
      stoppingTime,
      availableDays,
      phoneNumber,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !location ||
      !startingTime ||
      !stoppingTime ||
      !availableDays
    ) {
      throw new ApiError(400, "All fields are required.");
    }

    let imageBuffer: Buffer | null = null;

    // Process image if uploaded
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(300, 300) // Resize to 300x300
        .jpeg({ quality: 80 }) // Compress image
        .toBuffer();
    }

    // Create the service
    const service = await prismaClient.service.create({
      data: {
        title,
        location,
        startingTime,
        stoppingTime,
        availableDays,
        image: imageBuffer,
        phoneNumber,
      },
    });

    res
      .status(201)
      .json(new ApiResponse(201, service, "Service created successfully."));
  }
);

// ✅ Get All Services (Paginated)
export const getAllServices = asyncHandler(
  async (req: Request, res: Response) => {
    let { page, limit, search } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const searchQuery = (search as string) || "";
    const skip = (pageNumber - 1) * pageSize;

    // Fetch services with optional search filter
    const services = await prismaClient.service.findMany({
      skip,
      take: pageSize,
      where: {
        title: {
          contains: searchQuery,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        location: true,
        startingTime: true,
        stoppingTime: true,
        availableDays: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        phoneNumber: true,
      },
    });

    // Convert image Buffer to Base64 safely
    const formattedServices = services.map((service) => ({
      ...service,
      image: service.image
        ? `data:image/jpeg;base64,${Buffer.from(service.image).toString(
            "base64"
          )}`
        : null,
    }));

    // Get total count with the same search filter
    const totalServices = await prismaClient.service.count({
      where: {
        title: {
          contains: searchQuery,
        },
      },
    });

    const totalPages = Math.ceil(totalServices / pageSize);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          currentPage: pageNumber,
          totalPages,
          pageSize,
          totalServices,
          services: formattedServices,
          searchQuery: searchQuery || null, // include the search query in response
        },
        searchQuery
          ? `Service list filtered by '${searchQuery}' retrieved successfully.`
          : "Service list retrieved successfully."
      )
    );
  }
);
// ✅ Get Single Service
export const getServiceById = asyncHandler(
  async (req: Request, res: Response) => {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId)) throw new ApiError(400, "Invalid service ID.");

    const service = await prismaClient.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new ApiError(404, "Service not found.");

    // Convert image Buffer to Base64 safely
    const imageData = service.image
      ? `data:image/jpeg;base64,${Buffer.from(service.image).toString(
          "base64"
        )}`
      : null;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { ...service, image: imageData },
          "Service retrieved successfully."
        )
      );
  }
);

// ✅ Update Service (Except Image)
export const updateServiceDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId)) throw new ApiError(400, "Invalid service ID.");

    const {
      title,
      location,
      startingTime,
      stoppingTime,
      availableDays,
      phoneNumber,
    } = req.body;

    // Check if the service exists
    const existingService = await prismaClient.service.findUnique({
      where: { id: serviceId },
    });
    if (!existingService) throw new ApiError(404, "Service not found.");

    // Update the service (excluding image)
    const updatedService = await prismaClient.service.update({
      where: { id: serviceId },
      data: {
        title: title?.trim() || existingService.title,
        location: location?.trim() || existingService.location,
        startingTime: startingTime || existingService.startingTime,
        stoppingTime: stoppingTime || existingService.stoppingTime,
        availableDays: availableDays || existingService.availableDays,
        phoneNumber: phoneNumber?.trim() || existingService.phoneNumber,
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedService,
          "Service details updated successfully."
        )
      );
  }
);

// ✅ Update Service Image Only
export const updateServiceImage = asyncHandler(
  async (req: Request, res: Response) => {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId)) throw new ApiError(400, "Invalid service ID.");

    // Check if the service exists
    const existingService = await prismaClient.service.findUnique({
      where: { id: serviceId },
    });
    if (!existingService) throw new ApiError(404, "Service not found.");

    let imageBuffer: Buffer | null = null;

    // Process image if uploaded
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Update the service image
    const updatedService = await prismaClient.service.update({
      where: { id: serviceId },
      data: {
        image: imageBuffer,
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedService,
          "Service image updated successfully."
        )
      );
  }
);
// Update the updateService function to handle both data and image
export const updateService = asyncHandler(
  async (req: Request, res: Response) => {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId)) throw new ApiError(400, "Invalid service ID.");

    const {
      title,
      location,
      startingTime,
      stoppingTime,
      availableDays,
      phoneNumber,
    } = req.body;

    // Check if the service exists
    const existingService = await prismaClient.service.findUnique({
      where: { id: serviceId },
    });
    if (!existingService) throw new ApiError(404, "Service not found.");

    // Process image if uploaded
    let imageBuffer: Buffer | null = null;
    if (req.file) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Update the service
    const updatedService = await prismaClient.service.update({
      where: { id: serviceId },
      data: {
        title: title?.trim() || existingService.title,
        location: location?.trim() || existingService.location,
        startingTime: startingTime || existingService.startingTime,
        stoppingTime: stoppingTime || existingService.stoppingTime,
        availableDays: availableDays || existingService.availableDays,
        phoneNumber: phoneNumber?.trim() || existingService.phoneNumber,
        image: imageBuffer || existingService.image,
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedService, "Service updated successfully.")
      );
  }
);
// ✅ Delete Service
export const deleteService = asyncHandler(
  async (req: Request, res: Response) => {
    const serviceId = Number(req.params.id);
    if (isNaN(serviceId)) throw new ApiError(400, "Invalid service ID.");

    // Directly attempt to delete without redundant lookup
    const deletedService = await prismaClient.service
      .delete({ where: { id: serviceId } })
      .catch(() => null);

    if (!deletedService) throw new ApiError(404, "Service not found.");

    res
      .status(200)
      .json(new ApiResponse(200, null, "Service deleted successfully."));
  }
);

// ✅ Export Multer Middleware
export const uploadMiddleware = upload.single("image");
