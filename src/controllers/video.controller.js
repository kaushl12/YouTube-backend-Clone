import { asyncHandler } from "../utils/asyncHandler.js";
import z from "zod";
import mongoose, { Schema } from "mongoose";

import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const publishVideo = asyncHandler(async (req, res) => {
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const requiredBody = z.object({
    title: z.string().trim().min(2).max(80),
    description: z.string().trim().min(4).max(300),
  });

  const validatedData = requiredBody.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid Title or Description data format",
      error: validatedData.error.issues,
    });
  }

  const { title, description } = validatedData.data;

  const data = { title, description, videoFileLocalPath, thumbnailLocalPath };
  for (const [key, value] of Object.entries(data)) {
    if (!value) throw new ApiError(400, `${key} is required`);
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath).catch((e) =>
    console.log("Failed to upload video file \n", e)
  );
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath).catch((e) =>
    console.log("Failed to upload thumbnail file \n", e)
  );

  if (!videoFile?.secure_url || !thumbnail?.secure_url) {
    throw new ApiError(500, "Cloudinary upload failed");
  }

  const duration = Math.floor(videoFile.duration);

  const video = await Video.create({
    videoFile: {
      url: videoFile.secure_url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.secure_url,
      public_id: thumbnail.public_id,
    },
    title,
    description,
    duration,
    owner: req.user._id,
    isPublished: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video uploaded successfully"));
});


 const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId
  } = req.query;

  if (!userId) {
    throw new ApiError(400, [], "userId is required");
  }

  // ✅ Ensure user exists
  const existedUser = await User.findById(userId);
  if (!existedUser) {
    throw new ApiError(404, [], "User not found");
  }

  // ✅ Convert types
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  // ✅ Convert userId to ObjectId
  const filter = {
    owner: new mongoose.Types.ObjectId(userId),
  };

  // ✅ Add title filter if provided
  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }

  // ✅ Sorting
  const sortOption = {};
  sortOption[sortBy] = sortType === "asc" ? 1 : -1;

  // ✅ Count matching documents
  const totalVideos = await Video.countDocuments(filter);
  const totalPages = Math.ceil(totalVideos / limitNumber);

  // ✅ Fetch data
  const videos = await Video.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limitNumber)
    .populate("owner", "username fullName avatar");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        currentPage: pageNumber,
        totalPages,
        totalVideos,
        videos,
      },
      "Videos fetched successfully"
    )
  );
});


const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const requiredBody = z.object({
    title: z.string().trim().min(2).max(80),
    description: z.string().trim().min(4).max(300),
  });

  const validatedData = requiredBody.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid Title or Description data format",
      error: validatedData.error.issues,
    });
  }

  const { title, description } = validatedData.data;

  const videoFileUpload = await uploadOnCloudinary(videoFileLocalPath).catch(
    (e) => console.log("Failed to upload video file \n", e)
  );
  const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath).catch(
    (e) => console.log("Failed to upload thumbnail file \n", e)
  );

  if (!videoFileUpload?.secure_url || !thumbnailUpload?.secure_url) {
    throw new ApiError(500, "Cloudinary upload failed");
  }

  const duration = Math.floor(videoFileUpload?.duration || 0);

  // Delete old cloudinary files if they exist
  if (video.videoFile?.public_id) {
    await deleteFromCloudinary(video.videoFile.public_id);
  }
  if (video.thumbnail?.public_id) {
    await deleteFromCloudinary(video.thumbnail.public_id);
  }

  video.videoFile = {
    url: videoFileUpload.secure_url,
    public_id: videoFileUpload.public_id,
  };
  video.thumbnail = {
    url: thumbnailUpload.secure_url,
    public_id: thumbnailUpload.public_id,
  };
  video.title = title;
  video.description = description;
  video.duration = duration;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.videoFile?.public_id) {
    await deleteFromCloudinary(video.videoFile.public_id);
  }
  if (video.thumbnail?.public_id) {
    await deleteFromCloudinary(video.thumbnail.public_id);
  }

  await Video.deleteOne({ _id: videoId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        `Video has been ${video.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

export {
  publishVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
