import { asyncHandler } from "../utils/asyncHandler.js";
import { mongoose, Schema } from "mongoose";
import z from "zod";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const comments = await Comment.find({
    video: videoId,
  })
    .populate("owner", "username fullName avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

  const totalComments = await Comment.countDocuments({ video: videoId });
  const totalPages = Math.ceil(totalComments / limitNumber);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        currentPage: pageNumber,
        totalPages,
        totalComments,
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const requiredBody = z.object({
    content: z.string().trim().min(1).max(300),
  });
  const validatedData = requiredBody.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid Content data format",
      error: validatedData.error.issues,
    });
  }
  const { content } = validatedData.data;

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid Comment ID format");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const requiredBody = z.object({
    content: z.string().trim().min(1).max(300),
  });
  const validatedData = requiredBody.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid Content data format",
      error: validatedData.error.issues,
    });
  }
  const { content } = validatedData.data;
  comment.content = content;
  await comment.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid Comment ID format");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  await Comment.deleteOne({ _id: commentId });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { addComment, updateComment, deleteComment, getVideoComments };
