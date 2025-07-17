import { prismaClient } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, ApiResponse } from "../utils/apiHandlerHelpers";
import { Request, Response } from "express";
import sharp from "sharp";

// ✅ Create a new job (Admin Only)
export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const {
    companyName,
    position,
    jobMode,
    salary,
    place,
    jobDescription,
    keyResponsibilities,
    requirements,
    benefits,
  } = req.body;

  // ✅ Validate Required Fields
  if (
    !companyName ||
    !position ||
    !jobMode ||
    !salary ||
    !place ||
    !jobDescription ||
    !keyResponsibilities ||
    !requirements ||
    !benefits
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  // ✅ Ensure Logo Exists
  if (!req.file) {
    throw new ApiError(400, "Company logo is required.");
  }

  // ✅ Compress & Process Logo
  const compressedLogo = await sharp(req.file.buffer)
    .resize(300, 300)
    .jpeg({ quality: 80 })
    .toBuffer();

  // ✅ Convert JSON Fields Properly
  const parsedKeyResponsibilities = JSON.parse(keyResponsibilities);
  const parsedRequirements = JSON.parse(requirements);
  const parsedBenefits = JSON.parse(benefits);

  // ✅ Create Job
  const job = await prismaClient.job.create({
    data: {
      companyName,
      logo: compressedLogo,
      position,
      jobMode,
      salary: parseInt(salary), // Ensure salary is an integer
      place,
      jobDescription,
      keyResponsibilities: parsedKeyResponsibilities,
      requirements: parsedRequirements,
      benefits: parsedBenefits,
    },
  });

  console.log("Job Created Successfully");

  res.status(201).json(new ApiResponse(201, job, "Job created successfully."));
});
// ✅ Apply for a job (User)
export const applyJob = asyncHandler(async (req: Request, res: Response) => {
  const { jobId, fullName, email, phone } = req.body;

  if (!jobId || !fullName || !email || !phone || !req.file) {
    throw new ApiError(400, "All fields are required, including the resume.");
  }

  // ✅ Convert jobId to a number
  const parsedJobId = Number(jobId);
  if (isNaN(parsedJobId)) throw new ApiError(400, "Invalid job ID.");

  // console.log("Checking job existence...");
  const job = await prismaClient.job.findUnique({ where: { id: parsedJobId } });
  if (!job || job.isClosed) throw new ApiError(404, "Job not found or closed.");

  // console.log("Processing resume image...");
  let compressedResume;
  try {
    // ✅ Compress & Store Resume as Binary Data
    compressedResume = await sharp(req.file.buffer)
      .resize(600) // Resize width to 600px (auto height)
      .jpeg({ quality: 80 }) // Compress to 80% quality
      .toBuffer();
  } catch (error) {
    console.error("Image Processing Error:", error);
    throw new ApiError(500, "Error processing resume image.");
  }

  // console.log("Saving job application...");
  try {
    const application = await prismaClient.jobApplication.create({
      data: {
        jobId: parsedJobId,
        fullName,
        email,
        phone,
        resume: compressedResume, // ✅ Store binary data, NOT base64
      },
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          application,
          "Job application submitted successfully."
        )
      );
  } catch (error) {
    console.error("Database Error:", error);
    throw new ApiError(500, "Failed to save job application.");
  }
});

// ✅ Get all active jobs (with search & pagination)
export const getActiveJobs = asyncHandler(
  async (req: Request, res: Response) => {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // ✅ Filter active jobs and apply search if provided
    const filter = {
      isClosed: false,
      OR: search
        ? [
            {
              companyName: { contains: search as string, mode: "insensitive" },
            },
            { position: { contains: search as string, mode: "insensitive" } },
          ]
        : undefined,
    };

    // ✅ Count total jobs for pagination
    const totalJobs = await prismaClient.job.count({ where: filter });

    // ✅ Fetch jobs with only required fields
    const jobs = await prismaClient.job.findMany({
      where: filter,
      skip,
      take: Number(limit),
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
    });

    // ✅ Convert logo to Base64 for response
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      companyName: job.companyName,
      position: job.position,
      jobMode: job.jobMode,
      salary: job.salary,
      place: job.place,
      logo: job.logo
        ? `data:image/jpeg;base64,${Buffer.from(job.logo).toString("base64")}`
        : null,
    }));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          totalJobs,
          currentPage: Number(page),
          totalPages: Math.ceil(totalJobs / Number(limit)),
          data: formattedJobs,
        },
        "Jobs retrieved successfully."
      )
    );
  }
);

// ✅ Get a single job by id

export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) throw new ApiError(400, "Job ID is required.");

  // ✅ Fetch job details
  const job = await prismaClient.job.findUnique({
    where: { id: jobId },
  });

  if (!job) throw new ApiError(404, "Job not found.");

  // ✅ Count job applications
  const applicationCount = await prismaClient.jobApplication.count({
    where: { jobId },
  });

  // ✅ Convert binary logo to Base64
  const formattedJob = {
    ...job,
    logo: job.logo
      ? `data:image/jpeg;base64,${Buffer.from(job.logo).toString("base64")}`
      : null,
    applicationCount, // Total applications for this job
  };

  res.json(
    new ApiResponse(200, formattedJob, "Job details retrieved successfully.")
  );
});

// ✅ Admin - Get all jobs (with search & pagination)
export const getAllJobsAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = search
      ? {
          OR: [
            {
              companyName: { contains: search as string, mode: "insensitive" },
            },
            { position: { contains: search as string, mode: "insensitive" } },
          ],
        }
      : undefined;

    const totalJobs = await prismaClient.job.count({ where: filter });
    const jobs = await prismaClient.job.findMany({
      where: filter,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    // ✅ Convert logo to Base64
    const formattedJobs = jobs.map((job) => ({
      ...job,
      logo: job.logo
        ? `data:image/jpeg;base64,${Buffer.from(job.logo).toString("base64")}`
        : null,
    }));

    res.json({
      success: true,
      totalJobs,
      currentPage: Number(page),
      totalPages: Math.ceil(totalJobs / Number(limit)),
      data: formattedJobs,
      message: "Jobs retrieved successfully (Admin).",
    });
  }
);

export const editJob = asyncHandler(async (req: Request, res: Response) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) throw new ApiError(400, "Job ID is required.");

  // Fetch Existing Job
  const existingJob = await prismaClient.job.findUnique({
    where: { id: jobId },
  });
  if (!existingJob) throw new ApiError(404, "Job not found.");

  // Extract Request Data - IMPORTANT: isClosed comes as a string from FormData
  const {
    companyName,
    position,
    jobMode,
    salary,
    place,
    jobDescription,
    keyResponsibilities,
    requirements,
    benefits,
    isClosed,
  } = req.body;

  // Convert string 'true'/'false' to boolean
  const isClosedBoolean = isClosed ? isClosed === "true" : existingJob.isClosed;

  // Rest of your processing...
  const parsedKeyResponsibilities = keyResponsibilities
    ? JSON.parse(keyResponsibilities)
    : existingJob.keyResponsibilities;
  const parsedRequirements = requirements
    ? JSON.parse(requirements)
    : existingJob.requirements;
  const parsedBenefits = benefits ? JSON.parse(benefits) : existingJob.benefits;

  // Process Logo (if provided)
  let updatedLogo = existingJob.logo;
  if (req.file) {
    updatedLogo = await sharp(req.file.buffer)
      .resize(300, 300)
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  // Update Job
  const updatedJob = await prismaClient.job.update({
    where: { id: jobId },
    data: {
      companyName: companyName ?? existingJob.companyName,
      position: position ?? existingJob.position,
      jobMode: jobMode ?? existingJob.jobMode,
      salary: salary ? parseInt(salary) : existingJob.salary,
      place: place ?? existingJob.place,
      jobDescription: jobDescription ?? existingJob.jobDescription,
      keyResponsibilities: parsedKeyResponsibilities,
      requirements: parsedRequirements,
      benefits: parsedBenefits,
      isClosed: isClosedBoolean, // Use the properly converted boolean
      logo: updatedLogo,
    },
  });

  res.json(new ApiResponse(200, updatedJob, "Job updated successfully."));
});

// ✅ Delete a job (Admin Only)
export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) throw new ApiError(400, "Job ID is required.");

  const existingJob = await prismaClient.job.findUnique({
    where: { id: jobId },
  });
  if (!existingJob) throw new ApiError(404, "Job not found.");

  await prismaClient.jobApplication.deleteMany({ where: { jobId } }); // Deleting related job applications
  await prismaClient.job.delete({ where: { id: jobId } });

  res.json(new ApiResponse(200, null, "Job deleted successfully."));
});

export const getJobApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const { page = "1", limit = "10" } = req.query; // Default: page 1, limit 10

    if (!jobId) throw new ApiError(400, "Job ID is required.");

    const parsedJobId = Number(jobId);
    if (isNaN(parsedJobId)) throw new ApiError(400, "Invalid job ID.");

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      isNaN(pageNumber) ||
      isNaN(pageSize) ||
      pageNumber < 1 ||
      pageSize < 1
    ) {
      throw new ApiError(400, "Invalid pagination parameters.");
    }

    console.log(
      `Fetching applications for job ID: ${parsedJobId}, Page: ${pageNumber}, Limit: ${pageSize}`
    );

    // ✅ Count total applications for pagination metadata
    const totalApplications = await prismaClient.jobApplication.count({
      where: { jobId: parsedJobId },
    });

    // ✅ Fetch applications with pagination
    const applications = await prismaClient.jobApplication.findMany({
      where: { jobId: parsedJobId },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" }, // Sort by latest
    });

    // ✅ Convert Buffer to Base64 format
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      createdAt: app.createdAt,
      resume: app.resume
        ? `data:image/jpeg;base64,${Buffer.from(app.resume).toString("base64")}`
        : null, // Convert only if exists
    }));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          applications: formattedApplications,
          pagination: {
            totalApplications,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalApplications / pageSize),
            pageSize,
          },
        },
        applications.length > 0
          ? "Job applications retrieved successfully."
          : "No applications found for this job."
      )
    );
  }
);
export const closeJob = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  if (!jobId) throw new ApiError(400, "Job ID is required.");

  const parsedJobId = Number(jobId);
  if (isNaN(parsedJobId)) throw new ApiError(400, "Invalid job ID.");

  console.log(`Closing job ID: ${parsedJobId}`);

  const job = await prismaClient.job.findUnique({ where: { id: parsedJobId } });

  if (!job) throw new ApiError(404, "Job not found.");

  if (job.isClosed) throw new ApiError(400, "Job is already closed.");

  // ✅ Update Job Status
  const updatedJob = await prismaClient.job.update({
    where: { id: parsedJobId },
    data: { isClosed: true },
  });

  res.status(200).json(new ApiResponse(200, {}, "Job closed successfully."));
});
